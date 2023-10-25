const SyscoinVaultManager = artifacts.require('./SyscoinVaultManager.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinRelay = artifacts.require('./SyscoinRelay.sol');
async function deploy(deployer, accounts) {
  // Push implementation contracts to the network
  console.log('Deploying implementations...');
  await deployer.deploy(SyscoinMessageLibrary, {gas: 700000});
  await deployer.deploy(SyscoinRelay, {gas: 2000000});
  await deployer.link(SyscoinMessageLibrary, SyscoinRelay);
  await deployer.deploy(SyscoinVaultManager, SyscoinRelay.address, {gas: 2500000});
  const syscoinRelay = await SyscoinRelay.at(SyscoinRelay.address);
  await syscoinRelay.init(SyscoinVaultManager.address);
  return SyscoinVaultManager;
}

module.exports = function(deployer, networkName, accounts) {
  console.log('Deploy wallet', accounts);
  deployer.then(async () => {
    await deploy(deployer, accounts);
  });
};
