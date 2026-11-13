import type { Abi } from 'viem';

export const ParalelAuctionV3Abi = [
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "facetForSelector",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "AlreadyWithdrawn",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuctionExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AuctionNotBiddable",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BadSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BiddingClosed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CategoryMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConsignorCannotBid",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DirectFacetCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DocumentAlreadyAnchored",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DocumentNotConfigured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FacetNotConfigured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "IncrementTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidConfiguration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDuration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidIncrement",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidOpenTime",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NonceUsed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotCurrentCandidate",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotMultipleOfIncrement",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRefundable",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRelayer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NothingToClaim",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PartnerNotRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RequiredDocumentsMissing",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SignatureExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokenTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooEarly",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedDocumentSigner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnsupportedCurrency",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WinnerCannotWithdraw",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongPhase",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "consignor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "guarantor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "notary",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "specHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "startingBid",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "bidIncrement",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "openAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "durationHours",
        "type": "uint16"
      }
    ],
    "name": "AuctionRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      }
    ],
    "name": "AwardSigned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "candidate",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "deadline",
        "type": "uint64"
      }
    ],
    "name": "AwardingStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "bidder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "added",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "myBidAfter",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "currentBidAfter",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "seq",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isPreBid",
        "type": "bool"
      }
    ],
    "name": "BidPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "autoIssued",
        "type": "bool"
      }
    ],
    "name": "ClaimPeriodStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "Closed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "Collected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "candidate",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "defaultFee",
        "type": "uint128"
      }
    ],
    "name": "Defaulted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "FeeCredited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum ParalelAuctionV3Storage.PartnerType",
        "name": "partnerType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "category",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "PartnerUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "PassedIn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousRelayer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newRelayer",
        "type": "address"
      }
    ],
    "name": "RelayerUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "startingBid",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "bidIncrement",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "openAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "closeAt",
        "type": "uint64"
      }
    ],
    "name": "RoundScheduled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "Settled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousWallet",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newWallet",
        "type": "address"
      }
    ],
    "name": "TaxWalletUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "UserAdminUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "gross",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "fee",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "net",
        "type": "uint128"
      }
    ],
    "name": "Withdrawal",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "WithdrawnItem",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "documentVersion",
        "type": "uint32"
      },
      {
        "internalType": "bytes32",
        "name": "documentHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "documentURI",
        "type": "string"
      }
    ],
    "name": "anchorDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "version",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "termsHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "termsURI",
            "type": "string"
          },
          {
            "internalType": "uint64",
            "name": "effectiveFrom",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AgreementConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setAgreementConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "increment",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "setAllowedIncrement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "increment",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "setAllowedIncrement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionTimingConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setAuctionTimingConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "maxIncrementBps",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "preBidAllowed",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.BidConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setBidConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "supported",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "withdrawalFee",
        "type": "uint128"
      }
    ],
    "name": "setCurrencyConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "setDefaultCurrency",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "schemaVersion",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "required",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "authorizedRoles",
            "type": "uint8"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.DocumentConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setDocumentConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "platformBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "guarantorBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "notaryBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "taxBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "defaultFeeBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.FeeConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setFeeConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "internalType": "enum ParalelAuctionV3Storage.PartnerType",
        "name": "pType",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "category",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "setPartner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "newMaxRankedCandidates",
        "type": "uint8"
      }
    ],
    "name": "setRankingConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newRelayer",
        "type": "address"
      }
    ],
    "name": "setRelayer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newTaxWallet",
        "type": "address"
      }
    ],
    "name": "setTaxWallet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "setUserAdmin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "markWithdrawn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "auctionKey",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "consignor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "guarantor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "notary",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bytes32",
            "name": "specHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint128",
            "name": "startingBid",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "bidIncrement",
            "type": "uint128"
          },
          {
            "internalType": "uint64",
            "name": "openAt",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "durationHours",
            "type": "uint16"
          },
          {
            "internalType": "bytes32",
            "name": "confirmationCodeHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes",
            "name": "notarySig",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "consignorSig",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "notaryNonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "notaryExpiry",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "consignorNonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "consignorExpiry",
            "type": "uint256"
          }
        ],
        "internalType": "struct ParalelAuctionV3Storage.RegisterAuctionParams",
        "name": "p",
        "type": "tuple"
      }
    ],
    "name": "registerAuction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint128",
        "name": "startingBid",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "bidIncrement",
        "type": "uint128"
      },
      {
        "internalType": "uint64",
        "name": "openAt",
        "type": "uint64"
      },
      {
        "internalType": "uint16",
        "name": "durationHours",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "reuseRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "placeBid",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "placeBidWithPermit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "advanceCandidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "collected",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "expireCollection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "startAwarding",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "submitAwardSignature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "withdrawClaimable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawClaimable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "withdrawConsignor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "bidder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "withdrawRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "AWARD_SIGN_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "BPS_DENOMINATOR",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "COLLECTED_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CONSIGNOR_CONFIRM_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "NOTARY_APPROVAL_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "WITHDRAWN_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "WITHDRAW_REQUEST_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "agreementConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "version",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "termsHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "termsURI",
            "type": "string"
          },
          {
            "internalType": "uint64",
            "name": "effectiveFrom",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AgreementConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "increment",
        "type": "uint128"
      }
    ],
    "name": "allowedIncrements",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      }
    ],
    "name": "auctionConfigSnapshots",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "currency",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "currencyDecimals",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "taxWallet",
            "type": "address"
          },
          {
            "internalType": "uint16",
            "name": "defaultFeeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint128",
            "name": "withdrawalFee",
            "type": "uint128"
          },
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "maxIncrementBps",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "preBidAllowed",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "maxRankedCandidates",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "agreementVersion",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "agreementHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionConfigSnapshot",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "auctionTimingConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionTimingConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      }
    ],
    "name": "auctions",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "consignor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "guarantor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "notary",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "currency",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "enum ParalelAuctionV3Storage.Status",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "currentRound",
            "type": "uint16"
          },
          {
            "internalType": "bytes32",
            "name": "specHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint16",
            "name": "platformBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "guarantorBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "notaryBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "taxBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct ParalelAuctionV3Storage.Auction",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bidConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "maxIncrementBps",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "preBidAllowed",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.BidConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "claimable",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "claimableOf",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "claimableOf",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "currencyConfigs",
    "outputs": [
      {
        "internalType": "bool",
        "name": "supported",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "withdrawalFee",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "defaultCurrency",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      }
    ],
    "name": "documentConfigs",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "schemaVersion",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "required",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "authorizedRoles",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "platformBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "guarantorBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "notaryBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "taxBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "defaultFeeBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.FeeConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "version",
        "type": "uint32"
      }
    ],
    "name": "getAgreementConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "version",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "termsHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "termsURI",
            "type": "string"
          },
          {
            "internalType": "uint64",
            "name": "effectiveFrom",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AgreementConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "getAllowedIncrements",
    "outputs": [
      {
        "internalType": "uint128[]",
        "name": "",
        "type": "uint128[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllowedIncrements",
    "outputs": [
      {
        "internalType": "uint128[]",
        "name": "",
        "type": "uint128[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      }
    ],
    "name": "getAuction",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "consignor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "guarantor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "notary",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "currency",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "enum ParalelAuctionV3Storage.Status",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "currentRound",
            "type": "uint16"
          },
          {
            "internalType": "bytes32",
            "name": "specHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint16",
            "name": "platformBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "guarantorBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "notaryBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "taxBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct ParalelAuctionV3Storage.Auction",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      }
    ],
    "name": "getAuctionConfigSnapshot",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "currency",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "currencyDecimals",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "taxWallet",
            "type": "address"
          },
          {
            "internalType": "uint16",
            "name": "defaultFeeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint128",
            "name": "withdrawalFee",
            "type": "uint128"
          },
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "maxIncrementBps",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "preBidAllowed",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "maxRankedCandidates",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "agreementVersion",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "agreementHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionConfigSnapshot",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "documentVersion",
        "type": "uint32"
      }
    ],
    "name": "getDocumentAnchor",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "documentVersion",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "documentHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "documentURI",
            "type": "string"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.DocumentAnchor",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDocumentTypes",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "getRankedCandidates",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "getRound",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint128",
            "name": "startingBid",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "bidIncrement",
            "type": "uint128"
          },
          {
            "internalType": "uint64",
            "name": "openAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "closeAt",
            "type": "uint64"
          },
          {
            "internalType": "uint128",
            "name": "currentBid",
            "type": "uint128"
          },
          {
            "internalType": "address",
            "name": "currentLeader",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "bidSeq",
            "type": "uint64"
          },
          {
            "internalType": "address[]",
            "name": "topRanks",
            "type": "address[]"
          },
          {
            "internalType": "uint8",
            "name": "awardingIndex",
            "type": "uint8"
          },
          {
            "internalType": "uint64",
            "name": "awardingDeadline",
            "type": "uint64"
          },
          {
            "internalType": "address",
            "name": "winner",
            "type": "address"
          },
          {
            "internalType": "uint128",
            "name": "winnerStake",
            "type": "uint128"
          },
          {
            "internalType": "uint64",
            "name": "collectionDeadline",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "claimPeriodEnd",
            "type": "uint64"
          }
        ],
        "internalType": "struct ParalelAuctionV3Storage.Round",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "bidder",
        "type": "address"
      }
    ],
    "name": "getStake",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint128",
            "name": "myBid",
            "type": "uint128"
          },
          {
            "internalType": "uint64",
            "name": "reachedSeq",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "withdrawn",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3Storage.Stake",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSupportedCurrencies",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxRankedCandidates",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "nonces",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "partners",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum ParalelAuctionV3Storage.PartnerType",
            "name": "pType",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "category",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3Storage.Partner",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformWallet",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "policyRegistryAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "bidder",
        "type": "address"
      }
    ],
    "name": "refundableOf",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "gross",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "fee",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "net",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "relayerWallet",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "requiredDocumentsComplete",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "rounds",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "startingBid",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "bidIncrement",
        "type": "uint128"
      },
      {
        "internalType": "uint64",
        "name": "openAt",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "closeAt",
        "type": "uint64"
      },
      {
        "internalType": "uint128",
        "name": "currentBid",
        "type": "uint128"
      },
      {
        "internalType": "address",
        "name": "currentLeader",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "bidSeq",
        "type": "uint64"
      },
      {
        "internalType": "uint8",
        "name": "awardingIndex",
        "type": "uint8"
      },
      {
        "internalType": "uint64",
        "name": "awardingDeadline",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "winnerStake",
        "type": "uint128"
      },
      {
        "internalType": "uint64",
        "name": "collectionDeadline",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "claimPeriodEnd",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "bidder",
        "type": "address"
      }
    ],
    "name": "stakes",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint128",
            "name": "myBid",
            "type": "uint128"
          },
          {
            "internalType": "uint64",
            "name": "reachedSeq",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "withdrawn",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3Storage.Stake",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      }
    ],
    "name": "statusOf",
    "outputs": [
      {
        "internalType": "enum ParalelAuctionV3Storage.Status",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "taxWallet",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "userAdmins",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const satisfies Abi;

export const ParalelAuctionV3PolicyAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "usdc",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "DocumentNotConfigured",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidConfiguration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotAuctionContract",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "agreementConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "version",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "termsHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "termsURI",
            "type": "string"
          },
          {
            "internalType": "uint64",
            "name": "effectiveFrom",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AgreementConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "increment",
        "type": "uint128"
      }
    ],
    "name": "allowedIncrements",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "documentVersion",
        "type": "uint32"
      },
      {
        "internalType": "bytes32",
        "name": "documentHash",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "documentURI",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "signer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "auctionOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "isUserAdmin",
        "type": "bool"
      }
    ],
    "name": "anchorDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "auctionContract",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "auctionTimingConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionTimingConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bidConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "maxIncrementBps",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "preBidAllowed",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.BidConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "currencyConfigs",
    "outputs": [
      {
        "internalType": "bool",
        "name": "supported",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "withdrawalFee",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "defaultCurrency",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      }
    ],
    "name": "documentConfigs",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "schemaVersion",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "required",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "authorizedRoles",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "platformBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "guarantorBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "notaryBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "taxBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "defaultFeeBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.FeeConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "version",
        "type": "uint32"
      }
    ],
    "name": "getAgreementConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "version",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "termsHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "termsURI",
            "type": "string"
          },
          {
            "internalType": "uint64",
            "name": "effectiveFrom",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AgreementConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "getAllowedIncrements",
    "outputs": [
      {
        "internalType": "uint128[]",
        "name": "",
        "type": "uint128[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "documentVersion",
        "type": "uint32"
      }
    ],
    "name": "getDocumentAnchor",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "documentVersion",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "documentHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "documentURI",
            "type": "string"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.DocumentAnchor",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDocumentTypes",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSupportedCurrencies",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxRankedCandidates",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "requiredDocumentsComplete",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "version",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "termsHash",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "termsURI",
            "type": "string"
          },
          {
            "internalType": "uint64",
            "name": "effectiveFrom",
            "type": "uint64"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AgreementConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setAgreementConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "increment",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "setAllowedIncrement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newAuctionContract",
        "type": "address"
      }
    ],
    "name": "setAuctionContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      }
    ],
    "name": "setAuctionRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionTimingConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setAuctionTimingConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "maxIncrementBps",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "preBidAllowed",
            "type": "bool"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.BidConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setBidConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "supported",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      },
      {
        "internalType": "uint128",
        "name": "withdrawalFee",
        "type": "uint128"
      }
    ],
    "name": "setCurrencyConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "setDefaultCurrency",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "schemaVersion",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "required",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "authorizedRoles",
            "type": "uint8"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.DocumentConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setDocumentConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint16",
            "name": "platformBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "guarantorBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "notaryBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "taxBps",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "defaultFeeBps",
            "type": "uint16"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.FeeConfig",
        "name": "newConfig",
        "type": "tuple"
      }
    ],
    "name": "setFeeConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "newMaxRankedCandidates",
        "type": "uint8"
      }
    ],
    "name": "setRankingConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "consignor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "guarantor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "notary",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "taxWallet",
        "type": "address"
      }
    ],
    "name": "snapshotAuction",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "currency",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "currencyDecimals",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "taxWallet",
            "type": "address"
          },
          {
            "internalType": "uint16",
            "name": "defaultFeeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint128",
            "name": "withdrawalFee",
            "type": "uint128"
          },
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "maxIncrementBps",
            "type": "uint16"
          },
          {
            "internalType": "bool",
            "name": "preBidAllowed",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "maxRankedCandidates",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "agreementVersion",
            "type": "uint32"
          },
          {
            "internalType": "bytes32",
            "name": "agreementHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionConfigSnapshot",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "startingBid",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "bidIncrement",
        "type": "uint128"
      },
      {
        "internalType": "uint64",
        "name": "openAt",
        "type": "uint64"
      },
      {
        "internalType": "uint16",
        "name": "durationHours",
        "type": "uint16"
      }
    ],
    "name": "validateRegistrationRound",
    "outputs": [],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "startingBid",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "bidIncrement",
        "type": "uint128"
      },
      {
        "internalType": "uint64",
        "name": "openAt",
        "type": "uint64"
      },
      {
        "internalType": "uint16",
        "name": "durationHours",
        "type": "uint16"
      },
      {
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "maxIncrementBps",
        "type": "uint16"
      },
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "signingWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "collectionWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "claimWindow",
            "type": "uint32"
          },
          {
            "internalType": "uint16",
            "name": "minDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint16",
            "name": "maxDurationHours",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "minOpenDelay",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "maxOpenDelay",
            "type": "uint32"
          }
        ],
        "internalType": "struct ParalelAuctionV3PolicyLib.AuctionTimingConfig",
        "name": "timing",
        "type": "tuple"
      }
    ],
    "name": "validateRound",
    "outputs": [],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DocumentAlreadyAnchored",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "IncrementTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDuration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidIncrement",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidOpenTime",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedDocumentSigner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnsupportedCurrency",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "version",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "termsHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "termsURI",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "effectiveFrom",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "AgreementConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "increment",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "allowed",
        "type": "bool"
      }
    ],
    "name": "AllowedIncrementUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "signingWindow",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "collectionWindow",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "claimWindow",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "minDurationHours",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "maxDurationHours",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "minOpenDelay",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "maxOpenDelay",
        "type": "uint32"
      }
    ],
    "name": "AuctionTimingConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "maxIncrementBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "preBidAllowed",
        "type": "bool"
      }
    ],
    "name": "BidConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "currency",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "supported",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "withdrawalFee",
        "type": "uint128"
      }
    ],
    "name": "CurrencyConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousCurrency",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newCurrency",
        "type": "address"
      }
    ],
    "name": "DefaultCurrencyUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "auctionKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint16",
        "name": "roundNo",
        "type": "uint16"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "documentVersion",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "documentHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "documentURI",
        "type": "string"
      }
    ],
    "name": "DocumentAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "documentType",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "schemaVersion",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "required",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "authorizedRoles",
        "type": "uint8"
      }
    ],
    "name": "DocumentConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "platformBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "guarantorBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "notaryBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "taxBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "defaultFeeBps",
        "type": "uint16"
      }
    ],
    "name": "FeeConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "maxRankedCandidates",
        "type": "uint8"
      }
    ],
    "name": "RankingConfigUpdated",
    "type": "event"
  }
] as const satisfies Abi;
