import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
    }
  },
  networks: {
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Syscoin Mainnet
    syscoin: {
      url: "https://rpc.syscoin.org",
      chainId: 57,
      accounts: [PRIVATE_KEY]
    },
    // Syscoin Tanenbaum Testnet
    tanenbaum: {
      url: "https://rpc.tanenbaum.io",
      chainId: 5700,
      accounts: [PRIVATE_KEY]
    },
  },
  defaultNetwork: 'localhost',
  etherscan: {
    apiKey: {
      syscoin: "auto",
      tanenbaum: "auto"
    },
    customChains: [
      {
        network: "syscoin",
        chainId: 57,
        urls: {
          apiURL: "https://explorer.syscoin.org/api",
          browserURL: "https://explorer.syscoin.org/",
        },
      },
      {
        network: "tanenbaum",
        chainId: 5700,
        urls: {
          apiURL: "https://tanenbaum.io/api",
          browserURL: "https://tanenbaum.io/",
        },
      }
    ],
  },
  mocha: {
    timeout: 40000
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
  gasReporter: {
    enabled: true,
  }
};

export default config;