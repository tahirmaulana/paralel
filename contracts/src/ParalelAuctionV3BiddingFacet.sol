// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Permit} from "./interfaces/IERC20Permit.sol";
import {ParalelAuctionV3Storage} from "./ParalelAuctionV3Storage.sol";
import {ParalelAuctionV3PolicyLib} from "./ParalelAuctionV3PolicyLib.sol";

contract ParalelAuctionV3BiddingFacet is ParalelAuctionV3Storage {
    function placeBid(
        bytes32 auctionKey,
        uint16 roundNo,
        uint128 amount
    ) external onlyDelegateCall nonReentrant {
        _placeBid(auctionKey, roundNo, amount);
    }

    function placeBidWithPermit(
        bytes32 auctionKey,
        uint16 roundNo,
        uint128 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyDelegateCall nonReentrant {
        address currency = _auctionConfigSnapshots[auctionKey].currency;
        Stake storage bidderStake = _stakes[auctionKey][roundNo][msg.sender];
        uint128 totalRequired = amount;
        if (bidderStake.myBid == 0) totalRequired += _rounds[auctionKey][roundNo].startingBid;
        IERC20Permit(currency).permit(
            msg.sender,
            address(this),
            totalRequired,
            deadline,
            v,
            r,
            s
        );
        _placeBid(auctionKey, roundNo, amount);
    }

    function _placeBid(
        bytes32 auctionKey,
        uint16 roundNo,
        uint128 amount
    ) internal {
        Auction storage auction = _auctions[auctionKey];
        ParalelAuctionV3PolicyLib.AuctionConfigSnapshot storage snapshot = _auctionConfigSnapshots[
            auctionKey
        ];
        Round storage roundData = _rounds[auctionKey][roundNo];

        if (roundData.closeAt == 0 || block.timestamp >= roundData.closeAt) revert BiddingClosed();
        if (auction.status != Status.SCHEDULED && auction.status != Status.OPEN) {
            revert AuctionNotBiddable();
        }
        if (!snapshot.preBidAllowed && block.timestamp < roundData.openAt) revert TooEarly();
        if (msg.sender == auction.consignor) revert ConsignorCannotBid();
        if (amount == 0 || amount % roundData.bidIncrement != 0) revert NotMultipleOfIncrement();

        Stake storage bidderStake = _stakes[auctionKey][roundNo][msg.sender];
        uint128 totalToTransfer = bidderStake.myBid == 0
            ? roundData.startingBid + amount
            : amount;
        bidderStake.myBid += totalToTransfer;
        bidderStake.reachedSeq = roundData.bidSeq;

        if (bidderStake.myBid > roundData.currentBid) {
            roundData.currentBid = bidderStake.myBid;
            roundData.currentLeader = msg.sender;
        }
        _updateTopRanks(auctionKey, roundNo, msg.sender);
        roundData.bidSeq++;
        _safeTransferFrom(snapshot.currency, msg.sender, address(this), totalToTransfer);

        emit BidPlaced(
            auctionKey,
            roundNo,
            msg.sender,
            amount,
            bidderStake.myBid,
            roundData.currentBid,
            bidderStake.reachedSeq,
            auction.status == Status.SCHEDULED
        );
    }

    function _updateTopRanks(bytes32 auctionKey, uint16 roundNo, address bidder) internal {
        Round storage roundData = _rounds[auctionKey][roundNo];
        uint256 rankLimit = _auctionConfigSnapshots[auctionKey].maxRankedCandidates;
        Stake storage newStake = _stakes[auctionKey][roundNo][bidder];

        for (uint256 i = 0; i < roundData.topRanks.length; i++) {
            if (roundData.topRanks[i] == bidder) {
                for (uint256 j = i; j + 1 < roundData.topRanks.length; j++) {
                    roundData.topRanks[j] = roundData.topRanks[j + 1];
                }
                roundData.topRanks.pop();
                break;
            }
        }

        uint256 insertIndex = roundData.topRanks.length;
        for (uint256 i = 0; i < roundData.topRanks.length; i++) {
            Stake storage existingStake = _stakes[auctionKey][roundNo][roundData.topRanks[i]];
            if (
                newStake.myBid > existingStake.myBid
                    || (
                        newStake.myBid == existingStake.myBid
                            && newStake.reachedSeq < existingStake.reachedSeq
                    )
            ) {
                insertIndex = i;
                break;
            }
        }

        if (roundData.topRanks.length < rankLimit) {
            if (insertIndex == roundData.topRanks.length) {
                roundData.topRanks.push(bidder);
            } else {
                roundData.topRanks.push(roundData.topRanks[roundData.topRanks.length - 1]);
                for (uint256 i = roundData.topRanks.length - 1; i > insertIndex; i--) {
                    roundData.topRanks[i] = roundData.topRanks[i - 1];
                }
                roundData.topRanks[insertIndex] = bidder;
            }
        } else if (insertIndex < rankLimit) {
            for (uint256 i = rankLimit - 1; i > insertIndex; i--) {
                roundData.topRanks[i] = roundData.topRanks[i - 1];
            }
            roundData.topRanks[insertIndex] = bidder;
        }
    }
}
