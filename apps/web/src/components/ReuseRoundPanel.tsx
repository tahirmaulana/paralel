'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CONSIGNOR_CONFIRM_TYPES,
  eip712Domain,
  ParalelAuctionAbi,
  readAllowedIncrements,
  readAuctionConfigSnapshot,
  type AuctionConfigSnapshotState,
} from '@paralel/contracts';
import {
  isHex,
  zeroHash,
  type Hex,
} from 'viem';
import {
  useAccount,
  usePublicClient,
  useSignTypedData,
} from 'wagmi';
import {
  CHAIN_ID,
  CONTRACT_ADDRESS,
  fmtUSDC,
  parseUSDC,
} from '@/lib/web3';
import {
  createRelayRequestOptions,
} from '@/lib/api/relay-client';

function toLocalDateTimeInput(
  date: Date,
): string {
  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

export function ReuseRoundPanel(
  props: Readonly<{
    auctionKey: Hex;
    status: string;
    consignor?: string;
  }>,
) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } =
    useSignTypedData();
  const requestKeys =
    useRef(new Map<string, string>());
  const policyInitializedRef =
    useRef(false);
  const [configSnapshot, setConfigSnapshot] =
    useState<AuctionConfigSnapshotState | null>(null);
  const [allowedIncrements, setAllowedIncrements] =
    useState<readonly bigint[]>([]);
  const [blockTimestamp, setBlockTimestamp] =
    useState<bigint | null>(null);
  const [policyError, setPolicyError] =
    useState<string | null>(null);
  const [startingBid, setStartingBid] =
    useState('1.00');
  const [bidIncrement, setBidIncrement] =
    useState('');
  const [openAt, setOpenAt] =
    useState(() =>
      toLocalDateTimeInput(
        new Date(
          Date.now() +
            49 * 60 * 60 * 1_000,
        ),
      ),
    );
  const [durationHours, setDurationHours] =
    useState('24');
  const [busy, setBusy] =
    useState(false);
  const [result, setResult] =
    useState<string | null>(null);

  useEffect(() => {
    if (!publicClient || chainId !== CHAIN_ID) return;
    let cancel = false;
    Promise.all([
      readAuctionConfigSnapshot(publicClient, props.auctionKey),
      readAllowedIncrements(publicClient),
      publicClient.getBlock({ blockTag: 'latest' }),
    ])
      .then(([snapshot, increments, block]) => {
        if (cancel) return;
        if (increments.length === 0) {
          throw new Error('No bid increments are enabled by the contract.');
        }
        setConfigSnapshot(snapshot);
        setAllowedIncrements(increments);
        setBlockTimestamp(block.timestamp);
        setPolicyError(null);
        if (!policyInitializedRef.current) {
          policyInitializedRef.current = true;
          const preferredDelay = Math.min(
            Math.max(49 * 3_600, snapshot.minOpenDelay),
            snapshot.maxOpenDelay,
          );
          const preferredDuration = Math.min(
            Math.max(24, snapshot.minDurationHours),
            snapshot.maxDurationHours,
          );
          setOpenAt(
            toLocalDateTimeInput(
              new Date(
                Number(block.timestamp + BigInt(preferredDelay)) * 1_000,
              ),
            ),
          );
          setDurationHours(String(preferredDuration));
          setBidIncrement(increments[0].toString());
        }
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setPolicyError(
            error instanceof Error ? error.message : String(error),
          );
        }
      });
    return () => {
      cancel = true;
    };
  }, [chainId, props.auctionKey, publicClient]);

  const startingBidUnits = useMemo(() => {
    try {
      return startingBid ? parseUSDC(startingBid) : 0n;
    } catch {
      return 0n;
    }
  }, [startingBid]);

  const incrementOptions = useMemo(
    () =>
      allowedIncrements.map((increment) => ({
        increment,
        disabled:
          !configSnapshot ||
          startingBidUnits === 0n ||
          increment * 10_000n >
            startingBidUnits * BigInt(configSnapshot.maxIncrementBps),
      })),
    [allowedIncrements, configSnapshot, startingBidUnits],
  );

  useEffect(() => {
    if (!bidIncrement || !configSnapshot) return;
    const selected = incrementOptions.find(
      (option) => option.increment.toString() === bidIncrement,
    );
    if (!selected || selected.disabled) {
      setBidIncrement('');
    }
  }, [bidIncrement, configSnapshot, incrementOptions]);

  if (
    !address ||
    !props.consignor ||
    props.status !== 'PASSED_IN' ||
    address.toLowerCase() !==
      props.consignor.toLowerCase()
  ) {
    return null;
  }

  const consignor = address;

  if (chainId !== CHAIN_ID) {
    return (
      <p className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
        Switch your wallet to Arbitrum Sepolia to re-list this auction.
      </p>
    );
  }

  async function submit() {
    if (!publicClient) {
      setResult(
        'Failed: blockchain client is unavailable.',
      );
      return;
    }

    setBusy(true);
    setResult(null);

    try {
      if (!configSnapshot || blockTimestamp === null || policyError) {
        throw new Error(policyError ?? 'Auction rules are still loading.');
      }
      const startingBidUnits =
        parseUSDC(startingBid);
      const bidIncrementUnits =
        BigInt(bidIncrement);
      const openAtDate =
        new Date(openAt);

      if (
        startingBidUnits <= 0n ||
        !Number.isFinite(
          openAtDate.getTime(),
        )
      ) {
        throw new Error(
          'Enter a positive starting bid and a valid opening date.',
        );
      }

      const openAtSeconds =
        BigInt(
          Math.floor(
            openAtDate.getTime() / 1_000,
          ),
        );
      const duration =
        Number(durationHours);
      if (
        !allowedIncrements.includes(bidIncrementUnits) ||
        bidIncrementUnits * 10_000n >
          startingBidUnits * BigInt(configSnapshot.maxIncrementBps) ||
        duration < configSnapshot.minDurationHours ||
        duration > configSnapshot.maxDurationHours ||
        openAtSeconds <
          blockTimestamp + BigInt(configSnapshot.minOpenDelay) ||
        openAtSeconds >
          blockTimestamp + BigInt(configSnapshot.maxOpenDelay)
      ) {
        throw new Error('Auction parameters do not match the current contract configuration.');
      }
      const nonce =
        await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: ParalelAuctionAbi,
          functionName: 'nonces',
          args: [consignor],
        }) as bigint;
      const expiry =
        BigInt(
          Math.floor(Date.now() / 1_000) +
            3_600,
        );
      const signature =
        await signTypedDataAsync({
          domain: eip712Domain(
            CHAIN_ID,
            CONTRACT_ADDRESS,
          ),
          types:
            CONSIGNOR_CONFIRM_TYPES,
          primaryType:
            'ConsignorConfirm',
          message: {
            auctionKey:
              props.auctionKey,
            confirmationCodeHash:
              zeroHash,
            nonce,
            expiry,
          },
        });

      const requestBody =
        JSON.stringify({
          auctionKey:
            props.auctionKey,
          startingBid:
            startingBidUnits.toString(),
          bidIncrement:
            bidIncrementUnits.toString(),
          openAt:
            openAtSeconds.toString(),
          durationHours: duration,
          nonce:
            nonce.toString(),
          expiry:
            expiry.toString(),
          signature,
        });
      let idempotencyKey =
        requestKeys.current.get(requestBody);
      if (!idempotencyKey) {
        idempotencyKey =
          crypto.randomUUID();
        requestKeys.current.set(
          requestBody,
          idempotencyKey,
        );
      }
      const response =
        await fetch(
          '/api/relay/reuse-round',
          createRelayRequestOptions(
            requestBody,
            idempotencyKey,
          ),
        );
      const value: unknown =
        await response.json();

      if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value)
      ) {
        throw new Error(
          `Re-list returned an invalid response (${response.status}).`,
        );
      }

      const body =
        value as Record<string, unknown>;

      if (!response.ok || body.ok !== true) {
        const error =
          body.error;
        const message =
          typeof error === 'object' &&
          error !== null &&
          !Array.isArray(error) &&
          typeof (
            error as Record<string, unknown>
          ).message === 'string'
            ? (
                error as Record<string, string>
              ).message
            : typeof error === 'string'
              ? error
              : 'Re-list request failed.';

        throw new Error(message);
      }

      if (
        typeof body.txHash !== 'string' ||
        !isHex(body.txHash) ||
        body.txHash.length !== 66
      ) {
        throw new Error(
          'Re-list returned an invalid transaction hash.',
        );
      }

      setResult(
        body.projectionPending === true
          ? `Transaction submitted; the next round will appear after chain projection: ${body.txHash}`
          : `Re-list confirmed: ${body.txHash}`,
      );
      requestKeys.current.delete(requestBody);
    } catch (error: unknown) {
      setResult(
        `Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border bg-white p-4">
      <h2 className="mb-2 font-bold">
        Re-list Auction
      </h2>
      <p className="mb-3 text-sm text-gray-700">
        Creates the next round only after RoundScheduled is indexed.
      </p>
      {policyError && (
        <p className="mb-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Unable to load current auction rules: {policyError}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Starting bid (USDC)
          <input
            type="number"
            min="0.000001"
            step="0.000001"
            value={startingBid}
            onChange={(event) =>
              setStartingBid(event.target.value)
            }
            className="rounded border p-2"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Bid increment (USDC)
          <select
            value={bidIncrement}
            onChange={(event) =>
              setBidIncrement(event.target.value)
            }
            className="rounded border p-2"
            disabled={!configSnapshot || startingBidUnits === 0n}
          >
            {incrementOptions.map(
              ({ increment, disabled }) => (
                <option
                  key={increment.toString()}
                  value={increment.toString()}
                  disabled={disabled}
                >
                  {fmtUSDC(increment)} USDC{disabled ? ' (above configured limit)' : ''}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Opening date and time
          <input
            type="datetime-local"
            value={openAt}
            onChange={(event) =>
              setOpenAt(event.target.value)
            }
            className="rounded border p-2"
            min={
              configSnapshot && blockTimestamp !== null
                ? toLocalDateTimeInput(
                    new Date(
                      Number(
                        blockTimestamp +
                          BigInt(configSnapshot.minOpenDelay),
                      ) * 1_000,
                    ),
                  )
                : undefined
            }
            max={
              configSnapshot && blockTimestamp !== null
                ? toLocalDateTimeInput(
                    new Date(
                      Number(
                        blockTimestamp +
                          BigInt(configSnapshot.maxOpenDelay),
                      ) * 1_000,
                    ),
                  )
                : undefined
            }
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          Duration (hours)
          <input
            type="number"
            min={configSnapshot?.minDurationHours}
            max={configSnapshot?.maxDurationHours}
            step={1}
            value={durationHours}
            onChange={(event) =>
              setDurationHours(event.target.value)
            }
            className="rounded border p-2"
          />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={busy || !configSnapshot || Boolean(policyError)}
        className="mt-3 rounded bg-purple-700 px-4 py-2 text-white disabled:bg-gray-400"
      >
        {busy
          ? 'Signing...'
          : 'Sign & Re-list (relay)'}
      </button>
      {result && (
        <p className="mt-2 break-all text-sm">
          {result}
        </p>
      )}
    </div>
  );
}
