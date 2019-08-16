var SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");
var utils = require('../test/utils');
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await SyscoinSuperblocks.deployed();
  console.log("beginning deployment...");
  var blocksMerkleRoot = "0x0b997db69c6bb3c0dcac85f3a7cf599bbd65773e8eccaaf69fc326d4b2bcb840";
  var accumulatedWork = web3.utils.toBN("0x0000000000000000000000000000000000000000000000000000000016800168");
  var timestamp = 1565991151;
  var lastHash = "0x000002afdda9c43ddeb2bc1bf31dba6d039307df65e2fd0111bdf5c201ec1d6f"; // 359
  var parentId = "0x0";
  var lastBits = 504365055;
  console.log("Initializing...");
  res = await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, lastHash, lastBits, parentId);
  console.log("init_contracts_integration end");
}