const SyscoinERC20Manager = artifacts.require('./token/SyscoinERC20Manager.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinRelay = artifacts.require('./SyscoinRelay.sol');
const SYSX_ASSET_GUID = 2615707979;
async function deploy(deployer, accounts) {
  // Push implementation contracts to the network
  console.log('Deploying implementations...');
  await deployer.deploy(SyscoinMessageLibrary, {gas: 2000000});
  await deployer.deploy(SyscoinRelay, {gas: 5000000});
  await deployer.link(SyscoinMessageLibrary, SyscoinRelay);
  await deployer.deploy(SyscoinERC20Manager, SyscoinRelay.address, SYSX_ASSET_GUID, '0x0000000000000000000000000000000000000000');
  const syscoinRelay = await SyscoinRelay.at(SyscoinRelay.address);
  await syscoinRelay.init(SyscoinERC20Manager.address);
  return SyscoinERC20Manager;
}

module.exports = function(deployer, networkName, accounts) {
  console.log('Deploy wallet', accounts);
  deployer.then(async () => {
    await deploy(deployer, accounts);
  });
};
