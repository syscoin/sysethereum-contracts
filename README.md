**Sysethereum** – NEVM Contracts for the Syscoin <=> NEVM Bridge

[![Build Status](https://travis-ci.com/syscoin/sysethereum-contracts.svg?branch=master)](https://travis-ci.com/syscoin/sysethereum-contracts)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture & Core Components](#architecture--core-components)
3. [Prerequisites & Installation](#prerequisites--installation)
4. [Running the Tests](#running-the-tests)
5. [Deployment](#deployment)

---

## Introduction

**Sysethereum** is a set of smart contracts on the [NEVM (Syscoin’s EVM layer)](https://syscoin.org) that implements a *decentralized* and *trust-minimized* bridge between the **Syscoin UTXO blockchain** and the **NEVM**. It allows assets (Syscoin Platform Tokens or plain SYS) to move seamlessly between the two worlds.

> **Note**: If you are new to the Syscoin <=> NEVM bridge, check out the [**sysethereum-docs** repository](https://github.com/syscoin/sysethereum-docs) for an overview of the bridging process and user flow.

---

## Architecture & Core Components

### SyscoinRelay

- `SyscoinRelay.sol` is responsible for:
  - Verifying Syscoin blocks, transactions, and **Merkle proofs** on the NEVM side.
  - Informing the Vault Manager (`SyscoinVaultManager.sol`) when a Syscoin transaction has locked or unlocked funds on the UTXO chain.

### SyscoinVaultManager

- `SyscoinVaultManager.sol` (and potential expansions like `SyscoinVaultManagerAllBridges.sol`) is responsible for:
  - **Holding deposits** or transferring tokens on the NEVM side.
  - Minting or transferring tokens when coins are locked on Syscoin UTXO side (UTXO -> NEVM).
  - Burning or locking tokens on NEVM when coins move back to Syscoin (NEVM -> UTXO).
  - Potential bridging for **ERC20**, **ERC721**, **ERC1155**, or native SYS (depending on the code version).

### SyscoinMessageLibrary / SyscoinParser

- A library used to parse and handle Syscoin transaction bytes, block headers, merkle proofs, etc.  
- Provides functions like `parseVarInt`, `parseCompactSize`, and big-endian / little-endian conversions.

### Additional Contracts

- **Test Mocks** (e.g., `MockERC20.sol`, `MockERC721.sol`, `MockERC1155.sol`) – used to test bridging flows in local test environments.
- **MaliciousReentrant** – a test contract that verifies the bridge’s `nonReentrant` safety.

---

## Prerequisites & Installation

### 1. System Requirements

- **Node.js** v9.2.0 up to v11.15.0 (Truffle often works best in these ranges).  
- **NPM** or **Yarn** – for installing JavaScript dependencies.  
- **Ganache CLI** or another Ethereum-like local testnet environment.  
- **Web3j** command line tool (optional).

### 2. Cloning the Repository

```bash
git clone https://github.com/syscoin/sysethereum-contracts.git
cd sysethereum-contracts
```
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

* Run `./scripts/exportAndInit.sh`
