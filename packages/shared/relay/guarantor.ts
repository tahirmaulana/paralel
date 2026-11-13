// @file packages/shared/relay/guarantor.ts

/**
 * Relay helpers untuk aksi on-chain Guarantor:
 *
 * - collected
 * - markWithdrawn
 *
 * Guarantor approval dan rejection tidak diproses di sini karena keduanya
 * merupakan attestation off-chain yang diverifikasi oleh backend.
 */

import type {
  Address,
  Hex,
  PublicClient,
  WalletClient,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  COLLECTED_TYPES,
  ContractAuctionStatus,
  WITHDRAWN_TYPES,
  getParalelContractAddress,
  getParalelEip712Domain,
  readAuctionStatus,
  readNonce,
  simulateCollected,
  simulateMarkWithdrawn,
  type CollectedInput,
  type WithdrawnInput,
} from '@paralel/contracts';

import type {
  SubmitCollectedInput,
  SubmitWithdrawnInput,
} from './types';

function requireWalletAccount(
  walletClient: WalletClient,
) {
  const account = walletClient.account;

  if (!account) {
    throw new Error(
      'Relayer account is missing',
    );
  }

  return account;
}

function assertExpectedChain(
  publicClient: PublicClient,
): void {
  const actualChainId =
    publicClient.chain?.id;

  if (
    actualChainId !==
    ARBITRUM_SEPOLIA_CHAIN_ID
  ) {
    throw new Error(
      [
        'Unexpected chain.',
        `Expected: ${ARBITRUM_SEPOLIA_CHAIN_ID}`,
        `Received: ${actualChainId ?? 'undefined'}`,
      ].join(' '),
    );
  }
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

async function readLatestBlockTimestamp(
  publicClient: PublicClient,
): Promise<bigint> {
  const block = await publicClient.getBlock({
    blockTag: 'latest',
  });

  return block.timestamp;
}

async function assertValidNonce(
  publicClient: PublicClient,
  wallet: Address,
  suppliedNonce: bigint,
): Promise<void> {
  const currentNonce = await readNonce(
    publicClient,
    wallet,
  );

  if (currentNonce !== suppliedNonce) {
    throw new Error(
      [
        `Nonce mismatch for ${wallet}.`,
        `Expected: ${currentNonce}`,
        `Received: ${suppliedNonce}`,
      ].join(' '),
    );
  }
}

function toCanonicalCollectedInput(
  input: SubmitCollectedInput,
): CollectedInput {
  return {
    auctionKey: input.auctionKey,
    roundNo: input.roundNo,
    guarantor: input.guarantorWallet,
    nonce: input.nonce,
    expiry: input.expiry,
    signature: input.signature,
  };
}

function toCanonicalWithdrawnInput(
  input: SubmitWithdrawnInput,
): WithdrawnInput {
  return {
    auctionKey: input.auctionKey,
    roundNo: input.roundNo,
    guarantor: input.guarantorWallet,
    nonce: input.nonce,
    expiry: input.expiry,
    signature: input.signature,
  };
}

export async function relayCollected(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: Address,
  input: SubmitCollectedInput,
): Promise<Hex> {
  assertExpectedChain(publicClient);

  assertCanonicalContractAddress(
    contractAddress,
  );

  const account =
    requireWalletAccount(walletClient);

  const status = await readAuctionStatus(
    publicClient,
    input.auctionKey,
  );

  if (
    status !==
    ContractAuctionStatus.COLLECTION
  ) {
    throw new Error(
      `Auction is not in COLLECTION (status=${status})`,
    );
  }

  const blockTimestamp =
    await readLatestBlockTimestamp(
      publicClient,
    );

  if (blockTimestamp > input.expiry) {
    throw new Error(
      'Collected signature has expired',
    );
  }

  await assertValidNonce(
    publicClient,
    input.guarantorWallet,
    input.nonce,
  );

  const valid =
    await publicClient.verifyTypedData({
      address:
        input.guarantorWallet,
      domain:
        getParalelEip712Domain(
          ARBITRUM_SEPOLIA_CHAIN_ID,
          contractAddress,
        ),
      types:
        COLLECTED_TYPES,
      primaryType:
        'Collected',
      message: {
        auctionKey:
          input.auctionKey,
        roundNo:
          input.roundNo,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
      },
      signature:
        input.signature,
    });

  if (!valid) {
    throw new Error(
      'Invalid Collected signature',
    );
  }

  const simulation =
    await simulateCollected(
      publicClient,
      account.address,
      toCanonicalCollectedInput(input),
    );

  return walletClient.writeContract({
    ...simulation.request,
    account,
  });
}

export async function relayMarkWithdrawn(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: Address,
  input: SubmitWithdrawnInput,
): Promise<Hex> {
  assertExpectedChain(publicClient);

  assertCanonicalContractAddress(
    contractAddress,
  );

  const account =
    requireWalletAccount(walletClient);

  const status = await readAuctionStatus(
    publicClient,
    input.auctionKey,
  );

  if (
    status !==
    ContractAuctionStatus.PASSED_IN
  ) {
    throw new Error(
      `Auction is not in PASSED_IN (status=${status})`,
    );
  }

  const blockTimestamp =
    await readLatestBlockTimestamp(
      publicClient,
    );

  if (blockTimestamp > input.expiry) {
    throw new Error(
      'Withdrawn signature has expired',
    );
  }

  await assertValidNonce(
    publicClient,
    input.guarantorWallet,
    input.nonce,
  );

  const valid =
    await publicClient.verifyTypedData({
      address:
        input.guarantorWallet,
      domain:
        getParalelEip712Domain(
          ARBITRUM_SEPOLIA_CHAIN_ID,
          contractAddress,
        ),
      types:
        WITHDRAWN_TYPES,
      primaryType:
        'Withdrawn',
      message: {
        auctionKey:
          input.auctionKey,
        roundNo:
          input.roundNo,
        nonce:
          input.nonce,
        expiry:
          input.expiry,
      },
      signature:
        input.signature,
    });

  if (!valid) {
    throw new Error(
      'Invalid Withdrawn signature',
    );
  }

  const simulation =
    await simulateMarkWithdrawn(
      publicClient,
      account.address,
      toCanonicalWithdrawnInput(input),
    );

  return walletClient.writeContract({
    ...simulation.request,
    account,
  });
}

/**
 * Compatibility alias untuk API route existing.
 */
export const relayWithdrawn =
  relayMarkWithdrawn;
