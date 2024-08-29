const SyscoinVaultManager = artifacts.require('./SyscoinVaultManager.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinRelay = artifacts.require('./SyscoinRelay.sol');
const SyscoinRelayTest = artifacts.require('./SyscoinRelayTest.sol');
async function deploy(deployer, accounts) {
  // Push implementation contracts to the network
  console.log('Deploying SyscoinMessageLibrary...');
  await deployer.deploy(SyscoinMessageLibrary, {gas: 700000});
  console.log('Deploying SyscoinRelay...');
  await deployer.deploy(SyscoinRelay, {gas: 2000000});
  await deployer.deploy(SyscoinRelayTest, {gas: 2000000});
  console.log('Linking SyscoinMessageLibrary with SyscoinRelay...');
  await deployer.link(SyscoinMessageLibrary, SyscoinRelay);
  console.log('Deploying SyscoinVaultManager...');
  await deployer.deploy(SyscoinVaultManager, SyscoinRelay.address, {gas: 2500000});
  const syscoinRelay = await SyscoinRelay.at(SyscoinRelay.address);
  console.log('Initing SyscoinVaultManager...');
  await syscoinRelay.init(SyscoinVaultManager.address);
  return SyscoinVaultManager;
}

module.exports = function(deployer, networkName, accounts) {
  console.log('Deploy wallet', accounts);
  deployer.then(async () => {
    await deploy(deployer, accounts);
  });
};
