
const Set = artifacts.require('./token/Set.sol');
const ECRecovery = artifacts.require('ECRecovery');
const SyscoinToken = artifacts.require('./token/SyscoinToken.sol');
const SyscoinTokenForTests = artifacts.require('./token/SyscoinTokenForTests.sol');
const SyscoinMessageLibrary = artifacts.require('./SyscoinParser/SyscoinMessageLibrary.sol');
const SyscoinMessageLibraryForTests = artifacts.require('./SyscoinParser/SyscoinMessageLibraryForTests.sol');
const SyscoinSuperblocks = artifacts.require('./SyscoinSuperblocks.sol');
const SyscoinClaimManager = artifacts.require('./SyscoinClaimManager.sol');
const SyscoinBattleManager = artifacts.require('./SyscoinBattleManager.sol');

const SafeMath = artifacts.require('openzeppelin-solidity/contracts/math/SafeMath.sol');

//const sysethereumRecipientUnitTest = '0x4d905b4b815d483cdfabcd292c6f86509d0fad82';
//const sysethereumRecipientIntegrationSyscoinMain = '0x0000000000000000000000000000000000000003';
//const sysethereumRecipientIntegrationSyscoinRegtest = '0x03cd041b0139d3240607b9fd1b2d1b691e22b5d6';

/* ---- CONSTANTS FOR GENESIS SUPERBLOCK ---- */

// TODO: set these to their actual values
const genesisSuperblockMerkleRoot = "0x3d2160a3b5dc4a9d62e7e66a295f70313ac808440ef7400d6c0772171ce973a5";
const genesisSuperblockChainWork = 0;
const genesisSuperblockLastBlockTimestamp = 1296688602;
const genesisSuperblockLastBlockHash = "0x3d2160a3b5dc4a9d62e7e66a295f70313ac808440ef7400d6c0772171ce973a5";
const genesisSuperblockParentId = "0x0";


const SYSCOIN_MAINNET = 0;
const SYSCOIN_TESTNET = 1;
const SYSCOIN_REGTEST = 2;

const SUPERBLOCK_OPTIONS_PRODUCTION = {
  DURATION: 3600,   // 60 minutes
  DELAY: 3 * 3600,  // 3 hours
  TIMEOUT: 300,     // 5 minutes
  CONFIRMATIONS: 3, // Superblocks required to confirm semi approved superblock
  REWARD: 10        // Monetary reward for opponent in case a battle is lost
};

const SUPERBLOCK_OPTIONS_INTEGRATION_SLOW_SYNC = {
  DURATION: 600,    // 10 minutes
  DELAY: 300,       // 5 minutes
  TIMEOUT: 60,      // 1 minutes
  CONFIRMATIONS: 1, // Superblocks required to confirm semi approved superblock
  REWARD: 10        // Monetary reward for opponent in case a battle is lost  
};

const SUPERBLOCK_OPTIONS_INTEGRATION_FAST_SYNC = {
  DURATION: 600,    // 10 minutes
  DELAY: 300,       // 5 minutes
  TIMEOUT: 10,      // 10 seconds
  CONFIRMATIONS: 1, // Superblocks required to confirm semi approved superblock
  REWARD: 10        // Monetary reward for opponent in case a battle is lost  
};

const SUPERBLOCK_OPTIONS_LOCAL = {
  DURATION: 60,     // 1 minute
  DELAY: 60,        // 1 minute
  TIMEOUT: 30,      // 30 seconds
  CONFIRMATIONS: 1, // Superblocks required to confirm semi approved superblock
  REWARD: 10        // Monetary reward for opponent in case a battle is lost  
};

async function deployDevelopment(deployer, network, accounts, networkId,
    sysethereumRecipient, superblockOptions) {
  await deployer.deploy(Set);
  await deployer.deploy(SyscoinMessageLibrary);
  await deployer.deploy(SafeMath);
  await deployer.deploy(ECRecovery);

  await deployer.link(Set, SyscoinTokenForTests);
  await deployer.link(SyscoinMessageLibrary, [SyscoinMessageLibraryForTests, SyscoinTokenForTests, SyscoinSuperblocks, SyscoinBattleManager, SyscoinClaimManager]);
  await deployer.link(ECRecovery, SyscoinTokenForTests);


  await deployer.deploy(SyscoinSuperblocks);

  await deployer.deploy(SyscoinTokenForTests,
    SyscoinSuperblocks.address,0
  );

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
    superblockOptions.CONFIRMATIONS,
    superblockOptions.REWARD
  );

  await deployer.deploy(SyscoinMessageLibraryForTests);

  const superblocks = SyscoinSuperblocks.at(SyscoinSuperblocks.address);
  await superblocks.setClaimManager(SyscoinClaimManager.address);

  const syscoinBattleManager = SyscoinBattleManager.at(SyscoinBattleManager.address);
  await syscoinBattleManager.setSyscoinClaimManager(SyscoinClaimManager.address);
}

async function deployIntegration(deployer, network, accounts, networkId, 
    sysethereumRecipient, superblockOptions) {
  await deployer.deploy(Set, {gas: 300000});
  await deployer.deploy(SyscoinMessageLibrary, {gas: 2000000});
  await deployer.deploy(SafeMath, {gas: 100000});
  await deployer.deploy(ECRecovery, {gas: 100000});

  await deployer.link(Set, SyscoinToken);
  await deployer.link(SyscoinMessageLibrary, [SyscoinToken, SyscoinSuperblocks, SyscoinBattleManager, SyscoinClaimManager]);
  await deployer.link(ECRecovery, SyscoinToken);

  await deployer.deploy(SyscoinSuperblocks, {gas: 5000000});

  await deployer.deploy(SyscoinToken,
    SyscoinSuperblocks.address,0,
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
    superblockOptions.REWARD,
    {gas: 4000000}
  );

  const superblocks = SyscoinSuperblocks.at(SyscoinSuperblocks.address);
  await superblocks.setClaimManager(SyscoinClaimManager.address, {gas: 60000});

  const syscoinBattleManager = SyscoinBattleManager.at(SyscoinBattleManager.address);
  await syscoinBattleManager.setSyscoinClaimManager(SyscoinClaimManager.address);
}

module.exports = function(deployer, network, accounts) {
  deployer.then(async () => {


    if (network === 'development') {
      await deployDevelopment(deployer, network, accounts, SYSCOIN_MAINNET, null, SUPERBLOCK_OPTIONS_LOCAL);
    } else if (network === 'ropsten') {
      await deployIntegration(deployer, network, accounts, SYSCOIN_MAINNET, null, SUPERBLOCK_OPTIONS_INTEGRATION_FAST_SYNC);
    } else if (network === 'rinkeby') {
      await deployIntegration(deployer, network, accounts, SYSCOIN_MAINNET, null, SUPERBLOCK_OPTIONS_INTEGRATION_FAST_SYNC);
    } else if (network === 'integrationSyscoinMain') {
      await deployIntegration(deployer, network, accounts, SYSCOIN_MAINNET, null, SUPERBLOCK_OPTIONS_PRODUCTION);
    } else if (network === 'integrationSyscoinRegtest') {
      await deployIntegration(deployer, network, accounts, SYSCOIN_REGTEST, null, SUPERBLOCK_OPTIONS_LOCAL);
    }
  });
};
