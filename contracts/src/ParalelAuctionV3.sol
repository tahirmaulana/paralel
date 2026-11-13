// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ParalelAuctionV3Storage} from "./ParalelAuctionV3Storage.sol";
import {ParalelAuctionV3PolicyRegistry} from "./ParalelAuctionV3PolicyRegistry.sol";

contract ParalelAuctionV3 is ParalelAuctionV3Storage {
    constructor(
        address usdc,
        address platformWallet_,
        address taxWallet_,
        address relayerWallet_,
        address policyRegistry_,
        address[] memory facets,
        bytes4[][] memory selectors
    ) {
        if (
            usdc == address(0) || platformWallet_ == address(0) || taxWallet_ == address(0)
                || relayerWallet_ == address(0) || policyRegistry_.code.length == 0
                || facets.length == 0 || facets.length != selectors.length
        ) revert InvalidConfiguration();

        ParalelAuctionV3PolicyRegistry policy = ParalelAuctionV3PolicyRegistry(policyRegistry_);
        if (policy.owner() != msg.sender || policy.defaultCurrency() != usdc) {
            revert InvalidConfiguration();
        }

        _owner = msg.sender;
        _relayerWallet = relayerWallet_;
        _platformWallet = platformWallet_;
        _taxWallet = taxWallet_;
        _policyRegistry = policyRegistry_;
        _domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("ParalelAuction"),
                keccak256("3"),
                block.chainid,
                address(this)
            )
        );

        for (uint256 i = 0; i < facets.length; i++) {
            address facet = facets[i];
            if (facet.code.length == 0 || selectors[i].length == 0) revert InvalidConfiguration();
            for (uint256 j = 0; j < selectors[i].length; j++) {
                bytes4 selector = selectors[i][j];
                if (selector == bytes4(0) || selectorFacets[selector] != address(0)) {
                    revert InvalidConfiguration();
                }
                selectorFacets[selector] = facet;
            }
        }
    }

    function facetForSelector(bytes4 selector) external view returns (address) {
        return selectorFacets[selector];
    }

    fallback() external payable {
        address facet = selectorFacets[msg.sig];
        if (facet == address(0)) revert FacetNotConfigured();
        assembly ("memory-safe") {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {
        revert InvalidConfiguration();
    }
}
