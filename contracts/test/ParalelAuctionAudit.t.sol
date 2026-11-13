// @file contracts/test/ParalelAuctionAudit.t.sol — Fail-first tests untuk audit spesifikasi
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ParalelAuctionAuditTest is Test {
    ParalelAuction public auction;
    MockERC20 public usdc;
    
    address public platform = address(100);
    address public tax = address(101);
    address public relayer = address(102);
    
    uint256 public notaryKey = 0xA11CE;
    uint256 public guarantorKey = 0xB0B; 
    uint256 public consignorKey = 0xC0C; 
    
    address public notary = vm.addr(notaryKey);
    address public guarantor = vm.addr(guarantorKey);
    address public consignor = vm.addr(consignorKey);

    bytes32 public auctionKey = keccak256(abi.encodePacked("AUCTION-AUDIT"));
    bytes32 public confHash = keccak256(abi.encodePacked("CODE-AUDIT"));

    function setUp() public {
        usdc = new MockERC20();
        auction = new ParalelAuction(address(usdc), platform, tax, relayer);
        
        auction.setPartner(notary, ParalelAuction.PartnerType.NOTARY, 0, true);
        auction.setPartner(guarantor, ParalelAuction.PartnerType.GUARANTOR, 1, true);
        _registerHelper();
    }

    function _registerHelper() internal {
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
            category: 1, specHash: keccak256(abi.encodePacked("SPEC")), startingBid: startBid, bidIncrement: inc,
            openAt: openAt, durationHours: dur,
            confirmationCodeHash: confHash, notarySig: notarySig, consignorSig: consignorSig,
            notaryNonce: 0, notaryExpiry: currentExpiry, consignorNonce: 0, consignorExpiry: currentExpiry
        });

        vm.prank(relayer);
        auction.registerAuction(p);
    }

    function test_statusOf_should_return_CLOSED() public {
        ParalelAuction.Round memory rd = auction.getRound(auctionKey, 1);
        vm.warp(rd.closeAt + 1);
        assertEq(uint8(auction.statusOf(auctionKey)), uint8(ParalelAuction.Status.CLOSED), "Status seharusnya CLOSED");
    }

    function test_startAwarding_fake_round_should_revert() public {
        ParalelAuction.Round memory rd = auction.getRound(auctionKey, 1);
        vm.warp(rd.closeAt + 1);

        vm.prank(relayer);
        vm.expectRevert(); 
        auction.startAwarding(auctionKey, 99);
    }

    function test_withdrawRefund_rank11_after_closeAt_should_work() public {
        for (uint160 i = 1; i <= 10; i++) {
            address b = address(i);
            usdc.mint(b, 2000e6);
            vm.prank(b); usdc.approve(address(auction), type(uint256).max);
            vm.prank(b); auction.placeBid(auctionKey, 1, uint128(i * 5e6)); 
        }
        
        uint256 bidder11Key = 0xD11;
        address bidder11 = vm.addr(bidder11Key);
        usdc.mint(bidder11, 2000e6);
        vm.prank(bidder11); usdc.approve(address(auction), type(uint256).max);
        vm.prank(bidder11); auction.placeBid(auctionKey, 1, 5e6);
        
        ParalelAuction.Round memory rd = auction.getRound(auctionKey, 1);
        vm.warp(rd.closeAt + 1); 

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.WITHDRAW_REQUEST_TYPEHASH(), auctionKey, uint16(1), bidder11, uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 sigV, bytes32 sigR, bytes32 sigS) = vm.sign(bidder11Key, digest);

        vm.prank(relayer);
        auction.withdrawRefund(auctionKey, 1, bidder11, 0, currentExpiry, sigV, sigR, sigS);
    }

    function test_setRelayer_and_transferOwnership() public {
        address newRelayer = address(999);
        address newOwner = address(888);

        vm.prank(newOwner);
        vm.expectRevert(); 
        auction.setRelayer(newRelayer);

        auction.setRelayer(newRelayer);
        assertEq(auction.relayerWallet(), newRelayer, "Relayer tidak berubah");

        auction.transferOwnership(newOwner);
        assertEq(auction.owner(), newOwner, "Owner tidak berubah");

        vm.expectRevert();
        auction.setRelayer(address(777));
    }

    function test_replayAttack_reuseRound() public {
        ParalelAuction.Round memory rd1 = auction.getRound(auctionKey, 1);
        
        // 1. Selesaikan putaran 1 tanpa bid (PASSED_IN)
        vm.warp(rd1.closeAt + 1);
        vm.prank(relayer); auction.startAwarding(auctionKey, 1);

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, bytes32(0), uint256(1), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(consignorKey, digest);

        uint64 newOpenAt = uint64(block.timestamp + 49 hours);

        // 2. Eksekusi re-use pertama (Putaran 2)
        vm.prank(relayer);
        auction.reuseRound(auctionKey, 1000e6, 5e6, newOpenAt, 24, 1, currentExpiry, v, r, s);

        ParalelAuction.Round memory rd2 = auction.getRound(auctionKey, 2);
        
        // 3. Selesaikan putaran 2 tanpa bid (PASSED_IN lagi)
        vm.warp(rd2.closeAt + 1);
        vm.prank(relayer); auction.startAwarding(auctionKey, 2);

        // 4. HACKER MENGGUNAKAN ULANG TANDA TANGAN (nonce 1)
        uint64 hackerOpenAt = uint64(block.timestamp + 50 hours);
        
        // KUNCI PERBAIKAN: Gunakan 100 hari ke depan agar mutlak tidak kena SignatureExpired
        uint256 replayExpiry = block.timestamp + 100 days;
        
        bytes32 replayHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, bytes32(0), uint256(1), replayExpiry));
        bytes32 replayDigest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), replayHash));
        (uint8 hackerV, bytes32 hackerR, bytes32 hackerS) = vm.sign(consignorKey, replayDigest);
        
        vm.prank(relayer);
        // Kontrak HARUS me-revert karena nonce 1 sudah dipakai
        vm.expectRevert(ParalelAuction.NonceUsed.selector); 
        auction.reuseRound(auctionKey, 1000e6, 5e6, hackerOpenAt, 24, 1, replayExpiry, hackerV, hackerR, hackerS);
    }
}