import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MAERC1155, MAERC721, MAMAdmin } from "../typechain-types/contracts";
import { IMintableERC20 } from "../typechain-types/contracts/IMintableERC20";
const maerc20 = require("../required-data/MAERC20.json");

describe("mintable erc-721 functions", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let contract: MAMAdmin;
    let erc721: MAERC721;
    let erc1155: MAERC1155;
    let erc20: IMintableERC20;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];

        const factory721 = await ethers.getContractFactory("MAERC721", owner);
        erc721 = await factory721.deploy("test", "test");
        const factory1155 = await ethers.getContractFactory("MAERC1155", owner);
        erc1155 = await factory1155.deploy();
        const factory20 = 
            await ethers.getContractFactory(maerc20.abi, maerc20.bytecode, owner);
        erc20 = await factory20.deploy("test", "test") as IMintableERC20;

        const factory = await ethers.getContractFactory("MAMAdmin", owner);
        contract = await factory.deploy();
    });

    describe("pause/unpause", () => {
        it("should work if called by owner", async () => {
            await contract.pause();
            let paused = await contract.paused();
            expect(paused).eq(true);
            await contract.unpause();
            paused = await contract.paused();
            expect(paused).eq(false);
        });

        it("pause should revert if called not by owner", async () => {
            const tx = contract.connect(accounts[1]).pause();
            await expect(tx).to.be.reverted;
        });

        it("unpause should revert if called not by owner", async () => {
            const tx = contract.connect(accounts[1]).unpause();
            await expect(tx).to.be.reverted;
        });
    });

    describe("set tokens", () => {
        it("setExchangeToken should revert if not paused", async () => {
            const tx = contract.setExchangeToken(erc20.address);
            await expect(tx).to.be.reverted;
        });

        it("setNft721 should revert if not paused", async () => {
            const tx = contract.setNft721(erc721.address);
            await expect(tx).to.be.reverted;
        });

        it("setNft1155 should revert if not paused", async () => {
            const tx = contract.setNft1155(erc1155.address);
            await expect(tx).to.be.reverted;
        });

        it("setNft721 should revert if not erc721", async () => {
            await contract.pause();
            const tx = contract.setNft721(erc20.address);
            await expect(tx).to.be.reverted;
        });

        it("setNft1155 should revert if not erc1155", async () => {
            await contract.pause();
            const tx = contract.setNft1155(erc20.address);
            await expect(tx).to.be.reverted;
        });

        it("setExchangeToken should work if paused", async () => {
            await contract.pause();
            const tx = contract.setExchangeToken(erc20.address);
            await expect(tx).to.not.be.reverted;
        });

        it("setNft721 should work if paused", async () => {
            await contract.pause();
            const tx = contract.setNft721(erc721.address);
            await expect(tx).to.not.be.reverted;
        });

        it("setNft1155 should work if paused", async () => {
            await contract.pause();
            const tx = contract.setNft1155(erc1155.address);
            await expect(tx).to.not.be.reverted;
        });
    });
});