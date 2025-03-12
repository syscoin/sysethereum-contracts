const SyscoinVaultManager = artifacts.require('./SyscoinVaultManager.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinRelay = artifacts.require('./SyscoinRelay.sol');

module.exports = async function(deployer, network, accounts) {
  const owner = accounts[0];

  console.log("Owner address:", owner);
  const balance = await web3.eth.getBalance(owner);
  console.log("Balance of deployer:", balance.toString());

  // Deploy the library first
  console.log('Deploying SyscoinMessageLibrary...');
  await deployer.deploy(SyscoinMessageLibrary);
  await deployer.link(SyscoinMessageLibrary, [SyscoinRelay]);

  // Deploy SyscoinRelay (no owner needed if it's not Ownable)
  console.log('Deploying SyscoinRelay...');
  await deployer.deploy(SyscoinRelay, { gas: 5000000 });
  const syscoinRelay = await SyscoinRelay.deployed();

  // Deploy SyscoinVaultManager (pass owner explicitly)
  console.log('Deploying SyscoinVaultManager...');
  await deployer.deploy(SyscoinVaultManager, syscoinRelay.address, 123456, owner);
  const syscoinVaultManager = await SyscoinVaultManager.deployed();
  console.log("Deployed VaultManager address:", syscoinVaultManager.address);

  // Initialize Relay with VaultManager address
  console.log('Initializing SyscoinRelay with VaultManager...');
  await syscoinRelay.init(syscoinVaultManager.address, { from: owner });

  // Confirm setup
  const configuredVaultAddress = await syscoinRelay.syscoinVaultManager();
  console.log("Relay configured VaultManager address:", configuredVaultAddress);

  if(configuredVaultAddress !== syscoinVaultManager.address) {
    throw new Error('SyscoinRelay initialization failed: VaultManager address mismatch');
  }

  console.log('Deployment and initialization successful.');
};
