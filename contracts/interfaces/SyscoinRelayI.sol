// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface SyscoinRelayI {

    function relayTx(
        uint64 _blockNumber,
        bytes calldata _txBytes,
        uint _txIndex,
        uint[] calldata _txSiblings,
        bytes calldata _syscoinBlockHeader
    ) external returns (uint);
}
