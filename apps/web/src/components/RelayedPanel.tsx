// @file apps/web/src/components/RelayedPanel.tsx — Sign Award + Withdraw Refund via relay
'use client';

import { useRef, useState } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSignTypedData,
} from 'wagmi';
import {
  AWARD_SIGN_TYPES,
  eip712Domain,
  ParalelAuctionAbi,
  WITHDRAW_REQUEST_TYPES,
} from '@paralel/contracts';
import { isHex } from 'viem';
import {
  CHAIN_ID,
  CONTRACT_ADDRESS,
  fmtUSDC,
  statusNameFromId,
} from '@/lib/web3';
import {
  createRelayRequestOptions,
} from '@/lib/api/relay-client';

type Props = {
  auctionKey: `0x${string}`;
  roundNo: number;
  dbStatus: string;
};

type RelayMutationResult =
  Readonly<{
    txHash: `0x${string}`;
    projectionPending: boolean;
  }>;

async function postRelay(
  path: string,
  serializedBody: string,
  idempotencyKey: string,
): Promise<RelayMutationResult> {
  const res = await fetch(
    path,
    createRelayRequestOptions(
      serializedBody,
      idempotencyKey,
    ),
  );
  const value: unknown = await res.json();

  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `Relay returned an invalid response (${res.status}).`,
    );
  }

  const body =
    value as Record<string, unknown>;

  if (!res.ok || body.ok !== true) {
    const error =
      body.error;
    const message =
      typeof error === 'object' &&
      error !== null &&
      !Array.isArray(error) &&
      typeof (error as Record<string, unknown>).message === 'string'
        ? (error as Record<string, string>).message
        : typeof error === 'string'
          ? error
          : `Relay failed (${res.status}).`;

    throw new Error(message);
  }

  if (
    typeof body.txHash !== 'string' ||
    !isHex(body.txHash) ||
    body.txHash.length !== 66
  ) {
    throw new Error(
      'Relay returned an invalid transaction hash.',
    );
  }

  return {
    txHash: body.txHash,
    projectionPending:
      body.projectionPending === true,
  };
}

export function RelayedPanel({ auctionKey, roundNo, dbStatus }: Props) {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();
  const requestKeys = useRef(
    new Map<string, Map<string, string>>(),
  );

  const { data: statusRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'statusOf',
    args: [auctionKey],
  });
  const status =
    typeof statusRaw === 'number' ? statusNameFromId(statusRaw) : dbStatus;

  const { data: roundRaw, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'getRound',
    args: [auctionKey, roundNo],
  });
  const { data: auctionConfigSnapshot } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'getAuctionConfigSnapshot',
    args: [auctionKey],
  });
  const round = roundRaw as any;


  const { data: auctionRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'auctions',
    args: [auctionKey],
  });
  const contractAuction = auctionRaw as readonly [string, ...unknown[]] | undefined;

  const { data: myStake } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'stakes',
    args: address ? [auctionKey, roundNo, address] : undefined,
    query: { enabled: !!address },
  });
  const stake = myStake as readonly [bigint, bigint, boolean] | undefined;

  const { data: refundableRaw, refetch: refetchRefundable } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'refundableOf',
    args: address ? [auctionKey, roundNo, address] : undefined,
    query: { enabled: !!address },
  });
  const refundable = refundableRaw as
    | readonly [bigint, bigint, bigint]
    | undefined;

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!isConnected || !address) return null;
  if (chainId !== CHAIN_ID) {
    return (
      <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
        Switch your wallet to Arbitrum Sepolia to sign auction actions.
      </p>
    );
  }

  const candidateAtCurrentIndex = round?.topRanks?.[round.awardingIndex] as
    | string
    | undefined;
  const isCurrentCandidate =
    status === 'AWARDING' &&
    round &&
    candidateAtCurrentIndex?.toLowerCase() === address.toLowerCase();

  async function submitRelay(
    path: string,
    body: unknown,
  ): Promise<RelayMutationResult> {
    const serializedBody =
      JSON.stringify(body);

    if (serializedBody === undefined) {
      throw new Error(
        'Relay request could not be serialized.',
      );
    }

    let pathKeys =
      requestKeys.current.get(path);

    if (!pathKeys) {
      pathKeys = new Map();
      requestKeys.current.set(
        path,
        pathKeys,
      );
    }

    let idempotencyKey =
      pathKeys.get(serializedBody);

    if (!idempotencyKey) {
      idempotencyKey =
        crypto.randomUUID();
      pathKeys.set(
        serializedBody,
        idempotencyKey,
      );
    }

    const response =
      await postRelay(
        path,
        serializedBody,
        idempotencyKey,
      );

    pathKeys.delete(serializedBody);
    if (pathKeys.size === 0) {
      requestKeys.current.delete(path);
    }

    return response;
  }

  async function signAward() {
    if (!round || !publicClient) return;
    setBusy(true);
    setResult(null);
    try {
      const rank = Number(round.awardingIndex);
      const nonce = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ParalelAuctionAbi,
        functionName: 'nonces',
        args: [address!],
      })) as bigint;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await signTypedDataAsync({
        domain: eip712Domain(CHAIN_ID, CONTRACT_ADDRESS),
        types: AWARD_SIGN_TYPES,
        primaryType: 'AwardSign',
        message: { auctionKey, roundNo, rank, nonce, expiry },
      });

      const relayResult = await submitRelay('/api/relay/submit-award', {
        auctionKey,
        roundNo,
        rank,
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        signature,
      });
      setResult(
        relayResult.projectionPending
          ? `Award transaction submitted; awaiting chain projection: ${relayResult.txHash}`
          : `Award signed: ${relayResult.txHash}`,
      );
      setTimeout(() => {
        refetchRound();
        refetchRefundable();
      }, 3000);
    } catch (err: unknown) {
      setResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function withdrawConsignor() {
    if (!publicClient) return;
    setBusy(true);
    setResult(null);
    try {
      const nonce = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ParalelAuctionAbi,
        functionName: 'nonces',
        args: [address!],
      })) as bigint;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await signTypedDataAsync({
        domain: eip712Domain(CHAIN_ID, CONTRACT_ADDRESS),
        types: WITHDRAW_REQUEST_TYPES,
        primaryType: 'WithdrawRequest',
        message: { auctionKey, roundNo, wallet: address!, nonce, expiry },
      });

      const relayResult = await submitRelay('/api/relay/withdraw-consignor', {
        auctionKey,
        roundNo,
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        signature,
      });
      setResult(
        relayResult.projectionPending
          ? `Settlement transaction submitted; awaiting chain projection: ${relayResult.txHash}`
          : `Consignor settlement relayed: ${relayResult.txHash}`,
      );
      setTimeout(() => {
        refetchRound();
        refetchRefundable();
      }, 3000);
    } catch (err: unknown) {
      setResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!publicClient) return;
    setBusy(true);
    setResult(null);
    try {
      const nonce = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ParalelAuctionAbi,
        functionName: 'nonces',
        args: [address!],
      })) as bigint;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await signTypedDataAsync({
        domain: eip712Domain(CHAIN_ID, CONTRACT_ADDRESS),
        types: WITHDRAW_REQUEST_TYPES,
        primaryType: 'WithdrawRequest',
        message: { auctionKey, roundNo, wallet: address!, nonce, expiry },
      });

      const relayResult = await submitRelay('/api/relay/withdraw-refund', {
        auctionKey,
        roundNo,
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        signature,
      });
      setResult(
        relayResult.projectionPending
          ? `Refund transaction submitted; awaiting chain projection: ${relayResult.txHash}`
          : `Withdraw relayed: ${relayResult.txHash}`,
      );
      setTimeout(() => {
        refetchRound();
        refetchRefundable();
      }, 3000);
    } catch (err: unknown) {
      setResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  const consignorAddress = contractAuction?.[0]?.toLowerCase();
  const claimPeriodEnd = round?.claimPeriodEnd as bigint | undefined;
  const showConsignorWithdrawal =
    status === 'CLAIM_PERIOD' &&
    consignorAddress === address.toLowerCase() &&
    typeof claimPeriodEnd === 'bigint' &&
    BigInt(Math.floor(Date.now() / 1000)) >= claimPeriodEnd;

  const winnerAddr = (round?.winner as string | undefined)?.toLowerCase();
  const signingWindowSeconds =
    auctionConfigSnapshot
      ? Number(auctionConfigSnapshot.signingWindow)
      : null;
  const defaultFeeBps =
    auctionConfigSnapshot
      ? Number(auctionConfigSnapshot.defaultFeeBps)
      : null;
  const signingWindowLabel =
    signingWindowSeconds === null
      ? 'the configured'
      : signingWindowSeconds % 3_600 === 0
        ? `${signingWindowSeconds / 3_600}-hour`
        : signingWindowSeconds % 60 === 0
          ? `${signingWindowSeconds / 60}-minute`
          : `${signingWindowSeconds}-second`;
  const defaultFeeLabel =
    defaultFeeBps === null
      ? 'configured default'
      : `${defaultFeeBps / 100}%`;
  const showWithdraw =
    stake &&
    stake[0] > 0n &&
    !stake[2] &&
    refundable &&
    refundable[0] > 0n &&
    address.toLowerCase() !== winnerAddr;

  return (
    <>
      {isCurrentCandidate && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
          <h2 className="font-bold mb-2">
            You are the Provisional Winner (rank {round.awardingIndex + 1})
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            Sign to accept the win. If you do not sign before the {signingWindowLabel}
            deadline, you will be DEFAULTED and the {defaultFeeLabel} fee will be applied.
          </p>
          <button
            onClick={signAward}
            disabled={busy}
            className="px-4 py-2 bg-yellow-600 text-white rounded disabled:bg-gray-400"
          >
            {busy ? 'Signing...' : 'Sign Award (relay)'}
          </button>
        </div>
      )}

      {showConsignorWithdrawal && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h2 className="font-bold mb-2">Withdraw Proceeds</h2>
          <p className="text-sm text-gray-700 mb-2">
            The claim period has ended. Sign the settlement request to distribute
            the immutable fee snapshot and settle this auction.
          </p>
          <button
            onClick={withdrawConsignor}
            disabled={busy}
            className="px-4 py-2 bg-purple-700 text-white rounded disabled:bg-gray-400"
          >
            {busy ? 'Signing...' : 'Sign & Withdraw Proceeds (relay)'}
          </button>
        </div>
      )}

      {showWithdraw && (
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h2 className="font-bold mb-2">Withdraw Refund</h2>
          <div className="text-sm mb-2">
            Gross:{' '}
            <span className="font-mono">{fmtUSDC(refundable![0])} USDC</span>
            {' · '}Withdrawal Fee:{' '}
            <span className="font-mono">{fmtUSDC(refundable![1])} USDC</span>
            {' · '}You receive:{' '}
            <span className="font-mono font-bold">
              {fmtUSDC(refundable![2])} USDC
            </span>
          </div>
          <button
            onClick={withdraw}
            disabled={busy}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
          >
            {busy ? 'Signing...' : 'Sign & Withdraw (relay)'}
          </button>
        </div>
      )}

      {result && (
        <div className="text-sm bg-gray-100 p-2 rounded mb-4 break-all">
          {result}
        </div>
      )}
    </>
  );
}
