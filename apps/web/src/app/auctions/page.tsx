import Link from 'next/link';
import { connection } from 'next/server';
import {
  listAuctions,
  type ListFilter,
} from '@/lib/db';
import { fmtUSDC } from '@/lib/web3';

export const instant = false;

const FILTERS = [
  { id: 'all', label: 'All Auctions' },
  { id: 'live', label: 'Live & Upcoming' },
  { id: 'processing', label: 'In Progress' },
  { id: 'ended', label: 'Ended' },
] as const;

function parseFilter(value: string | undefined): ListFilter {
  switch (value) {
    case 'live':
      return { kind: 'live' };
    case 'processing':
      return { kind: 'processing' };
    case 'ended':
      return { kind: 'ended' };
    default:
      return { kind: 'all' };
  }
}

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await connection();
  const { filter: requestedFilter } = await searchParams;
  const filter = parseFilter(requestedFilter);
  const selectedFilter = filter.kind;
  const auctions = await listAuctions(filter);

  return (
    <main className="mx-auto max-w-7xl p-6 text-gray-900 sm:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Paralel marketplace
          </p>
          <h1 className="mt-1 text-3xl font-bold">Public Auctions</h1>
          <p className="mt-2 text-gray-600">
            Browse registered auctions. Auction details are public; bidding
            requires a signed-in wallet with verified KYC.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          Home
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Auction filters">
        {FILTERS.map((item) => (
          <Link
            key={item.id}
            href={
              item.id === 'all'
                ? '/auctions'
                : `/auctions?filter=${item.id}`
            }
            aria-current={selectedFilter === item.id ? 'page' : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              selectedFilter === item.id
                ? 'border-blue-700 bg-blue-700 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {auctions.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No auctions in this view yet</h2>
          <p className="mt-2 text-sm text-gray-600">
            Auctions appear here after the consignor confirms registration and
            the registration is projected from Arbitrum Sepolia.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((auction) => (
            <Link
              key={auction.id}
              href={`/auction/${encodeURIComponent(auction.auctionCode)}`}
              className="group rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold group-hover:text-blue-700">
                  {auction.title ?? 'Auction item'}
                </h2>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                  {auction.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-gray-500">
                {auction.auctionCode}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="font-medium">{auction.category}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Round</dt>
                  <dd className="font-medium">{auction.currentRound}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Starting bid</dt>
                  <dd className="font-mono font-semibold">
                    {fmtUSDC(auction.startingBid)} USDC
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Current bid</dt>
                  <dd className="font-mono font-semibold">
                    {fmtUSDC(BigInt(auction.currentBid))} USDC
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Bids</dt>
                  <dd className="font-medium">{auction.bidCount}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">
                    {auction.status === 'OPEN' ? 'Closes' : 'Opens'}
                  </dt>
                  <dd className="font-medium">
                    {new Date(
                      auction.status === 'OPEN'
                        ? auction.closeAt
                        : auction.openAt,
                    ).toLocaleString()}
                  </dd>
                </div>
              </dl>
              <p className="mt-5 text-sm font-semibold text-blue-700">
                View auction details →
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
