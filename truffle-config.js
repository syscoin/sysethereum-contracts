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
      port: 8101,
      from: "0xe600696eb0555c93f2c391a1406726cee239091d",
      network_id: "57",
      gasPrice: "10000000000" // 10 gWei
    },
    tanenbaum: {
      host: "localhost",
      port: 8101,
      from: "0xe600696eb0555c93f2c391a1406726cee239091d",
      network_id: "5700", 
      gas: 1000000,
      gasPrice: "10000000000"
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
      version: "native",
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
