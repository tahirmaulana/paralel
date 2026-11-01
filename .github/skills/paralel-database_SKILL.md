---
name: paralel-database
description: "Membuat skema database PARALEL (Drizzle + Postgres/Neon), migrasi, constraint, dan seed sesuai Lampiran D PARALEL.md. Gunakan saat mengerjakan packages/db."
---

# Tahap 2 — Database

## Baca dulu
- `docs/PARALEL.md` Lampiran D (D0–D9) dan §5 (identifier, aturan `NUL`).
- `docs/TECH_STACK.md` §3 (struktur) dan §6 (pengujian DB).

## Tugas
- Buat skema Drizzle di `packages/db` untuk **semua tabel** di D1–D7, kolom persis seperti di dokumen (nama, tipe, null/not null, default).
- Buat migrasi dan seed: `fee_config` default (250 / 150 / 100 / 1000 bps, `withdraw_fee` 2500000), contoh `partners` (INDOMOTOR, DIGITALSHOP, ACCSSTORE, GOLDJEWELRY, GREENPROPERTY, satu notary).
- Terapkan constraint: tepat 5 foto per auctionID; `NUL` hanya untuk `document_number` bertipe INVOICE dan `serial_number`; unik parsial satu auctionID aktif per `document_number` (kecuali `NUL`); `bid_increment` ∈ daftar USDC dan ≤ 5% starting bid; durasi 12–48 jam; NIK 16 digit; alamat wallet huruf kecil.

## Aturan
- Nominal `BIGINT` (gunakan mode `bigint` di TypeScript). Waktu `timestamptz`. Enum sebagai `text` + CHECK; nilai enum diimpor dari `packages/shared`.
- Jangan mengganti nama kolom, jangan menambah kolom di luar dokumen tanpa bertanya.
- Tidak ada hard delete pada data lelang.

## Definisi selesai
- Migrasi berjalan bersih pada database kosong; seed berjalan.
- Tes constraint lulus (5 foto, `NUL`, unik parsial, CHECK increment/durasi).
