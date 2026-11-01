---
name: paralel-backend-relay
description: "Membangun backend/API Next.js PARALEL: alur auctionID off-chain, atestasi partner, confirmationCode, dan relay tanda tangan ke kontrak. Gunakan saat mengerjakan apps/web/app/api."
---

# Tahap 4 — Backend dan Relay

## Baca dulu
- `docs/PARALEL.md` §4, §5, §6, §7, §9 (tabel transisi), §10–§14, §15, Lampiran D2, D3, D5.
- `docs/CONTRACT_SPEC.md` §3 (pesan bertanda tangan dan fungsi yang dipanggil relayer).

## Tugas
- API untuk tahap off-chain: CREATED → PENDING (48 jam), atestasi guarantor (APPROVED/REJECTED) dan notary, penerbitan confirmationCode (simpan hash, kirim ke email), status REJECTED/CANCELED. Catat setiap transisi di `status_log`.
- Validasi masukan sesuai PARALEL.md §5–§7 (identifier, `NUL`, 5 foto, increment, durasi, jam OPEN 48–168 jam).
- Relay ke kontrak lewat relayer: Confirm (`registerAuction`), signing AWARDING (**prioritas kecepatan**, batas 5 menit), withdraw (`withdrawRefund`, `withdrawConsignor`), re-use, WITHDRAWN, `collected`.
- Selalu **verifikasi tanda tangan di server** sebelum relay; tolak bila penanda tangan, nonce, atau expiry tidak valid.
- Kirim notifikasi (termasuk permintaan signing) lewat tabel `notifications`.

## Aturan
- Jangan pernah menyimpan atau meminta private key user. Relayer key hanya dari secret.
- Data bid/stake/peringkat dibaca dari DB cermin; jangan ditulis dari klien.
- Gunakan `bigint` untuk semua nominal.

## Definisi selesai
- Semua transisi §9.1 yang off-chain bekerja dan tercatat di `status_log`.
- Tes integrasi: Confirm → SCHEDULED di kontrak; signing yang kedaluwarsa atau ganda ditolak.
