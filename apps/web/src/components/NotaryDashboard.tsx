// @file apps/web/src/components/NotaryDashboard.tsx
// Notary dashboard (rewrite, PARALEL.md §17, D11.5).
//
// - Data fetched from /api/notary/data (no auth gate, per D11.1).
// - Sign uses 2-phase flow: /api/notary/approve/init → sign EIP-712 → /api/notary/approve.
// - Commission reads claimableOf on-chain; withdraw direct from wallet (no relay, no fee).
// - View e-Certificate & Request Data Update are inactive (endpoint not implemented).
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useConnection,
  useSignTypedData,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import abiData from '@/app/abi.json';
import { CONTRACT_ADDRESS, fmtUSDC } from '@/lib/web3';

type Notary = {
  partnerId: string;
  name: string;
  wallet: string;
  email: string | null;
};

type PendingRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  startingBid: string;
  bidIncrement: string;
  openAt: string;
  durationHours: number;
  consignorWallet: string;
  guarantorName: string;
  hasGuarantorApproval: boolean;
  guarantorApprovedAt: string | null;
  pendingAt: string | null;
};

type CollectionRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  currentRound: number;
  winnerWallet: string | null;
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
};

type PassedRow = {
  auctionId: string;
  auctionCode: string;
  title: string | null;
  status: string;
  updatedAt: string;
};

type DashboardData = {
  pendingApprovals: PendingRow[];
  collections: CollectionRow[];
  run: RunRow[];
  passed: PassedRow[];
};

type TabId = 'submission' | 'collections' | 'run' | 'passed' | 'commission' | 'profile';

const TABS: { id: TabId; label: string }[] = [
  { id: 'submission', label: 'Submission' },
  { id: 'collections', label: 'Collections' },
  { id: 'run', label: 'Auction Run' },
  { id: 'passed', label: 'Passed' },
  { id: 'commission', label: 'Commission' },
  { id: 'profile', label: 'Profile' },
];

function shortAddr(addr: string | null | undefined): string {
  if (!addr) return '-';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16);
}

function fmtClosedCountdown(closeAt: string): string {
  const diff = new Date(closeAt).getTime() - Date.now();
  if (diff <= 0) return 'ended';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export function NotaryDashboard({ notary }: { notary: Notary }) {
  const { address } = useConnection();
  const { signTypedDataAsync } = useSignTypedData();

  const [activeTab, setActiveTab] = useState<TabId>('submission');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ─── Fetch dashboard data ────────────────────────────────
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/notary/data?wallet=${notary.wallet}`,
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
  }, [notary.wallet]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // ─── Sign NotaryApproval ─────────────────────────────────
  const walletMatches =
    !!address && address.toLowerCase() === notary.wallet.toLowerCase();

  async function handleSign(auctionId: string) {
    if (!address) {
      setNotice('Connect your wallet first.');
      return;
    }
    if (!walletMatches) {
      setNotice(
        `Connected wallet (${shortAddr(address)}) differs from dashboard owner (${shortAddr(
          notary.wallet,
        )}). Sign actions disabled.`,
      );
      return;
    }

    setBusyId(auctionId);
    setNotice(null);
    try {
      // Phase 1: derive code + codeHash on server (code never leaves server).
      const initRes = await fetch('/api/notary/approve/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId, notaryWallet: notary.wallet }),
      });
      const initJson = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initJson.error ?? `init failed (${initRes.status})`);
      }

      // Phase 2: sign EIP-712 NotaryApproval.
      const signature = await signTypedDataAsync({
        domain: {
          name: 'ParalelAuction',
          version: '1',
          chainId: arbitrumSepolia.id,
          verifyingContract: CONTRACT_ADDRESS,
        },
        types: {
          NotaryApproval: [
            { name: 'auctionKey', type: 'bytes32' },
            { name: 'paramsHash', type: 'bytes32' },
            { name: 'confirmationCodeHash', type: 'bytes32' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
          ],
        },
        primaryType: 'NotaryApproval',
        message: {
          auctionKey: initJson.auctionKey as `0x${string}`,
          paramsHash: initJson.paramsHash as `0x${string}`,
          confirmationCodeHash: initJson.codeHash as `0x${string}`,
          nonce: BigInt(initJson.nonce),
          expiry: BigInt(initJson.expiry),
        },
      });

      // Phase 3: submit signature to backend.
      const appRes = await fetch('/api/notary/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId,
          notaryWallet: notary.wallet,
          signature,
          nonce: initJson.nonce,
          expiry: initJson.expiry,
        }),
      });
      const appJson = await appRes.json();
      if (!appRes.ok) {
        throw new Error(appJson.error ?? `approve failed (${appRes.status})`);
      }

      setNotice('Approval signed. Confirmation code emailed to consignor.');
      await refetch();
    } catch (err: any) {
      setNotice(
        `Failed: ${err?.shortMessage ?? err?.message ?? 'unknown error'}`,
      );
    } finally {
      setBusyId(null);
    }
  }

  // ─── Commission (on-chain) ───────────────────────────────
  const {
    data: claimableRaw,
    refetch: refetchClaimable,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'claimableOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const claimable = (claimableRaw as bigint | undefined) ?? 0n;

  const { writeContractAsync } = useWriteContract();
  const [withdrawHash, setWithdrawHash] = useState<`0x${string}` | null>(null);
  const {
    isLoading: withdrawConfirming,
    isSuccess: withdrawDone,
  } = useWaitForTransactionReceipt({ hash: withdrawHash ?? undefined });

  useEffect(() => {
    if (withdrawDone) {
      refetchClaimable();
      setNotice('Commission withdrawn.');
    }
  }, [withdrawDone, refetchClaimable]);

  async function handleWithdraw() {
    if (!address || !walletMatches) {
      setNotice('Connect the notary wallet to withdraw commission.');
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

  // ─── Render helpers ──────────────────────────────────────
  const walletMismatch = !!address && !walletMatches;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notary Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            Approvals are global — first notary to sign claims the auction.
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">{notary.name}</p>
          <p className="text-sm font-mono text-gray-500">{notary.wallet}</p>
        </div>
      </div>

      {walletMismatch && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm p-3 rounded mb-4">
          Connected wallet <span className="font-mono">{shortAddr(address)}</span>{' '}
          differs from dashboard owner{' '}
          <span className="font-mono">{shortAddr(notary.wallet)}</span>. Sign
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
      <div className="flex flex-wrap border-b mb-6">
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

      <div className="bg-white border rounded-lg p-6 min-h-[400px]">
        {loading && !data && (
          <p className="text-gray-500">Loading dashboard data…</p>
        )}

        {data && activeTab === 'submission' && (
          <SubmissionTab
            rows={data.pendingApprovals}
            busyId={busyId}
            onSign={handleSign}
            canSign={!!address && walletMatches}
          />
        )}

        {data && activeTab === 'collections' && (
          <CollectionsTab rows={data.collections} />
        )}

        {data && activeTab === 'run' && <RunTab rows={data.run} />}

        {data && activeTab === 'passed' && <PassedTab rows={data.passed} />}

        {data && activeTab === 'commission' && (
          <CommissionTab
            claimable={claimable}
            connected={!!address}
            walletMatches={walletMatches}
            withdrawing={withdrawConfirming}
            onWithdraw={handleWithdraw}
          />
        )}

        {data && activeTab === 'profile' && <ProfileTab notary={notary} />}
      </div>
    </div>
  );
}

// ─── Tab components ────────────────────────────────────────

function SubmissionTab({
  rows,
  busyId,
  onSign,
  canSign,
}: {
  rows: PendingRow[];
  busyId: string | null;
  onSign: (auctionId: string) => void;
  canSign: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pending Approval (In-bound)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Global queue. Auctions awaiting a notary signature. Sort: earliest
        guarantor approval first.
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
                <th className="p-3">Guarantor</th>
                <th className="p-3">Starting Bid</th>
                <th className="p-3">Increment</th>
                <th className="p-3">Open At</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ready = r.hasGuarantorApproval;
                const busy = busyId === r.auctionId;
                return (
                  <tr
                    key={r.auctionId}
                    className={`border-b ${ready ? '' : 'bg-gray-50 text-gray-400'}`}
                  >
                    <td className="p-3 font-mono text-xs">{r.auctionCode}</td>
                    <td className="p-3">
                      {r.title ?? (
                        <span className="italic">Untitled</span>
                      )}
                    </td>
                    <td className="p-3">{r.guarantorName}</td>
                    <td className="p-3 font-mono">
                      {fmtUSDC(BigInt(r.startingBid))} USDC
                    </td>
                    <td className="p-3 font-mono">
                      {fmtUSDC(BigInt(r.bidIncrement))}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {fmtDate(r.openAt)}
                    </td>
                    <td className="p-3 text-right">
                      {ready ? (
                        <button
                          onClick={() => onSign(r.auctionId)}
                          disabled={busy || !canSign}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                          title={
                            !canSign
                              ? 'Connect the correct notary wallet to sign'
                              : undefined
                          }
                        >
                          {busy ? 'Signing…' : 'Sign Approval'}
                        </button>
                      ) : (
                        <span className="text-xs italic text-gray-400">
                          Awaiting guarantor approval
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

function CollectionsTab({ rows }: { rows: CollectionRow[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Collections (Out-bound)</h2>
      <p className="text-sm text-gray-500 mb-4">
        Auctions you signed as notary at opening. e-Certificate is generated
        automatically once the winner signs (backend — not implemented yet).
      </p>
      {rows.length === 0 ? (
        <p className="text-gray-500">No collections yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-3">Auction Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Winner</th>
                <th className="p-3 text-right">Action</th>
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
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {r.winnerWallet ? shortAddr(r.winnerWallet) : '—'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      disabled
                      title="Endpoint not implemented yet"
                      className="px-3 py-1.5 border border-gray-300 text-gray-400 text-sm rounded cursor-not-allowed"
                    >
                      View e-Certificate (inactive)
                    </button>
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

function RunTab({ rows }: { rows: RunRow[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Auction Run</h2>
      <p className="text-sm text-gray-500 mb-4">
        Global view — all live and upcoming auctions. Live auctions sorted by
        closest close time.
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
                          ({fmtClosedCountdown(r.closeAt)})
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

function PassedTab({ rows }: { rows: PassedRow[] }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Passed</h2>
      <p className="text-sm text-gray-500 mb-4">
        Auctions you signed that ended without a winner or were withdrawn by
        consignor.
      </p>
      {rows.length === 0 ? (
        <p className="text-gray-500">No passed auctions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-sm">
                <th className="p-3">Auction Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated At</th>
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
  const canWithdraw = connected && walletMatches && claimable > 0n && !withdrawing;
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Commission</h2>
      <div className="bg-gray-50 border p-6 rounded-lg max-w-sm text-center">
        <p className="text-gray-500 mb-2">Available Commission</p>
        <p className="text-3xl font-bold mb-4">
          {fmtUSDC(claimable)} USDC
        </p>
        <button
          onClick={onWithdraw}
          disabled={!canWithdraw}
          className="w-full px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-400"
          title={
            !connected
              ? 'Connect wallet to withdraw'
              : !walletMatches
                ? 'Connect the notary wallet to withdraw'
                : claimable === 0n
                  ? 'Nothing to withdraw'
                  : undefined
          }
        >
          {withdrawing ? 'Withdrawing…' : 'Withdraw Commission'}
        </button>
        <p className="text-xs text-gray-500 mt-3">
          Withdraw is a direct on-chain call. Gas paid by your wallet. No
          Withdrawal Fee.
        </p>
      </div>
    </div>
  );
}

function ProfileTab({ notary }: { notary: Notary }) {
  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold mb-4">Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-500 block">Name</label>
          <p className="font-medium">{notary.name}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500 block">Wallet</label>
          <p className="font-mono text-sm">{notary.wallet}</p>
        </div>
        <div>
          <label className="text-sm text-gray-500 block">Email</label>
          <p className="font-medium">{notary.email ?? '-'}</p>
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