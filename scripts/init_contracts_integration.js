var SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");
var utils = require('../test/utils');
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await SyscoinSuperblocks.deployed();
  console.log("beginning deployment...");
  var blocksMerkleRoot = "0x00000c8ce2dbffb1958260498de24e52c083dd0eaf2eec95baadff55b6d160da";
  var accumulatedWork = web3.utils.toBN("0x0000000000000000000000000000000000000000000000000000000016800168");
  var timestamp = 1562016284;
  var lastHash = "0x00000c8ce2dbffb1958260498de24e52c083dd0eaf2eec95baadff55b6d160da"; // 359
  var parentId = "0x0";
  var lastBits = 504365055;
  console.log("Initializing...");
  res = await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, lastHash, lastBits, parentId);
  console.log("init_contracts_integration end");
}