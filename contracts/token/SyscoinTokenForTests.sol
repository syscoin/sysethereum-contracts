pragma solidity >=0.5.0 <0.6.0;

import "./SyscoinToken.sol";

contract SyscoinTokenForTests is SyscoinToken {

    constructor (address _trustedRelayerContract, uint32 _assetGUID, string memory _tokenName, uint8 _decimalUnits, string memory _tokenSymbol) public SyscoinToken(_trustedRelayerContract, _assetGUID, _tokenName, _decimalUnits, _tokenSymbol) {

    }

    function assign(address _to, uint256 _value) public {
        balances[_to] += _value;
    }

}
