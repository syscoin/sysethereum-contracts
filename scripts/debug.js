var SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");
var SyscoinClaimManager = artifacts.require("./SyscoinClaimManager.sol");
var SyscoinToken = artifacts.require("./token/SyscoinToken.sol");
var utils = require('../test/utils');

module.exports = async function(callback) {
  var ds  = await SyscoinSuperblocks.deployed();
  var dcm  = await SyscoinClaimManager.deployed();
  console.log("Superblocks");
  console.log("---------");
  var bestSuperblockHash = await ds.getBestSuperblock.call(); 
  console.log("Best superblock hash : " + bestSuperblockHash.toString(16));
  var bestSuperblockHeight = await ds.getSuperblockHeight.call(bestSuperblockHash);
  console.log("Best superblock height : " + bestSuperblockHeight);
  var lastHash = await ds.getSuperblockLastHash.call(bestSuperblockHash);
  console.log("lastHash : " + lastHash);
  var indexNextSuperblock = await ds.getIndexNextSuperblock.call();
  console.log("indexNextSuperblock : " + indexNextSuperblock);
  var newSuperblockEventTimestamp = await dcm.getNewSuperblockEventTimestamp.call(bestSuperblockHash);
  console.log("newSuperblockEventTimestamp : " + newSuperblockEventTimestamp);
  console.log("");


  console.log("SyscoinToken");
  console.log("---------");
  var dt = await SyscoinToken.deployed();
  var balance1 = await dt.balanceOf.call("0x1a8d58bc7390f55d060bb78cf8f8cae953ce9b94"); 
  console.log("SyscoinToken Balance of 0x1a8d58bc7390f55d060bb78cf8f8cae953ce9b94 : " + balance1);
  var balance2 = await dt.balanceOf.call("0xd2394f3fad76167e7583a876c292c86ed10305da"); 
  console.log("SyscoinToken Balance of 0xd2394f3fad76167e7583a876c292c86ed10305da : " + balance2);
  var balance3 = await dt.balanceOf.call("0xf5fa014271b7971cb0ae960d445db3cb3802dfd9"); 
  console.log("SyscoinToken Balance of 0xf5fa014271b7971cb0ae960d445db3cb3802dfd9 : " + balance3);


 
  // Current block number 
  console.log("Eth Current block : " + web3.eth.blockNumber);

}