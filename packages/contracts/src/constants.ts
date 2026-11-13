/**
 * Contract defaults and enums for the configurable ParalelAuction v3.
 *
 * The values below are initialization defaults only. Runtime policy is read
 * from the contract and snapshotted for each auction.
 */

export const PARALEL_CONTRACT_VERSION = 'v3' as const;

export const PARALEL_EIP712_NAME = 'ParalelAuction' as const;
export const PARALEL_EIP712_VERSION = '3' as const;

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421_614 as const;

export const USDC_DECIMALS = 6 as const;

export const RANK_SLOTS = 10 as const;

export const SIGNING_WINDOW_SECONDS = 5n * 60n;
export const COLLECTION_WINDOW_SECONDS = 48n * 60n * 60n;
export const CLAIM_WINDOW_SECONDS = 168n * 60n * 60n;

export const WITHDRAW_FEE = 2_500_000n;

/**
 * Deployed contract increments in USDC smallest units.
 *
 * 0.05 USDC
 * 0.5 USDC
 * 5 USDC
 * 50 USDC
 * 500 USDC
 * 5,000 USDC
 */
export const ALLOWED_INCREMENT_VALUES = [
  50_000n,
  500_000n,
  5_000_000n,
  50_000_000n,
  500_000_000n,
  5_000_000_000n,
] as const;

export enum ContractAuctionStatus {
  SCHEDULED = 0,
  OPEN = 1,
  CLOSED = 2,
  AWARDING = 3,
  COLLECTION = 4,
  CLAIM_PERIOD = 5,
  SETTLED = 6,
  PASSED_IN = 7,
  WITHDRAWN = 8,
}

export enum ContractPartnerType {
  NOTARY = 0,
  GUARANTOR = 1,
}

/**
 * Values emitted through Withdrawal.kind.
 */
export enum ContractWithdrawalKind {
  REFUND = 0,
  CONSIGNOR_PAYOUT = 1,
  FEE_BALANCE = 2,
}

export const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

export const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

/**
 * Compatibility category required by deployed ParalelAuction v1 for the
 * selected Guarantor registry entry.
 *
 * This is an on-chain compatibility value, not an asset business category.
 * It is also semantically independent from ContractPartnerType.GUARANTOR,
 * although deployed v1 assigns both the numeric value 1.
 */
export const GUARANTOR_COMPATIBILITY_CATEGORY = 1 as const;
