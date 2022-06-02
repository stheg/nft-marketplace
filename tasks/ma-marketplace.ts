import { task } from "hardhat/config";

task("create-nft721", "Request to mint a token for recipient")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .addParam("owner", "address of recipient")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.createItem(args.tokenId, args.owner);
    });

task("create-nft1155", "Request to mint tokens for recipient")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .addParam("owner", "address of recipient")
    .addParam("amount", "amount of tokens")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.createItemWithAmount(
            args.tokenId, 
            args.owner, 
            args.amount
        );
    });

task("list-nft721", "List item for selling")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .addParam("price", "price")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.listItem(args.tokenId, args.price);
    });

task("list-nft1155", "List item for selling")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .addParam("price", "start price")
    .addParam("amount", "amount to list")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.listItemWithAmount(
            args.tokenId, 
            args.price, 
            args.amount
        );
    });

task("buy-nft721", "Buy item")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.buyItem(args.tokenId, owner.address);
    });

task("buy-nft1155", "Make a bid on auction")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .addParam("amount", "amount")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.buyItemWithAmount(args.tokenId, owner.address, args.amount);
    });

task("cancel-nft721", "Unlist item from selling")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.cancelItem(args.tokenId);
    });

task("cancel-nft1155", "Unlist collection from selling")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.cancelItemWithAmount(args.tokenId);
    });