//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MAStorage.sol";

contract MAAuction is MAStorage {
    struct Bid {
        address bidder;
        uint256 value;
        uint256 no;
    }

    uint256 public auctionDuration = 3 days;
    //LotHash => Bid info
    mapping(uint256 => Bid) private _bids;

    function getDetailsForItem(uint256 tokenId)
        public
        view
        returns (Lot memory lot, Bid memory bid)
    {
        return (
            _getLot(tokenId, _nft721Address),
            _getLastBid(tokenId, _nft721Address)
        );
    }

    function getDetailsForItemWithAmount(uint256 tokenId)
        public
        view
        returns (Lot memory lot, Bid memory bid)
    {
        return (
            _getLot(tokenId, _nft1155Address),
            _getLastBid(tokenId, _nft1155Address)
        );
    }

    function listItemOnAuction(uint256 tokenId, uint256 startPrice)
        public
        whenNotPaused
    {
        _listItemOnAuction(tokenId, _nft721Address, startPrice, 1);
        _getNft721().safeTransferFrom(msg.sender, address(this), tokenId);
    }

    function listItemWithAmountOnAuction(
        uint256 tokenId,
        uint256 startPrice,
        uint256 amount
    ) public whenNotPaused {
        _listItemOnAuction(tokenId, _nft1155Address, startPrice, amount);
        _getNft1155().safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );
    }

    function makeBid(uint256 tokenId, uint256 price) public whenNotPaused {
        _makeBid(tokenId, _nft721Address, price);
    }

    function makeBidForItemWithAmount(uint256 tokenId, uint256 price)
        public
        whenNotPaused
    {
        _makeBid(tokenId, _nft1155Address, price);
    }

    function finishAuction(uint256 tokenId) public whenNotPaused {
        (address recipient, ) = _finishAuction(tokenId, _nft721Address);

        _getNft721().transferFrom(address(this), recipient, tokenId);
    }

    function finishAuctionForItemWithAmount(uint256 tokenId)
        public
        whenNotPaused
    {
        (address recipient, uint256 amount) = _finishAuction(
            tokenId,
            _nft1155Address
        );

        _getNft1155().safeTransferFrom(
            address(this),
            recipient,
            tokenId,
            amount,
            ""
        );
    }

    //###################### Internal Overriden ###############################

    function _resetLot(uint256 tokenId, address token)
        internal
        virtual
        override
    {
        Bid storage bid = _updateBid(tokenId, token, address(0), 0);
        bid.no = 0;
        super._resetLot(tokenId, token);
    }

    //########################### Private #####################################

    function _listItemOnAuction(
        uint256 tokenId,
        address token,
        uint256 startPrice,
        uint256 amount
    ) private {
        _checkIfNotExists(tokenId, token);
        _setLotWithAmount(tokenId, token, msg.sender, startPrice, amount);
    }

    function _makeBid(
        uint256 tokenId,
        address token,
        uint256 price
    ) private {
        Lot memory lot = _checkIfExists(tokenId, token);
        require(
            block.timestamp < lot.startDate + auctionDuration,
            "MAAuction: auction has ended"
        );
        Bid memory lastBid = _getLastBid(tokenId, token);
        require(
            price >= lot.startPrice && price > lastBid.value, 
            "MAAuction: incorrect bid price"
        );

        _updateBid(tokenId, token, msg.sender, price);

        uint256 exchangeValue = msg.sender == lastBid.bidder
            ? price - lastBid.value
            : price;
        IERC20(_exchangeToken).transferFrom(
            msg.sender,
            address(this),
            exchangeValue
        );

        if (msg.sender == lastBid.bidder) return;
        if (lastBid.bidder == address(0)) return;

        IERC20(_exchangeToken).transfer(lastBid.bidder, lastBid.value);
    }

    function _finishAuction(uint256 tokenId, address token)
        private
        returns (address nftRecipient, uint256 amount)
    {
        Lot memory lot = _checkIfExists(tokenId, token);
        require(
            block.timestamp > lot.startDate + auctionDuration,
            "MAAuction: auction is not ended"
        );
        Bid memory lastBid = _getLastBid(tokenId, token);
        _resetLot(tokenId, token);

        address priceRecipient;
        if (lastBid.no >= 2) {
            //successful auction: exchange erc20 and NFT
            priceRecipient = lot.seller;
            nftRecipient = lastBid.bidder;
        } else {
            //cancelled auction: return tokens to owners
            priceRecipient = lastBid.bidder;
            nftRecipient = lot.seller;
        }
        IERC20(_exchangeToken).transfer(priceRecipient, lastBid.value);

        return (nftRecipient, lot.amount);
    }

    function _updateBid(
        uint256 tokenId,
        address token,
        address bidder,
        uint256 value
    ) private returns (Bid storage bid) {
        bid = _getLastBid(tokenId, token);
        bid.bidder = bidder;
        bid.value = value;
        bid.no++;

        return bid;
    }

    // todo: refatoring: should return both lot and bid
    function _getLastBid(uint256 tokenId, address token)
        private
        view
        returns (Bid storage)
    {
        Lot storage lot = _getLot(tokenId, token);
        uint256 lotHash = _getLotHash(
            _getTokenHash(tokenId, token),
            lot.startDate,
            lot.seller
        );
        return _bids[lotHash];
    }

    function _getLotHash(
        uint256 tokenHash,
        uint256 startDate,
        address seller
    ) private pure returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(tokenHash, startDate, seller)));
    }
}
