//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./Mintable.sol";

contract MAERC721 is Mintable, ERC721 {
    string private _uri = "";

    constructor(string memory name, string memory symbol)
        ERC721(name, symbol)
    {}

    function setURI(string memory uri) external onlyOwner {
        _uri = uri;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _uri;
    }

    function _internalMint(address to, uint256 tokenId)
        internal
        virtual
        override
    {
        _safeMint(to, tokenId);
    }
}
