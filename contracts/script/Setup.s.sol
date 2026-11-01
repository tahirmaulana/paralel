// @file contracts/script/Setup.s.sol — Setup script to register partners
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract Setup is Script {
    function run() external {
        address contractAddress = vm.envAddress("AUCTION_CONTRACT_ADDRESS");
        address notary = vm.envAddress("NOTARY_WALLET");
        address guarantor = vm.envAddress("GUARANTOR_WALLET");

        ParalelAuction auction = ParalelAuction(contractAddress);

        vm.startBroadcast();

        // Daftarkan Notary (Tipe 0)
        auction.setPartner(notary, ParalelAuction.PartnerType.NOTARY, 0, true);
        console.log("Notary registered:", notary);

        // Daftarkan Guarantor (Tipe 1, Kategori 1 = Otomotif)
        auction.setPartner(guarantor, ParalelAuction.PartnerType.GUARANTOR, 1, true);
        console.log("Guarantor registered:", guarantor);

        vm.stopBroadcast();
    }
}