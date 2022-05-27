//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./Mintable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

contract MAERC1155 is Mintable, ERC1155Supply {
    constructor() ERC1155("") {}

    function setURI(string memory uri) external onlyOwner {
        _setURI(uri);
    }

    function _internalMint(
        address to,
        uint256 tokenId,
        uint256 amount
    ) internal virtual override {
        _mint(to, tokenId, amount, "");
    }
}
