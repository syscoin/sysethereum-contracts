const SyscoinVaultManager = artifacts.require('./SyscoinVaultManager.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinRelay = artifacts.require('./SyscoinRelay.sol');
const SyscoinRelayTest = artifacts.require('./SyscoinRelayTest.sol');

module.exports = async function(deployer, network, accounts) {
  console.log('Deploying SyscoinMessageLibrary...');
  await deployer.deploy(SyscoinMessageLibrary);
  await deployer.link(SyscoinMessageLibrary, [SyscoinRelay, SyscoinRelayTest]);

  console.log('Deploying SyscoinRelay & SyscoinRelayTest...');
  await deployer.deploy(SyscoinRelay);
  await deployer.deploy(SyscoinRelayTest);

  console.log('Deploying SyscoinVaultManager...');
  // trustedRelayer is SyscoinRelay, sysxGuid=123456, testNetwork=false
  await deployer.deploy(SyscoinVaultManager, SyscoinRelay.address, 123456, { from: accounts[0] });

  let syscoinRelay = await SyscoinRelay.deployed();
  console.log('Init syscoinRelay with SyscoinVaultManager...');
  await syscoinRelay.init(SyscoinVaultManager.address, { from: accounts[0] });

};
