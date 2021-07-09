const HDWalletProvider = require('@truffle/hdwallet-provider');
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
      host: "localhost",
      port: 8645,
      from: "0x8d827Cf5515718a79Be1DC38152873bC0C1cA263",
      skipDryRun: true,
      network_id: "1",
      gasPrice: "10000000000" // 10 gWei
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
      skipDryRun: true,
      gasPrice: "6000000000"
    }
  },
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
      version: "0.8.6",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
