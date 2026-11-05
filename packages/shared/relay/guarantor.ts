// @file packages/shared/relay/guarantor.ts
//
// Relay helpers untuk on-chain guarantor actions (collected, withdrawn).
// Ref: PARALEL.md §4.2, §11, §12; CONTRACT_SPEC.md §3.7, §3.13; D12.3
//
// Approve & Reject TIDAK di sini karena off-chain only (backend insert
// attestation langsung tanpa kontrak). Lihat /api/guarantor/approve dan
// /api/guarantor/reject.
import type { Hex, PublicClient, WalletClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { relayAbi } from './abi';
import {
  COLLECTED_TYPES,
  eip712Domain,
  splitSignature,
  WITHDRAWN_TYPES,
} from './sign';
import type {
  SubmitCollectedInput,
  SubmitWithdrawnInput,
} from './types';

const STATUS_COLLECTION = 4; // enum: SCHEDULED=0, OPEN=1, CLOSED=2, AWARDING=3, COLLECTION=4
const STATUS_PASSED_IN = 7;  // PASSED_IN=7

export async function relayCollected(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  input: SubmitCollectedInput,
): Promise<Hex> {
  const account = walletClient.account;
  if (!account) throw new Error('Relayer account is missing');

  if (publicClient.chain?.id !== arbitrumSepolia.id) {
    throw new Error(
      `Unexpected chain: expected ${arbitrumSepolia.id}, got ${publicClient.chain?.id}`,
    );
  }

  // 1. Verify status is COLLECTION.
  const status = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'statusOf',
    args: [input.auctionKey],
  });
  if (status !== STATUS_COLLECTION) {
    throw new Error(`Auction is not in COLLECTION (status=${status})`);
  }

  // 2. Verify signature + nonce.
  const block = await publicClient.getBlock({ blockTag: 'latest' });
  if (block.timestamp > input.expiry) {
    throw new Error('Collected signature has expired');
  }

  const currentNonce = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'nonces',
    args: [input.guarantorWallet],
  });
  if (currentNonce !== input.nonce) {
    throw new Error(
      `Nonce mismatch for ${input.guarantorWallet}: expected ${currentNonce}, got ${input.nonce}`,
    );
  }

  const valid = await publicClient.verifyTypedData({
    address: input.guarantorWallet,
    domain: eip712Domain(arbitrumSepolia.id, contractAddress),
    types: COLLECTED_TYPES,
    primaryType: 'Collected',
    message: {
      auctionKey: input.auctionKey,
      roundNo: input.roundNo,
      nonce: input.nonce,
      expiry: input.expiry,
    },
    signature: input.signature,
  });
  if (!valid) throw new Error('Invalid Collected signature');

  const { v, r, s } = splitSignature(input.signature);

  // 3. Simulate + write.
  const { request } = await publicClient.simulateContract({
    account,
    address: contractAddress,
    abi: relayAbi,
    functionName: 'collected',
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

export async function relayWithdrawn(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  input: SubmitWithdrawnInput,
): Promise<Hex> {
  const account = walletClient.account;
  if (!account) throw new Error('Relayer account is missing');

  if (publicClient.chain?.id !== arbitrumSepolia.id) {
    throw new Error(
      `Unexpected chain: expected ${arbitrumSepolia.id}, got ${publicClient.chain?.id}`,
    );
  }

  // 1. Verify status is PASSED_IN.
  const status = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'statusOf',
    args: [input.auctionKey],
  });
  if (status !== STATUS_PASSED_IN) {
    throw new Error(`Auction is not in PASSED_IN (status=${status})`);
  }

  const block = await publicClient.getBlock({ blockTag: 'latest' });
  if (block.timestamp > input.expiry) {
    throw new Error('Withdrawn signature has expired');
  }

  const currentNonce = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'nonces',
    args: [input.guarantorWallet],
  });
  if (currentNonce !== input.nonce) {
    throw new Error(
      `Nonce mismatch for ${input.guarantorWallet}: expected ${currentNonce}, got ${input.nonce}`,
    );
  }

  const valid = await publicClient.verifyTypedData({
    address: input.guarantorWallet,
    domain: eip712Domain(arbitrumSepolia.id, contractAddress),
    types: WITHDRAWN_TYPES,
    primaryType: 'Withdrawn',
    message: {
      auctionKey: input.auctionKey,
      roundNo: input.roundNo,
      nonce: input.nonce,
      expiry: input.expiry,
    },
    signature: input.signature,
  });
  if (!valid) throw new Error('Invalid Withdrawn signature');

  const { v, r, s } = splitSignature(input.signature);

  const { request } = await publicClient.simulateContract({
    account,
    address: contractAddress,
    abi: relayAbi,
    functionName: 'markWithdrawn',
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