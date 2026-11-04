// @file apps/web/src/app/api/relay/register/route.ts
import { NextResponse } from 'next/server';
import { getRelayClients, getContractAddress } from '@shared/relay/client';
import { submitRegisterAuction } from '@shared/relay/register';
import type { RegisterAuctionInput } from '@shared/relay/types';

type Body = Omit<
  RegisterAuctionInput,
  'startingBid' | 'bidIncrement' | 'openAt' | 'notaryNonce' | 'notaryExpiry' | 'consignorNonce' | 'consignorExpiry'
> & {
  startingBid: string;
  bidIncrement: string;
  openAt: string;
  notaryNonce: string;
  notaryExpiry: string;
  consignorNonce: string;
  consignorExpiry: string;
};

export async function POST(req: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  try {
    const input: RegisterAuctionInput = {
      ...body,
      startingBid: BigInt(body.startingBid),
      bidIncrement: BigInt(body.bidIncrement),
      openAt: BigInt(body.openAt),
      notaryNonce: BigInt(body.notaryNonce),
      notaryExpiry: BigInt(body.notaryExpiry),
      consignorNonce: BigInt(body.consignorNonce),
      consignorExpiry: BigInt(body.consignorExpiry),
    };

    const { publicClient, walletClient } = getRelayClients();
    const contractAddress = getContractAddress();

    const txHash = await submitRegisterAuction(publicClient, walletClient, contractAddress, input);

    return NextResponse.json({ ok: true, txHash }, { status: 200 });
  } catch (err: any) {
    const message = err?.shortMessage || err?.message || 'unknown relay error';
    console.error('[relay/register] failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}