// @file apps/web/src/components/UserDashboard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react'; // <-- INI YANG TERTINGGAL
import { useConnection, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fmtUSDC } from '@/lib/web3';

type TabId = 'live' | 'my-auction' | 'profile' | 'create';

export function UserDashboard({ wallet }: { wallet: string }) {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  
  const [activeTab, setActiveTab] = useState<TabId>('live');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [data, setData] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<'NONE' | 'UNVERIFIED' | 'VERIFIED' | 'FAILED'>('NONE');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/data?wallet=${wallet}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setKycStatus(json.kycStatus);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  if (!mounted) return null;

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden bg-gray-50 text-gray-900">
      {/* SIDEBAR KIRI */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h2 className="text-2xl font-black tracking-tighter">Paralel</h2>
          <p className="text-xs text-gray-400 mt-1">User Dashboard</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('live')} className={`w-full text-left px-4 py-3 rounded-lg ${activeTab === 'live' ? 'bg-blue-600 font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>Live Auctions</button>
          <button onClick={() => setActiveTab('my-auction')} className={`w-full text-left px-4 py-3 rounded-lg ${activeTab === 'my-auction' ? 'bg-blue-600 font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>My Auction</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-4 py-3 rounded-lg ${activeTab === 'profile' ? 'bg-blue-600 font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>Profile {kycStatus === 'VERIFIED' && '✅'}</button>
          <div className="pt-6 mt-6 border-t border-gray-700">
            <button onClick={() => setActiveTab('create')} className={`w-full text-left px-4 py-3 rounded-lg ${activeTab === 'create' ? 'bg-green-600 font-semibold' : 'bg-gray-800 text-gray-300'}`}>+ Create Auction</button>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs font-mono text-gray-400 mb-3 truncate">{wallet}</div>
          <button onClick={() => { disconnect(); router.push('/'); }} className="w-full px-4 py-2 bg-red-900/50 text-red-300 text-sm font-bold rounded hover:bg-red-900">Disconnect</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto">
        {loading && !data ? (
          <div className="text-center mt-20 text-gray-500">Loading data...</div>
        ) : (
          <>
            {activeTab === 'live' && <LiveAuctionsTab data={data?.liveAuctions || []} kycStatus={kycStatus} onRequireKyc={() => setActiveTab('profile')} />}
            {activeTab === 'my-auction' && <MyAuctionTab joined={data?.joinedAuctions || []} created={data?.createdAuctions || []} />}
            {activeTab === 'profile' && <ProfileTab kycStatus={kycStatus} wallet={wallet} onRefresh={fetchData} adminComment={data?.adminComment} />}
            {activeTab === 'create' && <CreateAuctionTab kycStatus={kycStatus} onRequireKyc={() => setActiveTab('profile')} />}
          </>
        )}
      </main>
    </div>
  );
}

// TAB 1: LIVE AUCTIONS
function LiveAuctionsTab({ data, kycStatus, onRequireKyc }: { data: any[], kycStatus: string, onRequireKyc: () => void }) {
  const handleBid = (e: React.MouseEvent, code: string) => {
    e.preventDefault();
    if (kycStatus !== 'VERIFIED') {
      alert('Anda harus menyelesaikan KYC terlebih dahulu.');
      onRequireKyc();
      return;
    }
    window.location.href = `/auction/${code}`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Live Auctions</h1>
      {data.length === 0 ? <p className="text-gray-500">Belum ada lelang aktif.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.map((item) => (
            <Link key={item.auctionId} href={`/auction/${item.auctionCode}`} className="group block bg-white rounded-xl shadow-sm border hover:shadow-md hover:border-blue-400 transition-all">
              <div className="h-48 bg-gray-200 relative">
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${item.status === 'OPEN' ? 'bg-green-500 text-white' : 'bg-gray-800 text-white'}`}>{item.status}</div>
              </div>
              <div className="p-5">
                <div className="text-xs font-mono text-gray-400 mb-1">{item.auctionCode}</div>
                <h3 className="font-bold text-lg leading-tight mb-3 group-hover:text-blue-600">{item.title}</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><p className="text-xs text-gray-500">Current Bid</p><p className="font-mono font-bold text-green-600">{fmtUSDC(BigInt(item.currentBid))} USDC</p></div>
                  <div><p className="text-xs text-gray-500">My Bid</p><p className="font-mono font-bold text-blue-600">{item.myBid ? `${fmtUSDC(BigInt(item.myBid))} USDC` : '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Leader</p><p className="font-mono text-xs">{item.leaderName}</p></div>
                  <div><p className="text-xs text-gray-500">Close At</p><p className="font-bold text-red-500 text-xs">{new Date(item.closeAt).toLocaleString()}</p></div>
                </div>
                <button onClick={(e) => handleBid(e, item.auctionCode)} className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Place Bid</button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// TAB 2: MY AUCTION
function MyAuctionTab({ joined, created }: { joined: any[], created: any[] }) {
  const [subTab, setSubTab] = useState<'joined' | 'created'>('joined');
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Auctions</h1>
      <div className="flex border-b mb-6">
        <button onClick={() => setSubTab('joined')} className={`px-6 py-3 font-bold border-b-2 ${subTab === 'joined' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Joined (Bidder)</button>
        <button onClick={() => setSubTab('created')} className={`px-6 py-3 font-bold border-b-2 ${subTab === 'created' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Created (Consignor)</button>
      </div>

      {subTab === 'joined' && (
        <div className="space-y-4">
          {joined.length === 0 ? <p className="text-gray-500">Anda belum mengikuti lelang.</p> : joined.map(j => (
            <Link href={`/auction/${j.auctionCode}`} key={j.auctionId} className="block bg-white border rounded-xl p-5 flex justify-between hover:shadow-md">
              <div>
                <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{j.status}</span>
                <h3 className="font-bold text-lg mt-2">{j.title}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">My Bid</p>
                <p className="font-mono font-bold text-green-600">{j.myBid ? `${fmtUSDC(BigInt(j.myBid))} USDC` : '—'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {subTab === 'created' && (
        <div className="space-y-4">
          {created.length === 0 ? <p className="text-gray-500">Anda belum membuat lelang.</p> : created.map(c => (
            <Link href={`/auction/${c.auctionCode}`} key={c.auctionId} className="block bg-white border rounded-xl p-5 flex justify-between hover:shadow-md">
              <div>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">{c.status}</span>
                <h3 className="font-bold text-lg mt-2">{c.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ wallet, kycStatus, onRefresh, adminComment }: { wallet: string, kycStatus: string, onRefresh: () => void, adminComment?: string }) {
  const [form, setForm] = useState({ fullName: '', nik: '', address: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    if (selected.size > 500 * 1024) {
      alert('Ukuran foto KTP maksimal 500KB.');
      e.target.value = '';
      return;
    }
    
    setFile(selected);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return alert('Harap upload foto KTP.');
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, ...form, ktpPhoto: preview }),
      });
      if (!res.ok) throw new Error('Failed to submit KYC');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (kycStatus === 'UNVERIFIED') {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Profile & KYC</h1>
        
        {adminComment && (
          <div className="bg-red-50 border border-red-300 p-4 rounded-xl mb-6">
            <h3 className="font-bold text-red-800 mb-1">Admin Feedback:</h3>
            <p className="text-red-700">{adminComment}</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-300 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">KYC Under Review</h2>
          <p className="text-yellow-700">Data Anda sedang ditinjau oleh Admin.</p>
        </div>
      </div>
    );
  }

  if (kycStatus === 'VERIFIED') {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Profile & KYC</h1>
        <div className="bg-green-50 border border-green-300 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold text-green-800 mb-2">✅ Identity Verified</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
      <p className="text-gray-500 mb-6">Isi data KTP Anda untuk verifikasi Admin.</p>
      
      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input type="text" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full border rounded px-3 py-2 text-black" placeholder="Budi Santoso" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NIK (16 Digit)</label>
          <input type="text" required pattern="\d{16}" value={form.nik} onChange={e => setForm({...form, nik: e.target.value})} className="w-full border rounded px-3 py-2 text-black" placeholder="3171..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
          <textarea required value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border rounded px-3 py-2 text-black" rows={3}></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto KTP (Maks 500KB)</label>
          <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border rounded px-3 py-2 text-black" />
          {preview && <img src={preview} alt="Preview KTP" className="mt-2 h-32 object-contain border rounded" />}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
          {isSubmitting ? 'Submitting...' : 'Submit KYC to Admin'}
        </button>
      </form>
    </div>
  );
}

// TAB 4: CREATE AUCTION
function CreateAuctionTab({ kycStatus, onRequireKyc }: { kycStatus: string, onRequireKyc: () => void }) {
  if (kycStatus !== 'VERIFIED') return (
    <div className="text-center mt-20">
      <h2 className="text-2xl font-bold">Access Denied</h2>
      <button onClick={onRequireKyc} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Go to Profile</button>
    </div>
  );

  return (
    <div className="max-w-3xl bg-white p-6 rounded-xl border">
      <h1 className="text-3xl font-bold mb-6">Create Auction</h1>
      <p className="text-gray-500 mb-6">Form ini membutuhkan integrasi Storage & API (Coming Soon).</p>
      <button disabled className="w-full py-3 bg-gray-400 text-white font-bold rounded-lg cursor-not-allowed">Create Auction (inactive)</button>
    </div>
  );
}