// @file apps/web/src/app/auction/[code]/page.tsx — Detail auction
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { keccak256, toBytes } from 'viem';
import { getAuctionDetail } from '@/lib/db';
import { fmtUSDC } from '@/lib/web3';
import { BidPanel } from '@/components/BidPanel';
import { RelayedPanel } from '@/components/RelayedPanel';

export const instant = false;

export default async function AuctionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const detail = await getAuctionDetail(code);
  if (!detail) notFound();

  const auctionKey = keccak256(toBytes(code));
  const { auction, assets, round } = detail;

  return (
    <main className="p-8 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to auctions
        </Link>

        {/* Fallback Title & Description */}
        <h1 className="text-3xl font-bold mt-4 mb-2">
          {assets?.title || (
            <span className="text-gray-500 italic">Auction item</span>
          )}
        </h1>
        <p className="text-gray-600 mb-6">
          {assets?.description || 'No description provided.'}
        </p>

        <div className="bg-white rounded-lg border p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Auction ID</div>
              <div className="font-mono text-xs break-all">{code}</div>
            </div>
            <div>
              <div className="text-gray-500">Status (DB mirror)</div>
              <div className="font-mono font-bold">{auction.status}</div>
            </div>
            <div>
              <div className="text-gray-500">Category</div>
              <div className="font-mono">{auction.category}</div>
            </div>
            <div>
              <div className="text-gray-500">Round</div>
              <div className="font-mono">{auction.currentRound}</div>
            </div>
            <div>
              <div className="text-gray-500">Starting Bid</div>
              <div className="font-mono">
                {fmtUSDC(round.startingBid)} USDC
              </div>
            </div>
            <div>
              <div className="text-gray-500">Bid Increment</div>
              <div className="font-mono">
                {fmtUSDC(round.bidIncrement)} USDC
              </div>
            </div>
            <div>
              <div className="text-gray-500">Opens</div>
              <div className="font-mono text-xs">
                {new Date(round.openAt).toUTCString()}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Closes</div>
              <div className="font-mono text-xs">
                {new Date(round.closeAt).toUTCString()}
              </div>
            </div>
          </div>
        </div>

        <BidPanel
          auctionKey={auctionKey}
          roundNo={auction.currentRound}
          consignorWallet={detail.consignorWallet}
        />

        <RelayedPanel
          auctionKey={auctionKey}
          roundNo={auction.currentRound}
          dbStatus={auction.status}
        />
      </div>
    </main>
  );
}