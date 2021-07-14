// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

// @dev - SyscoinRelay error codes
contract SyscoinErrorCodes {
    uint constant ERR_INVALID_HEADER = 10000;
    uint constant ERR_INVALID_HEADER_HASH = 10010;
    uint constant ERR_PARSE_TX_SYS = 10020;
    uint constant ERR_MERKLE_ROOT = 10030;
    uint constant ERR_TX_64BYTE = 10040;

}
