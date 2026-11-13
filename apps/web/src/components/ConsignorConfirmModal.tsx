// @file apps/web/src/components/ConsignorConfirmModal.tsx
//
// Modal confirm: sign ConsignorConfirm (EIP-712) → relay.
'use client';

import { useRef, useState } from 'react';
import { useConnection, useSignTypedData } from 'wagmi';

type Step = 'input' | 'processing' | 'success' | 'error';

type Hex = `0x${string}`;

type ConfirmationRequest =
  Readonly<{
    signature: Hex;
    nonce: string;
    expiry: string;
    idempotencyKey: string;
  }>;

type ConfirmInitData =
  Readonly<{
    domain:
      Readonly<{
        name: string;
        version: string;
        chainId: number;
        verifyingContract: Hex;
      }>;
    primaryType:
      'ConsignorConfirm';
    types:
      Readonly<{
        ConsignorConfirm:
          readonly Readonly<{
            name: string;
            type: string;
          }>[];
      }>;
    message:
      Readonly<{
        auctionKey: Hex;
        confirmationCodeHash: Hex;
        nonce: string;
        expiry: string;
      }>;
  }>;

function errorMessage(
  value: unknown,
  fallback: string,
): string {
  if (typeof value !== 'object' || value === null) {
    return fallback;
  }

  if (
    'message' in value &&
    typeof value.message === 'string'
  ) {
    return value.message;
  }

  if ('error' in value) {
    const error =
      value.error;

    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message ===
        'string'
    ) {
      return error.message;
    }

    if (
      typeof error === 'string'
    ) {
      return error;
    }
  }

  return fallback;
}

function newIdempotencyKey(
  operation: string,
): string {
  return `${operation}:${crypto.randomUUID()}`;
}

export function ConsignorConfirmModal({
  auctionCode,
  onClose,
  onSuccess,
}: {
  auctionCode: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { address } = useConnection();
  const { signTypedDataAsync } = useSignTypedData();

  const [step, setStep] = useState<Step>('input');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  /*
   * A recoverable relay retry must reuse the exact signature,
   * nonce, expiry, and Idempotency-Key.
   */
  const confirmationRequestRef =
    useRef<ConfirmationRequest | null>(
      null,
    );

  const busy = step === 'processing';
  const canSubmit = !busy && !!address;

  async function handleConfirm() {
    if (!address) {
      setError(
        'Connect wallet first.',
      );
      setStep('error');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      let confirmationRequest =
        confirmationRequestRef.current;

      if (!confirmationRequest) {
        setStatusMsg(
          'Checking approval status...',
        );

        const initResponse =
          await fetch(
            `/api/auction/${encodeURIComponent(
              auctionCode,
            )}/confirm/init`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                'Idempotency-Key':
                  newIdempotencyKey(
                    'confirm-init',
                  ),
              },
              body:
                JSON.stringify({}),
            },
          );

        const initJson:
          unknown =
            await initResponse.json();

        if (!initResponse.ok) {
          throw new Error(
            errorMessage(
              initJson,
              `Initialization failed (${initResponse.status}).`,
            ),
          );
        }

        if (
          typeof initJson !==
            'object' ||
          initJson === null ||
          !('data' in initJson)
        ) {
          throw new Error(
            'Confirmation initialization response is invalid.',
          );
        }

        const initData =
          initJson.data as
            ConfirmInitData;

        setStatusMsg(
          'Sign the registration with your wallet...',
        );

        const signature =
          await signTypedDataAsync({
            domain:
              initData.domain,
            types:
              initData.types,
            primaryType:
              initData.primaryType,
            message: {
              auctionKey:
                initData.message
                  .auctionKey,
              confirmationCodeHash:
                initData.message
                  .confirmationCodeHash,
              nonce:
                BigInt(
                  initData.message
                    .nonce,
                ),
              expiry:
                BigInt(
                  initData.message
                    .expiry,
                ),
            },
          });

        confirmationRequest =
          Object.freeze({
            signature,
            nonce:
              initData.message
                .nonce,
            expiry:
              initData.message
                .expiry,
            idempotencyKey:
              newIdempotencyKey(
                'confirm',
              ),
          });

        confirmationRequestRef.current =
          confirmationRequest;
      }

      setStatusMsg(
        'Submitting registration...',
      );

      const confirmResponse =
        await fetch(
          `/api/auction/${encodeURIComponent(
            auctionCode,
          )}/confirm`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
              'Idempotency-Key':
                confirmationRequest
                  .idempotencyKey,
            },
            body:
              JSON.stringify({
                signature:
                  confirmationRequest
                    .signature,
                nonce:
                  confirmationRequest
                    .nonce,
                expiry:
                  confirmationRequest
                    .expiry,
              }),
          },
        );

      const confirmJson:
        unknown =
          await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(
          errorMessage(
            confirmJson,
            `Confirmation failed (${confirmResponse.status}).`,
          ),
        );
      }

      const projectionPending =
        typeof confirmJson ===
          'object' &&
        confirmJson !== null &&
        'data' in confirmJson &&
        typeof confirmJson.data ===
          'object' &&
        confirmJson.data !== null &&
        'projectionPending' in
          confirmJson.data &&
        confirmJson.data
          .projectionPending ===
          true;

      setStatusMsg(
        projectionPending
          ? 'Registration submitted. Waiting for chain projection.'
          : 'Auction registration confirmed.',
      );

      setStep('success');

      setTimeout(
        () => {
          onSuccess();
          onClose();
        },
        1_800,
      );
    } catch (
      caught: unknown
    ) {
      const message =
        typeof caught ===
          'object' &&
        caught !== null &&
        'shortMessage' in caught &&
        typeof caught.shortMessage ===
          'string'
          ? caught.shortMessage
          : caught instanceof Error
            ? caught.message
            : 'Unknown error';

      setError(message);
      setStep('error');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-2">Confirm Auction</h3>
        <p className="text-sm text-gray-600 mb-4">
          Auction:{' '}
          <span className="font-mono text-xs">{auctionCode}</span>
        </p>

        {step === 'input' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              After Guarantor and Notary approval, confirm registration by
              signing with the consignor wallet. No email code is required.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 disabled:bg-gray-400"
              >
                Confirm &amp; Register
              </button>
            </div>

            {!address && (
              <p className="text-xs text-red-600 mt-3">
                Connect wallet first.
              </p>
            )}
          </>
        )}

        {step === 'processing' && (
          <div className="py-4">
            <p className="text-sm text-gray-700">{statusMsg}</p>
            <div className="mt-3 h-1 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse w-1/2" />
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-green-50 border border-green-300 text-green-800 p-3 rounded text-sm">
            {statusMsg}
          </div>
        )}

        {step === 'error' && (
          <>
            <div className="bg-red-50 border border-red-300 text-red-800 p-3 rounded text-sm mb-3">
              {error}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded text-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setStep('input');
                  setError(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
