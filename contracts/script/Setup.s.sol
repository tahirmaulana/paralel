// @file contracts/script/Setup.s.sol — Setup script to register partners
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract Setup is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        address ownerWallet = vm.envAddress("OWNER_PLATFORM_WALLET");
        
        address contractAddress = vm.envAddress("AUCTION_CONTRACT_ADDRESS");
        address notary = vm.envAddress("NOTARY_WALLET");
        address guarantor = vm.envAddress("GUARANTOR_WALLET");

        ParalelAuction auction = ParalelAuction(contractAddress);
        require(vm.addr(ownerPrivateKey) == ownerWallet, "OWNER_PRIVATE_KEY does not match OWNER_PLATFORM_WALLET");
        require(auction.owner() == ownerWallet, "OWNER_PLATFORM_WALLET is not contract owner");

        (
            uint16 platformBps,
            uint16 guarantorBps,
            uint16 notaryBps,
            uint16 taxBps,
            uint16 defaultFeeBps,
            uint128 withdrawalFee
        ) = auction.feeConfig();

        vm.startBroadcast(ownerPrivateKey);

        auction.setFeeConfig(
            ParalelAuction.FeeConfig({
                platformBps: platformBps,
                guarantorBps: guarantorBps,
                notaryBps: notaryBps,
                taxBps: taxBps,
                defaultFeeBps: defaultFeeBps,
                withdrawalFee: withdrawalFee
            })
        );
        console.log("Current fee configuration emitted");

        auction.setPartner(notary, ParalelAuction.PartnerType.NOTARY, 0, true);
        console.log("Notary registered:", notary);

        auction.setPartner(guarantor, ParalelAuction.PartnerType.GUARANTOR, 1, true);
        console.log("Guarantor registered:", guarantor);

        vm.stopBroadcast();
    }
}