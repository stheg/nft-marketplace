//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MAStorage.sol";

contract MAAuction is MAStorage {
    uint256 private _duration = 3 days;

    function listItemOnAuction(uint256 tokenId, uint256 startPrice)
        public
        whenNotPaused
    {
        _checkIfNotExists(tokenId);
        _setBid(tokenId, msg.sender, startPrice);
    }

    function makeBid(uint256 tokenId, uint256 price) public whenNotPaused {
        _checkIfExists(tokenId);
        Bid memory prevBid = _getBid(tokenId);
        require(
            block.timestamp < prevBid.startDate + _duration,
            "MAAuction: auction has ended"
        );
        require(price > prevBid.currentPrice, "MAAuction: incorrect price");

        _updateBid(tokenId, msg.sender, price);

        uint256 exchangeValue = price;
        if (msg.sender == prevBid.bidder)
            exchangeValue = price - prevBid.currentPrice;
        IERC20(_exchangeToken).transferFrom(
            msg.sender,
            address(this),
            exchangeValue
        );

        if (prevBid.bidder == prevBid.seller) return;
        if (msg.sender == prevBid.bidder) return;

        IERC20(_exchangeToken).transfer(prevBid.bidder, exchangeValue);
    }

    function finishAuction(uint256 tokenId) public whenNotPaused {
        _checkIfExists(tokenId);
        Bid memory bid = _getBid(tokenId);
        require(
            block.timestamp > bid.startDate + _duration,
            "MAAuction: auction is not ended"
        );
        _resetBid(tokenId);

        _getNFT().transferFrom(address(this), bid.bidder, tokenId);
        if (bid.currentPrice > bid.startPrice)
            IERC20(_exchangeToken).transfer(bid.bidder, bid.currentPrice);
    }
}
