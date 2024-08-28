const truffleAssert = require('truffle-assertions');
const SyscoinRelay = artifacts.require('SyscoinRelay');

contract('SyscoinRelay', (accounts) => {
  let syscoinRelay;

  describe("Test pure/view computation functions", () => {
    before(async () => {
      syscoinRelay = await SyscoinRelay.at(SyscoinRelay.address);
    });

    it("parseBurnTx()", async () => {
      const txBytes = "0x86000000000101e04131c39b082d7837b67b78c1a7e8836552c5eb484c57bcd38092eba64495420100000000fdffffff020000000000000000216a1f0186c34002001301770014bf76b51ddfbe584b92d039c95f6444fabc8956a6febcadf4010000001600146d810fc818716daec63c0a4ee0c2dc2efe73677c02483045022100f11cb8515593b85afbad0c879c395d78034ac64235a4e49df969c6410e56c1d1022058821088d43ee24b82f9257bbe2a67b29222bae741145de2c0cea92d195b27da0121020fbc960c4f095ff3cdb43947dd8238447459365a06eb9a688348d63127cb50d500000000";
      let result = await syscoinRelay.parseBurnTx(txBytes);
      assert.equal(result.errorCode, '0', "errorCode should be 0");
      assert.equal(result.output_value, '200000000', "output_value should be 200000000");
      assert.equal(result.destinationAddress, '0xbf76B51dDfBe584b92d039c95F6444FABC8956A6', "destinationAddress should be 0xbf76B51dDfBe584b92d039c95F6444FABC8956A6");
    });
    it("parseBurnTx1()", async () => {
      const txBytes = "0x86000000000102506702ad3ead57b7dc7aa997bd9060048a06462950f08a36e1677c44baacd26a0000000000fdffffff506702ad3ead57b7dc7aa997bd9060048a06462950f08a36e1677c44baacd26a0200000000fdffffff0300000000000000002b6a29028799cfc86202000601560086c3400102800c0014bf76b51ddfbe584b92d039c95f6444fabc8956a63e32052a010000001600141b9ac7e9f0b5197939faddd721ea4344539417caa8020000000000001600141b9ac7e9f0b5197939faddd721ea4344539417ca02483045022100c76dcdd5737a137c1c0aacaf5f6d8c359ddeffc1f602932f2a60a9cf27edd0d102203824008de9d458b61a4b9b513a1a9bd8e352d33690765bec76a36561f0adfee50121039a4bfa6fa6bc1d9bdf1ba3d7dba686e1a2d3826f85ac44c477e77a5cfc76d907024830450221008ac3eee9036c67f21f9cf55e1d4468d37164c983a96aacc634670deadc56189a0220349fb3c105696f605a3d96d78d14916d7197b05a3e187b9a4ed65007138e83060121039094f42abf62812c8243b701ab5cbc17cc5d5c4cf03f50efe1db2a6ca762dc1c00000000";
      let result = await syscoinRelay.parseBurnTx(txBytes);
      assert.equal(result.errorCode, '0', "errorCode should be 0");
      assert.equal(result.output_value, '100000', "output_value should be 100000");
      assert.equal(result.destinationAddress, '0xbf76B51dDfBe584b92d039c95F6444FABC8956A6', "destinationAddress should be 0xbf76B51dDfBe584b92d039c95F6444FABC8956A6");
    });
    it("scanBurnTx", async () => {
      const expectedJson = '{"0":"0xbf76B51dDfBe584b92d039c95F6444FABC8956A6"}';
      const txBytes = "0x86000000000101e04131c39b082d7837b67b78c1a7e8836552c5eb484c57bcd38092eba64495420100000000fdffffff020000000000000000216a1f0186c34002001301770014bf76b51ddfbe584b92d039c95f6444fabc8956a6febcadf4010000001600146d810fc818716daec63c0a4ee0c2dc2efe73677c02483045022100f11cb8515593b85afbad0c879c395d78034ac64235a4e49df969c6410e56c1d1022058821088d43ee24b82f9257bbe2a67b29222bae741145de2c0cea92d195b27da0121020fbc960c4f095ff3cdb43947dd8238447459365a06eb9a688348d63127cb50d500000000";
      const resultPos = await syscoinRelay.getOpReturnPos(txBytes, 4);
      var pos = parseInt(resultPos[0]);
      
      const result = await syscoinRelay.scanBurnTx(txBytes, pos);
      assert.equal(JSON.stringify(result), expectedJson, "converted burn tx bytes are not the expected ones");
    });
    it("scanBurnTx1", async () => {
      const expectedJson = '{"0":"0xbf76B51dDfBe584b92d039c95F6444FABC8956A6"}';
      const txBytes = "0x86000000000102506702ad3ead57b7dc7aa997bd9060048a06462950f08a36e1677c44baacd26a0000000000fdffffff506702ad3ead57b7dc7aa997bd9060048a06462950f08a36e1677c44baacd26a0200000000fdffffff0300000000000000002b6a29028799cfc86202000601560086c3400102800c0014bf76b51ddfbe584b92d039c95f6444fabc8956a63e32052a010000001600141b9ac7e9f0b5197939faddd721ea4344539417caa8020000000000001600141b9ac7e9f0b5197939faddd721ea4344539417ca02483045022100c76dcdd5737a137c1c0aacaf5f6d8c359ddeffc1f602932f2a60a9cf27edd0d102203824008de9d458b61a4b9b513a1a9bd8e352d33690765bec76a36561f0adfee50121039a4bfa6fa6bc1d9bdf1ba3d7dba686e1a2d3826f85ac44c477e77a5cfc76d907024830450221008ac3eee9036c67f21f9cf55e1d4468d37164c983a96aacc634670deadc56189a0220349fb3c105696f605a3d96d78d14916d7197b05a3e187b9a4ed65007138e83060121039094f42abf62812c8243b701ab5cbc17cc5d5c4cf03f50efe1db2a6ca762dc1c00000000";
      const resultPos = await syscoinRelay.getOpReturnPos(txBytes, 4);
      var pos = parseInt(resultPos[0]);
      
      const result = await syscoinRelay.scanBurnTx(txBytes, pos);
      assert.equal(JSON.stringify(result), expectedJson, "converted burn tx bytes are not the expected ones");
    });
    it("scanBurnTx2", async () => {
      const expectedJson = '{"0":"0x3779F14B66343CC6191060646bd8edB51e34f3B6"}';
      const txBytes = "0x8600000000010163cdd871d58292ee1699c02caa8aef5872a502337082b3ad106992dd5da59d270000000000feffffff020000000000000000216a1f0181f7a9a57901000a00143779f14b66343cc6191060646bd8edb51e34f3b60809010000000000160014c9e8c2952caa6ea53a0e65a375105c3c80de96d40247304402201bc3edb4b9e62a677116bc298cdc9e12773abfec5ed9cf4d207755513839fefd022023743a923882d2dcecd4fe02a09160811c939077dc7ea7192fa5accd5dc2e4dd012102c22456739386731b3321de1aa3fa656c3d9b04bc625af7f303fb84b9efcf078100000000";
      const resultPos = await syscoinRelay.getOpReturnPos(txBytes, 4);
      var pos = parseInt(resultPos[0]);
      
      const result = await syscoinRelay.scanBurnTx(txBytes, pos);
      assert.equal(JSON.stringify(result), expectedJson, "converted burn tx bytes are not the expected ones");
    });
    
  });
});
