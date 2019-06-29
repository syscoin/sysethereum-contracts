var SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");
var utils = require('../test/utils');
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await SyscoinSuperblocks.deployed();
  console.log("beginning deployment...");
  var blocksMerkleRoot = "0x0000022642db0346b6e01c2a397471f4f12e65d4f4251ec96c1f85367a61a7ab";
  var accumulatedWork = web3.utils.toBN(0x100001);
  var timestamp = 1559520000;
  var lastHash = "0x0000022642db0346b6e01c2a397471f4f12e65d4f4251ec96c1f85367a61a7ab";
  var parentId = "0x0";
  var height = 0;
  console.log("Initializing...");
  res = await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, lastHash, parentId,height);
  console.log("init_contracts_integration end");
}