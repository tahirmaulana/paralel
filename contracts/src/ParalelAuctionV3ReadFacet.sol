// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ParalelAuctionV3Storage} from "./ParalelAuctionV3Storage.sol";
import {ParalelAuctionV3PolicyLib} from "./ParalelAuctionV3PolicyLib.sol";
import {ParalelAuctionV3PolicyRegistry} from "./ParalelAuctionV3PolicyRegistry.sol";

contract ParalelAuctionV3ReadFacet is ParalelAuctionV3Storage {
    function owner() external view onlyDelegateCall returns (address) {
        return _owner;
    }

    function relayerWallet() external view onlyDelegateCall returns (address) {
        return _relayerWallet;
    }

    function platformWallet() external view onlyDelegateCall returns (address) {
        return _platformWallet;
    }

    function taxWallet() external view onlyDelegateCall returns (address) {
        return _taxWallet;
    }

    function policyRegistryAddress() external view onlyDelegateCall returns (address) {
        return _policyRegistry;
    }

    function DOMAIN_SEPARATOR() external view onlyDelegateCall returns (bytes32) {
        return _domainSeparator;
    }

    function NOTARY_APPROVAL_TYPEHASH() external pure returns (bytes32) {
        return _NOTARY_APPROVAL_TYPEHASH;
    }

    function CONSIGNOR_CONFIRM_TYPEHASH() external pure returns (bytes32) {
        return _CONSIGNOR_CONFIRM_TYPEHASH;
    }

    function AWARD_SIGN_TYPEHASH() external pure returns (bytes32) {
        return _AWARD_SIGN_TYPEHASH;
    }

    function COLLECTED_TYPEHASH() external pure returns (bytes32) {
        return _COLLECTED_TYPEHASH;
    }

    function WITHDRAWN_TYPEHASH() external pure returns (bytes32) {
        return _WITHDRAWN_TYPEHASH;
    }

    function WITHDRAW_REQUEST_TYPEHASH() external pure returns (bytes32) {
        return _WITHDRAW_REQUEST_TYPEHASH;
    }

    function BPS_DENOMINATOR() external pure returns (uint16) {
        return _BPS_DENOMINATOR;
    }

    function defaultCurrency() public view onlyDelegateCall returns (address) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).defaultCurrency();
    }

    function usdc() external view onlyDelegateCall returns (address) {
        return defaultCurrency();
    }

    function currencyConfigs(
        address currency
    ) external view onlyDelegateCall returns (bool supported, uint8 decimals, uint128 withdrawalFee) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).currencyConfigs(currency);
    }

    function feeConfig()
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.FeeConfig memory)
    {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).feeConfig();
    }

    function auctionTimingConfig()
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.AuctionTimingConfig memory)
    {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).auctionTimingConfig();
    }

    function bidConfig()
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.BidConfig memory)
    {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).bidConfig();
    }

    function maxRankedCandidates() external view onlyDelegateCall returns (uint8) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).maxRankedCandidates();
    }

    function allowedIncrements(
        address currency,
        uint128 increment
    ) external view onlyDelegateCall returns (bool) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).allowedIncrements(currency, increment);
    }

    function agreementConfig()
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.AgreementConfig memory)
    {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).agreementConfig();
    }

    function documentConfigs(
        bytes32 documentType
    ) external view onlyDelegateCall returns (uint32 schemaVersion, bool required, bool active, uint8 authorizedRoles) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).documentConfigs(documentType);
    }

    function partners(address wallet) external view onlyDelegateCall returns (Partner memory) {
        return _partners[wallet];
    }

    function userAdmins(address wallet) external view onlyDelegateCall returns (bool) {
        return _userAdmins[wallet];
    }

    function nonces(address wallet) external view onlyDelegateCall returns (uint256) {
        return _nonces[wallet];
    }

    function auctions(bytes32 auctionKey) external view onlyDelegateCall returns (Auction memory) {
        return _auctions[auctionKey];
    }

    function rounds(
        bytes32 auctionKey,
        uint16 roundNo
    )
        external
        view
        onlyDelegateCall
        returns (
            uint128 startingBid,
            uint128 bidIncrement,
            uint64 openAt,
            uint64 closeAt,
            uint128 currentBid,
            address currentLeader,
            uint64 bidSeq,
            uint8 awardingIndex,
            uint64 awardingDeadline,
            address winner,
            uint128 winnerStake,
            uint64 collectionDeadline,
            uint64 claimPeriodEnd
        )
    {
        Round storage roundData = _rounds[auctionKey][roundNo];
        return (
            roundData.startingBid,
            roundData.bidIncrement,
            roundData.openAt,
            roundData.closeAt,
            roundData.currentBid,
            roundData.currentLeader,
            roundData.bidSeq,
            roundData.awardingIndex,
            roundData.awardingDeadline,
            roundData.winner,
            roundData.winnerStake,
            roundData.collectionDeadline,
            roundData.claimPeriodEnd
        );
    }

    function stakes(
        bytes32 auctionKey,
        uint16 roundNo,
        address bidder
    ) external view onlyDelegateCall returns (Stake memory) {
        return _stakes[auctionKey][roundNo][bidder];
    }

    function claimable(
        address currency,
        address wallet
    ) external view onlyDelegateCall returns (uint128) {
        return _claimable[currency][wallet];
    }

    function auctionConfigSnapshots(
        bytes32 auctionKey
    )
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.AuctionConfigSnapshot memory)
    {
        return _auctionConfigSnapshots[auctionKey];
    }

    function statusOf(bytes32 auctionKey) public view onlyDelegateCall returns (Status) {
        Auction storage auction = _auctions[auctionKey];
        Round storage roundData = _rounds[auctionKey][auction.currentRound];
        if (auction.status == Status.SCHEDULED) {
            if (block.timestamp >= roundData.closeAt) return Status.CLOSED;
            if (block.timestamp >= roundData.openAt) return Status.OPEN;
        }
        return auction.status;
    }

    function getAuction(bytes32 auctionKey) external view onlyDelegateCall returns (Auction memory) {
        return _auctions[auctionKey];
    }

    function getAuctionConfigSnapshot(
        bytes32 auctionKey
    )
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.AuctionConfigSnapshot memory)
    {
        return _auctionConfigSnapshots[auctionKey];
    }

    function getRound(
        bytes32 auctionKey,
        uint16 roundNo
    ) external view onlyDelegateCall returns (Round memory) {
        return _rounds[auctionKey][roundNo];
    }

    function getAllowedIncrements() external view onlyDelegateCall returns (uint128[] memory) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).getAllowedIncrements(defaultCurrency());
    }

    function getAllowedIncrements(
        address currency
    ) external view onlyDelegateCall returns (uint128[] memory) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).getAllowedIncrements(currency);
    }

    function getSupportedCurrencies() external view onlyDelegateCall returns (address[] memory) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).getSupportedCurrencies();
    }

    function getRankedCandidates(
        bytes32 auctionKey,
        uint16 roundNo
    ) external view onlyDelegateCall returns (address[] memory) {
        return _rounds[auctionKey][roundNo].topRanks;
    }

    function getStake(
        bytes32 auctionKey,
        uint16 roundNo,
        address bidder
    ) external view onlyDelegateCall returns (Stake memory) {
        return _stakes[auctionKey][roundNo][bidder];
    }

    function claimableOf(address wallet) external view onlyDelegateCall returns (uint128) {
        return _claimable[defaultCurrency()][wallet];
    }

    function claimableOf(
        address currency,
        address wallet
    ) external view onlyDelegateCall returns (uint128) {
        return _claimable[currency][wallet];
    }

    function refundableOf(
        bytes32 auctionKey,
        uint16 roundNo,
        address bidder
    ) external view onlyDelegateCall returns (uint128 gross, uint128 fee, uint128 net) {
        Stake storage stakeData = _stakes[auctionKey][roundNo][bidder];
        if (stakeData.myBid == 0 || stakeData.withdrawn) return (0, 0, 0);
        if (_rounds[auctionKey][roundNo].winner == bidder) return (0, 0, 0);
        gross = stakeData.myBid;
        uint128 withdrawalFee = _auctionConfigSnapshots[auctionKey].withdrawalFee;
        fee = gross < withdrawalFee ? gross : withdrawalFee;
        net = gross - fee;
    }

    function getAgreementConfig(
        uint32 version
    )
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.AgreementConfig memory)
    {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).getAgreementConfig(version);
    }

    function getDocumentTypes() external view onlyDelegateCall returns (bytes32[] memory) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).getDocumentTypes();
    }

    function getDocumentAnchor(
        bytes32 auctionKey,
        uint16 roundNo,
        bytes32 documentType,
        uint32 documentVersion
    )
        external
        view
        onlyDelegateCall
        returns (ParalelAuctionV3PolicyLib.DocumentAnchor memory)
    {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).getDocumentAnchor(
            auctionKey,
            roundNo,
            documentType,
            documentVersion
        );
    }

    function requiredDocumentsComplete(
        bytes32 auctionKey,
        uint16 roundNo
    ) external view onlyDelegateCall returns (bool) {
        return ParalelAuctionV3PolicyRegistry(_policyRegistry).requiredDocumentsComplete(
            auctionKey,
            roundNo
        );
    }
}
