'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import abiData from '@/app/abi.json';
import { CONTRACT_ADDRESS } from '@/lib/web3';

export function ConfigurationManager() {
  const [modalData, setModalData] = useState<{ name: string; label: string; type: 'api' | 'chain'; value: string } | null>(null);
  const [comment, setComment] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // State untuk Input
  const [dbUrl, setDbUrl] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [relayerWallet, setRelayerWallet] = useState('');
  const [relayerKey, setRelayerKey] = useState('');

  // Hook On-Chain untuk Relayer Wallet
  const { data: currentRelayer } = useReadContract({ address: CONTRACT_ADDRESS, abi: abiData.abi, functionName: 'relayerWallet' });
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  // Handler Konfirmasi Modal
  const handleConfirm = async () => {
    if (!modalData || !comment) return alert('Comment wajib diisi!');
    setIsProcessing(true);
    setStatusMsg(null);

    try {
      if (modalData.type === 'chain') {
        // On-Chain Call (MetaMask)
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: abiData.abi,
          functionName: 'setRelayer',
          args: [modalData.value as `0x${string}`],
        });
        setTxHash(hash);
      } else {
        // API Call (Cloudflare Secrets via Configuration API)
        const res = await fetch('/api/platform-admin/configuration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secretName: modalData.name, secretValue: modalData.value, comment }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal update secret');
        
        setStatusMsg({ type: 'success', text: `Successfully updated ${modalData.label}!` });
        setModalData(null);
        setComment('');
        setIsProcessing(false);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
      setIsProcessing(false);
    }
  };

  // Efek untuk On-Chain Success
  useEffect(() => {
    if (isTxSuccess && modalData?.type === 'chain') {
      setStatusMsg({ type: 'success', text: `Successfully updated ${modalData.label} on-chain!` });
      setModalData(null);
      setComment('');
      setIsProcessing(false);
    }
  }, [isTxSuccess, modalData]);

  const openModal = (name: string, label: string, type: 'api' | 'chain', value: string) => {
    if (!value) return alert('Nilai tidak boleh kosong');
    setModalData({ name, label, type, value });
    setComment('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 w-1/4">Configuration</th>
              <th className="p-4 w-1/2">New Value</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {/* Database */}
            <tr className="border-b">
              <td className="p-4 font-bold">Database Endpoint</td>
              <td className="p-4">
                <input type="text" value={dbUrl} onChange={e => setDbUrl(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="postgresql://..." />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('DATABASE_URL', 'Database Endpoint', 'api', dbUrl)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Execute</button>
              </td>
            </tr>

            {/* RPC */}
            <tr className="border-b">
              <td className="p-4 font-bold">RPC Endpoint</td>
              <td className="p-4">
                <input type="text" value={rpcUrl} onChange={e => setRpcUrl(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="https://..." />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('ARBITRUM_RPC_URL', 'RPC Endpoint', 'api', rpcUrl)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Execute</button>
              </td>
            </tr>

            {/* Relayer Wallet */}
            <tr className="border-b bg-gray-50">
              <td className="p-4 font-bold">
                Relayer Wallet <br/>
                <span className="text-xs font-normal text-gray-500">Current: {currentRelayer as string || '...'}</span>
              </td>
              <td className="p-4">
                <input type="text" value={relayerWallet} onChange={e => setRelayerWallet(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="0x..." />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('RELAYER_WALLET', 'Relayer Wallet', 'chain', relayerWallet)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            {/* Relayer Key */}
            <tr className="border-b">
              <td className="p-4 font-bold">Relayer Key</td>
              <td className="p-4">
                <input type="password" value={relayerKey} onChange={e => setRelayerKey(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="0x..." />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('RELAYER_PRIVATE_KEY', 'Relayer Key', 'api', relayerKey)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Execute</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* STATUS MESSAGE BOX */}
      {statusMsg && (
        <div className={`p-4 rounded-lg border font-bold ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {statusMsg.type === 'success' ? '✅ ' : '❌ '} {statusMsg.text}
        </div>
      )}

      {/* MODAL KONFIRMASI */}
      {modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-2">Confirm Update</h3>
            <p className="text-sm text-gray-600 mb-4">
              Apakah Anda yakin ingin memperbarui <strong>{modalData.label}</strong>?
              {modalData.type === 'chain' && <span className="block text-purple-600 mt-1">*Tindakan ini memerlukan konfirmasi MetaMask (On-Chain).</span>}
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Comment / Reason (Wajib)</label>
              <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)}
                className="w-full border p-2 rounded text-black text-sm" 
                rows={3} 
                placeholder="Masukkan alasan perubahan..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModalData(null)} disabled={isProcessing} className="px-4 py-2 border rounded font-bold hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={handleConfirm} disabled={isProcessing || !comment} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-gray-400">
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}