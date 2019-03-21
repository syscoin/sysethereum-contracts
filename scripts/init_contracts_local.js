var SyscoinToken = artifacts.require("./SyscoinToken.sol");
var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
const utils = require('./../test/utils');

module.exports = async function(callback) {
  console.log("init_contracts_local begin");
  

  var dt = await SyscoinToken.deployed();


  var sb = await Superblocks.deployed();
  var blocksMerkleRoot = "0x28a2c2d251f46fac05ade79085cbcb2ae4ec67ea24f1f1c7b40a348c00521194";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1553040331;
  var prevTimestamp = 0;
  var lastHash = "0x28a2c2d251f46fac05ade79085cbcb2ae4ec67ea24f1f1c7b40a348c00521194";
  var lastBits = 0x207fffff;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

  console.log("init_contracts_local end");

}