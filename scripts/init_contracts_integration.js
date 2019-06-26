var Superblocks = artifacts.require("./SyscoinSuperblocks.sol");
module.exports = async function(callback) {
  console.log("init_contracts_integration begin");
  
  var sb = await Superblocks.deployed();

  var blocksMerkleRoot = "0x0000022642db0346b6e01c2a397471f4f12e65d4f4251ec96c1f85367a61a7ab";
  var accumulatedWork = web3.toBigNumber(0x100001);
  var timestamp = 1559520000;
  var retargetPeriod = 0;
  var lastHash = "0x0000022642db0346b6e01c2a397471f4f12e65d4f4251ec96c1f85367a61a7ab";
  var lastBits = 0x1e0fffff;
  var parentId = "0x0";
  var height = 0;
  await sb.initialize(blocksMerkleRoot, accumulatedWork, timestamp, retargetPeriod, lastHash, lastBits, parentId,height);

   console.log("init_contracts_integration end");
}