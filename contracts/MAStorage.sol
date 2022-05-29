//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAMAdmin.sol";

/// @title MA Storage
/// @notice Keeps info about listed items
/// @dev Defines functions to interact with the storage
contract MAStorage is MAMAdmin {
    struct Lot {
        address seller;
        uint64 startDate; //max year ~2550
        uint128 startPrice;
        uint128 amount;
    }

    //TokenId => Lot info
    mapping(address => mapping(uint64 => Lot)) private _lots;

    function _checkIfNotExists(uint64 tokenId, address token) internal view {
        require(
            _getLot(tokenId, token).startDate == 0,
            "MAStorage: nft already listed"
        );
    }

    function _checkIfExists(uint64 tokenId, address token)
        internal
        view
        returns (Lot storage lot)
    {
        lot = _getLot(tokenId, token);
        require(lot.startDate > 0, "MAStorage: no such nft");
        return lot;
    }

    /// @dev Updates `Lot.startDate` to `block.timestamp`
    function _setLotWithAmount(
        uint64 tokenId,
        address token,
        address seller,
        uint128 startPrice,
        uint128 amount
    ) internal returns (Lot storage lot) {
        lot = _getLot(tokenId, token);
        lot.seller = seller;
        lot.startPrice = startPrice;
        lot.startDate = uint64(block.timestamp); //max year ~2550
        lot.amount = amount;
        return lot;
    }

    function _resetLot(uint64 tokenId, address token) internal virtual {
        Lot storage startBid = _setLotWithAmount(
            tokenId,
            token,
            address(0),
            0,
            0
        );
        startBid.startDate = 0;
    }

    function _getLot(uint64 tokenId, address token)
        internal
        view
        returns (Lot storage)
    {
        return _lots[token][tokenId];
    }
}
