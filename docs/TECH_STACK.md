# PARALEL — Tech Stack dan Struktur Proyek

Dokumen pendamping `PARALEL.md`. PARALEL.md menjelaskan **apa** dan **kenapa**; dokumen ini menjelaskan **dengan apa** dan **di mana**. Bila ada pertentangan soal perilaku sistem, PARALEL.md yang menang. Penjelasan dalam bahasa Indonesia; nama kode, file, dan variabel dalam bahasa Inggris.

## 1. Prinsip

- Semua komponen inti harus bisa dijalankan **gratis untuk pilot di testnet** (free tier). Batas free tier dicek ulang sebelum dipakai karena bisa berubah.
- Nama backend (kolom, field kontrak, kode status) tetap dan berbahasa Inggris. Label UI mengikuti bahasa (EN default, ID terjemahan).
- Bahasa pemrograman: **Solidity** untuk kontrak, **TypeScript** untuk semua yang lain.
- Versi paket tidak dikunci di dokumen ini; pakai versi stabil terbaru saat inisialisasi, lalu kunci lewat lockfile.

## 2. Stack yang Disepakati

| Lapisan | Pilihan | Keterangan |
|---|---|---|
| Smart contract | Solidity + **Foundry** | Tes ditulis dalam Solidity; memakai `warp` (memajukan waktu), `prank` (meniru pengirim), dan fuzz test. |
| Jaringan | **Arbitrum** (pilot: Arbitrum Sepolia) | USDC testnet dan gas testnet lewat faucet. |
| Web + backend | **Next.js** (TypeScript, App Router) | UI bidder/consignor dan UI custody; API route untuk tanda tangan, relay, dan data. |
| Wallet | **wagmi + viem** | Koneksi wallet, transaksi bid, tanda tangan EIP-712. |
| Database | **PostgreSQL di Neon** + **Drizzle ORM** | Skema mengikuti Lampiran D di PARALEL.md. |
| Keeper dan indexer | **Cloudflare Workers** (cron trigger) | Keeper = aksi trigger; indexer = membaca event kontrak ke DB. |
| Bot Telegram | Webhook (Cloudflare Worker) | Bot biasa tanpa AI; hanya feed, notifikasi, dan tombol deep link. |
| i18n | **next-intl** | `en` default, `id` terjemahan. |
| Hosting web | **Cloudflare Pages** | Gratis; dipilih karena Vercel hobby dibatasi untuk non-komersial. |
| RPC Arbitrum | Free tier penyedia RPC (mis. Alchemy/Infura) | Endpoint publik dibatasi lajunya; indexer butuh RPC yang stabil. |

Catatan: AI untuk ekstraksi KTP dikerjakan oleh tim secara terpisah dan tidak termasuk dokumen ini.

### Komponen pendukung (belum diputuskan)
Dibutuhkan sebelum alur lengkap bisa berjalan, dengan opsi gratis sebagai usulan:
- **Penyimpanan file** (5 foto per auctionID dan scan dokumen): Cloudflare R2 atau Supabase Storage.
- **Email** (confirmationCode ke consignor): Resend atau penyedia lain dengan free tier.
- **Posting X**: kemungkinan berbayar; boleh ditunda di pilot.

## 3. Struktur Repositori (monorepo)

```
paralel/
├── docs/
│   ├── PARALEL.md            # spesifikasi desain (sumber kebenaran perilaku)
│   ├── TECH_STACK.md         # dokumen ini
│   └── CONTRACT_SPEC.md      # fungsi kontrak dan skenario uji
├── contracts/                # Foundry
│   ├── src/                  # kontrak utama
│   ├── test/                 # tes Foundry
│   ├── script/               # skrip deploy
│   └── foundry.toml
├── packages/
│   ├── db/                   # Drizzle: schema, migrasi, seed
│   └── shared/               # tipe, enum, konstanta bersama (status, kategori, increment)
├── apps/
│   └── web/                  # Next.js
│       ├── app/[locale]/     # halaman bidder/consignor dan custody
│       ├── app/api/          # tanda tangan, relay, data
│       │   ├── notary/
│       │   │   ├── approve/route.ts        # verify EIP-712 + persist (idempoten)
│       │   │   ├── approve/init/route.ts   # derive code + codeHash, return tanpa code
│       │   │   └── data/route.ts           # GET pending/collections/run/passed
│       │   └── guarantor/
│       │       ├── data/route.ts           # GET pending/collection/withdrawal/run/history
│       │       ├── approve/route.ts        # off-chain attestation GUARANTOR_APPROVED
│       │       ├── reject/route.ts         # off-chain attestation GUARANTOR_REJECTED
│       │       ├── collected/route.ts      # relay collected() on-chain
│       │       └── withdrawn/route.ts      # relay markWithdrawn() on-chain
│       ├── app/print/receipt/
│       │   └── [type]/[auctionId]/page.tsx # printable receipt form (generik)
│       ├── components/
│       ├── lib/              # wagmi/viem, format angka, validasi
│       └── messages/         # en.json, id.json (kunci i18n)
├── workers/
│   ├── keeper/               # aksi trigger (cron)
│   ├── indexer/              # event kontrak → DB (cron)
│   └── telegram-bot/         # webhook bot
└── .github/
    └── skills/               # satu folder skill per tahap
```

`packages/shared` memuat satu-satunya definisi enum dan konstanta (status, kategori, bid increment USDC, Withdrawal Fee, jumlah peringkat) supaya kontrak, DB, dan UI tidak berbeda nilai.

## 4. Environment dan Rahasia

Nama variabel (nilai tidak pernah dimasukkan ke repo; simpan sebagai secret di Cloudflare/`.env` lokal):

| Variabel | Dipakai oleh | Isi |
|---|---|---|
| `DATABASE_URL` | web, workers | Koneksi Neon |
| `ARBITRUM_RPC_URL` | web, workers | RPC Arbitrum (Sepolia untuk pilot) |
| `CHAIN_ID` | semua | Chain yang dipakai |
| `AUCTION_CONTRACT_ADDRESS` | semua | Alamat kontrak hasil deploy |
| `USDC_ADDRESS` | semua | Alamat USDC di chain terkait |
| `RELAYER_PRIVATE_KEY` | web (API relay), keeper | Kunci wallet relayer/trigger. Wallet ini hanya berisi ETH untuk gas dan tidak berkuasa atas dana user |
| `TELEGRAM_BOT_TOKEN` | telegram-bot | Token bot |
| `TELEGRAM_WEBHOOK_SECRET` | telegram-bot | Verifikasi permintaan webhook |
| `STORAGE_*` | web | Kredensial penyimpanan file |
| `EMAIL_API_KEY` | web | Pengiriman confirmationCode |

## 5. Pembagian Tugas Komponen

| Komponen | Tugas | Catatan dari PARALEL.md |
|---|---|---|
| Kontrak | Satu kontrak untuk semua auctionID; bid, peringkat 10, AWARDING, withdraw (pull), distribusi | §8–§15, Lampiran D10 |
| Web | UI, pembuatan auctionID, tampilan bid, tombol aksi | Gas bid ditampilkan di bawah tombol; Withdrawal Fee 2.5 USDC ditampilkan pada withdraw (§14, §17) |
| API relay (di web) | Menerima pesan bertanda tangan (Confirm, signing AWARDING, withdraw, atestasi), lalu mengirim transaksi lewat relayer | Gas ditanggung platform |
| Keeper | Memanggil trigger: mulai AWARDING, maju kandidat berikutnya, COLLECTION → CLAIM_PERIOD | Kontrak menolak panggilan sebelum syarat waktu terpenuhi |
| Indexer | Membaca event kontrak → `chain_events` → tabel turunan (`bids`, `bidder_stakes`, `payouts`, `withdrawals`) | Kontrak = sumber kebenaran; DB = cermin (§2, D7). Tangani reorg block |
| Bot Telegram | Feed, notifikasi (termasuk permintaan signing), tombol deep link | Tidak memegang key (§18) |
| **Notary dashboard** | Server Component (auth gate + initial data via `page.tsx`) + Client Component (refetch via `/api/notary/data` setelah action) | Auth gate: `partners.type='NOTARY'`. Tab Submission global queue; Run global view; Collections & PASSED per-notary via `attestations`. |
| **Notary approve API** | Dua fase: `/init` (derive code + codeHash) → `/approve` (verify EIP-712 + persist). Email code ke consignor | Formula D11.3 PARALEL.md. `code` tidak pernah transit frontend. |
| **E-Certificate generator** | Backend, trigger dari event `AwardSigned` ter-index. Validasi: `NOTARY_APPROVED` + winner valid | **Belum diimplementasi.** Tombol UI inactive sampai endpoint tersedia. |
| **Guarantor dashboard** | Server Component (auth gate + initial data via `page.tsx`) + Client Component (refetch via `/api/guarantor/data` setelah action) | Auth gate: `partners.type='GUARANTOR'`. Semua tab filter `guarantor_id = this` (pre-assigned, bukan shared queue). |
| **Guarantor action API** | 4 endpoint: approve, reject, collected, withdrawn. Approve/reject off-chain (EIP-712 diverifikasi backend). Collected/withdrawn relay on-chain. | Signature types: `GuarantorApproval`, `GuarantorRejection` (off-chain), `Collected`, `Withdrawn` (on-chain). |
| **Receipt generator** | `/print/receipt/[type]/[auctionId]` — printable HTML form (consignment, collection, withdrawal) | Server-render. Tidak perlu signature. Browser `window.print()`. |

### Catatan penting untuk keeper
Cloudflare Workers cron berjalan paling cepat tiap menit. Itu cukup: batas 5 menit signing ditegakkan oleh **kontrak** (block timestamp), bukan oleh keeper. Keeper yang terlambat hanya menunda pencatatan "maju ke kandidat berikutnya", tidak mengubah batas waktunya. Namun relayer harus segera meneruskan tanda tangan signing AWARDING dari bidder (§21 butir 4).

## 6. Pengujian

- **Kontrak (Foundry):** tes unit per fungsi, tes alur lengkap, dan fuzz test untuk peringkat 10 (tie-break `seq`) dan perhitungan commission/tax/default fee. Wajib mencakup: DEFAULTED, PASSED_IN, re-use, WITHDRAWN, Withdrawal Fee yang dibatasi saat jumlah ≤ 2.5 USDC, dan penolakan trigger sebelum waktunya.
- **Simulasi lengkap di Arbitrum Sepolia** dengan 8 wallet: 4 penerima (platform, notary, guarantor, tax), 3 user (1 consignor, 2 bidder), 1 relayer/trigger.
- **DB:** tes migrasi dan constraint (mis. 5 foto per auctionID, `NUL` hanya untuk INVOICE dan serial number, unik parsial `document_number`).

## 7. Catatan Risiko Teknis

- **Next.js di Cloudflare Pages** membutuhkan adapter (mis. OpenNext untuk Cloudflare atau `@cloudflare/next-on-pages`) dan tidak semua fitur Next.js didukung. Bila bermasalah, alternatifnya menjalankan web di hosting lain yang gratis, tanpa mengubah komponen lain.
- **Neon free tier** dapat "tidur" saat sepi sehingga permintaan pertama lambat; bisa memengaruhi indexer dan keeper. Pakai driver serverless Neon dan tangani retry.
- **Batas request RPC dan Workers** perlu dipantau; indexer sebaiknya membaca event per batch block, bukan per block.
- **Endpoint `/api/notary/data` tanpa auth gate.** Data notary (nama bisnis, daftar auction) dapat diakses siapa saja yang tahu wallet notary. Diterima karena prinsip transparansi lelang; field PDP (email, KYC) tidak diekspos endpoint ini.
- **ConfirmationCode derivable dari DB.** Formula D11.3 (PARALEL.md) menggunakan input yang semuanya publik (`created_at`, wallet, nonce on-chain). Siapa pun dengan akses baca DB + RPC bisa derive kode untuk auctionID PENDING mana pun. Diterima karena kode bukan gate security — gate sebenarnya adalah signature consignor pada `ConsignorConfirm`.
- **Race condition shared queue.** Dijaga oleh partial unique index di `attestations` (`(auction_id, type) WHERE type IN ('GUARANTOR_APPROVED','NOTARY_APPROVED')`). Insert kedua oleh notary lain → unique violation → API return 409. Tidak ada race window di level aplikasi.
- **Guarantor off-chain signature non-enforceable.** `GuarantorApproval` dan `GuarantorRejection` adalah EIP-712 off-chain — sistem tidak bisa membuktikan bahwa guarantor benar-benar memeriksa fisik barang. Ini konsisten dengan prinsip RWA: guarantor bertanggung jawab operasional atas kebenaran keputusannya. Kontrak tidak menyimpan signature ini; hanya attestation di DB yang diverifikasi backend.
- **Receipt ownership asymmetric.** `collectionReceipt` dipegang **guarantor** (bukti serah terima ke winner), sedangkan `consignmentReceipt` dan `withdrawalReceipt` dipegang **consignor**. Sistem hanya mencetak form; tidak ada enforcement bahwa form fisik benar-benar ditandatangani winner/consignor sebelum guarantor memanggil `collected`/`markWithdrawn` on-chain. Tanggung jawab operasional guarantor.
- **Auto-CANCELED 48 jam belum diimplementasi.** Backend harus men-set `auctions.status = 'CANCELED'` untuk auction `PENDING` yang melewati `pending_deadline` tanpa CONSIGNMENT/Confirm. Saat ini belum ada keeper/cron untuk ini — akan jadi pekerjaan sesi terpisah. Tanpa implementasi, auction akan stuck di `PENDING` selamanya setelah 48 jam.