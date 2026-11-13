// @file packages/shared/relay/submit-award.ts

import type {
  Address,
  Hex,
  PublicClient,
  WalletClient,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  AWARD_SIGN_TYPES,
  ContractAuctionStatus,
  ZERO_ADDRESS,
  getParalelContractAddress,
  getParalelEip712Domain,
  readAuctionRound,
  readAuctionStatus,
  readNonce,
  simulateSubmitAwardSignature,
  type AwardSignatureInput,
} from '@paralel/contracts';

import type {
  SubmitAwardSignatureInput,
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

function toCanonicalInput(
  input: SubmitAwardSignatureInput,
): AwardSignatureInput {
  return {
    auctionKey: input.auctionKey,
    roundNo: input.roundNo,
    rank: input.rank,
    nonce: input.nonce,
    expiry: input.expiry,
    signature: input.signature,
  };
}

export async function relaySubmitAwardSignature(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: Address,
  input: SubmitAwardSignatureInput,
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
    ContractAuctionStatus.AWARDING
  ) {
    throw new Error(
      `Auction is not in AWARDING (status=${status})`,
    );
  }

  const round = await readAuctionRound(
    publicClient,
    input.auctionKey,
    input.roundNo,
  );

  if (
    round.awardingIndex !== input.rank
  ) {
    throw new Error(
      [
        `Rank ${input.rank} is not the current awarding index.`,
        `Current awarding index: ${round.awardingIndex}`,
      ].join(' '),
    );
  }

  const candidate =
    round.topRanks[input.rank];

  if (
    !candidate ||
    candidate.toLowerCase() ===
      ZERO_ADDRESS.toLowerCase()
  ) {
    throw new Error(
      `No candidate at rank ${input.rank}`,
    );
  }

  const block = await publicClient.getBlock({
    blockTag: 'latest',
  });

  if (
    block.timestamp >
    round.awardingDeadline
  ) {
    throw new Error(
      'Awarding deadline has passed',
    );
  }

  if (block.timestamp > input.expiry) {
    throw new Error(
      'AwardSign signature has expired',
    );
  }

  const currentNonce = await readNonce(
    publicClient,
    candidate,
  );

  if (currentNonce !== input.nonce) {
    throw new Error(
      [
        `Nonce mismatch for ${candidate}.`,
        `Expected: ${currentNonce}`,
        `Received: ${input.nonce}`,
      ].join(' '),
    );
  }

  const valid =
    await publicClient.verifyTypedData({
      address: candidate,
      domain: getParalelEip712Domain(
        ARBITRUM_SEPOLIA_CHAIN_ID,
        contractAddress,
      ),
      types: AWARD_SIGN_TYPES,
      primaryType: 'AwardSign',
      message: {
        auctionKey:
          input.auctionKey,
        roundNo:
          input.roundNo,
        rank:
          input.rank,
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
      'Invalid AwardSign signature',
    );
  }

  const simulation =
    await simulateSubmitAwardSignature(
      publicClient,
      account.address,
      toCanonicalInput(input),
    );

  return walletClient.writeContract({
    ...simulation.request,
    account,
  });
}
