// @file contracts/test/ParalelAuction.t.sol — Unit tests for core auction logic
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ParalelAuctionTest is Test {
    ParalelAuction public auction;
    MockERC20 public usdc;
    
    address public platform = address(1);
    address public tax = address(2);
    address public relayer = address(3);
    
    uint256 public notaryKey = 0xA11CE;
    uint256 public guarantorKey = 0xB0B; 
    uint256 public consignorKey = 0xC0C; 
    uint256 public bidderKey = 0xD0D;
    
    address public notary = vm.addr(notaryKey);
    address public guarantor = vm.addr(guarantorKey);
    address public consignor = vm.addr(consignorKey);
    address public bidder = vm.addr(bidderKey);

    bytes32 public auctionKey = keccak256(abi.encodePacked("AUCTION-1"));
    bytes32 public confHash = keccak256(abi.encodePacked("CODE-123"));

    function setUp() public {
        usdc = new MockERC20();
        auction = new ParalelAuction(address(usdc), platform, tax, relayer);
        
        auction.setPartner(notary, ParalelAuction.PartnerType.NOTARY, 0, true);
        auction.setPartner(guarantor, ParalelAuction.PartnerType.GUARANTOR, 1, true);
    }

    function _registerHelper() internal {
        bytes32 specHash = keccak256(abi.encodePacked("SPEC-1"));
        uint64 openAt = uint64(block.timestamp + 49 hours);
        uint256 currentExpiry = block.timestamp + 1 days;
        
        uint128 startBid = 1000e6;
        uint128 inc = 5e6;
        uint16 dur = 24;

        bytes32 paramsHash = keccak256(abi.encode(startBid, inc, openAt, dur));
        bytes32 notaryHash = keccak256(abi.encode(auction.NOTARY_APPROVAL_TYPEHASH(), auctionKey, paramsHash, confHash, uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), notaryHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryKey, digest);
        bytes memory notarySig = abi.encodePacked(r, s, v);

        bytes32 consHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, confHash, uint256(0), currentExpiry));
        digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), consHash));
        (v, r, s) = vm.sign(consignorKey, digest);
        bytes memory consignorSig = abi.encodePacked(r, s, v);

        ParalelAuction.RegisterAuctionParams memory p = ParalelAuction.RegisterAuctionParams({
            auctionKey: auctionKey, consignor: consignor, guarantor: guarantor, notary: notary,
            category: 1, specHash: specHash, startingBid: startBid, bidIncrement: inc,
            openAt: openAt, durationHours: dur,
            confirmationCodeHash: confHash, notarySig: notarySig, consignorSig: consignorSig,
            notaryNonce: 0, notaryExpiry: currentExpiry, consignorNonce: 0, consignorExpiry: currentExpiry
        });

        vm.prank(relayer);
        auction.registerAuction(p);
    }

    function _placeBidHelper() internal {
        usdc.mint(bidder, 5000e6);
        vm.prank(bidder);
        usdc.approve(address(auction), type(uint256).max);

        vm.prank(bidder);
        auction.placeBid(auctionKey, 1, 10e6);
    }

    function test_RegisterAuction() public {
        _registerHelper();
        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(a.consignor, consignor);
        assertEq(a.guarantor, guarantor);
        assertEq(a.notary, notary);

        ParalelAuction.AuctionConfigSnapshot memory snapshot =
            auction.getAuctionConfigSnapshot(auctionKey);
        assertEq(snapshot.taxWallet, tax);
        assertEq(snapshot.defaultFeeBps, 500);
        assertEq(snapshot.withdrawalFee, 2_500_000);
        assertEq(snapshot.signingWindow, 5 minutes);
        assertEq(snapshot.collectionWindow, 48 hours);
        assertEq(snapshot.claimWindow, 168 hours);
        assertEq(snapshot.maxIncrementBps, 500);
        assertEq(snapshot.preBidAllowed, true);
        assertEq(snapshot.maxRankedCandidates, 10);
    }

    function test_GlobalConfigChangesDoNotMutateRegisteredAuction() public {
        _registerHelper();

        auction.setFeeConfig(ParalelAuction.FeeConfig({
            platformBps: 300,
            guarantorBps: 100,
            notaryBps: 100,
            taxBps: 500,
            defaultFeeBps: 500,
            withdrawalFee: 1_000_000
        }));
        auction.setTaxWallet(address(99));
        auction.setAuctionTimingConfig(ParalelAuction.AuctionTimingConfig({
            signingWindow: 1 minutes,
            collectionWindow: 24 hours,
            claimWindow: 72 hours,
            minDurationHours: 6,
            maxDurationHours: 24,
            minOpenDelay: 24 hours,
            maxOpenDelay: 96 hours
        }));
        auction.setBidConfig(ParalelAuction.BidConfig({
            maxIncrementBps: 1_000,
            preBidAllowed: false
        }));
        auction.setRankingConfig(5);

        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        ParalelAuction.AuctionConfigSnapshot memory snapshot =
            auction.getAuctionConfigSnapshot(auctionKey);
        assertEq(a.platformBps, 250);
        assertEq(a.guarantorBps, 150);
        assertEq(a.notaryBps, 100);
        assertEq(a.taxBps, 1_000);
        assertEq(snapshot.taxWallet, tax);
        assertEq(snapshot.withdrawalFee, 2_500_000);
        assertEq(snapshot.signingWindow, 5 minutes);
        assertEq(snapshot.collectionWindow, 48 hours);
        assertEq(snapshot.claimWindow, 168 hours);
        assertEq(snapshot.maxIncrementBps, 500);
        assertEq(snapshot.preBidAllowed, true);
        assertEq(snapshot.maxRankedCandidates, 10);
    }

    function test_ConfigSettersAreOwnerOnly() public {
        vm.prank(address(99));
        vm.expectRevert(ParalelAuction.NotOwner.selector);
        auction.setTaxWallet(address(100));

        vm.prank(address(99));
        vm.expectRevert(ParalelAuction.NotOwner.selector);
        auction.setRankingConfig(5);
    }

    function test_FeeConfigRejectsSettlementAbove100Percent() public {
        vm.expectRevert(ParalelAuction.InvalidConfiguration.selector);
        auction.setFeeConfig(ParalelAuction.FeeConfig({
            platformBps: 4_000,
            guarantorBps: 3_000,
            notaryBps: 2_000,
            taxBps: 2_000,
            defaultFeeBps: 500,
            withdrawalFee: 2_500_000
        }));
    }

    function test_DisablingPreBidAppliesOnlyToFutureAuctions() public {
        auction.setBidConfig(ParalelAuction.BidConfig({
            maxIncrementBps: 500,
            preBidAllowed: false
        }));
        _registerHelper();

        usdc.mint(bidder, 2_000e6);
        vm.prank(bidder);
        usdc.approve(address(auction), type(uint256).max);
        vm.prank(bidder);
        vm.expectRevert(ParalelAuction.TooEarly.selector);
        auction.placeBid(auctionKey, 1, 10e6);
    }

    function test_PlaceBid() public {
        _registerHelper();
        _placeBidHelper();
        
        ParalelAuction.Stake memory s = auction.getStake(auctionKey, 1, bidder);
        assertEq(s.myBid, 1010e6, "myBid incorrect");
        assertEq(s.reachedSeq, 0, "seq incorrect");
        assertEq(s.withdrawn, false);

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        assertEq(roundData.currentBid, 1010e6, "currentBid incorrect");
        assertEq(roundData.currentLeader, bidder, "currentLeader incorrect");
    }

    function test_StartAwarding_PassedIn() public {
        _registerHelper();
        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(uint8(a.status), uint8(ParalelAuction.Status.PASSED_IN));
    }

    function test_StartAwarding_And_Sign() public {
        _registerHelper();
        _placeBidHelper();

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.AWARD_SIGN_TYPEHASH(), auctionKey, uint16(1), uint8(0), uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 sigV, bytes32 sigR, bytes32 sigS) = vm.sign(bidderKey, digest);

        vm.prank(relayer);
        auction.submitAwardSignature(auctionKey, 1, 0, currentExpiry, sigV, sigR, sigS);

        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(uint8(a.status), uint8(ParalelAuction.Status.COLLECTION));
        
        // PERBAIKAN: Menggunakan roundDataAfter, bukan r2
        ParalelAuction.Round memory roundDataAfter = auction.getRound(auctionKey, 1);
        assertEq(roundDataAfter.winner, bidder);
    }

    function test_AdvanceCandidate_Defaulted() public {
        _registerHelper();
        _placeBidHelper();

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        vm.warp(block.timestamp + 5 minutes + 1);

        vm.prank(relayer);
        auction.advanceCandidate(auctionKey, 1);

        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(uint8(a.status), uint8(ParalelAuction.Status.PASSED_IN));

        ParalelAuction.Stake memory s = auction.getStake(auctionKey, 1, bidder);
        assertEq(s.myBid, 959.5e6);
    }

    function test_WithdrawRefund_PassedIn() public {
        _registerHelper();
        _placeBidHelper();

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        vm.warp(block.timestamp + 5 minutes + 1);
        vm.prank(relayer);
        auction.advanceCandidate(auctionKey, 1);

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.WITHDRAW_REQUEST_TYPEHASH(), auctionKey, uint16(1), bidder, uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 sigV, bytes32 sigR, bytes32 sigS) = vm.sign(bidderKey, digest);

        uint256 balBefore = usdc.balanceOf(bidder);
        
        vm.prank(relayer);
        auction.withdrawRefund(auctionKey, 1, bidder, 0, currentExpiry, sigV, sigR, sigS);

        uint256 balAfter = usdc.balanceOf(bidder);
        assertEq(balAfter - balBefore, 957e6, "Refund amount incorrect");

        assertEq(auction.claimableOf(platform), 27.75e6, "Platform claimable incorrect");
    }
}