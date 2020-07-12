const { TestHelper } = require('@openzeppelin/cli');
const { Contracts, ZWeb3 } = require('@openzeppelin/upgrades');
const utils = require('./utils');
/* Initialize OpenZeppelin's Web3 provider. */
ZWeb3.initialize(web3.currentProvider);

/* Retrieve compiled contract artifacts. */
// fix for magically failing tests
Contracts.artifactDefaults = {
  data: undefined,
  from: undefined,
  gasPrice: undefined,
  gas: undefined 
};
const SyscoinERC20ManagerV0 = Contracts.getFromLocal('SyscoinERC20Manager');
const SyscoinERC20ManagerV1 = Contracts.getFromLocal('SyscoinERC20ManagerForTests');

var SyscoinERC20 = artifacts.require("./token/SyscoinERC20.sol");

const { expectRevert } = require('openzeppelin-test-helpers');
const { blockchainTimeoutSeconds } = require('./utils');


contract('SyscoinERC20Manager', function(accounts) {
  const owner = accounts[1];
  const cancelAddress = accounts[2];
  const randomAddress = accounts[3];
  const challangerAddress = accounts[4];
  const proxyAdmin = accounts[9];
  const value =   2000000000;
  const burnVal = 1000000000;
  const belowMinValue = 9900000; // 0.099 token
  const syscoinAddress = "004322ec9eb713f37cf8d701d819c165549d53d14e";
  const assetGUID = 1702063431;
  const trustedRelayerContract = accounts[0];
  let erc20Manager, erc20Asset;


  beforeEach("set up SyscoinERC20Manager, SyscoinERC20", async () => {
    this.project = await TestHelper({from: proxyAdmin});
    erc20Asset = await SyscoinERC20.new("SyscoinToken", "SYSX", 8, {from: owner});
    erc20Manager = await this.project.createProxy(SyscoinERC20ManagerV0, {
      initMethod: 'init',
      initArgs: [utils.SYSCOIN_REGTEST, trustedRelayerContract, assetGUID, erc20Asset.address, 8]
    });
    
    
    await erc20Asset.assign(owner, value);
    await erc20Asset.approve(erc20Manager.options.address, burnVal, {from: owner}); 

  })

  it('should burn SyscoinERC20 Asset', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);
    let tx = await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, syscoinAddress).send({from: owner, gas: 300000});
    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
    assert.equal(1, tx.events.TokenFreeze.returnValues.transferIdAndPrecisions & 0xFFFFFFFF, 'bridgetransferid should be 1');
  });


  it('should burn SyscoinERC20 Asset for multiple transactions', async () => {
    assert.equal(await erc20Manager.methods.trustedRelayerContract().call(), trustedRelayerContract, "trustedRelayerContract is not correct");

    assert.equal(await erc20Asset.balanceOf(owner), value, `ERC20Asset's ${owner} balance is not the expected one`);

    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);

    await erc20Asset.approve(erc20Manager.options.address, burnVal, {from: owner});
    await erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID, syscoinAddress).send({from: owner, gas: 300000});

    assert.equal(await erc20Asset.balanceOf(erc20Manager.options.address), burnVal + burnVal, "erc20Manager balance is not correct");
    assert.equal(await erc20Asset.balanceOf(owner), value - burnVal - burnVal, `erc20Asset's user balance after burn is not the expected one`);
    assert.equal(await erc20Manager.methods.assetBalances(assetGUID).call(), burnVal + burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  it('should fail to freeze & burn token without approval', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(value, assetGUID, syscoinAddress).send({from: owner}),
      "SafeERC20: low-level call failed"
    );
  });

  it('should fail to freeze & burn token below minimum value', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(belowMinValue, assetGUID, syscoinAddress).send({from: owner}),
      "Value must be bigger or equal MIN_LOCK_VALUE"
    );
  });

  it('should fail to freeze & burn token if balance is not enough', async () => {
    await erc20Asset.approve(erc20Manager.options.address, 2*value, {from: owner});
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(2*value, assetGUID, syscoinAddress).send({from: owner}),
      "SafeERC20: low-level call failed"
    );
  });


  it('should fail with zero syscoinAddress', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(burnVal, assetGUID,'').send({from: owner}),
      "syscoinAddress cannot be zero"
      );
  });

  it('should fail with zero assetGUID', async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(burnVal, 0, syscoinAddress).send({from: owner}),
      "Asset GUID must not be 0"
    );
  });

  it('should upgrade to new logic and freeze token with zero syscoinAddress and zero assetGUID',  async () => {
    await expectRevert(
      erc20Manager.methods.freezeBurnERC20(burnVal, 0, '').send({from: owner}),
      "syscoinAddress cannot be zero"
    );

    await this.project.upgradeProxy(erc20Manager.address, SyscoinERC20ManagerV1);
    await erc20Manager.methods.processAsset('0x1', 0, 2, erc20Asset.address, 8).send({gas: 300000, from: trustedRelayerContract});
    assert.equal(await erc20Manager.methods.assetBalances(0).call(), 0, `initial assetBalances for ${assetGUID} GUID is not correct`);

    // this would revert if upgrate did not succeed
    await erc20Manager.methods.freezeBurnERC20(burnVal, 0, '0x').send({from: owner, gas: 300000});

    assert.equal(await erc20Manager.methods.assetBalances(0).call(), burnVal, `assetBalances for ${assetGUID} GUID is not correct`);
  });

  describe("Bridge transfer cancellation", () => {
    let wrongBridgeTransferId = 299;
    let erc20ManagerForCancel, erc20AssetCancel;
    let bridgetransferid;
    const CANCEL_MINT_TIMEOUT = 1814400; // 3 weeks in seconds
    const CANCEL_TRANSFER_TIMEOUT = 3600; // 1 hour in seconds

    beforeEach("Prepare env", async () => {
      erc20AssetCancel = await SyscoinERC20.new("SyscoinToken", "SYSX", 8, {from: owner});
      erc20ManagerForCancel = await this.project.createProxy(SyscoinERC20ManagerV0, {
        initMethod: 'init',
        initArgs: [utils.SYSCOIN_REGTEST, trustedRelayerContract, assetGUID, erc20AssetCancel.address, 8]
      });

      
      await erc20AssetCancel.assign(cancelAddress, value);
      await erc20AssetCancel.approve(erc20ManagerForCancel.options.address, burnVal, {from: cancelAddress});

      let tx = await erc20ManagerForCancel.methods.freezeBurnERC20(burnVal, assetGUID, syscoinAddress).send({from: cancelAddress, gas: 300000});
      bridgetransferid = tx.events.TokenFreeze.returnValues.transferIdAndPrecisions & 0xFFFFFFFF;
    });

    describe("cancelTransferRequest()", () => {
      describe("should fail when", () => {
        it("bridgeTransferId is incorrect", async () => {
          await expectRevert(
            erc20ManagerForCancel.methods.cancelTransferRequest(wrongBridgeTransferId).send({from: cancelAddress}),
            "#SyscoinERC20Manager cancelTransferRequest(): Status of bridge transfer must be Ok"
          );
        });

        it("BridgeTransferStatus is not Ok", async () => {
          let bt = await erc20ManagerForCancel.methods.getBridgeTransfer(wrongBridgeTransferId).call();
          assert.notEqual('1', bt['_status'], "Status must not be Ok (1) for this test case");

          await expectRevert(
            erc20ManagerForCancel.methods.cancelTransferRequest(0).send({from: cancelAddress}),
            "#SyscoinERC20Manager cancelTransferRequest(): Status of bridge transfer must be Ok"
          );
        });

        it("msg.sender is not bridgeTransfer.tokenFreezerAddress", async () => {
          await expectRevert(
            erc20ManagerForCancel.methods.cancelTransferRequest(bridgetransferid).send({from: randomAddress}),
            "#SyscoinERC20Manager cancelTransferRequest(): Only msg.sender is allowed to cancel"
          );
        });

        it("Freeze is not old enough", async () => {
          await expectRevert(
            erc20ManagerForCancel.methods.cancelTransferRequest(bridgetransferid).send({from: cancelAddress}),
            "#SyscoinERC20Manager cancelTransferRequest(): Transfer must be at least 3 week old"
          );
        });

        it("Cancel deposit is not enough", async () => {
          // travel in time 3 weeks forward
          await blockchainTimeoutSeconds(CANCEL_MINT_TIMEOUT+1);
          await expectRevert(
            erc20ManagerForCancel.methods.cancelTransferRequest(bridgetransferid).send({from: cancelAddress}),
            "#SyscoinERC20Manager cancelTransferRequest(): Cancel deposit incorrect"
          );
        });
      })

      it("should process cancel request succesfully", async () => {
        // travel in time 3 weeks forward
        await blockchainTimeoutSeconds(CANCEL_MINT_TIMEOUT+1);
        let tx = await erc20ManagerForCancel.methods.cancelTransferRequest(bridgetransferid).send({from: cancelAddress, value: web3.utils.toWei('3', 'ether')});
        assert.equal(cancelAddress, tx.events.CancelTransferRequest.returnValues.canceller, "msg.sender incorrect");
        assert.equal(1, tx.events.CancelTransferRequest.returnValues.bridgetransferid, "bridgetransferid incorrect");
      });
    })

    describe("cancelTransferSuccess()", () => {
      describe("should fail when", () => {
        it("bridgeTransferId is incorrect", async() => {
          await expectRevert(
            erc20ManagerForCancel.methods.cancelTransferSuccess(wrongBridgeTransferId).send({from: cancelAddress}),
            "#SyscoinERC20Manager cancelTransferSuccess(): Status must be CancelRequested"
          );
        });

        it("BridgeTransferStatus is not CancelRequested", async () => {
          await expectRevert(
            erc20ManagerForCancel.methods.cancelTransferSuccess(bridgetransferid).send({from: cancelAddress}),
            "#SyscoinERC20Manager cancelTransferSuccess(): Status must be CancelRequested"
          );
        });
      })

      it("should process cancel transfer request succesfully", async () => {
        let startingErc20Bal = await erc20AssetCancel.balanceOf(cancelAddress);
        let startingAssetGUIDBal = await erc20ManagerForCancel.methods.assetBalances(assetGUID).call();

        // travel in time 3 weeks forward
        await blockchainTimeoutSeconds(CANCEL_MINT_TIMEOUT+1);
        await erc20ManagerForCancel.methods.cancelTransferRequest(bridgetransferid).send({from: cancelAddress, value: web3.utils.toWei('3', 'ether')});

        let startingEthBal = web3.utils.toBN(await web3.eth.getBalance(cancelAddress));

        // travel in time 1 hour forward
        await blockchainTimeoutSeconds(CANCEL_TRANSFER_TIMEOUT+1);
        let tx = await erc20ManagerForCancel.methods.cancelTransferSuccess(bridgetransferid).send({from: cancelAddress});

        let finalEthBal = web3.utils.toBN(await web3.eth.getBalance(cancelAddress));
        let finalErc20Bal = await erc20AssetCancel.balanceOf(cancelAddress);
        let finalAssetGUIDBal = await erc20ManagerForCancel.methods.assetBalances(assetGUID).call();

        // we are doing 2.99 ETH because some ether got used for TX fees
        assert(startingEthBal.add(web3.utils.toBN(web3.utils.toWei('2.99', 'ether'))).lt(finalEthBal), "Ether balance incorrect");
        assert.equal(startingErc20Bal.toNumber() + burnVal, finalErc20Bal.toNumber(), "ERC20 balance incorrect");
        assert.equal(startingAssetGUIDBal - burnVal, finalAssetGUIDBal, "Asset GUID balance incorrect");

        assert.equal(tx.events.CancelTransferSucceeded.returnValues.canceller, cancelAddress, "canceller incorrect")
        assert.equal(tx.events.CancelTransferSucceeded.returnValues.bridgetransferid, bridgetransferid, "bridgetransferid incorrect")

        let bt = await erc20ManagerForCancel.methods.getBridgeTransfer(bridgetransferid).call();
        assert.equal(bt._status, '4', "Bridge Transfer status incorrect");
      });
    })

    describe("processCancelTransferFail()", () => {
      describe("should fail when", () => {
        it("caller is not onlyTrustedRelayer", async () => {
          await expectRevert(
            erc20ManagerForCancel.methods.processCancelTransferFail(bridgetransferid, challangerAddress).send({from: randomAddress}),
            "Call must be from trusted relayer"
          );
        });

        it("bridgeTransferId is incorrect", async () => {
          await expectRevert(
            erc20ManagerForCancel.methods.processCancelTransferFail(wrongBridgeTransferId, challangerAddress).send({from: trustedRelayerContract}),
            "#SyscoinERC20Manager cancelTransferSuccess(): Status must be CancelRequested to Fail the transfer"
          );
        });

        it("BridgeTransferStatus is not CancelRequested", async () => {
          await expectRevert(
            erc20ManagerForCancel.methods.processCancelTransferFail(bridgetransferid, challangerAddress).send({from: trustedRelayerContract}),
            "#SyscoinERC20Manager cancelTransferSuccess(): Status must be CancelRequested to Fail the transfer"
          );
        });
      })

      it("should processCancelTransferFail succesfully", async () => {
        // travel in time 3 weeks forward
        await blockchainTimeoutSeconds(CANCEL_MINT_TIMEOUT+1);
        await erc20ManagerForCancel.methods.cancelTransferRequest(bridgetransferid).send({from: cancelAddress, value: web3.utils.toWei('3', 'ether')});

        let startingEthBal = web3.utils.toBN(await web3.eth.getBalance(challangerAddress));

        let tx = await erc20ManagerForCancel.methods.processCancelTransferFail(bridgetransferid, challangerAddress).send({from: trustedRelayerContract});

        let finalEthBal = web3.utils.toBN(await web3.eth.getBalance(challangerAddress));
        assert.equal(startingEthBal.add(web3.utils.toBN(web3.utils.toWei('3', 'ether'))).toString(), finalEthBal.toString(), "Ether balance incorrect");

        assert.equal(tx.events.CancelTransferFailed.returnValues.canceller, cancelAddress, "canceller incorrect")
        assert.equal(tx.events.CancelTransferFailed.returnValues.bridgetransferid, bridgetransferid, "bridgetransferid incorrect")

        let bt = await erc20ManagerForCancel.methods.getBridgeTransfer(bridgetransferid).call();
        assert.equal(bt._status, '3', "Bridge Transfer status incorrect");
      });
    })
  })
});
