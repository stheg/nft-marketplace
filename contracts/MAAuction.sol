//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAStorage.sol";

/// @title MA Auction
/// @notice Provides auction functionality
/// @dev Defines functions to list items, make bids and finish auctions
contract MAAuction is MAStorage {
    event NewBid(
        uint64 date,
        address indexed bidder,
        address indexed token,
        uint64 indexed tokenId,
        uint128 newPrice
    );

    event AuctionFinished(
        uint64 date,
        address indexed recipient,
        address indexed token,
        uint64 indexed tokenId,
        uint128 nftAmount,
        uint128 finishPrice
    );

    struct Bid {
        address bidder;
        uint64 no;
        uint128 value;
    }

    uint256 public auctionDuration = 3 days;
    //seller => token => tokenId => Bid info
    mapping(address => mapping(address => mapping(uint64 => Bid))) private _bids;

    /// @notice Returns both `Lot` and `Bid` details for ERC721
    function getDetailsForItem(uint64 tokenId, address token, address seller)
        external
        view
        returns (Lot memory lot, Bid memory bid)
    {
        return (
            _getLot(tokenId, token, seller),
            _getLastBid(tokenId, token, seller)
        );
    }

    /// @notice Adds ERC721 on auction with desired start price
    function listItemOnAuction(uint64 tokenId, uint128 startPrice)
        external
        whenNotPaused
    {
        _listItemOnAuction(tokenId, _nft721Address, startPrice, 0);
        _transferERC721Tokens(msg.sender, address(this), tokenId);
    }

    /// @notice Adds ERC1155 on auction with desired amount and start price
    function listItemWithAmountOnAuction(
        uint64 tokenId,
        uint128 startPrice,
        uint128 amount
    ) external whenNotPaused {
        _listItemOnAuction(tokenId, _nft1155Address, startPrice, amount);
        _transferERC1155Tokens(msg.sender, address(this), tokenId, amount);
    }

    /// @notice Adds a new bid for ERC721 with desired price
    function makeBid(uint64 tokenId, address seller, uint128 price) external whenNotPaused {
        _makeBid(tokenId, _nft721Address, seller, price);
    }

    /// @notice Adds a new bid for ERC1155 with desired price
    function makeBidForItemWithAmount(uint64 tokenId, address seller, uint128 price)
        external
        whenNotPaused
    {
        _makeBid(tokenId, _nft1155Address, seller, price);
    }

    /// @notice Finishes or cancels the auction for ERC721
    function finishAuction(uint64 tokenId, address seller) external whenNotPaused {
        (address recipient,) = _finishAuction(tokenId, _nft721Address, seller);
        _transferERC721Tokens(address(this), recipient, tokenId);
    }

    /// @notice Finishes or cancels the auction for ERC1155
    function finishAuctionForItemWithAmount(uint64 tokenId, address seller)
        external
        whenNotPaused
    {
        (address recipient, uint128 amount) = _finishAuction(
            tokenId,
            _nft1155Address, 
            seller
        );

        _transferERC1155Tokens(address(this), recipient, tokenId, amount);
    }

    //###################### Internal Overriden ###############################

    function _resetLot(uint64 tokenId, address token, address seller)
        internal
        virtual
        override
    {
        delete _bids[seller][token][tokenId];
        super._resetLot(tokenId, token, seller);
    }

    //########################### Private #####################################

    function _listItemOnAuction(
        uint64 tokenId,
        address token,
        uint128 startPrice,
        uint128 amount
    ) private {
        _checkIfNotExists(tokenId, token, msg.sender);
        Lot storage lot = _setLotWithAmount(
            tokenId,
            token,
            msg.sender,
            startPrice,
            amount
        );
        lot.isAuction = true;

        _emitsItemListed(true, tokenId, token, startPrice, amount);
    }

    function _makeBid(
        uint64 tokenId,
        address token,
        address seller,
        uint128 price
    ) private {
        Lot memory lot = _checkIfExists(tokenId, token, seller);
        require(
            block.timestamp < lot.startDate + auctionDuration,
            "MAAuction: auction has ended"
        );
        Bid memory lastBid = _getLastBid(tokenId, token, seller);
        require(
            price >= lot.startPrice && price > lastBid.value,
            "MAAuction: incorrect bid price"
        );

        _updateBid(tokenId, token, seller, msg.sender, price);

        uint128 exchangeValue = msg.sender == lastBid.bidder
            ? price - lastBid.value
            : price;
        _transferExchangeTokens(msg.sender, address(this), exchangeValue);

        emit NewBid(uint64(block.timestamp), msg.sender, token, tokenId, price);

        if (msg.sender == lastBid.bidder) return;
        if (lastBid.bidder == address(0)) return;

        _transferExchangeTokens(address(this), lastBid.bidder, lastBid.value);
    }

    function _finishAuction(uint64 tokenId, address token, address seller)
        private
        returns (address nftRecipient, uint128 amount)
    {
        Lot memory lot = _checkIfExists(tokenId, token, seller);
        require(
            block.timestamp > lot.startDate + auctionDuration,
            "MAAuction: auction is not ended"
        );
        Bid memory lastBid = _getLastBid(tokenId, token, seller);

        _resetLot(tokenId, token, seller);

        address erc20Recipient;
        if (lastBid.no >= 2) {
            //successful auction: exchange erc20 and NFT
            erc20Recipient = seller;
            nftRecipient = lastBid.bidder;
        } else {
            //cancelled auction: return tokens to owners
            erc20Recipient = lastBid.bidder;
            nftRecipient = seller;
        }

        _transferExchangeTokens(address(this), erc20Recipient, lastBid.value);

        emit AuctionFinished(
            uint64(block.timestamp),
            nftRecipient,
            token,
            tokenId,
            lot.amount,
            lastBid.value
        );

        return (nftRecipient, lot.amount);
    }

    function _updateBid(
        uint64 tokenId,
        address token,
        address seller,
        address bidder,
        uint128 value
    ) private returns (Bid storage bid) {
        bid = _getLastBid(tokenId, token, seller);
        bid.bidder = bidder;
        bid.value = value;
        bid.no++;

        return bid;
    }

    function _getLastBid(uint64 tokenId, address token, address seller)
        private
        view
        returns (Bid storage)
    {
        return _bids[seller][token][tokenId];
    }
}
