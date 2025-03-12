const SyscoinVaultManager = artifacts.require('./SyscoinVaultManager.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinRelay = artifacts.require('./SyscoinRelay.sol');

module.exports = async function(deployer, network, accounts) {
  const owner = accounts[0];

  console.log("Owner address:", owner);
  const balance = await web3.eth.getBalance(owner);
  console.log("Balance of deployer:", balance.toString());

  console.log('Deploying SyscoinMessageLibrary...');
  await deployer.deploy(SyscoinMessageLibrary);
  await deployer.link(SyscoinMessageLibrary, [SyscoinRelay]);

  console.log('Deploying SyscoinRelay...');
  await deployer.deploy(SyscoinRelay, owner, { gas: 5000000 });  // explicitly set higher gas

  console.log('Deploying SyscoinVaultManager...');
  await deployer.deploy(SyscoinVaultManager, SyscoinRelay.address, 123456, { from: owner });

  const syscoinRelay = await SyscoinRelay.deployed();

  console.log('Initializing SyscoinRelay with VaultManager...');
  await syscoinRelay.init(SyscoinVaultManager.address, { from: owner });
};
