// @file apps/web/src/app/my-auction/[code]/MyAuctionClient.tsx
//
// Client-side detail view for /my-auction/[code].
// `code` comes from the server page via props (no useParams here).
// Polls /api/auction/[code]/status through registration projection.
// Ref: PARALEL.md §9.2, §17.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useConnection } from 'wagmi';
import {
  AuctionStatusTimeline,
  type AuctionStatusData,
} from '@/components/AuctionStatusTimeline';
import { ConsignorConfirmModal } from '@/components/ConsignorConfirmModal';

export function MyAuctionClient({ code }: { code: string }) {
  const { address } = useConnection();

  const [data, setData] = useState<AuctionStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submitRequestRef =
    useRef<{
      auctionCode: string;
      idempotencyKey: string;
    } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/auction/${encodeURIComponent(code)}/status`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json as AuctionStatusData);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load auction',
      );
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-poll while setup in progress
  useEffect(() => {
    if (!data) return;
    if (
      data.status !== 'PENDING' &&
      data.status !== 'CREATED' &&
      data.status !== 'REGISTERING'
    ) return;
    const id = setInterval(fetchData, 15_000);
    return () => clearInterval(id);
  }, [data, fetchData]);

  async function handleSubmitToCustody() {
    if (
      !address ||
      !data
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const auctionCode =
        data.auctionCode;

      const previousRequest =
        submitRequestRef.current;

      const idempotencyKey =
        previousRequest
          ?.auctionCode ===
        auctionCode
          ? previousRequest
              .idempotencyKey
          : crypto.randomUUID();

      submitRequestRef.current = {
        auctionCode,
        idempotencyKey,
      };

      const response =
        await fetch(
          `/api/auction/${encodeURIComponent(
            auctionCode,
          )}/submit`,
          {
            method: 'POST',
            credentials:
              'same-origin',
            headers: {
              'Content-Type':
                'application/json',
              'Idempotency-Key':
                idempotencyKey,
            },
            body:
              JSON.stringify({}),
          },
        );

      const json:
        | {
            data?: {
              auctionId:
                string;
              auctionCode:
                string;
              status:
                'PENDING';
              currentRound:
                number;
              pendingAt:
                string;
              pendingDeadline:
                string;
            };
            error?: {
              message?:
                string;
            };
          }
        | null =
          await response
            .json()
            .catch(
              () => null,
            );

      if (
        !response.ok ||
        !json?.data
      ) {
        throw new Error(
          json?.error
            ?.message ??
          `Submit failed (${response.status})`,
        );
      }

      submitRequestRef.current =
        null;

      await fetchData();
    } catch (
      error: unknown
    ) {
      alert(
        error instanceof Error
          ? error.message
          : 'Submit gagal',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="p-8 text-gray-900">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-500">Loading auction…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-8 text-gray-900">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Back
          </Link>
          <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded mt-4">
            {error ?? 'Auction not found'}
          </div>
        </div>
      </main>
    );
  }

  const backHref = address
    ? `/dashboard?wallet=${address.toLowerCase()}`
    : '/';

  const isOwner =
    !!address &&
    !!data.consignorWallet &&
    address.toLowerCase() === data.consignorWallet.toLowerCase();

  const showSubmitButton = data.status === 'CREATED' && isOwner;
  const showConfirmButton = data.canConfirm && isOwner;
  const showWrongWalletHint = data.canConfirm && !isOwner;

  return (
    <main className="p-8 text-gray-900">
      <div className="max-w-3xl mx-auto">
        <Link href={backHref} className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="mt-4 mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-mono text-gray-500">
              {data.auctionCode}
            </div>
            <h1 className="text-2xl font-bold mt-1 break-words">
              {data.title || 'Untitled Auction'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-mono">{data.status}</span>
              {' · '}Round {data.currentRound}
            </p>
          </div>
          <button
            onClick={fetchData}
            className="shrink-0 px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {/* CREATED → Submit to guarantor */}
        {showSubmitButton && (
          <div className="mb-6 bg-blue-50 border border-blue-300 p-4 rounded-lg">
            <p className="font-bold text-blue-900">Ready to submit?</p>
            <p className="text-sm text-blue-800 mt-1 mb-3">
              Submitting starts the 48-hour custody window. Deliver the physical
              item to the guarantor and click Submit — the guarantor will then
              perform the physical inspection.
            </p>
            <button
              onClick={handleSubmitToCustody}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? 'Submitting…' : 'Submit to Guarantor'}
            </button>
          </div>
        )}

        {showConfirmButton && (
          <div className="mb-6 bg-blue-50 border border-blue-300 p-4 rounded-lg">
            <p className="font-bold text-blue-900">
              Ready to register on-chain
            </p>
            <p className="text-sm text-blue-800 mt-1 mb-3">
              Both Guarantor and Notary have approved. Sign with the consignor
              wallet to submit registration to Arbitrum. These approvals are
              off-chain; no Arbiscan transaction exists before confirmation.
            </p>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
            >
              Confirm Registration
            </button>
          </div>
        )}

        {showWrongWalletHint && (
          <div className="mb-6 bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-lg text-sm">
            <p className="font-bold">Auction ready, but you're not the owner</p>
            <p className="mt-1">
              Only the consignor can confirm.{' '}
              {data.consignorWallet && (
                <>
                  Owner wallet:{' '}
                  <span className="font-mono">
                    {data.consignorWallet.slice(0, 6)}…
                    {data.consignorWallet.slice(-4)}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        <div className="bg-white border rounded-lg p-6">
          <AuctionStatusTimeline data={data} />
        </div>
      </div>

      {showConfirmModal && (
        <ConsignorConfirmModal
          auctionCode={data.auctionCode}
          onClose={() => setShowConfirmModal(false)}
          onSuccess={() => {
            setTimeout(fetchData, 500);
          }}
        />
      )}
    </main>
  );
}
