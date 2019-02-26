pragma solidity ^0.4.19;

import "./SyscoinToken.sol";

contract SyscoinTokenForTests is SyscoinToken {

    constructor (address _trustedRelayerContract, uint32 _assetGUID) public SyscoinToken(_trustedRelayerContract, _assetGUID) {

    }

    function assign(address _to, uint256 _value) public {
        balances[_to] += _value;
    }

}
