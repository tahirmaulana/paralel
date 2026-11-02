// @file contracts/script/RegisterDummy.s.sol — Register a dummy auction for UI testing
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract RegisterDummy is Script {
    function run() external {
        address contractAddress = vm.envAddress("AUCTION_CONTRACT_ADDRESS");
        uint256 notaryKey = vm.envUint("NOTARY_PRIVATE_KEY");
        uint256 consignorKey = vm.envUint("CONSIGNOR_PRIVATE_KEY");
        
        address notary = vm.addr(notaryKey);
        address consignor = vm.addr(consignorKey);
        address guarantor = vm.envAddress("GUARANTOR_WALLET");

        ParalelAuction auction = ParalelAuction(contractAddress);

        // GUNAKAN NAMA BARU AGAR TIDAK BENTROK DENGAN LELANG SEBELUMNYA
        bytes32 auctionKey = keccak256(abi.encodePacked("AUCTION-TEST-2"));
        bytes32 confHash = keccak256(abi.encodePacked("CODE-123"));

        bytes32 notaryHash = keccak256(abi.encode(auction.NOTARY_APPROVAL_TYPEHASH(), auctionKey, confHash));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), notaryHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryKey, digest);
        bytes memory notarySig = abi.encodePacked(r, s, v);

        bytes32 consHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, confHash));
        digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), consHash));
        (v, r, s) = vm.sign(consignorKey, digest);
        bytes memory consignorSig = abi.encodePacked(r, s, v);

        ParalelAuction.RegisterAuctionParams memory p = ParalelAuction.RegisterAuctionParams({
            auctionKey: auctionKey, 
            consignor: consignor, 
            guarantor: guarantor, 
            notary: notary,
            category: 1, 
            specHash: keccak256(abi.encodePacked("SPEC-2")), 
            startingBid: 10e6,      // <-- DIUBAH: 10 USDC (10 * 10^6)
            bidIncrement: 500000,   // <-- DIUBAH: 0.5 USDC (500,000 * 10^6 / 10^6)
            openAt: uint64(block.timestamp + 49 hours), 
            durationHours: 24, 
            platformBps: 250, 
            guarantorBps: 150, 
            notaryBps: 100, 
            taxBps: 1000,
            confirmationCodeHash: confHash, 
            notarySig: notarySig, 
            consignorSig: consignorSig
        });

        vm.startBroadcast();
        auction.registerAuction(p);
        vm.stopBroadcast();

        console.log("==========================================");
        console.log("Dummy Auction 2 Registered!");
        console.log("AUCTION_KEY:");
        console.logBytes32(auctionKey);
        console.log("==========================================");
    }
}