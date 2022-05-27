import { task } from "hardhat/config";

task("erc721-set-uri", "Sets a new URI for ERC-721")
    .addParam("nft", "address of nft-721")
    .addParam("uri", "new URI")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC721", args.nft, accounts[0]);

        await nft.setURI(args.uri);
    });

task("erc721-mint", "Mints requested NFT")
    .addParam("nft", "address of nft-721 to be minted")
    .addParam("id", "token id of nft to be minted")
    .addParam("to", "address of recipient")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC721", args.nft, accounts[0]);

        await nft.setMinter(accounts[0].address);
        await nft["mint(address,uint256)"](args.to, Number.parseInt(args.id));
    });

task("erc1155-set-uri", "Sets a new URI for ERC-1155")
    .addParam("nft", "address of nft-1155")
    .addParam("uri", "new URI")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC1155", args.nft, accounts[0]);

        await nft.setURI(args.uri);
    });

task("erc1155-mint", "Mints requested NFT")
    .addParam("nft", "address of nft-1155 to be minted")
    .addParam("id", "token id of nft to be minted")
    .addParam("to", "address of recipient")
    .addParam("amount", "number of tokens to mint in case of ERC-1155")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC1155", args.nft, accounts[0]);

        await nft.setMinter(accounts[0].address);
        await nft["mint(address,uint256,uint256)"](
            args.to, 
            Number.parseInt(args.id), 
            Number.parseInt(args.amount)
        );
    });