// @file packages/shared/relay/withdraw.ts

/**
 * Relay helper untuk refund bidder.
 *
 * ABI, deployment, contract reads, typed data, dan simulation berasal dari
 * package canonical @paralel/contracts.
 */

import type {
  Address,
  Hex,
  PublicClient,
  WalletClient,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  WITHDRAW_REQUEST_TYPES,
  getParalelContractAddress,
  getParalelEip712Domain,
  readAuctionRound,
  readBidderStake,
  readNonce,
  simulateWithdrawRefund,
  type WithdrawRefundInput as CanonicalWithdrawRefundInput,
} from '@paralel/contracts';

import type {
  WithdrawRefundInput,
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
  input: WithdrawRefundInput,
): CanonicalWithdrawRefundInput {
  return {
    auctionKey: input.auctionKey,
    roundNo: input.roundNo,
    bidder: input.bidder,
    nonce: input.nonce,
    expiry: input.expiry,
    signature: input.signature,
  };
}

export async function relayWithdrawRefund(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: Address,
  input: WithdrawRefundInput,
): Promise<Hex> {
  assertExpectedChain(publicClient);

  assertCanonicalContractAddress(
    contractAddress,
  );

  const account =
    requireWalletAccount(walletClient);

  const block = await publicClient.getBlock({
    blockTag: 'latest',
  });

  if (block.timestamp > input.expiry) {
    throw new Error(
      'WithdrawRequest signature has expired',
    );
  }

  const currentNonce = await readNonce(
    publicClient,
    input.bidder,
  );

  if (currentNonce !== input.nonce) {
    throw new Error(
      [
        `Nonce mismatch for ${input.bidder}.`,
        `Expected: ${currentNonce}`,
        `Received: ${input.nonce}`,
      ].join(' '),
    );
  }

  const stake = await readBidderStake(
    publicClient,
    {
      auctionKey: input.auctionKey,
      roundNo: input.roundNo,
      bidder: input.bidder,
    },
  );

  if (stake.myBid === 0n) {
    throw new Error(
      'Nothing to claim',
    );
  }

  if (stake.withdrawn) {
    throw new Error(
      'Stake already withdrawn',
    );
  }

  const round = await readAuctionRound(
    publicClient,
    input.auctionKey,
    input.roundNo,
  );

  if (
    round.winner.toLowerCase() ===
    input.bidder.toLowerCase()
  ) {
    throw new Error(
      'Winner cannot withdraw refund',
    );
  }

  const valid =
    await publicClient.verifyTypedData({
      address: input.bidder,
      domain: getParalelEip712Domain(
        ARBITRUM_SEPOLIA_CHAIN_ID,
        contractAddress,
      ),
      types: WITHDRAW_REQUEST_TYPES,
      primaryType: 'WithdrawRequest',
      message: {
        auctionKey:
          input.auctionKey,
        roundNo:
          input.roundNo,
        wallet:
          input.bidder,
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
      'Invalid WithdrawRequest signature',
    );
  }

  const simulation =
    await simulateWithdrawRefund(
      publicClient,
      account.address,
      toCanonicalInput(input),
    );

  return walletClient.writeContract({
    ...simulation.request,
    account,
  });
}
