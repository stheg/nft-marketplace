import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("admin functions", () => {
    let accounts: SignerWithAddress[];
    let owner: SignerWithAddress;
    
    beforeEach(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];
    });

    it("only owner can call setLock", async () => {
        
    });
});