// @file apps/web/src/app/api/guarantor/reject/route.ts
//
// Off-chain rejection: verify EIP-712 GuarantorRejection, insert attestation,
// insert status_log, update auction.status = 'REJECTED'.
// Ref: PARALEL.md §4.2, §9.1, D12.4, D12.3
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import { isAddress, isHex, verifyTypedData, type Hex } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import * as schema from '@db/schema';
import {
  computeAuctionKey,
  computeReasonHash,
  eip712Domain,
  GUARANTOR_REJECTION_TYPES,
} from '@shared/relay/sign';
import { CONTRACT_ADDRESS } from '@/lib/web3';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type Body = {
  auctionId: string;
  guarantorWallet: `0x${string}`;
  signature: Hex;
  nonce: string;
  expiry: string;
  reason: string;
};

export async function POST(req: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!isAddress(body.guarantorWallet)) {
    return NextResponse.json({ error: 'invalid guarantorWallet' }, { status: 400 });
  }
  if (!isHex(body.signature) || body.signature.length !== 132) {
    return NextResponse.json({ error: 'invalid signature format' }, { status: 400 });
  }
  if (typeof body.reason !== 'string' || body.reason.trim().length < 10) {
    return NextResponse.json(
      { error: 'reason required (min 10 characters)' },
      { status: 400 },
    );
  }

  let nonce: bigint;
  let expiry: bigint;
  try {
    nonce = BigInt(body.nonce);
    expiry = BigInt(body.expiry);
  } catch {
    return NextResponse.json({ error: 'invalid nonce/expiry' }, { status: 400 });
  }

  try {
    // 1. Validate guarantor.
    const [guarantor] = await db
      .select({ id: schema.partners.id, userId: schema.partners.userId })
      .from(schema.partners)
      .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
      .where(
        and(
          eq(schema.partners.type, 'GUARANTOR'),
          eq(schema.partners.active, true),
          eq(schema.users.wallet, body.guarantorWallet.toLowerCase()),
        ),
      )
      .limit(1);
    if (!guarantor) {
      return NextResponse.json(
        { error: 'Guarantor not found or inactive' },
        { status: 404 },
      );
    }

    // 2. Fetch auction.
    const [auction] = await db
      .select({
        id: schema.auctions.id,
        auctionCode: schema.auctions.auctionCode,
        status: schema.auctions.status,
        guarantorId: schema.auctions.guarantorId,
      })
      .from(schema.auctions)
      .where(eq(schema.auctions.id, body.auctionId))
      .limit(1);

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }
    if (auction.guarantorId !== guarantor.id) {
      return NextResponse.json(
        { error: 'Auction not assigned to this guarantor' },
        { status: 403 },
      );
    }
    if (auction.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Auction status is ${auction.status}, expected PENDING` },
        { status: 400 },
      );
    }

    // 3. Check NOT already approved/rejected.
    const existing = await db
      .select({ type: schema.attestations.type })
      .from(schema.attestations)
      .where(eq(schema.attestations.auctionId, body.auctionId));
    const types = new Set(existing.map((r) => r.type));
    if (types.has('GUARANTOR_APPROVED')) {
      return NextResponse.json(
        { error: 'Auction already approved — cannot reject' },
        { status: 409 },
      );
    }
    if (types.has('GUARANTOR_REJECTED')) {
      return NextResponse.json(
        { error: 'Auction already rejected' },
        { status: 409 },
      );
    }

    // 4. Verify signature.
    const auctionKey = computeAuctionKey(auction.auctionCode);
    const reasonHash = computeReasonHash(body.reason);

    const valid = await verifyTypedData({
      address: body.guarantorWallet,
      domain: eip712Domain(arbitrumSepolia.id, CONTRACT_ADDRESS),
      types: GUARANTOR_REJECTION_TYPES,
      primaryType: 'GuarantorRejection',
      message: {
        auctionKey,
        reasonHash,
        nonce,
        expiry,
      },
      signature: body.signature,
    });
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 5. Insert attestation.
    const signatureBytes = Buffer.from(body.signature.slice(2), 'hex');
    const inserted = await db
      .insert(schema.attestations)
      .values({
        auctionId: body.auctionId,
        type: 'GUARANTOR_REJECTED',
        signerWallet: body.guarantorWallet.toLowerCase(),
        payload: {
          auctionId: body.auctionId,
          guarantorWallet: body.guarantorWallet.toLowerCase(),
          reason: body.reason,
          reasonHash,
          attestationTimestamp: Math.floor(Date.now() / 1000),
        },
        signature: signatureBytes,
      })
      .onConflictDoNothing()
      .returning({ id: schema.attestations.id });

    if (inserted.length === 0) {
      return NextResponse.json(
        { error: 'Auction already has approval/rejection' },
        { status: 409 },
      );
    }

    // 6. Insert status_log.
    await db.insert(schema.statusLog).values({
      auctionId: body.auctionId,
      roundNo: null,
      fromStatus: 'PENDING',
      toStatus: 'REJECTED',
      actorUserId: guarantor.userId,
      reason: body.reason,
    });

    // 7. Update auction status.
    await db
      .update(schema.auctions)
      .set({ status: 'REJECTED', updatedAt: new Date() })
      .where(eq(schema.auctions.id, body.auctionId));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[guarantor/reject] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}