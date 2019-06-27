pragma solidity ^0.4.26;

import "./SyscoinToken.sol";

contract SyscoinTokenForTests is SyscoinToken {

    constructor (address _trustedRelayerContract, uint32 _assetGUID, string _tokenName, uint8 _decimalUnits, string _tokenSymbol) public SyscoinToken(_trustedRelayerContract, _assetGUID, _tokenName, _decimalUnits, _tokenSymbol) {

    }

    function assign(address _to, uint256 _value) public {
        balances[_to] += _value;
    }

}
