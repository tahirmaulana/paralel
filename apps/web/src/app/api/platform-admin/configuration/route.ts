import { NextResponse } from 'next/server';
import { executeApiHandler } from '@/lib/api/handler';
import { requireWorkspace } from '@/lib/auth';

const CONFIGURABLE_SECRET_NAMES = new Set([
  'DATABASE_URL',
  'ARBITRUM_RPC_URL',
  'RELAYER_PRIVATE_KEY',
]);

export async function POST(req: Request) {
  return executeApiHandler(req, async (requestContext) => {
    await requireWorkspace(
      req,
      requestContext.correlationId,
      'PLATFORM_ADMIN',
    );

    const body = await req.json() as {
      secretName?: unknown;
      secretValue?: unknown;
      comment?: unknown;
    };
    const { secretName, secretValue, comment } = body;

    if (
      typeof secretName !== 'string' ||
      !CONFIGURABLE_SECRET_NAMES.has(secretName) ||
      typeof secretValue !== 'string' ||
      secretValue.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Secret name or value is invalid.' },
        { status: 400 },
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const storeId = process.env.CLOUDFLARE_SECRETS_STORE_ID;

    if (!accountId || !apiToken || !storeId) {
      return NextResponse.json(
        { error: 'Missing Cloudflare configuration.' },
        { status: 500 },
      );
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
          comment:
            typeof comment === 'string' && comment.trim().length > 0
              ? comment.trim()
              : `Updated via UI at ${new Date().toISOString()}`,
        }),
      }
    );

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error('Cloudflare API Error:', cfData);
      return NextResponse.json(
        { error: 'Gagal update Cloudflare Secrets', details: cfData },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully updated ${secretName}!`,
    });
  });
}