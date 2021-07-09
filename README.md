# Sysethereum contracts

[![Build Status](https://travis-ci.com/syscoin/sysethereum-contracts.svg?branch=master)](https://travis-ci.com/syscoin/sysethereum-contracts)

NEVM contracts for the Syscoin <=> NEVM bridge.

If you are new to the Syscoin <=> NEVM bridge, please check the [docs](https://github.com/syscoin/sysethereum-docs) repository first.

## Core components
* [SyscoinRelay contract](contracts/SyscoinRelay.sol)
  * Informs [SyscoinERC20Manager contract](contracts/token/SyscoinERC20Manager.sol) when a Syscoin transaction locked or unlocked funds.
  * Parsing/working with Syscoin blocks, txs and merkle trees 
* [SyscoinERC20Manager contract](contracts/token/SyscoinERC20Manager.sol)
  * An ERC20 manager contract to hold deposits or and transfer funds on unlock
  * Tokens are minted or transferred (for existing ERC20) when coins are locked on the Syscoin blockchain.
  * Tokens are destroyed when coins should go back to the Syscoin blockchain (balances are saved for when moving back to NEVM).
  - Only ERC20's that are derived from ERC20Detailed are able to work with the bridge as we need access to decimals() (99.99% of ERC20's are compatible). If you originate from Syscoin and are creating a new ERC20 to accompany the Syscoin SPT, then you should mint, approve ERC20 Manager and then call freezeBurnERC20 (pass in a dummy syscoinAddress such as "0x1" and not a real syscoinAddress here) on ERC20 Manager to lock funds to a specific asset guid (the Syscoin SPT). The amount locked is the amount that is transactable over the bridge, usually this is the total supply. If you originate from Ethereum as an existing ERC20 and wish to move to Syscoin for fast, cheap, secure transactions and settling on Syscoin blockchain, you may create a Syscoin SPT with a supply equivalent to the total supply of your NEVM's ERC20 and then send the SPT tokens to the "burn" address. When moving from NEVM to Syscoin, funds are extracted from the "burn" address of that SPT and moved into the users address based on the NEVM proof-of-burn transaction (calling freezeBurnERC20).

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

