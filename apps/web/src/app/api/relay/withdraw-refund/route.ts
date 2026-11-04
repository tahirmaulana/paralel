// @file apps/web/src/app/api/relay/withdraw-refund/route.ts
import { NextResponse } from 'next/server';
import { isAddress, isHex, type Hex } from 'viem';
import { getRelayClients, getContractAddress } from '@shared/relay/client';
import { relayWithdrawRefund } from '@shared/relay/withdraw';

type Body = {
  auctionKey: Hex;
  roundNo: number | string;
  bidder: `0x${string}`;
  nonce: string;
  expiry: string;
  signature: Hex;
};

export async function POST(req: Request): Promise<Response> {
  let body: Body;

  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!isHex(body.auctionKey) || body.auctionKey.length !== 66) {
    return NextResponse.json({ error: 'invalid auctionKey' }, { status: 400 });
  }

  if (!isAddress(body.bidder)) {
    return NextResponse.json({ error: 'invalid bidder' }, { status: 400 });
  }

  if (!isHex(body.signature) || body.signature.length !== 132) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const roundNo = Number(body.roundNo);
  if (!Number.isInteger(roundNo) || roundNo < 0) {
    return NextResponse.json({ error: 'invalid roundNo' }, { status: 400 });
  }

  try {
    const input = {
      auctionKey: body.auctionKey,
      roundNo,
      bidder: body.bidder,
      nonce: BigInt(body.nonce),
      expiry: BigInt(body.expiry),
      signature: body.signature,
    };

    const { publicClient, walletClient } = getRelayClients();
    const contractAddress = getContractAddress();

    const txHash = await relayWithdrawRefund(
      publicClient,
      walletClient,
      contractAddress,
      input,
    );

    return NextResponse.json({ ok: true, txHash }, { status: 200 });
  } catch (err: any) {
    const message = err?.shortMessage || err?.message || 'unknown relay error';
    console.error('[relay/withdraw-refund] failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}