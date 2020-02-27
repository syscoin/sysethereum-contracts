pragma solidity ^0.5.13;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract SyscoinDepositsManager {

    using SafeMath for uint;

    mapping(address => uint) public deposits;

    event DepositMade(address who, uint amount);
    event DepositWithdrawn(address who, uint amount);

    // @dev – fallback to calling makeDeposit when ether is sent directly to contract.
    function() external payable {
        makeDeposit();
    }

    // @dev – returns an account's deposit
    // @param who – the account's address.
    // @return – the account's deposit.
    function getDeposit(address who) external view returns (uint) {
        return deposits[who];
    }

    // @dev – allows a user to deposit eth.
    // @return – sender's updated deposit amount.
    function makeDeposit() public payable returns (uint) {
        increaseDeposit(msg.sender, msg.value);
        return deposits[msg.sender];
    }

    // @dev – increases an account's deposit.
    // @return – the given user's updated deposit amount.
    function increaseDeposit(address who, uint amount) private {
        deposits[who] = deposits[who].add(amount);
        emit DepositMade(who, amount);
    }

    // @dev – allows a user to withdraw eth from their deposit.
    // @param amount – how much eth to withdraw
    // @return – sender's updated deposit amount.
    function withdrawDeposit(uint amount) external returns (uint) {
        require(deposits[msg.sender] >= amount && amount > 0);

        deposits[msg.sender] = deposits[msg.sender].sub(amount);
        // stop using .transfer() because of gas issue after ethereum upgrade
        msg.sender.call.value(amount)("");
        emit DepositWithdrawn(msg.sender, amount);
        return deposits[msg.sender];
    }
}
