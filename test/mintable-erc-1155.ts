import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MAUniqCollection } from "../typechain-types";

describe("mintable erc-1155 functions", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    let contract: MAUniqCollection;

    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];

        const factory = await ethers.getContractFactory("MAUniqCollection", owner);
        contract = await factory.deploy();
    });

    it("should revert if called by minter", async () => {
        const minter = accounts[1];
        await contract.setMinter(minter.address);
        const tx = contract.connect(minter).mint(owner.address, 1, 2);
        await expect(tx).to.not.be.reverted;
    });

    it("should revert if it's called not by minter", async () => {
        const minter = accounts[1];
        await contract.setMinter(minter.address);
        const tx = contract.connect(accounts[2]).mint(owner.address, 1, 2);
        await expect(tx).to.be.revertedWith("Mintable: No Access");
    });
});