// Load zos scripts and truffle wrapper function
const { ConfigManager, scripts } = require('@openzeppelin/cli');
const { add, push, create } = scripts;

/* Retrieve compiled contract artifacts. */
const ERC20Asset = artifacts.require('./token/SyscoinERC20.sol');


const SYSCOIN_MAINNET = 0;
const SYSCOIN_TESTNET = 1;
const SYSCOIN_REGTEST = 2;
const SYSX_ASSET_GUID = 1045909988; // mainnet sysx
const SUPERBLOCK_OPTIONS_PRODUCTION = {
  DURATION: 60,   // 60 blocks per superblock
  DELAY: 3 * 3600,  // 3 hours
  TIMEOUT: 600,     // 10 minutes
  CONFIRMATIONS: 3 // Superblocks required to confirm semi approved superblock
};


const SUPERBLOCK_OPTIONS_LOCAL = {
  DURATION: 60,     // 10 blocks per superblock
  DELAY: 60,        // 1 minute
  TIMEOUT: 30,      // 30 seconds
  CONFIRMATIONS: 1 // Superblocks required to confirm semi approved superblock
};

async function deploy(networkName, options, accounts, networkId, superblockOptions) {
  // Register contracts in the zos project
  add({ contractsData: [{ name: 'SyscoinSuperblocks', alias: 'SyscoinSuperblocks' }] });
  add({ contractsData: [{ name: 'SyscoinERC20Manager', alias: 'SyscoinERC20Manager' }] });
  add({ contractsData: [{ name: 'SyscoinBattleManager', alias: 'SyscoinBattleManager' }] });
  add({ contractsData: [{ name: 'SyscoinClaimManager', alias: 'SyscoinClaimManager' }] });

  // Push implementation contracts to the network
  console.log('Deploying implementations...');

  await push(options);

  // Create an instance of MyContract, setting initial value to 42
  console.log('\nDeploying SyscoinSuperblocks proxy instance at address ');
  let SyscoinSuperblocks = await create(Object.assign({ contractAlias: 'SyscoinSuperblocks' }, options));

  console.log('\nDeploying and Initializing SyscoinERC20Manager proxy instance at address ');
  let SyscoinERC20Manager = await create(Object.assign({ contractAlias: 'SyscoinERC20Manager', methodName: 'init', methodArgs: [networkId, SyscoinSuperblocks.address] }, options));

  console.log('\nDeploying and Initializing SyscoinBattleManager proxy instance at address ');
  let SyscoinBattleManager = await create(Object.assign({ contractAlias: 'SyscoinBattleManager', methodName: 'init', methodArgs: [networkId, SyscoinSuperblocks.address, superblockOptions.DURATION, superblockOptions.TIMEOUT] }, options));

  console.log('\nDeploying and Initializing SyscoinClaimManager proxy instance at address ');
  let SyscoinClaimManager = await create(Object.assign({ contractAlias: 'SyscoinClaimManager', methodName: 'init', methodArgs: [SyscoinSuperblocks.address, SyscoinBattleManager.address, superblockOptions.DELAY, superblockOptions.TIMEOUT, superblockOptions.CONFIRMATIONS] }, options));

  console.log('\nInitializing SyscoinSuperblocks...');
  let tx = await SyscoinSuperblocks.methods.init(SyscoinERC20Manager.address, SyscoinClaimManager.address).send({ from: accounts[0], gas: 300000 });
  console.log('TX hash: ', tx.transactionHash, '\n');

  var superblocksMerkleRoot = "0x33de3e710118e85a26cd3673c9d24c6d044520a6241c37248cf2cacb4a100f0f";
  var timestamp = 1576850904;
  var mtptimestamp = 1576850690;
  var lastHash = "0x33de3e710118e85a26cd3673c9d24c6d044520a6241c37248cf2cacb4a100f0f"; // 292680
  var parentId = "0x0";
  var lastBits = 402958772; // 1804a9b4

  let tx2 = await SyscoinSuperblocks.methods.initialize(superblocksMerkleRoot, timestamp, mtptimestamp, lastHash, lastBits, parentId).send({ from: accounts[0], gas: 300000 });
  console.log('TX2 hash: ', tx2.transactionHash, '\n');

  console.log('Initializing SyscoinBattleManager...');
  tx = await SyscoinBattleManager.methods.setSyscoinClaimManager(SyscoinClaimManager.address).send({ from: accounts[0], gas: 300000 });
  console.log('TX hash: ', tx.transactionHash, '\n');

  let linkTemplates = {
    mainnet: "https://etherscan.io/address",
    rinkeby: "https://rinkeby.etherscan.io/address"
  };

  if (networkName in linkTemplates) {
    let link = linkTemplates[networkName];

    console.log("\Proxies:");
    console.log("* %s/%s - superblocks", link, SyscoinSuperblocks.address);
    console.log("* %s/%s - battle manager", link, SyscoinBattleManager.address);
    console.log("* %s/%s - claim manager", link, SyscoinClaimManager.address);
  }
  return SyscoinERC20Manager;
}

module.exports = function(deployer, networkName, accounts) {
  console.log('Deploy wallet', accounts);
  deployer.then(async () => {
    let SyscoinERC20Manager;
    const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: networkName, from: accounts[0] })

    if (networkName === 'development') {
      SyscoinERC20Manager = await deploy(networkName, { network, txParams }, accounts, SYSCOIN_REGTEST, SUPERBLOCK_OPTIONS_LOCAL);
    } else {
      if (networkName === 'ropsten') {
        SyscoinERC20Manager = await deploy(networkName, { network, txParams }, accounts, SYSCOIN_MAINNET, SUPERBLOCK_OPTIONS_PRODUCTION);
      } else if (networkName === 'rinkeby') {
        SyscoinERC20Manager = await deploy(networkName, { network, txParams }, accounts, SYSCOIN_TESTNET, SUPERBLOCK_OPTIONS_PRODUCTION);
      } else if (networkName === 'mainnet') {
        SyscoinERC20Manager = await deploy(networkName, { network, txParams }, accounts, SYSCOIN_MAINNET, SUPERBLOCK_OPTIONS_PRODUCTION);
      } else if (networkName === 'integrationSyscoinRegtest') {
        SyscoinERC20Manager = await deploy(networkName, { network, txParams }, accounts, SYSCOIN_REGTEST, SUPERBLOCK_OPTIONS_PRODUCTION);
      }
    }
    let burnVal = web3.utils.toWei("88.8", "finney"); // total supply 888m COIN on Syscoin
    erc20Asset = await deployer.deploy(ERC20Asset,
      "SyscoinToken", "SYSX", 8,
      {from: accounts[0], gas: 2000000 }
    );
    await erc20Asset.assign(accounts[0], burnVal);
    await erc20Asset.approve(SyscoinERC20Manager.address, burnVal, {from: accounts[0]}); 
    tx = await SyscoinERC20Manager.methods.freezeBurnERC20(burnVal, SYSX_ASSET_GUID, erc20Asset.address, 8, "0x1").send({from: accounts[0], gas: 300000});
    let balance = await erc20Asset.balanceOf(accounts[0]);
    if(balance != 0)
      console.log('\nerc20Asset user balance after burn is not the expected one');
    let assetBalance = await SyscoinERC20Manager.methods.assetBalances(SYSX_ASSET_GUID).call();
    if(assetBalance != burnVal){
      console.log('\nassetBalances for asset GUID is not correct');
    }
    let erc20ManagerBalance = await erc20Asset.balanceOf(SyscoinERC20Manager.address);
    if(erc20ManagerBalance != burnVal){
      console.log('\Token balance for ERC20 manager is not correct: ' + erc20ManagerBalance);
    }
  });
};
