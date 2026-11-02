// @file packages/db/src/seed-partners.ts
// Master data partner. Sinkron dengan `setPartner` di Setup.s.sol (421614).
//
// Konvensi pilot: SATU guarantor untuk semua kategori.
// Kontrak tidak memakai `category` selain equality check di registerAuction.
// Backend (Tahap 4) yang selalu mengirim `category = 1` saat memanggil
// registerAuction — nilai di sini adalah label bisnis untuk DB/UI saja.
import type { Category } from './types-seed';

export type PartnerSeed = {
  wallet: `0x${string}`;
  type: 'NOTARY' | 'GUARANTOR';
  name: string;
  category: Category | null;
  city: string | null;
};

export const SEED_PARTNERS: PartnerSeed[] = [
  {
    wallet: '0xc6baf074ba3b8112b9adf1f61f8133875f982fa2',
    type: 'NOTARY',
    name: 'H. S. Siregar, SH',
    category: null,
    city: null,
  },
  {
    wallet: '0xb8b194df2352ead585843959d3e7363279207f6c',
    type: 'GUARANTOR',
    name: 'OCBC NISP',
    // Label bisnis. Bebas ganti; on-chain tetap dikirim 1.
    category: 'ALL',
    city: 'Jakarta',
  },
];