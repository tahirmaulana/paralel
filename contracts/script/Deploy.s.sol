// @file contracts/script/Deploy.s.sol — Deployment script for ParalelAuction
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract Deploy is Script {
    function run() external {
        // 1. Ambil environment variables dari file .env
        address usdc = vm.envAddress("USDC_ADDRESS");
        address platformWallet = vm.envAddress("PLATFORM_WALLET");
        address taxWallet = vm.envAddress("TAX_WALLET");
        address relayerWallet = vm.envAddress("RELAYER_WALLET");

        // 2. Mulai broadcast transaksi ke jaringan
        vm.startBroadcast();

        // 3. Deploy Kontrak
        ParalelAuction auction = new ParalelAuction(
            usdc,
            platformWallet,
            taxWallet,
            relayerWallet
        );

        vm.stopBroadcast();

        // 4. Print alamat kontrak yang baru di-deploy ke terminal
        console.log("==========================================");
        console.log("ParalelAuction deployed at:", address(auction));
        console.log("==========================================");
    }
}