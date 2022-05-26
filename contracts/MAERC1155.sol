//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./Mintable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MAERC1155 is Mintable, ERC1155 {

    constructor() ERC1155("") {
    }
    
    function _internalMint(address to, uint256 tokenId, uint256 amount)
        internal
        virtual
        override
    {
        _mint(to, tokenId, amount, "");
    }
}