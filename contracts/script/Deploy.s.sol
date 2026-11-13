// @file contracts/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract Deploy is Script {
    function run() external {
        uint256 ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        address ownerWallet = vm.envAddress("OWNER_PLATFORM_WALLET");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address tax = vm.envAddress("TAX_WALLET");
        address relayer = vm.envAddress("RELAYER_WALLET");

        require(vm.addr(ownerPrivateKey) == ownerWallet, "OWNER_PRIVATE_KEY does not match OWNER_PLATFORM_WALLET");

        vm.startBroadcast(ownerPrivateKey);
        ParalelAuction auction = new ParalelAuction(usdc, ownerWallet, tax, relayer);
        vm.stopBroadcast();

        console.log("==========================================");
        console.log("ParalelAuction deployed successfully!");
        console.log("Address:", address(auction));
        console.log("==========================================");
    }
}