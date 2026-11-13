'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import {
  ParalelAuctionAbi,
} from '@paralel/contracts';
import {
  GUARANTOR_COMPATIBILITY_CATEGORY,
} from '@paralel/contracts';
import {
  CONTRACT_ADDRESS,
} from '@/lib/web3';
import { ConfigurationManager } from '@/components/ConfigurationManager';
import { UserAdminManager } from '@/components/UserAdminManager';
import { ConnectButton } from '@/components/ConnectButton';
import {
  createMutationHeaders,
} from '@/lib/api/client-mutation';
import {
  createEip1559FeeOverrides,
} from '@/lib/contracts/transaction-fees';
import {
  uploadPartnerPhoto,
} from '@/lib/platform-admin/partner-upload';

export default function PlatformAdmin() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('notary'); // notary, guarantor, tax, user-admins, configuration
  const [mounted, setMounted] = useState(false);
  const [sessionCheck, setSessionCheck] = useState<{
    wallet: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message ?? `Session check failed (${response.status})`);
        }
        if (result.data?.wallet?.toLowerCase() !== address.toLowerCase()) {
          throw new Error('Authenticate the connected contract owner wallet to continue.');
        }
        if (active) {
          setSessionCheck({ wallet: address });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSessionCheck({
            wallet: address,
            error: error instanceof Error ? error.message : 'Session validation failed.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [address, isConnected]);

  const { data: owner, isLoading: isLoadingOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'owner',
  });
  
  const isOwner = isConnected && owner && address?.toLowerCase() === (owner as string)?.toLowerCase();
  const sessionReady = !!address && sessionCheck?.wallet === address && !sessionCheck.error;
  const sessionError = address && sessionCheck?.wallet === address ? sessionCheck.error : null;

  if (!mounted) return null; 

  if (isConnected && (isLoadingOwner || !sessionReady && !sessionError)) {
    return <div className="p-8 text-center text-gray-500">Memverifikasi Owner Kontrak...</div>;
  }

  if (!isConnected) return <div className="p-8 text-center">Connect Wallet dulu.</div>;
  if (!sessionReady) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="mb-4 text-red-600">{sessionError ?? 'Authenticate the contract owner wallet to continue.'}</p>
        <ConnectButton variant="landing" />
      </div>
    );
  }
  if (!isOwner) return <div className="p-8 text-center text-red-500 font-bold">Access Denied. Hanya Contract Owner yang bisa mengakses.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Platform Admin Control Panel</h1>
      
      {/* TABS MENU */}
      <div className="flex border-b mb-6 space-x-4">
        <button onClick={() => setActiveTab('notary')} className={`pb-2 font-bold ${activeTab === 'notary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Notaries</button>
        <button onClick={() => setActiveTab('guarantor')} className={`pb-2 font-bold ${activeTab === 'guarantor' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Guarantors</button>
        <button onClick={() => setActiveTab('tax')} className={`pb-2 font-bold ${activeTab === 'tax' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Tax</button>
        <button onClick={() => setActiveTab('user-admins')} className={`pb-2 font-bold ${activeTab === 'user-admins' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>User Admins</button>
        <button onClick={() => setActiveTab('configuration')} className={`pb-2 font-bold ${activeTab === 'configuration' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Configuration</button>
      </div>

      {/* CONTENT */}
      {activeTab === 'notary' && <PartnerManager type="NOTARY" />}
      {activeTab === 'guarantor' && <PartnerManager type="GUARANTOR" />}
      {activeTab === 'tax' && <TaxReadOnly />}
      {activeTab === 'user-admins' && <UserAdminManager />}
      {activeTab === 'configuration' && <ConfigurationManager />}
    </div>
  );
}

// ─── KOMPONEN PARTNER MANAGER (Notary & Guarantor) ───
function PartnerManager({ type }: { type: 'NOTARY' | 'GUARANTOR' }) {
  const partnerCategories = [
    'ALL',
    'OTOMOTIF',
    'PROPERTI',
    'ELEKTRONIK',
    'AKSESORIS_HOBI',
    'PERHIASAN',
  ] as const;
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({
    wallet: '',
    name: '',
    category: '',
    city: '',
    documentNumber: '',
    address: '',
    photo: '',
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDbSave, setPendingDbSave] = useState(false);

  const publicClient = usePublicClient({
    chainId: arbitrumSepolia.id,
  });
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/platform-admin/partners?type=${type}`);
    const json = await res.json();
    if (res.ok) setList(json.data);
  }, [type]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const estimatePartnerFeeOverrides = async () => {
    if (!publicClient) {
      throw new Error(
        'Arbitrum Sepolia RPC client is unavailable. Please retry.',
      );
    }

    const [block, estimate] = await Promise.all([
      publicClient.getBlock({
        blockTag: 'latest',
      }),
      publicClient.estimateFeesPerGas({
        type: 'eip1559',
      }),
    ]);

    if (block.baseFeePerGas === null) {
      throw new Error(
        'The latest Arbitrum Sepolia block does not provide an EIP-1559 base fee.',
      );
    }

    return createEip1559FeeOverrides(
      block.baseFeePerGas,
      estimate,
    );
  };

  useEffect(() => {
    if (isTxSuccess && pendingDbSave) {
      const saveToDb = async () => {
        try {
          const photoKey =
            selectedPhoto
              ? await uploadPartnerPhoto(
                  selectedPhoto,
                )
              : null;
          const response = await fetch('/api/platform-admin/partners', {
            method: 'POST',
            headers: createMutationHeaders(
              'platform-admin-partner-register',
            ),
            body: JSON.stringify({
              wallet: form.wallet,
              name: form.name,
              category:
                type === 'GUARANTOR'
                  ? form.category
                  : null,
              city:
                type === 'GUARANTOR'
                  ? form.city
                  : null,
              documentNumber: form.documentNumber,
              address: form.address,
              type,
              photo: photoKey,
            }),
          });
          const result = await response
            .json()
            .catch(() => null) as {
              error?: { message?: string };
              message?: string;
            } | null;
          if (!response.ok) {
            throw new Error(
              result?.error?.message ??
                result?.message ??
                `Partner database save failed (${response.status}).`,
            );
          }

          alert('✅ Berhasil didaftarkan On-chain dan disimpan ke Database!');
          setForm({
            wallet: '',
            name: '',
            category: '',
            city: '',
            documentNumber: '',
            address: '',
            photo: '',
          });
          setSelectedPhoto(null);
          setPendingDbSave(false);
          setIsSubmitting(false);
          setTxHash(null);
          fetchList();
        } catch (error: unknown) {
          setPendingDbSave(false);
          setIsSubmitting(false);
          alert(
            'Transaksi on-chain berhasil, tetapi penyimpanan database gagal: ' +
              (error instanceof Error
                ? error.message
                : 'Unexpected error.'),
          );
        }
      };
      saveToDb();
    }
  }, [isTxSuccess, pendingDbSave, form, selectedPhoto, type, fetchList]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedPhoto(null);
      return;
    }
    if (
      file.size <= 0 ||
      file.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      alert('Foto partner harus JPG, PNG, atau WEBP dengan ukuran maksimal 5 MB.');
      e.target.value = '';
      setSelectedPhoto(null);
      return;
    }
    setSelectedPhoto(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.wallet || !form.name.trim()) {
      alert('Wallet address dan nama partner wajib diisi.');
      return;
    }
    if (
      type === 'GUARANTOR' &&
      (!form.category || !form.city.trim())
    ) {
      alert('Kategori dan kota wajib diisi untuk Guarantor.');
      return;
    }
    setIsSubmitting(true);
    try {
      const feeOverrides =
        await estimatePartnerFeeOverrides();
      const hash = await writeContractAsync({
        chainId: arbitrumSepolia.id,
        address: CONTRACT_ADDRESS,
        abi: ParalelAuctionAbi,
        functionName: 'setPartner',
        args: [
          form.wallet as `0x${string}`,
          type === 'NOTARY' ? 0 : 1,
          type === 'GUARANTOR'
            ? GUARANTOR_COMPATIBILITY_CATEGORY
            : 0,
          true,
        ],
        ...feeOverrides,
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
      const feeOverrides =
        await estimatePartnerFeeOverrides();
      await writeContractAsync({
        chainId: arbitrumSepolia.id,
        address: CONTRACT_ADDRESS,
        abi: ParalelAuctionAbi,
        functionName: 'setPartner',
        args: [wallet as `0x${string}`, type === 'NOTARY' ? 0 : 1, 0, false],
        ...feeOverrides,
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
          {type === 'GUARANTOR' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Kategori</label>
                <select
                  required
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border p-2 rounded text-black"
                >
                  <option value="">Pilih kategori</option>
                  {partnerCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kota</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })}
                  className="w-full border p-2 rounded text-black"
                  placeholder="Kota operasional"
                />
              </div>
            </>
          )}
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
    abi: ParalelAuctionAbi,
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