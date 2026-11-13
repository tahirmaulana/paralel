// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ParalelAuctionV3PolicyLib} from "./ParalelAuctionV3PolicyLib.sol";

contract ParalelAuctionV3PolicyRegistry {
    struct AuctionParties {
        address consignor;
        address guarantor;
        address notary;
    }

    address public owner;
    address public auctionContract;
    ParalelAuctionV3PolicyLib.State private policyState;
    mapping(bytes32 => AuctionParties) private auctionParties;
    mapping(bytes32 => uint16) private auctionCurrentRounds;

    error NotOwner();
    error NotAuctionContract();
    error ZeroAddress();
    error InvalidConfiguration();
    error DocumentNotConfigured();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAuctionContract() {
        if (msg.sender != auctionContract) revert NotAuctionContract();
        _;
    }

    constructor(address usdc) {
        if (usdc == address(0) || usdc.code.length == 0) revert InvalidConfiguration();
        (bool success, bytes memory result) = usdc.staticcall(abi.encodeWithSignature("decimals()"));
        if (!success || result.length < 32 || abi.decode(result, (uint256)) != 6) {
            revert InvalidConfiguration();
        }
        owner = msg.sender;
        ParalelAuctionV3PolicyLib.initialize(policyState, usdc);
    }

    function setAuctionContract(address newAuctionContract) external onlyOwner {
        if (
            auctionContract != address(0)
                || newAuctionContract == address(0)
                || newAuctionContract.code.length == 0
        ) {
            revert InvalidConfiguration();
        }
        auctionContract = newAuctionContract;
    }

    function transferOwnership(address newOwner) external onlyAuctionContract {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }

    function defaultCurrency() external view returns (address) {
        return policyState.defaultCurrency;
    }

    function currencyConfigs(
        address currency
    ) external view returns (bool supported, uint8 decimals, uint128 withdrawalFee) {
        ParalelAuctionV3PolicyLib.CurrencyConfig storage config = policyState.currencyConfigs[currency];
        return (config.supported, config.decimals, config.withdrawalFee);
    }

    function feeConfig() external view returns (ParalelAuctionV3PolicyLib.FeeConfig memory) {
        return policyState.feeConfig;
    }

    function auctionTimingConfig()
        external
        view
        returns (ParalelAuctionV3PolicyLib.AuctionTimingConfig memory)
    {
        return policyState.auctionTimingConfig;
    }

    function bidConfig() external view returns (ParalelAuctionV3PolicyLib.BidConfig memory) {
        return policyState.bidConfig;
    }

    function maxRankedCandidates() external view returns (uint8) {
        return policyState.maxRankedCandidates;
    }

    function allowedIncrements(address currency, uint128 increment) external view returns (bool) {
        return policyState.allowedIncrements[currency][increment];
    }

    function getAllowedIncrements(address currency) external view returns (uint128[] memory) {
        return policyState.allowedIncrementLists[currency];
    }

    function getSupportedCurrencies() external view returns (address[] memory) {
        return policyState.supportedCurrencyList;
    }

    function agreementConfig()
        external
        view
        returns (ParalelAuctionV3PolicyLib.AgreementConfig memory)
    {
        return policyState.agreementConfig;
    }

    function getAgreementConfig(
        uint32 version
    ) external view returns (ParalelAuctionV3PolicyLib.AgreementConfig memory) {
        return policyState.agreementConfigs[version];
    }

    function documentConfigs(
        bytes32 documentType
    ) external view returns (uint32 schemaVersion, bool required, bool active, uint8 authorizedRoles) {
        ParalelAuctionV3PolicyLib.DocumentConfig storage config = policyState.documentConfigs[documentType];
        return (config.schemaVersion, config.required, config.active, config.authorizedRoles);
    }

    function getDocumentTypes() external view returns (bytes32[] memory) {
        return policyState.documentTypeList;
    }

    function getDocumentAnchor(
        bytes32 auctionKey,
        uint16 roundNo,
        bytes32 documentType,
        uint32 documentVersion
    ) external view returns (ParalelAuctionV3PolicyLib.DocumentAnchor memory) {
        return policyState.documentAnchors[auctionKey][roundNo][documentType][documentVersion];
    }

    function setFeeConfig(
        ParalelAuctionV3PolicyLib.FeeConfig calldata newConfig
    ) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setFeeConfig(policyState, newConfig);
    }

    function setAuctionTimingConfig(
        ParalelAuctionV3PolicyLib.AuctionTimingConfig calldata newConfig
    ) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setAuctionTimingConfig(policyState, newConfig);
    }

    function setCurrencyConfig(
        address currency,
        bool supported,
        uint8 decimals,
        uint128 withdrawalFee
    ) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setCurrencyConfig(
            policyState,
            currency,
            supported,
            decimals,
            withdrawalFee
        );
    }

    function setDefaultCurrency(address currency) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setDefaultCurrency(policyState, currency);
    }

    function setAllowedIncrement(
        address currency,
        uint128 increment,
        bool allowed
    ) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setAllowedIncrement(policyState, currency, increment, allowed);
    }

    function setBidConfig(
        ParalelAuctionV3PolicyLib.BidConfig calldata newConfig
    ) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setBidConfig(policyState, newConfig);
    }

    function setRankingConfig(uint8 newMaxRankedCandidates) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setRankingConfig(policyState, newMaxRankedCandidates);
    }

    function setAgreementConfig(
        ParalelAuctionV3PolicyLib.AgreementConfig calldata newConfig
    ) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setAgreementConfig(policyState, newConfig);
    }

    function setDocumentConfig(
        bytes32 documentType,
        ParalelAuctionV3PolicyLib.DocumentConfig calldata newConfig
    ) external onlyAuctionContract {
        ParalelAuctionV3PolicyLib.setDocumentConfig(policyState, documentType, newConfig);
    }

    function validateRegistrationRound(
        uint128 startingBid,
        uint128 bidIncrement,
        uint64 openAt,
        uint16 durationHours
    ) external view onlyAuctionContract {
        ParalelAuctionV3PolicyLib.validateRound(
            policyState,
            startingBid,
            bidIncrement,
            openAt,
            durationHours,
            policyState.defaultCurrency,
            policyState.bidConfig.maxIncrementBps,
            policyState.auctionTimingConfig,
            true
        );
    }

    function validateRound(
        uint128 startingBid,
        uint128 bidIncrement,
        uint64 openAt,
        uint16 durationHours,
        address currency,
        uint16 maxIncrementBps,
        ParalelAuctionV3PolicyLib.AuctionTimingConfig calldata timing
    ) external view onlyAuctionContract {
        ParalelAuctionV3PolicyLib.AuctionTimingConfig memory timingCopy = timing;
        ParalelAuctionV3PolicyLib.validateRound(
            policyState,
            startingBid,
            bidIncrement,
            openAt,
            durationHours,
            currency,
            maxIncrementBps,
            timingCopy,
            true
        );
    }

    function snapshotAuction(
        bytes32 auctionKey,
        uint16 roundNo,
        address consignor,
        address guarantor,
        address notary,
        address taxWallet
    ) external onlyAuctionContract returns (ParalelAuctionV3PolicyLib.AuctionConfigSnapshot memory) {
        if (auctionParties[auctionKey].consignor != address(0) || roundNo == 0) {
            revert InvalidConfiguration();
        }
        auctionParties[auctionKey] = AuctionParties(consignor, guarantor, notary);
        auctionCurrentRounds[auctionKey] = roundNo;
        return ParalelAuctionV3PolicyLib.snapshotAuction(policyState, auctionKey, taxWallet);
    }

    function setAuctionRound(bytes32 auctionKey, uint16 roundNo) external onlyAuctionContract {
        if (auctionParties[auctionKey].consignor == address(0) || roundNo == 0) {
            revert InvalidConfiguration();
        }
        auctionCurrentRounds[auctionKey] = roundNo;
    }

    function anchorDocument(
        bytes32 auctionKey,
        uint16 roundNo,
        bytes32 documentType,
        uint32 documentVersion,
        bytes32 documentHash,
        string calldata documentURI,
        address signer,
        address auctionOwner,
        address winner,
        bool isUserAdmin
    ) external onlyAuctionContract {
        if (
            auctionParties[auctionKey].consignor == address(0)
                || roundNo == 0
                || roundNo > auctionCurrentRounds[auctionKey]
        ) revert DocumentNotConfigured();
        AuctionParties storage parties = auctionParties[auctionKey];
        ParalelAuctionV3PolicyLib.anchorDocument(
            policyState,
            auctionKey,
            roundNo,
            documentType,
            documentVersion,
            documentHash,
            documentURI,
            signer,
            auctionOwner,
            parties.consignor,
            parties.guarantor,
            parties.notary,
            winner,
            isUserAdmin
        );
    }

    function requiredDocumentsComplete(
        bytes32 auctionKey,
        uint16 roundNo
    ) external view returns (bool) {
        return ParalelAuctionV3PolicyLib.requiredDocumentsComplete(
            policyState,
            auctionKey,
            roundNo
        );
    }
}
