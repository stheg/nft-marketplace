import { task } from "hardhat/config";

task("test-setup", "Performs setup of marketplace and test cases")
    .addParam("contract", "address of marketplace")
    .addParam("erc721", "address of erc-721 contract")
    .addParam("erc1155", "address of erc-1155 contract")
    .addParam("erc20", "address of erc-20 contract")
    .addOptionalParam("erc20owner", "owner of erc20 contract")
    .setAction(async (args, hre) => {
        const [owner, buyer1, buyer2] = await hre.ethers.getSigners();
        const erc20owner =
            args.erc20owner ? (await hre.ethers.getSigner(args.erc20owner)) : owner;
        const contract = await hre.ethers.getContractAt(
            "MAMarketplace",
            args.contract,
            owner
        );
        const erc20 = await hre.ethers.getContractAt(
            "IMintableERC20",
            args.erc20,
            erc20owner
        );
        const erc721 = await hre.ethers.getContractAt(
            "MAERC721",
            args.erc721,
            owner
        );
        const erc1155 = await hre.ethers.getContractAt(
            "MAERC1155",
            args.erc1155,
            owner
        );

        console.log("approving erc20 for contract");
        await erc20.connect(owner).approve(contract.address, 100);
        await erc20.connect(buyer1).approve(contract.address, 100);
        await erc20.connect(buyer2).approve(contract.address, 100);

        console.log("approving erc721 for contract");
        await erc721.setMinter(contract.address);
        await erc721.setApprovalForAll(contract.address, true);
        await erc721.connect(buyer1).setApprovalForAll(contract.address, true);
        await erc721.connect(buyer2).setApprovalForAll(contract.address, true);

        console.log("approving erc1155 for contract");
        await erc1155.setMinter(contract.address);
        await erc1155.setApprovalForAll(contract.address, true);
        await erc1155.connect(buyer1).setApprovalForAll(contract.address, true);
        await erc1155.connect(buyer2).setApprovalForAll(contract.address, true);

        console.log("setup the contract");
        await contract.pause();
        await contract.setExchangeToken(erc20.address);
        await contract.setNft721(erc721.address);
        await contract.setNft1155(erc1155.address);
        await contract.unpause();

        const tokenId = 2;
        const price1 = 10;
        const price2 = price1 + 5;
        const amount = 3;

        console.log("create NFTs");
        await contract.createItem(tokenId, owner.address);
        await contract.createItemWithAmount(tokenId, owner.address, amount);

        console.log("list item");
        await contract.listItem(tokenId, price1);
        console.log("buy item");
        await contract.connect(buyer1).buyItem(tokenId);
        
        console.log("list on auction");
        await contract.listItemWithAmountOnAuction(tokenId, price1, amount);
        console.log("bid 1");
        await contract.connect(buyer1).makeBidForItemWithAmount(tokenId, price1);
        console.log("bid 2");
        await contract.connect(buyer2).makeBidForItemWithAmount(tokenId, price2);
    });