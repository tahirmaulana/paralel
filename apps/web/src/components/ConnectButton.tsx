'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  useConnection,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from 'wagmi';
import { usePathname, useRouter } from 'next/navigation';
import { arbitrumSepolia } from 'wagmi/chains';
import { applicationApiUrl } from '@/lib/api/client';

type ApiResult<T> = {
  data?: T;
  error?: { message?: string } | string;
  message?: string;
};

function responseError<T>(result: ApiResult<T>, status: number): string {
  if (typeof result.error === 'string') return result.error;
  return result.error?.message ?? result.message ?? `Request failed (${status})`;
}

const subscribeToMount = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ConnectButton({
  variant = 'header',
}: {
  variant?: 'header' | 'landing' | 'bid';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { address, chainId, isConnected } = useConnection();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const attemptedWallet = useRef<string | null>(null);
  const connectionRequested = useRef(false);

  const authenticate = useCallback(async (
    wallet: `0x${string}`,
    currentChainId?: number,
  ) => {
    setAuthPending(true);
    setAuthError(null);
    try {
      if (currentChainId !== arbitrumSepolia.id) {
        await switchChainAsync({ chainId: arbitrumSepolia.id });
      }

      const sessionResponse = await fetch(applicationApiUrl('/api/auth/session'), { cache: 'no-store', credentials: 'include' });
      if (sessionResponse.ok) {
        const sessionJson = (await sessionResponse.json()) as ApiResult<{ wallet: string }>;
        if (sessionJson.data?.wallet.toLowerCase() === wallet.toLowerCase()) {
          if (connectionRequested.current || ['/', '/dashboard', '/platform-admin', '/user-admin'].includes(pathname)) {
            router.push(
              pathname.startsWith('/auction/')
                ? pathname
                : '/dashboard',
            );
          }
          connectionRequested.current = false;
          window.dispatchEvent(
            new Event('paralel:wallet-session-ready'),
          );
          return;
        }
      } else if (sessionResponse.status !== 401) {
        throw new Error(`Could not validate wallet session (${sessionResponse.status}).`);
      }

      const challengeResponse = await fetch(applicationApiUrl('/api/auth/challenge'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, chainId: arbitrumSepolia.id }),
      });
      const challengeJson = (await challengeResponse.json()) as ApiResult<{
        challengeId: string;
        message: string;
      }>;
      if (
        !challengeResponse.ok ||
        !challengeJson.data?.message ||
        !challengeJson.data.challengeId
      ) {
        throw new Error(responseError(challengeJson, challengeResponse.status));
      }

      const signature = await signMessageAsync({
        message: challengeJson.data.message,
      });
      const verifyResponse = await fetch(applicationApiUrl('/api/auth/verify'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          chainId: arbitrumSepolia.id,
          challengeId: challengeJson.data.challengeId,
          message: challengeJson.data.message,
          signature,
        }),
      });
      const verifyJson = (await verifyResponse.json()) as ApiResult<unknown>;
      if (!verifyResponse.ok) {
        throw new Error(responseError(verifyJson, verifyResponse.status));
      }
      connectionRequested.current = false;
      window.dispatchEvent(
        new Event('paralel:wallet-session-ready'),
      );
      router.push(
        pathname.startsWith('/auction/')
          ? pathname
          : '/dashboard',
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Wallet authentication failed.');
    } finally {
      setAuthPending(false);
    }
  }, [pathname, router, signMessageAsync, switchChainAsync]);

  useEffect(() => {
    if (!isConnected || !address) {
      attemptedWallet.current = null;
      connectionRequested.current = false;
      return;
    }

    const shouldAuthenticate =
      connectionRequested.current ||
      ['/', '/dashboard', '/platform-admin', '/user-admin'].includes(pathname);
    if (!shouldAuthenticate) return;

    const normalizedWallet = address.toLowerCase();
    if (attemptedWallet.current === normalizedWallet) return;
    attemptedWallet.current = normalizedWallet;
    void authenticate(address, chainId);
  }, [address, authenticate, chainId, isConnected, pathname]);

  function retryAuthentication() {
    if (!address) return;
    attemptedWallet.current = address.toLowerCase();
    void authenticate(address, chainId);
  }

  if (!mounted) return null;

  if (isConnected && address) {
    if (variant === 'bid') {
      return (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={retryAuthentication}
            disabled={authPending}
            className="rounded bg-[#7ed957] px-4 py-2 text-sm font-bold text-white hover:bg-[#6bc745] transition-colors disabled:bg-gray-400"
          >
            {authPending
              ? 'Signing in…'
              : authError
                ? 'Retry sign-in to bid'
                : 'Sign in to bid'}
          </button>
          {authError && (
            <p className="max-w-sm text-center text-xs text-red-600">
              {authError}
            </p>
          )}
        </div>
      );
    }

    if (variant === 'landing') {
      return (
        <div className="flex flex-col items-center w-full">
          {authPending ? (
            <p className="text-sm font-semibold text-gray-700">Signing in...</p>
          ) : authError ? (
            <button
              onClick={retryAuthentication}
              className="px-10 py-4 bg-[#7ed957] text-white text-lg font-bold rounded-xl w-full hover:bg-[#6bc745] transition-colors"
            >
              Retry sign-in
            </button>
          ) : null}
          {authError && <p className="text-sm text-red-600 mt-2 text-center">{authError}</p>}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono bg-gray-200 px-3 py-1.5 rounded-md text-gray-700">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        {authPending ? (
          <span className="text-sm text-gray-600">Signing in...</span>
        ) : authError ? (
          <button
            onClick={retryAuthentication}
            className="text-sm font-medium text-[#5e17eb] hover:text-[#4a12bc] transition-colors"
          >
            Retry sign-in
          </button>
        ) : null}
        <button
          onClick={() => {
            disconnect();
            router.push('/');
          }}
          className="text-sm font-medium text-red-600 hover:text-red-700 transition"
        >
          Disconnect
        </button>
        {authError && <p className="max-w-[220px] text-xs text-red-600">{authError}</p>}
      </div>
    );
  }

  const injectedConnector = connectors[0];
  const handleConnect = () => {
    if (!injectedConnector) {
      setAuthError('Wallet not detected. Please install MetaMask.');
      return;
    }
    connectionRequested.current = true;
    connect({ connector: injectedConnector });
  };

  return (
    <div className={variant === 'landing' ? 'flex flex-col items-center w-full' : 'flex flex-col items-end gap-2'}>
      <button
        onClick={handleConnect}
        disabled={isPending}
        className={
          variant === 'landing'
            ? 'px-10 py-4 bg-[#7ed957] text-white text-lg font-bold rounded-xl hover:bg-[#6bc745] transition disabled:bg-gray-400 shadow-xl w-full'
              : variant === 'bid'
                ? 'rounded bg-[#7ed957] px-4 py-2 text-sm font-bold text-white hover:bg-[#6bc745] disabled:bg-gray-400'
                : 'px-5 py-2 bg-[#7ed957] text-white text-sm font-bold rounded-lg hover:bg-[#6bc745] transition disabled:bg-gray-400'
          }
      >
          {isPending
            ? 'Connecting...'
            : variant === 'bid'
              ? 'Connect wallet to bid'
              : 'Connect Wallet'}
      </button>
      {connectors.length === 0 && (
        <p className="text-xs text-red-500 font-bold mt-2">Wallet not detected.</p>
      )}
      {connectError && <p className="text-xs text-red-500 mt-2 text-center">{connectError.message}</p>}
      {authError && <p className="text-sm text-red-600 mt-2 text-center">{authError}</p>}
    </div>
  );
}