// @file apps/web/src/components/UserAdminDashboard.tsx
// User Admin Dashboard — KYC review ONLY.
// Scope ref: /.env (USER_ADMIN_WALLET=KYC only), PARALEL.md §16,
//           existing /api/user-admin/review/route.ts, WALLET_OPERATIONS.md §3.
// Partner management & userType changes are PLATFORM ADMIN, not here.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import {
  createMutationHeaders,
} from '@/lib/api/client-mutation';
import {
  applicationApiUrl,
} from '@/lib/api/client';

// ─── Types ──────────────────────────────────────────────────

type TabId = 'overview' | 'kyc' | 'users';
type ModalContext = 'kyc' | 'directory';

type Stats = {
  totalUsers: number;
  kycPending: number;
  kycVerified: number;
  kycNone: number;
};

type ApiResult<T> = {
  data?: T;
  message?: string;
};

function requestError<T>(result: ApiResult<T>, status: number): Error {
  return new Error(result.message ?? `Request failed (${status})`);
}

type UserRow = {
  userId: string;
  wallet: string;
  userType: string;
  email: string | null;
  kycStatus: string | null;
  fullName: string | null;
  adminComment: string | null;
  createdAt: string;
};

type UserDetail = UserRow & {
  preferredLanguage: string;
  nik: string | null;
  address: string | null;
  ktpPhoto: string | null;
  faceVerified: boolean | null;
  idExtractedByAi: boolean | null;
  verifiedAt: string | null;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'kyc', label: 'KYC Requests' },
  { id: 'users', label: 'Public Users' },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Main component ────────────────────────────────────────

export function UserAdminDashboard({ adminWallet }: { adminWallet: string }) {
  const router = useRouter();
  const { disconnect } = useDisconnect();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [kycRows, setKycRows] = useState<UserRow[]>([]);
  const [kycLoading, setKycLoading] = useState(false);

  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [filterKyc, setFilterKyc] = useState<string>('');
  const [search, setSearch] = useState('');

  const [modalUser, setModalUser] = useState<UserDetail | null>(null);
  const [modalContext, setModalContext] = useState<ModalContext>('directory');
  const [modalComment, setModalComment] = useState('');
  const [modalBusy, setModalBusy] = useState(false);

  // ─── Fetchers ──────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(
        applicationApiUrl('/api/user-admin/stats'),
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );
      const result = (await res.json()) as ApiResult<Stats>;
      if (!res.ok) throw requestError(result, res.status);
      if (!result.data) throw new Error('Statistics response is missing data.');
      setStats(result.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load KYC statistics.');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchKyc = useCallback(async () => {
    setKycLoading(true);
    try {
      const res = await fetch(
        applicationApiUrl('/api/user-admin/users?kycStatus=UNVERIFIED'),
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );
      const result = (await res.json()) as ApiResult<UserRow[]>;
      if (!res.ok) throw requestError(result, res.status);
      if (!result.data) throw new Error('KYC list response is missing data.');
      setKycRows(result.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load KYC requests.');
    } finally {
      setKycLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterKyc) params.set('kycStatus', filterKyc);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(applicationApiUrl(`/api/user-admin/users?${params}`), {
        cache: 'no-store',
          credentials: 'include',
      });
      const result = (await res.json()) as ApiResult<UserRow[]>;
      if (!res.ok) throw requestError(result, res.status);
      if (!result.data) throw new Error('Public user list response is missing data.');
      setUserRows(result.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load public users.');
    } finally {
      setUserLoading(false);
    }
  }, [filterKyc, search]);

  // ─── Load on tab change ────────────────────────────────

  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'kyc') fetchKyc();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchStats, fetchKyc, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [filterKyc, search, activeTab, fetchUsers]);

  // ─── Open detail ───────────────────────────────────────

  const openDetail = async (userId: string, context: ModalContext) => {
    try {
      const res = await fetch(
        `/api/user-admin/users/${userId}`,
        { cache: 'no-store' },
      );
      const result = (await res.json()) as ApiResult<UserDetail>;
      if (!res.ok) throw requestError(result, res.status);
      if (!result.data) throw new Error('Public user detail response is missing data.');
      setModalUser(result.data);
      setModalContext(context);
      setModalComment(result.data.adminComment || '');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load public user details.');
    }
  };

  // ─── KYC review (the ONLY mutation allowed here) ───────

  const handleReview = async (status: 'VERIFIED' | 'UNVERIFIED') => {
    if (!modalUser) return;
    // Reject (= set UNVERIFIED + comment) requires a comment.
    if (status === 'UNVERIFIED' && modalComment.trim().length === 0) {
      alert('Comment required for rejection');
      return;
    }
    setModalBusy(true);
    try {
      const res = await fetch('/api/user-admin/review', {
        method: 'POST',
        headers: createMutationHeaders(
          'user-admin-kyc-review',
        ),
        body: JSON.stringify({
          userId: modalUser.userId,
          status,
          comment: modalComment.trim() || null,
        }),
      });
      if (!res.ok) {
        const result = (await res.json()) as ApiResult<unknown>;
        throw requestError(result, res.status);
      }
      setModalUser(null);
      setModalComment('');
      if (activeTab === 'kyc') await fetchKyc();
      if (activeTab === 'users') await fetchUsers();
      if (activeTab === 'overview') await fetchStats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModalBusy(false);
    }
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden bg-gray-50 text-gray-900">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-black tracking-tighter">Paralel</h2>
          <p className="text-xs text-red-400 mt-1">KYC Admin</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between ${
                activeTab === t.id
                  ? 'bg-blue-600 font-semibold'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{t.label}</span>
              {t.id === 'kyc' && stats && stats.kycPending > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.kycPending}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs font-mono text-gray-400 mb-3 truncate">
            {adminWallet}
          </div>
          <button
            onClick={() => {
              disconnect();
              router.push('/');
            }}
            className="w-full px-4 py-2 bg-red-900/50 text-red-300 text-sm font-bold rounded hover:bg-red-900"
          >
            Disconnect
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {loadError && (
          <p role="alert" className="mb-5 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {loadError}
          </p>
        )}
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            loading={statsLoading}
            onGotoKyc={() => setActiveTab('kyc')}
          />
        )}

        {activeTab === 'kyc' && (
          <KycTab
            rows={kycRows}
            loading={kycLoading}
            onOpen={(id) => openDetail(id, 'kyc')}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            rows={userRows}
            loading={userLoading}
            filterKyc={filterKyc}
            search={search}
            onFilterKyc={setFilterKyc}
            onSearch={setSearch}
            onOpen={(id) => openDetail(id, 'directory')}
          />
        )}
      </main>

      {modalUser && (
        <UserDetailModal
          user={modalUser}
          context={modalContext}
          comment={modalComment}
          busy={modalBusy}
          onChangeComment={setModalComment}
          onClose={() => {
            setModalUser(null);
            setModalComment('');
          }}
          onReview={handleReview}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────

function OverviewTab({
  stats,
  loading,
  onGotoKyc,
}: {
  stats: Stats | null;
  loading: boolean;
  onGotoKyc: () => void;
}) {
  if (loading || !stats) {
    return <p className="text-gray-500">Loading…</p>;
  }

  const cards = [
    { label: 'Public Users', value: stats.totalUsers, color: 'bg-slate-50 border-slate-200' },
    { label: 'KYC Pending', value: stats.kycPending, color: 'bg-yellow-50 border-yellow-200' },
    { label: 'KYC Verified', value: stats.kycVerified, color: 'bg-green-50 border-green-200' },
    { label: 'No KYC Submitted', value: stats.kycNone, color: 'bg-gray-50 border-gray-200' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Overview</h1>
      <p className="text-gray-500 mb-6">Public-user KYC verification at a glance.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`p-5 rounded-xl border ${c.color} shadow-sm`}>
            <p className="text-sm text-gray-600">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {stats.kycPending > 0 ? (
        <button
          onClick={onGotoKyc}
          className="mt-8 w-full p-6 bg-white border-2 border-blue-300 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50 transition"
        >
          <p className="text-lg font-bold text-blue-900">
            Review {stats.kycPending} pending KYC request
            {stats.kycPending > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Users waiting for identity verification →
          </p>
        </button>
      ) : (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-lg font-bold text-green-800">All caught up ✅</p>
          <p className="text-sm text-gray-600 mt-1">No pending KYC requests.</p>
        </div>
      )}
    </div>
  );
}

// ─── KYC Requests Tab ──────────────────────────────────────

function KycTab({
  rows,
  loading,
  onOpen,
}: {
  rows: UserRow[];
  loading: boolean;
  onOpen: (userId: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">KYC Requests</h1>
      <p className="text-gray-500 mb-6">
        Users with submitted KYC awaiting review. Items marked{' '}
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
          RETURNED
        </span>{' '}
        were previously rejected and have been resubmitted.
      </p>

      {loading && rows.length === 0 && <p className="text-gray-500">Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className="bg-white p-8 text-center border rounded-xl text-gray-500">
          No pending KYC requests. 🎉
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-sm text-gray-600">
                <th className="p-4">Wallet</th>
                <th className="p-4">Full Name</th>
                <th className="p-4">Submitted</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs">{r.wallet}</td>
                  <td className="p-4 font-bold">
                    {r.fullName || '—'}
                    {r.adminComment && (
                      <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                        RETURNED
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    {fmtDate(r.createdAt)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onOpen(r.userId)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
                    >
                      Review
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

// ─── All Users Tab ─────────────────────────────────────────

function UsersTab({
  rows,
  loading,
  filterKyc,
  search,
  onFilterKyc,
  onSearch,
  onOpen,
}: {
  rows: UserRow[];
  loading: boolean;
  filterKyc: string;
  search: string;
  onFilterKyc: (v: string) => void;
  onSearch: (v: string) => void;
  onOpen: (userId: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Public Users</h1>
      <p className="text-gray-500 mb-6">
        Public-user directory with KYC status. Read-only except for KYC actions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <select
          value={filterKyc}
          onChange={(e) => onFilterKyc(e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white"
        >
          <option value="">All KYC statuses</option>
          <option value="UNVERIFIED">UNVERIFIED (pending)</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="NONE">NONE (no submission)</option>
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search wallet / email / name…"
          className="border rounded px-3 py-2 text-sm bg-white"
        />
      </div>

      {loading && rows.length === 0 && <p className="text-gray-500">Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className="bg-white p-8 text-center border rounded-xl text-gray-500">
          No users match your filters.
        </div>
      )}

      {rows.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b text-sm text-gray-600">
                <th className="p-4">Wallet</th>
                <th className="p-4">Type</th>
                <th className="p-4">KYC</th>
                <th className="p-4">Name / Email</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs">{r.wallet}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs font-bold bg-gray-200">
                      {r.userType}
                    </span>
                  </td>
                  <td className="p-4">
                    <KycBadge status={r.kycStatus} adminComment={r.adminComment} />
                  </td>
                  <td className="p-4 text-sm">
                    {r.fullName || '—'}
                    {r.email && (
                      <span className="block text-xs text-gray-500">
                        {r.email}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onOpen(r.userId)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
                    >
                      Detail
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

function KycBadge({
  status,
  adminComment,
}: {
  status: string | null;
  adminComment: string | null;
}) {
  if (status === 'VERIFIED') {
    return (
      <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
        VERIFIED
      </span>
    );
  }
  if (status === 'UNVERIFIED') {
    if (adminComment) {
      return (
        <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">
          RETURNED
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-800">
        PENDING
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600">
      NONE
    </span>
  );
}

// ─── User Detail Modal ────────────────────────────────────

function UserDetailModal({
  user,
  context,
  comment,
  busy,
  onChangeComment,
  onClose,
  onReview,
}: {
  user: UserDetail;
  context: ModalContext;
  comment: string;
  busy: boolean;
  onChangeComment: (c: string) => void;
  onClose: () => void;
  onReview: (status: 'VERIFIED' | 'UNVERIFIED') => void;
}) {
  // Review actions only when opened from KYC tab AND current status is UNVERIFIED.
  const canReview = context === 'kyc' && user.kycStatus === 'UNVERIFIED';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg">
            {canReview ? 'KYC Review' : 'User Detail'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black font-bold text-xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Wallet">
              <span className="font-mono text-xs break-all">{user.wallet}</span>
            </Field>
            <Field label="User Type">
              <span className="px-2 py-0.5 rounded bg-gray-200 text-xs font-bold">
                PUBLIC
              </span>
            </Field>
            <Field label="Email">{user.email || '—'}</Field>
            <Field label="Registered">{fmtDate(user.createdAt)}</Field>
          </div>

          {/* KYC */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-500 uppercase">KYC</h4>
              <KycBadge status={user.kycStatus} adminComment={user.adminComment} />
            </div>

            {user.kycStatus ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name">{user.fullName || '—'}</Field>
                  <Field label="NIK">
                    <span className="font-mono">{user.nik || '—'}</span>
                  </Field>
                  <Field label="Address">
                    <span className="text-sm">{user.address || '—'}</span>
                  </Field>
                  <Field label="Verified At">
                    {fmtDate(user.verifiedAt)}
                  </Field>
                  <Field label="Face Verified">
                    {user.faceVerified ? '✅ Yes' : '❌ No'}
                  </Field>
                  <Field label="Extracted by AI">
                    {user.idExtractedByAi ? '✅ Yes' : '—'}
                  </Field>
                </div>

                {user.ktpPhoto && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">KTP Photo</p>
                    <img
                      src={user.ktpPhoto}
                      alt="KTP"
                      className="w-full border rounded-lg object-contain max-h-72 bg-gray-100"
                    />
                  </div>
                )}

                {/* Read-only: previous admin feedback (when opened from directory, not review mode) */}
                {!canReview && user.adminComment && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">
                      Previous Admin Comment
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900 whitespace-pre-wrap">
                      {user.adminComment}
                    </div>
                  </div>
                )}

                {canReview && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Comment{' '}
                      {comment.trim() ? '' : '(required for rejection)'}
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => onChangeComment(e.target.value)}
                      rows={3}
                      placeholder="e.g. KTP photo is blurry, please re-upload"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">
                User has not submitted KYC.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm"
            disabled={busy}
          >
            {canReview ? 'Cancel' : 'Close'}
          </button>
          {canReview && (
            <>
              <button
                onClick={() => onReview('UNVERIFIED')}
                disabled={busy}
                className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? '…' : 'Reject'}
              </button>
              <button
                onClick={() => onReview('VERIFIED')}
                disabled={busy}
                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 disabled:opacity-50"
              >
                {busy ? '…' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}