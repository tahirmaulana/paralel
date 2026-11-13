import {
  assertPartnerRegistrySynchronized,
  assertWorkspaceAvailable,
  resolveWalletContext,
  type SessionClaims,
  type WalletContext,
  type WorkspaceName,
} from "@paralel/auth";
import {
  DomainError,
} from "@paralel/domain";

import type { Env } from "../../env";
import {
  createOnchainRoleReader,
} from "./onchain-role-reader";
import {
  requireUserSession,
} from "./require-user-session";
import {
  createRoleRepository,
} from "./role-repository";

export interface RequiredWorkspace {
  session: SessionClaims;
  context: WalletContext;
}

const requiresSynchronizedPartner = (
  workspace: WorkspaceName,
): boolean =>
  workspace === "GUARANTOR" ||
  workspace === "NOTARY";

export const requireWorkspace = async (
  request: Request,
  env: Env,
  workspace: WorkspaceName,
): Promise<RequiredWorkspace> => {
  const session =
    await requireUserSession(
      request,
      env,
    );

  const context =
    await resolveWalletContext(
      {
        wallet:
          session.wallet,
        chainId:
          session.chainId,
        authenticated:
          true,
      },
      {
        roleRepository:
          createRoleRepository(env),
        onchainRoleReader:
          createOnchainRoleReader(
            env,
          ),
      },
    );

  assertWorkspaceAvailable(
    context,
    workspace,
  );

  if (
    requiresSynchronizedPartner(
      workspace,
    )
  ) {
    assertPartnerRegistrySynchronized(
      context,
    );
  }

  if (
    workspace === "GUARANTOR" &&
    context.partnerContext?.type !==
      "GUARANTOR"
  ) {
    throw new DomainError(
      "ROLE_FORBIDDEN",
      "Authenticated partner is not a Guarantor.",
    );
  }

  if (
    workspace === "NOTARY" &&
    context.partnerContext?.type !==
      "NOTARY"
  ) {
    throw new DomainError(
      "ROLE_FORBIDDEN",
      "Authenticated partner is not a Notary.",
    );
  }

  return Object.freeze({
    session,
    context,
  });
};
