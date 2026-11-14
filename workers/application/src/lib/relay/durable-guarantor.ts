import {
  encodeFunctionData,
  keccak256,
  type Hex,
  type PublicClient,
} from "viem";
import type {
  PrivateKeyAccount,
} from "viem/accounts";

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  ParalelAuctionAbi,
  getParalelContractAddress,
  simulateCollected,
  simulateMarkWithdrawn,
  splitContractSignature,
  type CollectedInput,
  type WithdrawnInput,
} from "@paralel/contracts";

export interface PreparedRelayTransaction {
  txHash: Hex;
  serializedTransaction: Hex;
}

type GuarantorRelayAction =
  | Readonly<{
      kind:
        "MARK_COLLECTED";
      input:
        CollectedInput;
    }>
  | Readonly<{
      kind:
        "MARK_WITHDRAWN";
      input:
        WithdrawnInput;
    }>;

const prepareGuarantorAction =
  async (
    publicClient:
      PublicClient,
    account:
      PrivateKeyAccount,
    action:
      GuarantorRelayAction,
  ): Promise<
    PreparedRelayTransaction
  > => {
    const address =
      getParalelContractAddress(
        ARBITRUM_SEPOLIA_CHAIN_ID,
      );

    if (
      action.kind ===
        "MARK_COLLECTED"
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

    const data: Hex =
      action.kind ===
        "MARK_COLLECTED"
        ? encodeFunctionData({
            abi:
              ParalelAuctionAbi,
            functionName:
              "collected",
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
              "markWithdrawn",
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
            "eip1559",
        });

    if (
      request.type !==
        "eip1559" ||
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
        "Prepared Guarantor relay transaction is incomplete.",
      );
    }

    const serializedTransaction =
      await account.signTransaction({
        type:
          "eip1559",
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
  };

export const prepareSignedCollected =
  async (
    publicClient:
      PublicClient,
    account:
      PrivateKeyAccount,
    input:
      CollectedInput,
  ): Promise<
    PreparedRelayTransaction
  > =>
    prepareGuarantorAction(
      publicClient,
      account,
      {
        kind:
          "MARK_COLLECTED",
        input,
      },
    );

export const prepareSignedWithdrawn =
  async (
    publicClient:
      PublicClient,
    account:
      PrivateKeyAccount,
    input:
      WithdrawnInput,
  ): Promise<
    PreparedRelayTransaction
  > =>
    prepareGuarantorAction(
      publicClient,
      account,
      {
        kind:
          "MARK_WITHDRAWN",
        input,
      },
    );

export const broadcastPreparedTransaction =
  async (
    publicClient:
      PublicClient,
    transaction:
      PreparedRelayTransaction,
  ): Promise<Hex> => {
    const broadcastHash =
      await publicClient
        .sendRawTransaction({
          serializedTransaction:
            transaction
              .serializedTransaction,
        });

    if (
      broadcastHash.toLowerCase() !==
      transaction
        .txHash
        .toLowerCase()
    ) {
      throw new Error(
        "Broadcast relay transaction hash does not match the prepared transaction.",
      );
    }

    return broadcastHash;
  };
