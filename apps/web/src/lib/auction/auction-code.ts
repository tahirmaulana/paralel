// @file apps/web/src/lib/auction/auction-code.ts
//
// Generator auction_code: {CITY_CODE}-{CAT_CODE}-{YYMMDD}-{SEQ}
// Ref: PARALEL.md §D2.1 (kode yang tampil ke publik, memuat kota guarantor).
// auctionKey = keccak256(toBytes(auction_code)) — dipakai kontrak sebagai key.
import { keccak256, toBytes, type Hex } from 'viem';

export const CITY_CODE_MAP: Record<string, string> = {
  jakarta: 'JKT',
  bandung: 'BDG',
  surabaya: 'SBY',
  medan: 'MDN',
  yogyakarta: 'YOG',
  semarang: 'SMG',
  makassar: 'MKS',
  denpasar: 'DPS',
  palembang: 'PLM',
  tangerang: 'TNG',
};

export const CATEGORY_CODE_MAP: Record<string, string> = {
  OTOMOTIF: 'OTM',
  PROPERTI: 'PRP',
  ELEKTRONIK: 'ELK',
  AKSESORIS_HOBI: 'AKS',
  PERHIASAN: 'PRH',
};

export function cityToCode(city: string | null): string {
  if (!city) return 'XXX';
  const key = city.trim().toLowerCase();
  if (CITY_CODE_MAP[key]) return CITY_CODE_MAP[key];
  return city
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
}

export function categoryToCode(category: string): string {
  return CATEGORY_CODE_MAP[category] ?? 'GEN';
}

export function computeAuctionKey(auctionCode: string): Hex {
  return keccak256(toBytes(auctionCode));
}

/**
 * Mengalokasikan auction_code di dalam transaction pembuat auction.
 *
 * Advisory lock menjamin hanya satu allocator untuk prefix yang sama
 * berjalan pada satu waktu. Auction row wajib di-insert sebelum transaction
 * commit agar sequence tersebut benar-benar terreservasi.
 */
export async function allocateAuctionCode(
  transaction: import('postgres').TransactionSql,
  input: Readonly<{
    city: string | null;
    category: string;
    now: Date;
  }>,
): Promise<string> {
  if (
    !(input.now instanceof Date) ||
    Number.isNaN(
      input.now.getTime(),
    )
  ) {
    throw new Error(
      'Auction code allocation requires a valid Date.',
    );
  }

  const cityCode =
    cityToCode(
      input.city,
    );

  const categoryCode =
    categoryToCode(
      input.category,
    );

  const year =
    String(
      input.now.getUTCFullYear(),
    ).slice(2);

  const month =
    String(
      input.now.getUTCMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      input.now.getUTCDate(),
    ).padStart(2, '0');

  const prefix =
    `${cityCode}-${categoryCode}-${year}${month}${day}-`;

  await transaction`
    SELECT pg_advisory_xact_lock(
      hashtextextended(
        ${`auction-code:${prefix}`},
        0
      )
    )
  `;

  const rows =
    await transaction<
      ReadonlyArray<{
        maximum_sequence:
          number | null;
      }>
    >`
      SELECT MAX(
        CASE
          WHEN substring(
            auction_code
            FROM ${prefix.length + 1}
          ) ~ '^[0-9]{4}$'
          THEN substring(
            auction_code
            FROM ${prefix.length + 1}
          )::integer
          ELSE NULL
        END
      )::integer AS maximum_sequence
      FROM auctions
      WHERE auction_code LIKE
        ${`${prefix}%`}
    `;

  const nextSequence =
    (
      rows[0]
        ?.maximum_sequence ??
      0
    ) + 1;

  if (
    nextSequence < 1 ||
    nextSequence > 9_999
  ) {
    throw new Error(
      `Auction code sequence exhausted for prefix ${prefix}`,
    );
  }

  return (
    prefix +
    String(
      nextSequence,
    ).padStart(4, '0')
  );
}

