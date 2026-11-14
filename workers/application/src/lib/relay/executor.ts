import {
  DomainError,
} from "@paralel/domain";
import type {
  Hex,
} from "viem";

import type { Env } from "../../env";
import {
  broadcastPreparedTransaction,
  type PreparedRelayTransaction,
} from "./durable-guarantor";
import {
  decideRelayExecution,
} from "./execution";
import {
  assertRelayIntentBinding,
  createPreparedGuarantorRelayIntent,
  findGuarantorRelayIntent,
  markGuarantorRelaySubmitted,
  recordRecoverableGuarantorRelayFailure,
  type GuarantorRelayOperation,
  type PreparedGuarantorRelayPayload,
  type RelayIntentRecord,
} from "./intent-repository";
import {
  createApplicationPublicClient,
} from "../contracts/public-client";

export interface ExecuteGuarantorRelayInput {
  operation:
    GuarantorRelayOperation;
  resourceId: string;
  routeKey: string;
  idempotencyKey: string;
  requestHash: string;
  now: Date;

  prepare: () => Promise<
    Readonly<{
      transaction:
        PreparedRelayTransaction;

      payload:
        Omit<
          PreparedGuarantorRelayPayload,
          | "operation"
          | "derivedTxHash"
          | "serializedTransaction"
        >;
    }>
  >;
}

export interface ExecuteGuarantorRelayResult {
  status: 200 | 202;
  body: Readonly<{
    data: Readonly<{
      ok: true;
      intentId: string;
      operation:
        GuarantorRelayOperation;
      relayStatus:
        | "SUBMITTED"
        | "CONFIRMED";
      txHash: Hex;
      projectionPending: boolean;
    }>;
  }>;
  replayed: boolean;
}

const normalizeFailure = (
  error: unknown,
): Readonly<{
  code: string;
  message: string;
}> => {
  if (
    error instanceof
      DomainError
  ) {
    return Object.freeze({
      code:
        error.code,
      message:
        error.message,
    });
  }

  if (error instanceof Error) {
    return Object.freeze({
      code:
        "RPC_UNAVAILABLE",
      message:
        error.message,
    });
  }

  return Object.freeze({
    code:
      "RPC_UNAVAILABLE",
    message:
      String(error),
  });
};

const responseForSubmitted = (
  intentId: string,
  operation:
    GuarantorRelayOperation,
  txHash: Hex,
  replayed: boolean,
): ExecuteGuarantorRelayResult => ({
  status: 202,
  body: {
    data: {
      ok: true,
      intentId,
      operation,
      relayStatus:
        "SUBMITTED",
      txHash,
      projectionPending:
        true,
    },
  },
  replayed,
});

const responseForConfirmed = (
  intentId: string,
  operation:
    GuarantorRelayOperation,
  txHash: Hex,
): ExecuteGuarantorRelayResult => ({
  status: 200,
  body: {
    data: {
      ok: true,
      intentId,
      operation,
      relayStatus:
        "CONFIRMED",
      txHash,
      projectionPending:
        false,
    },
  },
  replayed: true,
});

const assertPreparedBinding = (
  intent: RelayIntentRecord,
  input:
    ExecuteGuarantorRelayInput,
): void => {
  assertRelayIntentBinding(
    intent,
    {
      routeKey:
        input.routeKey,
      idempotencyKey:
        input.idempotencyKey,
      requestHash:
        input.requestHash,
    },
  );

  if (
    intent.operation !==
      input.operation ||
    intent.resourceId !==
      input.resourceId
  ) {
    throw new DomainError(
      "ALREADY_PROCESSED",
      "Relay intent belongs to a different auction operation.",
      {
        details: {
          intentId:
            intent.id,
          operation:
            intent.operation,
          resourceId:
            intent.resourceId,
        },
      },
    );
  }
};

const executeDecision = async (
  env: Env,
  input:
    ExecuteGuarantorRelayInput,
  intent:
    RelayIntentRecord,
  replayed: boolean,
): Promise<
  ExecuteGuarantorRelayResult
> => {
  assertPreparedBinding(
    intent,
    input,
  );

  const decision =
    decideRelayExecution(
      intent,
    );

  if (
    decision.action ===
      "WAIT_FOR_PROJECTION"
  ) {
    return responseForSubmitted(
      decision.intentId,
      input.operation,
      decision.txHash,
      true,
    );
  }

  if (
    decision.action ===
      "RETURN_CONFIRMED"
  ) {
    return responseForConfirmed(
      decision.intentId,
      input.operation,
      decision.txHash,
    );
  }

  const publicClient =
    await createApplicationPublicClient(
      env,
    );

  try {
    const broadcastHash =
      await broadcastPreparedTransaction(
        publicClient,
        {
          txHash:
            decision.txHash,
          serializedTransaction:
            decision
              .serializedTransaction,
        },
      );

    const submittedAt =
      new Date();

    const submitted =
      await markGuarantorRelaySubmitted(
        env,
        {
          intentId:
            decision.intentId,
          expectedPreparedTxHash:
            broadcastHash,
          submittedAt,
        },
      );

    if (
      submitted.txHash === null
    ) {
      throw new Error(
        "Submitted relay intent did not persist a transaction hash.",
      );
    }

    return responseForSubmitted(
      submitted.id,
      input.operation,
      submitted.txHash,
      replayed,
    );
  } catch (error) {
    const failure =
      normalizeFailure(error);

    await recordRecoverableGuarantorRelayFailure(
      env,
      {
        intentId:
          decision.intentId,
        errorCode:
          failure.code,
        errorMessage:
          failure.message,
        failedAt:
          new Date(),
      },
    );

    if (
      error instanceof
        DomainError
    ) {
      throw error;
    }

    throw new DomainError(
      "RPC_UNAVAILABLE",
      "Prepared relay transaction could not be broadcast.",
      {
        retryable: true,
        cause:
          error,
        details: {
          intentId:
            decision.intentId,
          txHash:
            decision.txHash,
        },
      },
    );
  }
};

export const executeGuarantorRelay =
  async (
    env: Env,
    input:
      ExecuteGuarantorRelayInput,
  ): Promise<
    ExecuteGuarantorRelayResult
  > => {
    const existing =
      await findGuarantorRelayIntent(
        env,
        {
          operation:
            input.operation,
          resourceId:
            input.resourceId,
        },
      );

    if (existing) {
      return executeDecision(
        env,
        input,
        existing,
        true,
      );
    }

    const prepared =
      await input.prepare();

    if (
      !/^0x[0-9a-fA-F]{64}$/.test(
        prepared.transaction
          .txHash,
      )
    ) {
      throw new Error(
        "Prepared relay transaction hash is invalid.",
      );
    }

    const payload:
      PreparedGuarantorRelayPayload =
        Object.freeze({
          ...prepared.payload,
          operation:
            input.operation,
          derivedTxHash:
            prepared
              .transaction
              .txHash,
          serializedTransaction:
            prepared
              .transaction
              .serializedTransaction,
        });

    const intent =
      await createPreparedGuarantorRelayIntent(
        env,
        {
          operation:
            input.operation,
          resourceId:
            input.resourceId,
          routeKey:
            input.routeKey,
          idempotencyKey:
            input.idempotencyKey,
          requestHash:
            input.requestHash,
          payload,
          now:
            input.now,
        },
      );

    return executeDecision(
      env,
      input,
      intent,
      false,
    );
  };
