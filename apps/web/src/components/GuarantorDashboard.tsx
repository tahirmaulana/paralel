// @file apps/web/src/components/GuarantorDashboard.tsx
// Guarantor dashboard (PARALEL.md §17, D12.5).
//
// - Data fetched from /api/guarantor/data.
// - Sign uses EIP-712 directly (no /init phase — the message contains
//   only auctionKey/specHash/reasonHash/roundNo, all derivable client-side).
// - Approve & Reject = off-chain (backend verifies & inserts attestation).
// - Collected & Withdrawn = on-chain relay (backend submits to contract).
// - Commission reads claimableOf on-chain; withdraw direct from wallet.
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  useConnection,
  useSignTypedData,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { keccak256, toBytes, type Hex } from 'viem';
import abiData from '@/app/abi.json';
import { CONTRACT_ADDRESS, fmtUSDC } from '@/lib/web3';

// ─── Types ────────────────────────────────────────────────

type Guarantor = {
  partnerId: string;
  userId: string;
  name: string;
  wallet: string;
  email: string | null;
};

type SubmissionRow = {
  auctionId: string;
  auctionCode: string;
  auctionKey: Hex;
  title: string | null;
  consignorWallet: string;
  startingBid: string;
  pendingAt: string | null;
  specHash: Hex;
  hasGuarantorApproval: boolean;
};

type CollectionRow = {
  auctionId: string;
  auctionCode: string;
  auctionKey: Hex;
  title: string | null;
  currentRound: number;
  winnerWallet: string | null;
  winnerStake: string | null;
  collectionDeadline: string;
  updatedAt: string;
};

type WithdrawalRow = {
  auctionId: string;
  auctionCode: string;
  auctionKey: Hex;
  title: string | null;
  currentRound: number;
  consignorWallet: string;
  updatedAt: string;
};

type RunRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  currentRound: number;
  startingBid: string;
  currentBid: string;
  openAt: string;
  closeAt: string;
  bidCount: number;
  updatedAt: string;
};

type HistoryRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  updatedAt: string;
};

type DashboardData = {
  submission: SubmissionRow[];
  collection: CollectionRow[];
  withdrawal: WithdrawalRow[];
  run: RunRow[];
  history: HistoryRow[];
};

type TabId =
  | 'submission'
  | 'collection'
  | 'withdrawal'
  | 'run'
  | 'history'
  | 'commission'
  | 'profile';

const TABS: { id: TabId; label: string }[] = [
  { id: 'submission', label: 'Submission' },
  { id: 'collection', label: 'Collection' },
  { id: 'withdrawal', label: 'Withdrawal' },
  { id: 'run', label: 'Run' },
  { id: 'history', label: 'History' },
  { id: 'commission', label: 'Commission' },
  { id: 'profile', label: 'Profile' },
];

// ─── Helpers ──────────────────────────────────────────────

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16);
}

function fmtCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'passed';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function filterRows<T extends { auctionCode: string; title: string | null }>(
  rows: T[],
  query: string,
): T[] {
  if (!query.trim()) return rows;
  const q = query.toLowerCase();
  return rows.filter(
    (r) =>
      r.auctionCode.toLowerCase().includes(q) ||
      (r.title?.toLowerCase().includes(q) ?? false),
  );
}

// ─── Main component ───────────────────────────────────────

export function GuarantorDashboard({ guarantor }: { guarantor: Guarantor }) {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();

  const [activeTab, setActiveTab] = useState<TabId>('submission');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Reject modal state.
  const [rejectTarget, setRejectTarget] = useState<SubmissionRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const walletMatches =
    !!address && address.toLowerCase() === guarantor.wallet.toLowerCase();
  const canSign = !!address && walletMatches;

  // ─── Fetch ──────────────────────────────────────────────
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/guarantor/data?wallet=${guarantor.wallet}`,
        { cache: 'no-store' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as DashboardData);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [guarantor.wallet]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setSearch('');
  }, [activeTab]);

  // ─── Sign helper ────────────────────────────────────────
  async function readNonce(wallet: `0x${string}`): Promise<bigint> {
    if (!publicClient) throw new Error('RPC client unavailable');
    return (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: abiData.abi,
      functionName: 'nonces',
      args: [wallet],
    })) as bigint;
  }

  function nowExpiry(): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + 3600);
  }

  // ─── Approve ────────────────────────────────────────────
  async function handleApprove(row: SubmissionRow) {
    if (!canSign || !address) {
      setNotice('Connect the guarantor wallet to sign.');
      return;
    }
    setBusyId(row.auctionId);
    setNotice(null);
    try {
      const nonce = await readNonce(address);
      const expiry = nowExpiry();

      const signature = await signTypedDataAsync({
        domain: {
          name: 'ParalelAuction',
          version: '1',
          chainId: arbitrumSepolia.id,
          verifyingContract: CONTRACT_ADDRESS,
        },
        types: {
          GuarantorApproval: [
            { name: 'auctionKey', type: 'bytes32' },
            { name: 'specHash', type: 'bytes32' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
        primaryType: 'GuarantorApproval',
        message: {
          auctionKey: row.auctionKey,
          specHash: row.specHash,
          nonce,
          expiry,
        },
      });

      const res = await fetch('/api/guarantor/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: row.auctionId,
          guarantorWallet: guarantor.wallet,
          signature,
          nonce: nonce.toString(),
          expiry: expiry.toString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `approve failed (${res.status})`);

      setNotice(`Approved ${row.auctionCode}. Awaiting notary signature.`);
      await refetch();
    } catch (err: any) {
      setNotice(`Failed: ${err?.shortMessage ?? err?.message ?? 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  }

  // ─── Reject ─────────────────────────────────────────────
  async function handleRejectConfirm() {
    if (!rejectTarget || !canSign || !address) return;
    if (rejectReason.trim().length < 10) {
      setNotice('Reason must be at least 10 characters.');
      return;
    }

    const row = rejectTarget;
    setBusyId(row.auctionId);
    setNotice(null);
    try {
      const nonce = await readNonce(address);
      const expiry = nowExpiry();
      const reasonHash = keccak256(toBytes(rejectReason));

      const signature = await signTypedDataAsync({
        domain: {
          name: 'ParalelAuction',
          version: '1',
          chainId: arbitrumSepolia.id,
          verifyingContract: CONTRACT_ADDRESS,
        },
        types: {
          GuarantorRejection: [
            { name: 'auctionKey', type: 'bytes32' },
            { name: 'reasonHash', type: 'bytes32' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
        primaryType: 'GuarantorRejection',
        message: {
          auctionKey: row.auctionKey,
          reasonHash,
          nonce,
          expiry,
        },
      });

      const res = await fetch('/api/guarantor/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: row.auctionId,
          guarantorWallet: guarantor.wallet,
          signature,
          nonce: nonce.toString(),
          expiry: expiry.toString(),
          reason: rejectReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `reject failed (${res.status})`);

      setNotice(`Rejected ${row.auctionCode}.`);
      setRejectTarget(null);
      setRejectReason('');
      await refetch();
    } catch (err: any) {
      setNotice(`Failed: ${err?.shortMessage ?? err?.message ?? 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  }

  // ─── Confirm Collected ──────────────────────────────────
  async function handleCollected(row: CollectionRow) {
    if (!canSign || !address) {
      setNotice('Connect the guarantor wallet to sign.');
      return;
    }
    setBusyId(row.auctionId);
    setNotice(null);
    try {
      const nonce = await readNonce(address);
      const expiry = nowExpiry();

      const signature = await signTypedDataAsync({
        domain: {
          name: 'ParalelAuction',
          version: '1',
          chainId: arbitrumSepolia.id,
          verifyingContract: CONTRACT_ADDRESS,
        },
        types: {
          Collected: [
            { name: 'auctionKey', type: 'bytes32' },
            { name: 'roundNo', type: 'uint16' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
        primaryType: 'Collected',
        message: {
          auctionKey: row.auctionKey,
          roundNo: row.currentRound,
          nonce,
          expiry,
        },
      });

      const res = await fetch('/api/guarantor/collected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: row.auctionId,
          guarantorWallet: guarantor.wallet,
          signature,
          nonce: nonce.toString(),
          expiry: expiry.toString(),
          roundNo: row.currentRound,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `collected failed (${res.status})`);

      setNotice(`Collected ${row.auctionCode}. Waiting for indexer to sync.`);
      setTimeout(refetch, 3000);
    } catch (err: any) {
      setNotice(`Failed: ${err?.shortMessage ?? err?.message ?? 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  }

  // ─── Confirm Withdrawn ──────────────────────────────────
  async function handleWithdrawn(row: WithdrawalRow) {
    if (!canSign || !address) {
      setNotice('Connect the guarantor wallet to sign.');
      return;
    }
    setBusyId(row.auctionId);
    setNotice(null);
    try {
      const nonce = await readNonce(address);
      const expiry = nowExpiry();

      const signature = await signTypedDataAsync({
        domain: {
          name: 'ParalelAuction',
          version: '1',
          chainId: arbitrumSepolia.id,
          verifyingContract: CONTRACT_ADDRESS,
        },
        types: {
          Withdrawn: [
            { name: 'auctionKey', type: 'bytes32' },
            { name: 'roundNo', type: 'uint16' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
        primaryType: 'Withdrawn',
        message: {
          auctionKey: row.auctionKey,
          roundNo: row.currentRound,
          nonce,
          expiry,
        },
      });

      const res = await fetch('/api/guarantor/withdrawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: row.auctionId,
          guarantorWallet: guarantor.wallet,
          signature,
          nonce: nonce.toString(),
          expiry: expiry.toString(),
          roundNo: row.currentRound,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `withdrawn failed (${res.status})`);

      setNotice(`Withdrawn ${row.auctionCode}. Waiting for indexer to sync.`);
      setTimeout(refetch, 3000);
    } catch (err: any) {
      setNotice(`Failed: ${err?.shortMessage ?? err?.message ?? 'unknown'}`);
    } finally {
      setBusyId(null);
    }
  }

  // ─── Commission (on-chain) ──────────────────────────────
  const { data: claimableRaw, refetch: refetchClaimable } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'claimableOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const claimable = (claimableRaw as bigint | undefined) ?? 0n;

  const { writeContractAsync } = useWriteContract();
  const [withdrawHash, setWithdrawHash] = useState<`0x${string}` | null>(null);
  const { isLoading: withdrawConfirming, isSuccess: withdrawDone } =
    useWaitForTransactionReceipt({ hash: withdrawHash ?? undefined });

  useEffect(() => {
    if (withdrawDone) {
      refetchClaimable();
      setNotice('Commission withdrawn.');
    }
  }, [withdrawDone, refetchClaimable]);

  async function handleWithdraw() {
    if (!canSign) {
      setNotice('Connect the guarantor wallet to withdraw commission.');
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'withdrawClaimable',
      });
      setWithdrawHash(hash);
    } catch (err: any) {
      setNotice(
        `Withdraw failed: ${err?.shortMessage ?? err?.message ?? 'unknown'}`,
      );
    }
  }

  const walletMismatch = !!address && !walletMatches;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Guarantor Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            All tabs scoped to auctions assigned to you.
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{guarantor.name}</p>
          <p className="text-sm font-mono text-gray-500">{guarantor.wallet}</p>
        </div>
      </div>

      {walletMismatch && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm p-3 rounded mb-4">
          Connected wallet <span className="font-mono">{shortAddr(address)}</span>{' '}
          differs from dashboard owner{' '}
          <span className="font-mono">{shortAddr(guarantor.wallet)}</span>. Sign
          and withdraw actions are disabled.
        </div>
      )}

      {notice && (
        <div className="bg-gray-100 border text-sm p-3 rounded mb-4 flex justify-between items-start gap-3">
          <span className="break-all">{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-gray-500 hover:text-gray-800 shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 text-sm p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar — hidden on commission & profile */}
      {activeTab !== 'commission' && activeTab !== 'profile' && (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search auction code or title…"
            className="w-full max-w-md border rounded px-3 py-2 text-sm text-black"
          />
        </div>
      )}

      <div className="bg-white border rounded-lg p-6 min-h-[400px]">
        {loading && !data && (
          <p className="text-gray-500">Loading dashboard data…</p>
        )}

        {data && activeTab === 'submission' && (
          <SubmissionTab
            rows={filterRows(data.submission, search)}
            busyId={busyId}
            canSign={canSign}
            onApprove={handleApprove}
            onRejectClick={(row) => {
              setRejectTarget(row);
              setRejectReason('');
            }}
          />
        )}

        {data && activeTab === 'collection' && (
          <CollectionTab
            rows={filterRows(data.collection, search)}
            busyId={busyId}
            canSign={canSign}
            onCollected={handleCollected}
          />
        )}

        {data && activeTab === 'withdrawal' && (
          <WithdrawalTab
            rows={filterRows(data.withdrawal, search)}
            busyId={busyId}
            canSign={canSign}
            onWithdrawn={handleWithdrawn}
          />
        )}

        {data && activeTab === 'run' && (
          <RunTab rows={filterRows(data.run, search)} />
        )}

        {data && activeTab === 'history' && (
          <HistoryTab rows={filterRows(data.history, search)} />
        )}

        {data && activeTab === 'commission' && (
          <CommissionTab
            claimable={claimable}
            connected={!!address}
            walletMatches={walletMatches}
            withdrawing={withdrawConfirming}
            onWithdraw={handleWithdraw}
          />
        )}

        {data && activeTab === 'profile' && <ProfileTab guarantor={guarantor} />}
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Reject Auction</h3>
            <p className="text-sm text-gray-600 mb-4">
              Auction: <span className="font-mono">{rejectTarget.auctionCode}</span>
            </p>
            <label className="text-sm text-gray-700 block mb-1">
              Reason (min 10 characters)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full border rounded px-3 py-2 text-sm text-black"
              placeholder="Barang tidak sesuai spesifikasi/foto…"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border rounded text-sm"
                disabled={busyId === rejectTarget.auctionId}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={
                  busyId === rejectTarget.auctionId ||
                  rejectReason.trim().length < 10
                }
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:bg-gray-400"
              >
                {busyId === rejectTarget.auctionId ? 'Signing…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab components ──────────────────────────────────────

function SubmissionTab({
  rows,
  busyId,
  canSign,
  onApprove,
  onRejectClick,
}: {
  rows: SubmissionRow[];
  busyId: string | null;
  canSign: boolean;
  onApprove: (row: SubmissionRow) => void;
  onRejectClick: (row: SubmissionRow) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Consignment (In-bound)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Physical check incoming. Approve if the item matches spec &amp; photos.
        Reject with reason otherwise.
      </p>
      {rows.length === 0 ? (
        <p className="text-gray-500">No pending auctions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-3">Auction Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Consignor</th>
                <th className="p-3">Starting Bid</th>
                <th className="p-3">Arrived</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const busy = busyId === r.auctionId;
                const approved = r.hasGuarantorApproval;
                return (
                  <tr
                    key={r.auctionId}
                    className={`border-b ${approved ? 'bg-green-50' : ''}`}
                  >
                    <td className="p-3 font-mono text-xs">{r.auctionCode}</td>
                    <td className="p-3">
                      {r.title ?? <span className="italic">Untitled</span>}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {shortAddr(r.consignorWallet)}
                    </td>
                    <td className="p-3 font-mono">
                      {fmtUSDC(BigInt(r.startingBid))}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {fmtDate(r.pendingAt)}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Link
                        href={`/print/receipt/consignment/${r.auctionId}`}
                        target="_blank"
                        className="inline-block px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50"
                      >
                        Print Receipt
                      </Link>
                      {approved ? (
                        <span className="inline-block px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded">
                          Approved — awaiting notary
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => onApprove(r)}
                            disabled={busy || !canSign}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                            title={!canSign ? 'Connect the guarantor wallet' : undefined}
                          >
                            {busy ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => onRejectClick(r)}
                            disabled={busy || !canSign}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                            title={!canSign ? 'Connect the guarantor wallet' : undefined}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CollectionTab({
  rows,
  busyId,
  canSign,
  onCollected,
}: {
  rows: CollectionRow[];
  busyId: string | null;
  canSign: boolean;
  onCollected: (row: CollectionRow) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Collection (Winner Pickup)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Print the collectionReceipt, have the winner sign it physically, keep
        the form. Then click Confirm Collected.
      </p>
      {rows.length === 0 ? (
        <p className="text-gray-500">No auctions awaiting collection.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-3">Auction Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Winner</th>
                <th className="p-3">Stake</th>
                <th className="p-3">Deadline</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const busy = busyId === r.auctionId;
                return (
                  <tr key={r.auctionId} className="border-b">
                    <td className="p-3 font-mono text-xs">{r.auctionCode}</td>
                    <td className="p-3">
                      {r.title ?? <span className="italic">Untitled</span>}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {shortAddr(r.winnerWallet)}
                    </td>
                    <td className="p-3 font-mono">
                      {r.winnerStake ? fmtUSDC(BigInt(r.winnerStake)) : '—'}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {fmtDate(r.collectionDeadline)}
                      <span className="ml-2 text-red-600">
                        ({fmtCountdown(r.collectionDeadline)})
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Link
                        href={`/print/receipt/collection/${r.auctionId}`}
                        target="_blank"
                        className="inline-block px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50"
                      >
                        Print Receipt
                      </Link>
                      <button
                        onClick={() => onCollected(r)}
                        disabled={busy || !canSign}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400"
                        title={!canSign ? 'Connect the guarantor wallet' : undefined}
                      >
                        {busy ? 'Signing…' : 'Confirm Collected'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WithdrawalTab({
  rows,
  busyId,
  canSign,
  onWithdrawn,
}: {
  rows: WithdrawalRow[];
  busyId: string | null;
  canSign: boolean;
  onWithdrawn: (row: WithdrawalRow) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Withdrawal (Consignor Pickup)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Consignor comes to pick up the item. Print withdrawalReceipt, hand over
        the item, then click Confirm Withdrawn.
      </p>
      {rows.length === 0 ? (
        <p className="text-gray-500">No auctions awaiting withdrawal.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-3">Auction Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Consignor</th>
                <th className="p-3">Passed In</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const busy = busyId === r.auctionId;
                return (
                  <tr key={r.auctionId} className="border-b">
                    <td className="p-3 font-mono text-xs">{r.auctionCode}</td>
                    <td className="p-3">
                      {r.title ?? <span className="italic">Untitled</span>}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {shortAddr(r.consignorWallet)}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {fmtDate(r.updatedAt)}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Link
                        href={`/print/receipt/withdrawal/${r.auctionId}`}
                        target="_blank"
                        className="inline-block px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50"
                      >
                        Print Receipt
                      </Link>
                      <button
                        onClick={() => onWithdrawn(r)}
                        disabled={busy || !canSign}
                        className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:bg-gray-400"
                        title={!canSign ? 'Connect the guarantor wallet' : undefined}
                      >
                        {busy ? 'Signing…' : 'Confirm Withdrawn'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RunTab({ rows }: { rows: RunRow[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Auction Run</h2>
      <p className="text-sm text-gray-500 mb-4">
        Live and upcoming auctions under your custody.
      </p>
      {rows.length === 0 ? (
        <p className="text-gray-500">No live auctions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-3">Auction Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Starting</th>
                <th className="p-3">Current</th>
                <th className="p-3">Bids</th>
                <th className="p-3">Close At</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isLive = r.status === 'OPEN';
                return (
                  <tr key={r.auctionId} className="border-b">
                    <td className="p-3 font-mono text-xs">{r.auctionCode}</td>
                    <td className="p-3">
                      {r.title ?? <span className="italic">Untitled</span>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          isLive
                            ? 'bg-green-100 text-green-800'
                            : r.status === 'AWARDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono">
                      {fmtUSDC(BigInt(r.startingBid))}
                    </td>
                    <td className="p-3 font-mono font-bold text-green-600">
                      {fmtUSDC(BigInt(r.currentBid))}
                    </td>
                    <td className="p-3 font-mono">{r.bidCount}</td>
                    <td className="p-3 font-mono text-xs">
                      {fmtDate(r.closeAt)}
                      {isLive && (
                        <span className="ml-2 text-green-700">
                          ({fmtCountdown(r.closeAt)})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ rows }: { rows: HistoryRow[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">History</h2>
      <p className="text-sm text-gray-500 mb-4">
        Settled, passed in, withdrawn, canceled, rejected auctions.
      </p>
      {rows.length === 0 ? (
        <p className="text-gray-500">No historical auctions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-3">Auction Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.auctionId} className="border-b">
                  <td className="p-3 font-mono text-xs">{r.auctionCode}</td>
                  <td className="p-3">
                    {r.title ?? <span className="italic">Untitled</span>}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {fmtDate(r.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CommissionTab({
  claimable,
  connected,
  walletMatches,
  withdrawing,
  onWithdraw,
}: {
  claimable: bigint;
  connected: boolean;
  walletMatches: boolean;
  withdrawing: boolean;
  onWithdraw: () => void;
}) {
  const canWithdraw =
    connected && walletMatches && claimable > 0n && !withdrawing;
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Commission</h2>
      <div className="bg-gray-50 border p-6 rounded-lg max-w-sm text-center">
        <p className="text-gray-500 mb-2">Available Commission</p>
        <p className="text-3xl font-bold mb-4">{fmtUSDC(claimable)} USDC</p>
        <button
          onClick={onWithdraw}
          disabled={!canWithdraw}
          className="w-full px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-400"
          title={
            !connected
              ? 'Connect wallet to withdraw'
              : !walletMatches
                ? 'Connect the guarantor wallet to withdraw'
                : claimable === 0n
                  ? 'Nothing to withdraw'
                  : undefined
          }
        >
          {withdrawing ? 'Withdrawing…' : 'Withdraw Commission'}
        </button>
        <p className="text-xs text-gray-500 mt-3">
          Direct on-chain call. Gas paid by your wallet. No Withdrawal Fee.
        </p>
      </div>
    </div>
  );
}

function ProfileTab({ guarantor }: { guarantor: Guarantor }) {
  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold mb-4">Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-500 block">Name</label>
          <p className="font-medium">{guarantor.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500 block">Wallet</label>
          <p className="font-mono text-sm">{guarantor.wallet}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500 block">Email</label>
          <p className="font-medium">{guarantor.email ?? '—'}</p>
        </div>
        <button
          disabled
          title="Endpoint not implemented yet"
          className="px-4 py-2 border border-gray-300 text-gray-400 rounded cursor-not-allowed font-medium"
        >
          Request Data Update (inactive)
        </button>
      </div>
    </div>
  );
}