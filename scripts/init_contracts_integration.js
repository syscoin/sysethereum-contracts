var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x000001cab6418dbdbdc0255b5216938d0b1d93e9c4fbce43a1a8886eb2b4356f";
  var accumulatedWork = web3.toBigNumber(0x100001);
  var timestamp = 1552606662;
  var prevTimestamp = 0;
  var lastHash = "0x000001cab6418dbdbdc0255b5216938d0b1d93e9c4fbce43a1a8886eb2b4356f";
  var lastBits = 0x1e0fffff;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

   console.log("init_contracts_integration end");
}