# Sysethereum contracts

[![Build Status](https://travis-ci.org/syscoin/sysethereum/sysethereum-contracts.svg?branch=master)](https://travis-ci.org/syscoin/sysethereum/sysethereum-contracts)

Ethereum contracts for the Syscoin <=> Ethereum bridge.

If you are new to the Syscoin <=> Ethereum bridge, please check the [docs](https://github.com/syscoin/sysethereum-docs) repository first.

## Core components
* [SyscoinSuperblocks contract](contracts/SyscoinSuperblocks.sol)
  * Keeps a copy of the Syscoin Superblockchain
  * Informs [SyscoinERC20Manager contract](contracts/token/SyscoinERC20Manager.sol) when a Syscoin transaction locked or unlocked funds.
  * It's kind of a Syscoin version of [BtcRelay](https://github.com/ethereum/btcrelay) but using Superblocks instead of blocks.
* [SyscoinERC20Manager contract](contracts/token/SyscoinERC20Manager.sol)
  * An ERC20 manager contract to hold deposits or and transfer funds on unlock
  * Tokens are minted or transferred (for existing ERC20) when coins are locked on the Syscoin blockchain.
  * Tokens are destroyed when coins should go back to the Syscoin blockchain (balances are saved for when moving back to Ethereum).
* [SyscoinClaimManager contract](contracts/SyscoinClaimManager.sol)
  * Manages the interactive (challenge/response) validation of Superblocks.
* [SyscoinERC20Asset](contracts/SyscoinParser/SyscoinERC20Asset.sol)
  - A mintable Syscoin ERC20 asset that follows ERC20 spec but is also mintable when moving from Syscoin to Ethereum
  - This is useful as some Syscoin assets originate on Syscoin and want to move to Ethereum. Legacy ERC20's must originate on Ethereum and have balances in order to move back to Ethereum from Syscoin. Legacy ERC20's are not mintable and thus only specific Syscoin ERC20 tokens are mintable when moving from Syscoin without balance existing in the SyscoinERC20Manager contract.
* [SyscoinMessageLibrary](contracts/SyscoinParser/SyscoinMessageLibrary.sol)
  - Library for parsing/working with Syscoin blocks, txs and merkle trees 

## Running the Tests

* Install prerequisites
  * [nodejs](https://nodejs.org) v9.2.0 to v11.15.0.
  * [truffle](http://truffleframework.com/) v5.0.24
  ```
    npm install -g truffle@5.0.24
  ```
  * [ganache-cli](https://github.com/trufflesuite/ganache-cli) v6.4.2 or above.
  ```
    npm install -g ganache-cli
  ```
* Clone this repo.
* Install npm dependencies.
  * cd to the directory where the repo is cloned.
  ```
    npm install
  ```

* Compile contracts
  ```
    # compile contracts
    truffle compile --all
  ```

* Run tests:
  ```
    # first start ganache-cli - and do this again once your gas ran out
    ganache-cli --gasLimit 4000000000000

    # run tests
    truffle test
  ```

## Deployment

To deploy the contracts

### Requirements

* A Rinkeby/Mainnet client running with rpc enabled

### Deployment

* Run `./scripts/exportAndInit.sh`

## License

MIT License<br/>
Copyright (c) 2019 Blockchain Foundry Inc<br/>
[License](LICENSE)

