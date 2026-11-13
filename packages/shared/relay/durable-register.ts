// @file packages/shared/relay/durable-register.ts
//
// Crash-safe registerAuction transaction preparation.
//
// The exact signed transaction and deterministic tx hash are persisted before
// broadcast. Re-broadcasting the same serialized transaction is safe.
import {
  encodeFunctionData,
  keccak256,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ParalelAuctionAbi,
  getParalelContractAddress,
  simulateRegisterAuction,
  type RegisterAuctionInput,
} from '@paralel/contracts';

import {
  assertRelayConfiguration,
  getRelayAccount,
} from './client';

export type PreparedRegisterTransaction =
  Readonly<{
    txHash: Hex;
    serializedTransaction: Hex;
  }>;

function requireCanonicalAddress(
  value: Address,
): void {
  const canonical =
    getParalelContractAddress(
      ARBITRUM_SEPOLIA_CHAIN_ID,
    );

  if (
    value.toLowerCase() !==
    canonical.toLowerCase()
  ) {
    throw new Error(
      'Register-auction address does not match canonical deployment.',
    );
  }
}

function registerAuctionStruct(
  input: RegisterAuctionInput,
) {
  return Object.freeze({
    auctionKey:
      input.auctionKey,
    consignor:
      input.consignor,
    guarantor:
      input.guarantor,
    notary:
      input.notary,
    category:
      input.category,
    specHash:
      input.specHash,
    startingBid:
      input.startingBid,
    bidIncrement:
      input.bidIncrement,
    openAt:
      input.openAt,
    durationHours:
      input.durationHours,
    confirmationCodeHash:
      input.confirmationCodeHash,
    notarySig:
      input.notarySig,
    consignorSig:
      input.consignorSig,
    notaryNonce:
      input.notaryNonce,
    notaryExpiry:
      input.notaryExpiry,
    consignorNonce:
      input.consignorNonce,
    consignorExpiry:
      input.consignorExpiry,
  });
}

export async function prepareSignedRegisterAuction(
  publicClient: PublicClient,
  input: RegisterAuctionInput,
): Promise<PreparedRegisterTransaction> {
  const address =
    getParalelContractAddress(
      ARBITRUM_SEPOLIA_CHAIN_ID,
    );

  requireCanonicalAddress(
    address,
  );

  await assertRelayConfiguration(
    publicClient,
    address,
  );

  const account =
    getRelayAccount();

  /*
   * Simulation uses the package-contract boundary directly.
   * This validates the complete canonical struct before signing.
   */
  await simulateRegisterAuction(
    publicClient,
    account.address,
    input,
  );

  const data =
    encodeFunctionData({
      abi:
        ParalelAuctionAbi,
      functionName:
        'registerAuction',
      args: [
        registerAuctionStruct(
          input,
        ),
      ],
    });

  /*
   * Force one concrete EIP-1559 shape. The prepared request returned by
   * viem also contains client metadata and must not be passed wholesale
   * into LocalAccount.signTransaction().
   */
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
      'Prepared register-auction transaction is incomplete.',
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

  const txHash =
    keccak256(
      serializedTransaction,
    );

  return Object.freeze({
    txHash,
    serializedTransaction,
  });
}

async function transactionAlreadyBroadcast(
  publicClient: PublicClient,
  txHash: Hex,
): Promise<boolean> {
  try {
    const transaction =
      await publicClient
        .getTransaction({
          hash:
            txHash,
        });

    return (
      transaction.hash
        .toLowerCase() ===
      txHash.toLowerCase()
    );
  } catch (
    error: unknown
  ) {
    /*
     * A factual not-found result permits exact broadcast.
     * Transport uncertainty remains visible and cannot trigger blind relay.
     */
    if (
      typeof error ===
        'object' &&
      error !== null &&
      'name' in error &&
      (
        error.name ===
          'TransactionNotFoundError' ||
        error.name ===
          'TransactionReceiptNotFoundError'
      )
    ) {
      return false;
    }

    throw error;
  }
}

export async function broadcastPreparedTransaction(
  publicClient: PublicClient,
  prepared: PreparedRegisterTransaction,
): Promise<Hex> {
  if (
    await transactionAlreadyBroadcast(
      publicClient,
      prepared.txHash,
    )
  ) {
    return prepared.txHash;
  }

  const broadcastHash =
    await publicClient
      .sendRawTransaction({
        serializedTransaction:
          prepared
            .serializedTransaction,
      });

  if (
    broadcastHash.toLowerCase() !==
    prepared.txHash.toLowerCase()
  ) {
    throw new Error(
      'Broadcast transaction hash does not match the persisted signed transaction.',
    );
  }

  return broadcastHash;
}

/*
 * Compatibility alias for the completed registerAuction workflow.
 * New relay operations must use broadcastPreparedTransaction().
 */
export const broadcastPreparedRegisterAuction =
  broadcastPreparedTransaction;
