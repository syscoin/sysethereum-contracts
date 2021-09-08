const truffleAssert = require('truffle-assertions');
const SyscoinRelay = artifacts.require('SyscoinRelay');

contract('SyscoinRelay', (accounts) => {
  let syscoinRelay;

  describe("Test pure/view computation functions", () => {
    before(async () => {
      syscoinRelay = await SyscoinRelay.at(SyscoinRelay.address);
    });
    it("bytesToUint32", async () => {
      const result = await syscoinRelay.bytesToUint32("0x01020304", 0);
      assert.equal(result, 16909060, "converted bytes are not the expected ones");
    });
    it("parseAssetTx() no contract", async () => {
      const txBytes = "0x8300000000010128ed59d71961dafec1b182e46bc728b65fd6a72f0889dff7a7ec81c8fa6c840c0000000000feffffff027adff50500000000160014a6169d5609c4849d999f7ca98ffd7b96f406248200000000000000003e6a3c0186c3400100000008030014a738a563f9ecb55e0b2245d1e9e380f0fe455ea10f7b2264657363223a225a413d3d227d0b7b2264657363223a22227d0247304402202be11cf6a01a57e9ca17b44d3d2e0ded463b3c76c0d157c7bc56dfc87598bbbd022030796df10eeb157fda975de3e0e0f67e41f9b5987d421f39e9ea3e6d400cfc7d0121031a2f7a0436a711231182938f65403eaf7b90bc8e76ee493ac8464bdc213b0b740c010000";
      await truffleAssert.reverts(syscoinRelay.parseAssetTx(txBytes));
    });
    it("parseAssetTx()", async () => {
      const txBytes = "0x820000000136fd2a770f7dac897d7590b7e15eda138e8a2b074162e7748c8fcd1bb1c2a1160000000000feffffff032fe0f505000000001600143f72dfba9d932b28e4915f8742bd4ca1be5b01f200301a1e0100000016001451a5c21a1f589c9c4c143754ab9d2f02be6978d400e1f505000000003b6a390186c3400100000008c30855316c5457413d3d6414a738a563f9ecb55e0b2245d1e9e380f0fe455ea1000b7b2264657363223a22227d007f7f00000000";
      let result = await syscoinRelay.parseAssetTx(txBytes);
      assert.equal(result.errorCode, '0', "errorCode should be 0");
      assert.equal(result.assetGuid, '123456', "Asset Guid should be 123456");
      assert.equal(result.erc20Address, '0xA738a563F9ecb55e0b2245D1e9E380f0fE455ea1', "Asset ERC20 Contract should be 0xA738a563F9ecb55e0b2245D1e9E380f0fE455ea1");
    });
    it("parseBurnTx()", async () => {
      const txBytes = "0x86000000000101e04131c39b082d7837b67b78c1a7e8836552c5eb484c57bcd38092eba64495420100000000fdffffff020000000000000000216a1f0186c34002001301770014bf76b51ddfbe584b92d039c95f6444fabc8956a6febcadf4010000001600146d810fc818716daec63c0a4ee0c2dc2efe73677c02483045022100f11cb8515593b85afbad0c879c395d78034ac64235a4e49df969c6410e56c1d1022058821088d43ee24b82f9257bbe2a67b29222bae741145de2c0cea92d195b27da0121020fbc960c4f095ff3cdb43947dd8238447459365a06eb9a688348d63127cb50d500000000";
      let result = await syscoinRelay.parseBurnTx(txBytes);
      assert.equal(result.errorCode, '0', "errorCode should be 0");
      assert.equal(result.assetGuid, '123456', "Asset Guid should be 123456");
      assert.equal(result.output_value, '200000000', "output_value should be 200000000");
      assert.equal(result.destinationAddress, '0xbf76B51dDfBe584b92d039c95F6444FABC8956A6', "destinationAddress should be 0xbf76B51dDfBe584b92d039c95F6444FABC8956A6");
    });
    it("scanAssetTx", async () => {
      const expectedJson = '{"0":"1e240","1":"0xA738a563F9ecb55e0b2245D1e9E380f0fE455ea1","2":"8"}';
      const txBytes = "0x820000000136fd2a770f7dac897d7590b7e15eda138e8a2b074162e7748c8fcd1bb1c2a1160000000000feffffff032fe0f505000000001600143f72dfba9d932b28e4915f8742bd4ca1be5b01f200301a1e0100000016001451a5c21a1f589c9c4c143754ab9d2f02be6978d400e1f505000000003b6a390186c3400100000008c30855316c5457413d3d6414a738a563f9ecb55e0b2245d1e9e380f0fe455ea1000b7b2264657363223a22227d007f7f00000000";
      const resultPos = await syscoinRelay.getOpReturnPos(txBytes, 4);
      var pos = parseInt(resultPos[1]);
      
      const result = await syscoinRelay.scanAssetTx(txBytes, pos);
      assert.equal(JSON.stringify(result), expectedJson, "converted asset tx bytes are not the expected ones");
    });
    it("scanBurnTx", async () => {
      const expectedJson = '{"0":"bebc200","1":"0xbf76B51dDfBe584b92d039c95F6444FABC8956A6","2":"1e240"}';
      const txBytes = "0x86000000000101e04131c39b082d7837b67b78c1a7e8836552c5eb484c57bcd38092eba64495420100000000fdffffff020000000000000000216a1f0186c34002001301770014bf76b51ddfbe584b92d039c95f6444fabc8956a6febcadf4010000001600146d810fc818716daec63c0a4ee0c2dc2efe73677c02483045022100f11cb8515593b85afbad0c879c395d78034ac64235a4e49df969c6410e56c1d1022058821088d43ee24b82f9257bbe2a67b29222bae741145de2c0cea92d195b27da0121020fbc960c4f095ff3cdb43947dd8238447459365a06eb9a688348d63127cb50d500000000";
      const resultPos = await syscoinRelay.getOpReturnPos(txBytes, 4);
      var opIndex = parseInt(resultPos[0]);
      var pos = parseInt(resultPos[1]);
      
      const result = await syscoinRelay.scanBurnTx(txBytes, opIndex, pos);
      assert.equal(JSON.stringify(result), expectedJson, "converted burn tx bytes are not the expected ones");
    });
  });
});
