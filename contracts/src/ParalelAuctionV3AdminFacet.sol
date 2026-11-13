// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ParalelAuctionV3Storage} from "./ParalelAuctionV3Storage.sol";
import {ParalelAuctionV3PolicyLib} from "./ParalelAuctionV3PolicyLib.sol";
import {ParalelAuctionV3PolicyRegistry} from "./ParalelAuctionV3PolicyRegistry.sol";

contract ParalelAuctionV3AdminFacet is ParalelAuctionV3Storage {
    function setPartner(
        address wallet,
        PartnerType pType,
        uint8 category,
        bool active
    ) external onlyDelegateCall onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        if (active && _userAdmins[wallet]) revert InvalidConfiguration();
        _partners[wallet] = Partner(pType, category, active);
        emit PartnerUpdated(wallet, pType, category, active);
    }

    function setUserAdmin(address wallet, bool active) external onlyDelegateCall onlyOwner {
        if (wallet == address(0)) revert ZeroAddress();
        if (active && _partners[wallet].active) revert InvalidConfiguration();
        _userAdmins[wallet] = active;
        emit UserAdminUpdated(wallet, active);
    }

    function setFeeConfig(
        ParalelAuctionV3PolicyLib.FeeConfig calldata newConfig
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setFeeConfig(newConfig);
    }

    function setTaxWallet(address newTaxWallet) external onlyDelegateCall onlyOwner {
        if (newTaxWallet == address(0)) revert ZeroAddress();
        address previousWallet = _taxWallet;
        _taxWallet = newTaxWallet;
        emit TaxWalletUpdated(previousWallet, newTaxWallet);
    }

    function setAuctionTimingConfig(
        ParalelAuctionV3PolicyLib.AuctionTimingConfig calldata newConfig
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setAuctionTimingConfig(newConfig);
    }

    function setCurrencyConfig(
        address currency,
        bool supported,
        uint8 decimals,
        uint128 withdrawalFee
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setCurrencyConfig(
            currency,
            supported,
            decimals,
            withdrawalFee
        );
    }

    function setDefaultCurrency(address currency) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setDefaultCurrency(currency);
    }

    function setAllowedIncrement(
        uint128 increment,
        bool allowed
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry registry = ParalelAuctionV3PolicyRegistry(_policyRegistry);
        registry.setAllowedIncrement(registry.defaultCurrency(), increment, allowed);
    }

    function setAllowedIncrement(
        address currency,
        uint128 increment,
        bool allowed
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setAllowedIncrement(
            currency,
            increment,
            allowed
        );
    }

    function setBidConfig(
        ParalelAuctionV3PolicyLib.BidConfig calldata newConfig
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setBidConfig(newConfig);
    }

    function setRankingConfig(
        uint8 newMaxRankedCandidates
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setRankingConfig(newMaxRankedCandidates);
    }

    function setAgreementConfig(
        ParalelAuctionV3PolicyLib.AgreementConfig calldata newConfig
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setAgreementConfig(newConfig);
    }

    function setDocumentConfig(
        bytes32 documentType,
        ParalelAuctionV3PolicyLib.DocumentConfig calldata newConfig
    ) external onlyDelegateCall onlyOwner {
        ParalelAuctionV3PolicyRegistry(_policyRegistry).setDocumentConfig(
            documentType,
            newConfig
        );
    }

    function anchorDocument(
        bytes32 auctionKey,
        uint16 roundNo,
        bytes32 documentType,
        uint32 documentVersion,
        bytes32 documentHash,
        string calldata documentURI
    ) external onlyDelegateCall {
        Auction storage auction = _auctions[auctionKey];
        if (auction.consignor == address(0)) revert DocumentNotConfigured();
        ParalelAuctionV3PolicyRegistry(_policyRegistry).anchorDocument(
            auctionKey,
            roundNo,
            documentType,
            documentVersion,
            documentHash,
            documentURI,
            msg.sender,
            _owner,
            _rounds[auctionKey][roundNo].winner,
            _userAdmins[msg.sender]
        );
    }

    function setRelayer(address newRelayer) external onlyDelegateCall onlyOwner {
        if (newRelayer == address(0)) revert ZeroAddress();
        address previousRelayer = _relayerWallet;
        _relayerWallet = newRelayer;
        emit RelayerUpdated(previousRelayer, newRelayer);
    }

    function transferOwnership(address newOwner) external onlyDelegateCall onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = _owner;
        ParalelAuctionV3PolicyRegistry(_policyRegistry).transferOwnership(newOwner);
        _owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
