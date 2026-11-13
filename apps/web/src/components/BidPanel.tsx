// @file apps/web/src/components/BidPanel.tsx — Bid via EIP-2612 permit
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSignTypedData,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import {
  ParalelAuctionAbi,
} from '@paralel/contracts';
import {
  CONTRACT_ADDRESS,
  USDC_ADDRESS,
  USDC_PERMIT_DOMAIN_NAME,
  USDC_PERMIT_DOMAIN_VERSION,
  fmtUSDC,
  parseUSDC,
  statusNameFromId,
} from '@/lib/web3';
import {
  createEip1559FeeOverrides,
} from '@/lib/contracts/transaction-fees';
import { ConnectButton } from '@/components/ConnectButton';

type KycStatus = 'NONE' | 'UNVERIFIED' | 'VERIFIED' | 'UNAUTHENTICATED';

type KycResponse = {
  data?: { kycStatus?: string };
  error?: { message?: string } | string;
  message?: string;
};

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

function currentUnixTimeSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function BidPanel({ auctionKey, roundNo, consignorWallet }: Props) {
  const { address, chainId, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();
  const [amountInput, setAmountInput] = useState('');
  const [signing, setSigning] = useState(false);

  const {
    data: statusRaw,
    error: statusError,
    isPending: statusLoading,
  } = useReadContract({
    chainId: arbitrumSepolia.id,
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'statusOf',
    args: [auctionKey],
  });

  const {
    data: roundRaw,
    error: roundError,
    isPending: roundLoading,
  } = useReadContract({
    chainId: arbitrumSepolia.id,
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'getRound',
    args: [auctionKey, roundNo],
  });

  const { data: myStake, refetch: refetchStake } = useReadContract({
    chainId: arbitrumSepolia.id,
    address: CONTRACT_ADDRESS,
    abi: ParalelAuctionAbi,
    functionName: 'stakes',
    args: address ? [auctionKey, roundNo, address] : undefined,
    query: { enabled: !!address },
  });

  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash ?? undefined });

  const kycQueryKey = ['bid-kyc-status', address?.toLowerCase()] as const;
  const {
    data: kycStatus = 'UNAUTHENTICATED',
    isLoading: kycLoading,
    error: kycError,
    refetch: refreshKycStatus,
  } = useQuery<KycStatus>({
    queryKey: kycQueryKey,
    enabled: isConnected && !!address,
    queryFn: async () => {
      if (!address) return 'UNAUTHENTICATED';
      const response = await fetch(
        `/api/user/kyc/status?wallet=${encodeURIComponent(address)}`,
        {
          cache: 'no-store',
        },
      );
      const result = (await response.json()) as KycResponse;
      if (response.status === 401 || response.status === 403) {
        return 'UNAUTHENTICATED';
      }
      if (!response.ok) {
        const message =
          typeof result.error === 'string'
            ? result.error
            : result.error?.message ?? result.message;
        throw new Error(message ?? `KYC status request failed (${response.status}).`);
      }
      const status = result.data?.kycStatus;
      if (
        status !== 'NONE' &&
        status !== 'UNVERIFIED' &&
        status !== 'VERIFIED'
      ) {
        throw new Error('KYC status response is invalid.');
      }
      return status;
    },
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ['bid-kyc-status', address?.toLowerCase()],
      });
    };
    window.addEventListener(
      'paralel:wallet-session-ready',
      refresh,
    );
    return () => {
      window.removeEventListener(
        'paralel:wallet-session-ready',
        refresh,
      );
    };
  }, [address, queryClient]);

  const status =
    typeof statusRaw === 'number' ? statusNameFromId(statusRaw) : null;
  const round = roundRaw;
  const stake = myStake as readonly [bigint, bigint, boolean] | undefined;

  if (!isConnected || !address) {
    return (
      <div className="bg-white rounded-lg border p-4 mb-4">
        <p className="mb-3 text-gray-600">
          Auction details are public. Connect and sign in to check bidding
          eligibility.
        </p>
        <ConnectButton variant="bid" />
      </div>
    );
  }

  if (chainId !== arbitrumSepolia.id) {
    return (
      <div className="mb-4 rounded-lg border bg-white p-4">
        <p className="mb-3 text-gray-700">
          Switch to Arbitrum Sepolia to bid.
        </p>
        <button
          onClick={() => void switchChainAsync({ chainId: arbitrumSepolia.id })}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white"
        >
          Switch network
        </button>
      </div>
    );
  }

  if (kycLoading) {
    return (
      <div className="mb-4 rounded-lg border bg-white p-4 text-gray-600">
        Checking sign-in and KYC status…
      </div>
    );
  }

  if (kycStatus === 'UNAUTHENTICATED') {
    return (
      <div className="mb-4 rounded-lg border bg-white p-4">
        <p className="mb-3 text-gray-700">
          Sign in with this wallet to check bidding eligibility.
        </p>
        <ConnectButton variant="bid" />
      </div>
    );
  }

  if (kycError) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-white p-4">
        <p className="text-sm text-red-700">
          {kycError.message}
        </p>
        <button
          onClick={() => void refreshKycStatus()}
          className="mt-3 text-sm font-semibold text-blue-700 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (kycStatus !== 'VERIFIED') {
    return (
      <div className="mb-4 rounded-lg border bg-white p-4">
        <p className="font-semibold text-gray-800">
          Verified KYC is required to bid.
        </p>
        <Link
          href="/dashboard"
          className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
        >
          Complete or check verification
        </Link>
      </div>
    );
  }

  if (statusError || roundError) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">
        Could not read auction state from Arbitrum Sepolia. Please retry shortly.
      </div>
    );
  }

  if (statusLoading || roundLoading || !round) {
    return (
      <div className="mb-4 rounded-lg border bg-white p-4 text-gray-600">
        Loading live auction state…
      </div>
    );
  }

  const isConsignor =
    address.toLowerCase() === consignorWallet.toLowerCase();
  const now = BigInt(currentUnixTimeSeconds());
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

      const deadline = BigInt(currentUnixTimeSeconds() + 3600);

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

      const [latestBlock, feeEstimate] = await Promise.all([
        publicClient.getBlock({ blockTag: 'latest' }),
        publicClient.estimateFeesPerGas({ type: 'eip1559' }),
      ]);
      if (latestBlock.baseFeePerGas === null) {
        throw new Error(
          'The latest Arbitrum Sepolia block does not provide EIP-1559 fee data.',
        );
      }
      const feeOverrides = createEip1559FeeOverrides(
        latestBlock.baseFeePerGas,
        feeEstimate,
      );

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: ParalelAuctionAbi,
        functionName: 'placeBidWithPermit',
        args: [auctionKey, roundNo, added, deadline, v, r, s],
        ...feeOverrides,
      });
      setTxHash(hash);
      setTimeout(() => refetchStake(), 3000);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Bid failed',
      );
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