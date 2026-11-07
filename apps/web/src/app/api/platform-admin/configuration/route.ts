import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { secretName, secretValue, comment } = body;

    if (!secretName || !secretValue) {
      return NextResponse.json({ error: 'Secret Name and Value are required' }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const storeId = process.env.CLOUDFLARE_SECRETS_STORE_ID;

    if (!accountId || !apiToken || !storeId) {
      return NextResponse.json({ error: 'Missing Cloudflare configuration' }, { status: 500 });
    }

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/secrets_store/stores/${storeId}/secrets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: secretName,
          value: secretValue,
          scopes: ['workers'],
          comment: comment || `Updated via UI at ${new Date().toISOString()}`
        }),
      }
    );

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error('Cloudflare API Error:', cfData);
      return NextResponse.json({ error: 'Gagal update Cloudflare Secrets', details: cfData }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: `Successfully updated ${secretName}!` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}