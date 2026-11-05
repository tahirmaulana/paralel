// @file apps/web/src/app/print/receipt/[type]/[auctionId]/page.tsx
//
// Printable receipt form (HTML). Server-rendered from DB.
// Ref: PARALEL.md §4.2.5, D12.6
import { notFound } from 'next/navigation';
import { getReceiptData, type ReceiptData } from '@/lib/db';
import { fmtUSDC } from '@/lib/web3';
import { PrintButton } from './PrintButton';

export const instant = false;

const VALID_TYPES = ['consignment', 'collection', 'withdrawal'] as const;
type ReceiptType = (typeof VALID_TYPES)[number];

function isReceiptType(t: string): t is ReceiptType {
  return (VALID_TYPES as readonly string[]).includes(t);
}

function fmtDateTime(d: Date | null): string {
  if (!d) return '—';
  return (
    d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }) + ' WIB'
  );
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

function shortAddr(addr: string | null): string {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ type: string; auctionId: string }>;
}) {
  const { type, auctionId } = await params;

  if (!isReceiptType(type)) notFound();

  const data = await getReceiptData(auctionId, type);
  if (!data) notFound();

  const printedAt = new Date();

  return (
    <main className="bg-white text-black min-h-screen">
      <div className="print:hidden p-4 border-b bg-gray-50">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Print preview —{' '}
            <span className="font-mono">{data.auctionCode}</span>
          </span>
          <PrintButton />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-8 print:p-6">
        {type === 'consignment' && (
          <ConsignmentReceipt data={data} printedAt={printedAt} />
        )}
        {type === 'collection' && (
          <CollectionReceipt data={data} printedAt={printedAt} />
        )}
        {type === 'withdrawal' && (
          <WithdrawalReceipt data={data} printedAt={printedAt} />
        )}
      </div>
    </main>
  );
}

// ─── Receipt sub-components ──────────────────────────────

function Header({ title, auctionCode }: { title: string; auctionCode: string }) {
  return (
    <div className="border-b-2 border-black pb-4 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PARALEL</h1>
          <p className="text-xs text-gray-600 mt-1">
            RWA Auction Platform · Arbitrum
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-xs text-gray-700 mt-1 font-mono">{auctionCode}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-200">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="col-span-2 text-sm font-medium">{value}</dd>
    </div>
  );
}

function SignaturesBox({
  left,
  right,
}: {
  left: { role: string; name: string; sub?: string };
  right: { role: string; name: string; sub?: string };
}) {
  return (
    <div className="grid grid-cols-2 gap-8 mt-12">
      {[left, right].map((s, i) => (
        <div key={i} className="text-center">
          <p className="text-xs text-gray-600 mb-1">{s.role}</p>
          <div className="h-20 border border-gray-400 rounded mb-2" />
          <p className="text-sm font-medium">{s.name}</p>
          {s.sub && <p className="text-xs text-gray-600">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function ConsignmentReceipt({
  data,
  printedAt,
}: {
  data: ReceiptData;
  printedAt: Date;
}) {
  return (
    <div>
      <Header title="CONSIGNMENT RECEIPT" auctionCode={data.auctionCode} />

      <p className="text-sm mb-4">
        Bukti serah terima barang dari <strong>Consignor</strong> kepada{' '}
        <strong>Guarantor</strong> untuk keperluan lelang di platform PARALEL.
      </p>

      <dl className="mb-6">
        <Field label="Auction Code" value={<span className="font-mono">{data.auctionCode}</span>} />
        <Field label="Title" value={data.title} />
        <Field label="Category" value={data.category} />
        <Field label="Condition" value={data.condition} />
        <Field
          label="Consignor"
          value={
            <span>
              {data.consignorName ?? <em className="text-gray-500">—</em>}
              {data.consignorWallet && (
                <span className="block text-xs font-mono text-gray-500">
                  {data.consignorWallet}
                </span>
              )}
            </span>
          }
        />
        <Field label="Guarantor" value={data.guarantorName} />
        <Field
          label="Spec Hash"
          value={<span className="font-mono text-xs break-all">{data.specHash}</span>}
        />
        <Field label="Consigned At" value={fmtDateTime(data.pendingAt)} />
        <Field label="Printed At" value={fmtDateTime(printedAt)} />
      </dl>

      <SignaturesBox
        left={{
          role: 'Consignor',
          name: data.consignorName ?? shortAddr(data.consignorWallet),
          sub: 'Tanda tangan & tanggal',
        }}
        right={{
          role: 'Guarantor',
          name: data.guarantorName,
          sub: 'Tanda tangan & tanggal',
        }}
      />
    </div>
  );
}

function CollectionReceipt({
  data,
  printedAt,
}: {
  data: ReceiptData;
  printedAt: Date;
}) {
  return (
    <div>
      <Header title="COLLECTION RECEIPT" auctionCode={data.auctionCode} />

      <p className="text-sm mb-4">
        Bukti serah terima barang dari <strong>Guarantor</strong> kepada{' '}
        <strong>Winner</strong>. Disimpan oleh guarantor sebagai bukti hukum.
        Winner tidak menerima salinan; winner menerima e-Certificate terpisah.
      </p>

      <dl className="mb-6">
        <Field label="Auction Code" value={<span className="font-mono">{data.auctionCode}</span>} />
        <Field label="Title" value={data.title} />
        <Field label="Category" value={data.category} />
        <Field label="Guarantor" value={data.guarantorName} />
        <Field
          label="Winner (legal name)"
          value={
            <span>
              {data.winnerName ?? <em className="text-gray-500">—</em>}
              {data.winnerWallet && (
                <span className="block text-xs font-mono text-gray-500">
                  {data.winnerWallet}
                </span>
              )}
            </span>
          }
        />
        <Field
          label="Winner Stake"
          value={
            data.winnerStake !== null
              ? `${fmtUSDC(data.winnerStake)} USDC`
              : '—'
          }
        />
        <Field label="Awarded At" value={fmtDateTime(data.awardedAt)} />
        <Field
          label="Dispute Period Ends"
          value={
            <span className="font-bold">
              {fmtDateTime(data.claimEnd)}{' '}
              <span className="text-xs text-gray-500 font-normal">
                (168 jam setelah collection)
              </span>
            </span>
          }
        />
        <Field label="Printed At" value={fmtDateTime(printedAt)} />
      </dl>

      <SignaturesBox
        left={{
          role: 'Winner',
          name: data.winnerName ?? shortAddr(data.winnerWallet),
          sub: 'Tanda tangan & tanggal',
        }}
        right={{
          role: 'Guarantor',
          name: data.guarantorName,
          sub: 'Tanda tangan & tanggal',
        }}
      />
    </div>
  );
}

function WithdrawalReceipt({
  data,
  printedAt,
}: {
  data: ReceiptData;
  printedAt: Date;
}) {
  return (
    <div>
      <Header title="WITHDRAWAL RECEIPT" auctionCode={data.auctionCode} />

      <p className="text-sm mb-4">
        Bukti pengambilan barang oleh <strong>Consignor</strong> dari{' '}
        <strong>Guarantor</strong> setelah lelang tidak menghasilkan pemenang.
      </p>

      <dl className="mb-6">
        <Field label="Auction Code" value={<span className="font-mono">{data.auctionCode}</span>} />
        <Field label="Title" value={data.title} />
        <Field label="Category" value={data.category} />
        <Field label="Condition" value={data.condition} />
        <Field
          label="Consignor"
          value={
            <span>
              {data.consignorName ?? <em className="text-gray-500">—</em>}
              {data.consignorWallet && (
                <span className="block text-xs font-mono text-gray-500">
                  {data.consignorWallet}
                </span>
              )}
            </span>
          }
        />
        <Field label="Guarantor" value={data.guarantorName} />
        <Field
          label="Ref. Consignment Receipt"
          value={
            <span>
              {data.auctionCode}{' '}
              <span className="text-xs text-gray-500">
                (issued {fmtDate(data.guarantorApprovedAt)})
              </span>
            </span>
          }
        />
        <Field label="Printed At" value={fmtDateTime(printedAt)} />
      </dl>

      <SignaturesBox
        left={{
          role: 'Consignor',
          name: data.consignorName ?? shortAddr(data.consignorWallet),
          sub: 'Tanda tangan & tanggal',
        }}
        right={{
          role: 'Guarantor',
          name: data.guarantorName,
          sub: 'Tanda tangan & tanggal',
        }}
      />
    </div>
  );
}