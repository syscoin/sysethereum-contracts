const HDWalletProvider = require('@truffle/hdwallet-provider');
const etherscanAPIKEY = process.env.ETHERSCAN;
var mnenomic = "";
module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 8000000,
      maxFeePerGas: 875000000,
      maxPriorityFeePerGas: "1000000",
      gasPrice: 10000000000
    },
    mainnet: {
      host: "localhost",
      port: 8545,
      from: "0xe600696eb0555c93f2c391a1406726cee239091d",
      network_id: "57",
      gas: 1000000,
      maxFeePerGas: 875000000,
      maxPriorityFeePerGas: "1000000"
    },
    tanenbaum: {
      provider:   function () {
        return new HDWalletProvider(mnenomic, "http://localhost:8545");
      },
      network_id: "5700",
      gas: 8000000,
      maxFeePerGas: 875000000,
      maxPriorityFeePerGas: 10000000,
      gasPrice: 120000000,
      
    },
    rinkeby: {
      provider:   function () {
         return new HDWalletProvider(mnenomic, "http://localhost:8101");
      },
      network_id: "5700",
      gasPrice: "6000000000"
    }
  },
  api_keys: {
    etherscan: etherscanAPIKEY
  },
  compilers: {
    solc: {
      version: "0.8.20",
      docker: false,
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  }
};
