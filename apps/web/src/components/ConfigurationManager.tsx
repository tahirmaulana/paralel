'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  ParalelAuctionAbi,
} from '@paralel/contracts';
import { CONTRACT_ADDRESS } from '@/lib/web3';
import { createMutationHeaders } from '@/lib/api/client-mutation';

function parseIntegerFields(
  value: string,
  fieldCount: number,
): number[] {
  const fields = value.split(',').map((field) => field.trim());

  if (
    fields.length !== fieldCount ||
    fields.some((field) => !/^(0|[1-9]\d*)$/.test(field))
  ) {
    throw new Error(
      `Enter exactly ${fieldCount} non-negative integers separated by commas.`,
    );
  }

  const parsed = fields.map(Number);

  if (parsed.some((field) => !Number.isSafeInteger(field))) {
    throw new Error('Configuration contains an unsafe integer.');
  }

  return parsed;
}

function parseBoolean(value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('Boolean value must be true or false.');
}

function parseUnsignedBigInt(value: string): bigint {
  const normalized = value.trim();
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    throw new Error('Amount must be a non-negative integer.');
  }
  return BigInt(normalized);
}

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
  const [taxWallet, setTaxWallet] = useState('');
  const [feeConfig, setFeeConfig] = useState('250,150,100,1000,500');
  const [timingConfig, setTimingConfig] = useState('300,172800,604800,12,48,172800,604800');
  const [bidConfig, setBidConfig] = useState('500,true');
  const [rankingConfig, setRankingConfig] = useState('10');
  const [allowedIncrement, setAllowedIncrement] = useState('50000,true');
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [currencyConfig, setCurrencyConfig] = useState('');

  // Hook On-Chain untuk Relayer Wallet
  const { data: currentRelayer } = useReadContract({ address: CONTRACT_ADDRESS, abi: ParalelAuctionAbi, functionName: 'relayerWallet' });
  const { data: currentTaxWallet, refetch: refetchTaxWallet } = useReadContract({ address: CONTRACT_ADDRESS, abi: ParalelAuctionAbi, functionName: 'taxWallet' });
  const { data: currentFeeConfig, refetch: refetchFeeConfig } = useReadContract({ address: CONTRACT_ADDRESS, abi: ParalelAuctionAbi, functionName: 'feeConfig' });
  const { data: currentTimingConfig, refetch: refetchTimingConfig } = useReadContract({ address: CONTRACT_ADDRESS, abi: ParalelAuctionAbi, functionName: 'auctionTimingConfig' });
  const { data: currentBidConfig, refetch: refetchBidConfig } = useReadContract({ address: CONTRACT_ADDRESS, abi: ParalelAuctionAbi, functionName: 'bidConfig' });
  const { data: currentRankLimit, refetch: refetchRankLimit } = useReadContract({ address: CONTRACT_ADDRESS, abi: ParalelAuctionAbi, functionName: 'maxRankedCandidates' });
  const { data: currentDefaultCurrency, refetch: refetchDefaultCurrency } = useReadContract({ address: CONTRACT_ADDRESS, abi: ParalelAuctionAbi, functionName: 'defaultCurrency' });
  const { data: currentCurrencyConfig, refetch: refetchCurrencyConfig } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'currencyConfigs',
    args: [currentDefaultCurrency ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: Boolean(currentDefaultCurrency) },
  });
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  useEffect(() => {
    if (currentTaxWallet) setTaxWallet(currentTaxWallet);
    if (currentFeeConfig) {
      setFeeConfig([
        currentFeeConfig.platformBps,
        currentFeeConfig.guarantorBps,
        currentFeeConfig.notaryBps,
        currentFeeConfig.taxBps,
        currentFeeConfig.defaultFeeBps,
      ].join(','));
    }
    if (currentTimingConfig) {
      setTimingConfig([
        currentTimingConfig.signingWindow,
        currentTimingConfig.collectionWindow,
        currentTimingConfig.claimWindow,
        currentTimingConfig.minDurationHours,
        currentTimingConfig.maxDurationHours,
        currentTimingConfig.minOpenDelay,
        currentTimingConfig.maxOpenDelay,
      ].join(','));
    }
    if (currentBidConfig) {
      setBidConfig([
        currentBidConfig.maxIncrementBps,
        currentBidConfig.preBidAllowed,
      ].join(','));
    }
    if (currentRankLimit !== undefined) setRankingConfig(String(currentRankLimit));
    if (currentDefaultCurrency) {
      setDefaultCurrency(currentDefaultCurrency);
      setCurrencyConfig([
        currentDefaultCurrency,
        currentCurrencyConfig?.[0] ?? true,
        currentCurrencyConfig?.[1] ?? 6,
        currentCurrencyConfig?.[2] ?? 2500000n,
      ].join(','));
    }
  }, [
    currentBidConfig,
    currentFeeConfig,
    currentCurrencyConfig,
    currentDefaultCurrency,
    currentRankLimit,
    currentTaxWallet,
    currentTimingConfig,
  ]);

  // Handler Konfirmasi Modal
  const handleConfirm = async () => {
    if (!modalData || !comment) return alert('Comment wajib diisi!');
    setIsProcessing(true);
    setStatusMsg(null);

    try {
      if (modalData.type === 'chain') {
        let hash: `0x${string}`;
        if (modalData.name === 'RELAYER_WALLET') {
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setRelayer',
            args: [modalData.value as `0x${string}`],
          });
        } else if (modalData.name === 'TAX_WALLET') {
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setTaxWallet',
            args: [modalData.value as `0x${string}`],
          });
        } else if (modalData.name === 'FEE_CONFIG') {
          const [platformBps, guarantorBps, notaryBps, taxBps, defaultFeeBps] =
            parseIntegerFields(modalData.value, 5);
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setFeeConfig',
            args: [{
              platformBps,
              guarantorBps,
              notaryBps,
              taxBps,
              defaultFeeBps,
            }],
          });
        } else if (modalData.name === 'CURRENCY_CONFIG') {
          const [currency, supported, decimals, withdrawalFee] =
            modalData.value.split(',').map((field) => field.trim());
          if (!/^0x[0-9a-fA-F]{40}$/.test(currency ?? '')) {
            throw new Error('Currency must be a valid EVM address.');
          }
          const parsedNumbers = parseIntegerFields(
            `${decimals ?? ''},${withdrawalFee ?? ''}`,
            2,
          );
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setCurrencyConfig',
            args: [
              currency as `0x${string}`,
              parseBoolean(supported ?? ''),
              parsedNumbers[0],
              BigInt(parsedNumbers[1]),
            ],
          });
        } else if (modalData.name === 'DEFAULT_CURRENCY') {
          if (!/^0x[0-9a-fA-F]{40}$/.test(modalData.value.trim())) {
            throw new Error('Default currency must be a valid EVM address.');
          }
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setDefaultCurrency',
            args: [modalData.value.trim() as `0x${string}`],
          });
        } else if (modalData.name === 'AUCTION_TIMING') {
          const [signingWindow, collectionWindow, claimWindow, minDurationHours, maxDurationHours, minOpenDelay, maxOpenDelay] =
            parseIntegerFields(modalData.value, 7);
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setAuctionTimingConfig',
            args: [{
              signingWindow,
              collectionWindow,
              claimWindow,
              minDurationHours,
              maxDurationHours,
              minOpenDelay,
              maxOpenDelay,
            }],
          });
        } else if (modalData.name === 'BID_CONFIG') {
          const [maxIncrementBps, preBidFlag] = modalData.value.split(',').map((field) => field.trim());
          const [parsedMaxIncrementBps] = parseIntegerFields(maxIncrementBps ?? '', 1);
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setBidConfig',
            args: [{
              maxIncrementBps: parsedMaxIncrementBps,
              preBidAllowed: parseBoolean(preBidFlag ?? ''),
            }],
          });
        } else if (modalData.name === 'RANKING_CONFIG') {
          const [maxRankedCandidates] = parseIntegerFields(modalData.value, 1);
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setRankingConfig',
            args: [maxRankedCandidates],
          });
        } else if (modalData.name === 'ALLOWED_INCREMENT') {
          const [increment, allowedFlag] = modalData.value.split(',').map((field) => field.trim());
          const parsedIncrement = parseUnsignedBigInt(increment ?? '');
          hash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: ParalelAuctionAbi,
            functionName: 'setAllowedIncrement',
            args: [parsedIncrement, parseBoolean(allowedFlag ?? '')],
          });
        } else {
          throw new Error('Unknown contract configuration action.');
        }
        setTxHash(hash);
      } else {
        // API Call (Cloudflare Secrets via Configuration API)
        const res = await fetch('/api/platform-admin/configuration', {
          method: 'POST',
          headers: createMutationHeaders(
            'platform-admin-configuration',
          ),
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
      void Promise.all([
        refetchFeeConfig(),
        refetchTimingConfig(),
        refetchBidConfig(),
        refetchRankLimit(),
        refetchTaxWallet(),
        refetchDefaultCurrency(),
        refetchCurrencyConfig(),
      ]);
      setModalData(null);
      setComment('');
      setIsProcessing(false);
    }
  }, [
    isTxSuccess,
    modalData,
    refetchBidConfig,
    refetchCurrencyConfig,
    refetchDefaultCurrency,
    refetchFeeConfig,
    refetchRankLimit,
    refetchTaxWallet,
    refetchTimingConfig,
  ]);

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

            <tr className="border-b">
              <td className="p-4 font-bold">
                Tax Wallet<br />
                <span className="text-xs font-normal text-gray-500">Current: {currentTaxWallet ?? '...'}; new auctions only.</span>
              </td>
              <td className="p-4">
                <input type="text" value={taxWallet} onChange={e => setTaxWallet(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="0x..." />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('TAX_WALLET', 'Tax Wallet', 'chain', taxWallet)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            <tr className="border-b bg-gray-50">
              <td className="p-4 font-bold">
                Fee Configuration<br />
                <span className="text-xs font-normal text-gray-500">Current: {currentFeeConfig ? [
                  currentFeeConfig.platformBps,
                  currentFeeConfig.guarantorBps,
                  currentFeeConfig.notaryBps,
                  currentFeeConfig.taxBps,
                  currentFeeConfig.defaultFeeBps,
                ].join(', ') : '...'}</span>
              </td>
              <td className="p-4">
                <input type="text" value={feeConfig} onChange={e => setFeeConfig(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="platform,guarantor,notary,tax,default BPS" />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('FEE_CONFIG', 'Fee Configuration', 'chain', feeConfig)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            <tr className="border-b">
              <td className="p-4 font-bold">
                Default Currency<br />
                <span className="text-xs font-normal text-gray-500">Current: {currentDefaultCurrency ?? '...'}</span>
              </td>
              <td className="p-4">
                <input type="text" value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="0x..." />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('DEFAULT_CURRENCY', 'Default Currency', 'chain', defaultCurrency)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            <tr className="border-b bg-gray-50">
              <td className="p-4 font-bold">
                Currency Configuration<br />
                <span className="text-xs font-normal text-gray-500">Current: {currentCurrencyConfig ? [
                  currentCurrencyConfig[0],
                  currentCurrencyConfig[1],
                  currentCurrencyConfig[2],
                ].join(', ') : '...'}</span>
              </td>
              <td className="p-4">
                <input type="text" value={currencyConfig} onChange={e => setCurrencyConfig(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="address,supported,decimals,withdrawal fee" />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('CURRENCY_CONFIG', 'Currency Configuration', 'chain', currencyConfig)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            <tr className="border-b">
              <td className="p-4 font-bold">
                Auction Timing<br />
                <span className="text-xs font-normal text-gray-500">Current: {currentTimingConfig ? [
                  currentTimingConfig.signingWindow,
                  currentTimingConfig.collectionWindow,
                  currentTimingConfig.claimWindow,
                  currentTimingConfig.minDurationHours,
                  currentTimingConfig.maxDurationHours,
                  currentTimingConfig.minOpenDelay,
                  currentTimingConfig.maxOpenDelay,
                ].join(', ') : '...'}</span>
              </td>
              <td className="p-4">
                <input type="text" value={timingConfig} onChange={e => setTimingConfig(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="sign,collect,claim sec,min/max hours,min/max open delay sec" />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('AUCTION_TIMING', 'Auction Timing', 'chain', timingConfig)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            <tr className="border-b bg-gray-50">
              <td className="p-4 font-bold">
                Bidding Policy<br />
                <span className="text-xs font-normal text-gray-500">Current: {currentBidConfig ? [
                  currentBidConfig.maxIncrementBps,
                  currentBidConfig.preBidAllowed,
                ].join(', ') : '...'}</span>
              </td>
              <td className="p-4">
                <input type="text" value={bidConfig} onChange={e => setBidConfig(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="maximum increment BPS, pre-bid true/false" />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('BID_CONFIG', 'Bidding Policy', 'chain', bidConfig)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            <tr className="border-b">
              <td className="p-4 font-bold">
                Ranked Candidates<br />
                <span className="text-xs font-normal text-gray-500">Current: {currentRankLimit?.toString() ?? '...'} / 10 maximum</span>
              </td>
              <td className="p-4">
                <input type="text" value={rankingConfig} onChange={e => setRankingConfig(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="1-10" />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('RANKING_CONFIG', 'Ranked Candidates', 'chain', rankingConfig)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
              </td>
            </tr>

            <tr className="border-b bg-gray-50">
              <td className="p-4 font-bold">Allowed Increment</td>
              <td className="p-4">
                <input type="text" value={allowedIncrement} onChange={e => setAllowedIncrement(e.target.value)} className="w-full border p-2 rounded text-black font-mono text-sm" placeholder="amount in USDC base units,true/false" />
              </td>
              <td className="p-4 text-right">
                <button onClick={() => openModal('ALLOWED_INCREMENT', 'Allowed Increment', 'chain', allowedIncrement)} className="px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">Execute</button>
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