import type {
  OnchainRoleReader,
  OnchainRoleState,
} from "@paralel/auth";
import {
  ContractPartnerType,
  readContractOwner,
  readPartnerState,
} from "@paralel/contracts";
import {
  DomainError,
} from "@paralel/domain";
import type {
  Address,
} from "viem";

import type { Env } from "../../env";
import {
  createApplicationPublicClient,
} from "../contracts/public-client";

const mapPartnerType = (
  type: number,
): "NOTARY" | "GUARANTOR" => {
  if (
    type ===
    ContractPartnerType.NOTARY
  ) {
    return "NOTARY";
  }

  if (
    type ===
    ContractPartnerType.GUARANTOR
  ) {
    return "GUARANTOR";
  }

  throw new DomainError(
    "PARTNER_REGISTRY_DRIFT",
    "On-chain partner type is unsupported.",
    {
      details: {
        type,
      },
    },
  );
};

export const createOnchainRoleReader = (
  env: Env,
): OnchainRoleReader => ({
  async readRoleState(
    wallet: Address,
  ): Promise<OnchainRoleState> {
    try {
      const client =
        await createApplicationPublicClient(
          env,
        );

      const [
        owner,
        partner,
      ] = await Promise.all([
        readContractOwner(client),
        readPartnerState(
          client,
          wallet,
        ),
      ]);

      return Object.freeze({
        owner,
        partner:
          Object.freeze({
            type:
              mapPartnerType(
                partner.pType,
              ),
            category:
              partner.category,
            active:
              partner.active,
          }),
      });
    } catch (error) {
      if (
        error instanceof DomainError
      ) {
        throw error;
      }

      throw new DomainError(
        "RPC_UNAVAILABLE",
        "Contract role state could not be read.",
        {
          retryable: true,
          cause: error,
          details: {
            wallet,
          },
        },
      );
    }
  },
});
