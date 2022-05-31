import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";
import { delay, setTimeInBlockchain } from "../scripts/misc";
import { MAAuction, MAERC1155, MAERC721 } from "../typechain-types/contracts";
import { IMintableERC20 } from "../typechain-types/contracts/IMintableERC20";
const maerc20 = require("../required-data/MAERC20.json");

describe("MA Auction", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let bidder1: SignerWithAddress;
    let bidder2: SignerWithAddress;
    let contract: MAAuction;
    let erc721: MAERC721;
    let erc1155: MAERC1155;
    let erc20: IMintableERC20;
    let auctionDuration: BigNumber;

    const tokenId = 1;
    const defaultErc20Amount = 1000;
    const defaultErc1155Amount = 100;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        bidder1 = accounts[1];
        bidder2 = accounts[2];

        const factory721 = await ethers.getContractFactory("MAERC721", owner);
        erc721 = await factory721.deploy("test", "test");
        await erc721.setMinter(owner.address);
        await erc721.mint(owner.address, tokenId);

        const factory1155 = await ethers.getContractFactory("MAERC1155", owner);
        erc1155 = await factory1155.deploy();
        const factory20 = 
            await ethers.getContractFactory(maerc20.abi, maerc20.bytecode, owner);
        await erc1155.setMinter(owner.address);
        await erc1155.mint(owner.address, tokenId, defaultErc1155Amount, []);
        
        erc20 = await factory20.deploy("test", "test") as IMintableERC20;

        const factory = await ethers.getContractFactory("MAAuction", owner);
        contract = await factory.deploy();

        auctionDuration = await contract.auctionDuration();

        await contract.pause();

        await contract.setNft721(erc721.address);
        await contract.setNft1155(erc1155.address);
        await contract.setExchangeToken(erc20.address);

        await contract.unpause();

        await erc721.setApprovalForAll(contract.address, true);
        await erc1155.setApprovalForAll(contract.address, true);

        await erc20.mint(owner.address, defaultErc20Amount);
        await erc20.mint(bidder1.address, defaultErc20Amount);
        await erc20.mint(bidder2.address, defaultErc20Amount);

        await erc20.connect(owner).approve(contract.address, defaultErc20Amount);
        await erc20.connect(bidder1).approve(contract.address, defaultErc20Amount);
        await erc20.connect(bidder2).approve(contract.address, defaultErc20Amount);
    });

    describe("list item on auction", () => {
        it("should revert for nft-721 if called when paused", async () => {
            await contract.pause();
            const tx = contract.listItemOnAuction(tokenId, 1);
            await expect(tx).to.be.reverted;
        });

        it("should revert for nft-1155 if called when paused", async () => {
            await contract.pause();
            const tx = contract.listItemWithAmountOnAuction(tokenId, 1, 2);
            await expect(tx).to.be.reverted;
        });

        it("should work for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            const [lot, lastBid] = await contract.getDetailsForItem(tokenId);
            expect(lot.startPrice).eq(startPrice);
            expect(lot.seller).eq(owner.address);
            expect(lastBid.bidder).eq(ethers.constants.AddressZero);
            expect(lastBid.value).eq(0);
            expect(lastBid.no).eq(0);
        });

        it("should change nft-721 balances", async () => {
            const startPrice = 100;

            await contract.listItemOnAuction(tokenId, startPrice);
            
            const ownerAfter = await erc721.ownerOf(tokenId);
            expect(ownerAfter).eq(contract.address);
        });

        it("should work for nft-1155", async () => {
            const startPrice = 100;
            const amount = 2;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, amount);
            const [lot, lastBid] = await contract.getDetailsForItemWithAmount(tokenId);
            expect(lot.startPrice).eq(startPrice);
            expect(lot.amount).eq(amount);
            expect(lot.seller).eq(owner.address);
            expect(lastBid.bidder).eq(ethers.constants.AddressZero);
            expect(lastBid.value).eq(0);
            expect(lastBid.no).eq(0);
        });

        it("should change nft-1155 balances", async () => {
            const startPrice = 100;
            const amount = 2;

            const senderAmountBefore = 
                await erc1155.balanceOf(owner.address, tokenId);
            const contractAmountBefore = 
                await erc1155.balanceOf(contract.address, tokenId);

            await contract.listItemWithAmountOnAuction(
                tokenId, 
                startPrice, 
                amount
            );

            const senderAmount = await erc1155.balanceOf(owner.address, tokenId);
            const contractAmount = await erc1155.balanceOf(contract.address, tokenId);
            expect(senderAmount).eq(senderAmountBefore.sub(amount));
            expect(contractAmount).eq(contractAmountBefore.add(amount));
        });

        it("should emit event for nft-721", async () => {
            const price = 100;
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.listItemOnAuction(tokenId, price);

            await expect(tx).to.emit(contract, "ItemListed")
                .withArgs(
                    owner.address,
                    erc721.address,
                    tokenId,
                    price,
                    0, //amount
                    nextTimestamp,
                    true
                );
        });

        it("should emit event for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.listItemWithAmountOnAuction(tokenId, price, amount);

            await expect(tx).to.emit(contract, "ItemListed")
                .withArgs(
                    owner.address,
                    erc1155.address,
                    tokenId,
                    price,
                    amount,
                    nextTimestamp,
                    true
                );
        });

        it("should revert if lot for such nft-721 already listed", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            
            const tx = contract.listItemOnAuction(tokenId, startPrice);
            await expect(tx).to.be.revertedWith("MAStorage: nft already listed");
        });

        it("should revert if lot for nft-1155 already listed", async () => {
            const startPrice = 100;
            const amount = 2;
            await contract.listItemWithAmountOnAuction(
                tokenId, 
                startPrice, 
                amount
            );
            const tx = contract.listItemWithAmountOnAuction(
                tokenId, 
                startPrice, 
                amount
            );
            await expect(tx).to.be.revertedWith("MAStorage: nft already listed");
        });
    });

    describe("make bid", () => {
        it("should revert for nft-721 if called when paused", async () => {
            await contract.pause();
            const tx = contract.makeBid(tokenId, 1);
            await expect(tx).to.be.reverted;
        });

        it("should revert for nft-1155 if called when paused", async () => {
            await contract.pause();
            const tx = contract.makeBidForItemWithAmount(tokenId, 1);
            await expect(tx).to.be.reverted;
        });

        it("should revert for nft-721 if no such lot", async () => {
            const startPrice = 100;
            const tx = contract.connect(bidder1).makeBid(tokenId, startPrice + 1);
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert for nft-1155 if no such lot", async () => {
            const startPrice = 100;
            const tx = contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice + 1);
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert for nft-721 if auction has ended", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await delay(auctionDuration);
            const tx = contract.connect(bidder1).makeBid(tokenId, startPrice + 1);
            await expect(tx).to.be.revertedWith("MAAuction: auction has ended");
        });

        it("should revert for nft-1155 if auction has ended", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            await delay(auctionDuration);
            const tx = contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice + 1);
            await expect(tx).to.be.revertedWith("MAAuction: auction has ended");
        });

        it("should revert for nft-721 if wrong price", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            const tx = contract.connect(bidder1).makeBid(tokenId, startPrice - 1);
            await expect(tx).to.be.revertedWith("MAAuction: incorrect bid price");
        });

        it("should revert for nft-1155 if wrong price", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            const tx = contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice - 1);
            await expect(tx).to.be.revertedWith("MAAuction: incorrect bid price");
        });

        it("should add a new bid for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            const [lot, lastBid] = await contract.getDetailsForItem(tokenId);
            expect(lastBid.value).eq(startPrice);
            expect(lastBid.bidder).eq(bidder1.address);
            expect(lastBid.no).eq(1);
        });

        it("should add a new bid for nft-1155", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            await contract.connect(bidder1).makeBidForItemWithAmount(
                tokenId,
                startPrice
            );
            const [lot, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(lastBid.value).eq(startPrice);
            expect(lastBid.bidder).eq(bidder1.address);
            expect(lastBid.no).eq(1);
        });

        it("should transfer erc20 from bidder for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            const erc20BidderAmount = await erc20.balanceOf(bidder1.address);
            const erc20ContractAmount = await erc20.balanceOf(contract.address);
            expect(erc20BidderAmount).eq(defaultErc20Amount - startPrice);
            expect(erc20ContractAmount).eq(startPrice);
        });

        it("should transfer erc20 from bidder for nft-1155", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            await contract.connect(bidder1).makeBidForItemWithAmount(tokenId, startPrice);
            const erc20BidderAmount = await erc20.balanceOf(bidder1.address);
            const erc20ContractAmount = await erc20.balanceOf(contract.address);
            expect(erc20BidderAmount).eq(defaultErc20Amount - startPrice);
            expect(erc20ContractAmount).eq(startPrice);
        });

        it("should transfer extra erc20 from the same bidder for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice+10);
            const erc20BidderAmount = await erc20.balanceOf(bidder1.address);
            const erc20ContractAmount = await erc20.balanceOf(contract.address);
            expect(erc20BidderAmount).eq(defaultErc20Amount - startPrice - 10);
            expect(erc20ContractAmount).eq(startPrice + 10);
        });

        it("should transfer erc20 from the same bidder for nft-1155", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            await contract.connect(bidder1).makeBidForItemWithAmount(tokenId, startPrice);
            await contract.connect(bidder1).makeBidForItemWithAmount(tokenId, startPrice + 10);
            const erc20BidderAmount = await erc20.balanceOf(bidder1.address);
            const erc20ContractAmount = await erc20.balanceOf(contract.address);
            expect(erc20BidderAmount).eq(defaultErc20Amount - startPrice - 10);
            expect(erc20ContractAmount).eq(startPrice + 10);
        });

        it("should revert if second bid's price the same for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            const tx = contract.connect(bidder1).makeBid(tokenId, startPrice);
            await expect(tx).to.be.revertedWith("MAAuction: incorrect bid price");
        });

        it("should revert if second bid's price the same for nft-1155", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            await contract.connect(bidder1).makeBidForItemWithAmount(tokenId, startPrice);
            const tx = contract.connect(bidder1).makeBidForItemWithAmount(tokenId, startPrice);
            await expect(tx).to.be.revertedWith("MAAuction: incorrect bid price");
        });

        it("should change erc20 balances for bidders for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            await contract.connect(bidder2).makeBid(tokenId, startPrice + 10);
            const erc20Bidder1Amount = await erc20.balanceOf(bidder1.address);
            const erc20Bidder2Amount = await erc20.balanceOf(bidder2.address);
            const erc20ContractAmount = await erc20.balanceOf(contract.address);
            expect(erc20Bidder1Amount).eq(defaultErc20Amount);
            expect(erc20Bidder2Amount).eq(defaultErc20Amount - startPrice - 10);
            expect(erc20ContractAmount).eq(startPrice + 10);
        });

        it("should change erc20 balances for bidders for nft-1155", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            await contract.connect(bidder1).makeBidForItemWithAmount(tokenId, startPrice);
            await contract.connect(bidder2).makeBidForItemWithAmount(tokenId, startPrice + 10);
            const erc20Bidder1Amount = await erc20.balanceOf(bidder1.address);
            const erc20Bidder2Amount = await erc20.balanceOf(bidder2.address);
            const erc20ContractAmount = await erc20.balanceOf(contract.address);
            expect(erc20Bidder1Amount).eq(defaultErc20Amount);
            expect(erc20Bidder2Amount).eq(defaultErc20Amount - startPrice - 10);
            expect(erc20ContractAmount).eq(startPrice + 10);
        });

        it("should emit event for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.connect(bidder1).makeBid(tokenId, startPrice+1);

            await expect(tx).to.emit(contract, "NewBid")
                .withArgs(
                    nextTimestamp,
                    bidder1.address,
                    erc721.address,
                    tokenId,
                    startPrice+1
                );
        });

        it("should emit event for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmountOnAuction(tokenId, price, amount);
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.connect(bidder1).makeBidForItemWithAmount(tokenId, price+10);

            await expect(tx).to.emit(contract, "NewBid")
                .withArgs(
                    nextTimestamp,
                    bidder1.address,
                    erc1155.address,
                    tokenId,
                    price+10
                );
        });
    });

    describe("finish auction", () => {
        it("should revert for nft-721 if called when paused", async () => {
            await contract.pause();
            const tx = contract.finishAuction(tokenId);
            await expect(tx).to.be.reverted;
        });

        it("should revert for nft-1155 if called when paused", async () => {
            await contract.pause();
            const tx = contract.finishAuctionForItemWithAmount(tokenId);
            await expect(tx).to.be.reverted;
        });

        it("should revert for nft-721 if no such lot", async () => {
            const tx = contract.connect(bidder1).finishAuction(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert for nft-1155 if no such lot", async () => {
            const tx = contract.connect(bidder1)
                .finishAuctionForItemWithAmount(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert for nft-721 if auction hasn't ended", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            const tx = contract.connect(bidder1)
                .finishAuction(tokenId);
            await expect(tx).to.be.revertedWith("MAAuction: auction is not ended");
        });

        it("should revert for nft-1155 if auction hasn't ended", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            const tx = contract.connect(bidder1)
                .finishAuctionForItemWithAmount(tokenId);
            await expect(tx).to.be.revertedWith("MAAuction: auction is not ended");
        });

        it("should cancel if less than 2 bids and reset the lot details, for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            await delay(auctionDuration);

            await contract.connect(bidder1).finishAuction(tokenId);
            const [lot, lastBid] = await contract.getDetailsForItem(tokenId);
            expect(lot.amount).eq(0);
            expect(lastBid.no).eq(0);
        });

        it("should cancel if less than 2 bids and reset the lot details, for nft-1155", async () => {
            const startPrice = 100;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, 10);
            await contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice);
            await delay(auctionDuration);

            await contract.connect(bidder1)
                .finishAuctionForItemWithAmount(tokenId);
            const [lot, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(lot.amount).eq(0);
            expect(lastBid.no).eq(0);
        });

        it("should cancel if less than 2 bids and transfer tokens back to owners, for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            await delay(auctionDuration);

            const amountBefore = await erc20.balanceOf(bidder1.address);
            await contract.connect(bidder1).finishAuction(tokenId);
            const amountAfter = await erc20.balanceOf(bidder1.address);
            const nftOwnerAfter = await erc721.ownerOf(tokenId);

            expect(amountAfter).eq(amountBefore.add(startPrice));
            expect(nftOwnerAfter).eq(owner.address);
        });

        it("should cancel if less than 2 bids and transfer tokens back to owners, for nft-1155", async () => {
            const startPrice = 100;
            const amount = 10;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, amount);
            await contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice);
            await delay(auctionDuration);

            const amountBefore = await erc20.balanceOf(bidder1.address);
            const nftAmountBefore = await erc1155.balanceOf(owner.address, tokenId);
            await contract.connect(bidder1)
                .finishAuctionForItemWithAmount(tokenId);
            const amountAfter = await erc20.balanceOf(bidder1.address);
            const nftAmountAfter = await erc1155.balanceOf(owner.address, tokenId);

            expect(amountAfter).eq(amountBefore.add(startPrice));
            expect(nftAmountAfter).eq(nftAmountBefore.add(amount));
        });

        it("should finish and reset the lot details, for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            await contract.connect(bidder2).makeBid(tokenId, startPrice + 10);
            await delay(auctionDuration);

            await contract.finishAuction(tokenId);
            const [lot, lastBid] = await contract.getDetailsForItem(tokenId);
            expect(lot.amount).eq(0);
            expect(lastBid.no).eq(0);
        });

        it("should finish and reset the lot details, for nft-1155", async () => {
            const startPrice = 100;
            const amount = 10;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, amount);
            await contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice);
            await contract.connect(bidder2)
                .makeBidForItemWithAmount(tokenId, startPrice + 10);
            await delay(auctionDuration);

            await contract.finishAuctionForItemWithAmount(tokenId);
            const [lot, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(lot.amount).eq(0);
            expect(lastBid.no).eq(0);
        });

        it("should finish and transfer tokens to new owners, for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            await contract.connect(bidder2).makeBid(tokenId, startPrice + 10);
            await delay(auctionDuration);

            const amountBefore = await erc20.balanceOf(owner.address);
            await contract.connect(bidder1).finishAuction(tokenId);
            const amountAfter = await erc20.balanceOf(owner.address);
            const nftOwnerAfter = await erc721.ownerOf(tokenId);

            expect(amountAfter).eq(amountBefore.add(startPrice + 10));
            expect(nftOwnerAfter).eq(bidder2.address);
        });

        it("should finish and transfer tokens to new owners, for nft-1155", async () => {
            const startPrice = 100;
            const amount = 10;
            await contract.listItemWithAmountOnAuction(tokenId, startPrice, amount);
            await contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice);
            await contract.connect(bidder2)
                .makeBidForItemWithAmount(tokenId, startPrice + 10);
            await delay(auctionDuration);

            const amountBefore = await erc20.balanceOf(owner.address);
            const nftAmountBefore = 
                await erc1155.balanceOf(bidder2.address, tokenId);
            
            await contract.finishAuctionForItemWithAmount(tokenId);
            
            const amountAfter = await erc20.balanceOf(owner.address);
            const nftAmountAfter = 
                await erc1155.balanceOf(bidder2.address, tokenId);

            expect(amountAfter).eq(amountBefore.add(startPrice + 10));
            expect(nftAmountAfter).eq(nftAmountBefore.add(amount));
        });

        it("should emit event for nft-721", async () => {
            const startPrice = 100;
            await contract.listItemOnAuction(tokenId, startPrice);
            await contract.connect(bidder1).makeBid(tokenId, startPrice);
            await contract.connect(bidder2).makeBid(tokenId, startPrice + 10);
            await delay(auctionDuration);
            
            await network.provider.send("evm_mine");

            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.connect(bidder1).finishAuction(tokenId);

            await expect(tx).to.emit(contract, "AuctionFinished")
                .withArgs(
                    nextTimestamp,
                    bidder2.address,
                    erc721.address,
                    tokenId,
                    0,
                    startPrice + 10
                );
        });

        it("should emit event for nft-1155", async () => {
            const startPrice = 100;
            const amount = 10;

            await contract.listItemWithAmountOnAuction(tokenId, startPrice, amount);
            await contract.connect(bidder1)
                .makeBidForItemWithAmount(tokenId, startPrice);
            await contract.connect(bidder2)
                .makeBidForItemWithAmount(tokenId, startPrice + 10);
            await delay(auctionDuration);
            await network.provider.send("evm_mine");
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.finishAuctionForItemWithAmount(tokenId);

            await expect(tx).to.emit(contract, "AuctionFinished")
                .withArgs(
                    nextTimestamp,
                    bidder2.address,
                    erc1155.address,
                    tokenId,
                    amount,
                    startPrice + 10
                );
        });
    });
});