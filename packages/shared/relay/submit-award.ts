// @file packages/shared/relay/submit-award.ts
import type { Hex, PublicClient, WalletClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { relayAbi } from './abi';
import { AWARD_SIGN_TYPES, eip712Domain, splitSignature } from './sign';
import type { SubmitAwardSignatureInput } from './types';

const STATUS_AWARDING = 3; // enum Status: SCHEDULED=0, OPEN=1, CLOSED=2, AWARDING=3

export async function relaySubmitAwardSignature(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  input: SubmitAwardSignatureInput,
): Promise<Hex> {
  const account = walletClient.account;
  if (!account) throw new Error('Relayer account is missing');

  if (publicClient.chain?.id !== arbitrumSepolia.id) {
    throw new Error(
      `Unexpected chain: expected ${arbitrumSepolia.id}, got ${publicClient.chain?.id}`,
    );
  }

  // 1. Pastikan status benar-benar AWARDING.
  const status = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'statusOf',
    args: [input.auctionKey],
  });

  if (status !== STATUS_AWARDING) {
    throw new Error(`Auction is not in AWARDING (status=${status})`);
  }

  // 2. Baca round on-chain: awardingIndex, kandidat, deadline.
  const round = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'getRound',
    args: [input.auctionKey, input.roundNo],
  });

  if (round.awardingIndex !== input.rank) {
    throw new Error(
      `Rank ${input.rank} is not current awardingIndex ${round.awardingIndex}`,
    );
  }

  const candidate = round.topRanks[input.rank];

  if (
    !candidate ||
    candidate === '0x0000000000000000000000000000000000000000'
  ) {
    throw new Error(`No candidate at rank ${input.rank}`);
  }

  const block = await publicClient.getBlock({ blockTag: 'latest' });

  if (block.timestamp > round.awardingDeadline) {
    throw new Error('Awarding deadline has passed');
  }

  if (block.timestamp > input.expiry) {
    throw new Error('AwardSign signature has expired');
  }

  // 3. Nonce harus nonce kandidat on-chain.
  const currentNonce = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'nonces',
    args: [candidate],
  });

  if (currentNonce !== input.nonce) {
    throw new Error(
      `Nonce mismatch for ${candidate}: expected ${currentNonce}, got ${input.nonce}`,
    );
  }

  // 4. Verifikasi EIP-712 terhadap kandidat on-chain.
  const valid = await publicClient.verifyTypedData({
    address: candidate,
    domain: eip712Domain(arbitrumSepolia.id, contractAddress),
    types: AWARD_SIGN_TYPES,
    primaryType: 'AwardSign',
    message: {
      auctionKey: input.auctionKey,
      roundNo: input.roundNo,
      rank: input.rank,
      nonce: input.nonce,
      expiry: input.expiry,
    },
    signature: input.signature,
  });

  if (!valid) throw new Error('Invalid AwardSign signature');

  const { v, r, s } = splitSignature(input.signature);

  // 5. Simulasi adalah otoritas akhir eligibility on-chain.
  const { request } = await publicClient.simulateContract({
    account,
    address: contractAddress,
    abi: relayAbi,
    functionName: 'submitAwardSignature',
    args: [
      input.auctionKey,
      input.roundNo,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });

  return walletClient.writeContract(request);
}