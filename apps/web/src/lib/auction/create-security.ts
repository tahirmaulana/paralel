// @file apps/web/src/lib/auction/create-security.ts
//
// Pure security decisions for POST /api/auction.
// No database, RPC, object-storage, or environment access.

export function isActiveDocumentConflict(
  error: unknown,
): boolean {
  if (
    typeof error !== 'object' ||
    error === null
  ) {
    return false;
  }

  const candidate =
    error as Readonly<{
      code?: unknown;
      constraint_name?: unknown;
      constraint?: unknown;
    }>;

  const constraint =
    candidate.constraint_name ??
    candidate.constraint;

  return (
    candidate.code === '23505' &&
    constraint ===
      'uq_active_document_number'
  );
}

export function matchesStoredObjectMetadata(
  actual:
    Readonly<Record<string, string>>,
  expected:
    Readonly<Record<string, string>>,
): boolean {
  const expectedEntries =
    Object.entries(expected);

  if (
    expectedEntries.length === 0
  ) {
    return false;
  }

  return expectedEntries.every(
    ([key, value]) =>
      actual[key] === value,
  );
}

export function isCanonicalGuarantorRegistryState(
  state:
    Readonly<{
      pType: number;
      category: number;
      active: boolean;
    }>,
  expected:
    Readonly<{
      pType: number;
      category: number;
    }>,
): boolean {
  return (
    state.pType ===
      expected.pType &&
    state.category ===
      expected.category &&
    state.active === true
  );
}
