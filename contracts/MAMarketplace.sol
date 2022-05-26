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

    function listItem(uint256 tokenId, uint256 price) external whenNotPaused {
        _checkIfNotExists(tokenId, _nft721Address);
        _listItemWithAmount(tokenId, _nft721Address, price, 1);
        _getNft721().safeTransferFrom(msg.sender, address(this), tokenId);
    }

    function listItemWithAmount(
        uint256 tokenId,
        uint256 price,
        uint256 amount
    ) external whenNotPaused {
        _listItemWithAmount(tokenId, _nft1155Address, price, amount);
        _getNft1155().safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );
    }

    function buyItem(uint256 tokenId) external whenNotPaused {
        _buyItemWithAmount(tokenId, _nft721Address, 1);
        _getNft721().transferFrom(address(this), msg.sender, tokenId);
    }

    function buyItemWithAmount(uint256 tokenId, uint256 amount)
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

    function cancelItem(uint256 tokenId) external whenNotPaused {
        (address recipient, ) = _cancel(tokenId, _nft721Address);
        _getNft721().transferFrom(address(this), recipient, tokenId);
    }

    function cancelItemWithAmount(uint256 tokenId) external whenNotPaused {
        (address recipient, uint256 amount) = _cancel(tokenId, _nft1155Address);
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
        uint256 tokenId,
        address token,
        uint256 price,
        uint256 amount
    ) private {
        _setLotWithAmount(tokenId, token, msg.sender, price, amount);
    }

    function _buyItemWithAmount(
        uint256 tokenId,
        address token,
        uint256 amount
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

        IERC20(_exchangeToken).transferFrom(
            msg.sender,
            item.seller,
            item.startPrice * amount
        );
    }

    function _cancel(uint256 tokenId, address token)
        private
        returns (address nftRecipient, uint256 amount)
    {
        Lot memory item = _checkIfExists(tokenId, token);
        require(msg.sender == item.seller, "MAMarketplace: no access");
        _resetLot(tokenId, token);
        return (item.seller, item.amount);
    }
}
