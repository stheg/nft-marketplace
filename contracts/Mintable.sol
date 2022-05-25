//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Mintable is Ownable {

    address private _minter;

    modifier minterOrOwner() {
        require(
            msg.sender == _minter || msg.sender == owner(), 
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

    function mint(address to, uint256 tokenId)
        public 
        minterOrOwner 
    {
        _internalMint(to, tokenId);
    }

    function _internalMint(address to, uint256 tokenId) internal virtual {
    }
}