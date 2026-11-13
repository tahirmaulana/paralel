import { randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { resolveWalletContext } from '@paralel/auth';
import { DomainError } from '@paralel/domain';
import { ConnectButton } from '@/components/ConnectButton';
import { GuarantorDashboard } from '@/components/GuarantorDashboard';
import { NotaryDashboard } from '@/components/NotaryDashboard';
import { UserAdminDashboard } from '@/components/UserAdminDashboard';
import { UserDashboard } from '@/components/UserDashboard';
import { WalletGuard } from '@/components/WalletGuard';
import { getGuarantorByWallet, getNotaryByWallet } from '@/lib/db';
import {
  onchainRoleReader,
  requireSession,
  roleRepository,
} from '@/lib/auth';

export const instant = false;

async function resolveDashboardAuthentication(request: Request) {
  const session = await requireSession(request, randomUUID());
  const context = await resolveWalletContext(
    {
      wallet: session.wallet,
      chainId: session.chainId,
      authenticated: true,
    },
    {
      roleRepository,
      onchainRoleReader,
    },
  );
  return { session, context };
}

export default async function DashboardPage() {
  await connection();

  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');
  const authRequest = new Request('http://localhost/dashboard', {
    headers: cookie ? { cookie } : undefined,
  });

  let authentication: Awaited<ReturnType<typeof resolveDashboardAuthentication>>;
  try {
    authentication = await resolveDashboardAuthentication(authRequest);
  } catch (error) {
    if (
      error instanceof DomainError &&
      (error.code === 'UNAUTHENTICATED' || error.code === 'SESSION_EXPIRED')
    ) {
      return (
        <main className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-2xl font-bold">Sign in to your role</h1>
          <p className="my-4 text-gray-600">
            Connect your wallet and confirm the authentication signature once.
          </p>
          <ConnectButton variant="landing" />
        </main>
      );
    }
    if (
      error instanceof DomainError &&
      (error.code === 'RPC_UNAVAILABLE' ||
        error.code === 'WRONG_NETWORK')
    ) {
      const rpcUnavailable =
        error.code === 'RPC_UNAVAILABLE';

      return (
        <main className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-2xl font-bold">
            {rpcUnavailable
              ? 'Arbitrum Sepolia is temporarily unavailable'
              : 'Switch to Arbitrum Sepolia'}
          </h1>
          <p className="my-4 text-gray-600">
            {rpcUnavailable
              ? 'Your wallet session is still valid, but role verification could not reach the network. Retry after the RPC connection recovers.'
              : 'Your wallet session is valid, but role verification requires the Arbitrum Sepolia network.'}
          </p>
          <a
            href="/dashboard"
            className="inline-block rounded bg-blue-600 px-5 py-2 font-bold text-white"
          >
            Retry
          </a>
        </main>
      );
    }
    throw error;
  }

  const wallet = authentication.session.wallet;
  switch (authentication.context.defaultWorkspace) {
    case 'USER':
      return (
        <WalletGuard expectedWallet={wallet}>
          <UserDashboard wallet={wallet} />
        </WalletGuard>
      );
    case 'USER_ADMIN':
      return (
        <WalletGuard expectedWallet={wallet}>
          <UserAdminDashboard adminWallet={wallet} />
        </WalletGuard>
      );
    case 'GUARANTOR': {
      const guarantor = await getGuarantorByWallet(wallet);
      if (!guarantor) throw new Error('Authenticated Guarantor profile is missing.');
      return (
        <WalletGuard expectedWallet={wallet}>
          <GuarantorDashboard guarantor={guarantor} />
        </WalletGuard>
      );
    }
    case 'NOTARY': {
      const notary = await getNotaryByWallet(wallet);
      if (!notary) throw new Error('Authenticated Notary profile is missing.');
      return (
        <WalletGuard expectedWallet={wallet}>
          <NotaryDashboard notary={notary} />
        </WalletGuard>
      );
    }
    case 'PLATFORM_ADMIN':
      redirect('/platform-admin');
  }
}
