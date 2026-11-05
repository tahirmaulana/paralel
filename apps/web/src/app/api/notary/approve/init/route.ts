// @file apps/web/src/app/api/notary/approve/init/route.ts
//
// Phase 1 of the 2-phase notary approval flow (PARALEL.md D11.4).
// Backend derives code + codeHash and returns them WITHOUT the plaintext code.
// Ref: docs/PARALEL.md §4.1.1, §9.2, D11.3, D11.4
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import { isAddress, type Hex } from 'viem';
import * as schema from '@db/schema';
import {
  computeAuctionKey,
  computeParamsHash,
} from '@shared/relay/sign';
import { deriveConfirmationCode, DERIVATION_TAG } from '@shared/relay/confirm-code';
import { getRelayClients, getContractAddress } from '@shared/relay/client';
import { relayAbi } from '@shared/relay/abi';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const EXPIRY_SECONDS = 3600n;

type Body = {
  auctionId: string;
  notaryWallet: `0x${string}`;
};

export async function POST(req: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!isAddress(body.notaryWallet)) {
    return NextResponse.json({ error: 'invalid notaryWallet' }, { status: 400 });
  }
  if (typeof body.auctionId !== 'string' || body.auctionId.length === 0) {
    return NextResponse.json({ error: 'auctionId required' }, { status: 400 });
  }

  try {
    // 1. Validate notary is registered + active.
    const [notary] = await db
      .select({ id: schema.partners.id })
      .from(schema.partners)
      .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
      .where(
        and(
          eq(schema.partners.type, 'NOTARY'),
          eq(schema.partners.active, true),
          eq(schema.users.wallet, body.notaryWallet.toLowerCase()),
        ),
      )
      .limit(1);

    if (!notary) {
      return NextResponse.json({ error: 'Notary not found or inactive' }, { status: 404 });
    }

    // 2. Fetch auction + round.
    const [auction] = await db
      .select({
        id: schema.auctions.id,
        auctionCode: schema.auctions.auctionCode,
        status: schema.auctions.status,
        createdAt: schema.auctions.createdAt,
        currentRound: schema.auctions.currentRound,
      })
      .from(schema.auctions)
      .where(eq(schema.auctions.id, body.auctionId))
      .limit(1);

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }
    if (auction.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Auction status ${auction.status}, expected PENDING` },
        { status: 400 },
      );
    }

    const [round] = await db
      .select({
        startingBid: schema.auctionRounds.startingBid,
        bidIncrement: schema.auctionRounds.bidIncrement,
        openAt: schema.auctionRounds.openAt,
        durationHours: schema.auctionRounds.durationHours,
      })
      .from(schema.auctionRounds)
      .where(
        and(
          eq(schema.auctionRounds.auctionId, body.auctionId),
          eq(schema.auctionRounds.roundNo, auction.currentRound),
        ),
      )
      .limit(1);

    if (!round) {
      return NextResponse.json({ error: 'Round data not found' }, { status: 404 });
    }

    // 3. Fetch GUARANTOR_APPROVED attestation.
    const [guarantor] = await db
      .select({
        signerWallet: schema.attestations.signerWallet,
        createdAt: schema.attestations.createdAt,
      })
      .from(schema.attestations)
      .where(
        and(
          eq(schema.attestations.auctionId, body.auctionId),
          eq(schema.attestations.type, 'GUARANTOR_APPROVED'),
        ),
      )
      .limit(1);

    if (!guarantor) {
      return NextResponse.json(
        { error: 'Guarantor has not approved this auction yet' },
        { status: 400 },
      );
    }

    // 4. Check NOTARY_APPROVED doesn't exist.
    const existingNotary = await db
      .select({ id: schema.attestations.id })
      .from(schema.attestations)
      .where(
        and(
          eq(schema.attestations.auctionId, body.auctionId),
          eq(schema.attestations.type, 'NOTARY_APPROVED'),
        ),
      )
      .limit(1);

    if (existingNotary.length > 0) {
      return NextResponse.json(
        { error: 'Auction already has NOTARY_APPROVED (another notary won the race)' },
        { status: 409 },
      );
    }

    // 5. Read current on-chain nonce.
    const { publicClient } = getRelayClients();
    const contractAddress = getContractAddress();
    const nonce = (await publicClient.readContract({
      address: contractAddress,
      abi: relayAbi,
      functionName: 'nonces',
      args: [body.notaryWallet],
    })) as bigint;

    // 6. Compute expiry.
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const expiry = nowSec + EXPIRY_SECONDS;

    // 7. Compute paramsHash + auctionKey.
    const openAtUnix = BigInt(Math.floor(round.openAt.getTime() / 1000));
    const paramsHash = computeParamsHash(
      round.startingBid,
      round.bidIncrement,
      openAtUnix,
      round.durationHours,
    );
    const auctionKey = computeAuctionKey(auction.auctionCode);

    // 8. Derive code + codeHash (formula v1).
    const { codeHash } = deriveConfirmationCode({
      auctionCode: auction.auctionCode,
      auctionCreatedAt: auction.createdAt,
      auctionId: auction.id,
      guarantorWallet: guarantor.signerWallet as Hex,
      guarantorApprovedAt: guarantor.createdAt,
      notaryWallet: body.notaryWallet,
      nonce,
      expiry,
    });

    return NextResponse.json({
      auctionKey,
      paramsHash,
      codeHash,
      nonce: nonce.toString(),
      expiry: expiry.toString(),
      derivation: DERIVATION_TAG,
    });
  } catch (err: any) {
    console.error('[notary/approve/init] failed:', err?.shortMessage ?? err?.message ?? err);
    return NextResponse.json(
      { error: err?.shortMessage ?? err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}