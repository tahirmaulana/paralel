// @file packages/shared/relay/withdraw.ts
import type { Hex, PublicClient, WalletClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { relayAbi } from './abi';
import {
  eip712Domain,
  splitSignature,
  WITHDRAW_REQUEST_TYPES,
} from './sign';
import type { WithdrawRefundInput } from './types';

export async function relayWithdrawRefund(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  input: WithdrawRefundInput,
): Promise<Hex> {
  const account = walletClient.account;
  if (!account) throw new Error('Relayer account is missing');

  if (publicClient.chain?.id !== arbitrumSepolia.id) {
    throw new Error(
      `Unexpected chain: expected ${arbitrumSepolia.id}, got ${publicClient.chain?.id}`,
    );
  }

  const block = await publicClient.getBlock({ blockTag: 'latest' });

  if (block.timestamp > input.expiry) {
    throw new Error('WithdrawRequest signature has expired');
  }

  const currentNonce = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'nonces',
    args: [input.bidder],
  });

  if (currentNonce !== input.nonce) {
    throw new Error(
      `Nonce mismatch for ${input.bidder}: expected ${currentNonce}, got ${input.nonce}`,
    );
  }

  // `stakes` (public mapping → struct) → 3 return value terpisah → tuple.
  const [myBid, , withdrawn] = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'stakes',
    args: [input.auctionKey, input.roundNo, input.bidder],
  });

  if (myBid === 0n) throw new Error('Nothing to claim');
  if (withdrawn) throw new Error('Stake already withdrawn');

  // `getRound` mengembalikan single struct → object bernama.
  const round = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'getRound',
    args: [input.auctionKey, input.roundNo],
  });

  if (round.winner.toLowerCase() === input.bidder.toLowerCase()) {
    throw new Error('Winner cannot withdraw refund');
  }

  const valid = await publicClient.verifyTypedData({
    address: input.bidder,
    domain: eip712Domain(arbitrumSepolia.id, contractAddress),
    types: WITHDRAW_REQUEST_TYPES,
    primaryType: 'WithdrawRequest',
    message: {
      auctionKey: input.auctionKey,
      roundNo: input.roundNo,
      wallet: input.bidder,
      nonce: input.nonce,
      expiry: input.expiry,
    },
    signature: input.signature,
  });

  if (!valid) throw new Error('Invalid WithdrawRequest signature');

  const { v, r, s } = splitSignature(input.signature);

  const { request } = await publicClient.simulateContract({
    account,
    address: contractAddress,
    abi: relayAbi,
    functionName: 'withdrawRefund',
    args: [
      input.auctionKey,
      input.roundNo,
      input.bidder,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });

  return walletClient.writeContract(request);
}