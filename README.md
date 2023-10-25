# Sysethereum contracts

[![Build Status](https://travis-ci.com/syscoin/sysethereum-contracts.svg?branch=master)](https://travis-ci.com/syscoin/sysethereum-contracts)

NEVM contracts for the Syscoin <=> NEVM bridge.

If you are new to the Syscoin <=> NEVM bridge, please check the [docs](https://github.com/syscoin/sysethereum-docs) repository first.

## Core components
* [SyscoinRelay contract](contracts/SyscoinRelay.sol)
  * Informs [SyscoinVaultManager contract](contracts/SyscoinVaultManager.sol) when a Syscoin transaction locked or unlocked funds.
  * Parsing/working with Syscoin blocks, txs and merkle trees 
* [SyscoinVaultManager contract](contracts/SyscoinVaultManager.sol)
  * The vault manager contract to hold deposits or and transfer funds on unlock
  * Tokens are minted or transferred when coins are locked on the Syscoin blockchain.
  * Tokens are destroyed when coins should go back to the Syscoin blockchain (balances are saved for when moving back to NEVM).

## Running the Tests

* Install prerequisites
  * [nodejs](https://nodejs.org) v9.2.0 to v11.15.0.
  * [web3j](https://docs.web3j.io/command_line_tools/) command line tool
* Clone this repo.
* Install npm dependencies.
  * cd to the directory where the repo is cloned.
  ```
    npm install
  ```

* Compile contracts
  ```
    # compile contracts
    npx truffle compile --all
  ```

* Run tests:
  ```
    # first start ganache-cli - and do this again once your gas ran out
    npx ganache-cli --gasLimit 4000000000000 -e 1000000

    # run tests
    npx truffle test
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

