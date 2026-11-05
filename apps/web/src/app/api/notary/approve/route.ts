// @file apps/web/src/app/api/notary/approve/route.ts
//
// Phase 2 of the 2-phase notary approval flow (PARALEL.md D11.4).
// Verifies the EIP-712 signature, re-derives the code, and persists
// attestation + confirmation_code atomically.
//
// Idempotency:
//   - If NOTARY_APPROVED already exists for this auction → 409.
//   - Partial unique index uq_attestation_approval is the final race guard.
//   - On-chain nonce drift → 400 (user must re-init).
//
// Ref: docs/PARALEL.md §4.1.1, §9.2, D3.2, D3.3, D11.3, D11.4
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import { isAddress, isHex, verifyTypedData, type Hex } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import * as schema from '@db/schema';
import {
  computeAuctionKey,
  computeParamsHash,
  eip712Domain,
  NOTARY_APPROVAL_TYPES,
} from '@shared/relay/sign';
import { deriveConfirmationCode, DERIVATION_TAG } from '@shared/relay/confirm-code';
import { getRelayClients, getContractAddress } from '@shared/relay/client';
import { relayAbi } from '@shared/relay/abi';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type Body = {
  auctionId: string;
  notaryWallet: `0x${string}`;
  signature: Hex;
  nonce: string;
  expiry: string;
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
  if (!isHex(body.signature) || body.signature.length !== 132) {
    return NextResponse.json({ error: 'invalid signature format' }, { status: 400 });
  }
  if (typeof body.auctionId !== 'string' || body.auctionId.length === 0) {
    return NextResponse.json({ error: 'auctionId required' }, { status: 400 });
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
    // 1. Validate notary.
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

    // 3. Fetch GUARANTOR_APPROVED.
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
        { error: 'Auction already approved by another notary' },
        { status: 409 },
      );
    }

    // 5. Verify on-chain nonce hasn't drifted since /init.
    const { publicClient } = getRelayClients();
    const contractAddress = getContractAddress();
    const onChainNonce = (await publicClient.readContract({
      address: contractAddress,
      abi: relayAbi,
      functionName: 'nonces',
      args: [body.notaryWallet],
    })) as bigint;

    if (onChainNonce !== nonce) {
      return NextResponse.json(
        {
          error: 'Nonce changed since initialization — please retry',
          expected: onChainNonce.toString(),
          provided: nonce.toString(),
        },
        { status: 400 },
      );
    }

    // 6. Fetch round data for paramsHash.
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

    // 7. Re-derive code + codeHash.
    const { code, codeHash } = deriveConfirmationCode({
      auctionCode: auction.auctionCode,
      auctionCreatedAt: auction.createdAt,
      auctionId: auction.id,
      guarantorWallet: guarantor.signerWallet as Hex,
      guarantorApprovedAt: guarantor.createdAt,
      notaryWallet: body.notaryWallet,
      nonce,
      expiry,
    });

    // 8. Compute paramsHash + auctionKey.
    const openAtUnix = BigInt(Math.floor(round.openAt.getTime() / 1000));
    const paramsHash = computeParamsHash(
      round.startingBid,
      round.bidIncrement,
      openAtUnix,
      round.durationHours,
    );
    const auctionKey = computeAuctionKey(auction.auctionCode);

    // 9. Verify EIP-712 signature.
    const valid = await verifyTypedData({
      address: body.notaryWallet,
      domain: eip712Domain(arbitrumSepolia.id, contractAddress),
      types: NOTARY_APPROVAL_TYPES,
      primaryType: 'NotaryApproval',
      message: {
        auctionKey,
        paramsHash,
        confirmationCodeHash: codeHash,
        nonce,
        expiry,
      },
      signature: body.signature,
    });

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 10. Persist attestation (unique index = race guard).
    const signatureBytes = Buffer.from(body.signature.slice(2), 'hex');
    const codeHashBytes = Buffer.from(codeHash.slice(2), 'hex');

    const inserted = await db
      .insert(schema.attestations)
      .values({
        auctionId: body.auctionId,
        type: 'NOTARY_APPROVED',
        signerWallet: body.notaryWallet.toLowerCase(),
        payload: {
          auctionKey,
          notaryWallet: body.notaryWallet.toLowerCase(),
          guarantorWallet: guarantor.signerWallet.toLowerCase(),
          nonce: nonce.toString(),
          expiry: expiry.toString(),
          codeHash,
          derivation: DERIVATION_TAG,
        },
        signature: signatureBytes,
      })
      .onConflictDoNothing()
      .returning({ id: schema.attestations.id });

    if (inserted.length === 0) {
      return NextResponse.json(
        { error: 'Auction already approved (race lost)' },
        { status: 409 },
      );
    }

    // 11. Persist confirmation_code.
    await db
      .insert(schema.confirmationCodes)
      .values({
        auctionId: body.auctionId,
        codeHash: codeHashBytes,
        issuedByNotary: notary.id,
        signature: signatureBytes,
      })
      .onConflictDoNothing();

    // 12. Update auction.notary_id cache + updated_at.
    await db
      .update(schema.auctions)
      .set({ notaryId: notary.id, updatedAt: new Date() })
      .where(eq(schema.auctions.id, body.auctionId));

    // 13. Simulate email (no email API wired yet).
    console.log(
      `[SIMULASI EMAIL] Kode konfirmasi ${code} untuk consignor ` +
      `(auctionId=${body.auctionId}, auctionCode=${auction.auctionCode}, ` +
      `notary=${body.notaryWallet})`,
    );

    return NextResponse.json({ ok: true, derivation: DERIVATION_TAG });
  } catch (err: any) {
    // Detect unique violation (race lost at DB level).
    if (err?.code === '23505') {
      return NextResponse.json(
        { error: 'Auction already approved (race lost at DB)' },
        { status: 409 },
      );
    }
    console.error('[notary/approve] failed:', err?.shortMessage ?? err?.message ?? err);
    return NextResponse.json(
      { error: err?.shortMessage ?? err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}