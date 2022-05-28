//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./MAMAdmin.sol";

contract MAStorage is MAMAdmin {
    struct Lot {
        address seller;
        uint64 startDate; //max year ~2550
        uint128 startPrice;
        uint128 amount;
    }

    //TokenHash => Lot info
    mapping(uint256 => Lot) private _lots;

    function _checkIfNotExists(uint64 tokenId, address token)
        internal
        view
        returns (uint256 tokenHash)
    {
        tokenHash = _getTokenHash(tokenId, token);
        require(_lots[tokenHash].amount == 0, "MAStorage: nft already listed");
        return tokenHash;
    }

    function _checkIfExists(uint64 tokenId, address token)
        internal
        view
        returns (uint256 tokenHash, Lot storage lot)
    {
        tokenHash = _getTokenHash(tokenId, token);
        lot = _lots[tokenHash];
        require(lot.amount > 0, "MAStorage: no such nft");
        return (tokenHash, lot);
    }

    function _setLotWithAmount(
        uint256 tokenHash,
        address seller,
        uint128 startPrice,
        uint128 amount
    ) internal returns (Lot storage lot) {
        lot = _lots[tokenHash];
        lot.seller = seller;
        lot.startPrice = startPrice;
        lot.startDate = uint64(block.timestamp); //max year ~2550
        lot.amount = amount;
        return lot;
    }

    function _resetLot(uint256 tokenHash) internal virtual {
        Lot storage startBid = _setLotWithAmount(tokenHash, address(0), 0, 0);
        startBid.startDate = 0;
    }

    function _getTokenHash(uint64 tokenId, address token)
        internal
        pure
        returns (uint256)
    {
        return uint256(keccak256(abi.encodePacked(tokenId, token)));
    }

    function _getLot(uint256 tokenHash) internal view returns (Lot storage) {
        return _lots[tokenHash];
    }
}
