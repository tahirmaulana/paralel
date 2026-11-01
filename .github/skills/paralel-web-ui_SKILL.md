---
name: paralel-web-ui
description: "Membangun UI web PARALEL (Next.js + wagmi/viem + next-intl): UI bidder/consignor dan UI custody, bahasa EN default dengan terjemahan ID. Gunakan saat mengerjakan apps/web (halaman dan komponen)."
---

# Tahap 5 — Web UI

## Baca dulu
- `docs/PARALEL.md` §5 (form per kategori, aturan `NUL`), §8, §9, §14, §17, Lampiran D2.3.1 (label UI per field) dan kolom Label UI di tiap tabel.

## Tugas
- Dua antarmuka: (1) bidder + consignor, (2) custody (notary dan guarantor).
- i18n dengan next-intl: **EN default**, ID terjemahan; semua teks lewat kunci di `messages/en.json` dan `messages/id.json`. Label diambil dari kolom Label UI (EN/ID) di Lampiran D. Istilah lelang baku tidak diterjemahkan.
- Form pembuatan auctionID per kategori dengan petunjuk pengisian (mis. "isi NUL jika tidak ada nota"); field `serial_number` tidak tampil untuk otomotif dan properti; nomor rangka khusus otomotif.
- Halaman lelang: Starting Bid, Current Bid, My Bid (hanya milik sendiri), peringkat, timer; tombol bid dengan **keterangan gas fee di bawah tombol**.
- Withdraw: tampilkan **Withdrawal Fee 2.5 USDC** dan **Amount Received** (dari `refundableOf`). Jangan memakai label "gas".
- AWARDING: hitung mundur signing 05:00 dan tombol tanda tangan (EIP-712).
- Format angka internasional (5,000 USDC; 0.5 USDC) di kedua bahasa.

## Aturan
- Jangan menaruh teks UI langsung di komponen. Nominal diproses sebagai `bigint`, baru diformat untuk tampilan.
- Wallet hanya lewat wagmi/viem; UI tidak pernah meminta private key.

## Definisi selesai
- Alur lengkap bisa dijalankan di testnet: buat auctionID → Confirm → bid → AWARDING → withdraw.
- Tombol EN/ID mengganti seluruh teks tanpa perubahan kode.
