//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Mintable.sol";
import "./MAMAdmin.sol";

contract MAStorage is MAMAdmin {
    struct Bid {
        address seller;
        uint256 startPrice;
        address bidder;
        uint256 currentPrice;
    }

    //tokenId => bid info
    mapping(uint256 => Bid) private _bids;

    function _checkIfNotExists(uint256 tokenId) internal view {
        require(
            _bids[tokenId].startPrice == 0,
            "MAStorage: token already listed"
        );
    }

    function _checkIfExists(uint256 tokenId) internal view {
        require(_bids[tokenId].startPrice > 0, "MAStorage: no such token");
    }

    function _setBid(
        uint256 tokenId,
        address seller,
        uint256 startPrice
    ) internal {
        _bids[tokenId] = Bid(seller, startPrice, address(0), 0);
    }

    function _updateBid(
        uint256 tokenId,
        address bidder,
        uint256 newPrice
    ) internal {
        Bid storage bid = _bids[tokenId];
        bid.bidder = bidder;
        bid.currentPrice = newPrice;
    }

    function _resetBid(uint256 tokenId) internal {
        _setBid(tokenId, address(0), 0);
    }

    function _getBid(uint256 tokenId) internal view returns (Bid memory) {
        return _bids[tokenId];
    }
}

contract MAAuction is MAStorage {
    function listItemOnAuction(uint256 tokenId, uint256 startPrice)
        public
        whenNotPaused
    {
        _checkIfNotExists(tokenId);
        _setBid(tokenId, msg.sender, startPrice);
    }

    function makeBid(uint256 tokenId, uint256 price) public whenNotPaused {
        _checkIfExists(tokenId);
        Bid memory bid = _getBid(tokenId);
        _updateBid(tokenId, msg.sender, price);

        if (bid.bidder == address(0)) return;
    }
}

contract MAMarketplace is MAAuction {
    function createItem(uint256 tokenId, address owner) external whenNotPaused {
        require(
            _getNFT().ownerOf(tokenId) == address(0),
            "MAMarketplace: already exists"
        );
        Mintable(_nftAddress).mint(owner, tokenId);
    }

    function listItem(uint256 tokenId, uint256 price) external whenNotPaused {
        _checkIfNotExists(tokenId);
        _setBid(tokenId, msg.sender, price);
        _getNFT().transferFrom(msg.sender, address(this), tokenId);
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
    }

    function cancel(uint256 tokenId) external whenNotPaused {
        _checkIfStillListed(tokenId);
    }

    function _checkIfStillListed(uint256 tokenId) private view {
        require(
            _getNFT().ownerOf(tokenId) == address(this),
            "MAMarketplace: already sold"
        );
    }
}
