# Utilities for development

## Deployment of contracts

First compile contracts

    $ truffle compile --all

Run migration scripts to deploy contracts

    $ truffle migrate --network NETWORK --reset

Where NETWORK can be

*   development: Contract development without interacting with Syscoin blockchain
*   integrationSyscoinRegtest: Integration tests ganache and Syscoin regtest
*   mainnet: Integration tests mainnet and Syscoin main network
*   rinkeby: Integration tests Rinkeby testnet and Syscoin main network

Note: There's a ropsten network but currently contracts are too large to be
deployed with the gas limit of 4.7M gas.

## Initialize contracts

This steps depends on the NETWORK for integrationSyscoinRegtest

    $ truffle exec --network integrationSyscoinRegtest scripts\init_contracts_local.js

## Send command to contracts

    $ truffle exec --network NETWORK scripts\superblock-cli.js COMMAND [OPTIONS]

Where COMMAND

*   challenge: Start a challenge to a superblock

    Available OPTIONS are:

    *   `--from ADDRESS`: Address used to send the challenge from.
        When not specified it will use the first account on the node.

    *   `--superblock SUPERBLOCK_ID`: Superblock ID to challenge.
        When none is specified it will challenge the next superblock.
        If the superblock was not submitted it will wait for it.

    *   `--deposit AMOUNT`: It will deposit the amount of ether in the contract.
        If the balance is zero and no deposit is specified it
        will try to deposit 1000 wei.
