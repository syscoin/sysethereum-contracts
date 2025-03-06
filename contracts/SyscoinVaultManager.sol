// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./interfaces/SyscoinTransactionProcessorI.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SyscoinVaultManager
 *
 * Lower 32 bits of assetGuid => assetId
 * Upper 32 bits of assetGuid => tokenId (if any, otherwise 0 for fungible)
 *
 * Example:
 *   assetGuid = 0x00000001_0000ABCD
 *   - tokenId    = 0x00000001 (1 in decimal)
 *   - assetId = 0x0000ABCD (43981 in decimal)
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
        uint32 tokenIdCount;
        address assetContract;    // e.g., ERC20/721/1155 contract address
        uint8 precision;          // For bridging decimals if needed (e.g., 8 for Syscoin assets)
        mapping(uint32 => uint256) tokenRegistry;  // token index => tokenId
    }

    //-------------------------------------------------------------------------
    // State Variables
    //-------------------------------------------------------------------------

    address public trustedRelayerContract;

    // assetId => Asset info
    mapping(uint32 => AssetRegistryItem) public assetRegistry;

    mapping(address => uint32) public assetRegistryByAddress;

    // Track processed Syscoin TXs (so they're not processed twice)
    mapping(uint => bool) private syscoinTxHashesAlreadyProcessed;

    // Example: The Syscoin asset GUID that references "native" SYS in NEVM (if any)
    uint64 immutable SYSAssetGuid;

    uint32 public globalAssetIdCount;

    bool private immutable testNetwork;

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
        SYSAssetGuid = _sysxGuid;
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
    // Public / External Functions
    //-------------------------------------------------------------------------


    /**
     * @notice Process a syscoin->NEVM transaction (unfreeze).
     *         Called by the trusted relayer to unlock assets on NEVM side.
     */
    function processTransaction(
        uint txHash,
        uint value,
        address destination,
        uint64 assetGuid
    ) external override onlyTrustedRelayer {
        require(_insert(txHash), "TX already processed");
        (uint32 tokenIndex, uint32 assetIndex) = _parseAssetGuid(assetGuid);
        AssetRegistryItem storage item = assetRegistry[assetIndex];

        require(item.assetType != AssetType.INVALID);

        if (item.assetType == AssetType.SYS && !testNetwork) {
            // Native SYS bridging
            require(value > 0, "Value must be positive");
            uint adjustedValue = _adjustValueForDecimals(
                value,
                item.precision
            );
            _withdrawSYS(adjustedValue, payable(destination));
        }
        else if (item.assetType == AssetType.ERC20) {
            require(value > 0, "Value must be positive");
            uint adjustedValue = _adjustValueForDecimals(
                value,
                item.precision
            );
            _withdrawERC20(item.assetContract, adjustedValue, destination);
        }
        else if (item.assetType == AssetType.ERC721) {
            require(value == 1, "ERC721 bridging requires value == 1");
            _withdrawERC721(item.assetContract, tokenIndex, destination);
        }
        else if (item.assetType == AssetType.ERC1155) {
            require(value > 0, "Value must be positive");
            _withdrawERC1155(item.assetContract, tokenIndex, value, destination);
        }

        emit TokenUnfreeze(assetGuid, destination, value);
    }

    /**
     * @notice NEVM -> Syscoin bridging. Locks/burns assets in this contract.
     */
    function freezeBurn(
        uint value,
        address assetAddr,
        uint256 tokenId,
        string memory syscoinAddr
    ) external payable override returns (bool) 
    {
        require(bytes(syscoinAddr).length > 0, "Syscoin address required");
        // If assetAddr == 0, treat as native bridging
        if (assetAddr != address(0)) {
            // If fungible (SYS/ERC20), tokenIdCount=0 => assetGuid = assetIdIndex
            uint64 assetGuid;
            uint precision;
            // 1. Detect asset type
            AssetType assetTypeDetected = _detectAssetType(assetAddr);

            // 2. Find or assign asset and tokenId
            uint cId = assetRegistryByAddress[assetAddr];
            if (cId == 0) {
                // Not registered yet, auto-assign
                // 3. Store in registry
                precision = _defaultPrecision(assetTypeDetected, assetAddr);
                assetRegistry[cId].assetType = assetTypeDetected;
                assetRegistry[cId].assetContract = assetAddr;
                assetRegistry[cId].precision = precision;
                assetRegistry[cId].tokenIdCount = 0;
                if(tokenId > 0) {
                    uint32 newIndex = assetRegistry[cId].tokenIdCount + 1;
                    assetRegistry[cId].tokenRegistry[newIndex] = tokenId;
                    assetRegistry[cId].tokenIdCount = newIndex;
                    assetGuid = (uint64(newIndex) << 32) | uint64(cId);
                } else {
                    assetGuid = uint64(globalAssetIdCount);
                }
                emit TokenRegistry(cId, assetAddr, assetTypeDetected);
                assetRegistryByAddress[assetAddr] = globalAssetIdCount;
                globalAssetIdCount++;
            } else if(tokenId > 0) {
                // registry exists so check token Identifier
                precision = assetRegistry[cId].precision;
                tokenIdCount = assetRegistry[cId].tokenRegistry[tokenId]
                if(tokenIdCount == 0) {
                    uint32 newIndex = assetRegistry[cId].tokenIdCount + 1;
                    assetRegistry[cId].tokenRegistry[newIndex] = tokenId;
                    assetRegistry[cId].tokenIdCount = newIndex;
                    assetGuid = (uint64(newIndex) << 32) | uint64(cId);
                } else {
                    assetGuid = (uint64(tokenIdCount) << 32) | uint64(assetIdRegistry);
                }
            } else {
                assetGuid = uint64(assetIdRegistry);
            }

            // 3. Do the actual deposit
            require(value > 0, "Value must be > 0");
            if (assetTypeDetected == AssetType.ERC20) {
                _depositERC20(assetAddr, value);
            } else if (assetTypeDetected == AssetType.ERC721) {
                require(value == 1, "ERC721 deposit requires value==1");
                _depositERC721(assetAddr, tokenId);
            } else if (assetTypeDetected == AssetType.ERC1155) {
                _depositERC1155(assetAddr, tokenId, value);
            } else {
                revert("Unsupported asset type or invalid token");
            }

            // 4. Emit event so your Syscoin logic knows which asset was deposited
            emit TokenFreeze(
                assetGuid,
                msg.sender,
                value,
                precision
            );
        } else {
            // E.g., bridging native SYS from NEVM to Syscoin
            require(value == msg.value, "Value mismatch");
            emit TokenFreeze(
                SYSAssetGuid,
                msg.sender,
                value,
                8
            );
        }
        return true;
    }

    /**
     * @notice Check if a Syscoin TX has been processed
     */
    function wasSyscoinTxProcessed(uint txHash) public view returns (bool) {
        return syscoinTxHashesAlreadyProcessed[txHash];
    }

    //-------------------------------------------------------------------------
    // Internal Functions
    //-------------------------------------------------------------------------

    /**
     * @dev Attempt to detect whether `assetAddr` is ERC20, ERC721, or ERC1155 using ERC165
     *      plus fallback for older ERC20s that do not implement any interface.
     */
    function _detectAssetType(address assetAddr) internal view returns AssetType {
        // If a contract claims to implement ERC165, check 721 or 1155
        //  - ERC721 interfaceId = 0x80ac58cd
        //  - ERC1155 interfaceId = 0xd9b67a26
        // Note: Some assets might incorrectly claim these or fail to claim them.
        bool supportsERC165 = ERC165Checker.supportsERC165(assetAddr);

        if (supportsERC165) {
            bool isERC721 = ERC165Checker.supportsInterface(assetAddr, 0x80ac58cd);
            if (isERC721) {
                return AssetType.ERC721;
            }
            bool isERC1155 = ERC165Checker.supportsInterface(assetAddr, 0xd9b67a26);
            if (isERC1155) {
                return AssetType.ERC1155;
            }
        }

        // If we get here, assume ERC20 (most widely used).
        // If it's truly not ERC20, the deposit might fail later. But that's typical bridging risk.
        return AssetType.ERC20;
    }
    /**
     * @dev Determine a default precision if the asset is an ERC20, 
     *      typically read `decimals()`. If that fails, default to 18.
     */
    function _defaultPrecision(AssetType tType, address assetAddr) internal view returns (uint8) {
        if (tType == AssetType.ERC20) {
            // Attempt decimals() call
            try IERC20Metadata(assetAddr).decimals() returns (uint8 dec) {
                return dec;
            } catch {
                return 18; // default
            }
        }
        // For ERC721/1155, no decimals concept, store 0 or 1 as your bridging default
        return 0;
    }
    /**
     * @dev `_parseAssetGuid` now interprets the upper 32 bits as tokenId,
     *      lower 32 bits as assetId
     */
    function _parseAssetGuid(uint64 guid) internal pure returns (uint32 tokenId, uint32 assetId) {
        tokenId    = uint32(guid >> 32);
        assetId = uint32(guid);
    }

    function _insert(uint txHash) private returns (bool) {
        if (syscoinTxHashesAlreadyProcessed[txHash]) {
            return false;
        }
        syscoinTxHashesAlreadyProcessed[txHash] = true;
        return true;
    }

    //-------------------------------------------------------------------------
    // ERC20
    //-------------------------------------------------------------------------

    function _withdrawERC20(address assetContract, uint amount, address destination) internal {
        IERC20 asset = IERC20(assetContract);
        asset.safeTransfer(destination, amount);
    }

    function _depositERC20(address assetContract, uint amount) internal {
        IERC20 asset = IERC20(assetContract);
        asset.safeTransferFrom(msg.sender, address(this), amount);
    }

    //-------------------------------------------------------------------------
    // ERC721
    //-------------------------------------------------------------------------

    function _withdrawERC721(address assetContract, uint tokenId, address destination) internal {
        IERC721 nft = IERC721(assetContract);
        nft.transferFrom(address(this), destination, tokenId);
    }

    function _depositERC721(address assetContract, uint tokenId) internal {
        IERC721 nft = IERC721(assetContract);
        nft.transferFrom(msg.sender, address(this), tokenId);
    }

    //-------------------------------------------------------------------------
    // ERC1155
    //-------------------------------------------------------------------------

    function _withdrawERC1155(address assetContract, uint tokenId, uint amount, address destination) internal {
        IERC1155 multi = IERC1155(assetContract);
        multi.safeTransferFrom(address(this), destination, tokenId, amount, "");
    }

    function _depositERC1155(address assetContract, uint tokenId, uint amount) internal {
        IERC1155 multi = IERC1155(assetContract);
        multi.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
    }

    //-------------------------------------------------------------------------
    // Native SYS
    //-------------------------------------------------------------------------

    function _withdrawSYS(uint amount, address payable destination) internal {
        (bool success, ) = destination.call{value: amount}("");
        require(success, "Failed to send SYS");
    }

    //-------------------------------------------------------------------------
    // Utilities
    //-------------------------------------------------------------------------
    function getTokenRegistryEntry(uint32 assetId, uint32 index) external view returns (uint256) {
        return assetRegistry[assetId].tokenRegistry[index];
    }

    /**
     * @dev Convert or “scale” a value based on difference between
     *      Syscoin’s registry precision & actual ERC20 decimals.
     */
    function _adjustValueForDecimals(
        uint rawValue,
        uint8 registryPrecision
    ) internal pure returns (uint) {
        uint8 assetDecimals = 8;
        if (registryPrecision > assetDecimals) {
            return rawValue * (10 ** (registryPrecision - assetDecimals));
        } else if (registryPrecision < assetDecimals) {
            return rawValue / (10 ** (assetDecimals - registryPrecision));
        }
        return rawValue;
    }
}
