//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAERC721.sol";
import "./MAERC1155.sol";
import "./MAAuction.sol";

/// @title MA Marketplace
/// @notice Provides sell/buy functionality
/// @dev Defines functions to list, unlist(cancel) and buy items
contract MAMarketplace is MAAuction {
    /// @notice create ERC721 item
    function createItem(uint256 tokenId, address owner) external whenNotPaused {
        MAERC721(_nft721Address).mint(owner, tokenId);
    }

    /// @notice create ERC1155 item
    function createItemWithAmount(
        uint256 tokenId,
        address owner,
        uint256 amount
    ) external whenNotPaused {
        MAERC1155(_nft1155Address).mint(owner, tokenId, amount, "");
    }

    /// @notice list ERC721 item with desired price
    function listItem(uint64 tokenId, uint128 price) external whenNotPaused {
        _checkIfNotExists(tokenId, _nft721Address);
        _listItemWithAmount(tokenId, _nft721Address, price, 0);
        _transferERC721Tokens(msg.sender, address(this), tokenId);
    }

    /// @notice list ERC1155 item with desired amount and price per one token
    function listItemWithAmount(
        uint64 tokenId,
        uint128 pricePerOne,
        uint128 amount
    ) external whenNotPaused {
        Lot storage item = _getLot(tokenId, _nft1155Address);
        _listItemWithAmount(
            tokenId,
            _nft1155Address,
            pricePerOne, //use new price for all
            item.amount + amount //increase amount
        );
        _transferERC1155Tokens(
            msg.sender,
            address(this),
            tokenId,
            amount
        );
    }

    /// @notice buy ERC721 item
    function buyItem(uint64 tokenId) external whenNotPaused {
        _buyItemWithAmount(tokenId, _nft721Address, 0);
        _transferERC721Tokens(address(this), msg.sender, tokenId);
    }

    /// @notice buy desired amount of ERC1155 item
    function buyItemWithAmount(uint64 tokenId, uint128 amount)
        external
        whenNotPaused
    {
        _buyItemWithAmount(tokenId, _nft1155Address, amount);
        _transferERC1155Tokens(
            address(this),
            msg.sender,
            tokenId,
            amount
        );
    }

    /// @notice cancel selling of ERC721 item
    function cancelItem(uint64 tokenId) external whenNotPaused {
        (address recipient, ) = _cancel(tokenId, _nft721Address);
        _transferERC721Tokens(address(this), recipient, tokenId);
    }

    /// @notice cancel selling of ERC1155 item
    function cancelItemWithAmount(uint64 tokenId) external whenNotPaused {
        (address recipient, uint128 amount) = _cancel(tokenId, _nft1155Address);
        _transferERC1155Tokens(
            address(this),
            recipient,
            tokenId,
            amount
        );
    }

    //########################### Private #####################################

    function _listItemWithAmount(
        uint64 tokenId,
        address token,
        uint128 pricePerOne,
        uint128 amount // = 0 for ERC721
    ) private {
        _setLotWithAmount(tokenId, token, msg.sender, pricePerOne, amount);
    }

    function _buyItemWithAmount(
        uint64 tokenId,
        address token,
        uint128 amount // = 0 for ERC721
    ) private {
        Lot memory item = _checkIfExists(tokenId, token);
        if (item.amount == amount) {
            _resetLot(tokenId, token);
        } else if (item.amount > amount) {
            _setLotWithAmount(
                tokenId,
                token,
                item.seller,
                item.startPrice,
                item.amount - amount
            );
        } else {
            revert("MAMarketplace: wrong amount");
        }

        uint128 exchangeTokenAmount = _isCollectableToken(token)
            ? item.startPrice * amount
            : item.startPrice;
        _transferExchangeTokens(msg.sender, item.seller, exchangeTokenAmount);
    }

    function _cancel(uint64 tokenId, address token)
        private
        returns (address nftRecipient, uint128 amount)
    {
        Lot memory item = _checkIfExists(tokenId, token);
        require(msg.sender == item.seller, "MAMarketplace: no access");
        _resetLot(tokenId, token);
        return (item.seller, item.amount);
    }

    function _isCollectableToken(address token) private view returns (bool) {
        return token == _nft1155Address;
    }
}
