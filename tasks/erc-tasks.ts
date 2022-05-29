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
        await nft.mint(args.to, Number.parseInt(args.id));
    });

task("set-minter721", "Set minter for ERC721")
    .addParam("nft", "address of nft-721")
    .addParam("minter", "address of minter")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC721", args.nft, accounts[0]);

        await nft.setMinter(args.minter);
    });

task("approve-for-all-721", "Approves operator ERC721")
    .addParam("nft", "address of nft-721")
    .addParam("operator", "address of operator")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC721", args.nft, accounts[0]);

        await nft.setApprovalForAll(args.operator, true);
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
        await nft.mint(
            args.to, 
            Number.parseInt(args.id), 
            Number.parseInt(args.amount),
            []
        );
    });

task("set-minter1155", "Set minter for ERC1155")
    .addParam("nft", "address of nft-1155")
    .addParam("minter", "address of minter")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC1155", args.nft, accounts[0]);

        await nft.setMinter(args.minter);
    });

task("approve-for-all-1155", "Approves operator ERC1155")
    .addParam("nft", "address of nft-1155")
    .addParam("operator", "address of operator")
    .setAction(async (args, hre) => {
        const accounts = await hre.ethers.getSigners();
        const nft =
            await hre.ethers.getContractAt("MAERC1155", args.nft, accounts[0]);

        await nft.setApprovalForAll(args.operator, true);
    });

task("erc20-owner", "Checks if owner")
    .addParam("erc20", "address of erc20")
    .addParam("owner", "address of owner")
    .setAction(async (args, hre) => {
        const owner = await hre.ethers.getSigner(args.owner);
        
        const erc20 = await hre.ethers.getContractAt(
            "IMintableERC20", 
            args.erc20,
            owner
        );
        
        const a = await erc20.balanceOf(owner.address);
        console.log(a);
    });