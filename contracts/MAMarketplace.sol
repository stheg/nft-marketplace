//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Mintable.sol";
import "./MAAuction.sol";

/// @title MA Marketplace
/// @notice Provides sell/buy functionality
/// @dev Defines functions to list, unlist(cancel) and buy items
contract MAMarketplace is MAAuction {
    function createItem(uint256 tokenId, address owner) external whenNotPaused {
        Mintable(_nft721Address).mint(owner, tokenId);
    }

    function createItemWithAmount(
        uint256 tokenId,
        address owner,
        uint256 amount
    ) external whenNotPaused {
        Mintable(_nft1155Address).mint(owner, tokenId, amount);
    }

    function listItem(uint64 tokenId, uint128 price) external whenNotPaused {
        _checkIfNotExists(tokenId, _nft721Address);
        _listItemWithAmount(tokenId, _nft721Address, price, 0);
        _getNft721().safeTransferFrom(msg.sender, address(this), tokenId);
    }

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
        _getNft1155().safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );
    }

    function buyItem(uint64 tokenId) external whenNotPaused {
        _buyItemWithAmount(tokenId, _nft721Address, 0);
        _getNft721().transferFrom(address(this), msg.sender, tokenId);
    }

    function buyItemWithAmount(uint64 tokenId, uint128 amount)
        external
        whenNotPaused
    {
        _buyItemWithAmount(tokenId, _nft1155Address, amount);
        _getNft1155().safeTransferFrom(
            address(this),
            msg.sender,
            tokenId,
            amount,
            ""
        );
    }

    function cancelItem(uint64 tokenId) external whenNotPaused {
        (address recipient, ) = _cancel(tokenId, _nft721Address);
        _getNft721().transferFrom(address(this), recipient, tokenId);
    }

    function cancelItemWithAmount(uint64 tokenId) external whenNotPaused {
        (address recipient, uint128 amount) = _cancel(tokenId, _nft1155Address);
        _getNft1155().safeTransferFrom(
            address(this),
            recipient,
            tokenId,
            amount,
            ""
        );
    }

    //########################### Private #####################################

    function _listItemWithAmount(
        uint64 tokenId,
        address token,
        uint128 pricePerOne,
        uint128 amount
    ) private {
        _setLotWithAmount(tokenId, token, msg.sender, pricePerOne, amount);
    }

    function _buyItemWithAmount(
        uint64 tokenId,
        address token,
        uint128 amount
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

        uint256 exchangeTokenAmount = _isCollectableToken(token)
            ? item.startPrice * amount
            : item.startPrice;
        IERC20(_exchangeToken).transferFrom(
            msg.sender,
            item.seller,
            exchangeTokenAmount
        );
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
