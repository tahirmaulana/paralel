// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ParalelAuctionV3Storage} from "./ParalelAuctionV3Storage.sol";
import {ParalelAuctionV3PolicyLib} from "./ParalelAuctionV3PolicyLib.sol";
import {ParalelAuctionV3PolicyRegistry} from "./ParalelAuctionV3PolicyRegistry.sol";

contract ParalelAuctionV3SettlementFacet is ParalelAuctionV3Storage {
    function startAwarding(
        bytes32 auctionKey,
        uint16 roundNo
    ) external onlyDelegateCall onlyRelayer {
        Auction storage auction = _auctions[auctionKey];
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot storage snapshot = _auctionConfigSnapshots[
            auctionKey
        ];
        Round storage roundData = _rounds[auctionKey][roundNo];
        if (roundNo != auction.currentRound || auction.status != Status.SCHEDULED) revert WrongPhase();
        if (block.timestamp < roundData.closeAt) revert TooEarly();
        emit Closed(auctionKey, roundNo);

        if (roundData.topRanks.length == 0) {
            auction.status = Status.PASSED_IN;
            emit PassedIn(auctionKey, roundNo);
        } else {
            auction.status = Status.AWARDING;
            roundData.awardingIndex = 0;
            roundData.awardingDeadline = uint64(block.timestamp + snapshot.signingWindow);
            emit AwardingStarted(
                auctionKey,
                roundNo,
                roundData.topRanks[0],
                roundData.awardingDeadline
            );
        }
    }

    function submitAwardSignature(
        bytes32 auctionKey,
        uint16 roundNo,
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
        Round storage roundData = _rounds[auctionKey][roundNo];
        if (auction.status != Status.AWARDING) revert WrongPhase();
        if (block.timestamp > roundData.awardingDeadline) revert TooEarly();
        if (roundData.awardingIndex >= roundData.topRanks.length) revert NotCurrentCandidate();

        address candidate = roundData.topRanks[roundData.awardingIndex];
        bytes32 structHash = keccak256(
            abi.encode(
                _AWARD_SIGN_TYPEHASH,
                auctionKey,
                roundNo,
                roundData.awardingIndex,
                nonce,
                expiry
            )
        );
        if (
            !_verifySig(
                candidate,
                structHash,
                nonce,
                expiry,
                abi.encodePacked(r, s, v)
            )
        ) revert NotCurrentCandidate();

        roundData.winner = candidate;
        roundData.winnerStake = _stakes[auctionKey][roundNo][candidate].myBid;
        auction.status = Status.COLLECTION;
        roundData.collectionDeadline = uint64(block.timestamp + snapshot.collectionWindow);
        emit AwardSigned(auctionKey, roundNo, candidate);
    }

    function advanceCandidate(
        bytes32 auctionKey,
        uint16 roundNo
    ) external onlyDelegateCall onlyRelayer {
        Auction storage auction = _auctions[auctionKey];
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot storage snapshot = _auctionConfigSnapshots[
            auctionKey
        ];
        Round storage roundData = _rounds[auctionKey][roundNo];
        if (auction.status != Status.AWARDING) revert WrongPhase();
        if (block.timestamp <= roundData.awardingDeadline) revert TooEarly();
        if (roundData.awardingIndex >= roundData.topRanks.length) revert NotCurrentCandidate();

        address candidate = roundData.topRanks[roundData.awardingIndex];
        Stake storage candidateStake = _stakes[auctionKey][roundNo][candidate];
        uint128 defaultFee = uint128(
            (uint256(candidateStake.myBid) * snapshot.defaultFeeBps) / _BPS_DENOMINATOR
        );
        candidateStake.myBid -= defaultFee;

        uint128 toGuarantor;
        uint128 toNotary;
        uint128 toPlatform;
        if (defaultFee > 0) {
            uint256 defaultWeights =
                uint256(auction.platformBps) + auction.guarantorBps + auction.notaryBps;
            toGuarantor = uint128(
                (uint256(defaultFee) * auction.guarantorBps) / defaultWeights
            );
            toNotary = uint128((uint256(defaultFee) * auction.notaryBps) / defaultWeights);
            toPlatform = defaultFee - toGuarantor - toNotary;
        }

        _claimable[snapshot.currency][_platformWallet] += toPlatform;
        _claimable[snapshot.currency][auction.guarantor] += toGuarantor;
        _claimable[snapshot.currency][auction.notary] += toNotary;
        emit FeeCredited(snapshot.currency, _platformWallet, toPlatform);
        emit FeeCredited(snapshot.currency, auction.guarantor, toGuarantor);
        emit FeeCredited(snapshot.currency, auction.notary, toNotary);
        emit Defaulted(auctionKey, roundNo, candidate, defaultFee);

        roundData.awardingIndex++;
        if (
            roundData.awardingIndex >= snapshot.maxRankedCandidates
                || roundData.awardingIndex >= roundData.topRanks.length
        ) {
            auction.status = Status.PASSED_IN;
            emit PassedIn(auctionKey, roundNo);
        } else {
            roundData.awardingDeadline = uint64(block.timestamp + snapshot.signingWindow);
            emit AwardingStarted(
                auctionKey,
                roundNo,
                roundData.topRanks[roundData.awardingIndex],
                roundData.awardingDeadline
            );
        }
    }

    function collected(
        bytes32 auctionKey,
        uint16 roundNo,
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
        Round storage roundData = _rounds[auctionKey][roundNo];
        if (auction.status != Status.COLLECTION) revert WrongPhase();
        if (block.timestamp > roundData.collectionDeadline) revert TooEarly();

        bytes32 structHash = keccak256(
            abi.encode(_COLLECTED_TYPEHASH, auctionKey, roundNo, nonce, expiry)
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

        auction.status = Status.CLAIM_PERIOD;
        roundData.claimPeriodEnd = uint64(block.timestamp + snapshot.claimWindow);
        emit Collected(auctionKey, roundNo);
        emit ClaimPeriodStarted(auctionKey, roundNo, false);
    }

    function expireCollection(
        bytes32 auctionKey,
        uint16 roundNo
    ) external onlyDelegateCall onlyRelayer {
        Auction storage auction = _auctions[auctionKey];
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot storage snapshot = _auctionConfigSnapshots[
            auctionKey
        ];
        Round storage roundData = _rounds[auctionKey][roundNo];
        if (auction.status != Status.COLLECTION) revert WrongPhase();
        if (block.timestamp <= roundData.collectionDeadline) revert TooEarly();

        auction.status = Status.CLAIM_PERIOD;
        roundData.claimPeriodEnd = roundData.collectionDeadline + snapshot.claimWindow;
        emit ClaimPeriodStarted(auctionKey, roundNo, true);
    }

    function withdrawRefund(
        bytes32 auctionKey,
        uint16 roundNo,
        address bidder,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyDelegateCall onlyRelayer nonReentrant {
        Auction storage auction = _auctions[auctionKey];
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot storage snapshot = _auctionConfigSnapshots[
            auctionKey
        ];
        Round storage roundData = _rounds[auctionKey][roundNo];
        Stake storage bidderStake = _stakes[auctionKey][roundNo][bidder];

        bytes32 structHash = keccak256(
            abi.encode(_WITHDRAW_REQUEST_TYPEHASH, auctionKey, roundNo, bidder, nonce, expiry)
        );
        if (
            !_verifySig(
                bidder,
                structHash,
                nonce,
                expiry,
                abi.encodePacked(r, s, v)
            )
        ) revert BadSignature();
        if (bidderStake.myBid == 0) revert NothingToClaim();
        if (bidderStake.withdrawn) revert AlreadyWithdrawn();
        if (bidder == roundData.winner) revert WinnerCannotWithdraw();

        bool isRanked;
        bool isDefaulted;
        for (uint256 i = 0; i < roundData.topRanks.length; i++) {
            if (roundData.topRanks[i] == bidder) {
                isRanked = true;
                isDefaulted = i < roundData.awardingIndex;
                break;
            }
        }

        if (auction.status == Status.SCHEDULED || auction.status == Status.OPEN) {
            if (block.timestamp < roundData.closeAt) revert TooEarly();
            if (isRanked) revert NotRefundable();
        } else if (auction.status == Status.AWARDING) {
            if (!isDefaulted && isRanked) revert TooEarly();
        } else if (
            auction.status == Status.COLLECTION
                || auction.status == Status.CLAIM_PERIOD
                || auction.status == Status.SETTLED
        ) {
            if (isRanked && !isDefaulted && roundData.winner == address(0)) revert TooEarly();
        } else if (auction.status != Status.PASSED_IN) {
            revert NotRefundable();
        }

        bidderStake.withdrawn = true;
        uint128 gross = bidderStake.myBid;
        uint128 fee = gross < snapshot.withdrawalFee ? gross : snapshot.withdrawalFee;
        uint128 net = gross - fee;
        if (fee > 0) _claimable[snapshot.currency][_platformWallet] += fee;
        _safeTransfer(snapshot.currency, bidder, net);
        emit Withdrawal(auctionKey, roundNo, bidder, snapshot.currency, 0, gross, fee, net);
    }

    function withdrawConsignor(
        bytes32 auctionKey,
        uint16 roundNo,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyDelegateCall onlyRelayer nonReentrant {
        Auction storage auction = _auctions[auctionKey];
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot storage snapshot = _auctionConfigSnapshots[
            auctionKey
        ];
        Round storage roundData = _rounds[auctionKey][roundNo];
        if (auction.status != Status.CLAIM_PERIOD) revert WrongPhase();
        if (block.timestamp < roundData.claimPeriodEnd) revert TooEarly();
        if (
            !ParalelAuctionV3PolicyRegistry(_policyRegistry).requiredDocumentsComplete(
                auctionKey,
                roundNo
            )
        ) revert RequiredDocumentsMissing();

        bytes32 structHash = keccak256(
            abi.encode(_WITHDRAW_REQUEST_TYPEHASH, auctionKey, roundNo, auction.consignor, nonce, expiry)
        );
        if (
            !_verifySig(
                auction.consignor,
                structHash,
                nonce,
                expiry,
                abi.encodePacked(r, s, v)
            )
        ) revert BadSignature();

        auction.status = Status.SETTLED;
        uint128 stake = roundData.winnerStake;
        uint128 toPlatform = uint128((uint256(stake) * auction.platformBps) / _BPS_DENOMINATOR);
        uint128 toGuarantor = uint128((uint256(stake) * auction.guarantorBps) / _BPS_DENOMINATOR);
        uint128 toNotary = uint128((uint256(stake) * auction.notaryBps) / _BPS_DENOMINATOR);
        uint128 toTax = uint128((uint256(stake) * auction.taxBps) / _BPS_DENOMINATOR);
        uint128 consignorShare = stake - toPlatform - toGuarantor - toNotary - toTax;

        _claimable[snapshot.currency][_platformWallet] += toPlatform;
        _claimable[snapshot.currency][auction.guarantor] += toGuarantor;
        _claimable[snapshot.currency][auction.notary] += toNotary;
        _claimable[snapshot.currency][snapshot.taxWallet] += toTax;
        emit FeeCredited(snapshot.currency, _platformWallet, toPlatform);
        emit FeeCredited(snapshot.currency, auction.guarantor, toGuarantor);
        emit FeeCredited(snapshot.currency, auction.notary, toNotary);
        emit FeeCredited(snapshot.currency, snapshot.taxWallet, toTax);

        uint128 fee = consignorShare < snapshot.withdrawalFee
            ? consignorShare
            : snapshot.withdrawalFee;
        uint128 net = consignorShare - fee;
        if (fee > 0) _claimable[snapshot.currency][_platformWallet] += fee;
        _safeTransfer(snapshot.currency, auction.consignor, net);
        emit Settled(auctionKey, roundNo);
        emit Withdrawal(
            auctionKey,
            roundNo,
            auction.consignor,
            snapshot.currency,
            1,
            consignorShare,
            fee,
            net
        );
    }

    function withdrawClaimable() external onlyDelegateCall nonReentrant {
        _withdrawClaimable(
            ParalelAuctionV3PolicyRegistry(_policyRegistry).defaultCurrency()
        );
    }

    function withdrawClaimable(address currency) external onlyDelegateCall nonReentrant {
        _withdrawClaimable(currency);
    }

    function _withdrawClaimable(address currency) internal {
        uint128 amount = _claimable[currency][msg.sender];
        if (amount == 0) revert NothingToClaim();
        _claimable[currency][msg.sender] = 0;
        _safeTransfer(currency, msg.sender, amount);
        emit Withdrawal(bytes32(0), 0, msg.sender, currency, 2, amount, 0, amount);
    }
}
