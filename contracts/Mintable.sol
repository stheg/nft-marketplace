//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Mintable is Ownable {
    address private _minter;

    modifier onlyMinter() {
        require(
            msg.sender == _minter,
            "Mintable: No Access"
        );
        _;
    }

    function setMinter(address newMinter) public onlyOwner {
        _minter = newMinter;
    }

    function minter() public view returns (address) {
        return _minter;
    }

    function mint(address to, uint256 tokenId) public onlyMinter {
        _internalMint(to, tokenId);
    }

    function mint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) public onlyMinter {
        _internalMint(to, tokenId, amount);
    }

    function _internalMint(
        address to,
        uint256 tokenId
    ) internal virtual {
        _internalMint(to, tokenId, 1);
    }

    function _internalMint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) internal virtual {}
}
