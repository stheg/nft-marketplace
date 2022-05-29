import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { MAERC1155, MAERC721, MAMarketplace } from "../typechain-types";
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
        await erc721["mint(address,uint256)"](owner.address, tokenId);

        const factory1155 = await ethers.getContractFactory("MAERC1155", owner);
        erc1155 = await factory1155.deploy();
        const factory20 = 
            await ethers.getContractFactory(maerc20.abi, maerc20.bytecode, owner);
        await erc1155.setMinter(owner.address);
        await erc1155["mint(address,uint256,uint256)"](owner.address, tokenId, defaultErc1155Amount);
        
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
            await expect(tx).to.be.revertedWith("MAStorage: nft already listed");
        });

        it("should set new price, but increase amount if already exists for nft-1155", async () => {
            const price1 = 100;
            const amount1 = 10;
            await contract.listItemWithAmount(tokenId, price1, amount1);
            const [item1, lastBid1] =
                await contract.getDetailsForItemWithAmount(tokenId);

            const price2 = 99;
            const amount2 = 1;
            await contract.listItemWithAmount(tokenId, price2, amount2);
            const [item, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(item.startPrice).eq(price2);
            expect(item.amount).eq(amount1 + amount2);
            expect(item.seller).eq(owner.address);
            expect(item.startDate.gt(item1.startDate)).eq(true);
        });

        it("should list item for nft-721", async () => {
            const price = 100;
            await contract.listItem(tokenId, price);
            const [item, lastBid] = await contract.getDetailsForItem(tokenId);
            expect(item.startPrice).eq(price);
            expect(item.seller).eq(owner.address);
        });

        it("should list item for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmount(tokenId, price, amount);
            const [item, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(item.startPrice).eq(price);
            expect(item.amount).eq(amount);
            expect(item.seller).eq(owner.address);
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
    });

    describe("buy item", () => {
        it("should revert if called when paused for nft-721", async () => {
            await contract.pause();
            const tx = contract.connect(buyer1).buyItem(tokenId);
            await expect(tx).to.be.reverted;
        });

        it("should revert if called when paused for nft-1155", async () => {
            await contract.pause();
            const tx = contract.connect(buyer1).buyItemWithAmount(tokenId, 1);
            await expect(tx).to.be.reverted;
        });

        it("should revert if not exists for nft-721", async () => {
            const tx = contract.connect(buyer1).buyItem(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert if not exists for nft-1155", async () => {
            const tx = contract.connect(buyer1).buyItemWithAmount(tokenId, 100);
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert if exceeds listed amount for nft-1155", async () => {
            const amount = 10;
            await contract.listItemWithAmount(tokenId, 100, amount);
            const tx = contract.connect(buyer1).buyItemWithAmount(tokenId, amount + 1);
            await expect(tx).to.be.revertedWith("MAMarketplace: wrong amount");
        });
        
        it("should reset info if amount equals the listed one for nft-721", async () => {
            const price = 100;
            const amount = 1;
            await contract.listItem(tokenId, price);
            await contract.connect(buyer1).buyItem(tokenId);
            const [item, lastBid] = await contract.getDetailsForItem(tokenId);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
            expect(item.seller).eq(ethers.constants.AddressZero);
        });

        it("should reset info if amount equals the listed one for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmount(tokenId, price, amount);
            await contract.connect(buyer1).buyItemWithAmount(tokenId, amount);
            const [item, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
            expect(item.seller).eq(ethers.constants.AddressZero);
        });

        it("should update info if amount less than the listed one for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            await contract.listItemWithAmount(tokenId, price, amount);
            const buyAmount = amount - 4;
            await contract.connect(buyer1).buyItemWithAmount(tokenId, buyAmount);
            const [item, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(item.startPrice).eq(price);
            expect(item.amount).eq(amount - buyAmount);
            expect(item.seller).eq(owner.address);
        });

        it("should transfer erc20 to owner for nft-721", async () => {
            const price = 100;
            await contract.listItem(tokenId, price);
            
            const amountBefore = await erc20.balanceOf(owner.address);
            await contract.connect(buyer1).buyItem(tokenId);
            const amountAfter = await erc20.balanceOf(owner.address);
            expect(amountAfter).eq(amountBefore.add(price));
        });

        it("should transfer erc20 to owner for nft-1155", async () => {
            const price = 100;
            const amount = 10;

            await contract.listItemWithAmount(tokenId, price, amount);
            const amountBefore = await erc20.balanceOf(owner.address);
            await contract.connect(buyer1).buyItemWithAmount(tokenId, amount);
            const amountAfter = await erc20.balanceOf(owner.address);

            expect(amountAfter).eq(amountBefore.add(amount*price));
        });

        it("should transfer token to buyer for nft-721", async () => {
            const price = 100;
            const amount = 1;
            await contract.listItem(tokenId, price);
            await contract.connect(buyer1).buyItem(tokenId);

            const newOwner = await erc721.ownerOf(tokenId);
            expect(newOwner).eq(buyer1.address);
        });

        it("should transfer token to buyer for nft-1155", async () => {
            const price = 100;
            const amount = 10;
            const balanceBefore =
                await erc1155.balanceOf(buyer1.address, tokenId);

            await contract.listItemWithAmount(tokenId, price, amount);
            await contract.connect(buyer1).buyItemWithAmount(tokenId, amount);

            const balanceAfter =
                await erc1155.balanceOf(buyer1.address, tokenId);
            expect(balanceAfter).eq(balanceBefore.add(amount));
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
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert if not exists for nft-1155", async () => {
            const tx = contract.cancelItemWithAmount(tokenId);
            await expect(tx).to.be.revertedWith("MAStorage: no such nft");
        });

        it("should revert if not seller for nft-721", async () => {
            await contract.listItem(tokenId, 10);
            const tx = contract.connect(buyer1).cancelItem(tokenId);
            await expect(tx).to.be.revertedWith("MAMarketplace: no access");
        });

        it("should revert if not seller for nft-1155", async () => {
            await contract.listItemWithAmount(tokenId, 10, 5);
            const tx = contract.connect(buyer1).cancelItemWithAmount(tokenId);
            await expect(tx).to.be.revertedWith("MAMarketplace: no access");
        });

        it("should reset info for nft-721", async () => {
            await contract.listItem(tokenId, 10);
            await contract.cancelItem(tokenId);

            const [item, lastBid] =
                await contract.getDetailsForItem(tokenId);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
            expect(item.seller).eq(ethers.constants.AddressZero);
        });

        it("should reset info for nft-1155", async () => {
            await contract.listItemWithAmount(tokenId, 10, 5);
            await contract.cancelItemWithAmount(tokenId);

            const [item, lastBid] =
                await contract.getDetailsForItemWithAmount(tokenId);
            expect(item.startPrice).eq(0);
            expect(item.amount).eq(0);
            expect(item.seller).eq(ethers.constants.AddressZero);
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
    });
});