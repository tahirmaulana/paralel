// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ParalelAuctionV3PolicyLib} from "./ParalelAuctionV3PolicyLib.sol";

abstract contract ParalelAuctionV3Storage {
    uint16 internal constant _BPS_DENOMINATOR = 10_000;
    uint8 internal constant DOCUMENT_ROLE_CONSIGNOR = 2;
    uint8 internal constant DOCUMENT_ROLE_GUARANTOR = 4;
    uint8 internal constant DOCUMENT_ROLE_NOTARY = 8;
    uint8 internal constant DOCUMENT_ROLE_WINNER = 16;
    uint8 internal constant DOCUMENT_ROLE_USER_ADMIN = 32;

    enum Status {
        SCHEDULED,
        OPEN,
        CLOSED,
        AWARDING,
        COLLECTION,
        CLAIM_PERIOD,
        SETTLED,
        PASSED_IN,
        WITHDRAWN
    }

    enum PartnerType {
        NOTARY,
        GUARANTOR
    }

    struct Auction {
        address consignor;
        address guarantor;
        address notary;
        address currency;
        uint8 category;
        Status status;
        uint16 currentRound;
        bytes32 specHash;
        uint16 platformBps;
        uint16 guarantorBps;
        uint16 notaryBps;
        uint16 taxBps;
    }

    struct Round {
        uint128 startingBid;
        uint128 bidIncrement;
        uint64 openAt;
        uint64 closeAt;
        uint128 currentBid;
        address currentLeader;
        uint64 bidSeq;
        address[] topRanks;
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

    address internal _owner;
    address internal _relayerWallet;
    address internal _platformWallet;
    address internal _taxWallet;
    address internal _policyRegistry;
    bool internal locked;
    bytes32 internal _domainSeparator;
    address private immutable SELF = address(this);

    mapping(bytes4 => address) internal selectorFacets;
    mapping(bytes32 => Auction) internal _auctions;
    mapping(bytes32 => ParalelAuctionV3PolicyLib.AuctionConfigSnapshot) internal _auctionConfigSnapshots;
    mapping(bytes32 => mapping(uint16 => Round)) internal _rounds;
    mapping(bytes32 => mapping(uint16 => mapping(address => Stake))) internal _stakes;
    mapping(address => Partner) internal _partners;
    mapping(address => mapping(address => uint128)) internal _claimable;
    mapping(address => uint256) internal _nonces;
    mapping(address => bool) internal _userAdmins;

    bytes32 internal constant _NOTARY_APPROVAL_TYPEHASH = keccak256(
        "NotaryApproval(bytes32 auctionKey,bytes32 paramsHash,bytes32 confirmationCodeHash,uint256 nonce,uint256 expiry)"
    );
    bytes32 internal constant _CONSIGNOR_CONFIRM_TYPEHASH = keccak256(
        "ConsignorConfirm(bytes32 auctionKey,bytes32 confirmationCodeHash,uint256 nonce,uint256 expiry)"
    );
    bytes32 internal constant _AWARD_SIGN_TYPEHASH =
        keccak256("AwardSign(bytes32 auctionKey,uint16 roundNo,uint8 rank,uint256 nonce,uint256 expiry)");
    bytes32 internal constant _COLLECTED_TYPEHASH =
        keccak256("Collected(bytes32 auctionKey,uint16 roundNo,uint256 nonce,uint256 expiry)");
    bytes32 internal constant _WITHDRAWN_TYPEHASH =
        keccak256("Withdrawn(bytes32 auctionKey,uint16 roundNo,uint256 nonce,uint256 expiry)");
    bytes32 internal constant _WITHDRAW_REQUEST_TYPEHASH =
        keccak256("WithdrawRequest(bytes32 auctionKey,uint16 roundNo,address wallet,uint256 nonce,uint256 expiry)");

    event AuctionRegistered(
        bytes32 indexed auctionKey,
        address consignor,
        address guarantor,
        address notary,
        address currency,
        bytes32 specHash,
        uint128 startingBid,
        uint128 bidIncrement,
        uint64 openAt,
        uint16 durationHours
    );
    event RoundScheduled(
        bytes32 indexed auctionKey,
        uint16 roundNo,
        uint128 startingBid,
        uint128 bidIncrement,
        uint64 openAt,
        uint64 closeAt
    );
    event BidPlaced(
        bytes32 indexed auctionKey,
        uint16 roundNo,
        address indexed bidder,
        uint128 added,
        uint128 myBidAfter,
        uint128 currentBidAfter,
        uint64 seq,
        bool isPreBid
    );
    event Closed(bytes32 indexed auctionKey, uint16 roundNo);
    event AwardingStarted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint64 deadline);
    event AwardSigned(bytes32 indexed auctionKey, uint16 roundNo, address winner);
    event Defaulted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint128 defaultFee);
    event PassedIn(bytes32 indexed auctionKey, uint16 roundNo);
    event Collected(bytes32 indexed auctionKey, uint16 roundNo);
    event ClaimPeriodStarted(bytes32 indexed auctionKey, uint16 roundNo, bool autoIssued);
    event WithdrawnItem(bytes32 indexed auctionKey, uint16 roundNo);
    event FeeCredited(address indexed currency, address indexed recipient, uint128 amount);
    event Withdrawal(
        bytes32 indexed auctionKey,
        uint16 roundNo,
        address indexed wallet,
        address currency,
        uint8 kind,
        uint128 gross,
        uint128 fee,
        uint128 net
    );
    event Settled(bytes32 indexed auctionKey, uint16 roundNo);
    event TaxWalletUpdated(address indexed previousWallet, address indexed newWallet);
    event PartnerUpdated(
        address indexed wallet,
        PartnerType indexed partnerType,
        uint8 category,
        bool active
    );
    event UserAdminUpdated(address indexed wallet, bool active);
    event RelayerUpdated(address indexed previousRelayer, address indexed newRelayer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

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
    error UnsupportedCurrency();
    error DocumentNotConfigured();
    error DocumentAlreadyAnchored();
    error UnauthorizedDocumentSigner();
    error RequiredDocumentsMissing();
    error TokenTransferFailed();
    error FacetNotConfigured();
    error DirectFacetCall();

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != _relayerWallet) revert NotRelayer();
        _;
    }

    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyDelegateCall() {
        if (address(this) == SELF) revert DirectFacetCall();
        _;
    }

    function _verifySig(
        address signer,
        bytes32 structHash,
        uint256 nonce,
        uint256 expiry,
        bytes memory signature
    ) internal returns (bool) {
        if (block.timestamp > expiry) revert SignatureExpired();
        if (nonce != _nonces[signer]) revert NonceUsed();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator, structHash));
        if (signature.length != 65) return false;
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly ("memory-safe") {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0) || recovered != signer) return false;
        _nonces[signer]++;
        return true;
    }

    function _safeTransfer(address currency, address recipient, uint256 amount) internal {
        (bool success, bytes memory result) = currency.call(
            abi.encodeWithSignature("transfer(address,uint256)", recipient, amount)
        );
        if (!success || (result.length != 0 && !abi.decode(result, (bool)))) {
            revert TokenTransferFailed();
        }
    }

    function _safeTransferFrom(
        address currency,
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        (bool success, bytes memory result) = currency.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", sender, recipient, amount)
        );
        if (!success || (result.length != 0 && !abi.decode(result, (bool)))) {
            revert TokenTransferFailed();
        }
    }
}
