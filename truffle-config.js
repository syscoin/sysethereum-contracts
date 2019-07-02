var HDWalletProvider = require("truffle-hdwallet-provider");
const fs = require('fs');
const mainnet_mnemonic = process.env.MNEMONIC;
const etherscanAPIKEY = process.env.ETHERSCAN;
var mnenomic = "cup aisle bright dice when flame left assume laptop lock cry brown";
module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 47000000000,
      gasPrice: 1
    },
    mainnet: {
      provider:   function () {
         return new HDWalletProvider(mainnet_mnemonic, "https://mainnet.infura.io/v3/d178aecf49154b12be98e68e998cfb8d");
      },
      network_id: "1"
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: "3", // Ropsten
      gas: 1000000,
      gasPrice: "20000000000"
    },
    rinkeby: {
      provider:   function () {
         return new HDWalletProvider(mnenomic, "https://rinkeby.infura.io/v3/d178aecf49154b12be98e68e998cfb8d");
      },
      network_id: "4",
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: etherscanAPIKEY
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  compilers: {
    solc: {
      version: "0.5.10",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
