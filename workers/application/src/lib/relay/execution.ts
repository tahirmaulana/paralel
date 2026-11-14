import {
  DomainError,
} from "@paralel/domain";
import type {
  Hex,
} from "viem";

import type {
  RelayIntentRecord,
} from "./intent-repository";

export type RelayExecutionDecision =
  | Readonly<{
      action:
        "BROADCAST_PREPARED";
      intentId: string;
      txHash: Hex;
      serializedTransaction: Hex;
    }>
  | Readonly<{
      action:
        "WAIT_FOR_PROJECTION";
      intentId: string;
      txHash: Hex;
    }>
  | Readonly<{
      action:
        "RETURN_CONFIRMED";
      intentId: string;
      txHash: Hex;
    }>;

const normalizedHex = (
  value: Hex,
): string =>
  value.toLowerCase();

export const decideRelayExecution = (
  intent:
    RelayIntentRecord,
): RelayExecutionDecision => {
  const derivedTxHash =
    intent.payload
      .derivedTxHash;

  if (
    intent.status ===
      "PREPARED"
  ) {
    if (
      intent.txHash !== null
    ) {
      throw new Error(
        "PREPARED relay intent unexpectedly contains a submitted tx hash.",
      );
    }

    return Object.freeze({
      action:
        "BROADCAST_PREPARED",
      intentId:
        intent.id,
      txHash:
        derivedTxHash,
      serializedTransaction:
        intent.payload
          .serializedTransaction,
    });
  }

  if (
    intent.status ===
      "SUBMITTED"
  ) {
    if (
      intent.txHash === null
    ) {
      throw new Error(
        "SUBMITTED relay intent is missing its tx hash.",
      );
    }

    if (
      normalizedHex(
        intent.txHash,
      ) !==
      normalizedHex(
        derivedTxHash,
      )
    ) {
      throw new Error(
        "Submitted relay tx hash does not match the signed transaction.",
      );
    }

    return Object.freeze({
      action:
        "WAIT_FOR_PROJECTION",
      intentId:
        intent.id,
      txHash:
        intent.txHash,
    });
  }

  if (
    intent.status ===
      "CONFIRMED"
  ) {
    if (
      intent.txHash === null
    ) {
      throw new Error(
        "CONFIRMED relay intent is missing its tx hash.",
      );
    }

    if (
      normalizedHex(
        intent.txHash,
      ) !==
      normalizedHex(
        derivedTxHash,
      )
    ) {
      throw new Error(
        "Confirmed relay tx hash does not match the signed transaction.",
      );
    }

    return Object.freeze({
      action:
        "RETURN_CONFIRMED",
      intentId:
        intent.id,
      txHash:
        intent.txHash,
    });
  }

  throw new DomainError(
    "ALREADY_PROCESSED",
    "Relay intent has already failed and cannot be resumed automatically.",
    {
      details: {
        intentId:
          intent.id,
        status:
          intent.status,
        errorCode:
          intent.lastErrorCode,
      },
    },
  );
};
