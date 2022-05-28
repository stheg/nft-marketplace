# NFT Marketplace

You can find here:

* ERC-721 contract - MAERC721.sol
* ERC-1155 contract - MAERC1155.sol
* Marketplace contract with auction functionality
  * MAMAdmin.sol - admin function to pause/unpause and set new tokens
  * MAStorage.sol - keeps 'Lot' info about listed items (common structure for both marketplace & auction)
  * MAMarketplace.sol - create item, list item, buy item, cancel item (keeps 'Bid' info in addition to MAStorage 'Lot' info) 
  * MAAuction.sol - list item on auction, make a bid, finish auction

You can find my deployed contracts and see how the NFTs look in OpenSea and Rarible using next URLs:

1. MAERC20 - exchange token to pay for NFTs: 
    * https://rinkeby.etherscan.io/token/0x1A13F7fB13BCa03FF646702C6Af9D699729A0C1d
3. MAERC721 - NFT:
    * https://rinkeby.etherscan.io/address/0x09b0aaF297699113d5A94A9d8F21A4FB783c1455
    * https://testnets.opensea.io/collection/manftv3
    * https://rinkeby.rarible.com/token/0x09b0aaf297699113d5a94a9d8f21a4fb783c1455:2?tab=details
4. MAERC1155 - collectable NFT:
    * https://rinkeby.etherscan.io/address/0x447cB65ce50D3153820f2963F994BB6D0dB55f41
    * https://testnets.opensea.io/collection/unidentified-contract-3mkmz3fclh
    * https://rinkeby.rarible.com/token/0x447cb65ce50d3153820f2963f994bb6d0db55f41:2?tab=owners
5. MAMarketplace + MAAuction
    * https://rinkeby.etherscan.io/address/0x8C3E78cbb7737f41aD58a68760eDc540C85d9372


Here is my IPFS metadata & images which I used for NFTs:
  * https://bafybeias3z4idhq47k7f6hlfgagiadeu6tkin4al47ue6izjxjgi6cjgim.ipfs.nftstorage.link/metadata
  * https://bafybeifziyb2ozmsjew2vdcsuipvw5r3n2ha3hzc5efu4ig2zvgr4tp25y.ipfs.nftstorage.link/images


Here is some tasks to deploy and to interact with deployed contracts:
* Deployment:
```
  npx hardhat run .\scripts\deploy-721.ts --network localhost/rinkeby
  npx hardhat run .\scripts\deploy-1155.ts --network localhost/rinkeby
  npx hardhat run .\scripts\deploy-marketplace.ts --network localhost/rinkeby
```
* Interaction:
  * Test Setup - should be used carefully, because it is assumed that participating accounts #1, #2, #3 have enough erc20 tokens
```
  npx hardhat test-setup --network rinkeby --contract <MA_MARKETPLACE_ADDRESS> --erc721 <MAERC721_ADDRESS> --erc1155 <MAERC1155_ADDRESS> --erc20 <MAERC20_ADDRESS>
```
  *  Tasks for interactions with tokens (20, 721, 1155)
```
  erc1155-mint          Mints requested NFT
  approve-for-all-1155  Approves operator ERC1155
  approve-for-all-721   Approves operator ERC721
  erc1155-set-uri       Sets a new URI for ERC-1155
  erc20-owner           Checks if owner
  erc721-mint           Mints requested NFT
  erc721-set-uri        Sets a new URI for ERC-721
  set-minter1155        Set minter for ERC1155
  set-minter721         Set minter for ERC721
```
  *  Auction tasks
```
  au-bid-nft1155        Make a bid on auction
  au-bid-nft721         Make a bid on auction
  au-finish-nft1155     Finish an auction
  au-finish-nft721      Finish an auction
  au-list-nft1155       List item on auction
  au-list-nft721        List item on auction
```
  *  Marketplace tasks
```
  create-nft1155        Request to mint tokens for recipient
  create-nft721         Request to mint a token for recipient
  list-nft1155          List item for selling
  list-nft721           List item for selling
  buy-nft1155           Make a bid on auction
  buy-nft721            Buy item
  cancel-nft1155        Unlist collection from selling
  cancel-nft721         Unlist item from selling
```
