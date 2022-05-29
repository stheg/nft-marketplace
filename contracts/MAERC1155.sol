//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";

contract MAERC1155 is ERC1155PresetMinterPauser {
    constructor() ERC1155PresetMinterPauser("") {
        revokeRole(MINTER_ROLE, msg.sender);
    }

    function setURI(string memory uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(uri);
    }

    function setMinter(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, minter);
    }
}
