// @file packages/shared/relay/register.ts

/**
 * Compatibility adapter untuk registrasi auction.
 *
 * ABI, deployment address, dan simulation sekarang bersumber dari:
 *
 * packages/contracts
 *
 * Parameter contractAddress tetap dipertahankan sementara agar API route
 * existing tidak harus diubah pada langkah ini. Nilainya wajib sama dengan
 * deployment canonical.
 */

import type {
  Address,
  Hex,
  PublicClient,
  WalletClient,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  getParalelContractAddress,
  simulateRegisterAuction,
  type RegisterAuctionInput as CanonicalRegisterAuctionInput,
} from '@paralel/contracts';

import type {
  RegisterAuctionInput,
} from './types';

function requireWalletAccount(
  walletClient: WalletClient,
) {
  const account = walletClient.account;

  if (!account) {
    throw new Error(
      'Relay wallet client has no account',
    );
  }

  return account;
}

function assertCanonicalContractAddress(
  contractAddress: Address,
): void {
  const canonicalAddress =
    getParalelContractAddress(
      ARBITRUM_SEPOLIA_CHAIN_ID,
    );

  if (
    contractAddress.toLowerCase() !==
    canonicalAddress.toLowerCase()
  ) {
    throw new Error(
      [
        'Contract address does not match canonical deployment.',
        `Expected: ${canonicalAddress}`,
        `Received: ${contractAddress}`,
      ].join(' '),
    );
  }
}

function toCanonicalInput(
  input: RegisterAuctionInput,
): CanonicalRegisterAuctionInput {
  return {
    auctionKey: input.auctionKey,
    consignor: input.consignor,
    guarantor: input.guarantor,
    notary: input.notary,
    category: input.category,
    specHash: input.specHash,
    startingBid: input.startingBid,
    bidIncrement: input.bidIncrement,
    openAt: input.openAt,
    durationHours: input.durationHours,
    confirmationCodeHash:
      input.confirmationCodeHash,
    notarySig: input.notarySig,
    consignorSig: input.consignorSig,
    notaryNonce: input.notaryNonce,
    notaryExpiry: input.notaryExpiry,
    consignorNonce: input.consignorNonce,
    consignorExpiry: input.consignorExpiry,
  };
}

export async function submitRegisterAuction(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: Address,
  input: RegisterAuctionInput,
): Promise<Hex> {
  assertCanonicalContractAddress(
    contractAddress,
  );

  const account =
    requireWalletAccount(walletClient);

  const simulation =
    await simulateRegisterAuction(
      publicClient,
      account.address,
      toCanonicalInput(input),
    );

  return walletClient.writeContract({
    ...simulation.request,
    account,
  });
}
