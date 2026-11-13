// @file contracts/src/ParalelAuction.sol — Core auction contract
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Permit} from "./interfaces/IERC20Permit.sol";

contract ParalelAuction {
    // ==========================================
    // CONSTANTS
    // ==========================================
    uint8 public constant RANK_SLOTS = 10;
    uint16 public constant BPS_DENOMINATOR = 10_000;

    // ==========================================
    // ENUMS & STRUCTS
    // ==========================================
    enum Status {
        SCHEDULED, OPEN, CLOSED, AWARDING, COLLECTION, 
        CLAIM_PERIOD, SETTLED, PASSED_IN, WITHDRAWN
    }

    enum PartnerType { NOTARY, GUARANTOR }

    struct FeeConfig {
        uint16 platformBps;
        uint16 guarantorBps;
        uint16 notaryBps;
        uint16 taxBps;
        uint16 defaultFeeBps;
        uint128 withdrawalFee;
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

    struct Auction {
        address consignor;
        address guarantor;
        address notary;
        uint8 category;
        Status status;
        uint16 currentRound;
        bytes32 specHash;
        uint16 platformBps;
        uint16 guarantorBps;
        uint16 notaryBps;
        uint16 taxBps;
    }

    struct AuctionConfigSnapshot {
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
    }

    struct Round {
        uint128 startingBid;
        uint128 bidIncrement;
        uint64 openAt;
        uint64 closeAt;
        uint128 currentBid;
        address currentLeader;
        uint64 bidSeq;
        address[10] topRanks;
        uint8 awardingIndex;
        uint64 awardingDeadline;
        address winner;
        uint128 winnerStake;
        uint64 collectionDeadline;
        uint64 claimPeriodEnd;
    }

    struct Stake {
        uint128 myBid;
        uint64 reachedSeq;
        bool withdrawn;
    }

    struct Partner {
        PartnerType pType;
        uint8 category;
        bool active;
    }

    struct RegisterAuctionParams {
        bytes32 auctionKey;
        address consignor;
        address guarantor;
        address notary;
        uint8 category;
        bytes32 specHash;
        uint128 startingBid;
        uint128 bidIncrement;
        uint64 openAt;
        uint16 durationHours;
        bytes32 confirmationCodeHash;
        bytes notarySig;
        bytes consignorSig;
        uint256 notaryNonce;
        uint256 notaryExpiry;
        uint256 consignorNonce;
        uint256 consignorExpiry;
    }

    // ==========================================
    // STATE VARIABLES
    // ==========================================
    address public owner;
    address public relayerWallet;
    address public platformWallet;
    address public taxWallet;
    IERC20Permit public usdc;
    bool private locked;

    FeeConfig public feeConfig;
    AuctionTimingConfig public auctionTimingConfig;
    BidConfig public bidConfig;
    uint8 public maxRankedCandidates;

    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => AuctionConfigSnapshot) public auctionConfigSnapshots;
    mapping(bytes32 => mapping(uint16 => Round)) public rounds;
    mapping(bytes32 => mapping(uint16 => mapping(address => Stake))) public stakes;
    mapping(address => Partner) public partners;
    mapping(address => uint128) public claimable;
    mapping(address => uint256) public nonces;
    mapping(uint128 => bool) public allowedIncrements;
    mapping(address => bool) public userAdmins;
    uint128[] private allowedIncrementList;

    // ==========================================
    // EIP-712 DOMAIN
    // ==========================================
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant NOTARY_APPROVAL_TYPEHASH = keccak256("NotaryApproval(bytes32 auctionKey,bytes32 paramsHash,bytes32 confirmationCodeHash,uint256 nonce,uint256 expiry)");
    bytes32 public constant CONSIGNOR_CONFIRM_TYPEHASH = keccak256("ConsignorConfirm(bytes32 auctionKey,bytes32 confirmationCodeHash,uint256 nonce,uint256 expiry)");
    bytes32 public constant AWARD_SIGN_TYPEHASH = keccak256("AwardSign(bytes32 auctionKey,uint16 roundNo,uint8 rank,uint256 nonce,uint256 expiry)");
    bytes32 public constant COLLECTED_TYPEHASH = keccak256("Collected(bytes32 auctionKey,uint16 roundNo,uint256 nonce,uint256 expiry)");
    bytes32 public constant WITHDRAWN_TYPEHASH = keccak256("Withdrawn(bytes32 auctionKey,uint16 roundNo,uint256 nonce,uint256 expiry)");
    bytes32 public constant WITHDRAW_REQUEST_TYPEHASH = keccak256("WithdrawRequest(bytes32 auctionKey,uint16 roundNo,address wallet,uint256 nonce,uint256 expiry)");

    // ==========================================
    // EVENTS
    // ==========================================
    event AuctionRegistered(bytes32 indexed auctionKey, address consignor, address guarantor, address notary, bytes32 specHash, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours);
    event RoundScheduled(bytes32 indexed auctionKey, uint16 roundNo, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt);
    event BidPlaced(bytes32 indexed auctionKey, uint16 roundNo, address indexed bidder, uint128 added, uint128 myBidAfter, uint128 currentBidAfter, uint64 seq, bool isPreBid);
    event Closed(bytes32 indexed auctionKey, uint16 roundNo);
    event AwardingStarted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint64 deadline);
    event AwardSigned(bytes32 indexed auctionKey, uint16 roundNo, address winner);
    event Defaulted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint128 defaultFee);
    event PassedIn(bytes32 indexed auctionKey, uint16 roundNo);
    event Collected(bytes32 indexed auctionKey, uint16 roundNo);
    event ClaimPeriodStarted(bytes32 indexed auctionKey, uint16 roundNo, bool autoIssued);
    event WithdrawnItem(bytes32 indexed auctionKey, uint16 roundNo);
    event FeeCredited(address indexed recipient, uint128 amount);
    event Withdrawal(bytes32 indexed auctionKey, uint16 roundNo, address indexed wallet, uint8 kind, uint128 gross, uint128 fee, uint128 net);
    event Settled(bytes32 indexed auctionKey, uint16 roundNo);
    event FeeConfigUpdated(uint16 platformBps, uint16 guarantorBps, uint16 notaryBps, uint16 taxBps, uint16 defaultFeeBps, uint128 withdrawalFee);
    event TaxWalletUpdated(address indexed previousWallet, address indexed newWallet);
    event AuctionTimingConfigUpdated(uint32 signingWindow, uint32 collectionWindow, uint32 claimWindow, uint16 minDurationHours, uint16 maxDurationHours, uint32 minOpenDelay, uint32 maxOpenDelay);
    event AllowedIncrementUpdated(uint128 increment, bool allowed);
    event BidConfigUpdated(uint16 maxIncrementBps, bool preBidAllowed);
    event RankingConfigUpdated(uint8 maxRankedCandidates);
    event PartnerUpdated(address indexed wallet, PartnerType indexed partnerType, uint8 category, bool active);
    event UserAdminUpdated(address indexed wallet, bool active);
    event RelayerUpdated(address indexed previousRelayer, address indexed newRelayer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ==========================================
    // MODIFIERS & ERRORS
    // ==========================================
    error NotOwner();
    error NotRelayer();
    error PartnerNotRegistered();
    error AuctionExists();
    error InvalidIncrement();
    error IncrementTooLarge();
    error InvalidDuration();
    error InvalidOpenTime();
    error AuctionNotBiddable();
    error BiddingClosed();
    error ConsignorCannotBid();
    error NotMultipleOfIncrement();
    error TooEarly();
    error WrongPhase();
    error BadSignature();
    error CategoryMismatch();
    error AlreadyWithdrawn();
    error NotRefundable();
    error WinnerCannotWithdraw();
    error NothingToClaim();
    error SignatureExpired();
    error NonceUsed();
    error NotCurrentCandidate();
    error ZeroAddress();
    error InvalidConfiguration();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyRelayer() { if (msg.sender != relayerWallet) revert NotRelayer(); _; }
    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================
    constructor(address _usdc, address _platformWallet, address _taxWallet, address _relayerWallet) {
        if (_usdc == address(0) || _platformWallet == address(0) || _taxWallet == address(0) || _relayerWallet == address(0)) revert ZeroAddress();
        if (_usdc.code.length == 0) revert InvalidConfiguration();
        owner = msg.sender;
        usdc = IERC20Permit(_usdc);
        platformWallet = _platformWallet;
        taxWallet = _taxWallet;
        relayerWallet = _relayerWallet;
        feeConfig = FeeConfig({
            platformBps: 250,
            guarantorBps: 150,
            notaryBps: 100,
            taxBps: 1_000,
            defaultFeeBps: 500,
            withdrawalFee: 2_500_000
        });
        auctionTimingConfig = AuctionTimingConfig({
            signingWindow: 5 minutes,
            collectionWindow: 48 hours,
            claimWindow: 168 hours,
            minDurationHours: 12,
            maxDurationHours: 48,
            minOpenDelay: 48 hours,
            maxOpenDelay: 168 hours
        });
        bidConfig = BidConfig({maxIncrementBps: 500, preBidAllowed: true});
        maxRankedCandidates = RANK_SLOTS;
        _addAllowedIncrement(50_000);
        _addAllowedIncrement(500_000);
        _addAllowedIncrement(5_000_000);
        _addAllowedIncrement(50_000_000);
        _addAllowedIncrement(500_000_000);
        _addAllowedIncrement(5_000_000_000);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("ParalelAuction"),
                keccak256("2"),
                block.chainid,
                address(this)
            )
        );
    }

    // ==========================================
    // VIEW FUNCTIONS 
    // ==========================================
    function statusOf(bytes32 auctionKey) public view returns (Status) {
        Auction storage a = auctions[auctionKey];
        Round storage r = rounds[auctionKey][a.currentRound];
        
        if (a.status == Status.SCHEDULED) {
            if (block.timestamp >= r.closeAt) return Status.CLOSED;
            if (block.timestamp >= r.openAt) return Status.OPEN;
        }
        return a.status;
    }

    function getAuction(bytes32 auctionKey) external view returns (Auction memory) {
        return auctions[auctionKey];
    }

    function getAuctionConfigSnapshot(bytes32 auctionKey) external view returns (AuctionConfigSnapshot memory) {
        return auctionConfigSnapshots[auctionKey];
    }

    function getRound(bytes32 auctionKey, uint16 roundNo) external view returns (Round memory) {
        return rounds[auctionKey][roundNo];
    }

    function getAllowedIncrements() external view returns (uint128[] memory) {
        return allowedIncrementList;
    }

    function getStake(bytes32 auctionKey, uint16 roundNo, address bidder) external view returns (Stake memory) {
        return stakes[auctionKey][roundNo][bidder];
    }

    function claimableOf(address wallet) external view returns (uint128) {
        return claimable[wallet];
    }

    function refundableOf(bytes32 auctionKey, uint16 roundNo, address bidder) external view returns (uint128 gross, uint128 fee, uint128 net) {
        Stake storage s = stakes[auctionKey][roundNo][bidder];
        if (s.myBid == 0 || s.withdrawn) return (0, 0, 0);
        if (rounds[auctionKey][roundNo].winner == bidder) return (0, 0, 0);

        gross = s.myBid;
        uint128 withdrawalFee = auctionConfigSnapshots[auctionKey].withdrawalFee;
        fee = gross < withdrawalFee ? gross : withdrawalFee;
        net = gross - fee;
    }

    // ==========================================
    // OWNER & REGISTER
    // ==========================================
    function setPartner(address wallet, PartnerType pType, uint8 category, bool active) external onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        partners[wallet] = Partner(pType, category, active);
        emit PartnerUpdated(wallet, pType, category, active);
    }

    function setUserAdmin(address wallet, bool active) external onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        userAdmins[wallet] = active;
        emit UserAdminUpdated(wallet, active);
    }

    function setFeeConfig(FeeConfig calldata newConfig) external onlyOwner {
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

        feeConfig = newConfig;
        emit FeeConfigUpdated(
            newConfig.platformBps,
            newConfig.guarantorBps,
            newConfig.notaryBps,
            newConfig.taxBps,
            newConfig.defaultFeeBps,
            newConfig.withdrawalFee
        );
    }

    function setTaxWallet(address newTaxWallet) external onlyOwner {
        if (newTaxWallet == address(0)) revert ZeroAddress();
        address previousWallet = taxWallet;
        taxWallet = newTaxWallet;
        emit TaxWalletUpdated(previousWallet, newTaxWallet);
    }

    function setAuctionTimingConfig(AuctionTimingConfig calldata newConfig) external onlyOwner {
        if (
            newConfig.signingWindow == 0
                || newConfig.collectionWindow == 0
                || newConfig.claimWindow == 0
                || newConfig.minDurationHours == 0
                || newConfig.minDurationHours > newConfig.maxDurationHours
                || newConfig.minOpenDelay == 0
                || newConfig.minOpenDelay > newConfig.maxOpenDelay
        ) revert InvalidConfiguration();

        auctionTimingConfig = newConfig;
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

    function setAllowedIncrement(uint128 increment, bool allowed) external onlyOwner {
        if (increment == 0) revert InvalidIncrement();
        if (allowed && !allowedIncrements[increment]) {
            _addAllowedIncrement(increment);
        } else if (!allowed && allowedIncrements[increment]) {
            allowedIncrements[increment] = false;
            for (uint256 i = 0; i < allowedIncrementList.length; i++) {
                if (allowedIncrementList[i] == increment) {
                    allowedIncrementList[i] = allowedIncrementList[allowedIncrementList.length - 1];
                    allowedIncrementList.pop();
                    break;
                }
            }
        }
        emit AllowedIncrementUpdated(increment, allowed);
    }

    function setBidConfig(BidConfig calldata newConfig) external onlyOwner {
        if (newConfig.maxIncrementBps == 0 || newConfig.maxIncrementBps > BPS_DENOMINATOR) {
            revert InvalidConfiguration();
        }
        bidConfig = newConfig;
        emit BidConfigUpdated(newConfig.maxIncrementBps, newConfig.preBidAllowed);
    }

    function setRankingConfig(uint8 newMaxRankedCandidates) external onlyOwner {
        if (newMaxRankedCandidates == 0 || newMaxRankedCandidates > RANK_SLOTS) {
            revert InvalidConfiguration();
        }
        maxRankedCandidates = newMaxRankedCandidates;
        emit RankingConfigUpdated(newMaxRankedCandidates);
    }

    function setRelayer(address newRelayer) external onlyOwner {
        if (newRelayer == address(0)) revert ZeroAddress();
        address previousRelayer = relayerWallet;
        relayerWallet = newRelayer;
        emit RelayerUpdated(previousRelayer, newRelayer);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function registerAuction(RegisterAuctionParams calldata p) external onlyRelayer {
        if (auctions[p.auctionKey].consignor != address(0)) revert AuctionExists();
        Partner memory g = partners[p.guarantor];
        Partner memory n = partners[p.notary];
        if (!g.active || g.pType != PartnerType.GUARANTOR || !n.active || n.pType != PartnerType.NOTARY) revert PartnerNotRegistered();
        if (g.category != p.category) revert CategoryMismatch();

        _validateRound(p.startingBid, p.bidIncrement, p.openAt, p.durationHours, bidConfig.maxIncrementBps, auctionTimingConfig, true);

        bytes32 paramsHash = keccak256(abi.encode(p.startingBid, p.bidIncrement, p.openAt, p.durationHours));
        bytes32 notaryHash = keccak256(abi.encode(NOTARY_APPROVAL_TYPEHASH, p.auctionKey, paramsHash, p.confirmationCodeHash, p.notaryNonce, p.notaryExpiry));
        if (!_verifySig(p.notary, notaryHash, p.notaryNonce, p.notaryExpiry, p.notarySig)) revert BadSignature();

        bytes32 consignorHash = keccak256(abi.encode(CONSIGNOR_CONFIRM_TYPEHASH, p.auctionKey, p.confirmationCodeHash, p.consignorNonce, p.consignorExpiry));
        if (!_verifySig(p.consignor, consignorHash, p.consignorNonce, p.consignorExpiry, p.consignorSig)) revert BadSignature();

        Auction storage auction = auctions[p.auctionKey];
        auction.consignor = p.consignor;
        auction.guarantor = p.guarantor;
        auction.notary = p.notary;
        auction.category = p.category;
        auction.status = Status.SCHEDULED;
        auction.currentRound = 1;
        auction.specHash = p.specHash;
        auction.platformBps = feeConfig.platformBps;
        auction.guarantorBps = feeConfig.guarantorBps;
        auction.notaryBps = feeConfig.notaryBps;
        auction.taxBps = feeConfig.taxBps;
        auctionConfigSnapshots[p.auctionKey] = AuctionConfigSnapshot({
            taxWallet: taxWallet,
            defaultFeeBps: feeConfig.defaultFeeBps,
            withdrawalFee: feeConfig.withdrawalFee,
            signingWindow: auctionTimingConfig.signingWindow,
            collectionWindow: auctionTimingConfig.collectionWindow,
            claimWindow: auctionTimingConfig.claimWindow,
            maxIncrementBps: bidConfig.maxIncrementBps,
            preBidAllowed: bidConfig.preBidAllowed,
            maxRankedCandidates: maxRankedCandidates,
            minDurationHours: auctionTimingConfig.minDurationHours,
            maxDurationHours: auctionTimingConfig.maxDurationHours,
            minOpenDelay: auctionTimingConfig.minOpenDelay,
            maxOpenDelay: auctionTimingConfig.maxOpenDelay
        });

        uint64 closeAt = p.openAt + (uint64(p.durationHours) * 1 hours);
        Round storage r = rounds[p.auctionKey][1];
        r.startingBid = p.startingBid;
        r.bidIncrement = p.bidIncrement;
        r.openAt = p.openAt;
        r.closeAt = closeAt;

        emit AuctionRegistered(p.auctionKey, p.consignor, p.guarantor, p.notary, p.specHash, p.startingBid, p.bidIncrement, p.openAt, p.durationHours);
        emit RoundScheduled(p.auctionKey, 1, p.startingBid, p.bidIncrement, p.openAt, closeAt);
    }

    function reuseRound(bytes32 auctionKey, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        if (a.status != Status.PASSED_IN) revert WrongPhase();

        bytes32 structHash = keccak256(abi.encode(CONSIGNOR_CONFIRM_TYPEHASH, auctionKey, bytes32(0), nonce, expiry));
        if (!_verifySig(a.consignor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        AuctionTimingConfig memory timing = AuctionTimingConfig({
            signingWindow: snapshot.signingWindow,
            collectionWindow: snapshot.collectionWindow,
            claimWindow: snapshot.claimWindow,
            minDurationHours: snapshot.minDurationHours,
            maxDurationHours: snapshot.maxDurationHours,
            minOpenDelay: snapshot.minOpenDelay,
            maxOpenDelay: snapshot.maxOpenDelay
        });
        _validateRound(startingBid, bidIncrement, openAt, durationHours, snapshot.maxIncrementBps, timing, true);

        a.currentRound++;
        a.status = Status.SCHEDULED;

        uint16 newRound = a.currentRound;
        uint64 closeAt = openAt + (uint64(durationHours) * 1 hours);
        
        Round storage newRoundData = rounds[auctionKey][newRound];
        newRoundData.startingBid = startingBid;
        newRoundData.bidIncrement = bidIncrement;
        newRoundData.openAt = openAt;
        newRoundData.closeAt = closeAt;

        emit RoundScheduled(auctionKey, newRound, startingBid, bidIncrement, openAt, closeAt);
    }

    function markWithdrawn(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        if (a.status != Status.PASSED_IN) revert WrongPhase();

        bytes32 structHash = keccak256(abi.encode(WITHDRAWN_TYPEHASH, auctionKey, roundNo, nonce, expiry));
        if (!_verifySig(a.guarantor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        a.status = Status.WITHDRAWN;
        emit WithdrawnItem(auctionKey, roundNo);
    }

    // ==========================================
    // BIDDING
    // ==========================================
    function placeBid(bytes32 auctionKey, uint16 roundNo, uint128 amount) external {
        _placeBid(auctionKey, roundNo, amount);
    }

    function placeBidWithPermit(bytes32 auctionKey, uint16 roundNo, uint128 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        Stake storage bidderStake = stakes[auctionKey][roundNo][msg.sender];
        uint128 totalRequired = amount;
        if (bidderStake.myBid == 0) totalRequired += rounds[auctionKey][roundNo].startingBid;
        usdc.permit(msg.sender, address(this), totalRequired, deadline, v, r, s);
        _placeBid(auctionKey, roundNo, amount);
    }

    function _placeBid(bytes32 auctionKey, uint16 roundNo, uint128 amount) internal nonReentrant {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];

        if (r.closeAt == 0 || block.timestamp >= r.closeAt) revert BiddingClosed();
        if (a.status != Status.SCHEDULED && a.status != Status.OPEN) revert AuctionNotBiddable();
        if (!snapshot.preBidAllowed && block.timestamp < r.openAt) revert TooEarly();
        if (msg.sender == a.consignor) revert ConsignorCannotBid();
        if (amount == 0 || amount % r.bidIncrement != 0) revert NotMultipleOfIncrement();

        Stake storage s = stakes[auctionKey][roundNo][msg.sender];
        uint128 totalToTransfer = (s.myBid == 0) ? (r.startingBid + amount) : amount;

        s.myBid += totalToTransfer;
        s.reachedSeq = r.bidSeq;
        
        if (s.myBid > r.currentBid) {
            r.currentBid = s.myBid;
            r.currentLeader = msg.sender;
        }

        _updateTopRanks(auctionKey, roundNo, msg.sender);
        r.bidSeq++;

        require(usdc.transferFrom(msg.sender, address(this), totalToTransfer), "USDC transfer failed");

        emit BidPlaced(auctionKey, roundNo, msg.sender, amount, s.myBid, r.currentBid, s.reachedSeq, (a.status == Status.SCHEDULED));
    }

    // ==========================================
    // AWARDING & SETTLEMENT
    // ==========================================
    function startAwarding(bytes32 auctionKey, uint16 roundNo) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];

        if (roundNo != a.currentRound) revert WrongPhase();
        if (a.status != Status.SCHEDULED) revert WrongPhase();

        if (block.timestamp < r.closeAt) revert TooEarly();

        emit Closed(auctionKey, roundNo);

        if (r.topRanks[0] == address(0)) {
            a.status = Status.PASSED_IN;
            emit PassedIn(auctionKey, roundNo);
        } else {
            a.status = Status.AWARDING;
            r.awardingIndex = 0;
            r.awardingDeadline = uint64(block.timestamp + snapshot.signingWindow);
            emit AwardingStarted(auctionKey, roundNo, r.topRanks[0], r.awardingDeadline);
        }
    }

    function submitAwardSignature(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];

        if (a.status != Status.AWARDING) revert WrongPhase();
        if (block.timestamp > roundData.awardingDeadline) revert TooEarly(); 

        address candidate = roundData.topRanks[roundData.awardingIndex];
        if (candidate == address(0)) revert NotCurrentCandidate(); 
        
        bytes32 structHash = keccak256(abi.encode(AWARD_SIGN_TYPEHASH, auctionKey, roundNo, roundData.awardingIndex, nonce, expiry));
        if (!_verifySig(candidate, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert NotCurrentCandidate();

        roundData.winner = candidate;
        roundData.winnerStake = stakes[auctionKey][roundNo][candidate].myBid;
        a.status = Status.COLLECTION;
        roundData.collectionDeadline = uint64(block.timestamp + snapshot.collectionWindow);

        emit AwardSigned(auctionKey, roundNo, candidate);
    }

    function advanceCandidate(bytes32 auctionKey, uint16 roundNo) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];

        if (a.status != Status.AWARDING) revert WrongPhase();
        if (block.timestamp <= r.awardingDeadline) revert TooEarly(); 

        address candidate = r.topRanks[r.awardingIndex];
        Stake storage cStake = stakes[auctionKey][roundNo][candidate];
        
        uint128 defaultFee = uint128((uint256(cStake.myBid) * snapshot.defaultFeeBps) / BPS_DENOMINATOR);
        cStake.myBid -= defaultFee;

        uint128 toGuarantor;
        uint128 toNotary;
        uint128 toPlatform;
        if (defaultFee > 0) {
            uint256 defaultWeights = uint256(a.platformBps) + a.guarantorBps + a.notaryBps;
            toGuarantor = uint128((uint256(defaultFee) * a.guarantorBps) / defaultWeights);
            toNotary = uint128((uint256(defaultFee) * a.notaryBps) / defaultWeights);
            toPlatform = defaultFee - toGuarantor - toNotary;
        }

        claimable[platformWallet] += toPlatform;
        claimable[a.guarantor] += toGuarantor;
        claimable[a.notary] += toNotary;

        emit FeeCredited(platformWallet, toPlatform);
        emit FeeCredited(a.guarantor, toGuarantor);
        emit FeeCredited(a.notary, toNotary);

        emit Defaulted(auctionKey, roundNo, candidate, defaultFee);

        r.awardingIndex++;
        
        if (r.awardingIndex >= snapshot.maxRankedCandidates || r.topRanks[r.awardingIndex] == address(0)) {
            a.status = Status.PASSED_IN;
            emit PassedIn(auctionKey, roundNo);
        } else {
            r.awardingDeadline = uint64(block.timestamp + snapshot.signingWindow);
            emit AwardingStarted(auctionKey, roundNo, r.topRanks[r.awardingIndex], r.awardingDeadline);
        }
    }

    function collected(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];
        
        if (a.status != Status.COLLECTION) revert WrongPhase();
        if (block.timestamp > roundData.collectionDeadline) revert TooEarly();

        bytes32 structHash = keccak256(abi.encode(COLLECTED_TYPEHASH, auctionKey, roundNo, nonce, expiry));
        if (!_verifySig(a.guarantor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        a.status = Status.CLAIM_PERIOD;
        roundData.claimPeriodEnd = uint64(block.timestamp + snapshot.claimWindow);
        
        emit Collected(auctionKey, roundNo);
        emit ClaimPeriodStarted(auctionKey, roundNo, false);
    }

    function expireCollection(bytes32 auctionKey, uint16 roundNo) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];
        
        if (a.status != Status.COLLECTION) revert WrongPhase();
        if (block.timestamp <= r.collectionDeadline) revert TooEarly();

        a.status = Status.CLAIM_PERIOD;
        r.claimPeriodEnd = r.collectionDeadline + snapshot.claimWindow;

        emit ClaimPeriodStarted(auctionKey, roundNo, true);
    }

    function withdrawRefund(bytes32 auctionKey, uint16 roundNo, address bidder, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer nonReentrant {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];
        Stake storage bidderStake = stakes[auctionKey][roundNo][bidder];

        bytes32 structHash = keccak256(abi.encode(WITHDRAW_REQUEST_TYPEHASH, auctionKey, roundNo, bidder, nonce, expiry));
        if (!_verifySig(bidder, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        if (bidderStake.myBid == 0) revert NothingToClaim();
        if (bidderStake.withdrawn) revert AlreadyWithdrawn();
        if (bidder == roundData.winner) revert WinnerCannotWithdraw();

        bool isClosed = block.timestamp >= roundData.closeAt;
        bool isRanked = false;
        bool isDefaulted = false;
        
        for (uint8 i = 0; i < snapshot.maxRankedCandidates; i++) {
            if (roundData.topRanks[i] == bidder) {
                isRanked = true;
                if (i < roundData.awardingIndex) isDefaulted = true;
                break;
            }
        }

        if (a.status == Status.SCHEDULED || a.status == Status.OPEN) {
            if (!isClosed) revert TooEarly(); 
            if (isRanked) revert NotRefundable(); 
        } else if (a.status == Status.AWARDING) {
            if (!isDefaulted && isRanked) revert TooEarly(); 
        } else if (a.status == Status.COLLECTION || a.status == Status.CLAIM_PERIOD || a.status == Status.SETTLED) {
            if (isRanked && !isDefaulted) {
                if (roundData.winner == address(0)) revert TooEarly();
            }
        } else if (a.status == Status.PASSED_IN) {
            // Boleh tarik semua
        } else {
            revert NotRefundable();
        }

        bidderStake.withdrawn = true;
        uint128 gross = bidderStake.myBid;
        uint128 fee = gross < snapshot.withdrawalFee ? gross : snapshot.withdrawalFee;
        uint128 net = gross - fee;

        if (fee > 0) claimable[platformWallet] += fee;
        require(usdc.transfer(bidder, net), "Transfer failed"); 

        emit Withdrawal(auctionKey, roundNo, bidder, 0, gross, fee, net);
    }

    function withdrawConsignor(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer nonReentrant {
        Auction storage a = auctions[auctionKey];
        AuctionConfigSnapshot storage snapshot = auctionConfigSnapshots[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];
        
        if (a.status != Status.CLAIM_PERIOD) revert WrongPhase();
        if (block.timestamp < roundData.claimPeriodEnd) revert TooEarly();

        bytes32 structHash = keccak256(abi.encode(WITHDRAW_REQUEST_TYPEHASH, auctionKey, roundNo, a.consignor, nonce, expiry));
        if (!_verifySig(a.consignor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        a.status = Status.SETTLED;
        uint128 stake = roundData.winnerStake;

        uint128 toPlatform = uint128((uint256(stake) * a.platformBps) / BPS_DENOMINATOR);
        uint128 toGuarantor = uint128((uint256(stake) * a.guarantorBps) / BPS_DENOMINATOR);
        uint128 toNotary = uint128((uint256(stake) * a.notaryBps) / BPS_DENOMINATOR);
        uint128 toTax = uint128((uint256(stake) * a.taxBps) / BPS_DENOMINATOR);
        uint128 consignorShare = stake - toPlatform - toGuarantor - toNotary - toTax;

        claimable[platformWallet] += toPlatform;
        claimable[a.guarantor] += toGuarantor;
        claimable[a.notary] += toNotary;
        claimable[snapshot.taxWallet] += toTax;

        emit FeeCredited(platformWallet, toPlatform);
        emit FeeCredited(a.guarantor, toGuarantor);
        emit FeeCredited(a.notary, toNotary);
        emit FeeCredited(snapshot.taxWallet, toTax);

        uint128 fee = consignorShare < snapshot.withdrawalFee ? consignorShare : snapshot.withdrawalFee;
        uint128 net = consignorShare - fee;
        
        if (fee > 0) claimable[platformWallet] += fee;
        require(usdc.transfer(a.consignor, net), "Transfer failed");

        emit Settled(auctionKey, roundNo);
        emit Withdrawal(auctionKey, roundNo, a.consignor, 1, consignorShare, fee, net);
    }

    function withdrawClaimable() external nonReentrant {
        uint128 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimable[msg.sender] = 0;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit Withdrawal(bytes32(0), 0, msg.sender, 2, amount, 0, amount);
    }

    // ==========================================
    // INTERNAL HELPERS
    // ==========================================
    function _verifySig(address signer, bytes32 structHash, uint256 nonce, uint256 expiry, bytes memory signature) internal returns (bool) {
        if (block.timestamp > expiry) revert SignatureExpired();
        if (nonce != nonces[signer]) revert NonceUsed();

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (signature.length != 65) return false;
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0) || recovered != signer) return false;
        
        nonces[signer]++;
        return true;
    }

    function _updateTopRanks(bytes32 auctionKey, uint16 roundNo, address bidder) internal {
        Round storage r = rounds[auctionKey][roundNo];
        uint8 rankLimit = auctionConfigSnapshots[auctionKey].maxRankedCandidates;
        Stake storage newStake = stakes[auctionKey][roundNo][bidder];

        for (uint i = 0; i < rankLimit; i++) {
            if (r.topRanks[i] == bidder) { r.topRanks[i] = address(0); break; }
        }

        uint insertIndex = rankLimit;
        for (uint i = 0; i < rankLimit; i++) {
            if (r.topRanks[i] == address(0)) { insertIndex = i; break; }
            else {
                Stake storage existingStake = stakes[auctionKey][roundNo][r.topRanks[i]];
                if (newStake.myBid > existingStake.myBid || (newStake.myBid == existingStake.myBid && newStake.reachedSeq < existingStake.reachedSeq)) {
                    insertIndex = i; break;
                }
            }
        }

        if (insertIndex < rankLimit) {
            for (uint i = rankLimit - 1; i > insertIndex; i--) { r.topRanks[i] = r.topRanks[i-1]; }
            r.topRanks[insertIndex] = bidder;
        }
    }

    function _validateRound(
        uint128 startingBid,
        uint128 bidIncrement,
        uint64 openAt,
        uint16 durationHours,
        uint16 maxIncrementBps,
        AuctionTimingConfig memory timing,
        bool enforceCurrentIncrementList
    ) internal view {
        if (startingBid == 0 || bidIncrement == 0) revert InvalidIncrement();
        if (enforceCurrentIncrementList && !allowedIncrements[bidIncrement]) revert InvalidIncrement();
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

    function _addAllowedIncrement(uint128 increment) internal {
        allowedIncrements[increment] = true;
        allowedIncrementList.push(increment);
    }
}