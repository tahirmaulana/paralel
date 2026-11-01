---
name: paralel-indexer-keeper
description: "Membangun indexer (event kontrak ke database) dan keeper (aksi trigger terjadwal) PARALEL sebagai Cloudflare Workers. Gunakan saat mengerjakan workers/indexer dan workers/keeper."
---

# Tahap 3 — Indexer dan Keeper

## Baca dulu
- `docs/CONTRACT_SPEC.md` §3.4, §3.6, §3.8 (trigger), §4 (event).
- `docs/PARALEL.md` Lampiran D4, D5, D7, §14, §15.
- `docs/TECH_STACK.md` §5 (catatan keeper), §7.

## Indexer
- Baca event kontrak per batch block, simpan mentah ke `chain_events` (idempoten: unik `(chain_id, tx_hash, log_index)`), lalu bangun tabel turunan: `bids`, `bidder_stakes`, `awarding_attempts` (status), `payouts`, `withdrawals`, dan status auctionID.
- Urutan bid mengikuti `seq`/(block, tx_index); `client_ms` tidak dipakai menentukan urutan.
- Tangani reorg block (proses ulang event bila block berubah). Bila DB rusak, semua tabel turunan harus bisa dibangun ulang dari event.

## Keeper (cron tiap menit)
- Panggil `startAwarding` saat `now ≥ closeAt`; `advanceCandidate` saat `now > awardingDeadline`; `expireCollection` saat `now > collectionDeadline`.
- Idempoten: revert karena sudah dijalankan atau belum waktunya dianggap normal, bukan error.
- Memakai `RELAYER_PRIVATE_KEY` dari secret. Keeper tidak melakukan hal lain selain aksi trigger.

## Definisi selesai
- Menjalankan ulang indexer dari block awal menghasilkan isi tabel yang sama.
- Tes terhadap kontrak lokal/testnet: alur DEFAULTED, PASSED_IN, dan COLLECTION kedaluwarsa tercatat benar.
