//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAERC721.sol";
import "./MAERC1155.sol";
import "./MAAuction.sol";

/// @title MA Marketplace
/// @notice Provides sell/buy functionality
/// @dev Defines functions to list, unlist(cancel) and buy items
contract MAMarketplace is MAAuction {
    event Sold(
        address indexed token,
        address indexed owner,
        address indexed buyer,
        uint64 date,
        uint64 tokenId,
        uint128 price,
        uint128 amount
    );

    event Cancelled(
        address indexed token,
        address indexed owner,
        uint64 indexed tokenId,
        uint64 date
    );

    event ItemCreated(
        address indexed owner,
        address indexed token,
        uint64 indexed tokenId,
        uint64 date,
        uint128 amount
    );

    error CannotListItemIfAuctionExists();

    /// @notice create ERC721 item
    function createItem(uint64 tokenId, address owner) external whenNotPaused {
        MAERC721(_nft721Address).mint(owner, tokenId);
        emit ItemCreated(owner, _nft721Address, tokenId, uint64(block.timestamp), 0);
    }

    /// @notice create ERC1155 item
    function createItemWithAmount(
        uint64 tokenId,
        address owner,
        uint128 amount
    ) external whenNotPaused {
        MAERC1155(_nft1155Address).mint(owner, tokenId, amount, "");
        emit ItemCreated(owner, _nft1155Address, tokenId, uint64(block.timestamp), amount);
    }

    /// @notice list ERC721 item with desired price
    function listItem(uint64 tokenId, uint128 price)
        external
        whenNotPaused
    {
        _checkIfNotExists(tokenId, _nft721Address, msg.sender);
        _listItemWithAmount(tokenId, _nft721Address, price, 0);
        _transferERC721Tokens(msg.sender, address(this), tokenId);
    }

    /// @notice list ERC1155 item with desired amount and price per one token
    function listItemWithAmount(
        uint64 tokenId,
        uint128 pricePerOne,
        uint128 amount
    )
        external
        whenNotPaused
    {
        Lot storage item = _getLot(tokenId, _nft1155Address, msg.sender);
        if (item.isAuction)
            revert CannotListItemIfAuctionExists();
        _listItemWithAmount(
            tokenId,
            _nft1155Address,
            pricePerOne, //use new price for all
            item.amount + amount //increase amount
        );
        _transferERC1155Tokens(msg.sender, address(this), tokenId, amount);
    }

    /// @notice buy ERC721 item
    function buyItem(uint64 tokenId, address seller) external whenNotPaused {
        _buyItemWithAmount(tokenId, _nft721Address, seller, 0);
        _transferERC721Tokens(address(this), msg.sender, tokenId);
    }

    /// @notice buy desired amount of ERC1155 item
    function buyItemWithAmount(uint64 tokenId, address seller, uint128 amount)
        external
        whenNotPaused
    {
        _buyItemWithAmount(tokenId, _nft1155Address, seller, amount);
        _transferERC1155Tokens(address(this), msg.sender, tokenId, amount);
    }

    /// @notice cancel selling of ERC721 item
    function cancelItem(uint64 tokenId) external whenNotPaused {
        (address recipient, ) = _cancel(tokenId, _nft721Address);
        _transferERC721Tokens(address(this), recipient, tokenId);
    }

    /// @notice cancel selling of ERC1155 item
    function cancelItemWithAmount(uint64 tokenId) external whenNotPaused {
        (address recipient, uint128 amount) = _cancel(tokenId, _nft1155Address);
        _transferERC1155Tokens(address(this), recipient, tokenId, amount);
    }

    //########################### Private #####################################

    function _listItemWithAmount(
        uint64 tokenId,
        address token,
        uint128 pricePerOne,
        uint128 amount // = 0 for ERC721
    ) private {
        _setLotWithAmount(tokenId, token, msg.sender, pricePerOne, amount);
        _emitsItemListed(false, tokenId, token, pricePerOne, amount);
    }

    function _buyItemWithAmount(
        uint64 tokenId,
        address token,
        address seller,
        uint128 amount // = 0 for ERC721
    ) private {
        Lot memory item = _checkIfExists(tokenId, token, seller);
        if (item.amount == amount) {
            _resetLot(tokenId, token, seller);
        } else if (item.amount > amount) {
            _setLotWithAmount(
                tokenId,
                token,
                seller,
                item.startPrice,
                item.amount - amount
            );
        } else {
            revert("MAMarketplace: wrong amount");
        }

        uint128 exchangeTokenAmount = _isCollectableToken(token)
            ? item.startPrice * amount
            : item.startPrice;
        _transferExchangeTokens(msg.sender, seller, exchangeTokenAmount);

        emit Sold(
            token,
            seller,
            msg.sender,
            uint64(block.timestamp),
            tokenId,
            item.startPrice,
            amount
        );
    }

    function _cancel(uint64 tokenId, address token)
        private
        returns (address nftRecipient, uint128 amount)
    {
        Lot memory item = _checkIfExists(tokenId, token, msg.sender);

        _resetLot(tokenId, token, msg.sender);

        emit Cancelled(token, msg.sender, tokenId, uint64(block.timestamp));

        return (msg.sender, item.amount);
    }

    function _isCollectableToken(address token) private view returns (bool) {
        return IERC165(token).supportsInterface(type(IERC1155).interfaceId);
    }
}
