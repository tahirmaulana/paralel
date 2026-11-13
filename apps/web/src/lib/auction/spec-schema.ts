// @file apps/web/src/lib/auction/spec-schema.ts
//
// Validator hand-rolled untuk field `spec` per kategori.
// Ref: PARALEL.md §D2.3.1. Dipakai bersama oleh client (form) dan server (API).
// Tidak memakai lib baru — konsisten dengan parseUSDC di lib/web3.ts.
export const CATEGORIES = [
  'OTOMOTIF',
  'PROPERTI',
  'ELEKTRONIK',
  'AKSESORIS_HOBI',
  'PERHIASAN',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type SpecFieldType = 'text' | 'int' | 'number' | 'date' | 'enum';

export type SpecFieldDef = {
  key: string;
  type: SpecFieldType;
  required: boolean;
  enumValues?: readonly string[];
  min?: number;
  max?: number;
};

export const SPEC_SCHEMA: Record<Category, readonly SpecFieldDef[]> = {
  OTOMOTIF: [
    { key: 'brand', type: 'text', required: true },
    { key: 'model', type: 'text', required: true },
    { key: 'year', type: 'int', required: true, min: 1900, max: 2100 },
    { key: 'color', type: 'text', required: true },
    { key: 'mileageKm', type: 'int', required: true, min: 0 },
  ],
  PROPERTI: [
    { key: 'propertyType', type: 'text', required: true },
    { key: 'kelurahan', type: 'text', required: true },
    { key: 'kecamatan', type: 'text', required: true },
    { key: 'kota', type: 'text', required: true },
    { key: 'provinsi', type: 'text', required: true },
    { key: 'landAreaM2', type: 'number', required: true, min: 0 },
    { key: 'buildingAreaM2', type: 'number', required: true, min: 0 },
    {
      key: 'certificateKind',
      type: 'enum',
      required: true,
      enumValues: ['SHM', 'SHGB', 'LAINNYA'],
    },
  ],
  ELEKTRONIK: [
    { key: 'brand', type: 'text', required: true },
    { key: 'model', type: 'text', required: true },
    { key: 'purchaseYear', type: 'int', required: true, min: 1900, max: 2100 },
    { key: 'completeness', type: 'text', required: true },
    { key: 'warrantyUntil', type: 'date', required: false },
  ],
  AKSESORIS_HOBI: [
    { key: 'brand', type: 'text', required: true },
    { key: 'modelEdition', type: 'text', required: true },
    { key: 'year', type: 'int', required: true, min: 1900, max: 2100 },
    { key: 'completeness', type: 'text', required: true },
  ],
  PERHIASAN: [
    { key: 'jewelryType', type: 'text', required: true },
    {
      key: 'metalType',
      type: 'enum',
      required: true,
      enumValues: ['GOLD', 'SILVER', 'PLATINUM', 'OTHER'],
    },
    { key: 'purity', type: 'text', required: true },
    { key: 'weightGram', type: 'number', required: true, min: 0 },
    { key: 'brand', type: 'text', required: false },
  ],
};

export type SpecValidationError = { field: string; message: string };
export type SpecValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: SpecValidationError[] };

export function isCategory(v: unknown): v is Category {
  return typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);
}

export function validateSpec(
  category: Category,
  input: unknown,
): SpecValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      errors: [{ field: '_root', message: 'spec must be an object' }],
    };
  }
  const obj = input as Record<string, unknown>;
  const defs = SPEC_SCHEMA[category];
  const errors: SpecValidationError[] = [];
  const out: Record<string, unknown> = {};

  for (const def of defs) {
    const raw = obj[def.key];
    if (raw === undefined || raw === null || raw === '') {
      if (def.required) errors.push({ field: def.key, message: 'wajib diisi' });
      continue;
    }
    switch (def.type) {
      case 'text': {
        if (typeof raw !== 'string') {
          errors.push({ field: def.key, message: 'harus teks' });
          break;
        }
        out[def.key] = raw.trim();
        break;
      }
      case 'int': {
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isInteger(n)) {
          errors.push({ field: def.key, message: 'harus integer' });
          break;
        }
        if (def.min !== undefined && n < def.min) {
          errors.push({ field: def.key, message: `minimal ${def.min}` });
          break;
        }
        if (def.max !== undefined && n > def.max) {
          errors.push({ field: def.key, message: `maksimal ${def.max}` });
          break;
        }
        out[def.key] = n;
        break;
      }
      case 'number': {
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(n)) {
          errors.push({ field: def.key, message: 'harus angka' });
          break;
        }
        if (def.min !== undefined && n < def.min) {
          errors.push({ field: def.key, message: `minimal ${def.min}` });
          break;
        }
        out[def.key] = n;
        break;
      }
      case 'date': {
        if (typeof raw !== 'string') {
          errors.push({ field: def.key, message: 'harus tanggal' });
          break;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          errors.push({ field: def.key, message: 'format YYYY-MM-DD' });
          break;
        }
        out[def.key] = raw;
        break;
      }
      case 'enum': {
        if (typeof raw !== 'string' || !def.enumValues?.includes(raw)) {
          errors.push({
            field: def.key,
            message: `pilih salah satu: ${def.enumValues?.join(', ')}`,
          });
          break;
        }
        out[def.key] = raw;
        break;
      }
    }
  }

  return errors.length === 0 ? { ok: true, value: out } : { ok: false, errors };
}