'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

type TabId = 'users' | 'requests';

export function UserAdminDashboard({ adminWallet }: { adminWallet: string }) {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  
  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user-admin/kyc?wallet=${adminWallet}&type=${activeTab}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [adminWallet, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReview = async (status: 'VERIFIED' | 'UNVERIFIED') => {
    if (status === 'UNVERIFIED' && !comment) {
      return alert('Harap isi komentar feedback untuk Reject.');
    }
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/user-admin/kyc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminWallet, userId: selectedUser.userId, status, comment }),
      });
      if (!res.ok) throw new Error('Failed to update');
      
      setSelectedUser(null);
      setComment('');
      await fetchData(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden bg-gray-50 text-gray-900">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-black tracking-tighter">Paralel</h2>
          <p className="text-xs text-red-400 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('requests')} className={`w-full text-left px-4 py-3 rounded-lg ${activeTab === 'requests' ? 'bg-blue-600 font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>KYC Requests</button>
          <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-lg ${activeTab === 'users' ? 'bg-blue-600 font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>All Users</button>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs font-mono text-gray-400 mb-3 truncate">{adminWallet}</div>
          <button onClick={() => { disconnect(); router.push('/'); }} className="w-full px-4 py-2 bg-red-900/50 text-red-300 text-sm font-bold rounded hover:bg-red-900">Disconnect</button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold">{activeTab === 'requests' ? 'KYC Requests' : 'All Users'}</h1>
            <p className="text-gray-500 mt-1">{activeTab === 'requests' ? 'Tinjau data KTP user yang mendaftar.' : 'Daftar seluruh wallet yang terdaftar.'}</p>
          </div>
        </div>

        {loading && data.length === 0 && <p className="text-gray-500">Memuat data...</p>}
        {!loading && data.length === 0 && <div className="bg-white p-8 text-center border rounded-xl text-gray-500">Tidak ada data.</div>}

        {data.length > 0 && (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b text-sm text-gray-600">
                  <th className="p-4">Wallet</th>
                  {activeTab === 'requests' && <th className="p-4">Nama (KTP)</th>}
                  <th className="p-4">Status KYC</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.userId || row.wallet} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs">{row.wallet}</td>
                    {activeTab === 'requests' && <td className="p-4 font-bold">{row.fullName}</td>}
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {row.status || 'NONE'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => { setSelectedUser(row); setComment(row.adminComment || ''); }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
                      >
                        {activeTab === 'requests' ? 'Review' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL REVIEW / DETAIL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">KYC Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-black font-bold text-xl">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <p className="text-xs text-gray-500">Wallet</p>
                <p className="font-mono text-sm">{selectedUser.wallet}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="font-bold">{selectedUser.fullName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">NIK</p>
                  <p className="font-mono">{selectedUser.nik || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Alamat</p>
                <p className="text-sm">{selectedUser.address || '—'}</p>
              </div>
              {selectedUser.verifiedAt && (
                <div>
                  <p className="text-xs text-gray-500">Tanggal Verified</p>
                  <p className="text-sm">{new Date(selectedUser.verifiedAt).toLocaleString()}</p>
                </div>
              )}
              
              {selectedUser.ktpPhoto && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Foto KTP</p>
                  <img src={selectedUser.ktpPhoto} alt="KTP" className="w-full border rounded-lg object-contain max-h-64 bg-gray-100" />
                </div>
              )}

              {activeTab === 'requests' && (
                <div className="border-t pt-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Comment (Feedback / Alasan Reject)</label>
                  <textarea 
                    value={comment} 
                    onChange={e => setComment(e.target.value)} 
                    className="w-full border rounded px-3 py-2 text-black" 
                    rows={2} 
                    placeholder="Contoh: Foto KTP buram, mohon upload ulang."
                  ></textarea>
                </div>
              )}
            </div>

            {activeTab === 'requests' && (
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <button 
                  onClick={() => handleReview('UNVERIFIED')} 
                  disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleReview('VERIFIED')} 
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}