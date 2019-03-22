var SyscoinToken = artifacts.require("./SyscoinToken.sol");
var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
const utils = require('./../test/utils');

module.exports = async function(callback) {
  console.log("init_contracts_ethganachesyscoinmain begin");
  var dt = await SyscoinToken.deployed()

  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x000009e388d0cb406b36ed70bf89d21a4f7a3b1adea23a21e7948bac2dbb9fcc";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1552606660;
  var prevTimestamp = 0;
  var lastHash = "0x000009e388d0cb406b36ed70bf89d21a4f7a3b1adea23a21e7948bac2dbb9fcc";
  var lastBits = 0x1e0ffff0;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

  console.log("init_contracts_ethganachesyscoinmain end");
}