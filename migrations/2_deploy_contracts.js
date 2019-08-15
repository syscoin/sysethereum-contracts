
const Set = artifacts.require('./token/Set.sol');
const SyscoinERC20Asset = artifacts.require('./token/SyscoinERC20Asset.sol');
const SyscoinERC20Manager = artifacts.require('./token/SyscoinERC20Manager.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinSuperblocks = artifacts.require('./SyscoinSuperblocks.sol');
const SyscoinClaimManager = artifacts.require('./SyscoinClaimManager.sol');
const SyscoinBattleManager = artifacts.require('./SyscoinBattleManager.sol');

const SafeMath = artifacts.require('openzeppelin-solidity/contracts/math/SafeMath.sol');

const SYSCOIN_MAINNET = 0;
const SYSCOIN_TESTNET = 1;
const SYSCOIN_REGTEST = 2;

const SUPERBLOCK_OPTIONS_PRODUCTION = {
  DURATION: 60,   // 60 blocks per superblock
  DELAY: 3 * 3600,  // 3 hours
  TIMEOUT: 600,     // 10 minutes
  CONFIRMATIONS: 3, // Superblocks required to confirm semi approved superblock
  ASSETGUID: 719610612
};

const SUPERBLOCK_OPTIONS_INTEGRATION_FAST_SYNC = {
  DURATION: 10,    // 10 blocks per superblock
  DELAY: 300,       // 5 minutes
  TIMEOUT: 300,      // 5 minutes
  CONFIRMATIONS: 3, // Superblocks required to confirm semi approved superblock
  ASSETGUID: 1172462264
};

const SUPERBLOCK_OPTIONS_LOCAL = {
  DURATION: 60,     // 10 blocks per superblock
  DELAY: 60,        // 1 minute
  TIMEOUT: 30,      // 30 seconds
  CONFIRMATIONS: 1, // Superblocks required to confirm semi approved superblock
  ASSETGUID: 1172462264
};

async function deployDevelopment(deployer, networkId, superblockOptions) {
  await deployer.deploy(Set);
  await deployer.deploy(SyscoinMessageLibrary);
  await deployer.deploy(SafeMath);

  await deployer.link(SyscoinMessageLibrary, [SyscoinSuperblocks, SyscoinBattleManager, SyscoinClaimManager]);

  await deployer.deploy(SyscoinSuperblocks);
  await deployer.link(Set, SyscoinERC20Manager);
  await deployer.deploy(SyscoinERC20Manager, SyscoinSuperblocks.address);

  await deployer.deploy(SyscoinBattleManager,
    networkId,
    SyscoinSuperblocks.address,
    superblockOptions.DURATION,
    superblockOptions.TIMEOUT,
  );

  await deployer.deploy(SyscoinClaimManager,
    SyscoinSuperblocks.address,
    SyscoinBattleManager.address,
    superblockOptions.DELAY,
    superblockOptions.TIMEOUT,
    superblockOptions.CONFIRMATIONS
  );

  const superblocks = SyscoinSuperblocks.at(SyscoinSuperblocks.address);
  (await superblocks).setClaimManager(SyscoinClaimManager.address);
  (await superblocks).setERC20Manager(SyscoinERC20Manager.address);

  const syscoinBattleManager = SyscoinBattleManager.at(SyscoinBattleManager.address);
  (await syscoinBattleManager).setSyscoinClaimManager(SyscoinClaimManager.address);
}

async function deployIntegration(deployer,  networkId, superblockOptions) {
  await deployer.deploy(Set, {gas: 300000});
  await deployer.deploy(SyscoinMessageLibrary, {gas: 2000000});
  await deployer.deploy(SafeMath, {gas: 100000});

  await deployer.link(SyscoinMessageLibrary, [SyscoinSuperblocks, SyscoinBattleManager, SyscoinClaimManager]);

  await deployer.deploy(SyscoinSuperblocks, {gas: 5000000});

  await deployer.link(Set, SyscoinERC20Manager);
  await deployer.deploy(SyscoinERC20Manager, SyscoinSuperblocks.address);

  await deployer.deploy(SyscoinERC20Asset,
    "SyscoinToken", "SYSX", 8, SyscoinERC20Manager.address,
    {gas: 2000000 }
  );
  await deployer.deploy(SyscoinBattleManager,
    networkId,
    SyscoinSuperblocks.address,
    superblockOptions.DURATION,
    superblockOptions.TIMEOUT,
    {gas: 3000000},
  );

  await deployer.deploy(SyscoinClaimManager,
    SyscoinSuperblocks.address,
    SyscoinBattleManager.address,
    superblockOptions.DELAY,
    superblockOptions.TIMEOUT,
    superblockOptions.CONFIRMATIONS,
    {gas: 5000000}
  );

  const superblocks = SyscoinSuperblocks.at(SyscoinSuperblocks.address);
  (await superblocks).setClaimManager(SyscoinClaimManager.address, {gas: 60000});
  (await superblocks).setERC20Manager(SyscoinERC20Manager.address);

  const syscoinBattleManager = SyscoinBattleManager.at(SyscoinBattleManager.address);
  (await syscoinBattleManager).setSyscoinClaimManager(SyscoinClaimManager.address);
}

module.exports = function(deployer, network) {
  deployer.then(async () => {
    if (network === 'development') {
      await deployDevelopment(deployer, SYSCOIN_MAINNET, SUPERBLOCK_OPTIONS_LOCAL);
    } else if (network === 'ropsten') {
      await deployIntegration(deployer, SYSCOIN_MAINNET, SUPERBLOCK_OPTIONS_INTEGRATION_FAST_SYNC);
    } else if (network === 'rinkeby') {
      await deployIntegration(deployer, SYSCOIN_TESTNET, SUPERBLOCK_OPTIONS_PRODUCTION);
    } else if (network === 'mainnet') {
      await deployIntegration(deployer, SYSCOIN_MAINNET, SUPERBLOCK_OPTIONS_PRODUCTION);
    } else if (network === 'integrationSyscoinRegtest') {
      await deployIntegration(deployer, SYSCOIN_REGTEST, SUPERBLOCK_OPTIONS_LOCAL);
    }
  });
};
