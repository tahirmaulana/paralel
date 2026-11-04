// @file apps/web/src/components/RelayedPanel.tsx — Sign Award + Withdraw Refund via relay
'use client';

import { useState } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSignTypedData,
} from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import abiData from '@/app/abi.json';
import {
  CONTRACT_ADDRESS,
  fmtUSDC,
  statusNameFromId,
} from '@/lib/web3';

type Props = {
  auctionKey: `0x${string}`;
  roundNo: number;
  dbStatus: string;
};

async function postRelay(path: string, body: unknown): Promise<`0x${string}`> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `Relay failed (${res.status})`);
  }
  return json.txHash as `0x${string}`;
}

export function RelayedPanel({ auctionKey, roundNo, dbStatus }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();

  const { data: statusRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'statusOf',
    args: [auctionKey],
  });
  const status =
    typeof statusRaw === 'number' ? statusNameFromId(statusRaw) : dbStatus;

  const { data: roundRaw, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'getRound',
    args: [auctionKey, roundNo],
  });
  const round = roundRaw as any;

  const { data: myStake } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'stakes',
    args: address ? [auctionKey, roundNo, address] : undefined,
    query: { enabled: !!address },
  });
  const stake = myStake as readonly [bigint, bigint, boolean] | undefined;

  const { data: refundableRaw, refetch: refetchRefundable } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
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

  const candidateAtCurrentIndex = round?.topRanks?.[round.awardingIndex] as
    | string
    | undefined;
  const isCurrentCandidate =
    status === 'AWARDING' &&
    round &&
    candidateAtCurrentIndex?.toLowerCase() === address.toLowerCase();

  async function signAward() {
    if (!round || !publicClient) return;
    setBusy(true);
    setResult(null);
    try {
      const rank = Number(round.awardingIndex);
      const nonce = (await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'nonces',
        args: [address!],
      })) as bigint;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await signTypedDataAsync({
        domain: {
          name: 'ParalelAuction',
          version: '1',
          chainId: arbitrumSepolia.id,
          verifyingContract: CONTRACT_ADDRESS,
        },
        types: {
          AwardSign: [
            { name: 'auctionKey', type: 'bytes32' },
            { name: 'roundNo', type: 'uint16' },
            { name: 'rank', type: 'uint8' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
        primaryType: 'AwardSign',
        message: { auctionKey, roundNo, rank, nonce, expiry },
      });

      const txHash = await postRelay('/api/relay/submit-award', {
        auctionKey,
        roundNo,
        rank,
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        signature,
      });
      setResult(`Award signed: ${txHash}`);
      setTimeout(() => {
        refetchRound();
        refetchRefundable();
      }, 3000);
    } catch (err: any) {
      setResult(`Failed: ${err?.message ?? 'unknown'}`);
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
        abi: abiData.abi,
        functionName: 'nonces',
        args: [address!],
      })) as bigint;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await signTypedDataAsync({
        domain: {
          name: 'ParalelAuction',
          version: '1',
          chainId: arbitrumSepolia.id,
          verifyingContract: CONTRACT_ADDRESS,
        },
        types: {
          WithdrawRequest: [
            { name: 'auctionKey', type: 'bytes32' },
            { name: 'roundNo', type: 'uint16' },
            { name: 'wallet', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
        primaryType: 'WithdrawRequest',
        message: { auctionKey, roundNo, wallet: address!, nonce, expiry },
      });

      const txHash = await postRelay('/api/relay/withdraw-refund', {
        auctionKey,
        roundNo,
        bidder: address,
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        signature,
      });
      setResult(`Withdraw relayed: ${txHash}`);
      setTimeout(() => {
        refetchRound();
        refetchRefundable();
      }, 3000);
    } catch (err: any) {
      setResult(`Failed: ${err?.message ?? 'unknown'}`);
    } finally {
      setBusy(false);
    }
  }

  const winnerAddr = (round?.winner as string | undefined)?.toLowerCase();
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
            Sign to accept the win. If you do not sign before the 5-minute
            deadline, you will be DEFAULTED and a 5% fee will be applied.
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