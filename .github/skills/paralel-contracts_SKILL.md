---
name: paralel-contracts
description: "Implementasi dan pengujian smart contract PARALEL (Solidity + Foundry) sesuai CONTRACT_SPEC.md. Gunakan saat mengerjakan folder contracts/."
---

# Tahap 1 — Smart Contract

## Baca dulu
- `docs/CONTRACT_SPEC.md` (seluruhnya).
- `docs/PARALEL.md` §8 (bidding), §10 (AWARDING), §11, §13 (fee), §14 (gas), §15, Lampiran D10 (struktur penyimpanan).

## Tugas
- Implementasikan satu kontrak untuk semua auctionID di `contracts/src/`, fungsi per fungsi sesuai CONTRACT_SPEC.md §3.
- Tulis tes Foundry di `contracts/test/` untuk **semua skenario di §7** dan **invarian di §6** (termasuk fuzz peringkat 10 melawan model referensi).
- Tulis skrip deploy di `contracts/script/` (Arbitrum Sepolia dulu; alamat USDC, relayer, platform/tax wallet, owner sebagai parameter).

## Aturan
- Tidak ada fungsi admin penarik dana. Owner hanya: `setPartner`, `setRelayer`, `transferOwnership`.
- Perbarui state dulu, baru transfer token; tambahkan proteksi reentrancy pada fungsi yang mentransfer token.
- Gunakan custom error (daftar di CONTRACT_SPEC.md §5), bukan string revert.
- Waktu hanya `block.timestamp`. Status OPEN/CLOSED diturunkan dari waktu.
- Pesan bertanda tangan: EIP-712 dengan domain, `nonce` per penanda tangan, `expiry`.
- Bid memakai `permit` USDC (varian `placeBidWithPermit`) selain `placeBid` biasa.
- Jangan membuat kontrak upgradeable/proxy dan jangan menambah fungsi di luar spesifikasi.

## Definisi selesai
- `forge test` lulus untuk seluruh skenario §7 dan invarian §6.
- Semua event di §4 dipancarkan dengan field yang dibutuhkan indexer.
- Tidak ada TODO atau fungsi kosong.
