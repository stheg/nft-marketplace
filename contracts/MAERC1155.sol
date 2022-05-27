//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./Mintable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MAERC1155 is Mintable, ERC1155 {
    constructor() ERC1155("https://bafybeias3z4idhq47k7f6hlfgagiadeu6tkin4al47ue6izjxjgi6cjgim.ipfs.nftstorage.link/metadata/{id}") {
    }

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
