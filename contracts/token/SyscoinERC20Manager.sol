pragma solidity ^0.5.13;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../interfaces/SyscoinERC20I.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

contract SyscoinERC20Manager is Initializable {

    using SafeMath for uint;
    using SafeMath for uint8;

    // Lock constants
    uint private constant MIN_LOCK_VALUE = 10; // 0.1 token
    uint private constant SUPERBLOCK_SUBMITTER_LOCK_FEE = 10000; // 10000 = 0.01%
    uint private constant MIN_CANCEL_DEPOSIT = 3000000000000000000; // 3 eth
    uint private constant CANCEL_TRANSFER_TIMEOUT = 3600; // 1 hour in seconds
    uint private constant CANCEL_MINT_TIMEOUT = 907200; // 1.5 weeks in seconds
    // Variables set by constructor

    // Contract to trust for tx included in a syscoin block verification.
    // Only syscoin txs relayed from trustedRelayerContract will be accepted.
    address public trustedRelayerContract;


    mapping(uint32 => uint256) public assetBalances;
    // Syscoin transactions that were already processed by processTransaction()
    mapping(uint => bool) private syscoinTxHashesAlreadyProcessed;

    uint32 bridgeTransferIdCount;
    
    enum BridgeTransferStatus { Uninitialized, Ok, CancelRequested, CancelChallenged, CancelOk }
    
    struct BridgeTransfer {
        uint timestamp;
        uint value;
        address erc20ContractAddress;
        address tokenFreezerAddress;
        uint32 assetGUID;
        BridgeTransferStatus status;           
    }

    mapping(uint32 => BridgeTransfer) private bridgeTransfers;
    mapping(uint32 => uint) private deposits;

    // network that the stored blocks belong to
    enum Network { MAINNET, TESTNET, REGTEST }
    Network private net;

    event TokenUnfreeze(address receipient, uint value);
    event TokenUnfreezeFee(address receipient, uint value);
    event TokenFreeze(address freezer, uint value, uint32 bridgetransferid);
    event CancelTransferRequest(address canceller, uint32 bridgetransferid);
    event CancelTransferSucceeded(address canceller, uint32 bridgetransferid);
    event CancelTransferFailed(address canceller, uint32 bridgetransferid);

    struct AssetRegistryItem {
        address erc20ContractAddress;
        uint32 height;     
    }
    mapping(uint32 => AssetRegistryItem) public assetRegistry;
    event TokenRegistry(uint32 assetGuid, address erc20ContractAddress);
    function contains(uint value) private view returns (bool) {
        return syscoinTxHashesAlreadyProcessed[value];
    }

    function insert(uint value) private returns (bool) {
        if (contains(value))
            return false; // already there
        syscoinTxHashesAlreadyProcessed[value] = true;
        return true;
    }
    
    function init(Network _network, address _trustedRelayerContract) public initializer {
        net = _network;
        trustedRelayerContract = _trustedRelayerContract;
        bridgeTransferIdCount = 0;
    }

    modifier onlyTrustedRelayer() {
        require(msg.sender == trustedRelayerContract, "Call must be from trusted relayer");
        _;
    }

    modifier minimumValue(address erc20ContractAddress, uint value) {
        uint256 decimals = SyscoinERC20I(erc20ContractAddress).decimals();
        require(
            value >= (uint256(10) ** decimals).div(MIN_LOCK_VALUE),
            "Value must be bigger or equal MIN_LOCK_VALUE"
        );
        _;
    }

    function requireMinimumValue(uint8 decimalsIn, uint value) private pure {
        uint256 decimals = uint256(decimalsIn);
        require(value > 0, "Value must be positive");
        require(
            value >= (uint256(10) ** decimals).div(MIN_LOCK_VALUE),
            "Value must be bigger or equal MIN_LOCK_VALUE"
        );
        
    }

    function wasSyscoinTxProcessed(uint txHash) public view returns (bool) {
        return contains(txHash);
    }

    function processTransaction(
        uint txHash,
        uint value,
        address destinationAddress,
        address superblockSubmitterAddress,
        address erc20ContractAddress,
        uint32 assetGUID,
        uint8 precision
    ) public onlyTrustedRelayer {
        SyscoinERC20I erc20 = SyscoinERC20I(erc20ContractAddress);
        uint8 nLocalPrecision = erc20.decimals();
        // see issue #372 on syscoin
        if(nLocalPrecision > precision){
            value *= uint(10)**(uint(nLocalPrecision - precision));
        }else if(nLocalPrecision < precision){
            value /= uint(10)**(uint(precision - nLocalPrecision));
        }
        requireMinimumValue(nLocalPrecision, value);
        // Add tx to the syscoinTxHashesAlreadyProcessed and Check tx was not already processed
        require(insert(txHash), "TX already processed");


        assetBalances[assetGUID] = assetBalances[assetGUID].sub(value);

        uint superblockSubmitterFee = value.div(SUPERBLOCK_SUBMITTER_LOCK_FEE);
        uint userValue = value.sub(superblockSubmitterFee);

        // pay the fee
        erc20.transfer(superblockSubmitterAddress, superblockSubmitterFee);
        emit TokenUnfreezeFee(superblockSubmitterAddress, superblockSubmitterFee);

        // get your token
        erc20.transfer(destinationAddress, userValue);
        emit TokenUnfreeze(destinationAddress, userValue);
    }

    function processAsset(
        uint _txHash,
        uint32 _assetGUID,
        uint32 _height,
        address _erc20ContractAddress
    ) public onlyTrustedRelayer {
        // ensure height increases over asset updates
        require(assetRegistry[_assetGUID].height < _height, "Height must increase when updating asset registry");
        // Add tx to the syscoinTxHashesAlreadyProcessed and Check tx was not already processed
        require(insert(_txHash), "TX already processed");
        assetRegistry[_assetGUID] = AssetRegistryItem({erc20ContractAddress:_erc20ContractAddress, height:_height});
        emit TokenRegistry(_assetGUID, _erc20ContractAddress);
    }
    
    function cancelTransferRequest(uint32 bridgeTransferId) public payable {
        // lookup state by bridgeTransferId
        BridgeTransfer storage bridgeTransfer = bridgeTransfers[bridgeTransferId];
        // ensure state is Ok
        require(bridgeTransfer.status == BridgeTransferStatus.Ok,
            "#SyscoinERC20Manager cancelTransferRequest(): Status of bridge transfer must be Ok");
        // ensure msg.sender is same as tokenFreezerAddress
        // we don't have to do this but we do it anyway so someone can't accidentily cancel a transfer they did not make
        require(msg.sender == bridgeTransfer.tokenFreezerAddress, "#SyscoinERC20Manager cancelTransferRequest(): Only msg.sender is allowed to cancel");
        // if freezeBurnERC20 was called less than 1.5 weeks ago then return error
        // 0.5 week buffer since only 1 week of blocks are allowed to pass before cannot mint on sys
        require((block.timestamp - bridgeTransfer.timestamp) > (net == Network.MAINNET? CANCEL_MINT_TIMEOUT: 36000), "#SyscoinERC20Manager cancelTransferRequest(): Transfer must be at least 1.5 week old");
        // ensure min deposit paid
        require(msg.value >= MIN_CANCEL_DEPOSIT,
            "#SyscoinERC20Manager cancelTransferRequest(): Cancel deposit incorrect");
        deposits[bridgeTransferId] = msg.value;
        // set height for cancel time begin to enforce a delay to wait for challengers
        bridgeTransfer.timestamp = block.timestamp;
        // set state of bridge transfer to CancelRequested
        bridgeTransfer.status = BridgeTransferStatus.CancelRequested;
        emit CancelTransferRequest(msg.sender, bridgeTransferId);
    }

    function cancelTransferSuccess(uint32 bridgeTransferId) public {
        // lookup state by bridgeTransferId
        BridgeTransfer storage bridgeTransfer = bridgeTransfers[bridgeTransferId];
        // ensure state is CancelRequested to avoid people trying to claim multiple times 
        // and that it has to be on an active cancel request
        require(bridgeTransfer.status == BridgeTransferStatus.CancelRequested,
            "#SyscoinERC20Manager cancelTransferSuccess(): Status must be CancelRequested");
        // check if timeout period passed (atleast 1 hour of blocks have to have passed)
        require((block.timestamp - bridgeTransfer.timestamp) > CANCEL_TRANSFER_TIMEOUT, "#SyscoinERC20Manager cancelTransferSuccess(): 1 hour timeout is required");
        // set state of bridge transfer to CancelOk
        bridgeTransfer.status = BridgeTransferStatus.CancelOk;
        // refund erc20 to the tokenFreezerAddress
        SyscoinERC20I erc20 = SyscoinERC20I(bridgeTransfer.erc20ContractAddress);
        assetBalances[bridgeTransfer.assetGUID] = assetBalances[bridgeTransfer.assetGUID].sub(bridgeTransfer.value);
        erc20.transfer(bridgeTransfer.tokenFreezerAddress, bridgeTransfer.value);
        // pay back deposit
        address payable tokenFreezeAddressPayable = address(uint160(bridgeTransfer.tokenFreezerAddress));
        uint d = deposits[bridgeTransferId];
        delete deposits[bridgeTransferId];
        // stop using .transfer() because of gas issue after ethereum upgrade
        tokenFreezeAddressPayable.call.value(d)("");
        emit CancelTransferSucceeded(bridgeTransfer.tokenFreezerAddress, bridgeTransferId);
    }

    function processCancelTransferFail(uint32 bridgeTransferId, address payable challengerAddress)
        public
        onlyTrustedRelayer
    {
        // lookup state by bridgeTransferId
        BridgeTransfer storage bridgeTransfer = bridgeTransfers[bridgeTransferId];
        // ensure state is CancelRequested
        require(bridgeTransfer.status == BridgeTransferStatus.CancelRequested,
            "#SyscoinERC20Manager cancelTransferSuccess(): Status must be CancelRequested to Fail the transfer");
        // set state of bridge transfer to CancelChallenged
        bridgeTransfer.status = BridgeTransferStatus.CancelChallenged;
        // pay deposit to challenger
        uint d = deposits[bridgeTransferId];
        delete deposits[bridgeTransferId];
        // stop using .transfer() because of gas issue after ethereum upgrade
        challengerAddress.call.value(d)("");
        emit CancelTransferFailed(bridgeTransfer.tokenFreezerAddress, bridgeTransferId);
    }

    // keyhash or scripthash for syscoinWitnessProgram
    function freezeBurnERC20(
        uint value,
        uint32 assetGUID,
        address erc20ContractAddress,
        uint8 precision,
        bytes memory syscoinAddress
    )
        public
        minimumValue(erc20ContractAddress, value)
        returns (bool)
    {
        require(syscoinAddress.length > 0, "syscoinAddress cannot be zero");
        require(assetGUID > 0, "Asset GUID must not be 0");
        if (net != Network.REGTEST) {
            require(assetRegistry[assetGUID].erc20ContractAddress == erc20ContractAddress, "Asset registry contract does not match what was provided to this call");
        }

        SyscoinERC20I erc20 = SyscoinERC20I(erc20ContractAddress);
        require(precision == erc20.decimals(), "Decimals were not provided with the correct value");
        erc20.transferFrom(msg.sender, address(this), value);
        assetBalances[assetGUID] = assetBalances[assetGUID].add(value);

        // store some state needed for potential bridge transfer cancellation
        // create bridgeTransferId mapping structure with status + height + value + erc20ContractAddress + assetGUID + tokenFreezerAddress
        bridgeTransferIdCount++;
        bridgeTransfers[bridgeTransferIdCount] = BridgeTransfer({
            status: BridgeTransferStatus.Ok,
            value: value,
            erc20ContractAddress: erc20ContractAddress,
            assetGUID: assetGUID,
            timestamp: block.timestamp,
            tokenFreezerAddress: msg.sender
        });
        emit TokenFreeze(msg.sender, value, bridgeTransferIdCount);
        return true;
    }

    // @dev - Returns the bridge transfer data for the supplied bridge transfer ID
    //
    function getBridgeTransfer(uint32 bridgeTransferId) external view returns (
        uint _timestamp,
        uint _value,
        address _erc20ContractAddress,
        address _tokenFreezerAddress,
        uint32 _assetGUID,
        BridgeTransferStatus _status
    ) {
        BridgeTransfer storage bridgeTransfer = bridgeTransfers[bridgeTransferId];
        return (
            bridgeTransfer.timestamp,
            bridgeTransfer.value,
            bridgeTransfer.erc20ContractAddress,
            bridgeTransfer.tokenFreezerAddress,
            bridgeTransfer.assetGUID,
            bridgeTransfer.status
        );
    }
}
