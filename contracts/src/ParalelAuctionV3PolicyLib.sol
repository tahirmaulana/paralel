// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library ParalelAuctionV3PolicyLib {
    uint16 private constant BPS_DENOMINATOR = 10_000;
    uint8 private constant DOCUMENT_ROLE_OWNER = 1;
    uint8 private constant DOCUMENT_ROLE_CONSIGNOR = 2;
    uint8 private constant DOCUMENT_ROLE_GUARANTOR = 4;
    uint8 private constant DOCUMENT_ROLE_NOTARY = 8;
    uint8 private constant DOCUMENT_ROLE_WINNER = 16;
    uint8 private constant DOCUMENT_ROLE_USER_ADMIN = 32;

    struct CurrencyConfig {
        bool supported;
        uint8 decimals;
        uint128 withdrawalFee;
    }

    struct FeeConfig {
        uint16 platformBps;
        uint16 guarantorBps;
        uint16 notaryBps;
        uint16 taxBps;
        uint16 defaultFeeBps;
    }

    struct AuctionTimingConfig {
        uint32 signingWindow;
        uint32 collectionWindow;
        uint32 claimWindow;
        uint16 minDurationHours;
        uint16 maxDurationHours;
        uint32 minOpenDelay;
        uint32 maxOpenDelay;
    }

    struct BidConfig {
        uint16 maxIncrementBps;
        bool preBidAllowed;
    }

    struct AuctionConfigSnapshot {
        address currency;
        uint8 currencyDecimals;
        address taxWallet;
        uint16 defaultFeeBps;
        uint128 withdrawalFee;
        uint32 signingWindow;
        uint32 collectionWindow;
        uint32 claimWindow;
        uint16 maxIncrementBps;
        bool preBidAllowed;
        uint8 maxRankedCandidates;
        uint16 minDurationHours;
        uint16 maxDurationHours;
        uint32 minOpenDelay;
        uint32 maxOpenDelay;
        uint32 agreementVersion;
        bytes32 agreementHash;
    }

    struct AgreementConfig {
        uint32 version;
        bytes32 termsHash;
        string termsURI;
        uint64 effectiveFrom;
        bool active;
    }

    struct DocumentConfig {
        uint32 schemaVersion;
        bool required;
        bool active;
        uint8 authorizedRoles;
    }

    struct DocumentAnchor {
        uint32 documentVersion;
        bytes32 documentHash;
        string documentURI;
    }

    struct State {
        address defaultCurrency;
        mapping(address => CurrencyConfig) currencyConfigs;
        address[] supportedCurrencyList;
        FeeConfig feeConfig;
        AuctionTimingConfig auctionTimingConfig;
        BidConfig bidConfig;
        uint8 maxRankedCandidates;
        mapping(address => mapping(uint128 => bool)) allowedIncrements;
        mapping(address => uint128[]) allowedIncrementLists;
        AgreementConfig agreementConfig;
        mapping(uint32 => AgreementConfig) agreementConfigs;
        mapping(bytes32 => DocumentConfig) documentConfigs;
        bytes32[] documentTypeList;
        mapping(bytes32 => bool) knownDocumentType;
        mapping(bytes32 => mapping(uint16 => mapping(bytes32 => mapping(uint32 => DocumentAnchor)))) documentAnchors;
        mapping(bytes32 => bytes32[]) requiredDocumentTypes;
        mapping(bytes32 => mapping(uint16 => mapping(bytes32 => bool))) requiredDocumentAnchored;
        mapping(bytes32 => mapping(bytes32 => DocumentConfig)) auctionDocumentConfigs;
    }

    event FeeConfigUpdated(
        uint16 platformBps,
        uint16 guarantorBps,
        uint16 notaryBps,
        uint16 taxBps,
        uint16 defaultFeeBps
    );
    event CurrencyConfigUpdated(address indexed currency, bool supported, uint8 decimals, uint128 withdrawalFee);
    event DefaultCurrencyUpdated(address indexed previousCurrency, address indexed newCurrency);
    event AuctionTimingConfigUpdated(
        uint32 signingWindow,
        uint32 collectionWindow,
        uint32 claimWindow,
        uint16 minDurationHours,
        uint16 maxDurationHours,
        uint32 minOpenDelay,
        uint32 maxOpenDelay
    );
    event AllowedIncrementUpdated(address indexed currency, uint128 increment, bool allowed);
    event BidConfigUpdated(uint16 maxIncrementBps, bool preBidAllowed);
    event RankingConfigUpdated(uint8 maxRankedCandidates);
    event AgreementConfigUpdated(
        uint32 indexed version,
        bytes32 indexed termsHash,
        string termsURI,
        uint64 effectiveFrom,
        bool active
    );
    event DocumentConfigUpdated(
        bytes32 indexed documentType,
        uint32 schemaVersion,
        bool required,
        bool active,
        uint8 authorizedRoles
    );
    event DocumentAnchored(
        bytes32 indexed auctionKey,
        uint16 indexed roundNo,
        bytes32 indexed documentType,
        uint32 documentVersion,
        bytes32 documentHash,
        string documentURI
    );

    error InvalidConfiguration();
    error InvalidIncrement();
    error UnsupportedCurrency();
    error DocumentNotConfigured();
    error DocumentAlreadyAnchored();
    error UnauthorizedDocumentSigner();
    error InvalidDuration();
    error InvalidOpenTime();
    error IncrementTooLarge();

    function initialize(State storage self, address usdc) external {
        self.defaultCurrency = usdc;
        self.currencyConfigs[usdc] = CurrencyConfig({
            supported: true,
            decimals: 6,
            withdrawalFee: 2_500_000
        });
        self.supportedCurrencyList.push(usdc);
        self.feeConfig = FeeConfig({
            platformBps: 250,
            guarantorBps: 150,
            notaryBps: 100,
            taxBps: 1_000,
            defaultFeeBps: 500
        });
        self.auctionTimingConfig = AuctionTimingConfig({
            signingWindow: 5 minutes,
            collectionWindow: 48 hours,
            claimWindow: 168 hours,
            minDurationHours: 12,
            maxDurationHours: 48,
            minOpenDelay: 48 hours,
            maxOpenDelay: 168 hours
        });
        self.bidConfig = BidConfig({maxIncrementBps: 500, preBidAllowed: true});
        self.maxRankedCandidates = 10;
        _addAllowedIncrement(self, usdc, 50_000);
        _addAllowedIncrement(self, usdc, 500_000);
        _addAllowedIncrement(self, usdc, 5_000_000);
        _addAllowedIncrement(self, usdc, 50_000_000);
        _addAllowedIncrement(self, usdc, 500_000_000);
        _addAllowedIncrement(self, usdc, 5_000_000_000);
    }

    function setFeeConfig(State storage self, FeeConfig calldata newConfig) external {
        uint256 settlementBps = uint256(newConfig.platformBps)
            + newConfig.guarantorBps
            + newConfig.notaryBps
            + newConfig.taxBps;
        uint256 defaultWeights = uint256(newConfig.platformBps)
            + newConfig.guarantorBps
            + newConfig.notaryBps;
        if (
            newConfig.platformBps > BPS_DENOMINATOR
                || newConfig.guarantorBps > BPS_DENOMINATOR
                || newConfig.notaryBps > BPS_DENOMINATOR
                || newConfig.taxBps > BPS_DENOMINATOR
                || newConfig.defaultFeeBps > BPS_DENOMINATOR
                || settlementBps > BPS_DENOMINATOR
                || (newConfig.defaultFeeBps > 0 && defaultWeights == 0)
        ) revert InvalidConfiguration();
        self.feeConfig = newConfig;
        emit FeeConfigUpdated(
            newConfig.platformBps,
            newConfig.guarantorBps,
            newConfig.notaryBps,
            newConfig.taxBps,
            newConfig.defaultFeeBps
        );
    }

    function setAuctionTimingConfig(
        State storage self,
        AuctionTimingConfig calldata newConfig
    ) external {
        if (
            newConfig.signingWindow == 0
                || newConfig.collectionWindow == 0
                || newConfig.claimWindow == 0
                || newConfig.minDurationHours == 0
                || newConfig.minDurationHours > newConfig.maxDurationHours
                || newConfig.minOpenDelay == 0
                || newConfig.minOpenDelay > newConfig.maxOpenDelay
        ) revert InvalidConfiguration();
        self.auctionTimingConfig = newConfig;
        emit AuctionTimingConfigUpdated(
            newConfig.signingWindow,
            newConfig.collectionWindow,
            newConfig.claimWindow,
            newConfig.minDurationHours,
            newConfig.maxDurationHours,
            newConfig.minOpenDelay,
            newConfig.maxOpenDelay
        );
    }

    function setCurrencyConfig(
        State storage self,
        address currency,
        bool supported,
        uint8 decimals,
        uint128 withdrawalFee
    ) external {
        if (currency == address(0) || currency.code.length == 0) revert InvalidConfiguration();
        if (_readTokenDecimals(currency) != decimals) revert InvalidConfiguration();
        CurrencyConfig storage current = self.currencyConfigs[currency];
        if (currency == self.defaultCurrency && !supported) revert InvalidConfiguration();
        if (!current.supported && supported) {
            self.supportedCurrencyList.push(currency);
        } else if (current.supported && !supported) {
            for (uint256 i = 0; i < self.supportedCurrencyList.length; i++) {
                if (self.supportedCurrencyList[i] == currency) {
                    self.supportedCurrencyList[i] =
                        self.supportedCurrencyList[self.supportedCurrencyList.length - 1];
                    self.supportedCurrencyList.pop();
                    break;
                }
            }
        }
        current.supported = supported;
        current.decimals = decimals;
        current.withdrawalFee = withdrawalFee;
        emit CurrencyConfigUpdated(currency, supported, decimals, withdrawalFee);
    }

    function setDefaultCurrency(State storage self, address currency) external {
        if (!self.currencyConfigs[currency].supported) revert UnsupportedCurrency();
        address previousCurrency = self.defaultCurrency;
        self.defaultCurrency = currency;
        emit DefaultCurrencyUpdated(previousCurrency, currency);
        _emitFeeConfigUpdated(self.feeConfig);
    }

    function setAllowedIncrement(
        State storage self,
        address currency,
        uint128 increment,
        bool allowed
    ) external {
        if (increment == 0) revert InvalidIncrement();
        if (!self.currencyConfigs[currency].supported) revert UnsupportedCurrency();
        if (allowed && !self.allowedIncrements[currency][increment]) {
            _addAllowedIncrement(self, currency, increment);
        } else if (!allowed && self.allowedIncrements[currency][increment]) {
            self.allowedIncrements[currency][increment] = false;
            uint128[] storage increments = self.allowedIncrementLists[currency];
            for (uint256 i = 0; i < increments.length; i++) {
                if (increments[i] == increment) {
                    increments[i] = increments[increments.length - 1];
                    increments.pop();
                    break;
                }
            }
        }
        emit AllowedIncrementUpdated(currency, increment, allowed);
    }

    function setBidConfig(State storage self, BidConfig calldata newConfig) external {
        if (newConfig.maxIncrementBps == 0 || newConfig.maxIncrementBps > BPS_DENOMINATOR) {
            revert InvalidConfiguration();
        }
        self.bidConfig = newConfig;
        emit BidConfigUpdated(newConfig.maxIncrementBps, newConfig.preBidAllowed);
    }

    function setRankingConfig(State storage self, uint8 newMaxRankedCandidates) external {
        if (newMaxRankedCandidates == 0) revert InvalidConfiguration();
        self.maxRankedCandidates = newMaxRankedCandidates;
        emit RankingConfigUpdated(newMaxRankedCandidates);
    }

    function setAgreementConfig(State storage self, AgreementConfig calldata newConfig) external {
        if (
            newConfig.version != self.agreementConfig.version + 1
                || newConfig.termsHash == bytes32(0)
                || (newConfig.active && newConfig.effectiveFrom < block.timestamp)
        ) revert InvalidConfiguration();
        self.agreementConfig = newConfig;
        self.agreementConfigs[newConfig.version] = newConfig;
        emit AgreementConfigUpdated(
            newConfig.version,
            newConfig.termsHash,
            newConfig.termsURI,
            newConfig.effectiveFrom,
            newConfig.active
        );
    }

    function setDocumentConfig(
        State storage self,
        bytes32 documentType,
        DocumentConfig calldata newConfig
    ) external {
        if (documentType == bytes32(0) || newConfig.schemaVersion == 0) {
            revert InvalidConfiguration();
        }
        if (
            newConfig.authorizedRoles
                & ~(DOCUMENT_ROLE_OWNER | DOCUMENT_ROLE_CONSIGNOR | DOCUMENT_ROLE_GUARANTOR
                    | DOCUMENT_ROLE_NOTARY | DOCUMENT_ROLE_WINNER | DOCUMENT_ROLE_USER_ADMIN)
                != 0
        ) revert InvalidConfiguration();
        if (!self.knownDocumentType[documentType]) {
            if (self.documentTypeList.length == type(uint8).max) revert InvalidConfiguration();
            self.documentTypeList.push(documentType);
            self.knownDocumentType[documentType] = true;
        }
        self.documentConfigs[documentType] = newConfig;
        emit DocumentConfigUpdated(
            documentType,
            newConfig.schemaVersion,
            newConfig.required,
            newConfig.active,
            newConfig.authorizedRoles
        );
    }

    function snapshotAuction(
        State storage self,
        bytes32 auctionKey,
        address taxWallet
    ) external returns (AuctionConfigSnapshot memory snapshot) {
        snapshot.currency = self.defaultCurrency;
        snapshot.currencyDecimals = self.currencyConfigs[self.defaultCurrency].decimals;
        snapshot.taxWallet = taxWallet;
        snapshot.defaultFeeBps = self.feeConfig.defaultFeeBps;
        snapshot.withdrawalFee = self.currencyConfigs[self.defaultCurrency].withdrawalFee;
        snapshot.signingWindow = self.auctionTimingConfig.signingWindow;
        snapshot.collectionWindow = self.auctionTimingConfig.collectionWindow;
        snapshot.claimWindow = self.auctionTimingConfig.claimWindow;
        snapshot.maxIncrementBps = self.bidConfig.maxIncrementBps;
        snapshot.preBidAllowed = self.bidConfig.preBidAllowed;
        snapshot.maxRankedCandidates = self.maxRankedCandidates;
        snapshot.minDurationHours = self.auctionTimingConfig.minDurationHours;
        snapshot.maxDurationHours = self.auctionTimingConfig.maxDurationHours;
        snapshot.minOpenDelay = self.auctionTimingConfig.minOpenDelay;
        snapshot.maxOpenDelay = self.auctionTimingConfig.maxOpenDelay;
        if (self.agreementConfig.active && self.agreementConfig.effectiveFrom <= block.timestamp) {
            snapshot.agreementVersion = self.agreementConfig.version;
            snapshot.agreementHash = self.agreementConfig.termsHash;
        }
        for (uint256 i = 0; i < self.documentTypeList.length; i++) {
            bytes32 documentType = self.documentTypeList[i];
            DocumentConfig memory config = self.documentConfigs[documentType];
            if (config.active) {
                self.auctionDocumentConfigs[auctionKey][documentType] = config;
                if (config.required) self.requiredDocumentTypes[auctionKey].push(documentType);
            }
        }
    }

    function validateRound(
        State storage self,
        uint128 startingBid,
        uint128 bidIncrement,
        uint64 openAt,
        uint16 durationHours,
        address currency,
        uint16 maxIncrementBps,
        AuctionTimingConfig memory timing,
        bool enforceCurrentIncrementList
    ) external view {
        if (startingBid == 0 || bidIncrement == 0) revert InvalidIncrement();
        if (enforceCurrentIncrementList && !self.allowedIncrements[currency][bidIncrement]) {
            revert InvalidIncrement();
        }
        if (uint256(bidIncrement) * BPS_DENOMINATOR > uint256(startingBid) * maxIncrementBps) {
            revert IncrementTooLarge();
        }
        if (durationHours < timing.minDurationHours || durationHours > timing.maxDurationHours) {
            revert InvalidDuration();
        }
        uint256 minOpen = block.timestamp + timing.minOpenDelay;
        uint256 maxOpen = block.timestamp + timing.maxOpenDelay;
        if (openAt < minOpen || openAt > maxOpen) revert InvalidOpenTime();
        if (uint256(openAt) + uint256(durationHours) * 1 hours > type(uint64).max) {
            revert InvalidOpenTime();
        }
    }

    function anchorDocument(
        State storage self,
        bytes32 auctionKey,
        uint16 roundNo,
        bytes32 documentType,
        uint32 documentVersion,
        bytes32 documentHash,
        string calldata documentURI,
        address caller,
        address owner,
        address consignor,
        address guarantor,
        address notary,
        address winner,
        bool isUserAdmin
    ) external {
        DocumentConfig storage config = self.auctionDocumentConfigs[auctionKey][documentType];
        if (!config.active || documentVersion != config.schemaVersion) revert DocumentNotConfigured();
        if (documentHash == bytes32(0) || bytes(documentURI).length == 0) revert InvalidConfiguration();
        if (
            self.documentAnchors[auctionKey][roundNo][documentType][documentVersion].documentHash
                != bytes32(0)
        ) revert DocumentAlreadyAnchored();
        if (
            !_isAuthorizedDocumentSigner(
                config.authorizedRoles,
                caller,
                owner,
                consignor,
                guarantor,
                notary,
                winner,
                isUserAdmin
            )
        ) revert UnauthorizedDocumentSigner();
        self.documentAnchors[auctionKey][roundNo][documentType][documentVersion] = DocumentAnchor({
            documentVersion: documentVersion,
            documentHash: documentHash,
            documentURI: documentURI
        });
        if (config.required) self.requiredDocumentAnchored[auctionKey][roundNo][documentType] = true;
        emit DocumentAnchored(
            auctionKey,
            roundNo,
            documentType,
            documentVersion,
            documentHash,
            documentURI
        );
    }

    function requiredDocumentsComplete(
        State storage self,
        bytes32 auctionKey,
        uint16 roundNo
    ) external view returns (bool) {
        bytes32[] storage requiredTypes = self.requiredDocumentTypes[auctionKey];
        for (uint256 i = 0; i < requiredTypes.length; i++) {
            if (!self.requiredDocumentAnchored[auctionKey][roundNo][requiredTypes[i]]) return false;
        }
        return true;
    }

    function _addAllowedIncrement(State storage self, address currency, uint128 increment) private {
        self.allowedIncrements[currency][increment] = true;
        self.allowedIncrementLists[currency].push(increment);
    }

    function _readTokenDecimals(address currency) private view returns (uint8) {
        (bool success, bytes memory result) = currency.staticcall(abi.encodeWithSignature("decimals()"));
        if (!success || result.length < 32) revert InvalidConfiguration();
        uint256 decimals = abi.decode(result, (uint256));
        if (decimals > type(uint8).max) revert InvalidConfiguration();
        return uint8(decimals);
    }

    function _emitFeeConfigUpdated(FeeConfig memory fees) private {
        emit FeeConfigUpdated(
            fees.platformBps,
            fees.guarantorBps,
            fees.notaryBps,
            fees.taxBps,
            fees.defaultFeeBps
        );
    }

    function _isAuthorizedDocumentSigner(
        uint8 authorizedRoles,
        address caller,
        address owner,
        address consignor,
        address guarantor,
        address notary,
        address winner,
        bool isUserAdmin
    ) private pure returns (bool) {
        if ((authorizedRoles & DOCUMENT_ROLE_OWNER) != 0 && caller == owner) return true;
        if ((authorizedRoles & DOCUMENT_ROLE_CONSIGNOR) != 0 && caller == consignor) return true;
        if ((authorizedRoles & DOCUMENT_ROLE_GUARANTOR) != 0 && caller == guarantor) return true;
        if ((authorizedRoles & DOCUMENT_ROLE_NOTARY) != 0 && caller == notary) return true;
        if ((authorizedRoles & DOCUMENT_ROLE_WINNER) != 0 && caller == winner) return true;
        return (authorizedRoles & DOCUMENT_ROLE_USER_ADMIN) != 0 && isUserAdmin;
    }
}
