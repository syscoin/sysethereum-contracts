// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/SyscoinTransactionProcessorI.sol";

/**
 * @title SyscoinVaultManager
 *
 * Lower 32 bits of assetGuid => assetId (local ID for the contract)
 * Upper 32 bits of assetGuid => tokenIndex (for NFTs)
 *
 * Example:
 *   assetGuid = 0x00000001_0000ABCD
 *   - tokenIndex  = 0x00000001 (1 in decimal)
 *   - assetId     = 0x0000ABCD (43981 in decimal)
 */
contract SyscoinVaultManager is SyscoinTransactionProcessorI, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    //-------------------------------------------------------------------------
    // Enums and Structs
    //-------------------------------------------------------------------------

    enum AssetType {
        INVALID,
        SYS,
        ERC20,
        ERC721,
        ERC1155
    }

    struct AssetRegistryItem {
        AssetType assetType;
        address assetContract;       // E.g. ERC20/721/1155 contract address
        uint8 precision;             // For bridging decimals if needed
        uint32 tokenIdCount;         // Number of NFT tokenIDs stored so far
        // tokenIndex => realTokenId (for ERC721/1155)
        mapping(uint32 => uint256) tokenRegistry;
    }

    //-------------------------------------------------------------------------
    // State Variables
    //-------------------------------------------------------------------------

    address public trustedRelayerContract;

    // Maps a local 32-bit assetId to an AssetRegistryItem
    mapping(uint32 => AssetRegistryItem) internal assetRegistry;

    // Lets us quickly see if we've registered a particular contract
    mapping(address => uint32) public assetRegistryByAddress;

    // Incrementing counter for new asset registrations
    uint32 public globalAssetIdCount;

    // Syscoin transactions that were already processed
    mapping(uint => bool) private syscoinTxHashesAlreadyProcessed;

    // If bridging "native SYS" in NEVM
    uint64 public immutable SYSAssetGuid;
    bool public immutable testNetwork;

    //-------------------------------------------------------------------------
    // Events
    //-------------------------------------------------------------------------

    event TokenUnfreeze(uint64 indexed assetGuid, address indexed recipient, uint value);
    event TokenFreeze(uint64 indexed assetGuid, address indexed freezer, uint value, uint precisions);
    event TokenRegistry(uint32 indexed assetId, address assetContract, AssetType assetType);

    //-------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------

    constructor (
        address _trustedRelayerContract,
        uint64 _sysxGuid,
        bool _testNetwork
    ) {
        trustedRelayerContract = _trustedRelayerContract;
        SYSAssetGuid = _sysxGuid; // e.g. your special GUID for native SYS bridging
        testNetwork = _testNetwork;
    }

    //-------------------------------------------------------------------------
    // Modifiers
    //-------------------------------------------------------------------------

    modifier onlyTrustedRelayer() {
        require(msg.sender == trustedRelayerContract, "Call must be from trusted relayer");
        _;
    }

    //-------------------------------------------------------------------------
    // External Bridge Functions
    //-------------------------------------------------------------------------

    /**
     * @notice Called by the trusted relayer to unlock tokens on NEVM side
     *         after verifying a Syscoin->NEVM transaction (unfreeze).
     */
    function processTransaction(
        uint txHash,
        uint value,
        address destination,
        uint64 assetGuid
    )
        external
        override
        onlyTrustedRelayer
        nonReentrant
    {
        require(_insert(txHash), "TX already processed");

        // upper 32 => tokenIndex, lower 32 => assetId
        (uint32 tokenIndex, uint32 assetId) = _parseAssetGuid(assetGuid);
        AssetRegistryItem storage item = assetRegistry[assetId];
        require(item.assetType != AssetType.INVALID, "Unknown assetId");

        // Different bridging logic per asset type
        if (item.assetType == AssetType.SYS && !testNetwork) {
            // bridging out native SYS
            require(value > 0, "Value must be positive");
            uint adjustedValue = _adjustValueForDecimals(value, item.precision);
            _withdrawSYS(adjustedValue, payable(destination));
        }
        else if (item.assetType == AssetType.ERC20) {
            require(value > 0, "Value must be positive");
            uint adjustedValue = _adjustValueForDecimals(value, item.precision);
            _withdrawERC20(item.assetContract, adjustedValue, destination);
        }
        else if (item.assetType == AssetType.ERC721) {
            // bridging out 1 NFT
            require(value == 1, "ERC721 bridging requires value=1");
            // retrieve real tokenId from the local mapping
            uint256 realTokenId = item.tokenRegistry[tokenIndex];
            require(realTokenId != 0, "No matching NFT tokenId");
            _withdrawERC721(item.assetContract, realTokenId, destination);
        }
        else if (item.assetType == AssetType.ERC1155) {
            // bridging out a quantity
            require(value > 0, "Value must be positive");
            uint256 realTokenId = item.tokenRegistry[tokenIndex];
            require(realTokenId != 0, "No matching 1155 tokenId");
            _withdrawERC1155(item.assetContract, realTokenId, value, destination);
        }

        emit TokenUnfreeze(assetGuid, destination, value);
    }

    /**
     * @notice NEVM->Syscoin bridging: lock/burn assets in this contract
     */
    function freezeBurn(
        uint value,
        address assetAddr,
        uint256 tokenId,
        string memory syscoinAddr
    )
        external
        payable
        override
        nonReentrant
        returns (bool)
    {
        require(bytes(syscoinAddr).length > 0, "Syscoin address required");

        // If bridging native SYS (assetAddr=0)
        if (assetAddr == address(0)) {
            require(value == msg.value, "Value mismatch for native bridging");
            // Just emit the freeze event referencing SYSAssetGuid
            emit TokenFreeze(SYSAssetGuid, msg.sender, value, 8);
            return true;
        }

        // Otherwise, handle ERC20/721/1155 deposit
        AssetType atype = _detectAssetType(assetAddr);
        uint32 assetId = assetRegistryByAddress[assetAddr];
        if (assetId == 0) {
            // Not registered => create a new assetId
            globalAssetIdCount++;
            assetId = globalAssetIdCount;
            assetRegistryByAddress[assetAddr] = assetId;

            // init struct fields
            AssetRegistryItem storage newItem = assetRegistry[assetId];
            newItem.assetType = atype;
            newItem.assetContract = assetAddr;
            newItem.precision = _defaultPrecision(atype, assetAddr);
            newItem.tokenIdCount = 0;

            emit TokenRegistry(assetId, assetAddr, atype);
        }

        AssetRegistryItem storage item = assetRegistry[assetId];
        require(item.assetType == atype, "Mismatch asset type");

        // If bridging an ERC20, ensure 'value' won't exceed 2^63-1 after scaling on the UTXO side.
        if (item.assetType == AssetType.ERC20) {
            require(value > 0, "ERC20 deposit => value>0");
            // Check if the scaled result can fit in int64 on UTXO side:
            // scaledValue = value*(10^(precision-8)) or / if <8
            // For a worst-case scenario: if item.precision > 8 => multiply => can overflow
            // We'll do a local check using the same logic as _adjustValueForDecimals:
            uint8 sysDecimals = 8;
            uint scaledValue = value;
            if (item.precision > sysDecimals) {
                scaledValue = scaledValue * (10 ** (item.precision - sysDecimals));
            } else if (item.precision < sysDecimals) {
                scaledValue = scaledValue / (10 ** (sysDecimals - item.precision));
            }
            // Now ensure scaledValue <= 2^63-1 => 9,223,372,036,854,775,807
            // (Aka int64 max)
            require(scaledValue <= 0x7FFFFFFFFFFFFFFF, "Bridging amount too large");
            _depositERC20(item.assetContract, value);
        }
        else if (item.assetType == AssetType.ERC721) {
            require(value == 1, "ERC721 => bridging 1 NFT");
            _depositERC721(item.assetContract, tokenId);
        }
        else if (item.assetType == AssetType.ERC1155) {
            require(value > 0, "ERC1155 => bridging requires value>0");
            _depositERC1155(item.assetContract, tokenId, value);
        }
        else {
            revert("Unsupported asset type");
        }

        // figure out the "tokenIndex" if NFT
        uint32 tokenIndex = 0;
        if (item.assetType == AssetType.ERC721 || item.assetType == AssetType.ERC1155) {
            tokenIndex = _findOrAssignTokenIndex(item, tokenId);
        }

        // build the assetGuid => (tokenIndex << 32) | assetId
        uint64 assetGuid = (uint64(tokenIndex) << 32) | uint64(assetId);

        // For logging, the "precision" can be item.precision or any combined logic
        emit TokenFreeze(assetGuid, msg.sender, value, item.precision);
        return true;
    }

    //-------------------------------------------------------------------------
    // Internal Logic
    //-------------------------------------------------------------------------

    /**
     * @dev Finds if a given `tokenId` is already in the item.tokenRegistry. If not,
     *      increments `item.tokenIdCount` and stores it under a new index.
     */
    function _findOrAssignTokenIndex(AssetRegistryItem storage item, uint256 realTokenId) internal returns (uint32) {
        // If the same realTokenId can appear multiple times, you’d need a reverse lookup
        // For now, assume each deposit is unique:
        item.tokenIdCount++;
        uint32 newIndex = item.tokenIdCount;
        item.tokenRegistry[newIndex] = realTokenId;
        return newIndex;
    }

    function _detectAssetType(address assetAddr) internal view returns (AssetType) {
        bool supportsERC165 = ERC165Checker.supportsERC165(assetAddr);
        if (supportsERC165) {
            // ERC721 = 0x80ac58cd, ERC1155 = 0xd9b67a26
            if (ERC165Checker.supportsInterface(assetAddr, 0x80ac58cd)) {
                return AssetType.ERC721;
            }
            if (ERC165Checker.supportsInterface(assetAddr, 0xd9b67a26)) {
                return AssetType.ERC1155;
            }
        }
        return AssetType.ERC20;
    }

    function _defaultPrecision(AssetType tType, address assetAddr) internal view returns (uint8) {
        if (tType == AssetType.ERC20) {
            try IERC20Metadata(assetAddr).decimals() returns (uint8 dec) {
                return dec;
            } catch {
                return 18;
            }
        }
        return 0;
    }

    function _parseAssetGuid(uint64 guid) internal pure returns (uint32 tokenIndex, uint32 assetId) {
        tokenIndex = uint32(guid >> 32);
        assetId    = uint32(guid);
    }

    function _insert(uint txHash) private returns (bool) {
        if (syscoinTxHashesAlreadyProcessed[txHash]) {
            return false;
        }
        syscoinTxHashesAlreadyProcessed[txHash] = true;
        return true;
    }

    //-------------------------------------------------------------------------
    // Token Transfers
    //-------------------------------------------------------------------------

    function _depositERC20(address assetContract, uint amount) internal {
        IERC20Metadata(assetContract).safeTransferFrom(msg.sender, address(this), amount);
    }

    function _withdrawERC20(address assetContract, uint amount, address destination) internal {
        IERC20Metadata(assetContract).safeTransfer(destination, amount);
    }

    function _depositERC721(address assetContract, uint tokenId) internal {
        IERC721(assetContract).transferFrom(msg.sender, address(this), tokenId);
    }

    function _withdrawERC721(address assetContract, uint tokenId, address destination) internal {
        IERC721(assetContract).transferFrom(address(this), destination, tokenId);
    }

    function _depositERC1155(address assetContract, uint tokenId, uint amount) internal {
        IERC1155(assetContract).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
    }

    function _withdrawERC1155(address assetContract, uint tokenId, uint amount, address destination) internal {
        IERC1155(assetContract).safeTransferFrom(address(this), destination, tokenId, amount, "");
    }

    function _withdrawSYS(uint amount, address payable destination) internal {
        require(address(this).balance >= amount, "Insufficient SYS");
        (bool success, ) = destination.call{value: amount}("");
        require(success, "Failed to send SYS");
    }

    //-------------------------------------------------------------------------
    // Utility: Adjust decimals if bridging from Syscoin’s 8 decimals to local token decimals
    //-------------------------------------------------------------------------

    function _adjustValueForDecimals(uint rawValue, uint8 registryPrecision) internal pure returns (uint) {
        // If bridging from Sys -> NEVM, 'rawValue' has 8 decimals on Sys,
        // so we align it to the token's decimals. Or vice-versa if bridging the other direction,
        // you'd do the same but in reverse. Here, this method is used in processTransaction.
        // The final return must also fit in 64 bits (2^63-1).
        // Let's do the scaling, then ensure it's under 2^63-1:

        uint8 sysDecimals = 8;
        uint scaledValue = rawValue;
        if (registryPrecision > sysDecimals) {
            // multiply => potential overflow
            scaledValue = scaledValue * (10 ** (registryPrecision - sysDecimals));
        } else if (registryPrecision < sysDecimals) {
            // divide
            scaledValue = scaledValue / (10 ** (sysDecimals - registryPrecision));
        }
        // enforce 2^63-1 = 9,223,372,036,854,775,807
        require(scaledValue <= 0x7FFFFFFFFFFFFFFF, "Bridged amount too large");

        return scaledValue;
    }
}
