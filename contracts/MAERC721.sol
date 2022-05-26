//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "./Mintable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MAERC721 is Mintable, ERC721 {
    string private _uri;

    constructor() ERC721("Mad A. ERC721", "MAERC721") {}

    function _internalMint(address to, uint256 tokenId)
        internal
        virtual
        override
    {
        _safeMint(to, tokenId);
    }

    function setURI(string memory uri) external onlyOwner {
        _uri = uri;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _uri;
    }
}
