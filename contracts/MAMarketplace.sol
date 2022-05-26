//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Mintable.sol";
import "./MAAuction.sol";

contract MAMarketplace is MAAuction {

    function createItem(uint256 tokenId, address owner) external whenNotPaused {
        Mintable(_nft721Address).mint(owner, tokenId);
    }

    function createItem(
        uint256 tokenId,
        address owner,
        uint256 amount
    ) external whenNotPaused {
        Mintable(_nft1155Address).mint(owner, tokenId, amount);
    }

    function listItem(uint256 tokenId, uint256 price) external whenNotPaused {
        _checkIfNotExists(tokenId);
        _setBid(tokenId, msg.sender, price);
        _getNFT().safeTransferFrom(msg.sender, address(this), tokenId);
    }

    function buyItem(uint256 tokenId) external whenNotPaused {
        _checkIfExists(tokenId);
        MAStorage.Bid memory bid = _getBid(tokenId);
        _resetBid(tokenId);

        IERC20(_exchangeToken).transferFrom(
            msg.sender,
            bid.seller,
            bid.startPrice
        );
        _getNFT().transferFrom(address(this), msg.sender, tokenId);
    }

    function cancel(uint256 tokenId) external whenNotPaused {
        _checkIfExists(tokenId);
        Bid memory bid = _getBid(tokenId);
        require(msg.sender == bid.seller, "MAMarketplace: no access");
        _resetBid(tokenId);

        _getNFT().transferFrom(address(this), bid.seller, tokenId);
    }
}
