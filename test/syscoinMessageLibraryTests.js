const SyscoinMessageLibraryForTests = artifacts.require('SyscoinMessageLibraryForTests');

contract('SyscoinMessageLibrary', (accounts) => {

  let syscoinMessageLibraryForTests;
  before(async () => {
    syscoinMessageLibraryForTests = await SyscoinMessageLibraryForTests.new();
  });
  it("flip32Bytes large number", async () => {
    const flipped = await syscoinMessageLibraryForTests.flip32BytesPublic.call("0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20");
    assert.equal(flipped.toString(16), "201f1e1d1c1b1a191817161514131211100f0e0d0c0b0a090807060504030201", "flip32Bytes not the expected one");
  });
  it("flip32Bytes short number", async () => {
    const flipped = await syscoinMessageLibraryForTests.flip32BytesPublic.call("0x0000000000000000000000000000000000000000000000000000000000001234");
    assert.equal(flipped.toString(16), "3412000000000000000000000000000000000000000000000000000000000000", "flip32Bytes is not the expected one");
  });
  it("target from bits 1", async () => {
    const target = await syscoinMessageLibraryForTests.targetFromBitsPublic.call("0x19015f53");
    assert.equal(target.toString(), "8614444778121073626993210829679478604092861119379437256704", "target is not the expected one");
  });
  it("target from bits 2", async () => {
    const target = await syscoinMessageLibraryForTests.targetFromBitsPublic.call("453281356");
    assert.equal(target.toString(16), "4864c000000000000000000000000000000000000000000000000", "target is not the expected one");
  });
  it("target from bits 3", async () => {
    const target = await syscoinMessageLibraryForTests.targetFromBitsPublic.call("0x1d00ffff"); // EASIEST_DIFFICULTY_TARGET
    maxTargetRounded = (Math.pow(2,16) - 1) * Math.pow(2,208);  // http://bitcoin.stackexchange.com/questions/8806/what-is-difficulty-and-how-it-relates-to-target
    assert.equal(target.toString(), maxTargetRounded, "target is not the expected one");
  });
  it("bytesToBytes32", async () => {
    const result = await syscoinMessageLibraryForTests.bytesToBytes32Public.call("0x0102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f00");
    assert.equal(result, "0x0102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f00", "converted bytes are not the expected ones");
  });
  it("bytesToUint32", async () => {
    const result = await syscoinMessageLibraryForTests.bytesToUint32Public.call("0x01020304");
    assert.equal(result.toNumber(), 16909060, "converted bytes are not the expected ones");
  });
  it('Merkle solidity', async () => {

    const oneHash = [
      "0x57a8a9a8de6131bf61f5d385318c10e29a5d826eed6adbdbeedc3a0539908ed4"
    ];
    const twoHashes = [
      "0x2e6e9539f02088efe5abb7082bb6e8ba8df68e1cca543af48f5cc93523bf7209",
      "0x5db4c5556edb6dffe30eb26811327678a54f74b7a3072f2834472ea30ee17360"
    ];
    const threeHashes = [
      "0x6bbe42a26ec5af04eb16da92131ddcd87df55d629d940eaa8f88c0ceb0b9ede6",
      "0xc2213074ba6cf84780030f9dc261fa31999c039811516aaf0fb8fd1e1a9fa0c3",
      "0xde3d260197746a0b509ffa4e05cc8b042f0a0ce472c20d75e17bf58815d395e1"
    ];
    const manyHashes = [
      "0xb2d645742da1443e2439dfe1ee5901aa74680ddd2f11be203595673be5cfc396",
      "0x75520841e64a8acdd669e453d0a55caa7082a35ec6406cf5e73b30cdf34ad0b6",
      "0x6a4a7fdf807e56a39ca842d3e3807e6639af4cf1d05cf6da6154a0b5170f7690",
      "0xde3d260197746a0b509ffa4e05cc8b042f0a0ce472c20d75e17bf58815d395e1",
      "0x6bbe42a26ec5af04eb16da92131ddcd87df55d629d940eaa8f88c0ceb0b9ede6",
      "0x50ab8816b4a1ffa5700ff26bb1fbacce5e3cb93978e57410cfabbe8819a45a4e",
      "0x2e6e9539f02088efe5abb7082bb6e8ba8df68e1cca543af48f5cc93523bf7209",
      "0x57a8a9a8de6131bf61f5d385318c10e29a5d826eed6adbdbeedc3a0539908ed4",
      "0xceace0419d93c9789498de2ed1e75db53143b730f18cff88660297759c719231",
      "0x0ce3bcd684f4f795e549a2ddd1f4c539e8d80813b232a448c56d6b28b74fe3ed",
      "0x5db4c5556edb6dffe30eb26811327678a54f74b7a3072f2834472ea30ee17360",
      "0x03d7be19e9e961691712fde9fd87b706c7d0768a207b84ef6ad1f81ffa90dec5",
      "0x8e5e221b22795d96d3de1cad930d7b131f37b6b9dfcccd3f745b08e6900ef1bd",
      "0xc2213074ba6cf84780030f9dc261fa31999c039811516aaf0fb8fd1e1a9fa0c3",
      "0x38d3dffed604f5a160b327ecde5147eb1aa46e3d154b98644cd2a39f0f9ab915"
    ]

    let hash;
    hash = await syscoinMessageLibraryForTests.makeMerklePublic.call(oneHash);
    assert.equal(hash, "0x57a8a9a8de6131bf61f5d385318c10e29a5d826eed6adbdbeedc3a0539908ed4", 'One hash array');
    hash = await syscoinMessageLibraryForTests.makeMerklePublic.call(twoHashes);
    assert.equal(hash, "0xae1c24c61efe6b378017f6055b891dd62747deb23a7939cffe78002f1cfb79ab", 'Two hashes array');
    hash = await syscoinMessageLibraryForTests.makeMerklePublic.call(threeHashes);
    assert.equal(hash, "0xe1c52ec93d4f4f83783aeede9e6b84b5ded007ec9591b521d6e5e4b6d9512d43", 'Three hashes array');
    hash = await syscoinMessageLibraryForTests.makeMerklePublic.call(manyHashes);
    assert.equal(hash, "0xee712eefe9b4c9ecd39a71d45e975b83c9427070e54953559e78f45d2cbb03b3", 'Many hashes array');
  });
});