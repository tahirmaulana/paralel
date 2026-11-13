// @file packages/shared/relay/durable-guarantor.ts
//
// Crash-safe preparation of Guarantor collected() and markWithdrawn().
//
// The exact signed transaction and deterministic tx hash are persisted
// before broadcast through the shared durable relay executor.
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
  simulateCollected,
  simulateMarkWithdrawn,
  splitContractSignature,
  type CollectedInput,
  type WithdrawnInput,
} from '@paralel/contracts';

import {
  getRelayAccount,
} from './client';

import type {
  PreparedRegisterTransaction,
} from './durable-register';

type GuarantorRelayAction =
  | Readonly<{
      kind:
        'MARK_COLLECTED';
      input:
        CollectedInput;
    }>
  | Readonly<{
      kind:
        'MARK_WITHDRAWN';
      input:
        WithdrawnInput;
    }>;

async function prepareGuarantorAction(
  publicClient:
    PublicClient,
  action:
    GuarantorRelayAction,
): Promise<
  PreparedRegisterTransaction
> {
  const address =
    getParalelContractAddress(
      ARBITRUM_SEPOLIA_CHAIN_ID,
    );

  const account =
    getRelayAccount();

  if (
    action.kind ===
      'MARK_COLLECTED'
  ) {
    await simulateCollected(
      publicClient,
      account.address,
      action.input,
    );
  } else {
    await simulateMarkWithdrawn(
      publicClient,
      account.address,
      action.input,
    );
  }

  const {
    v,
    r,
    s,
  } =
    splitContractSignature(
      action.input.signature,
    );

  const data:
    Hex =
    action.kind ===
      'MARK_COLLECTED'
      ? encodeFunctionData({
          abi:
            ParalelAuctionAbi,
          functionName:
            'collected',
          args: [
            action.input
              .auctionKey,
            action.input
              .roundNo,
            action.input
              .nonce,
            action.input
              .expiry,
            v,
            r,
            s,
          ],
        })
      : encodeFunctionData({
          abi:
            ParalelAuctionAbi,
          functionName:
            'markWithdrawn',
          args: [
            action.input
              .auctionKey,
            action.input
              .roundNo,
            action.input
              .nonce,
            action.input
              .expiry,
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
          address,
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
      'Prepared Guarantor relay transaction is incomplete.',
    );
  }

  const serializedTransaction =
    await account.signTransaction({
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
        address,
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

export async function prepareSignedCollected(
  publicClient:
    PublicClient,
  input:
    CollectedInput,
): Promise<
  PreparedRegisterTransaction
> {
  return prepareGuarantorAction(
    publicClient,
    {
      kind:
        'MARK_COLLECTED',
      input,
    },
  );
}

export async function prepareSignedWithdrawn(
  publicClient:
    PublicClient,
  input:
    WithdrawnInput,
): Promise<
  PreparedRegisterTransaction
> {
  return prepareGuarantorAction(
    publicClient,
    {
      kind:
        'MARK_WITHDRAWN',
      input,
    },
  );
}

export {
  broadcastPreparedTransaction,
} from './durable-register';
