// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import './SyscoinRelay.sol';
contract SyscoinRelayTest is SyscoinRelay {
    function testFlip32Bytes(uint _input) public pure returns (uint result) {
        return flip32Bytes(_input);
    }
    function testGetOpReturnPos(bytes memory txBytes, uint pos) public pure returns (uint, uint) {
        return getOpReturnPos(txBytes, pos);
    }
}
