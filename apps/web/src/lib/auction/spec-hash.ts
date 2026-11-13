// @file apps/web/src/lib/auction/spec-hash.ts
//
// Deterministik: dihitung SEKALI saat submit PENDING, disimpan di
// auction_assets.spec_hash, dan tidak pernah di-recompute (PARALEL.md §D2.3).
//
// Nilai spec_hash ini yang ditandatangani Guarantor (GuarantorApproval) dan
// yang dikirim ke kontrak saat registerAuction(p.specHash). Kontrak hanya
// menyimpan bytes32 tanpa verifikasi isi — sesuai ParalelAuction.sol.
import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  toBytes,
  type Hex,
} from 'viem';

export type SpecHashInput = {
  title: string;
  description: string;
  condition: string;
  conditionNotes: string | null;
  documentType: 'CERTIFICATE' | 'INVOICE';
  documentNumber: string;
  chassisNumber: string | null;
  serialNumber: string | null;
  spec: Record<string, unknown>;
  photoContentHashes: [Hex, Hex, Hex, Hex, Hex];
  documentScanContentHash: Hex;
};

const PARAMS = parseAbiParameters(
  'string, string, string, string, string, string, string, string, ' +
    'bytes32, bytes32, bytes32, bytes32, bytes32, bytes32, bytes32',
);

function canonicalJson(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of keys) {
    const v = obj[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      sorted[k] = canonicalJson(v as Record<string, unknown>);
    } else {
      sorted[k] = v;
    }
  }
  return JSON.stringify(sorted);
}

export function computeSpecHash(input: SpecHashInput): Hex {
  const canonicalSpec = canonicalJson(input.spec);
  const specBytes32 = keccak256(toBytes(canonicalSpec));

  return keccak256(
    encodeAbiParameters(PARAMS, [
      input.title,
      input.description,
      input.condition,
      input.conditionNotes ?? '',
      input.documentType,
      input.documentNumber,
      input.chassisNumber ?? '',
      input.serialNumber ?? '',
      specBytes32,
      input.photoContentHashes[0],
      input.photoContentHashes[1],
      input.photoContentHashes[2],
      input.photoContentHashes[3],
      input.photoContentHashes[4],
      input.documentScanContentHash,
    ]),
  );
}