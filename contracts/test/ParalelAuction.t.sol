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
        
        bytes32 notaryHash = keccak256(abi.encode(auction.NOTARY_APPROVAL_TYPEHASH(), auctionKey, confHash));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), notaryHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryKey, digest);
        bytes memory notarySig = abi.encodePacked(r, s, v);

        bytes32 consHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, confHash));
        digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), consHash));
        (v, r, s) = vm.sign(consignorKey, digest);
        bytes memory consignorSig = abi.encodePacked(r, s, v);

        ParalelAuction.RegisterAuctionParams memory p = ParalelAuction.RegisterAuctionParams({
            auctionKey: auctionKey, consignor: consignor, guarantor: guarantor, notary: notary,
            category: 1, specHash: specHash, startingBid: 1000e6, bidIncrement: 5e6,
            openAt: openAt, durationHours: 24, platformBps: 250, guarantorBps: 150, notaryBps: 100, taxBps: 1000,
            confirmationCodeHash: confHash, notarySig: notarySig, consignorSig: consignorSig
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
        (address c, address g, address n, , , , , , , , ) = auction.auctions(auctionKey);
        assertEq(c, consignor);
        assertEq(g, guarantor);
        assertEq(n, notary);
    }

    function test_PlaceBid() public {
        _registerHelper();
        _placeBidHelper();
        
        (uint128 myBid, uint64 reachedSeq, bool withdrawn) = auction.stakes(auctionKey, 1, bidder);
        assertEq(myBid, 1010e6, "myBid incorrect");
        assertEq(reachedSeq, 0, "seq incorrect");
        assertEq(withdrawn, false);

        (, , , , uint128 currentBid, address currentLeader, , , , , , , ) = auction.rounds(auctionKey, 1);
        assertEq(currentBid, 1010e6, "currentBid incorrect");
        assertEq(currentLeader, bidder, "currentLeader incorrect");
    }

    function test_StartAwarding_PassedIn() public {
        _registerHelper();
        (, , , uint64 closeAt, , , , , , , , , ) = auction.rounds(auctionKey, 1);
        vm.warp(closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        (, , , , ParalelAuction.Status status, , , , , , ) = auction.auctions(auctionKey);
        assertEq(uint8(status), uint8(ParalelAuction.Status.PASSED_IN));
    }

    function test_StartAwarding_And_Sign() public {
        _registerHelper();
        _placeBidHelper();

        (, , , uint64 closeAt, , , , , , , , , ) = auction.rounds(auctionKey, 1);
        vm.warp(closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        (, , , , ParalelAuction.Status status, , , , , , ) = auction.auctions(auctionKey);
        assertEq(uint8(status), uint8(ParalelAuction.Status.AWARDING));

        bytes32 structHash = keccak256(abi.encode(auction.AWARD_SIGN_TYPEHASH(), auctionKey, uint16(1), uint8(0)));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(bidderKey, digest);

        vm.prank(relayer);
        auction.submitAwardSignature(auctionKey, 1, v, r, s);

        (, , , , ParalelAuction.Status newStatus, , , , , , ) = auction.auctions(auctionKey);
        assertEq(uint8(newStatus), uint8(ParalelAuction.Status.COLLECTION));
        
        (, , , , , , , , , address winner, , , ) = auction.rounds(auctionKey, 1);
        assertEq(winner, bidder);
    }

    function test_AdvanceCandidate_Defaulted() public {
        _registerHelper();
        _placeBidHelper();

        (, , , uint64 closeAt, , , , , , , , , ) = auction.rounds(auctionKey, 1);
        vm.warp(closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        vm.warp(block.timestamp + 5 minutes + 1);

        vm.prank(relayer);
        auction.advanceCandidate(auctionKey, 1);

        (, , , , ParalelAuction.Status status, , , , , , ) = auction.auctions(auctionKey);
        assertEq(uint8(status), uint8(ParalelAuction.Status.PASSED_IN));

        (uint128 myBid, , ) = auction.stakes(auctionKey, 1, bidder);
        assertEq(myBid, 959.5e6);
    }

    function test_WithdrawRefund_PassedIn() public {
        _registerHelper();
        _placeBidHelper();

        (, , , uint64 closeAt, , , , , , , , , ) = auction.rounds(auctionKey, 1);
        vm.warp(closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        vm.warp(block.timestamp + 5 minutes + 1);
        vm.prank(relayer);
        auction.advanceCandidate(auctionKey, 1);

        bytes32 structHash = keccak256(abi.encode(auction.WITHDRAW_REQUEST_TYPEHASH(), auctionKey, uint16(1), bidder));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(bidderKey, digest);

        uint256 balBefore = usdc.balanceOf(bidder);
        
        // Perbaikan: Relayer yang memanggil kontrak
        vm.prank(relayer);
        auction.withdrawRefund(auctionKey, 1, bidder, v, r, s);

        uint256 balAfter = usdc.balanceOf(bidder);
        assertEq(balAfter - balBefore, 957e6, "Refund amount incorrect");

        // Total claimable platform = 25.25 (dari Default Fee) + 2.5 (dari Withdrawal Fee)
        assertEq(auction.claimable(platform), 27.75e6, "Platform claimable incorrect");
    }
}