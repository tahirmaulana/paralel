// @file apps/web/src/components/UserAdminManager.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection } from 'wagmi';

type UserAdminRow = {
  id: string;
  wallet: string;
  active: boolean;
  addedBy: string;
  createdAt: string;
  source: 'DB' | 'ENV';
};

export function UserAdminManager() {
  const { address } = useConnection();
  const [list, setList] = useState<UserAdminRow[]>([]);
  const [walletInput, setWalletInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busyRemove, setBusyRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/platform-admin/user-admins', {
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok) setList(json.data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load');
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !walletInput) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/platform-admin/user-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: walletInput, owner: address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setWalletInput('');
      await fetchList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (wallet: string) => {
    if (!address) return;
    setBusyRemove(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/platform-admin/user-admins/${wallet}?owner=${address}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      setConfirmRemove(null);
      await fetchList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyRemove(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Add form */}
      <div className="bg-white border p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-2">Add User Admin</h2>
        <p className="text-sm text-gray-500 mb-4">
          User Admins can review KYC at{' '}
          <span className="font-mono text-xs">/user-admin</span>. Adding a wallet
          grants immediate access. Removal is soft — the record is preserved for
          audit but the wallet loses privileges on next login.
        </p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="0x..."
            className="flex-1 border p-2 rounded text-black font-mono text-sm"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting || !walletInput}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </form>
        {error && (
          <p className="text-sm text-red-600 mt-3 font-medium">{error}</p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Wallet</th>
              <th className="p-4">Source</th>
              <th className="p-4">Status</th>
              <th className="p-4">Added By</th>
              <th className="p-4">Added At</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No user admins registered.
                </td>
              </tr>
            )}
            {list.map((item) => {
              const isEnv = item.source === 'ENV';
              return (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs">{item.wallet}</td>
                  <td className="p-4">
                    {isEnv ? (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-800">
                        ENV
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700">
                        DB
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {item.active ? (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600">
                        INACTIVE
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-mono text-xs">
                    {isEnv ? '—' : item.addedBy}
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    {isEnv ? 'bootstrap' : new Date(item.createdAt).toLocaleString('en-GB')}
                  </td>
                  <td className="p-4 text-right">
                    {isEnv ? (
                      <span className="text-xs italic text-gray-400">
                        edit .env
                      </span>
                    ) : item.active ? (
                      <button
                        onClick={() => setConfirmRemove(item.wallet)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs italic text-gray-400">
                        removed
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm remove modal */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-2">Remove User Admin?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Wallet <span className="font-mono">{confirmRemove}</span> will lose
              User Admin privileges on next login and fall back to the regular
              User dashboard. The record remains in the database for audit.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Note: wallets listed under <span className="font-mono">USER_ADMIN_WALLET</span>{' '}
              (env) are not affected by this action and cannot be removed from the UI.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={busyRemove}
                className="px-4 py-2 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={busyRemove}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 disabled:bg-gray-400"
              >
                {busyRemove ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}