var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x000007e0aeb37995d0c0ae8ad49fb7ae17eba65167501f85d40d736d67e754c3";
  var accumulatedWork = web3.toBigNumber("0");
  var timestamp = 1552606661;
  var prevTimestamp = 0;
  var lastHash = "0x000007e0aeb37995d0c0ae8ad49fb7ae17eba65167501f85d40d736d67e754c3";
  var lastBits = 0x1e0ffff0;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, prevTimestamp, lastHash, lastBits, parentId,height);

   console.log("init_contracts_integration end");
}