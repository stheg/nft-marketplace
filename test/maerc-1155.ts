import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MAERC1155 } from "../typechain-types/contracts";

describe("mintable erc-1155 functions", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let contract: MAERC1155;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];

        const factory = await ethers.getContractFactory("MAERC1155", owner);
        contract = await factory.deploy();
    });

    it("should not revert if called by minter", async () => {
        const minter = accounts[1];
        await contract.setMinter(minter.address);
        const tx = contract.connect(minter).mint(owner.address, 1, 2, []);
        await expect(tx).to.not.be.reverted;
    });

    it("should revert if it's called not by minter", async () => {
        const minter = accounts[1];
        await contract.setMinter(minter.address);
        const tx = contract.connect(accounts[2]).mint(owner.address, 1, 2, []);
        await expect(tx).to.be.reverted;
    });

    it("setUri should revert if called not by owner", async () => {
        const tx = contract.connect(accounts[1]).setURI("test");
        await expect(tx).to.be.reverted;
    });

    it("setUri shouldn't revert if called by owner", async () => {
        const minter = accounts[1];
        await contract.setMinter(minter.address);
        await contract.connect(minter).mint(owner.address, 1, 1, []);

        await contract.setURI("test");
        const uri = await contract.uri(1);
        expect(uri).eq("test");
    });
});