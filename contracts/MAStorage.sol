//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAMAdmin.sol";

contract MAStorage is MAMAdmin {
    struct Bid {
        address seller;
        address bidder;
        uint256 startPrice;
        uint256 currentPrice;
        uint256 no;
        uint256 startDate;
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
        _bids[tokenId] = Bid(
            seller,
            seller,
            startPrice,
            startPrice,
            0,
            block.timestamp
        );
    }

    function _resetBid(uint256 tokenId) internal {
        _setBid(tokenId, address(0), 0);
    }

    function _updateBid(
        uint256 tokenId,
        address bidder,
        uint256 newPrice
    ) internal {
        Bid storage bid = _bids[tokenId];
        bid.bidder = bidder;
        bid.currentPrice = newPrice;
        bid.no++;
    }

    function _getBid(uint256 tokenId) internal view returns (Bid memory) {
        return _bids[tokenId];
    }
}
