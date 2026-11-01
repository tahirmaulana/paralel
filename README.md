# PARALEL

Prototype lelang **Web3 + RWA** (aset fisik) di **Arbitrum**, untuk pasar Indonesia. Dana bidder tetap non-custodial; kontrak pintar adalah sumber kebenaran untuk bid, stake, peringkat, dan dana. Status: spesifikasi desain final, implementasi belum dimulai.

## Dokumen

| Dokumen | Isi |
|---|---|
| [`docs/PARALEL.md`](docs/PARALEL.md) | Spesifikasi perilaku sistem (sumber kebenaran; menang bila ada pertentangan) |
| [`docs/CONTRACT_SPEC.md`](docs/CONTRACT_SPEC.md) | Fungsi smart contract, invarian, skenario uji Foundry |
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Stack, struktur monorepo, environment, pembagian tugas komponen |

## Stack ringkas
Solidity + Foundry · Arbitrum (testnet: Arbitrum Sepolia) · Next.js (TypeScript) · wagmi + viem · PostgreSQL (Neon) + Drizzle · Cloudflare Workers (keeper, indexer, bot Telegram) · next-intl (EN default, ID terjemahan).

## Urutan pengerjaan
1. Smart contract (`paralel-contracts`)
2. Database (`paralel-database`)
3. Indexer dan keeper (`paralel-indexer-keeper`)
4. Backend dan relay (`paralel-backend-relay`)
5. Web UI (`paralel-web-ui`)
6. Bot Telegram (`paralel-telegram-bot`)

Skill untuk tiap tahap ada di `.github/skills/`.

## Catatan
- Dokumen di `docs/` ditulis dalam bahasa Indonesia; kode dan komentar dalam bahasa Inggris.
- Jangan menyimpan rahasia (private key, token) di repositori ini.
