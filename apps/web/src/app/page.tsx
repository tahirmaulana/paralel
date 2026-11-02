// @file apps/web/src/app/page.tsx — Bidding UI with EIP-2612 Permit
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, usePublicClient } from 'wagmi';
import { parseUnits, parseGwei } from 'viem';
import { arbitrumSepolia } from 'wagmi/chains';
import abiData from './abi.json';

const CONTRACT_ADDRESS = "0x70b7f8096c02147274E6477d2B4F6398a910bEAb";
const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; 
const AUCTION_KEY = "0xa1d89d31c362a32af02565e4c5182512b37ef8a680d856d70b3d932b6221e0e1"; 

const erc20Abi = [
  { "constant": true, "inputs": [{ "name": "owner", "type": "address" }], "name": "nonces", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
] as const;

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();

  const { data: bidHash, writeContract: writeBid, isPending: isBidPending, error: bidError } = useWriteContract();
  
  // TAMBAHKAN isError dari useWaitForTransactionReceipt
  const { isLoading: isBidConfirming, isSuccess: isBidConfirmed, isError: isBidTxError } = useWaitForTransactionReceipt({ hash: bidHash });
  
  const { signTypedDataAsync } = useSignTypedData();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (bidError) console.error("🚨 ERROR DARI WALLET/KONTRAK:", bidError);
  }, [bidError]);

  const { data: rawRoundData, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS, abi: abiData.abi, functionName: 'rounds', args: [AUCTION_KEY, 1],
  });
  const roundData = rawRoundData as any;

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
  });
  const balance = rawBalance ? Number(rawBalance) / 1e6 : 0;

  useEffect(() => {
    if (isBidConfirmed) { 
      setTimeout(() => { refetchRound(); refetchBalance(); }, 2000); 
      setBidAmount(''); 
    }
  }, [isBidConfirmed, refetchRound, refetchBalance]);

  if (!mounted) return <div className="p-10 text-center">Loading...</div>;

  const handleBidWithPermit = async () => {
    if (!bidAmount || !address || !publicClient || !roundData) return;
    
    try {
      setIsSigning(true);
      
      let amount;
      try { amount = parseUnits(bidAmount, 6); } 
      catch (e) { alert("Format angka tidak valid"); return; }

      const startingBid = BigInt(roundData[0]);
      
      const userStake = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi: abiData.abi, functionName: 'stakes', args: [AUCTION_KEY, 1, address],
      }) as [bigint, bigint, boolean];

      const myBid = userStake[0];
      const totalRequired = myBid === BigInt(0) ? startingBid + amount : amount;

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const userNonce = await publicClient.readContract({
        address: USDC_ADDRESS, abi: erc20Abi, functionName: 'nonces', args: [address],
      });

      const signature = await signTypedDataAsync({
        domain: { name: 'USD Coin', version: '2', chainId: arbitrumSepolia.id, verifyingContract: USDC_ADDRESS },
        types: {
          Permit: [
            { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        message: { owner: address, spender: CONTRACT_ADDRESS, value: totalRequired, nonce: userNonce, deadline: deadline },
      });

      const r = signature.slice(0, 66) as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      let v = parseInt(signature.slice(130, 132), 16);
      if (v < 27) v += 27;

      // KIRIM TRANSAKSI DENGAN GAS MANUAL (Bypass bug MetaMask)
      writeBid({
        address: CONTRACT_ADDRESS, 
        abi: abiData.abi, 
        functionName: 'placeBidWithPermit',
        args: [AUCTION_KEY, 1, amount, deadline, v, r, s],
        gas: BigInt(1500000), // Paksa gas limit 1.5 juta
        maxFeePerGas: parseGwei('0.1'), // Paksa biaya max 0.1 Gwei
        maxPriorityFeePerGas: parseGwei('0.01'), // Tip 0.01 Gwei
      });

    } catch (err: any) {
      console.error("🚨 ERROR SAAT SIGN / PROSES:", err);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50 text-black">
      <h1 className="text-4xl font-bold mb-8">Paralel Auction Demo</h1>
      
      {!isConnected ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-gray-600">Connect your wallet to start bidding.</p>
          {connectors.map((connector) => (
            <button key={connector.uid} onClick={() => connect({ connector })} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              Connect {connector.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <p className="text-sm font-medium text-green-600">Connected: {address?.slice(0,6)}...{address?.slice(-4)}</p>
            <button onClick={() => disconnect()} className="text-sm text-red-600 font-medium">Disconnect</button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between">
            <span className="font-semibold text-blue-800">Your USDC Balance:</span>
            <span className="font-bold text-blue-800">{balance} USDC</span>
          </div>

          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Auction Info</h2>
            {roundData ? (
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Starting Bid</p>
                  <p className="font-bold text-lg">{Number(roundData[0]) / 1e6} USDC</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Current Bid</p>
                  <p className="font-bold text-lg text-green-600">{Number(roundData[4]) / 1e6} USDC</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Bid Increment</p>
                  <p className="font-bold">{Number(roundData[1]) / 1e6} USDC</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Current Leader</p>
                  <p className="font-bold truncate">{roundData[5] === "0x0000000000000000000000000000000000000000" ? "None" : roundData[5]}</p>
                </div>
              </div>
            ) : <p className="text-gray-500">Loading data from blockchain...</p>}
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Place a Bid (1-Click)</h3>
            
            <div className="flex gap-4 mb-4">
              <input 
                type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Amount (USDC)" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              
              <button 
                onClick={handleBidWithPermit}
                disabled={isSigning || isBidPending || isBidConfirming || !bidAmount}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {isSigning ? 'Sign Permit...' : isBidPending ? 'Check Wallet...' : isBidConfirming ? 'Confirming...' : 'Bid'}
              </button>
            </div>
            
            {bidError && (
              <p className="text-red-500 text-sm mt-2 break-words bg-red-50 p-2 rounded">
                Error: {bidError.message.split('\n')[0]}
              </p>
            )}
            {isBidTxError && (
              <p className="text-red-500 text-sm mt-2 break-words bg-red-50 p-2 rounded">
                Transaksi gagal di blockchain. Silakan coba lagi.
              </p>
            )}
            {isBidConfirmed && <p className="text-green-600 text-sm mt-2 bg-green-50 p-2 rounded">Bid successful! Updating data...</p>}
            
            <p className="text-xs text-gray-500 mt-4">
              *Note: You will sign a free message first, then confirm one gas transaction.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}