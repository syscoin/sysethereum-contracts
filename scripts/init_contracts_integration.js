var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x000007f96fcbdbdfbc2560b63bb545648f8d9f27c15ae8f5bbc350218198704e";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1553041506;
  var prevTimestamp = 0;
  var lastHash = "0x000007f96fcbdbdfbc2560b63bb545648f8d9f27c15ae8f5bbc350218198704e";
  var lastBits = 0x1e0ffff0;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

   console.log("init_contracts_integration end");
}