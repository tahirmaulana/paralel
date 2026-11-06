'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import abiData from '@/app/abi.json';
import { CONTRACT_ADDRESS } from '@/lib/web3';

export default function PlatformAdmin() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('notary'); // notary, guarantor, tax, relayer

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'owner',
  });
  
  const isOwner = isConnected && owner && address?.toLowerCase() === (owner as string)?.toLowerCase();

  if (!isConnected) return <div className="p-8 text-center">Connect Wallet dulu.</div>;
  if (!isOwner) return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Hanya Contract Owner yang bisa mengakses.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Platform Admin Control Panel</h1>
      
      {/* TABS MENU */}
      <div className="flex border-b mb-6 space-x-4">
        <button onClick={() => setActiveTab('notary')} className={`pb-2 font-bold ${activeTab === 'notary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Notaries</button>
        <button onClick={() => setActiveTab('guarantor')} className={`pb-2 font-bold ${activeTab === 'guarantor' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Guarantors</button>
        <button onClick={() => setActiveTab('tax')} className={`pb-2 font-bold ${activeTab === 'tax' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Tax</button>
        <button onClick={() => setActiveTab('relayer')} className={`pb-2 font-bold ${activeTab === 'relayer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Relayer</button>
      </div>

      {/* CONTENT */}
      {activeTab === 'notary' && <PartnerManager type="NOTARY" />}
      {activeTab === 'guarantor' && <PartnerManager type="GUARANTOR" />}
      {activeTab === 'tax' && <TaxReadOnly />}
      {activeTab === 'relayer' && <RelayerManager />}
    </div>
  );
}

// ─── KOMPONEN PARTNER MANAGER (Notary & Guarantor) ───
function PartnerManager({ type }: { type: 'NOTARY' | 'GUARANTOR' }) {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ wallet: '', name: '', documentNumber: '', address: '', photo: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDbSave, setPendingDbSave] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/platform-admin/partners?type=${type}`);
    const json = await res.json();
    if (res.ok) setList(json.data);
  }, [type]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    if (isTxSuccess && pendingDbSave) {
      const saveToDb = async () => {
        try {
          await fetch('/api/platform-admin/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, type }),
          });
          alert('✅ Berhasil didaftarkan On-chain dan disimpan ke Database!');
          setForm({ wallet: '', name: '', documentNumber: '', address: '', photo: '' });
          setPendingDbSave(false);
          setTxHash(null);
          fetchList();
        } catch (err: any) {
          alert('Gagal simpan ke DB: ' + err.message);
        }
      };
      saveToDb();
    }
  }, [isTxSuccess, pendingDbSave, form, type, fetchList]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm({ ...form, photo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.wallet) return;
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'setPartner',
        args: [form.wallet as `0x${string}`, type === 'NOTARY' ? 0 : 1, 0, true],
      });
      setTxHash(hash);
      setPendingDbSave(true);
    } catch (err: any) {
      alert(err.shortMessage || err.message);
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (wallet: string) => {
    const reason = prompt(`Masukkan alasan menghapus ${type} ${wallet}:`);
    if (!reason) return;
    try {
      alert('Memproses transaksi on-chain... (Cek MetaMask)');
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'setPartner',
        args: [wallet as `0x${string}`, type === 'NOTARY' ? 0 : 1, 0, false],
      });
      alert('✅ Berhasil dinonaktifkan on-chain. Tabel akan direfresh.');
      fetchList();
    } catch (err: any) {
      alert(err.shortMessage || err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Add New {type}</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Wallet Address</label>
            <input type="text" required value={form.wallet} onChange={e => setForm({...form, wallet: e.target.value})} className="w-full border p-2 rounded text-black font-mono" placeholder="0x..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border p-2 rounded text-black" placeholder="Nama Instansi" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{type === 'NOTARY' ? 'Nomor SK' : 'Nomor SIUP'}</label>
            <input type="text" value={form.documentNumber} onChange={e => setForm({...form, documentNumber: e.target.value})} className="w-full border p-2 rounded text-black" placeholder="Nomor Dokumen" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alamat Fisik</label>
            <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border p-2 rounded text-black" placeholder="Jl. Contoh No. 1" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Foto / Dokumen</label>
            <input type="file" accept="image/*" onChange={handleFileChange} className="w-full border p-2 rounded text-black" />
          </div>
          <div className="col-span-2 mt-4">
            <button type="submit" disabled={isSubmitting || pendingDbSave} className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 disabled:bg-gray-400">
              {isSubmitting ? 'Memproses Blockchain & DB...' : `Deploy & Save ${type}`}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Wallet</th>
              <th className="p-4">Nomor SK/SIUP</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">Belum ada data.</td></tr>}
            {list.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{item.name}</td>
                <td className="p-4 font-mono text-xs">{item.wallet}</td>
                <td className="p-4">{item.documentNumber}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleRemove(item.wallet)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── KOMPONEN TAB TAX (READ-ONLY) ───
function TaxReadOnly() {
  const { data: taxWallet } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'taxWallet',
  });

  return (
    <div className="bg-white border p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">Tax Wallet</h2>
      <div className="bg-gray-50 border p-4 rounded-lg">
        <p className="text-sm text-gray-500 mb-1">Current Tax Wallet (Immutable):</p>
        <p className="font-mono font-bold text-lg">{taxWallet as string || 'Loading...'}</p>
      </div>
      <p className="text-sm text-red-500 mt-4">
        *Alamat ini tidak dapat diubah karena ditetapkan saat deploy kontrak.
      </p>
    </div>
  );
}

// ─── KOMPONEN TAB RELAYER ───
function RelayerManager() {
  const [newRelayer, setNewRelayer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: currentRelayer, refetch: refetchRelayer } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'relayerWallet',
  });

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (isTxSuccess) {
      refetchRelayer();
      setNewRelayer('');
      setIsSubmitting(false);
    }
  }, [isTxSuccess, refetchRelayer]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelayer) return;
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'setRelayer',
        args: [newRelayer as `0x${string}`],
      });
      setTxHash(hash);
    } catch (err: any) {
      alert(err.shortMessage || err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 border p-4 rounded-lg">
        <p className="text-sm text-gray-500 mb-1">Current Relayer Wallet (On-Chain):</p>
        <p className="font-mono font-bold text-lg">{currentRelayer as string || 'Loading...'}</p>
      </div>

      <form onSubmit={handleUpdate} className="bg-white border p-6 rounded-lg shadow-sm space-y-4">
        <h2 className="text-xl font-bold">Deploy New Relayer</h2>
        <p className="text-sm text-gray-500">Pastikan wallet baru sudah memiliki saldo ETH Sepolia untuk gas fee.</p>
        
        <div>
          <label className="block text-sm font-medium mb-1">New Relayer Address</label>
          <input type="text" required value={newRelayer} onChange={(e) => setNewRelayer(e.target.value)} className="w-full border p-2 rounded text-black font-mono" placeholder="0x..." />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 disabled:bg-gray-400">
          {isSubmitting ? 'Memproses...' : 'Deploy setRelayer'}
        </button>
      </form>

      {isTxSuccess && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <h3 className="text-green-800 font-bold mb-1">✅ Relayer On-Chain Berhasil Diubah!</h3>
          <p className="text-sm text-green-700">Tx Hash: <span className="font-mono text-xs">{txHash}</span></p>
          <p className="text-sm font-bold text-gray-800 mt-4">Done! Jangan lupa untuk update Indexer & Keeper too!</p>
        </div>
      )}
    </div>
  );
}