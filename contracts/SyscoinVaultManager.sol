// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "./interfaces/ISyscoinTransactionProcessor.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SyscoinVaultManager
 *
 * A contract that can handle bridging for:
 *   - Native SYS (on NEVM)
 *   - ERC20 (fungible)
 *   - ERC721 (NFT)
 *   - ERC1155 (multi-token, both fungible & NFT)
 *
 * The bridging rules:
 *   - We store a 64-bit 'assetGuid' where:
 *       lower 32 bits = 'assetId'   (registry ID)
 *       upper 32 bits = 'tokenIdx' (for NFTs or ERC1155)
 *   - For ERC20 bridging, 'tokenIdx' = 0 (fungible).
 *   - For ERC721, bridging 1 token => 'tokenIdx' is new each time or looked up.
 *   - For ERC1155, bridging 'amount' => 'tokenIdx' references specific tokenId in the contract.
 */
contract SyscoinVaultManager is
    ISyscoinTransactionProcessor,
    ReentrancyGuard,
    ERC1155Holder,
    ERC721Holder,
    Ownable
{
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
        address assetContract;
        uint8 precision;
        uint32 tokenIdCount;
        mapping(uint32 => uint256) tokenRegistry; // tokenIdx => realTokenId
        mapping(uint256 => uint32) reverseTokenRegistry; // realTokenId => tokenIdx
    }

    // 9,999,999,999.99999999 => ~1e18 satoshis (10B -1)
    uint256 constant MAX_SYS_SUPPLY_SATS = 9999999999 * 100000000;
    //-------------------------------------------------------------------------
    // State Variables
    //-------------------------------------------------------------------------

    // The address of the contract (SyscoinRelay) that can call processTransaction
    address public trustedRelayerContract;

    // increment for new asset registrations
    uint32 public globalAssetIdCount;

    // track processed txHashes => prevent replays
    mapping(uint => bool) private syscoinTxAlreadyProcessed;

    // map assetId => registry item
    mapping(uint32 => AssetRegistryItem) public assetRegistry;

    // for quick lookup if we have an existing contract => assetId
    mapping(address => uint32) public assetRegistryByAddress;

    // The Syscoin asset GUID that references "native" SYS
    // if bridging native SYS from NEVM -> UTXO, or vice versa
    uint64 public immutable SYSAssetGuid;
    bool public paused;
    //-------------------------------------------------------------------------
    // Events
    //-------------------------------------------------------------------------

    event TokenFreeze(
        uint64 indexed assetGuid,
        address indexed freezer,
        uint satoshiValue,
        string syscoinAddr
    );
    event TokenUnfreeze(
        uint64 indexed assetGuid,
        address indexed recipient,
        uint value
    );
    event TokenRegistry(
        uint32 indexed assetId,
        address assetContract,
        AssetType assetType
    );

    //-------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------

    /**
     * @param _trustedRelayerContract  The SyscoinRelay or similar contract
     * @param _sysxGuid                The Syscoin asset GUID representing "native SYS" (if needed)
     */
    constructor(
        address _trustedRelayerContract,
        uint64 _sysxGuid,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_trustedRelayerContract != address(0), "Invalid Relay");
        trustedRelayerContract = _trustedRelayerContract;
        SYSAssetGuid = _sysxGuid;
    }

    //-------------------------------------------------------------------------
    // Modifiers
    //-------------------------------------------------------------------------

    modifier whenNotPaused() {
        require(!paused, "Bridge is paused");
        _;
    }

    modifier onlyTrustedRelayer() {
        require(
            msg.sender == trustedRelayerContract,
            "Call must be from trusted relayer"
        );
        _;
    }

    //-------------------------------------------------------------------------
    // External: processTransaction (Sys->NEVM)
    //-------------------------------------------------------------------------

    /**
     * @notice Called by trustedRelayerContract after verifying SPV proof
     * @param txHash     unique tx hash from Syscoin
     * @param value      bridging amount/quantity
     * @param destination final NEVM address
     * @param assetGuid  64-bit: upper32 => tokenIdIdx, lower32 => assetId
     */
    function processTransaction(
        uint txHash,
        uint value,
        address destination,
        uint64 assetGuid
    ) external override onlyTrustedRelayer nonReentrant whenNotPaused {
        require(_insert(txHash), "TX already processed");

        if (assetGuid == SYSAssetGuid) {
            // bridging in native SYS
            require(value > 0, "Value must be positive");
            uint mintedAmount = scaleFromSatoshi(value, 18);
            _withdrawSYS(mintedAmount, payable(destination));
        } else {
            (uint32 tokenIdx, uint32 assetId) = _parseAssetGuid(assetGuid);
            AssetRegistryItem storage item = assetRegistry[assetId];
            require(item.assetType != AssetType.INVALID, "Unregistered asset");

            if (item.assetType == AssetType.ERC20) {
                require(value > 0, "Value must be positive");
                require(tokenIdx == 0, "ERC20 bridging requires tokenIdx=0");
                uint mintedAmount = scaleFromSatoshi(value, item.precision);
                _withdrawERC20(item.assetContract, mintedAmount, destination);
            } else if (item.assetType == AssetType.ERC721) {
                // bridging 1 NFT => value=1
                require(value == 1, "ERC721 bridging requires value=1");
                // look up the real tokenId
                uint realTokenId = item.tokenRegistry[tokenIdx];
                require(realTokenId != 0, "Unknown 721 tokenIdx");
                _withdrawERC721(item.assetContract, realTokenId, destination);
            } else if (item.assetType == AssetType.ERC1155) {
                require(value > 0, "Value must be positive");
                uint realTokenId = item.tokenRegistry[tokenIdx];
                require(realTokenId != 0, "Unknown 1155 tokenIdx");
                _withdrawERC1155(
                    item.assetContract,
                    realTokenId,
                    value,
                    destination
                );
            }
        }

        emit TokenUnfreeze(assetGuid, destination, value);
    }

    //-------------------------------------------------------------------------
    // External: freezeBurn (NEVM->Sys)
    //-------------------------------------------------------------------------

    /**
     * @notice Lock/burn tokens in this contract => bridging to Syscoin
     * @param value      bridging amount
     * @param assetAddr  if bridging native SYS => pass 0, else pass ERC20/721/1155
     * @param tokenId    for NFTs
     * @param syscoinAddr the Syscoin destination (like a bech32 or base58)
     */
    function freezeBurn(
        uint value,
        address assetAddr,
        uint256 tokenId,
        string memory syscoinAddr
    ) external payable nonReentrant whenNotPaused returns (bool) {
        require(bytes(syscoinAddr).length > 0, "Syscoin address required");
        uint satoshiValue;
        if (assetAddr == address(0)) {
            // bridging native coin => must match msg.value
            require(value == msg.value, "Value mismatch for native bridging");
            require(tokenId == 0, "SYS => bridging requires tokenId==0");
            satoshiValue = scaleToSatoshi(value, 18); // "native SYS on NEVM" is 18 dec
            // just log the freeze => user must parse
            emit TokenFreeze(
                SYSAssetGuid,
                msg.sender,
                satoshiValue,
                syscoinAddr
            );
            return true;
        }
        AssetType detectedType = _detectAssetType(assetAddr);
        uint32 assetId = assetRegistryByAddress[assetAddr];

        // Asset registration check
        if (assetId == 0) {
            globalAssetIdCount++;
            if (globalAssetIdCount == uint32(SYSAssetGuid)) {
                globalAssetIdCount++;
            }
            assetId = globalAssetIdCount;
            assetRegistryByAddress[assetAddr] = assetId;

            AssetRegistryItem storage newItem = assetRegistry[assetId];
            newItem.assetType = detectedType;
            newItem.assetContract = assetAddr;
            newItem.precision = _defaultPrecision(detectedType, assetAddr);
            emit TokenRegistry(assetId, assetAddr, detectedType);
        }

        AssetRegistryItem storage item = assetRegistry[assetId];
        require(item.assetType == detectedType, "Mismatched asset type");

        // Deposit handling
        if (detectedType == AssetType.ERC20) {
            require(value > 0, "ERC20 requires positive value");
            require(tokenId == 0, "ERC20 tokenId must be zero");
            satoshiValue = scaleToSatoshi(value, item.precision);
            _depositERC20(assetAddr, value);
        } else if (detectedType == AssetType.ERC721) {
            require(value == 1, "ERC721 deposit requires exactly 1");
            require(tokenId != 0, "ERC721 tokenId required");
            satoshiValue = value;
            _depositERC721(assetAddr, tokenId);
        } else if (detectedType == AssetType.ERC1155) {
            require(value > 0, "ERC1155 requires positive value");
            require(tokenId != 0, "ERC1155 tokenId required");
            satoshiValue = value;
            _depositERC1155(assetAddr, tokenId, value);
        } else {
            revert("Invalid asset type");
        }
        // figure out tokenIndex if NFT
        uint32 tokenIndex = 0;
        if (
            item.assetType == AssetType.ERC721 ||
            item.assetType == AssetType.ERC1155
        ) {
            tokenIndex = _findOrAssignTokenIndex(item, tokenId);
        }
        // Calculate assetGuid correctly
        uint64 assetGuid = (uint64(tokenIndex) << 32) | uint64(assetId);
        emit TokenFreeze(assetGuid, msg.sender, satoshiValue, syscoinAddr);

        return true;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    //-------------------------------------------------------------------------
    // Internal Helpers
    //-------------------------------------------------------------------------

    function _insert(uint txHash) private returns (bool) {
        if (syscoinTxAlreadyProcessed[txHash]) {
            return false;
        }
        syscoinTxAlreadyProcessed[txHash] = true;
        return true;
    }

    function _parseAssetGuid(
        uint64 guid
    ) internal pure returns (uint32 tokenIdx, uint32 assetId) {
        tokenIdx = uint32(guid >> 32);
        assetId = uint32(guid);
    }

    function _detectAssetType(
        address contractAddr
    ) internal view returns (AssetType) {
        bool supports165 = ERC165Checker.supportsERC165(contractAddr);
        if (supports165) {
            // 0x80ac58cd => ERC721
            // 0xd9b67a26 => ERC1155
            if (ERC165Checker.supportsInterface(contractAddr, 0x80ac58cd)) {
                return AssetType.ERC721;
            }
            if (ERC165Checker.supportsInterface(contractAddr, 0xd9b67a26)) {
                return AssetType.ERC1155;
            }
        }
        return AssetType.ERC20;
    }

    function _defaultPrecision(
        AssetType t,
        address contractAddr
    ) internal view returns (uint8) {
        if (t == AssetType.ERC20) {
            try IERC20Metadata(contractAddr).decimals() returns (uint8 dec) {
                return dec;
            } catch {
                return 18;
            }
        }
        // For NFTs, no decimals. We store 0
        return 0;
    }

    function _findOrAssignTokenIndex(
        AssetRegistryItem storage item,
        uint256 realTokenId
    ) internal returns (uint32) {
        uint32 tokenIdx = item.reverseTokenRegistry[realTokenId];

        if (tokenIdx == 0) {
            // Token hasn't been registered yet; assign a new index
            item.tokenIdCount++;
            tokenIdx = item.tokenIdCount;

            item.tokenRegistry[tokenIdx] = realTokenId;
            item.reverseTokenRegistry[realTokenId] = tokenIdx;
        }
        // else, tokenIdx already exists; reuse it

        return tokenIdx;
    }

    /**
     * @dev scaleToSatoshi: Convert `rawValue` from `tokenDecimals` to 8 decimals.
     *      Then require <= MAX_SYS_SUPPLY_SATS.
     *
     * Example:
     *   tokenDecimals=18, rawValue=1000000000000000000 (1 token)
     *   => scaleDown => 1 * 10^(8-18) => 1/10^10 => truncated => 0 if < 10^10
     *   => if fromDecimals < 8 => scale up => leftover fraction => none, integer multiply
     */
    function scaleToSatoshi(
        uint rawValue,
        uint8 tokenDecimals
    ) internal pure returns (uint) {
        uint scaled;
        if (tokenDecimals > 8) {
            // scale down => integer division truncates fraction
            scaled = rawValue / (10 ** (tokenDecimals - 8));
        } else if (tokenDecimals < 8) {
            // scale up
            scaled = rawValue * (10 ** (8 - tokenDecimals));
        } else {
            scaled = rawValue;
        }
        require(scaled <= MAX_SYS_SUPPLY_SATS, "Overflow bridging to Sys");
        return scaled;
    }

    /**
     * @dev scaleFromSatoshi: Convert `satValue` in 8 decimals to `tokenDecimals`.
     *      Typically no overflow check is needed, because we assume Sys side
     *      never exceeds ~1e18. If you want to be extra safe, do an additional check.
     *
     * Example:
     *   tokenDecimals=18, satValue=123 (1.23e2 => 1.23 sat) => scaleUp => 123 * 10^(18-8) => 123 * 10^10.
     */
    function scaleFromSatoshi(
        uint satValue,
        uint8 tokenDecimals
    ) internal pure returns (uint) {
        if (tokenDecimals > 8) {
            // scale up
            return satValue * (10 ** (tokenDecimals - 8));
        } else if (tokenDecimals < 8) {
            // scale down => integer div
            return satValue / (10 ** (8 - tokenDecimals));
        } else {
            return satValue;
        }
    }

    //-------------------------------------------------------------------------
    // Token Transfers
    //-------------------------------------------------------------------------

    // deposit erc20 => use safeTransferFrom
    function _depositERC20(address assetContract, uint amount) internal {
        IERC20Metadata(assetContract).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
    }

    function _withdrawERC20(
        address assetContract,
        uint amount,
        address to
    ) internal {
        IERC20Metadata(assetContract).safeTransfer(to, amount);
    }

    function _depositERC721(address assetContract, uint tokenId) internal {
        IERC721(assetContract).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId
        );
    }

    function _withdrawERC721(
        address assetContract,
        uint tokenId,
        address to
    ) internal {
        IERC721(assetContract).transferFrom(address(this), to, tokenId);
    }

    function _depositERC1155(
        address assetContract,
        uint tokenId,
        uint amount
    ) internal {
        IERC1155(assetContract).safeTransferFrom(
            msg.sender,
            address(this),
            tokenId,
            amount,
            ""
        );
    }

    function _withdrawERC1155(
        address assetContract,
        uint tokenId,
        uint amount,
        address to
    ) internal {
        IERC1155(assetContract).safeTransferFrom(
            address(this),
            to,
            tokenId,
            amount,
            ""
        );
    }

    function _withdrawSYS(uint amount, address payable to) internal {
        require(address(this).balance >= amount, "Not enough SYS");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Sys transfer failed");
    }

    function getRealTokenIdFromTokenIdx(
        uint32 assetId,
        uint32 tokenIdx
    ) external view returns (uint256) {
        AssetRegistryItem storage item = assetRegistry[assetId];
        return item.tokenRegistry[tokenIdx];
    }

    function getTokenIdxFromRealTokenId(
        uint32 assetId,
        uint256 realTokenId
    ) external view returns (uint32) {
        AssetRegistryItem storage item = assetRegistry[assetId];
        return item.reverseTokenRegistry[realTokenId];
    }
}
