// @file apps/web/src/components/NotaryDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useConnection, useSignTypedData, usePublicClient, useReadContract } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { CONTRACT_ADDRESS, fmtUSDC } from '@/lib/web3';
import abiData from '@/app/abi.json';

type Notary = {
  partnerId: string;
  name: string;
  wallet: string;
  email: string | null;
};

export function NotaryDashboard({ notary }: { notary: Notary }) {
  const { address } = useConnection();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();
  
  const [activeTab, setActiveTab] = useState<'submission' | 'collections' | 'run' | 'commission' | 'profile'>('submission');
  const [isSigning, setIsSigning] = useState(false);

  // State untuk data dummy (karena kita belum buat query get-nya ke client)
  const [pendingData, setPendingData] = useState<any[]>([]);
  const [collectionsData, setCollectionsData] = useState<any[]>([]);
  
  // Fetch data dummy dari API / DB saat komponen dimuat
  useEffect(() => {
    // Di implementasi nyata, ini memanggil API GET /api/notary/data
    // Untuk sekarang kita isi manual dummy dulu agar UI bisa dilihat
    setPendingData([
      { id: 'dummy-1', code: 'AUC-123', title: 'Honda Vario 160', startingBid: 2000000n, increment: 50000n },
    ]);
    setCollectionsData([
      { id: 'dummy-2', code: 'AUC-456', title: 'MacBook Pro M3', winner: '0x123...abc', status: 'COLLECTION' },
    ]);
  }, []);

  const handleSignInbound = async (auction: any) => {
    if (!publicClient || !address) return;
    setIsSigning(true);
    try {
      // 1. Generate Kode Acak (6 digit)
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // 2. Siapkan Payload EIP-712 (NotaryApproval)
      const nonce = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi: abiData.abi, functionName: 'nonces', args: [address]
      }) as bigint;
      
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
      // Hash parameter (harus sesuai dengan SC)
      // (Untuk demo, kita pakai dummy hash)
      const paramsHash = '0x0000000000000000000000000000000000000000000000000000000000000000'; 
      const codeHash = '0x0000000000000000000000000000000000000000000000000000000000000000'; // hash dari generatedCode

      const signature = await signTypedDataAsync({
        domain: { name: 'ParalelAuction', version: '1', chainId: arbitrumSepolia.id, verifyingContract: CONTRACT_ADDRESS },
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
          auctionKey: auction.code, // Dummy
          paramsHash,
          confirmationCodeHash: codeHash,
          nonce,
          expiry,
        },
      });

      // 3. Kirim ke API
      const res = await fetch('/api/notary/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: auction.id,
          notaryWallet: address,
          confirmationCode: generatedCode,
          signature,
        }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan approval');
      
      alert(`Berhasil disetujui!\nKode Konfirmasi: ${generatedCode}\n(Simulasi: Kode telah dikirim ke email Consignor)`);
      
    } catch (err: any) {
      alert(err.shortMessage || err.message);
    } finally {
      setIsSigning(false);
    }
  };

  const tabs = [
    { id: 'submission', label: 'Submission' },
    { id: 'collections', label: 'Collections' },
    { id: 'run', label: 'Auction Run' },
    { id: 'commission', label: 'Commission' },
    { id: 'profile', label: 'Profile' },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notary Dashboard</h1>
        <div className="text-right">
          <p className="font-bold text-lg">{notary.name}</p>
          <p className="text-sm font-mono text-gray-500">{notary.wallet}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b mb-6">
        {tabs.map((t) => (
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

      {/* Content Area */}
      <div className="bg-white border rounded-lg p-6 min-h-[400px]">
        
        {/* Tab 1: Submission */}
        {activeTab === 'submission' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Pending Approval (In-bound)</h2>
            {pendingData.length === 0 ? <p className="text-gray-500">No pending auctions.</p> : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3">Auction Code</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Starting Bid</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingData.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="p-3 font-mono text-sm">{a.code}</td>
                      <td className="p-3">{a.title}</td>
                      <td className="p-3 font-mono">{fmtUSDC(a.startingBid)} USDC</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleSignInbound(a)}
                          disabled={isSigning}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {isSigning ? 'Signing...' : 'Sign Approval'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Collections */}
        {activeTab === 'collections' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Collections (Out-bound)</h2>
            <p className="text-sm text-gray-500 mb-4">E-Certificate otomatis dibuat saat pemenang menandatangani (Sign Award).</p>
            {collectionsData.length === 0 ? <p className="text-gray-500">No collections yet.</p> : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3">Auction Code</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionsData.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="p-3 font-mono text-sm">{a.code}</td>
                      <td className="p-3">{a.title}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button className="px-3 py-1.5 border border-blue-600 text-blue-600 text-sm rounded hover:bg-blue-50">
                          View e-Certificate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Auction Run */}
        {activeTab === 'run' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Auction Run</h2>
            <p className="text-gray-500">Daftar lelang yang sedang SCHEDULED atau OPEN.</p>
            {/* Placeholder untuk tabel Auction Run */}
          </div>
        )}

        {/* Tab 4: Commission */}
        {activeTab === 'commission' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Commission</h2>
            <div className="bg-gray-50 border p-6 rounded-lg max-w-sm text-center">
              <p className="text-gray-500 mb-2">Available Commission</p>
              <p className="text-3xl font-bold mb-4">0.00 USDC</p>
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">
                Withdraw Commission
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Profile */}
        {activeTab === 'profile' && (
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
                <p className="font-medium">{notary.email || '-'}</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium">
                Request Data Update
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}