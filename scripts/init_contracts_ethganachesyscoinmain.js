var SyscoinToken = artifacts.require("./SyscoinToken.sol");
var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
const utils = require('./../test/utils');

module.exports = async function(callback) {
  console.log("init_contracts_ethganachesyscoinmain begin");
  var dt = await SyscoinToken.deployed()

  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x629417921bc4ab79db4a4a02b4d7946a4d0dbc6a3c5bca898dd12eacaeb8b353";
  var accumulatedWork = web3.toBigNumber("4266257060811936889868");
  var timestamp = 1535743139;
  var prevTimestamp = 1535743100;
  var lastHash = "0xe2a056368784e63b9b5f9c17b613718ef7388a799e8535ab59be397019eff798";
  var lastBits = 436759445;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

  console.log("init_contracts_ethganachesyscoinmain end");
}