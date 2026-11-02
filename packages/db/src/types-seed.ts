// @file packages/db/src/types-seed.ts
// 'ALL' khusus untuk partners.category (guarantor pilot lintas kategori).
// Auction.category tetap 5 nilai real di bawah.
export type Category =
  | 'ALL'
  | 'OTOMOTIF'
  | 'PROPERTI'
  | 'ELEKTRONIK'
  | 'AKSESORIS_HOBI'
  | 'PERHIASAN';