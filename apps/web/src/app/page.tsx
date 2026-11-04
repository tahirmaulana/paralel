// @file apps/web/src/app/page.tsx — Home: semua 9 status on-chain
import Link from 'next/link';
import { listAuctions, type ListFilter } from '@/lib/db';
import { DB_FEED_STATUSES, fmtUSDC, type DbFeedStatus } from '@/lib/web3';

export const instant = false;

function badgeClass(status: string): string {
  if (status === 'OPEN') return 'bg-green-100 text-green-800';
  if (status === 'SCHEDULED') return 'bg-blue-100 text-blue-800';
  if (status === 'CLOSED' || status === 'AWARDING')
    return 'bg-yellow-100 text-yellow-800';
  if (status === 'COLLECTION' || status === 'CLAIM_PERIOD')
    return 'bg-purple-100 text-purple-800';
  if (status === 'PASSED_IN') return 'bg-slate-100 text-slate-700';
  if (status === 'SETTLED') return 'bg-gray-200 text-gray-700';
  if (status === 'WITHDRAWN') return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-700';
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const rawFilter = (sp.filter ?? 'all').toLowerCase();
  const rawStatus = sp.status?.toUpperCase() as DbFeedStatus | undefined;

  let filter: ListFilter;
  if (rawFilter === 'live') filter = { kind: 'live' };
  else if (rawFilter === 'processing') filter = { kind: 'processing' };
  else if (rawFilter === 'ended') filter = { kind: 'ended' };
  else if (
    rawStatus &&
    (DB_FEED_STATUSES as readonly string[]).includes(rawStatus)
  ) {
    filter = { kind: 'status', status: rawStatus };
  } else filter = { kind: 'all' };

  const auctions = await listAuctions(filter);

  const href = (params: Record<string, string>) =>
    '/' +
    (Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '');

  return (
    <main className="p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Auctions</h1>

        <div className="flex flex-wrap gap-2 mb-4 text-sm">
          {[
            { key: 'all', label: 'All' },
            { key: 'live', label: 'Live' },
            { key: 'processing', label: 'Processing' },
            { key: 'ended', label: 'Ended' },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={href({ filter: tab.key })}
              className={`px-3 py-1 rounded border ${
                filter.kind === tab.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
          <span className="mx-2 text-gray-400 self-center">|</span>
          {DB_FEED_STATUSES.map((s) => (
            <Link
              key={s}
              href={href({ status: s })}
              className={`px-2 py-1 rounded border text-xs font-mono ${
                filter.kind === 'status' && filter.status === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-6">
          {auctions.length} auction{auctions.length === 1 ? '' : 's'}
          {filter.kind === 'all' && ' (all on-chain statuses)'}
          {filter.kind === 'live' && ' (SCHEDULED, OPEN)'}
          {filter.kind === 'processing' &&
            ' (CLOSED, AWARDING, COLLECTION, CLAIM_PERIOD)'}
          {filter.kind === 'ended' && ' (SETTLED, PASSED_IN, WITHDRAWN)'}
          {filter.kind === 'status' && ` (status=${filter.status})`}
        </p>

        {auctions.length === 0 ? (
          <p className="text-gray-500">No auctions match this filter.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.map((a) => (
              <Link
                key={a.id}
                href={`/auction/${a.auctionCode}`}
                className="block border rounded-lg p-4 bg-white hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-gray-500 break-all">
                    {a.auctionCode}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded font-semibold shrink-0 ml-2 ${badgeClass(a.status)}`}
                  >
                    {a.status}
                  </span>
                </div>
                
                {/* Fallback Title */}
                <div className="font-semibold mb-3 line-clamp-2 min-h-[3rem]">
                  {a.title || (
                    <span className="text-gray-400 italic">Untitled Auction (Draft)</span>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Starting</span>
                    <span className="font-mono">
                      {fmtUSDC(a.startingBid)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current</span>
                    <span className="font-mono font-bold text-green-600">
                      {fmtUSDC(a.currentBid)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bids</span>
                    <span className="font-mono">{a.bidCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Round</span>
                    <span className="font-mono">{a.currentRound}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Close</span>
                    <span className="font-mono text-xs">
                      {new Date(a.closeAt)
                        .toISOString()
                        .replace('T', ' ')
                        .slice(0, 16)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}