const SyscoinSuperblocksArtifact = artifacts.require('SyscoinSuperblocks');

contract('SyscoinMessageLibrary', (accounts) => {

  let SyscoinSuperblocks;
  before(async () => {
    SyscoinSuperblocks = await SyscoinSuperblocksArtifact.new();
  });
  it("flip32Bytes large number", async () => {
    const flipped = await SyscoinSuperblocks.flip32Bytes.call("0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20");
    assert.equal(flipped.toString(16), "201f1e1d1c1b1a191817161514131211100f0e0d0c0b0a090807060504030201", "flip32Bytes not the expected one");
  });
  it("flip32Bytes short number", async () => {
    const flipped = await SyscoinSuperblocks.flip32Bytes.call("0x0000000000000000000000000000000000000000000000000000000000001234");
    assert.equal(flipped.toString(16), "3412000000000000000000000000000000000000000000000000000000000000", "flip32Bytes is not the expected one");
  });
});