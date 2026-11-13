import type { Address } from 'viem';

import {
  PARALEL_EIP712_NAME,
  PARALEL_EIP712_VERSION,
} from './constants';
import { getParalelDeployment } from './deployment';

export function getParalelEip712Domain(
  chainId: number,
  verifyingContract: Address,
) {
  const version =
    getParalelDeployment(chainId).contractVersion === 'v3'
      ? '3'
      : PARALEL_EIP712_VERSION;

  return {
    name: PARALEL_EIP712_NAME,
    version,
    chainId,
    verifyingContract,
  } as const;
}

export const NOTARY_APPROVAL_TYPES = {
  NotaryApproval: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'paramsHash', type: 'bytes32' },
    {
      name: 'confirmationCodeHash',
      type: 'bytes32',
    },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const CONSIGNOR_CONFIRM_TYPES = {
  ConsignorConfirm: [
    { name: 'auctionKey', type: 'bytes32' },
    {
      name: 'confirmationCodeHash',
      type: 'bytes32',
    },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const AWARD_SIGN_TYPES = {
  AwardSign: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'rank', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const COLLECTED_TYPES = {
  Collected: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const WITHDRAWN_TYPES = {
  Withdrawn: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

export const WITHDRAW_REQUEST_TYPES = {
  WithdrawRequest: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'roundNo', type: 'uint16' },
    { name: 'wallet', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

/**
 * Off-chain only.
 * This typed data is verified by the application, not the deployed contract.
 */
export const GUARANTOR_APPROVAL_TYPES = {
  GuarantorApproval: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'specHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

/**
 * Off-chain only.
 * This typed data is verified by the application, not the deployed contract.
 */
export const GUARANTOR_REJECTION_TYPES = {
  GuarantorRejection: [
    { name: 'auctionKey', type: 'bytes32' },
    { name: 'reasonHash', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

/**
 * Temporary compatibility alias.
 */
export const eip712Domain =
  getParalelEip712Domain;