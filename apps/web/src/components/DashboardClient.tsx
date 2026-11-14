'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { ConnectButton } from '@/components/ConnectButton';
import { GuarantorDashboard } from '@/components/GuarantorDashboard';
import { NotaryDashboard } from '@/components/NotaryDashboard';
import { UserDashboard } from '@/components/UserDashboard';
import { WalletGuard } from '@/components/WalletGuard';
import {
  applicationApiUrl,
} from '@/lib/api/client';

type WorkspaceName =
  | 'USER'
  | 'GUARANTOR'
  | 'NOTARY'
  | 'USER_ADMIN'
  | 'PLATFORM_ADMIN';

type AuthContext = {
  wallet: string;
  chainId: number;
  authenticated: true;
  user: {
    userId: string | null;
    kycStatus: string;
  };
  roles: {
    user: true;
    guarantor: boolean;
    notary: boolean;
    userAdmin: boolean;
    platformAdmin: boolean;
  };
  partnerContext: {
    partnerId: string;
    wallet: string;
    type: 'GUARANTOR' | 'NOTARY';
    lifecycleStatus: string;
    dbActive: boolean;
    onchainActive: boolean;
    syncStatus: string;
  } | null;
  availableWorkspaces:
    WorkspaceName[];
  defaultWorkspace:
    WorkspaceName;
};

type ContextResponse = {
  data?: {
    session: {
      sessionId: string;
      wallet: string;
      chainId: number;
      issuedAt: string;
      expiresAt: string;
      generation: number;
    };
    context: AuthContext;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export function DashboardClient() {
  const router = useRouter();

  const [context, setContext] =
    useState<AuthContext | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadContext =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          applicationApiUrl(
            '/api/auth/context',
          ),
          {
            credentials: 'include',
            cache: 'no-store',
          },
        );

        const result: ContextResponse =
          await response.json();

        if (response.status === 401) {
          setContext(null);
          return;
        }

        if (
          !response.ok ||
          !result.data?.context
        ) {
          throw new Error(
            result.error?.message ??
              `Unable to load wallet context (${response.status}).`,
          );
        }

        const loadedContext =
          result.data.context;

        setContext(loadedContext);

        if (
          loadedContext.defaultWorkspace ===
          'PLATFORM_ADMIN'
        ) {
          router.replace(
            '/platform-admin',
          );
        }
      } catch (loadError) {
        setContext(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : String(loadError),
        );
      } finally {
        setLoading(false);
      }
    }, [router]);

  useEffect(() => {
    void loadContext();

    const handleSessionReady = () => {
      void loadContext();
    };

    window.addEventListener(
      'paralel:wallet-session-ready',
      handleSessionReady,
    );

    return () => {
      window.removeEventListener(
        'paralel:wallet-session-ready',
        handleSessionReady,
      );
    };
  }, [loadContext]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center p-8 text-center">
        <p className="text-gray-600">
          Loading authenticated workspace…
        </p>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-bold">
          Sign in to your role
        </h1>

        <p className="my-4 text-gray-600">
          Connect your wallet and confirm the
          authentication signature once.
        </p>

        {error ? (
          <p className="mb-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <ConnectButton variant="landing" />
      </main>
    );
  }

  switch (context.defaultWorkspace) {
    case 'USER':
      return (
        <WalletGuard
          expectedWallet={context.wallet}
        >
          <UserDashboard
            wallet={context.wallet}
          />
        </WalletGuard>
      );

    case 'PLATFORM_ADMIN':
      return (
        <main className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center p-8 text-center">
          <p className="text-gray-600">
            Opening Platform Admin…
          </p>
        </main>
      );

    case 'GUARANTOR':
      return (
        <WalletGuard
          expectedWallet={context.wallet}
        >
          <GuarantorDashboard />
        </WalletGuard>
      );

    case 'NOTARY':
      return (
        <WalletGuard
          expectedWallet={context.wallet}
        >
          <NotaryDashboard />
        </WalletGuard>
      );

    case 'USER_ADMIN':
      return (
        <main className="mx-auto max-w-xl p-8 text-center">
          <h1 className="text-2xl font-bold">
            Workspace migration in progress
          </h1>

          <p className="my-4 text-gray-600">
            Authentication is valid. The User Admin
            workspace is being moved to the
            Application Worker before it can be
            rendered client-side.
          </p>
        </main>
      );
  }
}
