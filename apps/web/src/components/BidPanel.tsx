// @file apps/web/src/components/BidPanel.tsx — Bid via EIP-2612 permit
'use client';

import { useState } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { parseGwei } from 'viem';
import abiData from '@/app/abi.json';
import {
  CONTRACT_ADDRESS,
  USDC_ADDRESS,
  USDC_PERMIT_DOMAIN_NAME,
  USDC_PERMIT_DOMAIN_VERSION,
  fmtUSDC,
  parseUSDC,
  statusNameFromId,
} from '@/lib/web3';

const erc20Abi = [
  {
    type: 'function',
    name: 'nonces',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

type Props = {
  auctionKey: `0x${string}`;
  roundNo: number;
  consignorWallet: `0x${string}`;
};

export function BidPanel({ auctionKey, roundNo, consignorWallet }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [amountInput, setAmountInput] = useState('');
  const [signing, setSigning] = useState(false);

  const { data: statusRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'statusOf',
    args: [auctionKey],
  });

  const { data: roundRaw } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'getRound',
    args: [auctionKey, roundNo],
  });

  const { data: myStake, refetch: refetchStake } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: abiData.abi,
    functionName: 'stakes',
    args: address ? [auctionKey, roundNo, address] : undefined,
    query: { enabled: !!address },
  });

  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  if (!isConnected || !address) {
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <p className="text-gray-500">Connect your wallet to bid.</p>
      </div>
    );
  }

  const status =
    typeof statusRaw === 'number' ? statusNameFromId(statusRaw) : null;
  const round = roundRaw as any;
  const stake = myStake as readonly [bigint, bigint, boolean] | undefined;

  const isConsignor =
    address.toLowerCase() === consignorWallet.toLowerCase();
  const now = BigInt(Math.floor(Date.now() / 1000));
  const bidsOpen =
    round &&
    (status === 'SCHEDULED' || status === 'OPEN') &&
    now < BigInt(round.closeAt);

  if (!bidsOpen || isConsignor) {
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <p className="text-gray-500">
          {isConsignor
            ? 'You are the consignor of this auction.'
            : `Bidding unavailable. Status: ${status ?? '...'}`}
        </p>
      </div>
    );
  }

  const startingBid = BigInt(round.startingBid);
  const bidIncrement = BigInt(round.bidIncrement);
  const myBid = stake?.[0] ?? 0n;
  const firstBid = myBid === 0n;

  async function handleBid() {
    if (!round || !publicClient) return;
    setSigning(true);
    try {
      const added = parseUSDC(amountInput);
      if (added === 0n || added % bidIncrement !== 0n) {
        throw new Error(
          `Amount must be a multiple of ${fmtUSDC(bidIncrement)} USDC`,
        );
      }
      const totalRequired = firstBid ? startingBid + added : added;

      // Baca nonce USDC terbaru SEBELUM tanda tangan (bisa berubah sejak render)
      const userNonce = (await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'nonces',
        args: [address!],
      })) as bigint;

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const signature = await signTypedDataAsync({
        domain: {
          name: USDC_PERMIT_DOMAIN_NAME,
          version: USDC_PERMIT_DOMAIN_VERSION,
          chainId: arbitrumSepolia.id,
          verifyingContract: USDC_ADDRESS,
        },
        types: {
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        message: {
          owner: address!,
          spender: CONTRACT_ADDRESS,
          value: totalRequired,
          nonce: userNonce,
          deadline,
        },
      });

      const r = signature.slice(0, 66) as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      let v = parseInt(signature.slice(130, 132), 16);
      if (v < 27) v += 27;

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: abiData.abi,
        functionName: 'placeBidWithPermit',
        args: [auctionKey, roundNo, added, deadline, v, r, s],
        maxFeePerGas: parseGwei('0.1'),
        maxPriorityFeePerGas: parseGwei('0.01'),
      });
      setTxHash(hash);
      setTimeout(() => refetchStake(), 3000);
    } catch (err: any) {
      alert(err?.shortMessage ?? err?.message ?? 'Bid failed');
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 mb-4">
      <h2 className="font-bold mb-3">Place Bid</h2>
      {stake && (
        <div className="text-sm mb-3 text-gray-600">
          My Bid:{' '}
          <span className="font-mono font-bold">{fmtUSDC(myBid)} USDC</span>
          {firstBid && (
            <span className="ml-2 text-xs">
              (first bid adds starting bid {fmtUSDC(startingBid)} USDC)
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder={`Amount (multiples of ${fmtUSDC(bidIncrement)})`}
          className="flex-1 border rounded px-3 py-2 text-black"
        />
        <button
          onClick={handleBid}
          disabled={signing || confirming || !amountInput}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          {signing ? 'Signing...' : confirming ? 'Confirming...' : 'Bid'}
        </button>
      </div>
      {confirmed && (
        <p className="text-green-600 text-sm mt-2">Bid placed on-chain.</p>
      )}
    </div>
  );
}