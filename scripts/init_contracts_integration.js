var SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");
var utils = require('../test/utils');
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await SyscoinSuperblocks.deployed();
  console.log("beginning deployment...");
  var blocksMerkleRoot = "0xa395b884dea0c77d3eff856838ebba4e74a6e633c7516784a7f21705d3d58f45";
  var accumulatedWork = web3.utils.toBN("0x0000000000000000000000000000000000000000000b5aea51981d092e7d9739");
  var timestamp = 1562016306;
  var lastHash = "0xa395b884dea0c77d3eff856838ebba4e74a6e633c7516784a7f21705d3d58f45"; // 46800
  var parentId = "0x0";
  console.log("Initializing...");
  res = await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, lastHash, parentId);
  console.log("init_contracts_integration end");
}