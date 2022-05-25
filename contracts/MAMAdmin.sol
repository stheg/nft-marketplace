//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "./Mintable.sol";

contract MAMAdmin is Ownable, Pausable {
    address internal _exchangeToken;
    address internal _nftAddress;
    address internal _collectableNftAddress;

    function setExchangeToken(address newExchangeToken)
        external
        onlyOwner
        whenPaused
    {
        _exchangeToken = newExchangeToken;
    }

    function setNFT(address nft) 
        external 
        onlyOwner 
        whenPaused 
    {
        require(
            IERC721(nft).supportsInterface(type(IERC721).interfaceId),
            "MAMAdmin: it should be IERC721"
        );
        _nftAddress = nft;
    }

    function setCollectableNFT(address collectableNft)
        external
        onlyOwner
        whenPaused
    {
        require(
            IERC1155(collectableNft).supportsInterface(type(IERC1155).interfaceId),
            "MAMAdmin: it should be IERC1155"
        );
        _collectableNftAddress = collectableNft;
    }

    function _getNFT() internal view returns (IERC721) {
        return IERC721(_nftAddress);
    }

    function _getCollectableNFT() internal view returns (IERC1155) {
        return IERC1155(_collectableNftAddress);
    }
}
