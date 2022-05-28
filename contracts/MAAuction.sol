//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MAStorage.sol";

contract MAAuction is MAStorage {
    struct Bid {
        address bidder;
        uint64 no;
        uint128 value;
    }

    uint256 public auctionDuration = 3 days;
    //LotHash => Bid info
    mapping(uint256 => Bid) private _bids;

    function getDetailsForItem(uint64 tokenId)
        external
        view
        returns (Lot memory lot, Bid memory bid)
    {
        return _getLastBid(_getTokenHash(tokenId, _nft721Address));
    }

    function getDetailsForItemWithAmount(uint64 tokenId)
        external
        view
        returns (Lot memory lot, Bid memory bid)
    {
        return _getLastBid(_getTokenHash(tokenId, _nft1155Address));
    }

    function listItemOnAuction(uint64 tokenId, uint128 startPrice)
        external
        whenNotPaused
    {
        _listItemOnAuction(tokenId, _nft721Address, startPrice, 1);
        _getNft721().safeTransferFrom(msg.sender, address(this), tokenId);
    }

    function listItemWithAmountOnAuction(
        uint64 tokenId,
        uint128 startPrice,
        uint128 amount
    ) external whenNotPaused {
        _listItemOnAuction(tokenId, _nft1155Address, startPrice, amount);
        _getNft1155().safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );
    }

    function makeBid(uint64 tokenId, uint128 price) external whenNotPaused {
        _makeBid(tokenId, _nft721Address, price);
    }

    function makeBidForItemWithAmount(uint64 tokenId, uint128 price)
        external
        whenNotPaused
    {
        _makeBid(tokenId, _nft1155Address, price);
    }

    function finishAuction(uint64 tokenId) external whenNotPaused {
        (address recipient, ) = _finishAuction(tokenId, _nft721Address);

        _getNft721().transferFrom(address(this), recipient, tokenId);
    }

    function finishAuctionForItemWithAmount(uint64 tokenId)
        external
        whenNotPaused
    {
        (address recipient, uint128 amount) = _finishAuction(
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

    function _resetLot(uint256 tokenHash) internal virtual override {
        Bid storage bid = _updateBid(tokenHash, address(0), 0);
        bid.no = 0;
        super._resetLot(tokenHash);
    }

    //########################### Private #####################################

    function _listItemOnAuction(
        uint64 tokenId,
        address token,
        uint128 startPrice,
        uint128 amount
    ) private {
        uint256 tokenHash = _checkIfNotExists(tokenId, token);
        _setLotWithAmount(tokenHash, msg.sender, startPrice, amount);
    }

    function _makeBid(
        uint64 tokenId,
        address token,
        uint128 price
    ) private {
        (uint256 tokenHash, Lot memory lot) = _checkIfExists(tokenId, token);
        require(
            block.timestamp < lot.startDate + auctionDuration,
            "MAAuction: auction has ended"
        );
        Bid memory lastBid = _bids[
            _getLotHash(tokenHash, lot.startDate, lot.seller)
        ];
        require(
            price >= lot.startPrice && price > lastBid.value,
            "MAAuction: incorrect bid price"
        );

        _updateBid(tokenHash, msg.sender, price);

        uint128 exchangeValue = msg.sender == lastBid.bidder
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

    function _finishAuction(uint64 tokenId, address token)
        private
        returns (address nftRecipient, uint128 amount)
    {
        (uint256 tokenHash, Lot memory lot) = _checkIfExists(tokenId, token);
        require(
            block.timestamp > lot.startDate + auctionDuration,
            "MAAuction: auction is not ended"
        );
        Bid memory lastBid = _bids[
            _getLotHash(tokenHash, lot.startDate, lot.seller)
        ];

        _resetLot(tokenHash);

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
        uint256 tokenHash,
        address bidder,
        uint128 value
    ) private returns (Bid storage bid) {
        Lot storage lot;
        (lot, bid) = _getLastBid(tokenHash);
        bid.bidder = bidder;
        bid.value = value;
        bid.no++;

        return bid;
    }

    function _getLastBid(uint256 tokenHash)
        private
        view
        returns (Lot storage lot, Bid storage)
    {
        lot = _getLot(tokenHash);
        uint256 lotHash = _getLotHash(tokenHash, lot.startDate, lot.seller);
        return (lot, _bids[lotHash]);
    }

    function _getLotHash(
        uint256 tokenHash,
        uint64 startDate,
        address seller
    ) private pure returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(tokenHash, startDate, seller)));
    }
}
