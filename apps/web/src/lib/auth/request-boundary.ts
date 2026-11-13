import {
  assertAuthenticatedRequest,
  resolveWalletContext,
  type SessionClaims,
  type WalletContext,
  type WorkspaceName,
} from '@paralel/auth';

import type {
  AuthorizationActor,
} from '@paralel/domain';

import {
  onchainRoleReader,
} from './onchain-role-reader';

import {
  requireSession,
} from './require-session';

import {
  roleRepository,
} from './role-repository';

export type AuthenticatedRequest =
  Readonly<{
    session: SessionClaims;
    context: WalletContext;
    actor: AuthorizationActor;
  }>;

function resolveExpectedOrigin(
  request: Request,
): string {
  const url =
    new URL(request.url);

  return url.origin;
}

export async function resolveAuthenticatedRequest(
  request: Request,
  correlationId: string,
  workspace: WorkspaceName,
): Promise<AuthenticatedRequest> {
  const now =
    new Date();

  const session =
    await requireSession(
      request,
      correlationId,
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
        roleRepository,
        onchainRoleReader,
      },
    );

  const actor =
    assertAuthenticatedRequest({
      method:
        request.method,
      origin:
        request.headers.get(
          'origin',
        ),
      expectedOrigin:
        resolveExpectedOrigin(
          request,
        ),
      session,
      context,
      workspace,
      now,
    });

  return Object.freeze({
    session,
    context,
    actor,
  });
}

export async function requireWorkspace(
  request: Request,
  correlationId: string,
  workspace: WorkspaceName,
): Promise<AuthenticatedRequest> {
  return resolveAuthenticatedRequest(
    request,
    correlationId,
    workspace,
  );
}
