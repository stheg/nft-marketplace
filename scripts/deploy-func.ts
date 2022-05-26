import { ethers } from "hardhat";

export default async function deployContractByAccount1(
  contractName: string, 
  params: Array<any> | undefined = undefined
) {
  const [owner] = await ethers.getSigners();
  const factory = await ethers.getContractFactory(contractName, owner);
  const d = params ? factory.deploy(params[0], params[1]) : factory.deploy();
  const contract = await d;
  await contract.deployed();

  console.log(
    contractName + 
    " deployed with (" + 
    (params ?? "no params") + 
    ") to: " + 
    contract.address
  );
}