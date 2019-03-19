var SyscoinToken = artifacts.require("./SyscoinToken.sol");
var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
const utils = require('./../test/utils');

module.exports = async function(callback) {
  console.log("init_contracts_local begin");
  
  var sb = await Superblocks.deployed();
  var blocksMerkleRoot = "0x18ca6835aea9c1fd25d1aa097790da47a343d1bdd3370fa2585dd5cd6883de5e";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1549295742;
  var prevTimestamp = 0;
  var lastHash = "0x18ca6835aea9c1fd25d1aa097790da47a343d1bdd3370fa2585dd5cd6883de5e";
  var lastBits = 0x207fffff;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

  console.log("init_contracts_local end");

}