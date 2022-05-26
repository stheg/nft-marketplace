//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract MAMAdmin is Ownable, Pausable {
    address internal _exchangeToken;
    address internal _nft721Address;
    string internal _nft721uri;
    address internal _nft1155Address;
    string internal _nft1155uri;

    function setExchangeToken(address newExchangeToken)
        external
        onlyOwner
        whenPaused
    {
        _exchangeToken = newExchangeToken;
    }

    function setNft721(address nft) external onlyOwner whenPaused {
        require(
            IERC721(nft).supportsInterface(type(IERC721).interfaceId),
            "MAMAdmin: it should be IERC721"
        );
        _nft721Address = nft;
    }

    function setNft1155(address collectableNft) external onlyOwner whenPaused {
        require(
            IERC1155(collectableNft).supportsInterface(
                type(IERC1155).interfaceId
            ),
            "MAMAdmin: it should be IERC1155"
        );
        _nft1155Address = collectableNft;
    }

    function _getNft721() internal view returns (IERC721) {
        return IERC721(_nft721Address);
    }

    function _getNft1155() internal view returns (IERC1155) {
        return IERC1155(_nft1155Address);
    }
}
