// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ParalelAuctionV3Storage} from "./ParalelAuctionV3Storage.sol";
import {ParalelAuctionV3PolicyLib} from "./ParalelAuctionV3PolicyLib.sol";
import {ParalelAuctionV3PolicyRegistry} from "./ParalelAuctionV3PolicyRegistry.sol";

contract ParalelAuctionV3RegistrationFacet is ParalelAuctionV3Storage {
    function registerAuction(
        RegisterAuctionParams calldata p
    ) external onlyDelegateCall onlyRelayer {
        if (_auctions[p.auctionKey].consignor != address(0)) revert AuctionExists();
        ParalelAuctionV3PolicyRegistry registry = ParalelAuctionV3PolicyRegistry(_policyRegistry);
        (bool currencySupported,,) = registry.currencyConfigs(registry.defaultCurrency());
        if (!currencySupported) revert UnsupportedCurrency();

        Partner memory guarantor = _partners[p.guarantor];
        Partner memory notary = _partners[p.notary];
        if (
            !guarantor.active
                || guarantor.pType != PartnerType.GUARANTOR
                || !notary.active
                || notary.pType != PartnerType.NOTARY
        ) revert PartnerNotRegistered();
        if (guarantor.category != p.category) revert CategoryMismatch();

        registry.validateRegistrationRound(
            p.startingBid,
            p.bidIncrement,
            p.openAt,
            p.durationHours
        );

        bytes32 paramsHash = keccak256(
            abi.encode(p.startingBid, p.bidIncrement, p.openAt, p.durationHours)
        );
        bytes32 notaryHash = keccak256(
            abi.encode(
                _NOTARY_APPROVAL_TYPEHASH,
                p.auctionKey,
                paramsHash,
                p.confirmationCodeHash,
                p.notaryNonce,
                p.notaryExpiry
            )
        );
        if (!_verifySig(p.notary, notaryHash, p.notaryNonce, p.notaryExpiry, p.notarySig)) {
            revert BadSignature();
        }

        bytes32 consignorHash = keccak256(
            abi.encode(
                _CONSIGNOR_CONFIRM_TYPEHASH,
                p.auctionKey,
                p.confirmationCodeHash,
                p.consignorNonce,
                p.consignorExpiry
            )
        );
        if (
            !_verifySig(
                p.consignor,
                consignorHash,
                p.consignorNonce,
                p.consignorExpiry,
                p.consignorSig
            )
        ) revert BadSignature();

        Auction storage auction = _auctions[p.auctionKey];
        auction.consignor = p.consignor;
        auction.guarantor = p.guarantor;
        auction.notary = p.notary;
        auction.category = p.category;
        auction.status = Status.SCHEDULED;
        auction.currentRound = 1;
        auction.specHash = p.specHash;

        ParalelAuctionV3PolicyLib.FeeConfig memory fees = registry.feeConfig();
        auction.platformBps = fees.platformBps;
        auction.guarantorBps = fees.guarantorBps;
        auction.notaryBps = fees.notaryBps;
        auction.taxBps = fees.taxBps;
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot memory snapshot = registry.snapshotAuction(
            p.auctionKey,
            1,
            p.consignor,
            p.guarantor,
            p.notary,
            _taxWallet
        );
        auction.currency = snapshot.currency;
        _auctionConfigSnapshots[p.auctionKey] = snapshot;

        uint64 closeAt = p.openAt + uint64(p.durationHours) * 1 hours;
        Round storage roundData = _rounds[p.auctionKey][1];
        roundData.startingBid = p.startingBid;
        roundData.bidIncrement = p.bidIncrement;
        roundData.openAt = p.openAt;
        roundData.closeAt = closeAt;

        emit AuctionRegistered(
            p.auctionKey,
            p.consignor,
            p.guarantor,
            p.notary,
            snapshot.currency,
            p.specHash,
            p.startingBid,
            p.bidIncrement,
            p.openAt,
            p.durationHours
        );
        emit RoundScheduled(
            p.auctionKey,
            1,
            p.startingBid,
            p.bidIncrement,
            p.openAt,
            closeAt
        );
    }

    function reuseRound(
        bytes32 auctionKey,
        uint128 startingBid,
        uint128 bidIncrement,
        uint64 openAt,
        uint16 durationHours,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyDelegateCall onlyRelayer {
        Auction storage auction = _auctions[auctionKey];
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot storage snapshot = _auctionConfigSnapshots[
            auctionKey
        ];
        if (auction.status != Status.PASSED_IN) revert WrongPhase();

        bytes32 structHash = keccak256(
            abi.encode(_CONSIGNOR_CONFIRM_TYPEHASH, auctionKey, bytes32(0), nonce, expiry)
        );
        if (!_verifySig(auction.consignor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) {
            revert BadSignature();
        }

        ParalelAuctionV3PolicyLib.AuctionTimingConfig memory timing =
            ParalelAuctionV3PolicyLib.AuctionTimingConfig({
                signingWindow: snapshot.signingWindow,
                collectionWindow: snapshot.collectionWindow,
                claimWindow: snapshot.claimWindow,
                minDurationHours: snapshot.minDurationHours,
                maxDurationHours: snapshot.maxDurationHours,
                minOpenDelay: snapshot.minOpenDelay,
                maxOpenDelay: snapshot.maxOpenDelay
            });
        ParalelAuctionV3PolicyRegistry(_policyRegistry).validateRound(
            startingBid,
            bidIncrement,
            openAt,
            durationHours,
            snapshot.currency,
            snapshot.maxIncrementBps,
            timing
        );

        auction.currentRound++;
        auction.status = Status.SCHEDULED;
        uint16 newRound = auction.currentRound;
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setAuctionRound(auctionKey, newRound);

        uint64 closeAt = openAt + uint64(durationHours) * 1 hours;
        Round storage newRoundData = _rounds[auctionKey][newRound];
        newRoundData.startingBid = startingBid;
        newRoundData.bidIncrement = bidIncrement;
        newRoundData.openAt = openAt;
        newRoundData.closeAt = closeAt;
        emit RoundScheduled(
            auctionKey,
            newRound,
            startingBid,
            bidIncrement,
            openAt,
            closeAt
        );
    }

    function markWithdrawn(
        bytes32 auctionKey,
        uint16 roundNo,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyDelegateCall onlyRelayer {
        Auction storage auction = _auctions[auctionKey];
        if (auction.status != Status.PASSED_IN) revert WrongPhase();
        bytes32 structHash = keccak256(
            abi.encode(_WITHDRAWN_TYPEHASH, auctionKey, roundNo, nonce, expiry)
        );
        if (
            !_verifySig(
                auction.guarantor,
                structHash,
                nonce,
                expiry,
                abi.encodePacked(r, s, v)
            )
        ) revert BadSignature();
        auction.status = Status.WITHDRAWN;
        emit WithdrawnItem(auctionKey, roundNo);
    }
}
