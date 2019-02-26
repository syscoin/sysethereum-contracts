var SyscoinToken = artifacts.require("./SyscoinToken.sol");
var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
const utils = require('./../test/utils');

module.exports = async function(callback) {
  console.log("init_contracts_local begin");
  

  var dt = await SyscoinToken.deployed();


  var sb = await Superblocks.deployed();
  var blocksMerkleRoot = "0x3d2160a3b5dc4a9d62e7e66a295f70313ac808440ef7400d6c0772171ce973a5";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1296688602;
  var prevTimestamp = 0;
  var lastHash = "0x3d2160a3b5dc4a9d62e7e66a295f70313ac808440ef7400d6c0772171ce973a5";
  var lastBits = 0x207fffff;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

  console.log("init_contracts_local end");

}