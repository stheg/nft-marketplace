//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/// @title MA Admin
/// @notice Provides admin functionality
/// @dev Defines functions to set tokens
contract MAMAdmin is Ownable, Pausable, ERC721Holder, ERC1155Holder {
    address internal _exchangeToken;
    address internal _nft721Address;
    address internal _nft1155Address;

    function setExchangeToken(address newExchangeToken)
        external
        onlyOwner
        whenPaused
    {
        _exchangeToken = newExchangeToken;
    }

    function setNft721(address nft721) external onlyOwner whenPaused {
        IERC721(nft721).supportsInterface(type(IERC721).interfaceId);
        _nft721Address = nft721;
    }

    function setNft1155(address nft1155) external onlyOwner whenPaused {
        IERC1155(nft1155).supportsInterface(type(IERC1155).interfaceId);
        _nft1155Address = nft1155;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _getNft721() internal view returns (IERC721) {
        return IERC721(_nft721Address);
    }

    function _getNft1155() internal view returns (IERC1155) {
        return IERC1155(_nft1155Address);
    }

    function _transferERC721Tokens(
        address from,
        address to,
        uint64 tokenId
    ) internal {
        if (to.code.length > 0) {//isContract
            _getNft721().safeTransferFrom(from, to, tokenId);
        } else {
            _getNft721().transferFrom(from, to, tokenId);
        }
    }

    function _transferERC1155Tokens(
        address from,
        address to,
        uint64 tokenId,
        uint128 amount
    ) internal {
        _getNft1155().safeTransferFrom(from, to, tokenId, amount, "");
    }

    function _transferExchangeTokens(
        address from,
        address to,
        uint128 amount
    ) internal {
        IERC20(_exchangeToken).transferFrom(from, to, amount);
    }
}
