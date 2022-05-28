//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Mintable.sol";
import "./MAAuction.sol";

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
        uint256 tokenHash = _checkIfNotExists(tokenId, _nft721Address);
        _listItemWithAmount(tokenHash, price, 1);
        _getNft721().safeTransferFrom(msg.sender, address(this), tokenId);
    }

    function listItemWithAmount(
        uint64 tokenId,
        uint128 pricePerOne,
        uint128 amount
    ) external whenNotPaused {
        uint256 tokenHash = _getTokenHash(tokenId, _nft1155Address);
        Lot storage item = _getLot(tokenHash);
        _listItemWithAmount(
            tokenHash,
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
        _buyItemWithAmount(tokenId, _nft721Address, 1);
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
        uint256 tokenHash,
        uint128 pricePerOne,
        uint128 amount
    ) private {
        _setLotWithAmount(tokenHash, msg.sender, pricePerOne, amount);
    }

    function _buyItemWithAmount(
        uint64 tokenId,
        address token,
        uint128 amount
    ) private {
        (uint256 tokenHash, Lot memory item) = _checkIfExists(tokenId, token);
        if (item.amount == amount) {
            _resetLot(tokenHash);
        } else if (item.amount > amount) {
            _setLotWithAmount(
                tokenHash,
                item.seller,
                item.startPrice,
                item.amount - amount
            );
        } else {
            revert("MAMarketplace: wrong amount");
        }

        IERC20(_exchangeToken).transferFrom(
            msg.sender,
            item.seller,
            item.startPrice * amount
        );
    }

    function _cancel(uint64 tokenId, address token)
        private
        returns (address nftRecipient, uint128 amount)
    {
        (uint256 tokenHash, Lot memory item) = _checkIfExists(tokenId, token);
        require(msg.sender == item.seller, "MAMarketplace: no access");
        _resetLot(tokenHash);
        return (item.seller, item.amount);
    }
}
