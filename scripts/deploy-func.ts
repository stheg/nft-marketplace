import { ethers } from "hardhat";

export default async function deployContractByAccount1(contractName: string, params: any[] | undefined = undefined) {
  const [owner] = await ethers.getSigners();
  const factory = await ethers.getContractFactory(contractName, owner);
  const contract = await factory.deploy(params);

  await contract.deployed();

  console.log(contractName + " deployed to: ", contract.address);
}