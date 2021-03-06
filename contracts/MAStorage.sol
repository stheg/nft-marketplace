//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAMAdmin.sol";

/// @title MA Storage
/// @notice Keeps info about listed items
/// @dev Defines functions to interact with the storage
contract MAStorage is MAMAdmin {
    struct Lot {
        bool isAuction;
        uint64 startDate; //max year ~2550
        uint128 startPrice;
        uint128 amount;
    }

    event ItemListed(
        address indexed owner,
        address indexed token,
        uint64 indexed tokenId,
        uint128 price,
        uint128 amount,
        uint64 date,
        bool auction
    );

    //seller => token => tokenId => Lot info
    mapping(address => mapping(address => mapping(uint64 => Lot))) private _lots;
    
    function _getLot(
        uint64 tokenId,
        address token,
        address seller
    ) internal view returns (Lot storage) {
        return _lots[seller][token][tokenId];
    }

    function _checkIfNotExists(
        uint64 tokenId,
        address token,
        address seller
    ) internal view {
        require(
            _getLot(tokenId, token, seller).startDate == 0,
            "MAStorage: lot already listed"
        );
    }

    function _checkIfExists(
        uint64 tokenId,
        address token,
        address seller
    ) internal view returns (Lot storage lot) {
        lot = _getLot(tokenId, token, seller);
        require(lot.startDate > 0, "MAStorage: no such lot");
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
        lot = _getLot(tokenId, token, seller);
        lot.startPrice = startPrice;
        lot.startDate = uint64(block.timestamp); //max year ~2550
        lot.amount = amount;
        return lot;
    }

    function _resetLot(
        uint64 tokenId,
        address token, 
        address seller
    ) internal virtual {
        delete _lots[seller][token][tokenId];
    }

    function _emitsItemListed(
        bool auction,
        uint64 tokenId,
        address token,
        uint128 price,
        uint128 amount
    ) internal {
        emit ItemListed(
            msg.sender,
            token,
            tokenId,
            price,
            amount,
            uint64(block.timestamp),
            auction
        );
    }
}
