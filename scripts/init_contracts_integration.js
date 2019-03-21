var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x00000978a70b30e06014aaee001965bb0a9a03e38ca99ff6d79e34df7805f7be";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1553040331;
  var prevTimestamp = 0;
  var lastHash = "0x00000978a70b30e06014aaee001965bb0a9a03e38ca99ff6d79e34df7805f7be";
  var lastBits = 0x1e0ffff0;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

   console.log("init_contracts_integration end");
}