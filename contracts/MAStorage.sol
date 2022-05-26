//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAMAdmin.sol";

contract MAStorage is MAMAdmin {
    struct Lot {
        address seller;
        uint256 startPrice;
        uint256 startDate;
        uint256 amount;
    }

    //TokenHash => Lot info
    mapping(uint256 => Lot) private _lots;

    function _checkIfNotExists(uint256 tokenId, address token) internal view {
        require(
            _lots[_getTokenHash(tokenId, token)].amount == 0,
            "MAStorage: nft already listed"
        );
    }

    function _checkIfExists(uint256 tokenId, address token)
        internal
        view
        returns (Lot storage lot)
    {
        lot = _getLot(tokenId, token);
        require(lot.amount > 0, "MAStorage: no such nft");
        return lot;
    }

    function _setLot(
        uint256 tokenId,
        address token,
        address seller,
        uint256 startPrice
    ) internal returns (Lot storage) {
        return _setLotWithAmount(tokenId, token, seller, startPrice, 1);
    }

    function _setLotWithAmount(
        uint256 tokenId,
        address token,
        address seller,
        uint256 startPrice,
        uint256 amount
    ) internal returns (Lot storage lot) {
        lot = _getLot(tokenId, token);
        lot.seller = seller;
        lot.startPrice = startPrice;
        lot.startDate = block.timestamp;
        lot.amount = amount;
        return lot;
    }

    function _resetLot(uint256 tokenId, address token) internal virtual {
        Lot storage startBid = _setLotWithAmount(
            tokenId,
            token,
            address(0),
            0,
            0
        );
        startBid.startDate = 0;
    }

    function _getLot(uint256 tokenId, address token)
        internal
        view
        returns (Lot storage)
    {
        return _lots[_getTokenHash(tokenId, token)];
    }

    function _getTokenHash(uint256 tokenId, address token)
        internal
        pure
        returns (uint256)
    {
        return uint256(keccak256(abi.encodePacked(tokenId, token)));
    }
}
