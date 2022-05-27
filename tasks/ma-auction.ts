import { task } from "hardhat/config";

task("au-list-nft721", "List item on auction")
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
        await contract.listItemOnAuction(args.tokenId, args.price);
    });

task("au-list-nft1155", "List item on auction")
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
        await contract.listItemWithAmountOnAuction(
            args.tokenId, 
            args.price, 
            args.amount
        );
    });

task("au-bid-nft721", "Make a bid on auction")
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
        await contract.makeBid(args.tokenId, args.price);
    });

task("au-bid-nft1155", "Make a bid on auction")
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
        await contract.makeBidForItemWithAmount(args.tokenId, args.price);
    });

task("au-finish-nft721", "Finish an auction")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.finishAuction(args.tokenId);
    });

task("au-finish-nft1155", "Finish an auction")
    .addParam("contract", "address of marketplace")
    .addParam("tokenId", "token id")
    .setAction(async (args, hre) => {
        const [owner] = await hre.ethers.getSigners();
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        await contract.finishAuctionForItemWithAmount(args.tokenId);
    });