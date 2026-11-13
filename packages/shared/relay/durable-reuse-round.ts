import {
  encodeFunctionData,
  keccak256,
  type Hex,
  type PublicClient,
} from 'viem';
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ParalelAuctionAbi,
  getParalelContractAddress,
  simulateReuseRound,
  splitContractSignature,
  type ReuseRoundInput,
} from '@paralel/contracts';
import { getRelayAccount } from './client';
import type { PreparedRegisterTransaction } from './durable-register';

export async function prepareSignedReuseRound(
  publicClient: PublicClient,
  input: ReuseRoundInput,
): Promise<PreparedRegisterTransaction> {
  const address = getParalelContractAddress(ARBITRUM_SEPOLIA_CHAIN_ID);
  const account = getRelayAccount();
  await simulateReuseRound(publicClient, account.address, input);
  const { v, r, s } = splitContractSignature(input.signature);
  const data: Hex = encodeFunctionData({
    abi: ParalelAuctionAbi,
    functionName: 'reuseRound',
    args: [
      input.auctionKey, input.startingBid, input.bidIncrement, input.openAt,
      input.durationHours, input.nonce, input.expiry, v, r, s,
    ],
  });
  const request = await publicClient.prepareTransactionRequest({
    account: account.address,
    chain: publicClient.chain,
    to: address,
    data,
    value: 0n,
    type: 'eip1559',
  });
  if (
    request.type !== 'eip1559' || request.chainId === undefined ||
    request.nonce === undefined || request.gas === undefined ||
    request.maxFeePerGas === undefined || request.maxPriorityFeePerGas === undefined
  ) throw new Error('Prepared reuseRound transaction is incomplete.');
  const serializedTransaction = await account.signTransaction({
    type: 'eip1559', chainId: request.chainId, nonce: request.nonce,
    gas: request.gas, maxFeePerGas: request.maxFeePerGas,
    maxPriorityFeePerGas: request.maxPriorityFeePerGas,
    to: address, data, value: 0n,
  });
  return Object.freeze({ txHash: keccak256(serializedTransaction), serializedTransaction });
}
export { broadcastPreparedTransaction } from './durable-register';
