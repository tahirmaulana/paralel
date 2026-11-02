// @file contracts/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address platform = vm.envAddress("PLATFORM_WALLET");
        address tax = vm.envAddress("TAX_WALLET");
        address relayer = vm.envAddress("RELAYER_WALLET");

        vm.startBroadcast(deployerPrivateKey);
        ParalelAuction auction = new ParalelAuction(usdc, platform, tax, relayer);
        vm.stopBroadcast();

        console.log("==========================================");
        console.log("ParalelAuction deployed successfully!");
        console.log("Address:", address(auction));
        console.log("==========================================");
    }
}