// @file packages/shared/relay/durable-withdraw-refund.ts
//
// Crash-safe preparation of withdrawRefund().
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
  simulateWithdrawRefund,
  splitContractSignature,
  type WithdrawRefundInput,
} from '@paralel/contracts';

import {
  getRelayAccount,
} from './client';

import type {
  PreparedRegisterTransaction,
} from './durable-register';

export async function prepareSignedWithdrawRefund(
  publicClient:
    PublicClient,
  input:
    WithdrawRefundInput,
): Promise<
  PreparedRegisterTransaction
> {
  const contractAddress =
    getParalelContractAddress(
      ARBITRUM_SEPOLIA_CHAIN_ID,
    );

  const account =
    getRelayAccount();

  await simulateWithdrawRefund(
    publicClient,
    account.address,
    input,
  );

  const {
    v,
    r,
    s,
  } =
    splitContractSignature(
      input.signature,
    );

  const data:
    Hex =
    encodeFunctionData({
      abi:
        ParalelAuctionAbi,
      functionName:
        'withdrawRefund',
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

  const request =
    await publicClient
      .prepareTransactionRequest({
        account:
          account.address,
        chain:
          publicClient.chain,
        to:
          contractAddress,
        data,
        value:
          0n,
        type:
          'eip1559',
      });

  if (
    request.type !==
      'eip1559' ||
    request.chainId ===
      undefined ||
    request.nonce ===
      undefined ||
    request.gas ===
      undefined ||
    request.maxFeePerGas ===
      undefined ||
    request.maxPriorityFeePerGas ===
      undefined
  ) {
    throw new Error(
      'Prepared refund relay transaction is incomplete.',
    );
  }

  const serializedTransaction =
    await account
      .signTransaction({
        type:
          'eip1559',
        chainId:
          request.chainId,
        nonce:
          request.nonce,
        gas:
          request.gas,
        maxFeePerGas:
          request.maxFeePerGas,
        maxPriorityFeePerGas:
          request
            .maxPriorityFeePerGas,
        to:
          contractAddress,
        data,
        value:
          0n,
      });

  return Object.freeze({
    txHash:
      keccak256(
        serializedTransaction,
      ),
    serializedTransaction,
  });
}

export {
  broadcastPreparedTransaction,
} from './durable-register';
