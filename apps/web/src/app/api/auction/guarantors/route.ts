// @file apps/web/src/app/api/auction/guarantors/route.ts
//
// Daftar guarantor aktif untuk dropdown di wizard create.
// Filter opsional by category: 'ALL' atau category match.
// Ref: PARALEL.md §4.2, §4.3, D1.3.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq, or, sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { isCategory } from '@/lib/auction/spec-schema';

const sql_ = neon(process.env.DATABASE_URL!);
const db = drizzle(sql_, { schema });

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const categoryParam = searchParams.get('category');

  if (categoryParam && !isCategory(categoryParam)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 });
  }

  try {
    const rows = await db
      .select({
        id: schema.partners.id,
        name: schema.partners.name,
        city: schema.partners.city,
        category: schema.partners.category,
        wallet: schema.users.wallet,
      })
      .from(schema.partners)
      .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
      .where(
        and(
          eq(schema.partners.type, 'GUARANTOR'),
          eq(schema.partners.active, true),
          categoryParam
            ? or(
                eq(schema.partners.category, 'ALL'),
                eq(schema.partners.category, categoryParam),
              )
            : sql`true`,
        ),
      );

    return NextResponse.json({
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        category: r.category,
        wallet: r.wallet.toLowerCase(),
      })),
    });
  } catch (err: any) {
    console.error('[auction/guarantors] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}