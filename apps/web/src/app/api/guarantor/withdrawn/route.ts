// @file apps/web/src/app/api/guarantor/withdrawn/route.ts
//
// Relay `markWithdrawn()` on-chain (guarantor signs EIP-712 Withdrawn).
// Insert attestation after relay success.
// Ref: PARALEL.md §4.2, §12, D12.4; CONTRACT_SPEC.md §3.13
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import { isAddress, isHex, type Hex } from 'viem';
import * as schema from '@db/schema';
import { computeAuctionKey } from '@shared/relay/sign';
import { getRelayClients, getContractAddress } from '@shared/relay/client';
import { relayWithdrawn } from '@shared/relay/guarantor';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type Body = {
  auctionId: string;
  guarantorWallet: `0x${string}`;
  signature: Hex;
  nonce: string;
  expiry: string;
  roundNo: number | string;
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

  let nonce: bigint;
  let expiry: bigint;
  let roundNo: number;
  try {
    nonce = BigInt(body.nonce);
    expiry = BigInt(body.expiry);
    roundNo = Number(body.roundNo);
  } catch {
    return NextResponse.json(
      { error: 'invalid nonce/expiry/roundNo' },
      { status: 400 },
    );
  }
  if (!Number.isInteger(roundNo) || roundNo < 1) {
    return NextResponse.json({ error: 'invalid roundNo' }, { status: 400 });
  }

  try {
    const [guarantor] = await db
      .select({ id: schema.partners.id })
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
    if (auction.status !== 'PASSED_IN') {
      return NextResponse.json(
        { error: `Auction status is ${auction.status}, expected PASSED_IN` },
        { status: 400 },
      );
    }

    const auctionKey = computeAuctionKey(auction.auctionCode);
    const { publicClient, walletClient } = getRelayClients();
    const contractAddress = getContractAddress();

    const txHash = await relayWithdrawn(
      publicClient,
      walletClient,
      contractAddress,
      {
        auctionId: body.auctionId,
        auctionKey,
        roundNo,
        guarantorWallet: body.guarantorWallet,
        nonce,
        expiry,
        signature: body.signature,
      },
    );

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });
    if (receipt.status !== 'success') {
      return NextResponse.json(
        { error: 'markWithdrawn() reverted on-chain', txHash },
        { status: 500 },
      );
    }

    const signatureBytes = Buffer.from(body.signature.slice(2), 'hex');
    await db
      .insert(schema.attestations)
      .values({
        auctionId: body.auctionId,
        roundNo,
        type: 'GUARANTOR_WITHDRAWN',
        signerWallet: body.guarantorWallet.toLowerCase(),
        payload: {
          auctionId: body.auctionId,
          auctionKey,
          roundNo,
          guarantorWallet: body.guarantorWallet.toLowerCase(),
          nonce: nonce.toString(),
          expiry: expiry.toString(),
        },
        signature: signatureBytes,
        submittedTxHash: txHash,
      })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true, txHash });
  } catch (err: any) {
    const msg = err?.shortMessage ?? err?.message ?? 'unknown error';
    console.error('[guarantor/withdrawn] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}