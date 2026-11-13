// @file apps/web/src/components/CreateAuctionWizard.tsx
//
// Multi-step form create auctionID (status CREATED).
// Setelah create sukses → redirect ke /my-auction/[code], di sana user
// klik "Submit to Guarantor" untuk memulai 48 jam window (CREATED → PENDING).
// Ref: PARALEL.md §5, §7, §9.2, D2.1–D2.4, D2.3.1.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CATEGORIES,
  SPEC_SCHEMA,
  isCategory,
  type Category,
  type SpecFieldDef,
} from '@/lib/auction/spec-schema';
import {
  uploadToStorage,
  validateFileLocally,
  type FileSlot,
  type UploadedFile,
} from '@/lib/auction/upload';
import { fmtUSDC, parseUSDC } from '@/lib/web3';

const CONDITION_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
] as const;

const SPEC_LABELS: Record<string, string> = {
  brand: 'Brand',
  model: 'Model',
  year: 'Year',
  color: 'Color',
  mileageKm: 'Mileage (km)',
  propertyType: 'Property Type',
  kelurahan: 'Kelurahan',
  kecamatan: 'Kecamatan',
  kota: 'Kota',
  provinsi: 'Provinsi',
  landAreaM2: 'Land Area (m²)',
  buildingAreaM2: 'Building Area (m²)',
  certificateKind: 'Certificate Type',
  purchaseYear: 'Purchase Year',
  completeness: 'Completeness',
  warrantyUntil: 'Warranty Until (optional)',
  modelEdition: 'Model / Edition',
  jewelryType: 'Jewelry Type',
  metalType: 'Metal Type',
  purity: 'Purity',
  weightGram: 'Weight (g)',
};

const PHOTO_SLOTS: FileSlot[] = [
  'photo1',
  'photo2',
  'photo3',
  'photo4',
  'photo5',
];

type GuarantorOption = {
  id: string;
  name: string;
  city: string | null;
  category: string | null;
  wallet: string;
};

type AuctionPolicy = {
  allowedIncrements: string[];
  maxIncrementBps: number;
  minDurationHours: number;
  maxDurationHours: number;
  minOpenDelay: number;
  maxOpenDelay: number;
  blockTimestamp: string;
};

type SlotState = {
  status: 'empty' | 'uploading' | 'done' | 'error';
  data?: UploadedFile;
  error?: string;
};

type SlotsState = Record<FileSlot, SlotState>;

const EMPTY_SLOTS: SlotsState = {
  photo1: { status: 'empty' },
  photo2: { status: 'empty' },
  photo3: { status: 'empty' },
  photo4: { status: 'empty' },
  photo5: { status: 'empty' },
  doc: { status: 'empty' },
};

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function defaultOpenAtLocal(): string {
  return toDatetimeLocal(new Date(Date.now() + 72 * 3600 * 1000));
}

type WizardData = {
  category: Category | null;
  guarantorId: string | null;
  title: string;
  description: string;
  condition: string;
  conditionNotes: string;
  documentNumber: string;
  chassisNumber: string;
  serialNumber: string;
  spec: Record<string, string>;
  startingBidUsdc: string;
  bidIncrementRaw: string;
  openAtLocal: string;
  durationHours: number;
};

const INITIAL: WizardData = {
  category: null,
  guarantorId: null,
  title: '',
  description: '',
  condition: '',
  conditionNotes: '',
  documentNumber: '',
  chassisNumber: '',
  serialNumber: '',
  spec: {},
  startingBidUsdc: '',
  bidIncrementRaw: '',
  openAtLocal: defaultOpenAtLocal(),
  durationHours: 24,
};

const STEP_LABELS = [
  'Category & Guarantor',
  'Asset Info',
  'Photos & Document',
  'Auction Parameters',
  'Review & Create',
];

export function CreateAuctionWizard(_: { wallet: string }) {
  const router = useRouter();

  const createRequestRef =
    useRef<{
      body: string;
      idempotencyKey: string;
    } | null>(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [slots, setSlots] = useState<SlotsState>(EMPTY_SLOTS);
  const [guarantors, setGuarantors] = useState<GuarantorOption[]>([]);
  const [guarantorsLoading, setGuarantorsLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [policy, setPolicy] = useState<AuctionPolicy | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const policyInitializedRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    fetch('/api/auction/config', { credentials: 'same-origin' })
      .then(async (response) => {
        const value: unknown = await response.json();
        if (!response.ok) {
          throw new Error('Unable to load current auction rules.');
        }
        if (
          typeof value !== 'object' ||
          value === null ||
          Array.isArray(value) ||
          typeof (value as Record<string, unknown>).data !== 'object' ||
          (value as Record<string, unknown>).data === null
        ) {
          throw new Error('Auction rules response is invalid.');
        }
        const data = (value as { data: Record<string, unknown> }).data;
        const numbers = [
          data.maxIncrementBps,
          data.minDurationHours,
          data.maxDurationHours,
          data.minOpenDelay,
          data.maxOpenDelay,
        ];
        if (
          !Array.isArray(data.allowedIncrements) ||
          data.allowedIncrements.length === 0 ||
          data.allowedIncrements.some((item) => typeof item !== 'string' || !/^[1-9]\d*$/.test(item)) ||
          numbers.some((item) => typeof item !== 'number' || !Number.isSafeInteger(item)) ||
          typeof data.blockTimestamp !== 'string' ||
          !/^[1-9]\d*$/.test(data.blockTimestamp)
        ) {
          throw new Error('Auction rules response is invalid.');
        }
        return data as AuctionPolicy;
      })
      .then((loadedPolicy) => {
        if (!cancel) {
          setPolicy(loadedPolicy);
          setPolicyError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setPolicyError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!policy || policyInitializedRef.current) return;
    policyInitializedRef.current = true;
    const minDelay = policy.minOpenDelay;
    const maxDelay = policy.maxOpenDelay;
    const preferredDelay = Math.min(Math.max(72 * 3_600, minDelay), maxDelay);
    const preferredDuration = Math.min(
      Math.max(24, policy.minDurationHours),
      policy.maxDurationHours,
    );
    setData((prev) => ({
      ...prev,
      openAtLocal: toDatetimeLocal(
        new Date((Number(policy.blockTimestamp) + preferredDelay) * 1_000),
      ),
      durationHours: preferredDuration,
    }));
  }, [policy]);

  // ── Fetch guarantors on category change ────────────────────
  useEffect(() => {
    if (!data.category) {
      setGuarantors([]);
      return;
    }
    let cancel = false;
    setGuarantorsLoading(true);
    fetch(`/api/auction/guarantors?category=${encodeURIComponent(data.category)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return;
        setGuarantors(j.data ?? []);
        // Reset guarantorId jika tidak valid lagi
        setData((prev) => {
          const valid =
            prev.guarantorId &&
            (j.data as GuarantorOption[]).some((g) => g.id === prev.guarantorId);
          return valid ? prev : { ...prev, guarantorId: null };
        });
      })
      .catch(() => {
        if (!cancel) setGuarantors([]);
      })
      .finally(() => {
        if (!cancel) setGuarantorsLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [data.category]);

  // ── Reset bid increment kalau startingBid berubah ──────────
  const startingBidRaw = useMemo(() => {
    try {
      return data.startingBidUsdc ? parseUSDC(data.startingBidUsdc) : 0n;
    } catch {
      return 0n;
    }
  }, [data.startingBidUsdc]);

  const incrementOptions = useMemo(() => {
    if (!policy) return [];
    if (startingBidRaw === 0n) {
      return policy.allowedIncrements.map((value) => ({
        raw: BigInt(value),
        disabled: true,
      }));
    }
    return policy.allowedIncrements.map((value) => {
      const raw = BigInt(value);
      return {
      raw,
      disabled:
        raw * 10_000n >
        startingBidRaw * BigInt(policy.maxIncrementBps),
      };
    });
  }, [policy, startingBidRaw]);

  useEffect(() => {
    if (!policy) return;
    if (!data.bidIncrementRaw) return;
    const raw = BigInt(data.bidIncrementRaw);
    const opt = incrementOptions.find((o) => o.raw === raw);
    if (!opt || opt.disabled) {
      setData((prev) => ({ ...prev, bidIncrementRaw: '' }));
    }
  }, [incrementOptions, data.bidIncrementRaw, policy]);

  // ── Validation per step ────────────────────────────────────
  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!data.category) return 'Pilih kategori';
      if (!data.guarantorId) return 'Pilih guarantor';
      return null;
    }
    if (s === 1) {
      if (!data.title.trim()) return 'Title wajib';
      if (!data.description.trim()) return 'Description wajib';
      if (!data.condition) return 'Condition wajib';
      if (data.condition === 'DAMAGED' && !data.conditionNotes.trim()) {
        return 'Condition notes wajib untuk DAMAGED';
      }
      if (!data.documentNumber.trim()) return 'Document number wajib';
      if (data.documentNumber === 'NUL') {
        const docType =
          data.category === 'OTOMOTIF' || data.category === 'PROPERTI'
            ? 'CERTIFICATE'
            : 'INVOICE';
        if (docType !== 'INVOICE') return '"NUL" hanya untuk INVOICE';
      }
      if (data.category === 'OTOMOTIF') {
        if (!data.chassisNumber.trim()) return 'Chassis number wajib';
        if (data.chassisNumber === 'NUL') return 'Chassis number tidak boleh NUL';
      }
      if (
        data.category !== 'OTOMOTIF' &&
        data.category !== 'PROPERTI' &&
        !data.serialNumber.trim()
      ) {
        return 'Serial number wajib untuk kategori ini';
      }
      // Spec per kategori
      const cat = data.category!;
      for (const f of SPEC_SCHEMA[cat]) {
        if (f.required && !data.spec[f.key]?.trim()) {
          return `${SPEC_LABELS[f.key] ?? f.key} wajib`;
        }
      }
      return null;
    }
    if (s === 2) {
      for (const slot of PHOTO_SLOTS) {
        if (slots[slot].status !== 'done') {
          return `Foto ${slot.replace('photo', '')} belum lengkap`;
        }
      }
      if (slots.doc.status !== 'done') return 'Scan dokumen belum lengkap';
      return null;
    }
    if (s === 3) {
      if (policyError) return policyError;
      if (!policy) return 'Loading current auction rules…';
      if (!data.startingBidUsdc.trim()) return 'Starting bid wajib';
      if (startingBidRaw <= 0n) return 'Starting bid harus > 0';
      if (!data.bidIncrementRaw) return 'Bid increment wajib';
      if (!data.openAtLocal) return 'Open time wajib';
      const openMs = new Date(data.openAtLocal).getTime();
      if (!Number.isFinite(openMs)) return 'Open time tidak valid';
      const openSeconds = BigInt(Math.floor(openMs / 1_000));
      const blockTimestamp = BigInt(policy.blockTimestamp);
      if (openSeconds < blockTimestamp + BigInt(policy.minOpenDelay)) {
        return `Open time minimal ${policy.minOpenDelay} detik dari waktu blockchain`;
      }
      if (openSeconds > blockTimestamp + BigInt(policy.maxOpenDelay)) {
        return `Open time maksimal ${policy.maxOpenDelay} detik dari waktu blockchain`;
      }
      if (
        data.durationHours < policy.minDurationHours ||
        data.durationHours > policy.maxDurationHours
      ) {
        return `Duration harus ${policy.minDurationHours}–${policy.maxDurationHours} jam`;
      }
      return null;
    }
    return null;
  }

  function goNext() {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function goPrev() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  // ── Upload handler ────────────────────────────────────────
  async function handleFile(slot: FileSlot, file: File) {
    const localErr = validateFileLocally(file, slot);
    if (localErr) {
      setSlots((prev) => ({
        ...prev,
        [slot]: { status: 'error', error: localErr },
      }));
      return;
    }
    setSlots((prev) => ({ ...prev, [slot]: { status: 'uploading' } }));
    try {
      const uploaded = await uploadToStorage(file, slot);
      setSlots((prev) => ({
        ...prev,
        [slot]: { status: 'done', data: uploaded },
      }));
    } catch (err: any) {
      setSlots((prev) => ({
        ...prev,
        [slot]: { status: 'error', error: err?.message ?? 'Upload gagal' },
      }));
    }
  }

  // ── Submit create ─────────────────────────────────────────
  async function handleCreate() {
    const err = validateStep(3);
    if (err) {
      setStepError(err);
      return;
    }

    setSubmitting(true);
    setStepError(null);

    try {
      const files: Array<{
        slot: FileSlot;
        key: string;
        contentHash: string;
        sizeBytes: number;
        mime: string;
        filename: string;
        extension: string;
        width?: number;
        height?: number;
      }> = [];

      for (const slot of PHOTO_SLOTS) {
        const s = slots[slot];
        if (s.status !== 'done' || !s.data) throw new Error(`Slot ${slot} kosong`);
        const d = s.data;
        files.push({
          slot,
          key: d.key,
          contentHash: d.contentHash,
          sizeBytes: d.sizeBytes,
          mime: d.mime,
          filename: d.filename,
          extension: d.extension,
          width: d.width,
          height: d.height,
        });
      }
      const doc = slots.doc;
      if (doc.status !== 'done' || !doc.data) throw new Error('Dokumen kosong');
      files.push({
        slot: 'doc',
        key: doc.data.key,
        contentHash: doc.data.contentHash,
        sizeBytes: doc.data.sizeBytes,
        mime: doc.data.mime,
        filename: doc.data.filename,
        extension: doc.data.extension,
        width: doc.data.width,
        height: doc.data.height,
      });

      const specOut: Record<string, unknown> = {};
      for (const f of SPEC_SCHEMA[data.category!]) {
        const v = data.spec[f.key];
        if (v && v.trim()) specOut[f.key] = v.trim();
      }

      const openMs = new Date(data.openAtLocal).getTime();

      const body = {        category: data.category,
        guarantorId: data.guarantorId,
        title: data.title.trim(),
        description: data.description.trim(),
        condition: data.condition,
        conditionNotes:
          data.condition === 'DAMAGED' ? data.conditionNotes.trim() : null,
        documentNumber: data.documentNumber.trim(),
        chassisNumber:
          data.category === 'OTOMOTIF' ? data.chassisNumber.trim() : null,
        serialNumber:
          data.category !== 'OTOMOTIF' && data.category !== 'PROPERTI'
            ? data.serialNumber.trim()
            : null,
        spec: specOut,
        startingBid: startingBidRaw.toString(),
        bidIncrement: data.bidIncrementRaw,
        openAt: new Date(openMs).toISOString(),
        durationHours: data.durationHours,
        files,
      };

      const serializedBody =
        JSON.stringify(body);

      const previousRequest =
        createRequestRef.current;

      const idempotencyKey =
        previousRequest?.body ===
        serializedBody
          ? previousRequest
              .idempotencyKey
          : crypto.randomUUID();

      createRequestRef.current = {
        body:
          serializedBody,
        idempotencyKey,
      };

      const res =
        await fetch(
          '/api/auction',
          {
            method: 'POST',
            credentials:
              'same-origin',
            headers: {
              'Content-Type':
                'application/json',
              'Idempotency-Key':
                idempotencyKey,
            },
            body:
              serializedBody,
          },
        );

      const json:
        | {
            data?: {
              auctionId:
                string;
              auctionCode:
                string;
              status:
                'CREATED';
              currentRound:
                1;
            };
            error?: {
              message?:
                string;
            };
          }
        | null =
          await res
            .json()
            .catch(
              () => null,
            );

      if (
        !res.ok ||
        !json?.data
      ) {
        throw new Error(
          json?.error
            ?.message ??
          `Create failed (${res.status})`,
        );
      }

      createRequestRef.current =
        null;

      router.push(
        `/my-auction/${encodeURIComponent(
          json.data
            .auctionCode,
        )}`,
      );
    } catch (err: any) {
      setStepError(err?.message ?? 'Create gagal');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Create Auction</h1>
      <p className="text-sm text-gray-500 mb-6">
        Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step
                  ? 'bg-green-500 text-white'
                  : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 ${
                  i < step ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-6">
        {step === 0 && (
          <Step1
            data={data}
            guarantors={guarantors}
            guarantorsLoading={guarantorsLoading}
            onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {step === 1 && (
          <Step2
            data={data}
            onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {step === 2 && (
          <Step3
            slots={slots}
            onFile={handleFile}
            onClear={(slot) =>
              setSlots((prev) => ({ ...prev, [slot]: { status: 'empty' } }))
            }
          />
        )}

        {step === 3 && (
          <Step4
            data={data}
            startingBidRaw={startingBidRaw}
            incrementOptions={incrementOptions}
            policy={policy}
            onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {step === 4 && (
          <Step5
            data={data}
            slots={slots}
            guarantors={guarantors}
            startingBidRaw={startingBidRaw}
          />
        )}

        {stepError && (
          <div className="mt-4 bg-red-50 border border-red-300 text-red-800 text-sm p-3 rounded">
            {stepError}
          </div>
        )}
        {step === 3 && policyError && (
          <div className="mt-4 bg-red-50 border border-red-300 text-red-800 text-sm p-3 rounded">
            {policyError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button
            onClick={goPrev}
            disabled={step === 0 || submitting}
            className="px-4 py-2 border rounded text-sm disabled:opacity-50"
          >
            ← Back
          </button>

          {step < STEP_LABELS.length - 1 ? (
            <button
              onClick={goNext}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {submitting ? 'Creating…' : 'Create Auction'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step components ────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border rounded px-3 py-2 text-sm text-black ${props.className ?? ''}`}
    />
  );
}

function Step1({
  data,
  guarantors,
  guarantorsLoading,
  onChange,
}: {
  data: WizardData;
  guarantors: GuarantorOption[];
  guarantorsLoading: boolean;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div>
      <Field label="Category" hint="Menentukan field spesifikasi dan jenis dokumen">
        <select
          value={data.category ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              category: isCategory(v) ? v : null,
              guarantorId: null,
              spec: {},
            });
          }}
          className="w-full border rounded px-3 py-2 text-sm text-black"
        >
          <option value="">— Pilih kategori —</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Guarantor"
        hint="Barang fisik akan diserahkan ke guarantor ini"
      >
        <select
          value={data.guarantorId ?? ''}
          onChange={(e) => onChange({ guarantorId: e.target.value || null })}
          disabled={!data.category || guarantorsLoading}
          className="w-full border rounded px-3 py-2 text-sm text-black disabled:bg-gray-100"
        >
          <option value="">
            {!data.category
              ? '— Pilih kategori dulu —'
              : guarantorsLoading
                ? 'Memuat…'
                : guarantors.length === 0
                  ? '— Tidak ada guarantor aktif —'
                  : '— Pilih guarantor —'}
          </option>
          {guarantors.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
              {g.city ? ` · ${g.city}` : ''}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Step2({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  if (!data.category) {
    return <p className="text-sm text-red-600">Pilih kategori dulu di step 1.</p>;
  }
  const cat = data.category;
  const fields = SPEC_SCHEMA[cat];
  const isAuto = cat === 'OTOMOTIF' || cat === 'PROPERTI';
  const docType = isAuto ? 'CERTIFICATE' : 'INVOICE';

  return (
    <div>
      <Field label="Title">
        <Input
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Judul listing"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full border rounded px-3 py-2 text-sm text-black"
        />
      </Field>

      <Field label="Condition">
        <select
          value={data.condition}
          onChange={(e) => onChange({ condition: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm text-black"
        >
          <option value="">— Pilih kondisi —</option>
          {CONDITION_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      {data.condition === 'DAMAGED' && (
        <Field label="Condition Notes" hint="Wajib — jelaskan kerusakan">
          <textarea
            value={data.conditionNotes}
            onChange={(e) => onChange({ conditionNotes: e.target.value })}
            rows={2}
            className="w-full border rounded px-3 py-2 text-sm text-black"
          />
        </Field>
      )}

      <div className="border-t pt-3 mt-3">
        <p className="text-xs text-gray-500 mb-2">
          Document type: <span className="font-mono">{docType}</span>{' '}
          (auto dari kategori)
        </p>

        <Field
          label={
            docType === 'CERTIFICATE'
              ? 'Certificate Number'
              : 'Invoice Number'
          }
          hint={
            docType === 'INVOICE'
              ? 'Isi "NUL" jika tidak ada nota'
              : 'Tidak boleh NUL'
          }
        >
          <Input
            value={data.documentNumber}
            onChange={(e) => onChange({ documentNumber: e.target.value })}
            placeholder={docType === 'INVOICE' ? 'No. nota atau NUL' : 'No. sertifikat'}
          />
        </Field>

        {cat === 'OTOMOTIF' && (
          <Field label="Chassis Number" hint="Nomor rangka — tidak boleh NUL">
            <Input
              value={data.chassisNumber}
              onChange={(e) => onChange({ chassisNumber: e.target.value })}
            />
          </Field>
        )}

        {cat !== 'OTOMOTIF' && cat !== 'PROPERTI' && (
          <Field label="Serial Number" hint='Isi "NUL" jika tidak ada'>
            <Input
              value={data.serialNumber}
              onChange={(e) => onChange({ serialNumber: e.target.value })}
            />
          </Field>
        )}
      </div>

      <div className="border-t pt-3 mt-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">Spesifikasi</p>
        {fields.map((f) => (
          <SpecField
            key={f.key}
            def={f}
            value={data.spec[f.key] ?? ''}
            onChange={(v) =>
              onChange({ spec: { ...data.spec, [f.key]: v } })
            }
          />
        ))}
      </div>
    </div>
  );
}

function SpecField({
  def,
  value,
  onChange,
}: {
  def: SpecFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = SPEC_LABELS[def.key] ?? def.key;
  const required = def.required ? ' *' : '';

  if (def.type === 'enum') {
    return (
      <Field label={label + required}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm text-black"
        >
          <option value="">— Pilih —</option>
          {def.enumValues?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (def.type === 'date') {
    return (
      <Field label={label + required}>
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  if (def.type === 'int' || def.type === 'number') {
    return (
      <Field label={label + required}>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={def.min}
          max={def.max}
          step={def.type === 'number' ? 'any' : 1}
        />
      </Field>
    );
  }

  return (
    <Field label={label + required}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Step3({
  slots,
  onFile,
  onClear,
}: {
  slots: SlotsState;
  onFile: (slot: FileSlot, file: File) => void;
  onClear: (slot: FileSlot) => void;
}) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Upload <strong>tepat 5 foto</strong> (sisi berbeda) dan{' '}
        <strong>1 scan dokumen</strong>. Foto maksimal 5 MB, dokumen maksimal 10 MB.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {PHOTO_SLOTS.map((slot) => (
          <FileSlotCard
            key={slot}
            slot={slot}
            label={`Foto ${slot.replace('photo', '')}`}
            accept="image/jpeg,image/png,image/webp"
            state={slots[slot]}
            onFile={onFile}
            onClear={onClear}
          />
        ))}
      </div>

      <div className="mt-4">
        <FileSlotCard
          slot="doc"
          label="Scan Dokumen"
          accept="application/pdf,image/jpeg,image/png"
          state={slots.doc}
          onFile={onFile}
          onClear={onClear}
        />
      </div>
    </div>
  );
}

function FileSlotCard({
  slot,
  label,
  accept,
  state,
  onFile,
  onClear,
}: {
  slot: FileSlot;
  label: string;
  accept: string;
  state: SlotState;
  onFile: (slot: FileSlot, file: File) => void;
  onClear: (slot: FileSlot) => void;
}) {
  return (
    <div
      className={`border rounded-lg p-3 ${
        state.status === 'done'
          ? 'border-green-400 bg-green-50'
          : state.status === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300'
      }`}
    >
      <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>

      {state.status === 'done' && state.data && (
        <div className="flex items-start gap-2">
          {state.data.previewUrl && (
            <img
              src={state.data.previewUrl}
              alt={label}
              className="w-16 h-16 object-cover rounded border"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate">
              {state.data.filename}.{state.data.extension}
            </p>
            <p className="text-xs text-gray-500">
              {(state.data.sizeBytes / 1024).toFixed(0)} KB
            </p>
            <button
              onClick={() => onClear(slot)}
              className="text-xs text-red-600 underline mt-1"
            >
              Ganti
            </button>
          </div>
        </div>
      )}

      {state.status === 'uploading' && (
        <p className="text-xs text-blue-600">Uploading…</p>
      )}

      {state.status === 'error' && (
        <div>
          <p className="text-xs text-red-700">{state.error}</p>
          <label className="inline-block mt-2 text-xs text-blue-600 underline cursor-pointer">
            Coba lagi
            <input
              type="file"
              accept={accept}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(slot, f);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      )}

      {state.status === 'empty' && (
        <label className="inline-block w-full py-2 border border-dashed rounded text-xs text-center text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600">
          Pilih file
          <input
            type="file"
            accept={accept}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(slot, f);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

function Step4({
  data,
  startingBidRaw,
  incrementOptions,
  policy,
  onChange,
}: {
  data: WizardData;
  startingBidRaw: bigint;
  incrementOptions: { raw: bigint; disabled: boolean }[];
  policy: AuctionPolicy | null;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  if (!policy) {
    return <p className="text-sm text-gray-600">Loading current auction rules…</p>;
  }
  const minOpen = new Date(
    (Number(policy.blockTimestamp) + policy.minOpenDelay) * 1_000,
  );
  const maxOpen = new Date(
    (Number(policy.blockTimestamp) + policy.maxOpenDelay) * 1_000,
  );
  const minLocal = toDatetimeLocal(minOpen);
  const maxLocal = toDatetimeLocal(maxOpen);

  return (
    <div>
      <Field label="Starting Bid (USDC)" hint="Nilai pembukaan lelang">
        <Input
          value={data.startingBidUsdc}
          onChange={(e) => onChange({ startingBidUsdc: e.target.value })}
          placeholder="Contoh: 1000"
          inputMode="decimal"
        />
        {startingBidRaw > 0n && (
          <p className="text-xs text-gray-500 mt-1">
            = {fmtUSDC(startingBidRaw)} USDC
          </p>
        )}
      </Field>

      <Field
        label="Bid Increment"
        hint={`Maksimal ${policy.maxIncrementBps / 100}% dari starting bid`}
      >
        <select
          value={data.bidIncrementRaw}
          onChange={(e) => onChange({ bidIncrementRaw: e.target.value })}
          disabled={startingBidRaw === 0n}
          className="w-full border rounded px-3 py-2 text-sm text-black disabled:bg-gray-100"
        >
          <option value="">
            {startingBidRaw === 0n ? '— Isi starting bid dulu —' : '— Pilih —'}
          </option>
          {incrementOptions.map((o) => (
            <option key={o.raw.toString()} value={o.raw.toString()} disabled={o.disabled}>
              {fmtUSDC(o.raw)} USDC
              {o.disabled ? ' (melebihi batas konfigurasi)' : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Open Time"
        hint={`Harus antara ${minLocal.replace('T', ' ')} dan ${maxLocal.replace('T', ' ')}`}
      >
        <Input
          type="datetime-local"
          value={data.openAtLocal}
          onChange={(e) => onChange({ openAtLocal: e.target.value })}
          min={minLocal}
          max={maxLocal}
        />
      </Field>

      <Field label="Duration (jam)">
        <Input
          type="number"
          min={policy.minDurationHours}
          max={policy.maxDurationHours}
          step={1}
          value={data.durationHours}
          onChange={(e) =>
            onChange({ durationHours: Number(e.target.value) })
          }
        />
      </Field>
    </div>
  );
}

function Step5({
  data,
  slots,
  guarantors,
  startingBidRaw,
}: {
  data: WizardData;
  slots: SlotsState;
  guarantors: GuarantorOption[];
  startingBidRaw: bigint;
}) {
  const guarantor = guarantors.find((g) => g.id === data.guarantorId);
  const openDate = data.openAtLocal ? new Date(data.openAtLocal) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Review. Setelah klik <strong>Create Auction</strong>, status akan{' '}
        <code className="bg-gray-100 px-1 rounded">CREATED</code>. Anda harus
        klik <strong>Submit to Guarantor</strong> di halaman detail untuk
        memulai window custody 48 jam.
      </p>

      <Section title="Category & Guarantor">
        <Row label="Category" value={data.category ?? '—'} />
        <Row label="Guarantor" value={guarantor ? `${guarantor.name}${guarantor.city ? ` · ${guarantor.city}` : ''}` : '—'} />
      </Section>

      <Section title="Asset">
        <Row label="Title" value={data.title} />
        <Row label="Description" value={data.description} />
        <Row label="Condition" value={data.condition} />
        {data.condition === 'DAMAGED' && (
          <Row label="Condition Notes" value={data.conditionNotes} />
        )}
        <Row label="Document Number" value={data.documentNumber} />
        {data.chassisNumber && (
          <Row label="Chassis Number" value={data.chassisNumber} />
        )}
        {data.serialNumber && (
          <Row label="Serial Number" value={data.serialNumber} />
        )}
        {Object.entries(data.spec)
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <Row key={k} label={SPEC_LABELS[k] ?? k} value={v} />
          ))}
      </Section>

      <Section title="Files">
        {PHOTO_SLOTS.map((slot, i) => {
          const s = slots[slot];
          return (
            <Row
              key={slot}
              label={`Foto ${i + 1}`}
              value={
                s.status === 'done' && s.data
                  ? `${s.data.filename}.${s.data.extension}`
                  : '—'
              }
            />
          );
        })}
        <Row
          label="Dokumen"
          value={
            slots.doc.status === 'done' && slots.doc.data
              ? `${slots.doc.data.filename}.${slots.doc.data.extension}`
              : '—'
          }
        />
      </Section>

      <Section title="Auction Parameters">
        <Row label="Starting Bid" value={`${fmtUSDC(startingBidRaw)} USDC`} />
        <Row
          label="Bid Increment"
          value={`${fmtUSDC(BigInt(data.bidIncrementRaw || '0'))} USDC`}
        />
        <Row
          label="Open Time"
          value={openDate ? openDate.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—'}
        />
        <Row label="Duration" value={`${data.durationHours} jam`} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 border rounded p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="col-span-2 break-words">{value || '—'}</span>
    </div>
  );
}