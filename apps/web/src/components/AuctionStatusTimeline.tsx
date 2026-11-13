// @file apps/web/src/components/AuctionStatusTimeline.tsx
//
// Visual timeline untuk /my-auction/[code]. Fokus: milestone pre-SCHEDULED.
// Untuk status >= SCHEDULED, tampilkan summary "Setup complete" + link ke
// halaman auction publik.
// Ref: PARALEL.md §9.1, §9.2.
'use client';

export type AuctionStatusData = {
  auctionCode: string;
  title: string | null;
  status: string;
  currentRound: number;
  consignorWallet: string | null;
  pendingAt: string | null;
  pendingDeadline: string | null;
  scheduledAt: string | null;
  onchainTxHash: string | null;
  startingBid: string | null;
  bidIncrement: string | null;
  openAt: string | null;
  closeAt: string | null;
  hasGuarantorApproval: boolean;
  hasNotaryApproval: boolean;
  canConfirm: boolean;
  rejectionReason: string | null;
};

type State = 'done' | 'active' | 'pending' | 'error' | 'skipped';

type Milestone = {
  id: string;
  label: string;
  desc?: string;
  timestamp?: string | null;
  state: State;
};

const POST_SCHEDULED = [
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'AWARDING',
  'COLLECTION',
  'CLAIM_PERIOD',
  'SETTLED',
  'PASSED_IN',
  'WITHDRAWN',
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function fmtCountdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m remaining`;
}

function dotClass(state: State): string {
  switch (state) {
    case 'done':
      return 'bg-green-500';
    case 'active':
      return 'bg-blue-500 animate-pulse';
    case 'error':
      return 'bg-red-500';
    case 'skipped':
      return 'bg-gray-200';
    case 'pending':
    default:
      return 'bg-gray-300';
  }
}

function lineClass(state: State): string {
  switch (state) {
    case 'done':
      return 'bg-green-200';
    case 'active':
      return 'bg-blue-200';
    case 'error':
      return 'bg-red-200';
    case 'skipped':
    case 'pending':
    default:
      return 'bg-gray-200';
  }
}

function buildMilestones(data: AuctionStatusData): Milestone[] {
  const { status } = data;

  // Base milestones (pre-SCHEDULED)
  const submitted = data.pendingAt !== null;
  const guarDone = data.hasGuarantorApproval;
  const notaryDone = data.hasNotaryApproval;
  const registered = POST_SCHEDULED.includes(status);
  const registering = status === 'REGISTERING';
  const registrationFailed = status === 'REGISTRATION_FAILED';

  // REJECTED / CANCELED — mark specific step as error, rest skipped
  if (status === 'REJECTED') {
    return [
      {
        id: 'draft',
        label: 'Draft Created',
        state: 'done',
        timestamp: data.pendingAt,
      },
      {
        id: 'submitted',
        label: 'Submitted to Custody',
        desc: 'Physical item delivered to guarantor',
        state: 'done',
        timestamp: data.pendingAt,
      },
      {
        id: 'guarantor',
        label: 'Guarantor Reviewed',
        desc: 'Rejected — item does not match specification/photos',
        state: 'error',
      },
      { id: 'notary', label: 'Notary Approved', state: 'skipped' },
      { id: 'registered', label: 'Registered On-chain', state: 'skipped' },
      { id: 'live', label: 'Auction Opens', state: 'skipped' },
    ];
  }

  if (status === 'CANCELED') {
    return [
      {
        id: 'draft',
        label: 'Draft Created',
        state: 'done',
        timestamp: data.pendingAt,
      },
      {
        id: 'submitted',
        label: 'Submitted to Custody',
        desc: 'Canceled — 48h window expired without completion',
        state: 'error',
        timestamp: data.pendingDeadline,
      },
      { id: 'guarantor', label: 'Guarantor Reviewed', state: 'skipped' },
      { id: 'notary', label: 'Notary Approved', state: 'skipped' },
      { id: 'registered', label: 'Registered On-chain', state: 'skipped' },
      { id: 'live', label: 'Auction Opens', state: 'skipped' },
    ];
  }

  // Happy path
  const milestones: Milestone[] = [
    {
      id: 'draft',
      label: 'Draft Created',
      state: 'done',
    },
    {
      id: 'submitted',
      label: 'Submitted to Custody',
      desc:
        status === 'CREATED'
          ? 'Click Submit to begin the 48h custody window'
          : data.pendingDeadline
            ? `Consignment deadline: ${fmtCountdown(data.pendingDeadline)}`
            : undefined,
      state: submitted ? 'done' : status === 'CREATED' ? 'active' : 'pending',
      timestamp: data.pendingAt,
    },
    {
      id: 'guarantor',
      label: 'Guarantor Reviewed',
      desc: guarDone ? 'Approved' : 'Physical check by guarantor',
      state: guarDone
        ? 'done'
        : submitted && status === 'PENDING'
          ? 'active'
          : 'pending',
    },
    {
      id: 'notary',
      label: 'Notary Approved',
      desc: notaryDone ? 'Approved' : 'Legal review by notary',
      state: notaryDone
        ? 'done'
        : submitted && guarDone && status === 'PENDING'
          ? 'active'
          : 'pending',
    },
    {
      id: 'registered',
      label: 'Registered On-chain',
      desc: registered
        ? 'Auction registered on Arbitrum'
        : registering
          ? 'Registration submitted — waiting for Arbitrum confirmation'
          : registrationFailed
            ? 'Registration failed — review the transaction or contact support'
        : data.canConfirm
          ? 'Ready — confirm registration with your wallet'
          : 'Waiting for both approvals',
      state: registered
        ? 'done'
        : registrationFailed
          ? 'error'
          : registering
            ? 'active'
        : data.canConfirm
          ? 'active'
          : 'pending',
      timestamp: data.scheduledAt ?? (registering ? undefined : null),
    },
    {
      id: 'live',
      label: 'Auction Opens',
      desc: data.openAt ? `Opens at ${fmtDate(data.openAt)}` : undefined,
      state: registered ? 'active' : 'pending',
      timestamp: null,
    },
  ];

  return milestones;
}

export function AuctionStatusTimeline({
  data,
}: {
  data: AuctionStatusData;
}) {
  // Post-SCHEDULED: show summary + link to public page
  if (POST_SCHEDULED.includes(data.status)) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-300 text-green-800 p-4 rounded-lg">
          <p className="font-bold">✓ Setup complete — auction is registered on-chain</p>
          <p className="text-sm mt-1">
            Status: <span className="font-mono">{data.status}</span>
            {data.scheduledAt && (
              <> · Registered {fmtDate(data.scheduledAt)}</>
            )}
          </p>
          {data.onchainTxHash && (
            <p className="text-xs mt-2">
              <a
                href={`https://sepolia.arbiscan.io/tx/${data.onchainTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-green-900"
              >
                View on Arbiscan ↗
              </a>
            </p>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Auction parameters</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Starting Bid</dt>
            <dd className="font-mono">
              {data.startingBid ?? '—'}
            </dd>
            <dt className="text-gray-500">Bid Increment</dt>
            <dd className="font-mono">
              {data.bidIncrement ?? '—'}
            </dd>
            <dt className="text-gray-500">Opens</dt>
            <dd className="font-mono text-xs">{fmtDate(data.openAt)}</dd>
            <dt className="text-gray-500">Closes</dt>
            <dd className="font-mono text-xs">{fmtDate(data.closeAt)}</dd>
          </dl>
        </div>

        <div>
          <a
            href={`/auction/${data.auctionCode}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
          >
            View public auction page →
          </a>
        </div>
      </div>
    );
  }

  const milestones = buildMilestones(data);

  return (
    <div className="space-y-4">
      {data.status === 'REJECTED' && (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-lg">
          <p className="font-bold">Rejected by Guarantor</p>
          <p className="text-sm mt-1">
            {data.rejectionReason || 'No reason provided.'}
          </p>
          <p className="text-xs mt-2 text-red-700">
            You must create a new auctionID to try again.
          </p>
        </div>
      )}

      {data.status === 'CANCELED' && (
        <div className="bg-gray-50 border border-gray-300 text-gray-800 p-4 rounded-lg">
          <p className="font-bold">Canceled</p>
          <p className="text-sm mt-1">
            The 48-hour consignment window expired before the auction could be
            registered.
          </p>
          <p className="text-xs mt-2 text-gray-600">
            You must create a new auctionID to try again.
          </p>
        </div>
      )}

      {data.status === 'REGISTERING' && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-4 text-blue-900">
          <p className="font-bold">Registration submitted</p>
          <p className="mt-1 text-sm">
            Waiting for Arbitrum confirmation and the indexer to update the
            auction status.
          </p>
          {data.onchainTxHash && (
            <a
              href={`https://sepolia.arbiscan.io/tx/${data.onchainTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm underline"
            >
              View transaction on Arbiscan ↗
            </a>
          )}
        </div>
      )}

      <div>
        {milestones.map((m, i) => (
          <div key={m.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${dotClass(m.state)}`}
              />
              {i < milestones.length - 1 && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] ${lineClass(
                    milestones[i + 1].state,
                  )}`}
                />
              )}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div
                className={`text-sm font-medium ${
                  m.state === 'skipped' ? 'text-gray-400' : 'text-gray-900'
                }`}
              >
                {m.label}
              </div>
              {m.desc && (
                <div
                  className={`text-xs mt-0.5 ${
                    m.state === 'error'
                      ? 'text-red-700'
                      : m.state === 'active'
                        ? 'text-blue-700'
                        : 'text-gray-500'
                  }`}
                >
                  {m.desc}
                </div>
              )}
              {m.timestamp && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {fmtDate(m.timestamp)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}