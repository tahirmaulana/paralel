// @file contracts/script/RegisterDummy.s.sol — Register a dummy auction for UI testing
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract RegisterDummy is Script {
    function run() external {
        address contractAddress = vm.envAddress("AUCTION_CONTRACT_ADDRESS");
        
        // Ambil private key
        uint256 notaryKey = vm.envUint("NOTARY_PRIVATE_KEY");
        uint256 consignorKey = vm.envUint("CONSIGNOR_PRIVATE_KEY");
        uint256 relayerKey = vm.envUint("RELAYER_PRIVATE_KEY"); // <-- TAMBAHAN
        
        address notary = vm.addr(notaryKey);
        address consignor = vm.addr(consignorKey);
        address guarantor = vm.envAddress("GUARANTOR_WALLET");

        ParalelAuction auction = ParalelAuction(contractAddress);

        bytes32 auctionKey = keccak256(abi.encodePacked("AUCTION-TEST-2"));
        bytes32 confHash = keccak256(abi.encodePacked("CODE-123"));
        
        uint128 startBid = 2e6;       // 2 USDC (2 * 10^6)
        uint128 inc = 50000;          // 0.05 USDC (0.05 * 10^6)
        
        uint64 openAt = uint64(block.timestamp + 49 hours);
        uint16 dur = 24;
        
        uint256 expiry = block.timestamp + 1 days;

        // 1. Hitung paramsHash untuk NotaryApproval
        bytes32 paramsHash = keccak256(abi.encode(startBid, inc, openAt, dur));
        
        // 2. Buat signature Notary
        bytes32 notaryHash = keccak256(abi.encode(auction.NOTARY_APPROVAL_TYPEHASH(), auctionKey, paramsHash, confHash, uint256(0), expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), notaryHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryKey, digest);
        bytes memory notarySig = abi.encodePacked(r, s, v);

        // 3. Buat signature Consignor
        bytes32 consHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, confHash, uint256(0), expiry));
        digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), consHash));
        (v, r, s) = vm.sign(consignorKey, digest);
        bytes memory consignorSig = abi.encodePacked(r, s, v);

        // 4. Masukkan ke struct
        ParalelAuction.RegisterAuctionParams memory p = ParalelAuction.RegisterAuctionParams({
            auctionKey: auctionKey, 
            consignor: consignor, 
            guarantor: guarantor, 
            notary: notary,
            category: 1, 
            specHash: keccak256(abi.encodePacked("SPEC-2")), 
            startingBid: startBid,
            bidIncrement: inc,
            openAt: openAt, 
            durationHours: dur, 
            platformBps: 250, 
            guarantorBps: 150, 
            notaryBps: 100, 
            taxBps: 1000,
            confirmationCodeHash: confHash, 
            notarySig: notarySig, 
            consignorSig: consignorSig,
            notaryNonce: 0, 
            notaryExpiry: expiry, 
            consignorNonce: 0, 
            consignorExpiry: expiry
        });

        // PENTING: Masukkan relayerKey agar transaksi diakui sebagai Relayer
        vm.startBroadcast(relayerKey);
        auction.registerAuction(p);
        vm.stopBroadcast();

        console.log("==========================================");
        console.log("Dummy Auction 2 Registered!");
        console.log("Starting Bid: 2 USDC");
        console.log("Bid Increment: 0.05 USDC");
        console.log("AUCTION_KEY:");
        console.logBytes32(auctionKey);
        console.log("==========================================");
    }
}