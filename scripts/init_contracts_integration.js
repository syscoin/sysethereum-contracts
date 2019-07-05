var SyscoinSuperblocks = artifacts.require("./SyscoinSuperblocks.sol");
var utils = require('../test/utils');
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await SyscoinSuperblocks.deployed();
  console.log("beginning deployment...");
  var blocksMerkleRoot = "0xb106dd7496392e50b7c7e529240d6e62987db827ec2a7203120b0ca3c5a83c71";
  var accumulatedWork = web3.utils.toBN("0x0000000000000000000000000000000000000000000b5ad3ace4939af72d8700");
  var timestamp = 1562016284;
  var lastHash = "0xb106dd7496392e50b7c7e529240d6e62987db827ec2a7203120b0ca3c5a83c71"; // 46799
  var parentId = "0x0";
  var lastBits = 403358244;
  console.log("Initializing...");
  res = await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, lastHash, lastBits, parentId);
  console.log("init_contracts_integration end");
}