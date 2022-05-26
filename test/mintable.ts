import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Mintable } from "../typechain-types";

describe("set minter", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let contract: Mintable;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];

        const factory = await ethers.getContractFactory("Mintable", owner);
        contract = await factory.deploy();
    });

    it("should revert if called by minter", async () => {
        const minter = accounts[1];
        await contract.setMinter(minter.address);
        
        const minterAddr = await contract.minter();
        await expect(minterAddr).eq(minter.address);
    });

    it("should revert if it's called not by minter", async () => {
        const minter = accounts[1];
        const tx = contract.connect(minter).setMinter(minter.address);
        await expect(tx).to.be.reverted;
    });

    it("should work if called by minter", async () => {
        const minter = accounts[1];
        await contract.setMinter(minter.address);

        await contract.connect(minter)["mint(address,uint256)"](owner.address, 1);
    });
});