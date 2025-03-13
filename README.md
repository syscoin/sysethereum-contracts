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

**Sysethereum** is a set of smart contracts on the [NEVM (Syscoin’s EVM layer)](https://syscoin.org) that implements a _decentralized_ bridge between the **Syscoin UTXO blockchain** and the **NEVM**. It allows assets (Syscoin Platform Tokens or plain SYS) to move seamlessly between the two worlds.

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

- **Node.js** v16 or later
- **NPM** or **Yarn** – for installing JavaScript dependencies
- **Hardhat** - for development, testing, and deployment

### 2. Cloning the Repository

```bash
git clone https://github.com/syscoin/sysethereum-contracts.git
cd sysethereum-contracts
```

### 3. Install Dependencies

```bash
npm install
```

## Development

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Run Tests

```bash
# Run all tests
npx hardhat test

```

### 3. Running a Local Node

```bash
# Start a local Hardhat node
npx hardhat node
```

## Deployment

### 1. Local Deployment

```bash
# Deploy to local Hardhat network
npx hardhat run scripts/deploy.ts --network localhost
```

### 2. Syscoin Mainnet Deployment

```bash
# Set your private key in .env file first
# PRIVATE_KEY=your_private_key_here

# Deploy to Syscoin mainnet
npx hardhat run scripts/deploy.ts --network syscoin
```
