import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { setTimeInBlockchain } from "../scripts/misc";
import { MAERC1155, MAERC721, MAMarketplace } from "../typechain-types/contracts";
import { IMintableERC20 } from "../typechain-types/contracts/IMintableERC20";
const maerc20 = require("../required-data/MAERC20.json");

describe("MA Marketplace", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let buyer1: SignerWithAddress;
    let buyer2: SignerWithAddress;
    let contract: MAMarketplace;
    let erc721: MAERC721;
    let erc1155: MAERC1155;
    let erc20: IMintableERC20;

    const tokenId = 1;
    const defaultErc20Amount = 1000;
    const defaultErc1155Amount = 100;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        buyer1 = accounts[1];
        buyer2 = accounts[2];

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

        const factory = await ethers.getContractFactory("MAMarketplace", owner);
        contract = await factory.deploy();

        await contract.pause();

        await contract.setNft721(erc721.address);
        await contract.setNft1155(erc1155.address);
        await contract.setExchangeToken(erc20.address);

        await contract.unpause();

        await erc721.setApprovalForAll(contract.address, true);
        await erc1155.setApprovalForAll(contract.address, true);

        await erc20.mint(owner.address, defaultErc20Amount);
        await erc20.mint(buyer1.address, defaultErc20Amount);
        await erc20.mint(buyer2.address, defaultErc20Amount);

        await erc20.connect(owner).approve(contract.address, defaultErc20Amount);
        await erc20.connect(buyer1).approve(contract.address, defaultErc20Amount);
        await erc20.connect(buyer2).approve(contract.address, defaultErc20Amount);
    });

    describe("create item", () => {
        it("should revert if called when paused for nft-721", async () => {
            await contract.pause();
            const tx = contract.createItem(tokenId, owner.address);
            await expect(tx).to.be.reverted;
        });

        it("should revert if called when paused for nft-1155", async () => {
            await contract.pause();
            const tx = contract.createItemWithAmount(tokenId, owner.address, 2);
            await expect(tx).to.be.reverted;
        });

        it("should mint token for nft-721", async () => {
            await erc721.setMinter(contract.address);
            await contract.createItem(123, owner.address);
            const newOwner = await erc721.ownerOf(123);
            expect(newOwner).eq(owner.address);
        });

        it("should mint tokens for nft-1155", async () => {
            await erc1155.setMinter(contract.address);
            const amount = 20;
            const amountBefore = await erc1155.balanceOf(owner.address, tokenId);
            await contract.createItemWithAmount(tokenId, owner.address, amount);
            const amountAfter = await erc1155.balanceOf(owner.address, tokenId);

            expect(amountAfter).eq(amountBefore.add(amount));
        });

        it("should emit event for nft-721", async () => {
            await erc721.setMinter(contract.address);
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.createItem(123, owner.address);

            await expect(tx).to.emit(contract, "ItemCreated")
                .withArgs(
                    owner.address,
                    erc721.address,
                    123,
                    nextTimestamp,
                    0
                );
        });

        it("should emit event for nft-1155", async () => {
            await erc1155.setMinter(contract.address);
            const amount = 10;

            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.createItemWithAmount(tokenId, owner.address, amount);

            await expect(tx).to.emit(contract, "ItemCreated")
                .withArgs(
                    owner.address,
                    erc1155.address,
                    tokenId,
                    nextTimestamp,
                    amount
                );
        });
    });

    describe("list item", () => {
        it("should revert if called when paused for nft-721", async () => {
            await contract.pause();
            const tx = contract.listItem(tokenId, 1);
            await expect(tx).to.be.reverted;
        });

        it("should revert if called when paused for nft-1155", async () => {
            await contract.pause();
            const tx = contract.listItemWithAmount(tokenId, 1, 2);
            await expect(tx).to.be.reverted;
        });

        it("should revert if already exists for nft-721", async () => {
            await contract.listItem(tokenId, 1);
            const tx = contract.listItem(tokenId, 1);
            await expect(tx).to.be.revertedWith("MAStorage: lot already listed");
        });

        it("should set new price, but increase amount if already exists for nft-1155", async () => {
            const price1 = 100;
            const amount1 = 10;
            await contract.listItemWithAmount(tokenId, price1, amount1);
            const [item1, lastBid1] =
                await contract.getDetailsForItem(tokenId, erc1155.address, owner.address);

            const price2 = 99;
            const amount2 = 1;
            await contract.listItemWithAmount(tokenId, price2, amount2);
            const [item, lastBid] =
                await contract.getDetailsForItem(tokenId, erc1155.address, owner.address);
            expect(item.startPrice).eq(price2);
            expect(item.amount).eq(amount1 + amount2);
            expect(item.startDate.gt(item1.startDate)).eq(true);
        });

        it("should list item for nft-721", async () => {
            const price = 100;
            await contract.listItem(tokenId, price);
            const [item, lastBid] = await contract.getDetailsForItem(tokenId, erc721.address, owner.address);
            expect(item.startPrice).eq(price);
        });

        it("should list item for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmount(tokenId, price, amount);
            const [item, lastBid] =
                await contract.getDetailsForItem(tokenId, erc1155.address, owner.address);
            expect(item.startPrice).eq(price);
            expect(item.amount).eq(amount);
        });

        it("should transfer token from owner for nft-721", async () => {
            const price = 100;
            const amount = 1;
            await contract.listItem(tokenId, price);

            const newOwner = await erc721.ownerOf(tokenId);
            expect(newOwner).eq(contract.address);
        });

        it("should transfer token from owner for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            const balanceBefore =
                await erc1155.balanceOf(contract.address, tokenId);

            await contract.listItemWithAmount(tokenId, price, amount);

            const balanceAfter =
                await erc1155.balanceOf(contract.address, tokenId);
            expect(balanceAfter).eq(balanceBefore.add(amount));
        });

        it("should revert if auction item listed for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmountOnAuction(tokenId, price, amount);
            const tx = contract.listItemWithAmount(tokenId, price, amount);

            await expect(tx).to.be.revertedWith("CannotListItemIfAuctionExists");
        });

        it("should emit event for nft-721", async () => {
            const price = 100;
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.listItem(tokenId, price);

            await expect(tx).to.emit(contract, "ItemListed")
                .withArgs(
                    owner.address, 
                    erc721.address, 
                    tokenId, 
                    price, 
                    0, //amount
                    nextTimestamp, 
                    false
                );
        });

        it("should emit event for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.listItemWithAmount(tokenId, price, amount);
            
            await expect(tx).to.emit(contract, "ItemListed")
                .withArgs(
                    owner.address,
                    erc1155.address,
                    tokenId,
                    price,
                    amount,
                    nextTimestamp,
                    false
                );
        });

        it("should work for different owners nft-1155", async () => {
            const [price1, price2] = [100, 101];
            const [amount1, amount2] = [10, 5];
            const [seller1, seller2] = [buyer1, buyer2];
            
            await erc1155.mint(seller1.address, tokenId, amount1, []);
            await erc1155.connect(seller1).setApprovalForAll(contract.address, true);
            await erc1155.mint(seller2.address, tokenId, amount2, []);
            await erc1155.connect(seller2).setApprovalForAll(contract.address, true);

            await contract.connect(seller1).listItemWithAmount(tokenId, price1, amount1);
            await contract.connect(seller2).listItemWithAmount(tokenId, price2, amount2);
            const [item1, lastBid1] =
                await contract.getDetailsForItem(tokenId, erc1155.address, seller1.address);
            const [item2, lastBid2] =
                await contract.getDetailsForItem(tokenId, erc1155.address, seller2.address);

            expect(item1.startPrice).eq(price1);
            expect(item2.startPrice).eq(price2);
            expect(item1.amount).eq(amount1);
            expect(item2.amount).eq(amount2);
        });
    });

    describe("buy item", () => {
        it("should revert if called when paused for nft-721", async () => {
            await contract.pause();
            const tx = contract.connect(buyer1).buyItem(tokenId, owner.address);
            await expect(tx).to.be.reverted;
        });

        it("should revert if called when paused for nft-1155", async () => {
            await contract.pause();
            const tx = contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, 1);
            await expect(tx).to.be.reverted;
        });

        it("should revert if not exists for nft-721", async () => {
            const tx = contract.connect(buyer1).buyItem(tokenId, owner.address);
            await expect(tx).to.be.revertedWith("MAStorage: no such lot");
        });

        it("should revert if not exists for nft-1155", async () => {
            const tx = contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, 100);
            await expect(tx).to.be.revertedWith("MAStorage: no such lot");
        });

        it("should revert if exceeds listed amount for nft-1155", async () => {
            const amount = 10;
            await contract.listItemWithAmount(tokenId, 100, amount);
            const tx = contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, amount + 1);
            await expect(tx).to.be.revertedWith("MAMarketplace: wrong amount");
        });

        it("should reset info if amount equals the listed one for nft-721", async () => {
            const price = 100;
            const amount = 1;
            await contract.listItem(tokenId, price);
            await contract.connect(buyer1).buyItem(tokenId, owner.address);
            const [item, lastBid] = await contract.getDetailsForItem(tokenId, erc721.address, owner.address);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
        });

        it("should reset info if amount equals the listed one for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmount(tokenId, price, amount);
            await contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, amount);
            const [item, lastBid] =
                await contract.getDetailsForItem(tokenId, erc1155.address, owner.address);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
        });

        it("should update info if amount less than the listed one for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmount(tokenId, price, amount);
            const buyAmount = amount - 4;
            await contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, buyAmount);
            const [item, lastBid] =
                await contract.getDetailsForItem(tokenId, erc1155.address, owner.address);
            expect(item.startPrice).eq(price);
            expect(item.amount).eq(amount - buyAmount);
        });

        it("should transfer erc20 to owner for nft-721", async () => {
            const price = 100;
            await contract.listItem(tokenId, price);

            const amountBefore = await erc20.balanceOf(owner.address);
            await contract.connect(buyer1).buyItem(tokenId, owner.address);
            const amountAfter = await erc20.balanceOf(owner.address);
            expect(amountAfter).eq(amountBefore.add(price));
        });

        it("should transfer erc20 to owner for nft-1155", async () => {
            const price = 100;
            const amount = 10;

            await contract.listItemWithAmount(tokenId, price, amount);
            const amountBefore = await erc20.balanceOf(owner.address);
            await contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, amount);
            const amountAfter = await erc20.balanceOf(owner.address);

            expect(amountAfter).eq(amountBefore.add(amount * price));
        });

        it("should transfer token to buyer for nft-721", async () => {
            const price = 100;
            await contract.listItem(tokenId, price);
            await contract.connect(buyer1).buyItem(tokenId, owner.address);

            const newOwner = await erc721.ownerOf(tokenId);
            expect(newOwner).eq(buyer1.address);
        });

        it("should transfer token to buyer for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            const balanceBefore =
                await erc1155.balanceOf(buyer1.address, tokenId);

            await contract.listItemWithAmount(tokenId, price, amount);
            await contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, amount);

            const balanceAfter =
                await erc1155.balanceOf(buyer1.address, tokenId);
            expect(balanceAfter).eq(balanceBefore.add(amount));
        });

        it("should emit event for nft-721", async () => {
            const price = 100;

            await contract.listItem(tokenId, price);
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.connect(buyer1).buyItem(tokenId, owner.address);

            await expect(tx).to.emit(contract, "Sold")
                .withArgs(
                    erc721.address,
                    owner.address,
                    buyer1.address,
                    nextTimestamp,
                    tokenId,
                    price,
                    0 //amount
                );
        });

        it("should emit event for nft-1155", async () => {
            const price = 100;
            const amount = 10;

            await contract.listItemWithAmount(tokenId, price, amount);
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.connect(buyer1).buyItemWithAmount(tokenId, owner.address, amount);

            await expect(tx).to.emit(contract, "Sold")
                .withArgs(
                    erc1155.address,
                    owner.address,
                    buyer1.address,
                    nextTimestamp,
                    tokenId,
                    price,
                    amount
                );
        });
    });

    describe("cancel item", () => {
        it("should revert if called when paused for nft-721", async () => {
            await contract.pause();
            const tx = contract.cancelItem(tokenId);
            await expect(tx).to.be.reverted;
        });

        it("should revert if called when paused for nft-1155", async () => {
            await contract.pause();
            const tx = contract.cancelItemWithAmount(tokenId);
            await expect(tx).to.be.reverted;
        });

        it("should revert if not exists for nft-721", async () => {
            const tx = contract.cancelItem(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such lot");
        });

        it("should revert if not exists for nft-1155", async () => {
            const tx = contract.cancelItemWithAmount(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such lot");
        });

        it("should revert if nothing to cancel for nft-721", async () => {
            await contract.listItem(tokenId, 10);
            const tx = contract.connect(buyer1).cancelItem(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such lot");
        });

        it("should revert if nothing to cancel for nft-1155", async () => {
            await contract.listItemWithAmount(tokenId, 10, 5);
            const tx = contract.connect(buyer1).cancelItemWithAmount(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such lot");
        });

        it("should reset info for nft-721", async () => {
            await contract.listItem(tokenId, 10);
            await contract.cancelItem(tokenId);

            const [item, lastBid] =
                await contract.getDetailsForItem(tokenId, erc721.address, owner.address);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
            expect(item.startDate).eq(0);
        });

        it("should reset info for nft-1155", async () => {
            await contract.listItemWithAmount(tokenId, 10, 5);
            await contract.cancelItemWithAmount(tokenId);

            const [item, lastBid] =
                await contract.getDetailsForItem(tokenId, erc1155.address, owner.address);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
            expect(item.startDate).eq(0);
        });

        it("should transfer token back to owner for nft-721", async () => {
            const price = 100;
            const amount = 1;
            await contract.listItem(tokenId, price);
            await contract.cancelItem(tokenId);

            const newOwner = await erc721.ownerOf(tokenId);
            expect(newOwner).eq(owner.address);
        });

        it("should transfer tokens back to owner for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmount(tokenId, price, amount);

            const balanceBefore =
                await erc1155.balanceOf(owner.address, tokenId);

            await contract.cancelItemWithAmount(tokenId);

            const balanceAfter =
                await erc1155.balanceOf(owner.address, tokenId);
            expect(balanceAfter).eq(balanceBefore.add(amount));
        });

        it("should emit event for nft-721", async () => {
            const price = 100;

            await contract.listItem(tokenId, price);
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.cancelItem(tokenId);

            await expect(tx).to.emit(contract, "Cancelled")
                .withArgs(
                    erc721.address,
                    owner.address,
                    tokenId,
                    nextTimestamp
                );
        });

        it("should emit event for nft-1155", async () => {
            const price = 100;
            const amount = 10;

            await contract.listItemWithAmount(tokenId, price, amount);
            const nextTimestamp = await setTimeInBlockchain();
            const tx = contract.cancelItemWithAmount(tokenId);

            await expect(tx).to.emit(contract, "Cancelled")
                .withArgs(
                    erc1155.address,
                    owner.address,
                    tokenId,
                    nextTimestamp
                );
        });
    });
});