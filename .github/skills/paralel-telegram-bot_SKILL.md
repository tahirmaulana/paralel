---
name: paralel-telegram-bot
description: "Membangun bot Telegram PARALEL (webhook Cloudflare Worker) untuk feed, notifikasi, dan tombol deep link. Gunakan saat mengerjakan workers/telegram-bot."
---

# Tahap 6 — Bot Telegram

## Baca dulu
- `docs/PARALEL.md` §17, §18, Lampiran D6 (`notifications`, `feed_posts`) dan `users.preferred_language`.

## Tugas
- Webhook Worker: tautkan akun (`telegram_chat_id`), kirim feed, kirim notifikasi dari tabel `notifications`.
- Update `currentBid` terbaru **hanya** ke bidder pada auctionID terkait.
- Notifikasi permintaan signing AWARDING dikirim segera (batas 5 menit).
- Tombol aksi **membuka deep link** ke web app/wallet untuk menandatangani.

## Aturan
- Bot biasa tanpa AI. Bot tidak memegang key dan tidak menandatangani apa pun.
- Verifikasi `TELEGRAM_WEBHOOK_SECRET` pada setiap permintaan.
- Pesan mengikuti `users.preferred_language` (EN default). REJECTED dan CANCELED tidak pernah masuk feed.

## Definisi selesai
- Bidder menerima update `currentBid` dan permintaan signing; bukan bidder tidak menerimanya.
- Tombol membuka halaman tanda tangan yang benar.
