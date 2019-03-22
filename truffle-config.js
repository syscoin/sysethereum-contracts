module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 47000000000,
      gasPrice: 1
    },
    integrationSyscoinMain: {
      host: "localhost",
      port: 8545,
      network_id: "32000",
      gas: 4700000,
      gasPrice: 1
    },
    integrationSyscoinRegtest: {
      host: "localhost",
      port: 8545,
      network_id: "32001",
      gas: 4700000,
      gasPrice: 1
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: "3", // Ropsten
      gas: 1000000,
      gasPrice: "20000000000"
    },
    rinkeby: {
      host: "localhost",
      port: 8545,
      network_id: "4", // Rinkeby
      gas: 1000000,
      from: "0x1a8d58bc7390f55d060bb78cf8f8cae953ce9b94", 
      gasPrice: "2000000000"
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};
