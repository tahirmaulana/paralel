# PARALEL Project Context

Generated at 2026-11-04T14:43:52.095Z

==========
/.env
==========
# .env file for the project

## Neon database connection string
DATABASE_URL="postgresql://neondb_owner:npg_KDJNiMmr12ys@ep-crimson-math-azk6l0f1-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

## Private key dari wallet 'platform_owner/platform' (Untuk deploy)
PRIVATE_KEY="0x877778d4365992fd7361836bca1f2233da91c21d79b67457bdee9501da920987"

## URL RPC Arbitrum Sepolia
ARBITRUM_RPC_URL="https://rpc.ankr.com/arbitrum_sepolia/bb9da7a1eb0a3b8532ca1faa26a81800d57e31ca35fc8787572eb51dfb38289c"
USDC_ADDRESS="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

## Public wallet addresses
PLATFORM_WALLET="0x5472CA834B67De0E54833e6F779725B4E77CA893"
TAX_WALLET="0xA5F1e31bDdadc99936eE2e4358794fB0b2e64F53"
RELAYER_WALLET="0x83A9B466234B81Cf67C4ECc5BD98c1F3e02BeC54"
AUCTION_CONTRACT_ADDRESS="0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c"
NOTARY_WALLET="0xc6bAF074ba3B8112b9ADf1f61F8133875f982FA2"
GUARANTOR_WALLET="0xB8b194df2352ead585843959d3E7363279207f6C"

## Testing for Auction
RELAYER_PRIVATE_KEY="0x83c99b03474521d8da07d1357fab15803a023e288b462d5b88a3dde375cca587"
NOTARY_PRIVATE_KEY="0x6aa29721fd750e29895f04907f0eb3245fce7818d8041100066db20320bdc49a"
CONSIGNOR_PRIVATE_KEY="0x52110937df244a5b04a7e70b0becd122a0a5eb12fe7aed119a036fcc2753574d"
GUARANTOR_PRIVATE_KEY="0x3dd3a387b9ac73f1e3f1e64214297ce820e8034f225832e3ff6ef23d06b05d41"

==========
/.env.example
==========
# ==========================================
# SMART CONTRACT (Foundry)
# Used when running: forge script
# ==========================================
PRIVATE_KEY="0x..."
ARBITRUM_RPC_URL="https://rpc.ankr.com/arbitrum_sepolia/YOUR_API_KEY"
USDC_ADDRESS="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

PLATFORM_WALLET="0x..."
TAX_WALLET="0x..."
RELAYER_WALLET="0x..."

# ==========================================
# WEB FRONTEND & API RELAY (Next.js)
# Used in: apps/web/.env.local
# ==========================================
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
ARBITRUM_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
AUCTION_CONTRACT_ADDRESS="0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c"
RELAYER_PRIVATE_KEY="0x..."

# ==========================================
# INDEXER (Cloudflare Worker)
# Used in: workers/indexer/.dev.vars
# ==========================================
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
ARBITRUM_RPC_URL="https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
AUCTION_CONTRACT_ADDRESS="0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c"

==========
/apps/web/.env.local
==========
# URL Alchemy
ARBITRUM_RPC_URL="https://rpc.ankr.com/arbitrum_sepolia/bb9da7a1eb0a3b8532ca1faa26a81800d57e31ca35fc8787572eb51dfb38289c"

# Contract address for Auction
AUCTION_CONTRACT_ADDRESS="0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c"

# URL Database Neon
DATABASE_URL="postgresql://neondb_owner:npg_KDJNiMmr12ys@ep-crimson-math-azk6l0f1-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# PENTING: Gunakan Private Key dari wallet 'platform_relayer' (bukan platform_owner)
RELAYER_PRIVATE_KEY="83c99b03474521d8da07d1357fab15803a023e288b462d5b88a3dde375cca587"

==========
/apps/web/.gitignore
==========
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts


==========
/apps/web/AGENTS.md
==========
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


==========
/apps/web/eslint.config.mjs
==========
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;


==========
/apps/web/next-env.d.ts
==========
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";
import "./.next/dev/types/root-params.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.


==========
/apps/web/next.config.ts
==========
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;


==========
/apps/web/package.json
==========
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.105.1",
    "next": "16.4.3",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "viem": "^2.57.14",
    "wagmi": "^3.7.9"
  },
  "devDependencies": {
    "@tailwindcss/turbopack": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.4.3",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}


==========
/apps/web/public/file.svg
==========
*(Binary file omitted)*

==========
/apps/web/public/globe.svg
==========
*(Binary file omitted)*

==========
/apps/web/public/next.svg
==========
*(Binary file omitted)*

==========
/apps/web/public/vercel.svg
==========
*(Binary file omitted)*

==========
/apps/web/public/window.svg
==========
*(Binary file omitted)*

==========
/apps/web/README.md
==========
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


==========
/apps/web/src/app/abi.json
==========
{"abi":[{"type":"constructor","inputs":[{"name":"_usdc","type":"address","internalType":"address"},{"name":"_platformWallet","type":"address","internalType":"address"},{"name":"_taxWallet","type":"address","internalType":"address"},{"name":"_relayerWallet","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"AWARD_SIGN_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"CLAIM_WINDOW","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"COLLECTED_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"COLLECTION_WINDOW","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"CONSIGNOR_CONFIRM_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"DOMAIN_SEPARATOR","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"NOTARY_APPROVAL_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"RANK_SLOTS","inputs":[],"outputs":[{"name":"","type":"uint16","internalType":"uint16"}],"stateMutability":"view"},{"type":"function","name":"SIGNING_WINDOW","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"WITHDRAWN_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"WITHDRAW_FEE","inputs":[],"outputs":[{"name":"","type":"uint128","internalType":"uint128"}],"stateMutability":"view"},{"type":"function","name":"WITHDRAW_REQUEST_TYPEHASH","inputs":[],"outputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"stateMutability":"view"},{"type":"function","name":"advanceCandidate","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"allowedIncrements","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"uint128","internalType":"uint128"}],"stateMutability":"view"},{"type":"function","name":"auctions","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"consignor","type":"address","internalType":"address"},{"name":"guarantor","type":"address","internalType":"address"},{"name":"notary","type":"address","internalType":"address"},{"name":"category","type":"uint8","internalType":"uint8"},{"name":"status","type":"uint8","internalType":"enum ParalelAuction.Status"},{"name":"currentRound","type":"uint16","internalType":"uint16"},{"name":"specHash","type":"bytes32","internalType":"bytes32"},{"name":"platformBps","type":"uint16","internalType":"uint16"},{"name":"guarantorBps","type":"uint16","internalType":"uint16"},{"name":"notaryBps","type":"uint16","internalType":"uint16"},{"name":"taxBps","type":"uint16","internalType":"uint16"}],"stateMutability":"view"},{"type":"function","name":"claimable","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint128","internalType":"uint128"}],"stateMutability":"view"},{"type":"function","name":"claimableOf","inputs":[{"name":"wallet","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint128","internalType":"uint128"}],"stateMutability":"view"},{"type":"function","name":"collected","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"expiry","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"expireCollection","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"getAuction","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"tuple","internalType":"struct ParalelAuction.Auction","components":[{"name":"consignor","type":"address","internalType":"address"},{"name":"guarantor","type":"address","internalType":"address"},{"name":"notary","type":"address","internalType":"address"},{"name":"category","type":"uint8","internalType":"uint8"},{"name":"status","type":"uint8","internalType":"enum ParalelAuction.Status"},{"name":"currentRound","type":"uint16","internalType":"uint16"},{"name":"specHash","type":"bytes32","internalType":"bytes32"},{"name":"platformBps","type":"uint16","internalType":"uint16"},{"name":"guarantorBps","type":"uint16","internalType":"uint16"},{"name":"notaryBps","type":"uint16","internalType":"uint16"},{"name":"taxBps","type":"uint16","internalType":"uint16"}]}],"stateMutability":"view"},{"type":"function","name":"getRound","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"}],"outputs":[{"name":"","type":"tuple","internalType":"struct ParalelAuction.Round","components":[{"name":"startingBid","type":"uint128","internalType":"uint128"},{"name":"bidIncrement","type":"uint128","internalType":"uint128"},{"name":"openAt","type":"uint64","internalType":"uint64"},{"name":"closeAt","type":"uint64","internalType":"uint64"},{"name":"currentBid","type":"uint128","internalType":"uint128"},{"name":"currentLeader","type":"address","internalType":"address"},{"name":"bidSeq","type":"uint64","internalType":"uint64"},{"name":"topRanks","type":"address[10]","internalType":"address[10]"},{"name":"awardingIndex","type":"uint8","internalType":"uint8"},{"name":"awardingDeadline","type":"uint64","internalType":"uint64"},{"name":"winner","type":"address","internalType":"address"},{"name":"winnerStake","type":"uint128","internalType":"uint128"},{"name":"collectionDeadline","type":"uint64","internalType":"uint64"},{"name":"claimPeriodEnd","type":"uint64","internalType":"uint64"}]}],"stateMutability":"view"},{"type":"function","name":"getStake","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"bidder","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"tuple","internalType":"struct ParalelAuction.Stake","components":[{"name":"myBid","type":"uint128","internalType":"uint128"},{"name":"reachedSeq","type":"uint64","internalType":"uint64"},{"name":"withdrawn","type":"bool","internalType":"bool"}]}],"stateMutability":"view"},{"type":"function","name":"getTopRanks","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"}],"outputs":[{"name":"","type":"address[10]","internalType":"address[10]"}],"stateMutability":"view"},{"type":"function","name":"markWithdrawn","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"expiry","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"nonces","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"partners","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"pType","type":"uint8","internalType":"enum ParalelAuction.PartnerType"},{"name":"category","type":"uint8","internalType":"uint8"},{"name":"active","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"placeBid","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"amount","type":"uint128","internalType":"uint128"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"placeBidWithPermit","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"amount","type":"uint128","internalType":"uint128"},{"name":"deadline","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"platformWallet","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"refundableOf","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"bidder","type":"address","internalType":"address"}],"outputs":[{"name":"gross","type":"uint128","internalType":"uint128"},{"name":"fee","type":"uint128","internalType":"uint128"},{"name":"net","type":"uint128","internalType":"uint128"}],"stateMutability":"view"},{"type":"function","name":"registerAuction","inputs":[{"name":"p","type":"tuple","internalType":"struct ParalelAuction.RegisterAuctionParams","components":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"consignor","type":"address","internalType":"address"},{"name":"guarantor","type":"address","internalType":"address"},{"name":"notary","type":"address","internalType":"address"},{"name":"category","type":"uint8","internalType":"uint8"},{"name":"specHash","type":"bytes32","internalType":"bytes32"},{"name":"startingBid","type":"uint128","internalType":"uint128"},{"name":"bidIncrement","type":"uint128","internalType":"uint128"},{"name":"openAt","type":"uint64","internalType":"uint64"},{"name":"durationHours","type":"uint16","internalType":"uint16"},{"name":"platformBps","type":"uint16","internalType":"uint16"},{"name":"guarantorBps","type":"uint16","internalType":"uint16"},{"name":"notaryBps","type":"uint16","internalType":"uint16"},{"name":"taxBps","type":"uint16","internalType":"uint16"},{"name":"confirmationCodeHash","type":"bytes32","internalType":"bytes32"},{"name":"notarySig","type":"bytes","internalType":"bytes"},{"name":"consignorSig","type":"bytes","internalType":"bytes"},{"name":"notaryNonce","type":"uint256","internalType":"uint256"},{"name":"notaryExpiry","type":"uint256","internalType":"uint256"},{"name":"consignorNonce","type":"uint256","internalType":"uint256"},{"name":"consignorExpiry","type":"uint256","internalType":"uint256"}]}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"relayerWallet","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"reuseRound","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"startingBid","type":"uint128","internalType":"uint128"},{"name":"bidIncrement","type":"uint128","internalType":"uint128"},{"name":"openAt","type":"uint64","internalType":"uint64"},{"name":"durationHours","type":"uint16","internalType":"uint16"},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"expiry","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"rounds","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"},{"name":"","type":"uint16","internalType":"uint16"}],"outputs":[{"name":"startingBid","type":"uint128","internalType":"uint128"},{"name":"bidIncrement","type":"uint128","internalType":"uint128"},{"name":"openAt","type":"uint64","internalType":"uint64"},{"name":"closeAt","type":"uint64","internalType":"uint64"},{"name":"currentBid","type":"uint128","internalType":"uint128"},{"name":"currentLeader","type":"address","internalType":"address"},{"name":"bidSeq","type":"uint64","internalType":"uint64"},{"name":"awardingIndex","type":"uint8","internalType":"uint8"},{"name":"awardingDeadline","type":"uint64","internalType":"uint64"},{"name":"winner","type":"address","internalType":"address"},{"name":"winnerStake","type":"uint128","internalType":"uint128"},{"name":"collectionDeadline","type":"uint64","internalType":"uint64"},{"name":"claimPeriodEnd","type":"uint64","internalType":"uint64"}],"stateMutability":"view"},{"type":"function","name":"setPartner","inputs":[{"name":"wallet","type":"address","internalType":"address"},{"name":"pType","type":"uint8","internalType":"enum ParalelAuction.PartnerType"},{"name":"category","type":"uint8","internalType":"uint8"},{"name":"active","type":"bool","internalType":"bool"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"setRelayer","inputs":[{"name":"newRelayer","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"stakes","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"},{"name":"","type":"uint16","internalType":"uint16"},{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"myBid","type":"uint128","internalType":"uint128"},{"name":"reachedSeq","type":"uint64","internalType":"uint64"},{"name":"withdrawn","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"startAwarding","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"statusOf","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"uint8","internalType":"enum ParalelAuction.Status"}],"stateMutability":"view"},{"type":"function","name":"submitAwardSignature","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"expiry","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"taxWallet","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"transferOwnership","inputs":[{"name":"newOwner","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"usdc","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contract IERC20Permit"}],"stateMutability":"view"},{"type":"function","name":"withdrawClaimable","inputs":[],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"withdrawConsignor","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"expiry","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"withdrawRefund","inputs":[{"name":"auctionKey","type":"bytes32","internalType":"bytes32"},{"name":"roundNo","type":"uint16","internalType":"uint16"},{"name":"bidder","type":"address","internalType":"address"},{"name":"nonce","type":"uint256","internalType":"uint256"},{"name":"expiry","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"event","name":"AuctionRegistered","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"consignor","type":"address","indexed":false,"internalType":"address"},{"name":"guarantor","type":"address","indexed":false,"internalType":"address"},{"name":"notary","type":"address","indexed":false,"internalType":"address"},{"name":"specHash","type":"bytes32","indexed":false,"internalType":"bytes32"},{"name":"startingBid","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"bidIncrement","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"openAt","type":"uint64","indexed":false,"internalType":"uint64"},{"name":"durationHours","type":"uint16","indexed":false,"internalType":"uint16"}],"anonymous":false},{"type":"event","name":"AwardSigned","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"},{"name":"winner","type":"address","indexed":false,"internalType":"address"}],"anonymous":false},{"type":"event","name":"AwardingStarted","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"},{"name":"candidate","type":"address","indexed":false,"internalType":"address"},{"name":"deadline","type":"uint64","indexed":false,"internalType":"uint64"}],"anonymous":false},{"type":"event","name":"BidPlaced","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"},{"name":"bidder","type":"address","indexed":true,"internalType":"address"},{"name":"added","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"myBidAfter","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"currentBidAfter","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"seq","type":"uint64","indexed":false,"internalType":"uint64"},{"name":"isPreBid","type":"bool","indexed":false,"internalType":"bool"}],"anonymous":false},{"type":"event","name":"ClaimPeriodStarted","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"},{"name":"autoIssued","type":"bool","indexed":false,"internalType":"bool"}],"anonymous":false},{"type":"event","name":"Closed","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"}],"anonymous":false},{"type":"event","name":"Collected","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"}],"anonymous":false},{"type":"event","name":"Defaulted","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"},{"name":"candidate","type":"address","indexed":false,"internalType":"address"},{"name":"defaultFee","type":"uint128","indexed":false,"internalType":"uint128"}],"anonymous":false},{"type":"event","name":"FeeCredited","inputs":[{"name":"recipient","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint128","indexed":false,"internalType":"uint128"}],"anonymous":false},{"type":"event","name":"PassedIn","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"}],"anonymous":false},{"type":"event","name":"RoundScheduled","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"},{"name":"startingBid","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"bidIncrement","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"openAt","type":"uint64","indexed":false,"internalType":"uint64"},{"name":"closeAt","type":"uint64","indexed":false,"internalType":"uint64"}],"anonymous":false},{"type":"event","name":"Settled","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"}],"anonymous":false},{"type":"event","name":"Withdrawal","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"},{"name":"wallet","type":"address","indexed":true,"internalType":"address"},{"name":"kind","type":"uint8","indexed":false,"internalType":"uint8"},{"name":"gross","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"fee","type":"uint128","indexed":false,"internalType":"uint128"},{"name":"net","type":"uint128","indexed":false,"internalType":"uint128"}],"anonymous":false},{"type":"event","name":"WithdrawnItem","inputs":[{"name":"auctionKey","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"roundNo","type":"uint16","indexed":false,"internalType":"uint16"}],"anonymous":false},{"type":"error","name":"AlreadyWithdrawn","inputs":[]},{"type":"error","name":"AuctionExists","inputs":[]},{"type":"error","name":"AuctionNotBiddable","inputs":[]},{"type":"error","name":"BadSignature","inputs":[]},{"type":"error","name":"BiddingClosed","inputs":[]},{"type":"error","name":"CategoryMismatch","inputs":[]},{"type":"error","name":"ConsignorCannotBid","inputs":[]},{"type":"error","name":"IncrementTooLarge","inputs":[]},{"type":"error","name":"InvalidDuration","inputs":[]},{"type":"error","name":"InvalidIncrement","inputs":[]},{"type":"error","name":"InvalidOpenTime","inputs":[]},{"type":"error","name":"NonceUsed","inputs":[]},{"type":"error","name":"NotCurrentCandidate","inputs":[]},{"type":"error","name":"NotMultipleOfIncrement","inputs":[]},{"type":"error","name":"NotOwner","inputs":[]},{"type":"error","name":"NotRefundable","inputs":[]},{"type":"error","name":"NotRelayer","inputs":[]},{"type":"error","name":"NothingToClaim","inputs":[]},{"type":"error","name":"PartnerNotRegistered","inputs":[]},{"type":"error","name":"SignatureExpired","inputs":[]},{"type":"error","name":"TooEarly","inputs":[]},{"type":"error","name":"WinnerCannotWithdraw","inputs":[]},{"type":"error","name":"WrongPhase","inputs":[]}],"bytecode":{"object":"0x60a0806040523461022557608081614fb8803803809161001f8285610229565b833981010312610225576100328161024c565b9061003f6020820161024c565b61005760606100506040850161024c565b930161024c565b60405190939060c081016001600160401b038111828210176102115760405261c35081526207a1206020820152624c4b4060408201526302faf0806060820152631dcd6500608082015264012a05f20060a08201525f5b600381106101ce575050600380546001600160a01b031990811633179091556007805482166001600160a01b0393841617905560058054821693831693909317909255600680548316938216939093179092556004805490911692909116919091179055604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f602082019081527f7535786302764ea64e270378d4c20b680b93053d78d3e8feff846b7a4830250b928201929092527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608201524660808201523060a08281019190915281526101a960c082610229565b519020608052604051614d5790816102618239608051818181610de4015261479a0152f35b5f5f5b600281106101e4575081556001016100ae565b9290602060019164ffffffffff845116908660071b91821b91848060801b03901b191617920193016101d1565b634e487b7160e01b5f52604160045260245ffd5b5f80fd5b601f909101601f19168101906001600160401b0382119082101761021157604052565b51906001600160a01b03821682036102255756fe60806040526004361015610011575f80fd5b5f3560e01c806305b8849e146102ff57806310ccf4ce146102fa57806315924b5b146102f55780631edbc5be146102f05780631f559e49146102eb57806322ff4bc5146102e657806329d9218c146102e15780632dc0562d146102dc578063352ae5d3146102d75780633644e515146102d25780633e413bee146102cd578063402914f51461027857806345219fe9146102c85780634d1551de146102c35780634fa982d4146102be57806357338779146102b9578063587614dc146102b4578063589f8a5c146102af57806359afbefb146102aa5780635ebd35e9146102a55780636548e9bc146102a05780636df4ed631461029b57806370392479146102965780637a497056146102915780637ecebe001461028c57806380c0e40f1461028757806382982f0614610282578063884df85c1461027d5780638903ab9d146102785780638da5cb5b1461027357806391a0d6061461026e57806395c33652146102695780639bff5ddb146102645780639f34fc801461025f578063a2e2c9c61461025a578063a9ce799114610255578063b2cbc1d514610250578063bb17c1451461024b578063bb9f4ae514610246578063c3dfb74214610241578063c7df14e21461023c578063cb6fc17d14610237578063ceb7fcea14610232578063e2e66c4a1461022d578063e4cbc93f14610228578063f2fde38b146102235763fa2af9da1461021e575f80fd5b613da4565b613d53565b613d19565b613c08565b613beb565b613ae2565b613ab5565b6139f3565b6139b9565b613979565b61375c565b613588565b613488565b613398565b61337b565b613316565b612f91565b612f58565b610e2f565b612ea4565b612554565b612519565b6124de565b612255565b61222d565b612152565b6120e8565b6120ae565b611bc6565b61166f565b6114d3565b61146d565b611325565b6112eb565b610e84565b610e07565b610dcd565b610802565b6107be565b6107a2565b61070f565b6106e8565b610647565b610472565b61034c565b610312565b5f91031261030e57565b5f80fd5b3461030e575f36600319011261030e5760206040517f70a1441cb294819f730830e09301c0bce410da47c48b877ff14bdf036eb76b648152f35b3461030e575f36600319011261030e5760206040517fe62ab933ee16020dfd1e522f3b2fed9d770ddc70c761931d1fce99f7c9301ec38152f35b634e487b7160e01b5f52602160045260245ffd5b600911156103a457565b610386565b9060098210156103a45752565b81516001600160a01b031681526101608101929161047091906101409081906020818101516001600160a01b0316908501526040818101516001600160a01b03169085015260608181015160ff169085015261041a608082015160808601906103a9565b60a08181015161ffff169085015260c081015160c085015261044760e082015160e086019061ffff169052565b6101008181015161ffff16908501526101208181015161ffff1690850152015161ffff16910152565b565b3461030e57602036600319011261030e576004355f61014060405161049681613de0565b8281528260208201528260408201528260608201528260808201528260a08201528260c08201528260e0820152826101008201528261012082015201525f5260086020526105ba60405f206105ae6105a260046104f1613e59565b84546001600160a01b031681529360018101546001600160a01b0316602086015260028101546001600160a01b0381166040870152610564906105599060ff60a082901c16606089015261054f60a882901c60ff1660808a01613e79565b60b01c61ffff1690565b61ffff1660a0870152565b600381015460c0860152015461ffff811660e085015261ffff601082901c1661010085015261ffff602082901c1661012085015260301c61ffff1690565b61ffff16610140830152565b604051918291826103b6565b0390f35b6001600160a01b0391821681529181166020830152909116604082015260ff90911660608201526101608101989796909590949093909290916106059060808801906103a9565b61ffff1660a086015260c085015261ffff1660e0840152610100830161062d9161ffff169052565b61ffff16610120820152610140016104709161ffff169052565b3461030e57602036600319011261030e576004355f90815260086020526040902080546001820154600283015460038401546004909401546001600160a01b039283169491936105ba93169161ffff8216601083901c61ffff16916106b9602085901c61ffff169460301c61ffff1690565b94604051988861ffff8b9a60b01c169260ff8260a81c169260ff8360a01c169260018060a01b0316918c6105be565b3461030e575f36600319011261030e576020604051600a8152f35b61ffff81160361030e57565b3461030e57604036600319011261030e5760043561076e600361076860243561073781610703565b61014094856040516107498282613e38565b3690375f52600960205260405f209061ffff165f5260205260405f2090565b01613e9b565b604051905f825b600a821061078257505050f35b82516001600160a01b031681526020928301926001929092019101610775565b3461030e575f36600319011261030e57602060405161012c8152f35b3461030e575f36600319011261030e576006546040516001600160a01b039091168152602090f35b6001600160a01b0381160361030e57565b60ff81160361030e57565b3461030e5761010036600319011261030e5760243560043561082382610703565b60443590610830826107e6565b606435926084359260a43591610845836107f7565b60045460e4359360c435916001600160a01b03163303610dbe576007548060a01c60ff161561087390613eda565b60ff60a01b1916600160a01b17600755610895865f52600860205260405f2090565b96836108a9885f52600960205260405f2090565b906108bf919061ffff165f5260205260405f2090565b9885856108d48a5f52600a60205260405f2090565b906108ea919061ffff165f5260205260405f2090565b6001600160a01b039091165f908152602091909152604090209685604051808b86868c602085019661091c9488613f26565b03601f198101825261092e9082613e38565b5190209460405194859260208401926109609391604193918352602083015260ff60f81b9060f81b1660408201520190565b03601f19810184526109729084613e38565b61097c9386614760565b15610daf5782546001600160801b03811615610da05760c01c60ff16610d9157600d8601546001600160a01b038381169690604883901c16878114610d825760018901546109dd9060401c6001600160401b03165b6001600160401b031690565b4210915f905f9160035f9c019b5b60ff8116600a811015610d69578c610a2b8f610a0a85610a1f92613f7b565b905460039190911b1c6001600160a01b031690565b6001600160a01b031690565b14610a3c575060010160ff166109eb565b92939495969798999a9b9c505050610a5f610a5960019760ff1690565b60ff1690565b11610d61575b6002610a77915b015460a81c60ff1690565b610a808161039a565b80158015610d4e575b15610c7657505050610c6757610c5857610ac0610b48935b805460ff60c01b1916600160c01b1781555b546001600160801b031690565b91622625a06001600160801b0384161015610c4e5782905b6020610ae48386613f9e565b80926001600160801b038516610c0c575b600754610b0a906001600160a01b0316610a1f565b60405163a9059cbb60e01b81526001600160a01b0390921660048301526001600160801b0390921660248201529687919082905f9082906044820190565b03925af1918215610c0757610b89610bc5937f34a1cd6d071c412628c6cc070fe069904241c91d4427b70c57f0d3d8092ada61975f91610bd8575b5061401e565b6040519485948592936001600160801b03809296958160809561ffff60a089019a1688525f602089015216604087015216606085015216910152565b0390a36007805460ff60a01b191690555b005b610bfa915060203d602011610c00575b610bf28183613e38565b810190613ffe565b5f610b83565b503d610be8565b614013565b6005546001600160a01b03165f908152600c60205260409020610c4990610c4387610c3e83546001600160801b031690565b613fc3565b90613fe3565b610af5565b622625a090610ad8565b631ba168fb60e11b5f5260045ffd5b63085de62560e01b5f5260045ffd5b9091939250610c848161039a565b60038103610caf575015915081610ca7575b50610c6757610ac0610b4893610aa1565b90505f610c96565b610cb88161039a565b600481148015610d3b575b8015610d28575b15610d06575081610cfd575b50610ce9575b50610ac0610b4893610aa1565b6001600160a01b031615610c67575f610cdc565b9050155f610cd6565b60079350809250610d17915061039a565b03610c5857610ac0610b4893610aa1565b50610d328161039a565b60068114610cca565b50610d458161039a565b60058114610cc3565b50610d588161039a565b60018114610a89565b849150610a65565b505095969798999a50610a779192939450600290610a6c565b63384af97960e11b5f5260045ffd5b636507689f60e01b5f5260045ffd5b6312d37ee560e31b5f5260045ffd5b635cd5d23360e01b5f5260045ffd5b63c64891a560e01b5f5260045ffd5b3461030e575f36600319011261030e5760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b3461030e575f36600319011261030e576007546040516001600160a01b039091168152602090f35b3461030e57602036600319011261030e57600435610e4c816107e6565b60018060a01b03165f52600c60205260206001600160801b0360405f205416604051908152f35b6001600160801b0381160361030e57565b3461030e57606036600319011261030e57602435600435610ea482610703565b60443591610eb183610e73565b610ed7600754610ec760ff8260a01c1615613eda565b60ff60a01b1916600160a01b1790565b600755610eec825f52600860205260405f2090565b92610f1482610f03855f52600960205260405f2090565b9061ffff165f5260205260405f2090565b906001820191610f2f83546001600160401b039060401c1690565b6001600160401b038116159081156112d7575b506112c8576002860195610f5b875460ff9060a81c1690565b610f648161039a565b80151590816112b3575b506112a45754610f86906001600160a01b0316610a1f565b3314611295576001600160801b038216158015611276575b611267575f936020611132610fd833610fc385610f038c5f52600a60205260405f2090565b9060018060a01b03165f5260205260405f2090565b936110e46002610fef87546001600160801b031690565b926001600160801b038416158b146112595761102961102361101c8b610c3e85546001600160801b031690565b8096613fc3565b89613fe3565b0180546110649060a01c6001600160401b0316885467ffffffffffffffff60801b191660809190911b67ffffffffffffffff60801b16178855565b86546001600160801b031661108961107d8b5460801c90565b6001600160801b031690565b6001600160801b03821611611225575b506110a533878d614ab7565b80546110bc9060a01c6001600160401b0316614a3d565b815467ffffffffffffffff60a01b191660a09190911b67ffffffffffffffff60a01b16179055565b6007546110f9906001600160a01b0316610a1f565b6040516323b872dd60e01b81523360048201523060248201526001600160801b0390921660448301529097889283919082906064820190565b03925af1918215610c0757611173610bc5937f8710d97d6d0a65a90831480baf2257740c8a4219be781bc0f3bd9d9f4405a60c975f91611206575b50614a5a565b54966111ab6111a06111906001600160801b038b16975460801c90565b9960801c6001600160401b031690565b915460a81c60ff1690565b976111b58961039a565b604051958695339a159487949096959260a0946001600160801b038092816001600160401b039661ffff60c08c019d168b521660208a01521660408801521660608601521660808401521515910152565b61121f915060203d602011610c0057610bf28183613e38565b5f61116d565b89546001600160801b031660809190911b6001600160801b03191617895580546001600160a01b031916331781555f611099565b6110296110238a8096613fc3565b6369355c7d60e11b5f5260045ffd5b5061128e61107d611288835460801c90565b84614a1f565b1515610f9e565b63363299f560e01b5f5260045ffd5b6363e70a0360e11b5f5260045ffd5b600191506112c08161039a565b14155f610f6e565b638083ad0360e01b5f5260045ffd5b6001600160401b031690504210155f610f42565b3461030e575f36600319011261030e5760206040517f9db65776815962310aadaeca290992a87f97cc1085f7c1fdda7cef9c9ed672658152f35b3461030e575f36600319011261030e5761134b600754610ec760ff8260a01c1615613eda565b600755335f908152600c60205260409020546001600160801b03168015610da057335f908152600c6020526040902080546001600160801b031916905560075461139d906001600160a01b0316610a1f565b60405163a9059cbb60e01b81523360048201526001600160801b038316602482015290602090829060449082905f905af18015610c07576113e4915f91610bd8575061401e565b5f7f34a1cd6d071c412628c6cc070fe069904241c91d4427b70c57f0d3d8092ada6160405180610bc5339580839092916001600160801b036080918160a08501965f8652600260208701521660408501525f606085015216910152565b606090600319011261030e576004359060243561145d81610703565b9060443561146a816107e6565b90565b3461030e5760606114a1610fc361148336611441565b92915f52600a60205260405f209061ffff165f5260205260405f2090565b5460ff604051916001600160801b03811683526001600160401b038160801c16602084015260c01c1615156040820152f35b3461030e5760e036600319011261030e576004356024356114f381610703565b6044359061150082610e73565b60843592606435611510856107f7565b60a4359460c43561154261153086610f03875f52600a60205260405f2090565b335f9081526020919091526040902090565b926001600160801b0361155d8895546001600160801b031690565b1615611609575b600754611579906001600160a01b0316610a1f565b91823b1561030e5760405163d505accf60e01b81523360048201523060248201526001600160801b039095166044860152606485019190915260ff909216608484015260a483019690965260c4820152935f90859081838160e4810103925af1938415610c0757610bd6946115ef575b50614899565b806115fd5f61160393613e38565b80610304565b5f6115e9565b925061162d611627610ab387610f03885f52600960205260405f2090565b87613fc3565b92611564565b60e090600319011261030e576004359060243561164f81610703565b906044359060643590608435611664816107f7565b9060a4359060c43590565b3461030e5761167d36611633565b60045495969590949291906001600160a01b03163303610dbe576116ad600754610ec760ff8260a01c1615613eda565b6007556116c2865f52600860205260405f2090565b946116d988610f03895f52600960205260405f2090565b94600287019560056116f0885460ff9060a81c1690565b6116f98161039a565b03611bb757600e01946117106109d1875460c01c90565b4210610c67576117a49461176061179b6117a09661178d8d8f6117398f5460018060a01b031690565b9586916117528b8b604051958694602086019889613f26565b03601f198101835282613e38565b519020946040519889936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03601f198101875286613e38565b614760565b1590565b610daf57815460ff60a81b1916600360a91b17825554600483015494906001600160801b03166117d861ffff8716826140a1565b6127106001600160801b0391909116049586936117fd61ffff601084901c16846140a1565b6127106001600160801b03919091160494859261182261ffff602083901c16866140a1565b6127106001600160801b039091160493849160301c61ffff1661ffff1661184990876140a1565b6127106001600160801b039091160495869361186491613f9e565b9061186e91613f9e565b9061187891613f9e565b9061188291613f9e565b6005546001600160a01b03165f908152600c6020526040902080549196916118b4908b906001600160801b0316613fc3565b6118bd91613fe3565b6001870180546001600160a01b03165f908152600c6020526040902080546118ef9084906001600160801b0316613fc3565b6118f891613fe3565b82546001600160a01b03165f908152600c6020526040902080546119269086906001600160801b0316613fc3565b61192f91613fe3565b6006546001600160a01b03165f908152600c60205260409020805461195e9087906001600160801b0316613fc3565b61196791613fe3565b6005546040516001600160801b039b909b168b526001600160a01b0316998a905f516020614d025f395f51905f5290602090a2546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a2546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a26006546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a2611abb926001600160801b038316622625a01115611bad5782955b611a4e8785613f9e565b906001600160801b038816611b78575b506007546020908290611a79906001600160a01b0316610a1f565b845460405163a9059cbb60e01b81526001600160a01b0390911660048201526001600160801b03929092166024830152909687919082905f9082906044820190565b03925af1918215610c0757611afb610bc5937f34a1cd6d071c412628c6cc070fe069904241c91d4427b70c57f0d3d8092ada61975f91610bd8575061401e565b60405161ffff8516815287907f4da780139c5868529671c78b61ff6b45d333496dfbff7b99802adc03a5bf50bb90602090a2546001600160a01b0390811616966040519485948592936001600160801b03809296958160809561ffff60a089019a1688526001602089015216604087015216606085015216910152565b6001600160a01b03165f908152600c60205260409020611ba790610c4389610c3e83546001600160801b031690565b5f611a5e565b622625a095611a44565b6338961af360e21b5f5260045ffd5b3461030e57604036600319011261030e57600435602435611be681610703565b6004546001600160a01b03163303610dbe57611c0a825f52600860205260405f2090565b611c2082610f03855f52600960205260405f2090565b9060028101916003611c37845460ff9060a81c1690565b611c408161039a565b03611bb757600d810190815492611c646109d1856001600160401b039060081c1690565b421115610c6757600387920193611c7b9060ff1690565b611c859085613f7b565b905460039190911b1c6001600160a01b0316908187611cac855f52600a60205260405f2090565b90611cc2919061ffff165f5260205260405f2090565b6001600160a01b039091165f908152602091909152604090209060048101918254611cee8161ffff1690565b601082901c61ffff16611d00916140fb565b9060201c61ffff16611d11916140fb565b928154611d24906001600160801b031690565b9361ffff1691611d3483866140a1565b6127106001600160801b03909116049485611d4e91613f9e565b611d5791613fe3565b549080611d6c61ffff601085901c16866140a1565b90611d76916140d8565b9160201c61ffff1661ffff16611d8c90856140a1565b90611d96916140d8565b9182611da28386613f9e565b90611dac91613f9e565b6005546001600160a01b03165f908152600c602052604090208054919291611dde9084906001600160801b0316613fc3565b611de791613fe3565b60010180546001600160a01b03165f908152600c602052604090208054919291611e1b9085906001600160801b0316613fc3565b611e2491613fe3565b89546001600160a01b03165f908152600c602052604090208054611e529086906001600160801b0316613fc3565b611e5b91613fe3565b6005546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a2546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a286546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a26040805161ffff891681526001600160a01b039390931660208401526001600160801b0391909116908201527f2d9fe650fed4bc34d183a408307fc96335fb55e28ed0abc0ead743104ed41e5590606090a2805460ff16611f4b90614111565b815460ff191660ff919091169081178255600a811080159190612080575b5015611fc3575050805460ff60a81b1916600760a81b1790557f95e0459112394ca662d80bd6fca56ebae5a7280f6366ac13165f9c04a10400c490611fbe905b60405161ffff90911681529081906020820190565b0390a2005b7f1a69cbed078a1bb8396654b12216e9752dbfb0b2efed8af79c2a7f65a751713f9391925061204a61203a610a0a611fbe9361202e61200a6001600160401b034216614122565b825468ffffffffffffffff00191660089190911b68ffffffffffffffff0016178255565b549560ff871690613f7b565b9360081c6001600160401b031690565b6040805161ffff90941684526001600160a01b0390941660208401526001600160401b0316928201929092529081906060820190565b6120a6915061208f9084613f7b565b90546001600160a01b039260039290921b1c821690565b16155f611f69565b3461030e575f36600319011261030e5760206040517f20dcca761e9b55e27226d91929b71eefff36ea2520e5a75296d5288a0472c1958152f35b3461030e57602036600319011261030e57600435612105816107e6565b6003546001600160a01b0316330361213957600480546001600160a01b0319166001600160a01b0392909216919091179055005b6330cd747160e01b5f5260045ffd5b8015150361030e57565b3461030e57608036600319011261030e5760043561216f816107e6565b602435600281101561030e57604435612187816107f7565b6064359261219484612148565b6003546001600160a01b03163303612139576121bc604051936121b685613e01565b846141a1565b60ff602084019216825260408301931515845260018060a01b03165f52600b60205260405f2091519260028410156103a457610bd6936122159260ff61ff008654925160081b1692169061ffff19161717835551151590565b815462ff0000191690151560101b62ff000016179055565b3461030e575f36600319011261030e576004546040516001600160a01b039091168152602090f35b3461030e5761226336611633565b919360018060a09795971b03600454163303610dbe5761228b875f52600860205260405f2090565b9160026122a486610f038b5f52600960205260405f2090565b93019360036122b8865460ff9060a81c1690565b6122c18161039a565b03611bb757600d84019788546122e46109d1826001600160401b039060081c1690565b4211610c675760ff16936122fe610a0a8660038901613f7b565b986001600160a01b038a16156124cf576123be6117a0956123b08e6123c4996123838e6117528a8a6040519586946020860198899160a09361ffff60ff92989796939860c08601997f9db65776815962310aadaeca290992a87f97cc1085f7c1fdda7cef9c9ed672658752602087015216604085015216606083015260808201520152565b519020936040519788936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03601f198101865285613e38565b89614760565b6124cf5784547fffffff0000000000000000000000000000000000000000ffffffffffffffffff16604885901b6901000000000000000000600160e81b0316179094557ff3e44fc950793ff0f632c33a7decfb8e7cbdf1fd17ca04b46b65c03b1525a9a9936124a99161246f9061245c600e612453610ab389610fc38a610f038f5f52600a60205260405f2090565b94019384613fe3565b805460ff60a81b1916600160aa1b179055565b6124816001600160401b034216614141565b815467ffffffffffffffff60801b191660809190911b67ffffffffffffffff60801b16179055565b6040805161ffff90921682526001600160a01b0390921660208201529081908101611fbe565b632922347560e01b5f5260045ffd5b3461030e57602036600319011261030e576004356124fb816107e6565b60018060a01b03165f52600d602052602060405f2054604051908152f35b3461030e5760606001600160801b038061253b61253536611441565b916141ad565b9193908160405195168552166020840152166040820152f35b3461030e57602036600319011261030e576004356001600160401b03811161030e57806004016102a0600319833603011261030e576004546001600160a01b03163303610dbe5780359160018060a01b036125c76125ba855f52600860205260405f2090565b546001600160a01b031690565b16612d4757604481016125fd6125f86125df8361427e565b6001600160a01b03165f908152600b6020526040902090565b614288565b9060648301916126126125f86125df8561427e565b6126226117a06040840151151590565b908115612d27575b8115612d0f575b8115612cf2575b50612ce3576020015160ff1692608481019360ff612658610a59876142be565b911603612cd45760c48101916001600160801b03612675846142c8565b1615612c795760e48201935f805b60068110612c88575b5015612c79576126a361269e866142c8565b614080565b6001600160801b036126b761107d876142c8565b911611612c6a57610124830191600c61ffff6126d2856142d2565b16108015612c54575b612c45576001600160401b034216966126fc6126f689614141565b98614161565b6101048601986001600160401b03806127148c6142dc565b9216911610908115612c26575b50612c1757899861283f6117a0878a8c61279e61274f6127496127438f6142c8565b946142c8565b926142dc565b9161175261275c8d6142d2565b60405194859360208501978892936001600160401b0361ffff9296956001600160801b0360609581608089019a16885216602087015216604085015216910152565b5190206101c4820135809e61022484013591612815610244860135946117528686604051958694602086019889919260a093969594919660c08401977f20dcca761e9b55e27226d91929b71eefff36ea2520e5a75296d5288a0472c195855260208501526040840152606083015260808201520152565b5190206128396128326101e461282a8d61427e565b9601896142e6565b3691614318565b93614760565b610daf57610264860135809a8c61028489013592839160405192839260208401956128a793879094939260809260a08301967fe62ab933ee16020dfd1e522f3b2fed9d770ddc70c761931d1fce99f7c9301ec384526020840152604083015260608201520152565b03601f19810182526128b99082613e38565b51902090602488019b6128cb8d61427e565b936102048a016128da916142e6565b36906128e592614318565b926128ef94614760565b15610daf5789946128ff8a61427e565b906129098461427e565b906129138661427e565b9361291d906142be565b60a4820135949061293161014484016142d2565b9061293f61016485016142d2565b9261294d61018486016142d2565b946101a40161295b906142d2565b95612964613e59565b6001600160a01b0390981688526001600160a01b031660208801526001600160a01b0316604087015260ff1660608601525f6080860152600160a086015260c0850186905261ffff1660e085015261ffff1661010084015261ffff1661012083015261ffff166101408201526129e2865f52600860205260405f2090565b906129ec9161435d565b6129f5886142dc565b6129fe856142d2565b61ffff16612a0b906144f3565b612a1491614181565b98612a27865f52600960205260405f2090565b612a399060015f5260205260405f2090565b612a42886142c8565b612a4c9082613fe3565b612a55896142c8565b81546001600160801b031660809190911b6001600160801b0319161781558a612a7d8b6142dc565b9160010191612aa29083906001600160401b03166001600160401b0319825416179055565b81546fffffffffffffffff0000000000000000191660409190911b67ffffffffffffffff60401b16179055612ad69061427e565b91612ae09061427e565b92612aea9061427e565b93612af4876142c8565b612afd896142c8565b90612b078b6142dc565b92612b11906142d2565b604080516001600160a01b0397881681529787166020890152979095169686019690965260608501929092526001600160801b039485166080850152931660a08301526001600160401b0390921660c082015261ffff90911660e08201527f4ab7a6b488470d4370897014e19f3fd08de55ad3a6ca063902ce9ace3e8ea06f9061010090a2612b9f906142c8565b90612ba9906142c8565b91612bb3906142dc565b60408051600181526001600160801b03938416602082015293909216918301919091526001600160401b0390811660608301529190911660808201527f8a3ebe889eebb8524907930cc397b1fcfc6ea957cb26726f3894f753a007175b9060a090a2005b63126a2a7160e21b5f5260045ffd5b90506001600160401b0380612c3a8b6142dc565b92169116115f612721565b637616640160e01b5f5260045ffd5b50603061ffff612c63856142d2565b16116126db565b6334506cf160e11b5f5260045ffd5b635899c0df60e11b5f5260045ffd5b612c91876142c8565b6001600160801b03612cbb61107d612ca88561395c565b90546001600160801b039160031b1c1690565b911614612cca57600101612683565b505060015f61268c565b636ffb179360e11b5f5260045ffd5b633986d5d160e21b5f5260045ffd5b905051612cfe8161330c565b612d078161330c565b15155f612638565b9050612d216117a06040830151151590565b90612631565b905060018251612d368161330c565b612d3f8161330c565b14159061262a565b632da2f89160e01b5f5260045ffd5b905f905b600a8210612d6757505050565b82516001600160a01b031681526020928301926001929092019101612d5a565b610470909291926102c06101a06102e0830195612dad8482516001600160801b03169052565b6020818101516001600160801b0316908501526040818101516001600160401b0316908501526060818101516001600160401b0316908501526080818101516001600160801b03169085015260a0818101516001600160a01b03169085015260c0818101516001600160401b031690850152612e3160e082015160e0860190612d56565b61010081015160ff166102208501526101208101516001600160401b03166102408501526101408101516001600160a01b03166102608501526101608101516001600160801b03166102808501526101808101516001600160401b03166102a085015201516001600160401b0316910152565b3461030e57604036600319011261030e576105ba612f4c612f47602435610f03600435612ed083610703565b5f6101a0604051612ee081613e1c565b8281528260208201528260408201528260608201528260808201528260a08201528260c0820152612f0f613e85565b60e0820152826101008201528261012082015282610140820152826101608201528261018082015201525f52600960205260405f2090565b614515565b60405191829182612d87565b3461030e575f36600319011261030e576003546040516001600160a01b039091168152602090f35b6001600160401b0381160361030e57565b3461030e5761014036600319011261030e57600435602435612fb281610e73565b60443590612fbf82610e73565b60643591612fcc83612f80565b608435612fd881610703565b60a4359060e43560c435612feb826107f7565b600454610104359161012435916001600160a01b03163303610dbe576130198a5f52600860205260405f2090565b9560028701966007613030895460ff9060a81c1690565b6130398161039a565b03611bb7576130e09561179b6117a09661178d8f6130b6906040516130a5816117528c8c60208401968760809194939260a08201957fe62ab933ee16020dfd1e522f3b2fed9d770ddc70c761931d1fce99f7c9301ec3835260208301525f604083015260608201520152565b51902095546001600160a01b031690565b936040519889936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b610daf576001600160801b0384168015612c79575f6001600160801b038516815b600681106132e3575b505015612c795761311d61107d85614080565b11612c6a5761ffff1691600c831080156132d9575b612c45576001600160401b03421661315261314c82614141565b91614161565b906001600160401b03808816911681109182156132c6575b5050612c17577f8a3ebe889eebb8524907930cc397b1fcfc6ea957cb26726f3894f753a007175b946131f86131f26131ec856131d66131ba6131b5611fbe995461ffff9060b01c1690565b61469b565b825461ffff60b01b191660b09190911b61ffff60b01b16178255565b805460ff60a81b191681555460b01c61ffff1690565b956144f3565b82614181565b9161327f83600161321588610f038d5f52600960205260405f2090565b61321f8a82613fe3565b80546001600160801b0316608086901b6001600160801b03191617815501805467ffffffffffffffff19166001600160401b0386161781559067ffffffffffffffff60401b82549160401b169067ffffffffffffffff60401b1916179055565b60405195869586936001600160401b0392906001600160801b036080958186949a99959a61ffff60a08b019c168a5216602089015216604087015216606085015216910152565b6001600160401b03161090505f8061316a565b5060308311613132565b6132f261107d612ca88361395c565b821461330057600101613101565b50505060015f8061310a565b600211156103a457565b3461030e57602036600319011261030e57600435613333816107e6565b6001600160a01b03165f908152600b60205260409081902054905160ff821660028110156103a45760609260ff918352818160081c16602084015260101c1615156040820152f35b3461030e575f36600319011261030e576020604051622625a08152f35b3461030e575f36600319011261030e57602060405162093a808152f35b9a98969492909d9c9b99979593916101a08c019e6001600160801b03168c526001600160801b031660208c01526001600160401b031660408b01526001600160401b031660608a015260808901613413916001600160801b03169052565b6001600160a01b031660a08801526001600160401b031660c087015260ff1660e08601526001600160401b03166101008501526001600160a01b03166101208401526001600160801b03166101408301526001600160401b031661016082015261018001610470916001600160401b03169052565b3461030e57604036600319011261030e576134c76024356004356134ab82610703565b5f52600960205260405f209061ffff165f5260205260405f2090565b80546105ba6001830154926134dc8460801c90565b60028201549091906135016001600160a01b0382169160a01c6001600160401b031690565b91600d8101546135118160ff1690565b600e613534600884901c6001600160401b03169360481c6001600160a01b031690565b930154946001600160801b0386169461355b608088901c6001600160401b03169760c01c90565b976040519b8c9b6001600160401b03808360401c169216908d6001600160801b038260801c9216906133b5565b3461030e5761359636611633565b600454949593946001600160a01b03163303610dbe576135be875f52600860205260405f2090565b946135d585610f038a5f52600960205260405f2090565b96600287019760046135ec8a5460ff9060a81c1690565b6135f58161039a565b03611bb757600e01966136166109d189546001600160401b039060801c1690565b4211610c675761369d9561179b6117a09661178d6130b660018f8861368b8f6117528d6040519485936020850197889094939261ffff60809360a08401977f2942f5266b861ea12a4956265700e7b7c815c702c173b9f908f1dcbd2f0d7ce98552602085015216604083015260608201520152565b5190209601546001600160a01b031690565b610daf57825460ff60a81b1916600560a81b179092557ffbe2a0234e363e279c1e7bcc390660b21bb7f0dcfc4b28a84b91fc304038a90991611fbe9161370f906136ef6001600160401b034216614161565b81546001600160c01b031660c09190911b6001600160c01b031916179055565b60405161ffff8216815284907faf2eb3fc400c696679ea8662a6e866b5fff83674b34b23e8f2194fb4d8762bc990602090a26040805161ffff90921682525f602083015290918291820190565b3461030e57604036600319011261030e5760043560243561377c81610703565b6004546001600160a01b03163303610dbe576137a0825f52600860205260405f2090565b60026137b883610f03865f52600960205260405f2090565b91019081546137d66137cf8261ffff9060b01c1690565b61ffff1690565b61ffff851603611bb75760a81c60ff166137ef8161039a565b611bb757600181015461380d9060401c6001600160401b03166109d1565b4210610c675760405161ffff8416815284907f7ef8df33260d115faed4bd5e09c2995955b443c2949497804badec967227501890602090a26003810180549091906001600160a01b0316613899575050805460ff60a81b1916600760a81b1790557f95e0459112394ca662d80bd6fca56ebae5a7280f6366ac13165f9c04a10400c490611fbe90611fa9565b61204a6139375f600d611fbe946138e07f1a69cbed078a1bb8396654b12216e9752dbfb0b2efed8af79c2a7f65a751713f999798600360a81b60ff60a81b19825416179055565b01805460ff19168155956139236138ff6001600160401b034216614122565b885468ffffffffffffffff00191660089190911b68ffffffffffffffff0016178855565b5460039190911b1c6001600160a01b031690565b935460081c6001600160401b031690565b634e487b7160e01b5f52603260045260245ffd5b9060068210156139745760108260011c9260041b1690565b613948565b3461030e57602036600319011261030e57600435600681101561030e576001600160801b036139a960209261395c565b90549060031b1c16604051908152f35b3461030e575f36600319011261030e5760206040517f2942f5266b861ea12a4956265700e7b7c815c702c173b9f908f1dcbd2f0d7ce98152f35b3461030e576105ba613a41610fc3613a0a36611441565b92915f60408051613a1a81613e01565b82815282602082015201525f52600a60205260405f209061ffff165f5260205260405f2090565b60ff60405191613a5083613e01565b546001600160801b03811683526001600160401b038160801c16602084015260c01c16151560408201526040519182918291909160408060608301946001600160801b0381511684526001600160401b03602082015116602085015201511515910152565b3461030e57602036600319011261030e576020613ad36004356146ae565b613ae060405180926103a9565bf35b3461030e57613af036611633565b90919260018060a01b03600454163303610dbe57613b16875f52600860205260405f2090565b9460028601956007613b2d885460ff9060a81c1690565b613b368161039a565b03611bb757613bab9561179b6117a09661178d6130b660018e888f61368b906117528d6040519485936020850197889094939261ffff60809360a08401977f6e7600d1ee7f86bc396755a2f8d75b802bd69f4fa3198b56fa44fd4d9252074b8552602085015216604083015260608201520152565b610daf57805460ff60a81b1916600160ab1b1790557fd4b9f3ca69d05dfd1b40071e38fb890e88dd42875192bbbf9831e06eb83a67e290611fbe90611fa9565b3461030e575f36600319011261030e5760206040516202a3008152f35b3461030e57604036600319011261030e57600435602435613c2881610703565b6004546001600160a01b03163303610dbe57613c4c825f52600860205260405f2090565b906002613c6582610f03865f52600960205260405f2090565b9201916004613c79845460ff9060a81c1690565b613c828161039a565b03611bb757600e0190613ca36109d183546001600160401b039060801c1690565b421115610c6757825460ff60a81b1916600560a81b179092557ffbe2a0234e363e279c1e7bcc390660b21bb7f0dcfc4b28a84b91fc304038a90991611fbe91613cfd9080546136ef9060801c6001600160401b0316614161565b6040805161ffff90921682526001602083015290918291820190565b3461030e575f36600319011261030e5760206040517f6e7600d1ee7f86bc396755a2f8d75b802bd69f4fa3198b56fa44fd4d9252074b8152f35b3461030e57602036600319011261030e57600435613d70816107e6565b600354906001600160a01b0382163303612139576001600160a01b0316908115612139576001600160a01b03191617600355005b3461030e575f36600319011261030e576005546040516001600160a01b039091168152602090f35b634e487b7160e01b5f52604160045260245ffd5b61016081019081106001600160401b03821117613dfc57604052565b613dcc565b606081019081106001600160401b03821117613dfc57604052565b6101c081019081106001600160401b03821117613dfc57604052565b90601f801991011681019081106001600160401b03821117613dfc57604052565b6040519061047061016083613e38565b604051906104706101c083613e38565b60098210156103a45752565b60405190610140613e968184613e38565b368337565b60405191905f835b600a8210613eba5750505061047061014083613e38565b82546001600160a01b031681526001928301929190910190602001613ea3565b15613ee157565b60405162461bcd60e51b815260206004820152601f60248201527f5265656e7472616e637947756172643a207265656e7472616e742063616c6c006044820152606490fd5b919261ffff60a094979695929760c08501987f70a1441cb294819f730830e09301c0bce410da47c48b877ff14bdf036eb76b6486526020860152166040840152600180851b0316606083015260808201520152565b600a8210156139745701905f90565b634e487b7160e01b5f52601160045260245ffd5b906001600160801b03809116911603906001600160801b038211613fbe57565b613f8a565b906001600160801b03809116911601906001600160801b038211613fbe57565b906001600160801b03166001600160801b0319825416179055565b9081602091031261030e575161146a81612148565b6040513d5f823e3d90fd5b1561402557565b60405162461bcd60e51b815260206004820152600f60248201526e151c985b9cd9995c8819985a5b1959608a1b6044820152606490fd5b9060098110156103a457815460ff60a81b191660a89190911b60ff60a81b16179055565b6001600160801b036014911602906001600160801b038216918203613fbe57565b906001600160801b03809116911602906001600160801b038216918203613fbe57565b634e487b7160e01b5f52601260045260245ffd5b906001600160801b03169081156140f6576001600160801b03160490565b6140c4565b9061ffff8091169116019061ffff8211613fbe57565b60ff1660ff8114613fbe5760010190565b6001600160401b0361012c911601906001600160401b038211613fbe57565b6001600160401b036202a300911601906001600160401b038211613fbe57565b6001600160401b0362093a80911601906001600160401b038211613fbe57565b906001600160401b03809116911601906001600160401b038211613fbe57565b60028210156103a45752565b91929092825f52600a6020526141d681610fc38660405f209061ffff165f5260205260405f2090565b546001600160801b03811694859490918515908115614270575b506142625761421061422192610f03600d935f52600960205260405f2090565b015460481c6001600160a01b031690565b6001600160a01b0390811691161461425857622625a08293105f1461424c5761146a825b8093613f9e565b61146a622625a0614245565b5f92508291508190565b5050509150505f905f905f90565b60c01c60ff1690505f6141f0565b3561146a816107e6565b9060405161429581613e01565b604060ff8294546142a8828216856141a1565b818160081c16602085015260101c161515910152565b3561146a816107f7565b3561146a81610e73565b3561146a81610703565b3561146a81612f80565b903590601e198136030182121561030e57018035906001600160401b03821161030e5760200191813603831361030e57565b9291926001600160401b038211613dfc5760405191614341601f8201601f191660200184613e38565b82948184528183011161030e578281602093845f960137010152565b815161047092916144d29161014091600491614399906001600160a01b03165b82546001600160a01b0319166001600160a01b03909116178255565b60208501516001820180546001600160a01b0319166001600160a01b03928316179055604086015161443b9160028401916143d4911661437d565b6143ff6143e5606089015160ff1690565b825460ff60a01b191660a09190911b60ff60a01b16178255565b61441660808801516144108161039a565b8261405c565b60a087015161ffff16815461ffff60b01b191660b09190911b61ffff60b01b16179055565b60c08501516003820155019261446b61445960e083015161ffff1690565b855461ffff191661ffff909116178555565b61449861447e61010083015161ffff1690565b855463ffff0000191660109190911b63ffff000016178555565b6144c96144ab61012083015161ffff1690565b855465ffff00000000191660209190911b65ffff0000000016178555565b015161ffff1690565b67ffff00000000000082549160301b169067ffff0000000000001916179055565b6001600160401b03610e10911602906001600160401b038216918203613fbe57565b9061047061468a600e614526613e69565b94614565614555825461454f614542826001600160801b031690565b6001600160801b03168a52565b60801c90565b6001600160801b03166020880152565b6145bb6145ab6001830154614593614583826001600160401b031690565b6001600160401b031660408b0152565b6001600160401b03604082901c1660608a015261454f565b6001600160801b03166080880152565b60028101546001600160a01b03811660a08801526145f6906145e69060a01c6001600160401b031690565b6001600160401b031660c0880152565b61460260038201613e9b565b60e087015261465e61464d600d83015461462a61461f8260ff1690565b60ff166101008b0152565b6001600160401b03600882901c166101208a015260481c6001600160a01b031690565b6001600160a01b0316610140880152565b01546001600160801b0381166101608601526001600160401b03608082901c1661018086015260c01c90565b6001600160401b03166101a0840152565b61ffff1661ffff8114613fbe5760010190565b805f52600860205260405f20905f5260096020526146f46146ea600260405f209301549261ffff8460b01c1661ffff165f5260205260405f2090565b9160a81c60ff1690565b906146fe8261039a565b8115614708575090565b60010154614722604082901c6001600160401b03166109d1565b42101561474b5761473b906001600160401b03166109d1565b4210156147455790565b50600190565b5050600290565b5f198114613fbe5760010190565b9392919091421161488a576001600160a01b0384165f908152600d60205260409020540361487b5760405161190160f01b602082019081527f0000000000000000000000000000000000000000000000000000000000000000602283015260428201929092526147d38160628101611752565b51902060418251036148745760208281015160408085015160609586015182519586525f90811a868601529185019290925293830152828052919060809060015afa15610c07575f516001600160a01b03168015908115614860575b5061485b576001600160a01b03165f908152600d602052604090206148548154614752565b9055600190565b505f90565b6001600160a01b038316141590505f61482f565b5050505f90565b631f6d5aef60e01b5f5260045ffd5b630819bdcd60e01b5f5260045ffd5b906148b0600754610ec760ff8260a01c1615613eda565b6007556148c5825f52600860205260405f2090565b926148dc82610f03855f52600960205260405f2090565b9060018201916148f783546001600160401b039060401c1690565b6001600160401b03811615908115614a0b575b506112c8576002860195614923875460ff9060a81c1690565b61492c8161039a565b80151590816149f6575b506112a4575461494e906001600160a01b0316610a1f565b3314611295576001600160801b0382161580156149dd575b611267575f93602061498b610fd833610fc385610f038c5f52600a60205260405f2090565b03925af1918215610c07576111736149cb937f8710d97d6d0a65a90831480baf2257740c8a4219be781bc0f3bd9d9f4405a60c975f916112065750614a5a565b0390a36007805460ff60a01b19169055565b506149ef61107d611288835460801c90565b1515614966565b60019150614a038161039a565b14155f614936565b6001600160401b031690504210155f61490a565b906001600160801b03169081156140f6576001600160801b03160690565b6001600160401b03166001600160401b038114613fbe5760010190565b15614a6157565b60405162461bcd60e51b81526020600482015260146024820152731554d110c81d1c985b9cd9995c8819985a5b195960621b6044820152606490fd5b8015613fbe575f190190565b5f19810191908211613fbe57565b929190614ad081610f03865f52600960205260405f2090565b93614aeb83610fc384610f03855f52600a60205260405f2090565b60039590950194906001600160a01b0384165f5b600a8110614ca6575b5050600a915f935b600a8510614ba2575b5050509050600a8110614b2d575b50509050565b60095b818111614b725750614b4690614b6a9394613f7b565b81546001600160a01b0393841660039290921b91821b9390911b1916919091179055565b805f80614b27565b80614b98614b8e610a0a614b88614b9d95614aa9565b89613f7b565b614b468389613f7b565b614a9d565b614b30565b614bb2610a1f610a0a878b613f7b565b614bc35750505050805f8080614b19565b90919293614c01614be083610f03875f52600a60205260405f2090565b614bed610a0a848c613f7b565b60018060a01b03165f5260205260405f2090565b83546001600160801b03811691546001600160801b03614c2281831661107d565b931692808411938415614c52575b50505050614c445760010193929190614b10565b9350505050805f8080614b19565b1492509082614c67575b50505f808080614c30565b6001600160401b039192506109d1614c8c614c9c926001600160401b039060801c1690565b9360801c6001600160401b031690565b9116105f80614c5c565b81614cbd610a1f610a0a848c9b9a9998969b613f7b565b14614cd057600101959092939495614aff565b614cf991929394959650614ce49088613f7b565b81549060018060a01b039060031b1b19169055565b905f80614b0856fe922acbe43d31b5fd5034cf992ec07d688903a2b2bd95696ea6260682842a5cb6a26469706673582212204f44d6df0e45578ae1c4d03ec146618d2bcb509178a98d9d0adde375f4cb124164736f6c63430008250033","sourceMap":"187:28488:21:-:0;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;:::i;:::-;;;;:::i;:::-;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;699:5;187:28488;;706:6;187:28488;698:57;;187:28488;714:7;187:28488;698:57;;187:28488;723:8;187:28488;698:57;;187:28488;733:9;187:28488;698:57;;187:28488;744:10;698:57;;;187:28488;-1:-1:-1;187:28488:21;;;;;;-1:-1:-1;;187:28488:21;;;-1:-1:-1;;;;;;187:28488:21;;;7286:10;187:28488;;;;7306:26;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;698:57;187:28488;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;7527:95;187:28488;7499:276;;187:28488;;;7640:27;187:28488;;;;;;;7685:14;187:28488;;;;7717:13;187:28488;;;;7756:4;187:28488;;;;;;;;7499:276;;;187:28488;;7499:276;:::i;:::-;187:28488;7476:309;;187:28488;7457:328;187:28488;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;187:28488:21;;;;;-1:-1:-1;187:28488:21;;-1:-1:-1;187:28488:21;;;;;;;-1:-1:-1;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;:::o;:::-;;;-1:-1:-1;;;;;187:28488:21;;;;;;:::o","linkReferences":{}},"deployedBytecode":{"object":"0x60806040526004361015610011575f80fd5b5f3560e01c806305b8849e146102ff57806310ccf4ce146102fa57806315924b5b146102f55780631edbc5be146102f05780631f559e49146102eb57806322ff4bc5146102e657806329d9218c146102e15780632dc0562d146102dc578063352ae5d3146102d75780633644e515146102d25780633e413bee146102cd578063402914f51461027857806345219fe9146102c85780634d1551de146102c35780634fa982d4146102be57806357338779146102b9578063587614dc146102b4578063589f8a5c146102af57806359afbefb146102aa5780635ebd35e9146102a55780636548e9bc146102a05780636df4ed631461029b57806370392479146102965780637a497056146102915780637ecebe001461028c57806380c0e40f1461028757806382982f0614610282578063884df85c1461027d5780638903ab9d146102785780638da5cb5b1461027357806391a0d6061461026e57806395c33652146102695780639bff5ddb146102645780639f34fc801461025f578063a2e2c9c61461025a578063a9ce799114610255578063b2cbc1d514610250578063bb17c1451461024b578063bb9f4ae514610246578063c3dfb74214610241578063c7df14e21461023c578063cb6fc17d14610237578063ceb7fcea14610232578063e2e66c4a1461022d578063e4cbc93f14610228578063f2fde38b146102235763fa2af9da1461021e575f80fd5b613da4565b613d53565b613d19565b613c08565b613beb565b613ae2565b613ab5565b6139f3565b6139b9565b613979565b61375c565b613588565b613488565b613398565b61337b565b613316565b612f91565b612f58565b610e2f565b612ea4565b612554565b612519565b6124de565b612255565b61222d565b612152565b6120e8565b6120ae565b611bc6565b61166f565b6114d3565b61146d565b611325565b6112eb565b610e84565b610e07565b610dcd565b610802565b6107be565b6107a2565b61070f565b6106e8565b610647565b610472565b61034c565b610312565b5f91031261030e57565b5f80fd5b3461030e575f36600319011261030e5760206040517f70a1441cb294819f730830e09301c0bce410da47c48b877ff14bdf036eb76b648152f35b3461030e575f36600319011261030e5760206040517fe62ab933ee16020dfd1e522f3b2fed9d770ddc70c761931d1fce99f7c9301ec38152f35b634e487b7160e01b5f52602160045260245ffd5b600911156103a457565b610386565b9060098210156103a45752565b81516001600160a01b031681526101608101929161047091906101409081906020818101516001600160a01b0316908501526040818101516001600160a01b03169085015260608181015160ff169085015261041a608082015160808601906103a9565b60a08181015161ffff169085015260c081015160c085015261044760e082015160e086019061ffff169052565b6101008181015161ffff16908501526101208181015161ffff1690850152015161ffff16910152565b565b3461030e57602036600319011261030e576004355f61014060405161049681613de0565b8281528260208201528260408201528260608201528260808201528260a08201528260c08201528260e0820152826101008201528261012082015201525f5260086020526105ba60405f206105ae6105a260046104f1613e59565b84546001600160a01b031681529360018101546001600160a01b0316602086015260028101546001600160a01b0381166040870152610564906105599060ff60a082901c16606089015261054f60a882901c60ff1660808a01613e79565b60b01c61ffff1690565b61ffff1660a0870152565b600381015460c0860152015461ffff811660e085015261ffff601082901c1661010085015261ffff602082901c1661012085015260301c61ffff1690565b61ffff16610140830152565b604051918291826103b6565b0390f35b6001600160a01b0391821681529181166020830152909116604082015260ff90911660608201526101608101989796909590949093909290916106059060808801906103a9565b61ffff1660a086015260c085015261ffff1660e0840152610100830161062d9161ffff169052565b61ffff16610120820152610140016104709161ffff169052565b3461030e57602036600319011261030e576004355f90815260086020526040902080546001820154600283015460038401546004909401546001600160a01b039283169491936105ba93169161ffff8216601083901c61ffff16916106b9602085901c61ffff169460301c61ffff1690565b94604051988861ffff8b9a60b01c169260ff8260a81c169260ff8360a01c169260018060a01b0316918c6105be565b3461030e575f36600319011261030e576020604051600a8152f35b61ffff81160361030e57565b3461030e57604036600319011261030e5760043561076e600361076860243561073781610703565b61014094856040516107498282613e38565b3690375f52600960205260405f209061ffff165f5260205260405f2090565b01613e9b565b604051905f825b600a821061078257505050f35b82516001600160a01b031681526020928301926001929092019101610775565b3461030e575f36600319011261030e57602060405161012c8152f35b3461030e575f36600319011261030e576006546040516001600160a01b039091168152602090f35b6001600160a01b0381160361030e57565b60ff81160361030e57565b3461030e5761010036600319011261030e5760243560043561082382610703565b60443590610830826107e6565b606435926084359260a43591610845836107f7565b60045460e4359360c435916001600160a01b03163303610dbe576007548060a01c60ff161561087390613eda565b60ff60a01b1916600160a01b17600755610895865f52600860205260405f2090565b96836108a9885f52600960205260405f2090565b906108bf919061ffff165f5260205260405f2090565b9885856108d48a5f52600a60205260405f2090565b906108ea919061ffff165f5260205260405f2090565b6001600160a01b039091165f908152602091909152604090209685604051808b86868c602085019661091c9488613f26565b03601f198101825261092e9082613e38565b5190209460405194859260208401926109609391604193918352602083015260ff60f81b9060f81b1660408201520190565b03601f19810184526109729084613e38565b61097c9386614760565b15610daf5782546001600160801b03811615610da05760c01c60ff16610d9157600d8601546001600160a01b038381169690604883901c16878114610d825760018901546109dd9060401c6001600160401b03165b6001600160401b031690565b4210915f905f9160035f9c019b5b60ff8116600a811015610d69578c610a2b8f610a0a85610a1f92613f7b565b905460039190911b1c6001600160a01b031690565b6001600160a01b031690565b14610a3c575060010160ff166109eb565b92939495969798999a9b9c505050610a5f610a5960019760ff1690565b60ff1690565b11610d61575b6002610a77915b015460a81c60ff1690565b610a808161039a565b80158015610d4e575b15610c7657505050610c6757610c5857610ac0610b48935b805460ff60c01b1916600160c01b1781555b546001600160801b031690565b91622625a06001600160801b0384161015610c4e5782905b6020610ae48386613f9e565b80926001600160801b038516610c0c575b600754610b0a906001600160a01b0316610a1f565b60405163a9059cbb60e01b81526001600160a01b0390921660048301526001600160801b0390921660248201529687919082905f9082906044820190565b03925af1918215610c0757610b89610bc5937f34a1cd6d071c412628c6cc070fe069904241c91d4427b70c57f0d3d8092ada61975f91610bd8575b5061401e565b6040519485948592936001600160801b03809296958160809561ffff60a089019a1688525f602089015216604087015216606085015216910152565b0390a36007805460ff60a01b191690555b005b610bfa915060203d602011610c00575b610bf28183613e38565b810190613ffe565b5f610b83565b503d610be8565b614013565b6005546001600160a01b03165f908152600c60205260409020610c4990610c4387610c3e83546001600160801b031690565b613fc3565b90613fe3565b610af5565b622625a090610ad8565b631ba168fb60e11b5f5260045ffd5b63085de62560e01b5f5260045ffd5b9091939250610c848161039a565b60038103610caf575015915081610ca7575b50610c6757610ac0610b4893610aa1565b90505f610c96565b610cb88161039a565b600481148015610d3b575b8015610d28575b15610d06575081610cfd575b50610ce9575b50610ac0610b4893610aa1565b6001600160a01b031615610c67575f610cdc565b9050155f610cd6565b60079350809250610d17915061039a565b03610c5857610ac0610b4893610aa1565b50610d328161039a565b60068114610cca565b50610d458161039a565b60058114610cc3565b50610d588161039a565b60018114610a89565b849150610a65565b505095969798999a50610a779192939450600290610a6c565b63384af97960e11b5f5260045ffd5b636507689f60e01b5f5260045ffd5b6312d37ee560e31b5f5260045ffd5b635cd5d23360e01b5f5260045ffd5b63c64891a560e01b5f5260045ffd5b3461030e575f36600319011261030e5760206040517f00000000000000000000000000000000000000000000000000000000000000008152f35b3461030e575f36600319011261030e576007546040516001600160a01b039091168152602090f35b3461030e57602036600319011261030e57600435610e4c816107e6565b60018060a01b03165f52600c60205260206001600160801b0360405f205416604051908152f35b6001600160801b0381160361030e57565b3461030e57606036600319011261030e57602435600435610ea482610703565b60443591610eb183610e73565b610ed7600754610ec760ff8260a01c1615613eda565b60ff60a01b1916600160a01b1790565b600755610eec825f52600860205260405f2090565b92610f1482610f03855f52600960205260405f2090565b9061ffff165f5260205260405f2090565b906001820191610f2f83546001600160401b039060401c1690565b6001600160401b038116159081156112d7575b506112c8576002860195610f5b875460ff9060a81c1690565b610f648161039a565b80151590816112b3575b506112a45754610f86906001600160a01b0316610a1f565b3314611295576001600160801b038216158015611276575b611267575f936020611132610fd833610fc385610f038c5f52600a60205260405f2090565b9060018060a01b03165f5260205260405f2090565b936110e46002610fef87546001600160801b031690565b926001600160801b038416158b146112595761102961102361101c8b610c3e85546001600160801b031690565b8096613fc3565b89613fe3565b0180546110649060a01c6001600160401b0316885467ffffffffffffffff60801b191660809190911b67ffffffffffffffff60801b16178855565b86546001600160801b031661108961107d8b5460801c90565b6001600160801b031690565b6001600160801b03821611611225575b506110a533878d614ab7565b80546110bc9060a01c6001600160401b0316614a3d565b815467ffffffffffffffff60a01b191660a09190911b67ffffffffffffffff60a01b16179055565b6007546110f9906001600160a01b0316610a1f565b6040516323b872dd60e01b81523360048201523060248201526001600160801b0390921660448301529097889283919082906064820190565b03925af1918215610c0757611173610bc5937f8710d97d6d0a65a90831480baf2257740c8a4219be781bc0f3bd9d9f4405a60c975f91611206575b50614a5a565b54966111ab6111a06111906001600160801b038b16975460801c90565b9960801c6001600160401b031690565b915460a81c60ff1690565b976111b58961039a565b604051958695339a159487949096959260a0946001600160801b038092816001600160401b039661ffff60c08c019d168b521660208a01521660408801521660608601521660808401521515910152565b61121f915060203d602011610c0057610bf28183613e38565b5f61116d565b89546001600160801b031660809190911b6001600160801b03191617895580546001600160a01b031916331781555f611099565b6110296110238a8096613fc3565b6369355c7d60e11b5f5260045ffd5b5061128e61107d611288835460801c90565b84614a1f565b1515610f9e565b63363299f560e01b5f5260045ffd5b6363e70a0360e11b5f5260045ffd5b600191506112c08161039a565b14155f610f6e565b638083ad0360e01b5f5260045ffd5b6001600160401b031690504210155f610f42565b3461030e575f36600319011261030e5760206040517f9db65776815962310aadaeca290992a87f97cc1085f7c1fdda7cef9c9ed672658152f35b3461030e575f36600319011261030e5761134b600754610ec760ff8260a01c1615613eda565b600755335f908152600c60205260409020546001600160801b03168015610da057335f908152600c6020526040902080546001600160801b031916905560075461139d906001600160a01b0316610a1f565b60405163a9059cbb60e01b81523360048201526001600160801b038316602482015290602090829060449082905f905af18015610c07576113e4915f91610bd8575061401e565b5f7f34a1cd6d071c412628c6cc070fe069904241c91d4427b70c57f0d3d8092ada6160405180610bc5339580839092916001600160801b036080918160a08501965f8652600260208701521660408501525f606085015216910152565b606090600319011261030e576004359060243561145d81610703565b9060443561146a816107e6565b90565b3461030e5760606114a1610fc361148336611441565b92915f52600a60205260405f209061ffff165f5260205260405f2090565b5460ff604051916001600160801b03811683526001600160401b038160801c16602084015260c01c1615156040820152f35b3461030e5760e036600319011261030e576004356024356114f381610703565b6044359061150082610e73565b60843592606435611510856107f7565b60a4359460c43561154261153086610f03875f52600a60205260405f2090565b335f9081526020919091526040902090565b926001600160801b0361155d8895546001600160801b031690565b1615611609575b600754611579906001600160a01b0316610a1f565b91823b1561030e5760405163d505accf60e01b81523360048201523060248201526001600160801b039095166044860152606485019190915260ff909216608484015260a483019690965260c4820152935f90859081838160e4810103925af1938415610c0757610bd6946115ef575b50614899565b806115fd5f61160393613e38565b80610304565b5f6115e9565b925061162d611627610ab387610f03885f52600960205260405f2090565b87613fc3565b92611564565b60e090600319011261030e576004359060243561164f81610703565b906044359060643590608435611664816107f7565b9060a4359060c43590565b3461030e5761167d36611633565b60045495969590949291906001600160a01b03163303610dbe576116ad600754610ec760ff8260a01c1615613eda565b6007556116c2865f52600860205260405f2090565b946116d988610f03895f52600960205260405f2090565b94600287019560056116f0885460ff9060a81c1690565b6116f98161039a565b03611bb757600e01946117106109d1875460c01c90565b4210610c67576117a49461176061179b6117a09661178d8d8f6117398f5460018060a01b031690565b9586916117528b8b604051958694602086019889613f26565b03601f198101835282613e38565b519020946040519889936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03601f198101875286613e38565b614760565b1590565b610daf57815460ff60a81b1916600360a91b17825554600483015494906001600160801b03166117d861ffff8716826140a1565b6127106001600160801b0391909116049586936117fd61ffff601084901c16846140a1565b6127106001600160801b03919091160494859261182261ffff602083901c16866140a1565b6127106001600160801b039091160493849160301c61ffff1661ffff1661184990876140a1565b6127106001600160801b039091160495869361186491613f9e565b9061186e91613f9e565b9061187891613f9e565b9061188291613f9e565b6005546001600160a01b03165f908152600c6020526040902080549196916118b4908b906001600160801b0316613fc3565b6118bd91613fe3565b6001870180546001600160a01b03165f908152600c6020526040902080546118ef9084906001600160801b0316613fc3565b6118f891613fe3565b82546001600160a01b03165f908152600c6020526040902080546119269086906001600160801b0316613fc3565b61192f91613fe3565b6006546001600160a01b03165f908152600c60205260409020805461195e9087906001600160801b0316613fc3565b61196791613fe3565b6005546040516001600160801b039b909b168b526001600160a01b0316998a905f516020614d025f395f51905f5290602090a2546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a2546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a26006546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a2611abb926001600160801b038316622625a01115611bad5782955b611a4e8785613f9e565b906001600160801b038816611b78575b506007546020908290611a79906001600160a01b0316610a1f565b845460405163a9059cbb60e01b81526001600160a01b0390911660048201526001600160801b03929092166024830152909687919082905f9082906044820190565b03925af1918215610c0757611afb610bc5937f34a1cd6d071c412628c6cc070fe069904241c91d4427b70c57f0d3d8092ada61975f91610bd8575061401e565b60405161ffff8516815287907f4da780139c5868529671c78b61ff6b45d333496dfbff7b99802adc03a5bf50bb90602090a2546001600160a01b0390811616966040519485948592936001600160801b03809296958160809561ffff60a089019a1688526001602089015216604087015216606085015216910152565b6001600160a01b03165f908152600c60205260409020611ba790610c4389610c3e83546001600160801b031690565b5f611a5e565b622625a095611a44565b6338961af360e21b5f5260045ffd5b3461030e57604036600319011261030e57600435602435611be681610703565b6004546001600160a01b03163303610dbe57611c0a825f52600860205260405f2090565b611c2082610f03855f52600960205260405f2090565b9060028101916003611c37845460ff9060a81c1690565b611c408161039a565b03611bb757600d810190815492611c646109d1856001600160401b039060081c1690565b421115610c6757600387920193611c7b9060ff1690565b611c859085613f7b565b905460039190911b1c6001600160a01b0316908187611cac855f52600a60205260405f2090565b90611cc2919061ffff165f5260205260405f2090565b6001600160a01b039091165f908152602091909152604090209060048101918254611cee8161ffff1690565b601082901c61ffff16611d00916140fb565b9060201c61ffff16611d11916140fb565b928154611d24906001600160801b031690565b9361ffff1691611d3483866140a1565b6127106001600160801b03909116049485611d4e91613f9e565b611d5791613fe3565b549080611d6c61ffff601085901c16866140a1565b90611d76916140d8565b9160201c61ffff1661ffff16611d8c90856140a1565b90611d96916140d8565b9182611da28386613f9e565b90611dac91613f9e565b6005546001600160a01b03165f908152600c602052604090208054919291611dde9084906001600160801b0316613fc3565b611de791613fe3565b60010180546001600160a01b03165f908152600c602052604090208054919291611e1b9085906001600160801b0316613fc3565b611e2491613fe3565b89546001600160a01b03165f908152600c602052604090208054611e529086906001600160801b0316613fc3565b611e5b91613fe3565b6005546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a2546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a286546040516001600160801b039290921682526001600160a01b0316905f516020614d025f395f51905f5290602090a26040805161ffff891681526001600160a01b039390931660208401526001600160801b0391909116908201527f2d9fe650fed4bc34d183a408307fc96335fb55e28ed0abc0ead743104ed41e5590606090a2805460ff16611f4b90614111565b815460ff191660ff919091169081178255600a811080159190612080575b5015611fc3575050805460ff60a81b1916600760a81b1790557f95e0459112394ca662d80bd6fca56ebae5a7280f6366ac13165f9c04a10400c490611fbe905b60405161ffff90911681529081906020820190565b0390a2005b7f1a69cbed078a1bb8396654b12216e9752dbfb0b2efed8af79c2a7f65a751713f9391925061204a61203a610a0a611fbe9361202e61200a6001600160401b034216614122565b825468ffffffffffffffff00191660089190911b68ffffffffffffffff0016178255565b549560ff871690613f7b565b9360081c6001600160401b031690565b6040805161ffff90941684526001600160a01b0390941660208401526001600160401b0316928201929092529081906060820190565b6120a6915061208f9084613f7b565b90546001600160a01b039260039290921b1c821690565b16155f611f69565b3461030e575f36600319011261030e5760206040517f20dcca761e9b55e27226d91929b71eefff36ea2520e5a75296d5288a0472c1958152f35b3461030e57602036600319011261030e57600435612105816107e6565b6003546001600160a01b0316330361213957600480546001600160a01b0319166001600160a01b0392909216919091179055005b6330cd747160e01b5f5260045ffd5b8015150361030e57565b3461030e57608036600319011261030e5760043561216f816107e6565b602435600281101561030e57604435612187816107f7565b6064359261219484612148565b6003546001600160a01b03163303612139576121bc604051936121b685613e01565b846141a1565b60ff602084019216825260408301931515845260018060a01b03165f52600b60205260405f2091519260028410156103a457610bd6936122159260ff61ff008654925160081b1692169061ffff19161717835551151590565b815462ff0000191690151560101b62ff000016179055565b3461030e575f36600319011261030e576004546040516001600160a01b039091168152602090f35b3461030e5761226336611633565b919360018060a09795971b03600454163303610dbe5761228b875f52600860205260405f2090565b9160026122a486610f038b5f52600960205260405f2090565b93019360036122b8865460ff9060a81c1690565b6122c18161039a565b03611bb757600d84019788546122e46109d1826001600160401b039060081c1690565b4211610c675760ff16936122fe610a0a8660038901613f7b565b986001600160a01b038a16156124cf576123be6117a0956123b08e6123c4996123838e6117528a8a6040519586946020860198899160a09361ffff60ff92989796939860c08601997f9db65776815962310aadaeca290992a87f97cc1085f7c1fdda7cef9c9ed672658752602087015216604085015216606083015260808201520152565b519020936040519788936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b03601f198101865285613e38565b89614760565b6124cf5784547fffffff0000000000000000000000000000000000000000ffffffffffffffffff16604885901b6901000000000000000000600160e81b0316179094557ff3e44fc950793ff0f632c33a7decfb8e7cbdf1fd17ca04b46b65c03b1525a9a9936124a99161246f9061245c600e612453610ab389610fc38a610f038f5f52600a60205260405f2090565b94019384613fe3565b805460ff60a81b1916600160aa1b179055565b6124816001600160401b034216614141565b815467ffffffffffffffff60801b191660809190911b67ffffffffffffffff60801b16179055565b6040805161ffff90921682526001600160a01b0390921660208201529081908101611fbe565b632922347560e01b5f5260045ffd5b3461030e57602036600319011261030e576004356124fb816107e6565b60018060a01b03165f52600d602052602060405f2054604051908152f35b3461030e5760606001600160801b038061253b61253536611441565b916141ad565b9193908160405195168552166020840152166040820152f35b3461030e57602036600319011261030e576004356001600160401b03811161030e57806004016102a0600319833603011261030e576004546001600160a01b03163303610dbe5780359160018060a01b036125c76125ba855f52600860205260405f2090565b546001600160a01b031690565b16612d4757604481016125fd6125f86125df8361427e565b6001600160a01b03165f908152600b6020526040902090565b614288565b9060648301916126126125f86125df8561427e565b6126226117a06040840151151590565b908115612d27575b8115612d0f575b8115612cf2575b50612ce3576020015160ff1692608481019360ff612658610a59876142be565b911603612cd45760c48101916001600160801b03612675846142c8565b1615612c795760e48201935f805b60068110612c88575b5015612c79576126a361269e866142c8565b614080565b6001600160801b036126b761107d876142c8565b911611612c6a57610124830191600c61ffff6126d2856142d2565b16108015612c54575b612c45576001600160401b034216966126fc6126f689614141565b98614161565b6101048601986001600160401b03806127148c6142dc565b9216911610908115612c26575b50612c1757899861283f6117a0878a8c61279e61274f6127496127438f6142c8565b946142c8565b926142dc565b9161175261275c8d6142d2565b60405194859360208501978892936001600160401b0361ffff9296956001600160801b0360609581608089019a16885216602087015216604085015216910152565b5190206101c4820135809e61022484013591612815610244860135946117528686604051958694602086019889919260a093969594919660c08401977f20dcca761e9b55e27226d91929b71eefff36ea2520e5a75296d5288a0472c195855260208501526040840152606083015260808201520152565b5190206128396128326101e461282a8d61427e565b9601896142e6565b3691614318565b93614760565b610daf57610264860135809a8c61028489013592839160405192839260208401956128a793879094939260809260a08301967fe62ab933ee16020dfd1e522f3b2fed9d770ddc70c761931d1fce99f7c9301ec384526020840152604083015260608201520152565b03601f19810182526128b99082613e38565b51902090602488019b6128cb8d61427e565b936102048a016128da916142e6565b36906128e592614318565b926128ef94614760565b15610daf5789946128ff8a61427e565b906129098461427e565b906129138661427e565b9361291d906142be565b60a4820135949061293161014484016142d2565b9061293f61016485016142d2565b9261294d61018486016142d2565b946101a40161295b906142d2565b95612964613e59565b6001600160a01b0390981688526001600160a01b031660208801526001600160a01b0316604087015260ff1660608601525f6080860152600160a086015260c0850186905261ffff1660e085015261ffff1661010084015261ffff1661012083015261ffff166101408201526129e2865f52600860205260405f2090565b906129ec9161435d565b6129f5886142dc565b6129fe856142d2565b61ffff16612a0b906144f3565b612a1491614181565b98612a27865f52600960205260405f2090565b612a399060015f5260205260405f2090565b612a42886142c8565b612a4c9082613fe3565b612a55896142c8565b81546001600160801b031660809190911b6001600160801b0319161781558a612a7d8b6142dc565b9160010191612aa29083906001600160401b03166001600160401b0319825416179055565b81546fffffffffffffffff0000000000000000191660409190911b67ffffffffffffffff60401b16179055612ad69061427e565b91612ae09061427e565b92612aea9061427e565b93612af4876142c8565b612afd896142c8565b90612b078b6142dc565b92612b11906142d2565b604080516001600160a01b0397881681529787166020890152979095169686019690965260608501929092526001600160801b039485166080850152931660a08301526001600160401b0390921660c082015261ffff90911660e08201527f4ab7a6b488470d4370897014e19f3fd08de55ad3a6ca063902ce9ace3e8ea06f9061010090a2612b9f906142c8565b90612ba9906142c8565b91612bb3906142dc565b60408051600181526001600160801b03938416602082015293909216918301919091526001600160401b0390811660608301529190911660808201527f8a3ebe889eebb8524907930cc397b1fcfc6ea957cb26726f3894f753a007175b9060a090a2005b63126a2a7160e21b5f5260045ffd5b90506001600160401b0380612c3a8b6142dc565b92169116115f612721565b637616640160e01b5f5260045ffd5b50603061ffff612c63856142d2565b16116126db565b6334506cf160e11b5f5260045ffd5b635899c0df60e11b5f5260045ffd5b612c91876142c8565b6001600160801b03612cbb61107d612ca88561395c565b90546001600160801b039160031b1c1690565b911614612cca57600101612683565b505060015f61268c565b636ffb179360e11b5f5260045ffd5b633986d5d160e21b5f5260045ffd5b905051612cfe8161330c565b612d078161330c565b15155f612638565b9050612d216117a06040830151151590565b90612631565b905060018251612d368161330c565b612d3f8161330c565b14159061262a565b632da2f89160e01b5f5260045ffd5b905f905b600a8210612d6757505050565b82516001600160a01b031681526020928301926001929092019101612d5a565b610470909291926102c06101a06102e0830195612dad8482516001600160801b03169052565b6020818101516001600160801b0316908501526040818101516001600160401b0316908501526060818101516001600160401b0316908501526080818101516001600160801b03169085015260a0818101516001600160a01b03169085015260c0818101516001600160401b031690850152612e3160e082015160e0860190612d56565b61010081015160ff166102208501526101208101516001600160401b03166102408501526101408101516001600160a01b03166102608501526101608101516001600160801b03166102808501526101808101516001600160401b03166102a085015201516001600160401b0316910152565b3461030e57604036600319011261030e576105ba612f4c612f47602435610f03600435612ed083610703565b5f6101a0604051612ee081613e1c565b8281528260208201528260408201528260608201528260808201528260a08201528260c0820152612f0f613e85565b60e0820152826101008201528261012082015282610140820152826101608201528261018082015201525f52600960205260405f2090565b614515565b60405191829182612d87565b3461030e575f36600319011261030e576003546040516001600160a01b039091168152602090f35b6001600160401b0381160361030e57565b3461030e5761014036600319011261030e57600435602435612fb281610e73565b60443590612fbf82610e73565b60643591612fcc83612f80565b608435612fd881610703565b60a4359060e43560c435612feb826107f7565b600454610104359161012435916001600160a01b03163303610dbe576130198a5f52600860205260405f2090565b9560028701966007613030895460ff9060a81c1690565b6130398161039a565b03611bb7576130e09561179b6117a09661178d8f6130b6906040516130a5816117528c8c60208401968760809194939260a08201957fe62ab933ee16020dfd1e522f3b2fed9d770ddc70c761931d1fce99f7c9301ec3835260208301525f604083015260608201520152565b51902095546001600160a01b031690565b936040519889936020850191604193918352602083015260ff60f81b9060f81b1660408201520190565b610daf576001600160801b0384168015612c79575f6001600160801b038516815b600681106132e3575b505015612c795761311d61107d85614080565b11612c6a5761ffff1691600c831080156132d9575b612c45576001600160401b03421661315261314c82614141565b91614161565b906001600160401b03808816911681109182156132c6575b5050612c17577f8a3ebe889eebb8524907930cc397b1fcfc6ea957cb26726f3894f753a007175b946131f86131f26131ec856131d66131ba6131b5611fbe995461ffff9060b01c1690565b61469b565b825461ffff60b01b191660b09190911b61ffff60b01b16178255565b805460ff60a81b191681555460b01c61ffff1690565b956144f3565b82614181565b9161327f83600161321588610f038d5f52600960205260405f2090565b61321f8a82613fe3565b80546001600160801b0316608086901b6001600160801b03191617815501805467ffffffffffffffff19166001600160401b0386161781559067ffffffffffffffff60401b82549160401b169067ffffffffffffffff60401b1916179055565b60405195869586936001600160401b0392906001600160801b036080958186949a99959a61ffff60a08b019c168a5216602089015216604087015216606085015216910152565b6001600160401b03161090505f8061316a565b5060308311613132565b6132f261107d612ca88361395c565b821461330057600101613101565b50505060015f8061310a565b600211156103a457565b3461030e57602036600319011261030e57600435613333816107e6565b6001600160a01b03165f908152600b60205260409081902054905160ff821660028110156103a45760609260ff918352818160081c16602084015260101c1615156040820152f35b3461030e575f36600319011261030e576020604051622625a08152f35b3461030e575f36600319011261030e57602060405162093a808152f35b9a98969492909d9c9b99979593916101a08c019e6001600160801b03168c526001600160801b031660208c01526001600160401b031660408b01526001600160401b031660608a015260808901613413916001600160801b03169052565b6001600160a01b031660a08801526001600160401b031660c087015260ff1660e08601526001600160401b03166101008501526001600160a01b03166101208401526001600160801b03166101408301526001600160401b031661016082015261018001610470916001600160401b03169052565b3461030e57604036600319011261030e576134c76024356004356134ab82610703565b5f52600960205260405f209061ffff165f5260205260405f2090565b80546105ba6001830154926134dc8460801c90565b60028201549091906135016001600160a01b0382169160a01c6001600160401b031690565b91600d8101546135118160ff1690565b600e613534600884901c6001600160401b03169360481c6001600160a01b031690565b930154946001600160801b0386169461355b608088901c6001600160401b03169760c01c90565b976040519b8c9b6001600160401b03808360401c169216908d6001600160801b038260801c9216906133b5565b3461030e5761359636611633565b600454949593946001600160a01b03163303610dbe576135be875f52600860205260405f2090565b946135d585610f038a5f52600960205260405f2090565b96600287019760046135ec8a5460ff9060a81c1690565b6135f58161039a565b03611bb757600e01966136166109d189546001600160401b039060801c1690565b4211610c675761369d9561179b6117a09661178d6130b660018f8861368b8f6117528d6040519485936020850197889094939261ffff60809360a08401977f2942f5266b861ea12a4956265700e7b7c815c702c173b9f908f1dcbd2f0d7ce98552602085015216604083015260608201520152565b5190209601546001600160a01b031690565b610daf57825460ff60a81b1916600560a81b179092557ffbe2a0234e363e279c1e7bcc390660b21bb7f0dcfc4b28a84b91fc304038a90991611fbe9161370f906136ef6001600160401b034216614161565b81546001600160c01b031660c09190911b6001600160c01b031916179055565b60405161ffff8216815284907faf2eb3fc400c696679ea8662a6e866b5fff83674b34b23e8f2194fb4d8762bc990602090a26040805161ffff90921682525f602083015290918291820190565b3461030e57604036600319011261030e5760043560243561377c81610703565b6004546001600160a01b03163303610dbe576137a0825f52600860205260405f2090565b60026137b883610f03865f52600960205260405f2090565b91019081546137d66137cf8261ffff9060b01c1690565b61ffff1690565b61ffff851603611bb75760a81c60ff166137ef8161039a565b611bb757600181015461380d9060401c6001600160401b03166109d1565b4210610c675760405161ffff8416815284907f7ef8df33260d115faed4bd5e09c2995955b443c2949497804badec967227501890602090a26003810180549091906001600160a01b0316613899575050805460ff60a81b1916600760a81b1790557f95e0459112394ca662d80bd6fca56ebae5a7280f6366ac13165f9c04a10400c490611fbe90611fa9565b61204a6139375f600d611fbe946138e07f1a69cbed078a1bb8396654b12216e9752dbfb0b2efed8af79c2a7f65a751713f999798600360a81b60ff60a81b19825416179055565b01805460ff19168155956139236138ff6001600160401b034216614122565b885468ffffffffffffffff00191660089190911b68ffffffffffffffff0016178855565b5460039190911b1c6001600160a01b031690565b935460081c6001600160401b031690565b634e487b7160e01b5f52603260045260245ffd5b9060068210156139745760108260011c9260041b1690565b613948565b3461030e57602036600319011261030e57600435600681101561030e576001600160801b036139a960209261395c565b90549060031b1c16604051908152f35b3461030e575f36600319011261030e5760206040517f2942f5266b861ea12a4956265700e7b7c815c702c173b9f908f1dcbd2f0d7ce98152f35b3461030e576105ba613a41610fc3613a0a36611441565b92915f60408051613a1a81613e01565b82815282602082015201525f52600a60205260405f209061ffff165f5260205260405f2090565b60ff60405191613a5083613e01565b546001600160801b03811683526001600160401b038160801c16602084015260c01c16151560408201526040519182918291909160408060608301946001600160801b0381511684526001600160401b03602082015116602085015201511515910152565b3461030e57602036600319011261030e576020613ad36004356146ae565b613ae060405180926103a9565bf35b3461030e57613af036611633565b90919260018060a01b03600454163303610dbe57613b16875f52600860205260405f2090565b9460028601956007613b2d885460ff9060a81c1690565b613b368161039a565b03611bb757613bab9561179b6117a09661178d6130b660018e888f61368b906117528d6040519485936020850197889094939261ffff60809360a08401977f6e7600d1ee7f86bc396755a2f8d75b802bd69f4fa3198b56fa44fd4d9252074b8552602085015216604083015260608201520152565b610daf57805460ff60a81b1916600160ab1b1790557fd4b9f3ca69d05dfd1b40071e38fb890e88dd42875192bbbf9831e06eb83a67e290611fbe90611fa9565b3461030e575f36600319011261030e5760206040516202a3008152f35b3461030e57604036600319011261030e57600435602435613c2881610703565b6004546001600160a01b03163303610dbe57613c4c825f52600860205260405f2090565b906002613c6582610f03865f52600960205260405f2090565b9201916004613c79845460ff9060a81c1690565b613c828161039a565b03611bb757600e0190613ca36109d183546001600160401b039060801c1690565b421115610c6757825460ff60a81b1916600560a81b179092557ffbe2a0234e363e279c1e7bcc390660b21bb7f0dcfc4b28a84b91fc304038a90991611fbe91613cfd9080546136ef9060801c6001600160401b0316614161565b6040805161ffff90921682526001602083015290918291820190565b3461030e575f36600319011261030e5760206040517f6e7600d1ee7f86bc396755a2f8d75b802bd69f4fa3198b56fa44fd4d9252074b8152f35b3461030e57602036600319011261030e57600435613d70816107e6565b600354906001600160a01b0382163303612139576001600160a01b0316908115612139576001600160a01b03191617600355005b3461030e575f36600319011261030e576005546040516001600160a01b039091168152602090f35b634e487b7160e01b5f52604160045260245ffd5b61016081019081106001600160401b03821117613dfc57604052565b613dcc565b606081019081106001600160401b03821117613dfc57604052565b6101c081019081106001600160401b03821117613dfc57604052565b90601f801991011681019081106001600160401b03821117613dfc57604052565b6040519061047061016083613e38565b604051906104706101c083613e38565b60098210156103a45752565b60405190610140613e968184613e38565b368337565b60405191905f835b600a8210613eba5750505061047061014083613e38565b82546001600160a01b031681526001928301929190910190602001613ea3565b15613ee157565b60405162461bcd60e51b815260206004820152601f60248201527f5265656e7472616e637947756172643a207265656e7472616e742063616c6c006044820152606490fd5b919261ffff60a094979695929760c08501987f70a1441cb294819f730830e09301c0bce410da47c48b877ff14bdf036eb76b6486526020860152166040840152600180851b0316606083015260808201520152565b600a8210156139745701905f90565b634e487b7160e01b5f52601160045260245ffd5b906001600160801b03809116911603906001600160801b038211613fbe57565b613f8a565b906001600160801b03809116911601906001600160801b038211613fbe57565b906001600160801b03166001600160801b0319825416179055565b9081602091031261030e575161146a81612148565b6040513d5f823e3d90fd5b1561402557565b60405162461bcd60e51b815260206004820152600f60248201526e151c985b9cd9995c8819985a5b1959608a1b6044820152606490fd5b9060098110156103a457815460ff60a81b191660a89190911b60ff60a81b16179055565b6001600160801b036014911602906001600160801b038216918203613fbe57565b906001600160801b03809116911602906001600160801b038216918203613fbe57565b634e487b7160e01b5f52601260045260245ffd5b906001600160801b03169081156140f6576001600160801b03160490565b6140c4565b9061ffff8091169116019061ffff8211613fbe57565b60ff1660ff8114613fbe5760010190565b6001600160401b0361012c911601906001600160401b038211613fbe57565b6001600160401b036202a300911601906001600160401b038211613fbe57565b6001600160401b0362093a80911601906001600160401b038211613fbe57565b906001600160401b03809116911601906001600160401b038211613fbe57565b60028210156103a45752565b91929092825f52600a6020526141d681610fc38660405f209061ffff165f5260205260405f2090565b546001600160801b03811694859490918515908115614270575b506142625761421061422192610f03600d935f52600960205260405f2090565b015460481c6001600160a01b031690565b6001600160a01b0390811691161461425857622625a08293105f1461424c5761146a825b8093613f9e565b61146a622625a0614245565b5f92508291508190565b5050509150505f905f905f90565b60c01c60ff1690505f6141f0565b3561146a816107e6565b9060405161429581613e01565b604060ff8294546142a8828216856141a1565b818160081c16602085015260101c161515910152565b3561146a816107f7565b3561146a81610e73565b3561146a81610703565b3561146a81612f80565b903590601e198136030182121561030e57018035906001600160401b03821161030e5760200191813603831361030e57565b9291926001600160401b038211613dfc5760405191614341601f8201601f191660200184613e38565b82948184528183011161030e578281602093845f960137010152565b815161047092916144d29161014091600491614399906001600160a01b03165b82546001600160a01b0319166001600160a01b03909116178255565b60208501516001820180546001600160a01b0319166001600160a01b03928316179055604086015161443b9160028401916143d4911661437d565b6143ff6143e5606089015160ff1690565b825460ff60a01b191660a09190911b60ff60a01b16178255565b61441660808801516144108161039a565b8261405c565b60a087015161ffff16815461ffff60b01b191660b09190911b61ffff60b01b16179055565b60c08501516003820155019261446b61445960e083015161ffff1690565b855461ffff191661ffff909116178555565b61449861447e61010083015161ffff1690565b855463ffff0000191660109190911b63ffff000016178555565b6144c96144ab61012083015161ffff1690565b855465ffff00000000191660209190911b65ffff0000000016178555565b015161ffff1690565b67ffff00000000000082549160301b169067ffff0000000000001916179055565b6001600160401b03610e10911602906001600160401b038216918203613fbe57565b9061047061468a600e614526613e69565b94614565614555825461454f614542826001600160801b031690565b6001600160801b03168a52565b60801c90565b6001600160801b03166020880152565b6145bb6145ab6001830154614593614583826001600160401b031690565b6001600160401b031660408b0152565b6001600160401b03604082901c1660608a015261454f565b6001600160801b03166080880152565b60028101546001600160a01b03811660a08801526145f6906145e69060a01c6001600160401b031690565b6001600160401b031660c0880152565b61460260038201613e9b565b60e087015261465e61464d600d83015461462a61461f8260ff1690565b60ff166101008b0152565b6001600160401b03600882901c166101208a015260481c6001600160a01b031690565b6001600160a01b0316610140880152565b01546001600160801b0381166101608601526001600160401b03608082901c1661018086015260c01c90565b6001600160401b03166101a0840152565b61ffff1661ffff8114613fbe5760010190565b805f52600860205260405f20905f5260096020526146f46146ea600260405f209301549261ffff8460b01c1661ffff165f5260205260405f2090565b9160a81c60ff1690565b906146fe8261039a565b8115614708575090565b60010154614722604082901c6001600160401b03166109d1565b42101561474b5761473b906001600160401b03166109d1565b4210156147455790565b50600190565b5050600290565b5f198114613fbe5760010190565b9392919091421161488a576001600160a01b0384165f908152600d60205260409020540361487b5760405161190160f01b602082019081527f0000000000000000000000000000000000000000000000000000000000000000602283015260428201929092526147d38160628101611752565b51902060418251036148745760208281015160408085015160609586015182519586525f90811a868601529185019290925293830152828052919060809060015afa15610c07575f516001600160a01b03168015908115614860575b5061485b576001600160a01b03165f908152600d602052604090206148548154614752565b9055600190565b505f90565b6001600160a01b038316141590505f61482f565b5050505f90565b631f6d5aef60e01b5f5260045ffd5b630819bdcd60e01b5f5260045ffd5b906148b0600754610ec760ff8260a01c1615613eda565b6007556148c5825f52600860205260405f2090565b926148dc82610f03855f52600960205260405f2090565b9060018201916148f783546001600160401b039060401c1690565b6001600160401b03811615908115614a0b575b506112c8576002860195614923875460ff9060a81c1690565b61492c8161039a565b80151590816149f6575b506112a4575461494e906001600160a01b0316610a1f565b3314611295576001600160801b0382161580156149dd575b611267575f93602061498b610fd833610fc385610f038c5f52600a60205260405f2090565b03925af1918215610c07576111736149cb937f8710d97d6d0a65a90831480baf2257740c8a4219be781bc0f3bd9d9f4405a60c975f916112065750614a5a565b0390a36007805460ff60a01b19169055565b506149ef61107d611288835460801c90565b1515614966565b60019150614a038161039a565b14155f614936565b6001600160401b031690504210155f61490a565b906001600160801b03169081156140f6576001600160801b03160690565b6001600160401b03166001600160401b038114613fbe5760010190565b15614a6157565b60405162461bcd60e51b81526020600482015260146024820152731554d110c81d1c985b9cd9995c8819985a5b195960621b6044820152606490fd5b8015613fbe575f190190565b5f19810191908211613fbe57565b929190614ad081610f03865f52600960205260405f2090565b93614aeb83610fc384610f03855f52600a60205260405f2090565b60039590950194906001600160a01b0384165f5b600a8110614ca6575b5050600a915f935b600a8510614ba2575b5050509050600a8110614b2d575b50509050565b60095b818111614b725750614b4690614b6a9394613f7b565b81546001600160a01b0393841660039290921b91821b9390911b1916919091179055565b805f80614b27565b80614b98614b8e610a0a614b88614b9d95614aa9565b89613f7b565b614b468389613f7b565b614a9d565b614b30565b614bb2610a1f610a0a878b613f7b565b614bc35750505050805f8080614b19565b90919293614c01614be083610f03875f52600a60205260405f2090565b614bed610a0a848c613f7b565b60018060a01b03165f5260205260405f2090565b83546001600160801b03811691546001600160801b03614c2281831661107d565b931692808411938415614c52575b50505050614c445760010193929190614b10565b9350505050805f8080614b19565b1492509082614c67575b50505f808080614c30565b6001600160401b039192506109d1614c8c614c9c926001600160401b039060801c1690565b9360801c6001600160401b031690565b9116105f80614c5c565b81614cbd610a1f610a0a848c9b9a9998969b613f7b565b14614cd057600101959092939495614aff565b614cf991929394959650614ce49088613f7b565b81549060018060a01b039060031b1b19169055565b905f80614b0856fe922acbe43d31b5fd5034cf992ec07d688903a2b2bd95696ea6260682842a5cb6a26469706673582212204f44d6df0e45578ae1c4d03ec146618d2bcb509178a98d9d0adde375f4cb124164736f6c63430008250033","sourceMap":"187:28488:21:-:0;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;:::i;:::-;;;;;;;:::o;:::-;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;4271:107;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;3683:107;187:28488;;;;;;;;;;;;;;;;;-1:-1:-1;187:28488:21;;;:::o;:::-;;:::i;:::-;;;;;;;;;:::o;:::-;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::o;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;-1:-1:-1;187:28488:21;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;187:28488:21;8430:8;187:28488;;;;-1:-1:-1;187:28488:21;;;;;;:::i;:::-;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;-1:-1:-1;187:28488:21;;;2936:43;187:28488;;;;;;;;2936:43;;187:28488;2936:43;;;187:28488;2936:43;;;187:28488;;2936:43;;;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;370:2;187:28488;;;;;;;;;;:::o;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;8728:36;:27;187:28488;;;;;:::i;:::-;;;;;;;;;;:::i;:::-;;;;-1:-1:-1;187:28488:21;8728:6;187:28488;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;8728:27;:36;187:28488;:::i;:::-;;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;419:9;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;2850:24;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;:::o;:::-;;;;;;;:::o;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;;;;;;:::i;:::-;;;;;;;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;6940:6;187:28488;;;;;;6939:7;6931:51;;;:::i;:::-;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;6940:6;187:28488;22497:20;;187:28488;;22497:8;187:28488;;;;;;;22497:20;22553:18;;;;187:28488;;22553:6;187:28488;;;;;;;22553:18;:27;;;187:28488;;;;;;;;;;;;22553:27;22618:18;;;;;187:28488;;22618:6;187:28488;;;;;;;22618:18;:27;;;187:28488;;;;;;;;;;;;22618:27;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;22695:81;;;;;187:28488;22695:81;;;;;;;:::i;:::-;;;;;;;;;;;;:::i;:::-;187:28488;22685:92;;187:28488;;;22838:25;;;187:28488;22838:25;;;;;187:28488;;;;;;;;;;;;;;;;;;;;;;;;22838:25;;22695:81;;22838:25;;;;;;;;:::i;:::-;22792:72;;;;:::i;:::-;22791:73;22787:100;;187:28488;;-1:-1:-1;;;;;187:28488:21;;22902:22;22898:51;;187:28488;;;;22959:52;;23035:16;;;187:28488;-1:-1:-1;;;;;187:28488:21;;;;23025:26;187:28488;;;;;23025:26;;;23021:61;;7001:4;23128:17;;187:28488;23109:36;;187:28488;;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;187:28488:21;;;23109:36;:15;:36;23155:20;-1:-1:-1;23185:24:21;-1:-1:-1;23233:11:21;23277:18;-1:-1:-1;23277:18:21;;23228:231;23254:3;187:28488;;;22618:6;23246;;;;;23277:21;:31;:21;;;187:28488;23277:21;;:::i;:::-;187:28488;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;23277:31;;23273:176;;-1:-1:-1;7001:4:21;187:28488;;;23233:11;;23273:176;23328:14;;;;;;;;;;;;;;23364:27;187:28488;7001:4;187:28488;;;;;;;;;;23364:27;-1:-1:-1;23360:51:21;;23273:176;23473:8;187:28488;23429:5;23228:231;23473:8;187:28488;;;;;;;;;;;:::i;:::-;23473:28;;:55;;;;23228:231;23469:662;;;23544:32;;;;;23591:35;;187:28488;24388:26;23469:662;;187:28488;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;24141:28;187:28488;-1:-1:-1;;;;;187:28488:21;;;;24236:43;585:5;-1:-1:-1;;;;;187:28488:21;;24236:20;585:5;;;24236:43;;;187:28488;24303:11;;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;24325:45;;24236:43;6940:6;187:28488;24388:13;;-1:-1:-1;;;;;187:28488:21;;;24388:13;187:28488;;-1:-1:-1;;;24388:26:21;;-1:-1:-1;;;;;187:28488:21;;;;24388:26;;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;24388:26;;;;;;;;;;24380:54;24451:59;24388:26;24451:59;24388:26;-1:-1:-1;24388:26:21;;;24236:43;24380:54;;:::i;:::-;187:28488;;24451:59;;;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;22902:17;187:28488;;;;;;;;;;;;;;;;;;;24451:59;;;;6940:6;187:28488;;-1:-1:-1;;;;187:28488:21;;;7026:14;187:28488;24388:26;;;;187:28488;24388:26;187:28488;24388:26;;;;;;;;:::i;:::-;;;;;:::i;:::-;;;;;;;;;;;:::i;24325:45::-;24348:14;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;24338:32;;;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;;24338:32;:::i;:::-;;;:::i;:::-;24325:45;;24236:43;585:5;24236:43;;;23591:35;24105:15;;;-1:-1:-1;23611:15:21;187:28488;-1:-1:-1;23611:15:21;23544:32;23959:10;;;-1:-1:-1;23566:10:21;187:28488;-1:-1:-1;23566:10:21;23469:662;187:28488;;;;;;;;:::i;:::-;23277:18;23648:27;;23277:18;;-1:-1:-1;23695:12:21;;-1:-1:-1;23695:12:21;:23;;23644:487;23691:46;;;187:28488;24388:26;23644:487;23469:662;;23695:23;;;;;;23644:487;187:28488;;;:::i;:::-;;23759:29;;:64;;;;23644:487;23759:94;;;;23644:487;23755:376;;;23873:23;;;;23755:376;23869:115;;;23755:376;;187:28488;24388:26;23755:376;23469:662;;23869:115;-1:-1:-1;;;;;187:28488:21;23920:30;23916:53;;23869:115;;;23873:23;23884:12;;;23873:23;;;23755:376;6940:6;187:28488;;;;;;;;;:::i;:::-;24004:28;24000:131;;187:28488;24388:26;23755:376;23469:662;;23759:94;187:28488;;;;:::i;:::-;23839:14;23827:26;;23759:94;;:64;187:28488;;;;:::i;:::-;23804:19;23792:31;;23759:64;;23473:55;187:28488;;;;:::i;:::-;7001:4;23505:23;;23473:55;;23360:51;23393:18;;-1:-1:-1;23360:51:21;;23246:6;;;;;;;;;;187:28488;23246:6;;;;;23473:8;23246:6;;;23021:61;23060:22;;;-1:-1:-1;23060:22:21;187:28488;-1:-1:-1;23060:22:21;22959:52;22993:18;;;-1:-1:-1;22993:18:21;187:28488;-1:-1:-1;22993:18:21;22898:51;22933:16;;;-1:-1:-1;22933:16:21;187:28488;-1:-1:-1;22933:16:21;22787:100;22873:14;;;-1:-1:-1;22873:14:21;187:28488;-1:-1:-1;22873:14:21;6834:52;6874:12;;;-1:-1:-1;6874:12:21;187:28488;-1:-1:-1;6874:12:21;187:28488;;;;;;-1:-1:-1;;187:28488:21;;;;;;;3402:41;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;2880:24;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;:::i;:::-;;;;;;;-1:-1:-1;187:28488:21;3182:44;187:28488;;;-1:-1:-1;;;;;187:28488:21;-1:-1:-1;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;:::o;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;6940:6;187:28488;6931:51;187:28488;;;;;6939:7;6931:51;:::i;:::-;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;;6940:6;187:28488;16021:20;;187:28488;;22497:8;187:28488;;;;;;;16021:20;16069:18;:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;16069:18;187:28488;;;;;;;;;;;;16069:27;16111:9;7001:4;16111:9;;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;16111:14;:46;;;;;187:28488;16107:74;;;16195:8;;;187:28488;;;;;;;;;;;;;;;:::i;:::-;16195:28;;;:55;;;;187:28488;16191:88;;;187:28488;16293:25;;-1:-1:-1;;;;;187:28488:21;;;16293:25;:10;:25;16289:58;;-1:-1:-1;;;;;187:28488:21;;16361:11;:43;;;;187:28488;16357:80;;-1:-1:-1;16293:10:21;187:28488;16894:61;16466:39;16293:10;16466:27;:18;;;187:28488;;22618:6;187:28488;;;;;;;16466:27;187:28488;;;;;;;;;;;;;;;;16466:39;187:28488;16865:10;16195:8;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;16542:12;-1:-1:-1;;;;;187:28488:21;;16542:12;16541:50;;;;16602:26;;16559:22;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;16559:22;16541:50;;16602:26;:::i;:::-;;;:::i;:::-;16653:8;187:28488;;16638:23;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;-1:-1:-1;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;;16638:23;187:28488;;-1:-1:-1;;;;;187:28488:21;16684:22;187:28488;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;16684:22;-1:-1:-1;;;;;187:28488:21;;16684:22;16680:117;;16541:50;16293:10;16844;16293;16844;;;:::i;:::-;187:28488;;16865:10;;187:28488;;-1:-1:-1;;;;;187:28488:21;16865:10;:::i;:::-;187:28488;;-1:-1:-1;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;;16865:10;6940:6;187:28488;16894:17;;-1:-1:-1;;;;;187:28488:21;;;16894:17;187:28488;;-1:-1:-1;;;16894:61:21;;16293:10;187:28488;16894:61;;187:28488;16932:4;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;16894:61;;;;;;;;;;16886:94;16996:119;16894:61;16996:119;16894:61;-1:-1:-1;16894:61:21;;;16541:50;16886:94;;:::i;:::-;187:28488;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;:::i;:::-;;;16293:10;;;;17085:28;;16996:119;;187:28488;;;;;;;-1:-1:-1;;;;;187:28488:21;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;16894:61;;;;187:28488;16894:61;187:28488;16894:61;;;;;;;:::i;:::-;;;;16680:117;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;;187:28488:21;16293:10;187:28488;;;16680:117;;;16541:50;16602:26;;16541:50;;;16602:26;:::i;16357:80::-;16413:24;;;-1:-1:-1;16413:24:21;187:28488;-1:-1:-1;16413:24:21;16361:43;187:28488;16376:28;:23;187:28488;;;;;;;;16376:23;;:::i;:28::-;;;16361:43;;16289:58;16327:20;;;-1:-1:-1;16327:20:21;187:28488;-1:-1:-1;16327:20:21;16191:88;16259:20;;;-1:-1:-1;16259:20:21;187:28488;-1:-1:-1;16259:20:21;16195:55;7001:4;187:28488;;;;;:::i;:::-;16227:23;;16195:55;;;16107:74;16166:15;;;-1:-1:-1;16166:15:21;187:28488;-1:-1:-1;16166:15:21;16111:46;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;16129:15:21;:28;;16111:46;;;187:28488;;;;;;-1:-1:-1;;187:28488:21;;;;;;;3842:97;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;6940:6;187:28488;6931:51;187:28488;;;;;6939:7;6931:51;:::i;187:28488::-;6940:6;187:28488;26465:10;187:28488;;;;24338:9;187:28488;;;;;;-1:-1:-1;;;;;187:28488:21;26490:11;;26486:40;;26465:10;187:28488;;;;24338:9;187:28488;;;;;;;-1:-1:-1;;;;;;187:28488:21;;;6940:6;187:28488;26580:13;;-1:-1:-1;;;;;187:28488:21;;;26580:13;187:28488;;-1:-1:-1;;;26580:33:21;;26465:10;187:28488;26580:33;;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;26580:33;;187:28488;;;;;;-1:-1:-1;;26580:33:21;;;;;;26572:61;26580:33;187:28488;26580:33;;;26572:61;;:::i;:::-;187:28488;26649:59;187:28488;;26465:10;26649:59;26465:10;26649:59;;;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;26687:1;187:28488;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;:::o;:::-;;;;;3049:78;;187:28488;;;:::i;:::-;;;-1:-1:-1;187:28488:21;3049:78;187:28488;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;3049:78;187:28488;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;;:::i;:::-;;;;;;15582:39;:27;:18;;;187:28488;;22618:6;187:28488;;;;;;;15582:27;15610:10;187:28488;;;;;;;;;;;;;;15582:39;15631:30;-1:-1:-1;;;;;187:28488:21;15631:30;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;15675:22;15671:84;;187:28488;15765:4;187:28488;15765:11;;-1:-1:-1;;;;;187:28488:21;;;15765:11;:72;;;;;;187:28488;;-1:-1:-1;;;15765:72:21;;15610:10;187:28488;15765:72;;187:28488;15797:4;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;-1:-1:-1;187:28488:21;;;;15765:72;;;;;;;;;15898:1224;15765:72;;;187:28488;15898:1224;;:::i;15765:72::-;;;-1:-1:-1;15765:72:21;;;:::i;:::-;;;:::i;:::-;;;;15671:84;15716:18;;15699:56;15716:39;:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;15716:39;15699:56;;:::i;:::-;15671:84;;;187:28488;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;:::i;:::-;;;;;;;;:::o;:::-;;;;;;;:::i;:::-;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;187:28488;6940:6;187:28488;6931:51;187:28488;;;;;6939:7;6931:51;:::i;187:28488::-;6940:6;187:28488;24712:20;;187:28488;;22497:8;187:28488;;;;;;;24712:20;24768:18;:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;24768:27;24818:8;;;;187:28488;24830:19;187:28488;;;;;;;;;;;;;;:::i;:::-;24818:31;24814:56;;24902:24;;187:28488;24884:42;187:28488;;;;;;;24884:42;:15;:42;24880:65;;25088:78;187:28488;24987:86;25140:25;25089:77;187:28488;25140:25;187:28488;;;;;;;;;;;;;;;;;24987:86;187:28488;;;;24987:86;;;;;;;;;:::i;:::-;;22695:81;;24987:86;;;;;;:::i;:::-;187:28488;24977:97;;187:28488;;;25140:25;;;24987:86;25140:25;;187:28488;;;;;;;;;;;;;;;;;;;;;;;;25140:25;;22695:81;;25140:25;;;;;;:::i;:::-;25089:77;:::i;:::-;25088:78;;187:28488;25088:78;25084:105;;187:28488;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;;;25313:13;;187:28488;;;-1:-1:-1;;;;;187:28488:21;25305:21;187:28488;;;;25305:21;:::i;:::-;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;;25368:22;187:28488;;;;;;25368:22;;:::i;:::-;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;;25429:19;187:28488;;;;;;25429:19;;:::i;:::-;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;25484:16;;;;:::i;:::-;187:28488;-1:-1:-1;;;;;187:28488:21;;;;25544:18;;;;;;:::i;:::-;:32;;;;:::i;:::-;:43;;;;:::i;:::-;:51;;;;:::i;:::-;24830:19;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;;;;;;25606:39;;187:28488;;-1:-1:-1;;;;;187:28488:21;25606:39;:::i;:::-;;;;:::i;:::-;7001:4;25665:11;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;;;25655:37;;187:28488;;-1:-1:-1;;;;;187:28488:21;25655:37;:::i;:::-;;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;;;25702:31;;187:28488;;-1:-1:-1;;;;;187:28488:21;25702:31;:::i;:::-;;;;:::i;:::-;25211:14;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;;;25743:29;;187:28488;;-1:-1:-1;;;;;187:28488:21;25743:29;:::i;:::-;;;;:::i;:::-;24830:19;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;;;;;;;25788:39:21;187:28488;;25788:39;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;;;;;;;25788:39:21;187:28488;;25842:37;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;;;;;;;25788:39:21;187:28488;;25894:31;25211:14;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;;;;;;;25788:39:21;187:28488;;25940:29;26181:31;;-1:-1:-1;;;;;187:28488:21;;585:5;-1:-1:-1;585:5:21;;;25994:61;;;26079:20;;;;:::i;:::-;187:28488;-1:-1:-1;;;;;187:28488:21;;26118:45;;25994:61;-1:-1:-1;6940:6:21;187:28488;24987:86;;187:28488;;26181:13;;-1:-1:-1;;;;;187:28488:21;;;26181:13;187:28488;;;;-1:-1:-1;;;26181:31:21;;-1:-1:-1;;;;;187:28488:21;;;;26181:31;;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;26181:31;;;;;;;;;;26173:59;26291:73;26181:31;26291:73;26181:31;-1:-1:-1;26181:31:21;;;26173:59;;:::i;:::-;187:28488;;;;;;;;;26248:28;;187:28488;;26248:28;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;26291:73;;;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;7001:4;187:28488;;;;;;;;;;;;;;;;;;;26118:45;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;26131:32;;;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;26131:32;26118:45;;;25994:61;585:5;25994:61;;;24814:56;24858:12;;;-1:-1:-1;24858:12:21;187:28488;-1:-1:-1;24858:12:21;187:28488;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;:::i;:::-;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;19329:20;;187:28488;;22497:8;187:28488;;;;;;;19329:20;19377:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;19377:27;19419:8;;;;187:28488;19431:15;187:28488;;;;;;;;;;;;;;:::i;:::-;19419:27;19415:52;;19500:18;;;187:28488;;;;19481:37;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;19481:37;:15;:37;;19477:60;;19431:15;19569:10;;;187:28488;;;;;;;;19569:27;;;;:::i;:::-;187:28488;;;;;;;;-1:-1:-1;;;;;187:28488:21;19629:18;;;;;187:28488;;22618:6;187:28488;;;;;;;19629:18;:27;;;187:28488;;;;;;;;;;;;19629:27;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;19716:13;187:28488;19716:13;;187:28488;;;;;;;;;;;;;;;;19716:30;;;:::i;:::-;187:28488;;;;;19716:44;;;:::i;:::-;187:28488;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;19792:35;;;;;:::i;:::-;187:28488;-1:-1:-1;;;;;187:28488:21;;;;19846:26;;;;;:::i;:::-;;;;:::i;:::-;187:28488;;;19906:27;187:28488;;;;;;19906:27;;:::i;:::-;19905:52;;;;:::i;:::-;187:28488;;;;;;;19987:24;;;;:::i;:::-;19986:49;;;;:::i;:::-;20066:24;;;;;;:::i;:::-;:35;;;;:::i;:::-;20122:14;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;;;;;;20112:39;;187:28488;;-1:-1:-1;;;;;187:28488:21;20112:39;:::i;:::-;;;;:::i;:::-;20171:11;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;;;20171:11;;;20161:37;;187:28488;;-1:-1:-1;;;;;187:28488:21;20161:37;:::i;:::-;;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;24338:9;187:28488;;;;;;;20208:31;;187:28488;;-1:-1:-1;;;;;187:28488:21;20208:31;:::i;:::-;;;;:::i;:::-;20122:14;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;;;;;;;20255:39:21;187:28488;;20255:39;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;;;;;;;20255:39:21;187:28488;;20309:37;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;;;;;;;20255:39:21;187:28488;;20361:31;187:28488;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;20408:53;;187:28488;;20408:53;187:28488;;;;20472:17;;;:::i;:::-;187:28488;;-1:-1:-1;;187:28488:21;;;;;;;;;;;19629:6;-1:-1:-1;;20512:21:21;;;187:28488;20512:66;;187:28488;-1:-1:-1;20508:376:21;;;-1:-1:-1;;187:28488:21;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;20640:29;;;;20594:27;187:28488;;;;;;;;;;;;;;;;20640:29;;;;187:28488;20508:376;20788:85;19481:15;;;;187:28488;;20825:27;20788:85;19481:15;20700:69;20721:48;-1:-1:-1;;;;;19481:15:21;187:28488;20721:48;:::i;:::-;187:28488;;-1:-1:-1;;187:28488:21;;;;;;;;;;;;20700:69;187:28488;;;;;20825:27;;:::i;187:28488::-;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;20512:66;187:28488;20537:27;;;;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;20537:41;20512:66;;;187:28488;;;;;;-1:-1:-1;;187:28488:21;;;;;;;3500:124;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;:::i;:::-;6774:5;187:28488;-1:-1:-1;;;;;187:28488:21;6760:10;:19;6756:42;;187:28488;;;-1:-1:-1;;;;;;187:28488:21;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;6756:42;6788:10;;;-1:-1:-1;6788:10:21;187:28488;-1:-1:-1;6788:10:21;187:28488;;;;;;;:::o;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;6774:5;187:28488;-1:-1:-1;;;;;187:28488:21;6760:10;:19;6756:42;;9782:32;187:28488;;;;;;:::i;:::-;9782:32;;:::i;:::-;187:28488;;9782:32;;187:28488;;;;;9782:32;;187:28488;;;;;;;;;;;-1:-1:-1;187:28488:21;9763:8;187:28488;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;6838:10;:27;6834:52;;18268:20;;187:28488;;22497:8;187:28488;;;;;;;18268:20;18324:18;18366:8;18324:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;18324:27;18366:8;;187:28488;18378:15;187:28488;;;;;;;;;;;;;;:::i;:::-;18366:27;18362:52;;18446:26;;;187:28488;;;18428:44;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;18428:44;:15;:44;18424:67;;187:28488;;18523:18;187:28488;18523:43;:18;18378:15;18523:18;;:43;:::i;187:28488::-;;-1:-1:-1;;;;;187:28488:21;;18580:23;18576:57;;18841:25;18792:75;187:28488;18841:25;187:28488;18791:76;187:28488;18684:92;187:28488;18684:92;187:28488;;;;18684:92;;;;;;;;187:28488;;;;;;;;;;;;;;;3842:97;187:28488;;;;;;;;;;;;;;;;;;;;;;;18684:92;187:28488;18674:103;;187:28488;;;18841:25;;;18684:92;18841:25;;187:28488;;;;;;;;;;;;;;;;;;;;;;;;18841:25;;22695:81;;18841:25;;;;;;:::i;:::-;18792:75;;:::i;18791:76::-;18787:110;;187:28488;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;19160:43;;19062:82;;19024:28;;18946:68;:21;18970:44;:38;18908:28;18970:27;18908:28;18970:18;18908:28;187:28488;;22618:6;187:28488;;;;;;;18970:44;18946:21;;:68;;;:::i;:::-;187:28488;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;;19024:28;19093:51;-1:-1:-1;;;;;18428:15:21;187:28488;19093:51;:::i;:::-;187:28488;;-1:-1:-1;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;;19062:82;187:28488;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;19160:43;187:28488;18787:110;18612:21;;;-1:-1:-1;18876:21:21;187:28488;-1:-1:-1;18876:21:21;187:28488;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;:::i;:::-;;;;;;;-1:-1:-1;187:28488:21;3232:41;187:28488;;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;:::i;:::-;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;187:28488;;;;;;;;10187:32;:22;;187:28488;;22497:8;187:28488;;;;;;;10187:22;187:28488;-1:-1:-1;;;;;187:28488:21;;;10187:32;187:28488;10183:74;;10295:11;;;187:28488;10286:21;10295:11;;;:::i;:::-;-1:-1:-1;;;;;187:28488:21;;;;;10286:8;187:28488;;;;;;;10286:21;187:28488;:::i;:::-;10345:8;;;;;187:28488;10336:18;10345:8;;;:::i;187:28488::-;10368:9;187:28488;10295:11;10369:8;;187:28488;;;;;10368:9;:45;;;;;187:28488;10368:58;;;;187:28488;10368:91;;;;187:28488;10364:126;;;187:28488;10504:10;187:28488;;;10518:10;;;;;187:28488;10504:24;10518:10;;;:::i;10504:24::-;187:28488;;10504:24;10500:55;;10570:13;;;;-1:-1:-1;;;;;10570:13:21;;;:::i;:::-;187:28488;10570:18;10566:49;;10746:14;;;;-1:-1:-1;;10716:5:21;10720:1;10716:5;;;;10699:130;10842:15;;10838:46;;10898:19;:14;;;:::i;:::-;:19;:::i;:::-;-1:-1:-1;;;;;10898:35:21;10920:13;;;:::i;10898:35::-;187:28488;;10898:35;10894:67;;10975:15;;;;10993:2;187:28488;10975:15;;;:::i;:::-;187:28488;10975:20;:44;;;;10699:130;10971:74;;-1:-1:-1;;;;;11088:15:21;187:28488;11081:34;11142:35;11081:34;;;:::i;:::-;11142:35;;:::i;:::-;11191:8;;;;-1:-1:-1;;;;;11191:8:21;;;;:::i;:::-;187:28488;;;;11191:18;:40;;;;;10699:130;11187:70;;;11310:13;;11541:77;11542:76;11310:13;;;11299:68;11341:8;11325:14;11310:13;;;:::i;:::-;11325:14;;:::i;:::-;11341:8;;:::i;:::-;11351:15;11299:68;11351:15;;;:::i;:::-;10295:11;187:28488;11299:68;;;187:28488;11299:68;;;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;11299:68;187:28488;11289:79;;11472:22;;;187:28488;11496:13;;;;;187:28488;11511:14;11409:117;11511:14;;;187:28488;;11409:117;187:28488;;10295:11;187:28488;11409:117;;;187:28488;11409:117;;;;187:28488;;;;;;;;;;;;;3500:124;187:28488;;;;;;;;;;;;;;;;;;;;;11409:117;187:28488;11399:128;;187:28488;11606:11;;11553:8;;;:::i;:::-;11606:11;;;;:::i;:::-;187:28488;;;:::i;:::-;11542:76;;:::i;11541:77::-;11537:104;;11763:16;;;187:28488;11781:17;;;;;;187:28488;;;;10295:11;187:28488;11686:113;;;187:28488;11686:113;;;;;;187:28488;;;;;;;;;;3683:107;187:28488;;;;;;;;;;;;;;;;;11686:113;;22695:81;;11686:113;;;;;;;;:::i;:::-;187:28488;11676:124;;11826:11;;;;;;;;:::i;:::-;11891:14;;;;;;;:::i;:::-;187:28488;;;;;:::i;:::-;11815:91;;;;:::i;:::-;11814:92;11810:119;;11998:11;;;;;:::i;:::-;12022;;;;:::i;:::-;12043:8;;;;:::i;:::-;12063:10;;;;:::i;:::-;12140;;;187:28488;;12140:10;12177:13;;;;;:::i;:::-;12206:14;;;;;;:::i;:::-;12233:11;;;;;;:::i;:::-;12254:8;;;;;;:::i;:::-;187:28488;;;:::i;:::-;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;11965:308;;187:28488;-1:-1:-1;;;;;187:28488:21;10295:11;11965:308;;187:28488;;;10345:8;11965:308;;187:28488;-1:-1:-1;10518:10:21;11965:308;;187:28488;;12140:10;11965:308;;187:28488;10570:13;11965:308;;187:28488;;;;;10746:14;11965:308;;187:28488;;;11191:8;11965:308;;187:28488;;;10975:15;11965:308;;187:28488;;;12177:13;11965:308;;187:28488;11940:22;;187:28488;;22497:8;187:28488;;;;;;;11940:22;187:28488;;;;:::i;:::-;12301:8;;;:::i;:::-;12320:15;;;:::i;:::-;187:28488;;12313:33;;;:::i;:::-;12301:46;;;:::i;:::-;12375:20;;;187:28488;;22553:6;187:28488;;;;;;;12375:20;:23;;187:28488;;;;;;;;;;12375:23;12424:13;;;:::i;:::-;12408:29;;;;:::i;:::-;12464:14;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;;187:28488:21;;;;12499:8;;;;:::i;:::-;12488;187:28488;12488:8;:19;;;;187:28488;-1:-1:-1;;;;;187:28488:21;-1:-1:-1;;;;;187:28488:21;;;;;;;;12488:19;187:28488;;-1:-1:-1;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;12584:11;;;:::i;:::-;12597;;;;:::i;:::-;12610:8;;;;:::i;:::-;12632:13;;;;:::i;:::-;12647:14;;;:::i;:::-;12663:8;;;;:::i;:::-;12673:15;;;;:::i;:::-;10295:11;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;12552:137;;187:28488;;12552:137;12736:13;;;:::i;:::-;12751:14;;;;:::i;:::-;12767:8;;;;:::i;:::-;10295:11;187:28488;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;12704:81;;187:28488;;12704:81;187:28488;11187:70;11240:17;;;-1:-1:-1;11240:17:21;187:28488;-1:-1:-1;11240:17:21;11191:40;11213:8;;-1:-1:-1;;;;;11213:8:21;;;;:::i;:::-;187:28488;;;;11213:18;11191:40;;;10971:74;11028:17;;;-1:-1:-1;11028:17:21;187:28488;-1:-1:-1;11028:17:21;10975:44;10999:15;11017:2;187:28488;10999:15;;;:::i;:::-;187:28488;10999:20;10975:44;;10894:67;10942:19;;;-1:-1:-1;10942:19:21;187:28488;-1:-1:-1;10942:19:21;10838:46;10597:18;;;-1:-1:-1;10866:18:21;187:28488;-1:-1:-1;10866:18:21;10723:3;10746:14;;;:::i;:::-;-1:-1:-1;;;;;10746:38:21;187:28488;10764:20;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;10746:38;187:28488;;10746:38;10742:77;;187:28488;;10704:10;;10742:77;10788:21;;187:28488;10811:5;;;10500:55;10537:18;;;-1:-1:-1;10537:18:21;187:28488;-1:-1:-1;10537:18:21;10364:126;10468:22;;;-1:-1:-1;10468:22:21;187:28488;-1:-1:-1;10468:22:21;10368:91;187:28488;;;;;;:::i;:::-;;;;:::i;:::-;10430:29;;10368:91;;;:58;10418:8;;10417:9;187:28488;10295:11;10418:8;;187:28488;;;;;10417:9;10368:58;;;:45;187:28488;;10392:21;187:28488;;;;;:::i;:::-;;;;:::i;:::-;10381:32;;10368:45;;;10183:74;10242:15;;;-1:-1:-1;10242:15:21;187:28488;-1:-1:-1;10242:15:21;187:28488;;;;;;;;;;;;;:::o;:::-;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;8571:27;187:28488;;8571:18;187:28488;;;;;:::i;:::-;-1:-1:-1;187:28488:21;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;22553:6;187:28488;;;;;;;8571:27;187:28488;:::i;:::-;;;;;;;;:::i;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;2755:20;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;:::o;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;:::i;:::-;;;;;;;;;;;:::i;:::-;6852:13;187:28488;;;;;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;13031:20;;187:28488;;22497:8;187:28488;;;;;;;13031:20;13065:8;;;;187:28488;13077:16;187:28488;;;;;;;;;;;;;;:::i;:::-;13065:28;13061:53;;13248:78;187:28488;13300:25;13249:77;187:28488;13300:25;187:28488;;;;;13156:77;;;;;;;;;;187:28488;;;;;;;;;3683:107;187:28488;;;;;;13215:1;187:28488;;;;;;;;;;;13156:77;187:28488;13146:88;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;13300:25;;;13156:77;13300:25;;187:28488;;;;;;;;;;;;;;;;;;;;;;;;13248:78;13244:105;;-1:-1:-1;;;;;187:28488:21;;13364:16;;13360:47;;-1:-1:-1;;;;;;187:28488:21;;-1:-1:-1;13508:5:21;13512:1;13508:5;;;;13491:128;13632:15;;;13628:46;;13688:31;:17;;;:::i;:31::-;;13684:63;;187:28488;;13761:18;13777:2;13761:18;;:40;;;;13491:128;13757:70;;-1:-1:-1;;;;;13870:15:21;187:28488;13924:35;13863:34;;;:::i;:::-;13924:35;;:::i;:::-;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;13973:16;;:36;;;;;13491:128;13969:66;;;;14479:80;187:28488;14169:42;14179:31;187:28488;;14046:16;;187:28488;14479:80;187:28488;;;;;;;;;;14046:16;:::i;:::-;187:28488;;-1:-1:-1;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;;14046:16;187:28488;;-1:-1:-1;;;;187:28488:21;;;;;;;;;;;14179:31;;:::i;:::-;14169:42;;:::i;:::-;14259:18;14433:30;14259:18;187:28488;14259:28;:18;;;187:28488;;22553:6;187:28488;;;;;;;14259:28;14297:38;;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;;187:28488:21;;;;14395:19;187:28488;;-1:-1:-1;;187:28488:21;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;;;;-1:-1:-1;;;187:28488:21;;;;;;14433:30;187:28488;;14479:80;;;;187:28488;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;13973:36;-1:-1:-1;;;;;187:28488:21;-1:-1:-1;;;13973:36:21;;;;13761:40;13783:18;13799:2;13783:18;;13761:40;;13515:3;13538:36;187:28488;13554:20;;;:::i;13538:36::-;;;13534:75;;187:28488;;13496:10;;13534:75;13578:21;;;187:28488;13601:5;;;;187:28488;;-1:-1:-1;187:28488:21;;;:::o;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;:::i;:::-;-1:-1:-1;;;;;187:28488:21;-1:-1:-1;187:28488:21;;;3133:43;187:28488;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;585:5;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;531:9;187:28488;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;2985:58;187:28488;;;;;;;:::i;:::-;-1:-1:-1;187:28488:21;2985:58;187:28488;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;2985:58;187:28488;;;2985:58;;;187:28488;;;;;;;;;2985:58;;;187:28488;2985:58;;;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;2985:58;;;;187:28488;;;;;;;;2985:58;187:28488;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;2985:58;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;21064:20;;187:28488;;22497:8;187:28488;;;;;;;21064:20;21120:18;:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;21120:27;21170:8;;;;187:28488;;;;;;;;;;;;;;;;:::i;:::-;21170:29;21166:54;;21252:28;;187:28488;21234:46;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;21234:46;:15;:46;21230:69;;21422:78;187:28488;21474:25;21423:77;187:28488;21474:25;187:28488;21434:11;187:28488;;21341:66;187:28488;21341:66;187:28488;;;21341:66;;;;;;;;187:28488;;;;;;;;;;;3990:86;187:28488;;;;;;;;;;;;;;;;;;21341:66;187:28488;21331:77;;21434:11;;187:28488;-1:-1:-1;;;;;187:28488:21;;;21422:78;21418:105;;187:28488;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;;21716:46;;;;21574:73;;21601:46;-1:-1:-1;;;;;21234:15:21;187:28488;21601:46;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;;187:28488:21;;;;;21574:73;187:28488;;;;;;;;;21671:30;;187:28488;;21671:30;187:28488;;;;;;;;;21756:5;187:28488;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;:::i;:::-;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;17367:20;;187:28488;;22497:8;187:28488;;;;;;;17367:20;17468:14;17415:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;17415:27;17468:14;;187:28488;;;17457:25;187:28488;;;;;;;;;;;;;;17457:25;187:28488;;;17457:25;17453:50;;187:28488;;;;;;;:::i;:::-;17513:53;;17599:9;;;187:28488;17581:27;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;17581:27;:15;:27;17577:50;;187:28488;;;;;;;;;17643:27;;187:28488;;17643:27;17685:10;;;187:28488;;17685:10;;;-1:-1:-1;;;;;187:28488:21;;;-1:-1:-1;;187:28488:21;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;17774:29;;;;17728:27;187:28488;17681:396;187:28488;;-1:-1:-1;17874:15:21;17995:71;17834:26;;17995:71;17834:26;;;187:28488;;;;;;;;;;;;;;17834:26;17874:15;187:28488;;-1:-1:-1;;187:28488:21;;;17874:15;17907:69;17928:48;-1:-1:-1;;;;;17581:15:21;187:28488;17928:48;:::i;:::-;187:28488;;-1:-1:-1;;187:28488:21;;;;;;;;;;;;17907:69;187:28488;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;:::o;:::-;;:::i;:::-;;;;;;-1:-1:-1;;187:28488:21;;;;;;;660:95;;;;;-1:-1:-1;;;;;660:95:21;187:28488;660:95;;:::i;:::-;187:28488;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;3990:86;187:28488;;;;;;;;8901:35;:27;187:28488;;;:::i;:::-;;;-1:-1:-1;187:28488:21;;;;;;:::i;:::-;;;;;;;;;;;-1:-1:-1;187:28488:21;8901:6;187:28488;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;8901:35;187:28488;;;;;;;:::i;:::-;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;;:::i;:::-;;;;;;;;;;;;6838:10;:27;6834:52;;14744:20;;187:28488;;22497:8;187:28488;;;;;;;14744:20;14778:8;;;;187:28488;14790:16;187:28488;;;;;;;;;;;;;;:::i;:::-;14778:28;14774:53;;14950:78;187:28488;15002:25;14951:77;187:28488;15002:25;187:28488;14962:11;187:28488;;;14869:66;187:28488;14869:66;187:28488;;;14869:66;;;;;;;;187:28488;;;;;;;;;;;4127:86;187:28488;;;;;;;;;;;;;;;;;;14950:78;14946:105;;187:28488;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;15104:34;;;;15062:27;187:28488;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;478:8;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;:::i;:::-;;;-1:-1:-1;;;;;187:28488:21;6838:10;:27;6834:52;;21888:20;;187:28488;;22497:8;187:28488;;;;;;;21888:20;21936:18;21986:8;21936:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;21936:27;21986:8;;187:28488;;;;;;;;;;;;;;;;:::i;:::-;21986:29;21982:54;;22069:20;;187:28488;22050:39;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;22050:39;:15;:39;;22046:62;;187:28488;;-1:-1:-1;;;;187:28488:21;-1:-1:-1;;;187:28488:21;;;;22237:45;;;;22159:62;;187:28488;;22178:43;;187:28488;;-1:-1:-1;;;;;187:28488:21;22178:43;:::i;22159:62::-;187:28488;;;;;;;;;22277:4;187:28488;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;4127:86;187:28488;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;:::i;:::-;6774:5;187:28488;;-1:-1:-1;;;;;187:28488:21;;6760:10;:19;6756:42;;-1:-1:-1;;;;;187:28488:21;;10013:22;;10009:45;;-1:-1:-1;;;;;;187:28488:21;;6774:5;187:28488;;;;;;;;-1:-1:-1;;187:28488:21;;;;2815:29;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;:::i;:::-;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;;22695:81;;187:28488;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;;;;;;;:::i;:::-;;;;;;;;:::i;:::-;;;;;;;;:::o;:::-;;;;;;;;;:::i;:::-;;;;:::o;:::-;;;;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;;:::i;:::-;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;:::o;:::-;;;-1:-1:-1;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;4271:107;187:28488;;;;;;;;;;;;;;;;;;;;;;;;;;;:::o;:::-;;;;;;;;;;;:::o;:::-;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;:::o;:::-;;:::i;:::-;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;:::o;:::-;;-1:-1:-1;;;;;187:28488:21;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;:::o;:::-;;;-1:-1:-1;;;187:28488:21;;;;;;;;;;;;-1:-1:-1;;;187:28488:21;;;;;;;;;;;;;;;;;-1:-1:-1;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;:::o;:::-;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;;:::o;:::-;;:::i;:::-;;;;;;;;;;;;;;;:::o;:::-;;;;;;;;;;;:::o;:::-;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;:::o;:::-;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;:::o;:::-;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;:::o;:::-;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;:::o;:::-;;;;;;;;:::o;9065:455::-;;;;;187:28488;-1:-1:-1;187:28488:21;9231:6;187:28488;;9231:35;187:28488;9231:27;187:28488;;-1:-1:-1;187:28488:21;;;;;;;;;;;;;9231:35;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;9280:12;;;:27;;;;9065:455;9276:49;;;9339:27;187:28488;9339:18;;:34;:18;187:28488;;22553:6;187:28488;;;;;;;9339:27;:34;187:28488;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;9339:44;9335:66;;585:5;9412:15;9443:43;:20;:43;585:5;;;9502:11;9443:43;;9437:49;9502:11;;:::i;9443:43::-;9502:11;585:5;9443:43;;9335:66;-1:-1:-1;;;;;;;;9385:16:21:o;9276:49::-;9309:16;;;;;;-1:-1:-1;9309:16:21;-1:-1:-1;9309:16:21;-1:-1:-1;9309:16:21;:::o;9280:27::-;187:28488;;;;;-1:-1:-1;9280:27:21;;;187:28488;;;;;:::i;:::-;;;;;;;:::i;:::-;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;:::o;:::-;;;;;:::i;:::-;;;;;:::i;:::-;;;;;:::i;:::-;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;:::o;:::-;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;22695:81;187:28488;;-1:-1:-1;;187:28488:21;;;;;:::i;:::-;;;;;;;;;;;;;;;;;-1:-1:-1;187:28488:21;;;;;;:::o;:::-;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;;187:28488:21;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;;187:28488:21;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;;;;;;;;;;;:::i;:::-;;;:::i;:::-;;;;;;;;;-1:-1:-1;;;;187:28488:21;;;;;;-1:-1:-1;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;;;;;;:::i;:::-;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;:::i;:::-;;;;;;;;;;;;;;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;:::o;7921:407::-;187:28488;;;8018:8;187:28488;;;;;;;;8066:6;187:28488;;;8066:34;8085:14;187:28488;;;8085:14;;187:28488;;;;;;;;;;;;;;;;;;8066:34;187:28488;;;;;;;;;;;;:::i;:::-;8123:28;;8119:178;;8306:15;7921:407;:::o;8119:178::-;8190:9;;187:28488;8171:28;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;8171:28;:15;:28;;8167:54;;8239:27;;-1:-1:-1;;;;;187:28488:21;;;8239:27;8171:15;8239:27;;8235:51;;7921:407;:::o;8235:51::-;8268:18;8190:9;8268:18;:::o;8167:54::-;8201:20;;8085:14;8201:20;:::o;187:28488::-;-1:-1:-1;;187:28488:21;;;;;;;:::o;26845:803::-;;;;;;26994:15;:24;26990:55;;-1:-1:-1;;;;;187:28488:21;;;;;;27068:6;187:28488;;;;;;27059:23;27055:47;;187:28488;;-1:-1:-1;;;27140:58:21;;;187:28488;;;27169:16;187:28488;;;;;;;;;;;27140:58;187:28488;;;;27140:58;187:28488;27140:58;187:28488;27130:69;;27233:2;187:28488;;27213:22;27209:40;;27140:58;27298:158;;;;187:28488;27298:158;;;;;;;;;187:28488;;;;;;27298:158;;;187:28488;;;;;;;;;;;;;;;27485:26;;;27140:58;187:28488;;;27485:26;;;;;;187:28488;27485:26;-1:-1:-1;;;;;187:28488:21;27525:23;;;:46;;;;26845:803;27521:64;;;-1:-1:-1;;;;;187:28488:21;;;;;27068:6;187:28488;;;;;27604:16;187:28488;;27604:16;:::i;:::-;187:28488;;27485:26;26845:803;:::o;27521:64::-;27573:12;187:28488;27573:12;:::o;27525:46::-;-1:-1:-1;;;;;187:28488:21;;27552:19;;;-1:-1:-1;27525:46:21;;;27209:40;27237:12;;;187:28488;27237:12;:::o;27055:47::-;27091:11;;;187:28488;27091:11;;187:28488;27091:11;26990:55;27027:18;;;187:28488;27027:18;;187:28488;27027:18;6897:150;;187:28488;6940:6;187:28488;6931:51;187:28488;;;;;6939:7;6931:51;:::i;187:28488::-;6940:6;187:28488;16021:20;;187:28488;;22497:8;187:28488;;;;;;;16021:20;16069:18;:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;16069:27;16111:9;7001:4;16111:9;;187:28488;;;;-1:-1:-1;;;;;187:28488:21;;;;;;;-1:-1:-1;;;;;187:28488:21;;16111:14;:46;;;;;6897:150;16107:74;;;16195:8;;;187:28488;;;;;;;;;;;;;;;:::i;:::-;16195:28;;;:55;;;;6897:150;16191:88;;;187:28488;16293:25;;-1:-1:-1;;;;;187:28488:21;;;16293:25;:10;:25;16289:58;;-1:-1:-1;;;;;187:28488:21;;16361:11;:43;;;;6897:150;16357:80;;-1:-1:-1;16293:10:21;16894:61;;16466:39;16293:10;16466:27;:18;;;187:28488;;22618:6;187:28488;;;;;;;16894:61;;;;;;;;;;16886:94;16996:119;16894:61;16996:119;16894:61;-1:-1:-1;16894:61:21;;;16886:94;;:::i;16996:119::-;;;;6940:6;187:28488;;-1:-1:-1;;;;187:28488:21;;;:::o;16361:43::-;187:28488;16376:28;:23;187:28488;;;;;;;16376:28;;;16361:43;;16195:55;7001:4;187:28488;;;;;:::i;:::-;16227:23;;16195:55;;;16111:46;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;16129:15:21;:28;;16111:46;;;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;-1:-1:-1;;;;;187:28488:21;;;:::o;:::-;-1:-1:-1;;;;;187:28488:21;-1:-1:-1;;;;;187:28488:21;;;;;;;:::o;:::-;;;;:::o;:::-;;;-1:-1:-1;;;187:28488:21;;;;;;;;;;;;-1:-1:-1;;;187:28488:21;;;;;;;;;;;;-1:-1:-1;;187:28488:21;;:::o;:::-;-1:-1:-1;;187:28488:21;;;;;;;;:::o;27654:1019::-;;;;27768:27;:18;;;187:28488;;22553:6;187:28488;;;;;;;27768:27;27830:18;:35;:18;:27;:18;;;187:28488;;22618:6;187:28488;;;;;;;27830:35;27924:10;;;;;;27881;-1:-1:-1;;;;;187:28488:21;;-1:-1:-1;27893:6:21;27830;27893;;;;27876:121;28007:21;;27830:6;28043:10;-1:-1:-1;28038:452:21;28055:6;27830;28055;;;;28038:452;28504:16;;;;;27830:6;28504:16;;28500:167;;28038:452;27654:1019;;;;:::o;28500:167::-;27768:6;28553:15;;;;;;28624:23;;;:32;:23;;;:::i;:::-;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;;;;;;;;;;;;;;;28624:32;28500:167;;;;;28570:3;28604;28577:31;187:28488;28593:15;28604:3;28570;28604;;:::i;:::-;28593:15;;:::i;187:28488::-;28577:13;;;;:::i;:31::-;28570:3;:::i;:::-;28541:10;;28063:3;28086:27;187:28488;28086:13;;;;:::i;:27::-;:13;;28117:15;;;;28134:5;;;;;;28082:398;28208:18;;;;:42;:27;:18;;;187:28488;;22618:6;187:28488;;;;;;;28208:27;187:28488;28236:13;;;;:::i;187:28488::-;;;;;;;;;;;;;;;;28208:42;187:28488;;-1:-1:-1;;;;;187:28488:21;;;;-1:-1:-1;;;;;28272:36:21;187:28488;;;;;28272:36;187:28488;;28272:36;;;;:129;;;;;28082:398;28268:198;;;;;;187:28488;;28043:10;;;;;;28268:198;28425:15;;;;;28442:5;;;;;;28272:129;28313:37;;-1:-1:-1;28313:37:21;;:87;;28272:129;;;;;;;;;28313:87;-1:-1:-1;;;;;187:28488:21;;;;;28354:46;187:28488;-1:-1:-1;;;;;187:28488:21;;;;;;;;;;-1:-1:-1;;;;;187:28488:21;;;28354:46;187:28488;;28354:46;28313:87;;;;27901:3;27924:13;:23;187:28488;27924:13;;;;;;;;;;:::i;:23::-;;27920:67;;187:28488;;27881:10;;;;;;;;27920:67;27951:26;:13;;;;;;;;;;;:::i;:::-;187:28488;;;;;;;;;;;;;;;;;27951:26;27979:5;;;;","linkReferences":{},"immutableReferences":{"42298":[{"start":3556,"length":32},{"start":18330,"length":32}]}},"methodIdentifiers":{"AWARD_SIGN_TYPEHASH()":"4d1551de","CLAIM_WINDOW()":"9f34fc80","COLLECTED_TYPEHASH()":"bb9f4ae5","COLLECTION_WINDOW()":"ceb7fcea","CONSIGNOR_CONFIRM_TYPEHASH()":"10ccf4ce","DOMAIN_SEPARATOR()":"3644e515","NOTARY_APPROVAL_TYPEHASH()":"5ebd35e9","RANK_SLOTS()":"1f559e49","SIGNING_WINDOW()":"29d9218c","WITHDRAWN_TYPEHASH()":"e4cbc93f","WITHDRAW_FEE()":"9bff5ddb","WITHDRAW_REQUEST_TYPEHASH()":"05b8849e","advanceCandidate(bytes32,uint16)":"59afbefb","allowedIncrements(uint256)":"bb17c145","auctions(bytes32)":"1edbc5be","claimable(address)":"402914f5","claimableOf(address)":"8903ab9d","collected(bytes32,uint16,uint256,uint256,uint8,bytes32,bytes32)":"a9ce7991","expireCollection(bytes32,uint16)":"e2e66c4a","getAuction(bytes32)":"15924b5b","getRound(bytes32,uint16)":"884df85c","getStake(bytes32,uint16,address)":"c3dfb742","getTopRanks(bytes32,uint16)":"22ff4bc5","markWithdrawn(bytes32,uint16,uint256,uint256,uint8,bytes32,bytes32)":"cb6fc17d","nonces(address)":"7ecebe00","owner()":"8da5cb5b","partners(address)":"95c33652","placeBid(bytes32,uint16,uint128)":"45219fe9","placeBidWithPermit(bytes32,uint16,uint128,uint256,uint8,bytes32,bytes32)":"587614dc","platformWallet()":"fa2af9da","refundableOf(bytes32,uint16,address)":"80c0e40f","registerAuction((bytes32,address,address,address,uint8,bytes32,uint128,uint128,uint64,uint16,uint16,uint16,uint16,uint16,bytes32,bytes,bytes,uint256,uint256,uint256,uint256))":"82982f06","relayerWallet()":"70392479","reuseRound(bytes32,uint128,uint128,uint64,uint16,uint256,uint256,uint8,bytes32,bytes32)":"91a0d606","rounds(bytes32,uint16)":"a2e2c9c6","setPartner(address,uint8,uint8,bool)":"6df4ed63","setRelayer(address)":"6548e9bc","stakes(bytes32,uint16,address)":"57338779","startAwarding(bytes32,uint16)":"b2cbc1d5","statusOf(bytes32)":"c7df14e2","submitAwardSignature(bytes32,uint16,uint256,uint256,uint8,bytes32,bytes32)":"7a497056","taxWallet()":"2dc0562d","transferOwnership(address)":"f2fde38b","usdc()":"3e413bee","withdrawClaimable()":"4fa982d4","withdrawConsignor(bytes32,uint16,uint256,uint256,uint8,bytes32,bytes32)":"589f8a5c","withdrawRefund(bytes32,uint16,address,uint256,uint256,uint8,bytes32,bytes32)":"352ae5d3"},"rawMetadata":"{\"compiler\":{\"version\":\"0.8.37+commit.f401782d\"},\"language\":\"Solidity\",\"output\":{\"abi\":[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"_usdc\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_platformWallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_taxWallet\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"_relayerWallet\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"inputs\":[],\"name\":\"AlreadyWithdrawn\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"AuctionExists\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"AuctionNotBiddable\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"BadSignature\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"BiddingClosed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"CategoryMismatch\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ConsignorCannotBid\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"IncrementTooLarge\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"InvalidDuration\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"InvalidIncrement\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"InvalidOpenTime\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NonceUsed\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NotCurrentCandidate\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NotMultipleOfIncrement\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NotOwner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NotRefundable\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NotRelayer\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"NothingToClaim\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"PartnerNotRegistered\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"SignatureExpired\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"TooEarly\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"WinnerCannotWithdraw\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"WrongPhase\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"consignor\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"guarantor\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"notary\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bytes32\",\"name\":\"specHash\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"startingBid\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"bidIncrement\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint64\",\"name\":\"openAt\",\"type\":\"uint64\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"durationHours\",\"type\":\"uint16\"}],\"name\":\"AuctionRegistered\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"winner\",\"type\":\"address\"}],\"name\":\"AwardSigned\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"candidate\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint64\",\"name\":\"deadline\",\"type\":\"uint64\"}],\"name\":\"AwardingStarted\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"bidder\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"added\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"myBidAfter\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"currentBidAfter\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint64\",\"name\":\"seq\",\"type\":\"uint64\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"isPreBid\",\"type\":\"bool\"}],\"name\":\"BidPlaced\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"autoIssued\",\"type\":\"bool\"}],\"name\":\"ClaimPeriodStarted\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"Closed\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"Collected\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"candidate\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"defaultFee\",\"type\":\"uint128\"}],\"name\":\"Defaulted\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"recipient\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"amount\",\"type\":\"uint128\"}],\"name\":\"FeeCredited\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"PassedIn\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"startingBid\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"bidIncrement\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint64\",\"name\":\"openAt\",\"type\":\"uint64\"},{\"indexed\":false,\"internalType\":\"uint64\",\"name\":\"closeAt\",\"type\":\"uint64\"}],\"name\":\"RoundScheduled\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"Settled\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint8\",\"name\":\"kind\",\"type\":\"uint8\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"gross\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"fee\",\"type\":\"uint128\"},{\"indexed\":false,\"internalType\":\"uint128\",\"name\":\"net\",\"type\":\"uint128\"}],\"name\":\"Withdrawal\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"WithdrawnItem\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"AWARD_SIGN_TYPEHASH\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"CLAIM_WINDOW\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"COLLECTED_TYPEHASH\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"COLLECTION_WINDOW\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"CONSIGNOR_CONFIRM_TYPEHASH\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"DOMAIN_SEPARATOR\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"NOTARY_APPROVAL_TYPEHASH\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"RANK_SLOTS\",\"outputs\":[{\"internalType\":\"uint16\",\"name\":\"\",\"type\":\"uint16\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"SIGNING_WINDOW\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"WITHDRAWN_TYPEHASH\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"WITHDRAW_FEE\",\"outputs\":[{\"internalType\":\"uint128\",\"name\":\"\",\"type\":\"uint128\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"WITHDRAW_REQUEST_TYPEHASH\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"advanceCandidate\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"allowedIncrements\",\"outputs\":[{\"internalType\":\"uint128\",\"name\":\"\",\"type\":\"uint128\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"name\":\"auctions\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"consignor\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"guarantor\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"notary\",\"type\":\"address\"},{\"internalType\":\"uint8\",\"name\":\"category\",\"type\":\"uint8\"},{\"internalType\":\"enum ParalelAuction.Status\",\"name\":\"status\",\"type\":\"uint8\"},{\"internalType\":\"uint16\",\"name\":\"currentRound\",\"type\":\"uint16\"},{\"internalType\":\"bytes32\",\"name\":\"specHash\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"platformBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"guarantorBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"notaryBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"taxBps\",\"type\":\"uint16\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"claimable\",\"outputs\":[{\"internalType\":\"uint128\",\"name\":\"\",\"type\":\"uint128\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"}],\"name\":\"claimableOf\",\"outputs\":[{\"internalType\":\"uint128\",\"name\":\"\",\"type\":\"uint128\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"uint256\",\"name\":\"nonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"expiry\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"collected\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"expireCollection\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"}],\"name\":\"getAuction\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"consignor\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"guarantor\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"notary\",\"type\":\"address\"},{\"internalType\":\"uint8\",\"name\":\"category\",\"type\":\"uint8\"},{\"internalType\":\"enum ParalelAuction.Status\",\"name\":\"status\",\"type\":\"uint8\"},{\"internalType\":\"uint16\",\"name\":\"currentRound\",\"type\":\"uint16\"},{\"internalType\":\"bytes32\",\"name\":\"specHash\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"platformBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"guarantorBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"notaryBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"taxBps\",\"type\":\"uint16\"}],\"internalType\":\"struct ParalelAuction.Auction\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"getRound\",\"outputs\":[{\"components\":[{\"internalType\":\"uint128\",\"name\":\"startingBid\",\"type\":\"uint128\"},{\"internalType\":\"uint128\",\"name\":\"bidIncrement\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"openAt\",\"type\":\"uint64\"},{\"internalType\":\"uint64\",\"name\":\"closeAt\",\"type\":\"uint64\"},{\"internalType\":\"uint128\",\"name\":\"currentBid\",\"type\":\"uint128\"},{\"internalType\":\"address\",\"name\":\"currentLeader\",\"type\":\"address\"},{\"internalType\":\"uint64\",\"name\":\"bidSeq\",\"type\":\"uint64\"},{\"internalType\":\"address[10]\",\"name\":\"topRanks\",\"type\":\"address[10]\"},{\"internalType\":\"uint8\",\"name\":\"awardingIndex\",\"type\":\"uint8\"},{\"internalType\":\"uint64\",\"name\":\"awardingDeadline\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"winner\",\"type\":\"address\"},{\"internalType\":\"uint128\",\"name\":\"winnerStake\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"collectionDeadline\",\"type\":\"uint64\"},{\"internalType\":\"uint64\",\"name\":\"claimPeriodEnd\",\"type\":\"uint64\"}],\"internalType\":\"struct ParalelAuction.Round\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"address\",\"name\":\"bidder\",\"type\":\"address\"}],\"name\":\"getStake\",\"outputs\":[{\"components\":[{\"internalType\":\"uint128\",\"name\":\"myBid\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"reachedSeq\",\"type\":\"uint64\"},{\"internalType\":\"bool\",\"name\":\"withdrawn\",\"type\":\"bool\"}],\"internalType\":\"struct ParalelAuction.Stake\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"getTopRanks\",\"outputs\":[{\"internalType\":\"address[10]\",\"name\":\"\",\"type\":\"address[10]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"uint256\",\"name\":\"nonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"expiry\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"markWithdrawn\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"nonces\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"partners\",\"outputs\":[{\"internalType\":\"enum ParalelAuction.PartnerType\",\"name\":\"pType\",\"type\":\"uint8\"},{\"internalType\":\"uint8\",\"name\":\"category\",\"type\":\"uint8\"},{\"internalType\":\"bool\",\"name\":\"active\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"uint128\",\"name\":\"amount\",\"type\":\"uint128\"}],\"name\":\"placeBid\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"uint128\",\"name\":\"amount\",\"type\":\"uint128\"},{\"internalType\":\"uint256\",\"name\":\"deadline\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"placeBidWithPermit\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"platformWallet\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"address\",\"name\":\"bidder\",\"type\":\"address\"}],\"name\":\"refundableOf\",\"outputs\":[{\"internalType\":\"uint128\",\"name\":\"gross\",\"type\":\"uint128\"},{\"internalType\":\"uint128\",\"name\":\"fee\",\"type\":\"uint128\"},{\"internalType\":\"uint128\",\"name\":\"net\",\"type\":\"uint128\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"components\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"address\",\"name\":\"consignor\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"guarantor\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"notary\",\"type\":\"address\"},{\"internalType\":\"uint8\",\"name\":\"category\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"specHash\",\"type\":\"bytes32\"},{\"internalType\":\"uint128\",\"name\":\"startingBid\",\"type\":\"uint128\"},{\"internalType\":\"uint128\",\"name\":\"bidIncrement\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"openAt\",\"type\":\"uint64\"},{\"internalType\":\"uint16\",\"name\":\"durationHours\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"platformBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"guarantorBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"notaryBps\",\"type\":\"uint16\"},{\"internalType\":\"uint16\",\"name\":\"taxBps\",\"type\":\"uint16\"},{\"internalType\":\"bytes32\",\"name\":\"confirmationCodeHash\",\"type\":\"bytes32\"},{\"internalType\":\"bytes\",\"name\":\"notarySig\",\"type\":\"bytes\"},{\"internalType\":\"bytes\",\"name\":\"consignorSig\",\"type\":\"bytes\"},{\"internalType\":\"uint256\",\"name\":\"notaryNonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"notaryExpiry\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"consignorNonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"consignorExpiry\",\"type\":\"uint256\"}],\"internalType\":\"struct ParalelAuction.RegisterAuctionParams\",\"name\":\"p\",\"type\":\"tuple\"}],\"name\":\"registerAuction\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"relayerWallet\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint128\",\"name\":\"startingBid\",\"type\":\"uint128\"},{\"internalType\":\"uint128\",\"name\":\"bidIncrement\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"openAt\",\"type\":\"uint64\"},{\"internalType\":\"uint16\",\"name\":\"durationHours\",\"type\":\"uint16\"},{\"internalType\":\"uint256\",\"name\":\"nonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"expiry\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"reuseRound\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"\",\"type\":\"uint16\"}],\"name\":\"rounds\",\"outputs\":[{\"internalType\":\"uint128\",\"name\":\"startingBid\",\"type\":\"uint128\"},{\"internalType\":\"uint128\",\"name\":\"bidIncrement\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"openAt\",\"type\":\"uint64\"},{\"internalType\":\"uint64\",\"name\":\"closeAt\",\"type\":\"uint64\"},{\"internalType\":\"uint128\",\"name\":\"currentBid\",\"type\":\"uint128\"},{\"internalType\":\"address\",\"name\":\"currentLeader\",\"type\":\"address\"},{\"internalType\":\"uint64\",\"name\":\"bidSeq\",\"type\":\"uint64\"},{\"internalType\":\"uint8\",\"name\":\"awardingIndex\",\"type\":\"uint8\"},{\"internalType\":\"uint64\",\"name\":\"awardingDeadline\",\"type\":\"uint64\"},{\"internalType\":\"address\",\"name\":\"winner\",\"type\":\"address\"},{\"internalType\":\"uint128\",\"name\":\"winnerStake\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"collectionDeadline\",\"type\":\"uint64\"},{\"internalType\":\"uint64\",\"name\":\"claimPeriodEnd\",\"type\":\"uint64\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"wallet\",\"type\":\"address\"},{\"internalType\":\"enum ParalelAuction.PartnerType\",\"name\":\"pType\",\"type\":\"uint8\"},{\"internalType\":\"uint8\",\"name\":\"category\",\"type\":\"uint8\"},{\"internalType\":\"bool\",\"name\":\"active\",\"type\":\"bool\"}],\"name\":\"setPartner\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newRelayer\",\"type\":\"address\"}],\"name\":\"setRelayer\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"\",\"type\":\"uint16\"},{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"name\":\"stakes\",\"outputs\":[{\"internalType\":\"uint128\",\"name\":\"myBid\",\"type\":\"uint128\"},{\"internalType\":\"uint64\",\"name\":\"reachedSeq\",\"type\":\"uint64\"},{\"internalType\":\"bool\",\"name\":\"withdrawn\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"}],\"name\":\"startAwarding\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"}],\"name\":\"statusOf\",\"outputs\":[{\"internalType\":\"enum ParalelAuction.Status\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"uint256\",\"name\":\"nonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"expiry\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"submitAwardSignature\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"taxWallet\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"transferOwnership\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"usdc\",\"outputs\":[{\"internalType\":\"contract IERC20Permit\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"withdrawClaimable\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"uint256\",\"name\":\"nonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"expiry\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"withdrawConsignor\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"auctionKey\",\"type\":\"bytes32\"},{\"internalType\":\"uint16\",\"name\":\"roundNo\",\"type\":\"uint16\"},{\"internalType\":\"address\",\"name\":\"bidder\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"nonce\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"expiry\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"withdrawRefund\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}],\"devdoc\":{\"kind\":\"dev\",\"methods\":{},\"version\":1},\"userdoc\":{\"kind\":\"user\",\"methods\":{},\"version\":1}},\"settings\":{\"compilationTarget\":{\"src/ParalelAuction.sol\":\"ParalelAuction\"},\"evmVersion\":\"osaka\",\"libraries\":{},\"metadata\":{\"bytecodeHash\":\"ipfs\"},\"optimizer\":{\"enabled\":true,\"runs\":200},\"remappings\":[\":forge-std/=lib/forge-std/src/\"],\"viaIR\":true},\"sources\":{\"lib/forge-std/src/interfaces/IERC20.sol\":{\"keccak256\":\"0x5945813ecc305238ca86d7a211a52f300e41173e34d39166f99758a857717dec\",\"license\":\"MIT OR Apache-2.0\",\"urls\":[\"bzz-raw://2ace7b2e42fa6f84f660987cc3020d1494ba0fe4d558b4a64ab875d15a177f17\",\"dweb:/ipfs/QmYR74diY5XWmkmmzCnboAYzeU9HtPun6qXVTUF51AspxN\"]},\"src/ParalelAuction.sol\":{\"keccak256\":\"0x353921248fae09fe90ffc4f4d848c0215d4e80cbee48ecca36c7f91c77eb4910\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://dc5711a2170c65f55ff2f94bbfe9d320c594a35dfa96e24dcfa444628c0d5d1a\",\"dweb:/ipfs/QmQDdBX7Fy32FXSggcUXipzUmPvARWZWHVj7VAKFBBJMZZ\"]},\"src/interfaces/IERC20Permit.sol\":{\"keccak256\":\"0xe643a4c8e63b238f046e972f115b93327ea6cbf48ce0fbcfe2a8f5b0f335603d\",\"license\":\"MIT\",\"urls\":[\"bzz-raw://6295faf088edc01a97a01d9aa09cce5d92212ee437cc08c8ef13dd5ba4f252b0\",\"dweb:/ipfs/QmQ3C3smquPZLpHituKokhMazpFQwQ51RyomfADgwBLSNd\"]}},\"version\":1}","metadata":{"compiler":{"version":"0.8.37+commit.f401782d"},"language":"Solidity","output":{"abi":[{"inputs":[{"internalType":"address","name":"_usdc","type":"address"},{"internalType":"address","name":"_platformWallet","type":"address"},{"internalType":"address","name":"_taxWallet","type":"address"},{"internalType":"address","name":"_relayerWallet","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"type":"error","name":"AlreadyWithdrawn"},{"inputs":[],"type":"error","name":"AuctionExists"},{"inputs":[],"type":"error","name":"AuctionNotBiddable"},{"inputs":[],"type":"error","name":"BadSignature"},{"inputs":[],"type":"error","name":"BiddingClosed"},{"inputs":[],"type":"error","name":"CategoryMismatch"},{"inputs":[],"type":"error","name":"ConsignorCannotBid"},{"inputs":[],"type":"error","name":"IncrementTooLarge"},{"inputs":[],"type":"error","name":"InvalidDuration"},{"inputs":[],"type":"error","name":"InvalidIncrement"},{"inputs":[],"type":"error","name":"InvalidOpenTime"},{"inputs":[],"type":"error","name":"NonceUsed"},{"inputs":[],"type":"error","name":"NotCurrentCandidate"},{"inputs":[],"type":"error","name":"NotMultipleOfIncrement"},{"inputs":[],"type":"error","name":"NotOwner"},{"inputs":[],"type":"error","name":"NotRefundable"},{"inputs":[],"type":"error","name":"NotRelayer"},{"inputs":[],"type":"error","name":"NothingToClaim"},{"inputs":[],"type":"error","name":"PartnerNotRegistered"},{"inputs":[],"type":"error","name":"SignatureExpired"},{"inputs":[],"type":"error","name":"TooEarly"},{"inputs":[],"type":"error","name":"WinnerCannotWithdraw"},{"inputs":[],"type":"error","name":"WrongPhase"},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"address","name":"consignor","type":"address","indexed":false},{"internalType":"address","name":"guarantor","type":"address","indexed":false},{"internalType":"address","name":"notary","type":"address","indexed":false},{"internalType":"bytes32","name":"specHash","type":"bytes32","indexed":false},{"internalType":"uint128","name":"startingBid","type":"uint128","indexed":false},{"internalType":"uint128","name":"bidIncrement","type":"uint128","indexed":false},{"internalType":"uint64","name":"openAt","type":"uint64","indexed":false},{"internalType":"uint16","name":"durationHours","type":"uint16","indexed":false}],"type":"event","name":"AuctionRegistered","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false},{"internalType":"address","name":"winner","type":"address","indexed":false}],"type":"event","name":"AwardSigned","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false},{"internalType":"address","name":"candidate","type":"address","indexed":false},{"internalType":"uint64","name":"deadline","type":"uint64","indexed":false}],"type":"event","name":"AwardingStarted","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false},{"internalType":"address","name":"bidder","type":"address","indexed":true},{"internalType":"uint128","name":"added","type":"uint128","indexed":false},{"internalType":"uint128","name":"myBidAfter","type":"uint128","indexed":false},{"internalType":"uint128","name":"currentBidAfter","type":"uint128","indexed":false},{"internalType":"uint64","name":"seq","type":"uint64","indexed":false},{"internalType":"bool","name":"isPreBid","type":"bool","indexed":false}],"type":"event","name":"BidPlaced","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false},{"internalType":"bool","name":"autoIssued","type":"bool","indexed":false}],"type":"event","name":"ClaimPeriodStarted","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false}],"type":"event","name":"Closed","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false}],"type":"event","name":"Collected","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false},{"internalType":"address","name":"candidate","type":"address","indexed":false},{"internalType":"uint128","name":"defaultFee","type":"uint128","indexed":false}],"type":"event","name":"Defaulted","anonymous":false},{"inputs":[{"internalType":"address","name":"recipient","type":"address","indexed":true},{"internalType":"uint128","name":"amount","type":"uint128","indexed":false}],"type":"event","name":"FeeCredited","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false}],"type":"event","name":"PassedIn","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false},{"internalType":"uint128","name":"startingBid","type":"uint128","indexed":false},{"internalType":"uint128","name":"bidIncrement","type":"uint128","indexed":false},{"internalType":"uint64","name":"openAt","type":"uint64","indexed":false},{"internalType":"uint64","name":"closeAt","type":"uint64","indexed":false}],"type":"event","name":"RoundScheduled","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false}],"type":"event","name":"Settled","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false},{"internalType":"address","name":"wallet","type":"address","indexed":true},{"internalType":"uint8","name":"kind","type":"uint8","indexed":false},{"internalType":"uint128","name":"gross","type":"uint128","indexed":false},{"internalType":"uint128","name":"fee","type":"uint128","indexed":false},{"internalType":"uint128","name":"net","type":"uint128","indexed":false}],"type":"event","name":"Withdrawal","anonymous":false},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32","indexed":true},{"internalType":"uint16","name":"roundNo","type":"uint16","indexed":false}],"type":"event","name":"WithdrawnItem","anonymous":false},{"inputs":[],"stateMutability":"view","type":"function","name":"AWARD_SIGN_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"CLAIM_WINDOW","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"COLLECTED_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"COLLECTION_WINDOW","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"CONSIGNOR_CONFIRM_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"NOTARY_APPROVAL_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"RANK_SLOTS","outputs":[{"internalType":"uint16","name":"","type":"uint16"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"SIGNING_WINDOW","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"WITHDRAWN_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"WITHDRAW_FEE","outputs":[{"internalType":"uint128","name":"","type":"uint128"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"WITHDRAW_REQUEST_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"}],"stateMutability":"nonpayable","type":"function","name":"advanceCandidate"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","name":"allowedIncrements","outputs":[{"internalType":"uint128","name":"","type":"uint128"}]},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function","name":"auctions","outputs":[{"internalType":"address","name":"consignor","type":"address"},{"internalType":"address","name":"guarantor","type":"address"},{"internalType":"address","name":"notary","type":"address"},{"internalType":"uint8","name":"category","type":"uint8"},{"internalType":"enum ParalelAuction.Status","name":"status","type":"uint8"},{"internalType":"uint16","name":"currentRound","type":"uint16"},{"internalType":"bytes32","name":"specHash","type":"bytes32"},{"internalType":"uint16","name":"platformBps","type":"uint16"},{"internalType":"uint16","name":"guarantorBps","type":"uint16"},{"internalType":"uint16","name":"notaryBps","type":"uint16"},{"internalType":"uint16","name":"taxBps","type":"uint16"}]},{"inputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","name":"claimable","outputs":[{"internalType":"uint128","name":"","type":"uint128"}]},{"inputs":[{"internalType":"address","name":"wallet","type":"address"}],"stateMutability":"view","type":"function","name":"claimableOf","outputs":[{"internalType":"uint128","name":"","type":"uint128"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"stateMutability":"nonpayable","type":"function","name":"collected"},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"}],"stateMutability":"nonpayable","type":"function","name":"expireCollection"},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"}],"stateMutability":"view","type":"function","name":"getAuction","outputs":[{"internalType":"struct ParalelAuction.Auction","name":"","type":"tuple","components":[{"internalType":"address","name":"consignor","type":"address"},{"internalType":"address","name":"guarantor","type":"address"},{"internalType":"address","name":"notary","type":"address"},{"internalType":"uint8","name":"category","type":"uint8"},{"internalType":"enum ParalelAuction.Status","name":"status","type":"uint8"},{"internalType":"uint16","name":"currentRound","type":"uint16"},{"internalType":"bytes32","name":"specHash","type":"bytes32"},{"internalType":"uint16","name":"platformBps","type":"uint16"},{"internalType":"uint16","name":"guarantorBps","type":"uint16"},{"internalType":"uint16","name":"notaryBps","type":"uint16"},{"internalType":"uint16","name":"taxBps","type":"uint16"}]}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"}],"stateMutability":"view","type":"function","name":"getRound","outputs":[{"internalType":"struct ParalelAuction.Round","name":"","type":"tuple","components":[{"internalType":"uint128","name":"startingBid","type":"uint128"},{"internalType":"uint128","name":"bidIncrement","type":"uint128"},{"internalType":"uint64","name":"openAt","type":"uint64"},{"internalType":"uint64","name":"closeAt","type":"uint64"},{"internalType":"uint128","name":"currentBid","type":"uint128"},{"internalType":"address","name":"currentLeader","type":"address"},{"internalType":"uint64","name":"bidSeq","type":"uint64"},{"internalType":"address[10]","name":"topRanks","type":"address[10]"},{"internalType":"uint8","name":"awardingIndex","type":"uint8"},{"internalType":"uint64","name":"awardingDeadline","type":"uint64"},{"internalType":"address","name":"winner","type":"address"},{"internalType":"uint128","name":"winnerStake","type":"uint128"},{"internalType":"uint64","name":"collectionDeadline","type":"uint64"},{"internalType":"uint64","name":"claimPeriodEnd","type":"uint64"}]}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"address","name":"bidder","type":"address"}],"stateMutability":"view","type":"function","name":"getStake","outputs":[{"internalType":"struct ParalelAuction.Stake","name":"","type":"tuple","components":[{"internalType":"uint128","name":"myBid","type":"uint128"},{"internalType":"uint64","name":"reachedSeq","type":"uint64"},{"internalType":"bool","name":"withdrawn","type":"bool"}]}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"}],"stateMutability":"view","type":"function","name":"getTopRanks","outputs":[{"internalType":"address[10]","name":"","type":"address[10]"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"stateMutability":"nonpayable","type":"function","name":"markWithdrawn"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}]},{"inputs":[],"stateMutability":"view","type":"function","name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}]},{"inputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","name":"partners","outputs":[{"internalType":"enum ParalelAuction.PartnerType","name":"pType","type":"uint8"},{"internalType":"uint8","name":"category","type":"uint8"},{"internalType":"bool","name":"active","type":"bool"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"uint128","name":"amount","type":"uint128"}],"stateMutability":"nonpayable","type":"function","name":"placeBid"},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"uint128","name":"amount","type":"uint128"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"stateMutability":"nonpayable","type":"function","name":"placeBidWithPermit"},{"inputs":[],"stateMutability":"view","type":"function","name":"platformWallet","outputs":[{"internalType":"address","name":"","type":"address"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"address","name":"bidder","type":"address"}],"stateMutability":"view","type":"function","name":"refundableOf","outputs":[{"internalType":"uint128","name":"gross","type":"uint128"},{"internalType":"uint128","name":"fee","type":"uint128"},{"internalType":"uint128","name":"net","type":"uint128"}]},{"inputs":[{"internalType":"struct ParalelAuction.RegisterAuctionParams","name":"p","type":"tuple","components":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"address","name":"consignor","type":"address"},{"internalType":"address","name":"guarantor","type":"address"},{"internalType":"address","name":"notary","type":"address"},{"internalType":"uint8","name":"category","type":"uint8"},{"internalType":"bytes32","name":"specHash","type":"bytes32"},{"internalType":"uint128","name":"startingBid","type":"uint128"},{"internalType":"uint128","name":"bidIncrement","type":"uint128"},{"internalType":"uint64","name":"openAt","type":"uint64"},{"internalType":"uint16","name":"durationHours","type":"uint16"},{"internalType":"uint16","name":"platformBps","type":"uint16"},{"internalType":"uint16","name":"guarantorBps","type":"uint16"},{"internalType":"uint16","name":"notaryBps","type":"uint16"},{"internalType":"uint16","name":"taxBps","type":"uint16"},{"internalType":"bytes32","name":"confirmationCodeHash","type":"bytes32"},{"internalType":"bytes","name":"notarySig","type":"bytes"},{"internalType":"bytes","name":"consignorSig","type":"bytes"},{"internalType":"uint256","name":"notaryNonce","type":"uint256"},{"internalType":"uint256","name":"notaryExpiry","type":"uint256"},{"internalType":"uint256","name":"consignorNonce","type":"uint256"},{"internalType":"uint256","name":"consignorExpiry","type":"uint256"}]}],"stateMutability":"nonpayable","type":"function","name":"registerAuction"},{"inputs":[],"stateMutability":"view","type":"function","name":"relayerWallet","outputs":[{"internalType":"address","name":"","type":"address"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint128","name":"startingBid","type":"uint128"},{"internalType":"uint128","name":"bidIncrement","type":"uint128"},{"internalType":"uint64","name":"openAt","type":"uint64"},{"internalType":"uint16","name":"durationHours","type":"uint16"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"stateMutability":"nonpayable","type":"function","name":"reuseRound"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"},{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function","name":"rounds","outputs":[{"internalType":"uint128","name":"startingBid","type":"uint128"},{"internalType":"uint128","name":"bidIncrement","type":"uint128"},{"internalType":"uint64","name":"openAt","type":"uint64"},{"internalType":"uint64","name":"closeAt","type":"uint64"},{"internalType":"uint128","name":"currentBid","type":"uint128"},{"internalType":"address","name":"currentLeader","type":"address"},{"internalType":"uint64","name":"bidSeq","type":"uint64"},{"internalType":"uint8","name":"awardingIndex","type":"uint8"},{"internalType":"uint64","name":"awardingDeadline","type":"uint64"},{"internalType":"address","name":"winner","type":"address"},{"internalType":"uint128","name":"winnerStake","type":"uint128"},{"internalType":"uint64","name":"collectionDeadline","type":"uint64"},{"internalType":"uint64","name":"claimPeriodEnd","type":"uint64"}]},{"inputs":[{"internalType":"address","name":"wallet","type":"address"},{"internalType":"enum ParalelAuction.PartnerType","name":"pType","type":"uint8"},{"internalType":"uint8","name":"category","type":"uint8"},{"internalType":"bool","name":"active","type":"bool"}],"stateMutability":"nonpayable","type":"function","name":"setPartner"},{"inputs":[{"internalType":"address","name":"newRelayer","type":"address"}],"stateMutability":"nonpayable","type":"function","name":"setRelayer"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"},{"internalType":"uint16","name":"","type":"uint16"},{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","name":"stakes","outputs":[{"internalType":"uint128","name":"myBid","type":"uint128"},{"internalType":"uint64","name":"reachedSeq","type":"uint64"},{"internalType":"bool","name":"withdrawn","type":"bool"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"}],"stateMutability":"nonpayable","type":"function","name":"startAwarding"},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"}],"stateMutability":"view","type":"function","name":"statusOf","outputs":[{"internalType":"enum ParalelAuction.Status","name":"","type":"uint8"}]},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"stateMutability":"nonpayable","type":"function","name":"submitAwardSignature"},{"inputs":[],"stateMutability":"view","type":"function","name":"taxWallet","outputs":[{"internalType":"address","name":"","type":"address"}]},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"stateMutability":"nonpayable","type":"function","name":"transferOwnership"},{"inputs":[],"stateMutability":"view","type":"function","name":"usdc","outputs":[{"internalType":"contract IERC20Permit","name":"","type":"address"}]},{"inputs":[],"stateMutability":"nonpayable","type":"function","name":"withdrawClaimable"},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"stateMutability":"nonpayable","type":"function","name":"withdrawConsignor"},{"inputs":[{"internalType":"bytes32","name":"auctionKey","type":"bytes32"},{"internalType":"uint16","name":"roundNo","type":"uint16"},{"internalType":"address","name":"bidder","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"stateMutability":"nonpayable","type":"function","name":"withdrawRefund"}],"devdoc":{"kind":"dev","methods":{},"version":1},"userdoc":{"kind":"user","methods":{},"version":1}},"settings":{"remappings":["forge-std/=lib/forge-std/src/"],"optimizer":{"enabled":true,"runs":200},"metadata":{"bytecodeHash":"ipfs"},"compilationTarget":{"src/ParalelAuction.sol":"ParalelAuction"},"evmVersion":"osaka","libraries":{},"viaIR":true},"sources":{"lib/forge-std/src/interfaces/IERC20.sol":{"keccak256":"0x5945813ecc305238ca86d7a211a52f300e41173e34d39166f99758a857717dec","urls":["bzz-raw://2ace7b2e42fa6f84f660987cc3020d1494ba0fe4d558b4a64ab875d15a177f17","dweb:/ipfs/QmYR74diY5XWmkmmzCnboAYzeU9HtPun6qXVTUF51AspxN"],"license":"MIT OR Apache-2.0"},"src/ParalelAuction.sol":{"keccak256":"0x353921248fae09fe90ffc4f4d848c0215d4e80cbee48ecca36c7f91c77eb4910","urls":["bzz-raw://dc5711a2170c65f55ff2f94bbfe9d320c594a35dfa96e24dcfa444628c0d5d1a","dweb:/ipfs/QmQDdBX7Fy32FXSggcUXipzUmPvARWZWHVj7VAKFBBJMZZ"],"license":"MIT"},"src/interfaces/IERC20Permit.sol":{"keccak256":"0xe643a4c8e63b238f046e972f115b93327ea6cbf48ce0fbcfe2a8f5b0f335603d","urls":["bzz-raw://6295faf088edc01a97a01d9aa09cce5d92212ee437cc08c8ef13dd5ba4f252b0","dweb:/ipfs/QmQ3C3smquPZLpHituKokhMazpFQwQ51RyomfADgwBLSNd"],"license":"MIT"}},"version":1},"id":21}

==========
/apps/web/src/app/favicon.ico
==========
*(Binary file omitted)*

==========
/apps/web/src/app/globals.css
==========
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}


==========
/apps/web/src/app/layout.tsx
==========
// @file apps/web/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paralel Auction",
  description: "Web3 RWA Auction Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

==========
/apps/web/src/app/page.tsx
==========
// @file apps/web/src/app/page.tsx — Bidding UI with EIP-2612 Permit
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, usePublicClient } from 'wagmi';
import { parseUnits, parseGwei } from 'viem';
import { arbitrumSepolia } from 'wagmi/chains';
import abiData from './abi.json';

// UPDATE: Alamat Kontrak Baru (Hasil Deploy terakhir)
const CONTRACT_ADDRESS = "0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c";
const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; 
// UPDATE: AUCTION_KEY baru dari output RegisterDummy
const AUCTION_KEY = "0xa1d89d31c362a32af02565e4c5182512b37ef8a680d856d70b3d932b6221e0e1"; 

const erc20Abi = [
  { "constant": true, "inputs": [{ "name": "owner", "type": "address" }], "name": "nonces", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
] as const;

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();

  const { data: bidHash, writeContract: writeBid, isPending: isBidPending, error: bidError } = useWriteContract();
  
  const { isLoading: isBidConfirming, isSuccess: isBidConfirmed, isError: isBidTxError } = useWaitForTransactionReceipt({ hash: bidHash });
  
  const { signTypedDataAsync } = useSignTypedData();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (bidError) console.error("🚨 ERROR DARI WALLET/KONTRAK:", bidError);
  }, [bidError]);

  const { data: rawRoundData, refetch: refetchRound } = useReadContract({
    address: CONTRACT_ADDRESS, abi: abiData.abi, functionName: 'rounds', args: [AUCTION_KEY, 1],
  });
  const roundData = rawRoundData as any;

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
  });
  const balance = rawBalance ? Number(rawBalance) / 1e6 : 0;

  useEffect(() => {
    if (isBidConfirmed) { 
      setTimeout(() => { refetchRound(); refetchBalance(); }, 2000); 
      setBidAmount(''); 
    }
  }, [isBidConfirmed, refetchRound, refetchBalance]);

  if (!mounted) return <div className="p-10 text-center">Loading...</div>;

  const handleBidWithPermit = async () => {
    if (!bidAmount || !address || !publicClient || !roundData) return;
    
    try {
      setIsSigning(true);
      
      let amount;
      try { amount = parseUnits(bidAmount, 6); } 
      catch (e) { alert("Format angka tidak valid"); return; }

      const startingBid = BigInt(roundData[0]);
      
      const userStake = await publicClient.readContract({
        address: CONTRACT_ADDRESS, abi: abiData.abi, functionName: 'stakes', args: [AUCTION_KEY, 1, address],
      }) as [bigint, bigint, boolean];

      const myBid = userStake[0];
      const totalRequired = myBid === BigInt(0) ? startingBid + amount : amount;

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const userNonce = await publicClient.readContract({
        address: USDC_ADDRESS, abi: erc20Abi, functionName: 'nonces', args: [address],
      });

      const signature = await signTypedDataAsync({
        domain: { name: 'USD Coin', version: '2', chainId: arbitrumSepolia.id, verifyingContract: USDC_ADDRESS },
        types: {
          Permit: [
            { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        message: { owner: address, spender: CONTRACT_ADDRESS, value: totalRequired, nonce: userNonce, deadline: deadline },
      });

      const r = signature.slice(0, 66) as `0x${string}`;
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
      let v = parseInt(signature.slice(130, 132), 16);
      if (v < 27) v += 27;

      writeBid({
        address: CONTRACT_ADDRESS, 
        abi: abiData.abi, 
        functionName: 'placeBidWithPermit',
        args: [AUCTION_KEY, 1, amount, deadline, v, r, s],
        gas: BigInt(1500000),
        maxFeePerGas: parseGwei('0.1'),
        maxPriorityFeePerGas: parseGwei('0.01'),
      });

    } catch (err: any) {
      console.error("🚨 ERROR SAAT SIGN / PROSES:", err);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50 text-black">
      <h1 className="text-4xl font-bold mb-8">Paralel Auction Demo</h1>
      
      {!isConnected ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-gray-600">Connect your wallet to start bidding.</p>
          {connectors.map((connector) => (
            <button key={connector.uid} onClick={() => connect({ connector })} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              Connect {connector.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <p className="text-sm font-medium text-green-600">Connected: {address?.slice(0,6)}...{address?.slice(-4)}</p>
            <button onClick={() => disconnect()} className="text-sm text-red-600 font-medium">Disconnect</button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between">
            <span className="font-semibold text-blue-800">Your USDC Balance:</span>
            <span className="font-bold text-blue-800">{balance} USDC</span>
          </div>

          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Auction Info</h2>
            {roundData ? (
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Starting Bid</p>
                  <p className="font-bold text-lg">{Number(roundData[0]) / 1e6} USDC</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Current Bid</p>
                  <p className="font-bold text-lg text-green-600">{Number(roundData[4]) / 1e6} USDC</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Bid Increment</p>
                  <p className="font-bold">{Number(roundData[1]) / 1e6} USDC</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase font-semibold text-xs">Current Leader</p>
                  <p className="font-bold truncate">{roundData[5] === "0x0000000000000000000000000000000000000000" ? "None" : roundData[5]}</p>
                </div>
              </div>
            ) : <p className="text-gray-500">Loading data from blockchain...</p>}
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">Place a Bid (1-Click)</h3>
            
            <div className="flex gap-4 mb-4">
              <input 
                type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Amount (USDC)" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              
              <button 
                onClick={handleBidWithPermit}
                disabled={isSigning || isBidPending || isBidConfirming || !bidAmount}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {isSigning ? 'Sign Permit...' : isBidPending ? 'Check Wallet...' : isBidConfirming ? 'Confirming...' : 'Bid'}
              </button>
            </div>
            
            {bidError && (
              <p className="text-red-500 text-sm mt-2 break-words bg-red-50 p-2 rounded">
                Error: {bidError.message.split('\n')[0]}
              </p>
            )}
            {isBidTxError && (
              <p className="text-red-500 text-sm mt-2 break-words bg-red-50 p-2 rounded">
                Transaksi gagal di blockchain. Silakan coba lagi.
              </p>
            )}
            {isBidConfirmed && <p className="text-green-600 text-sm mt-2 bg-green-50 p-2 rounded">Bid successful! Updating data...</p>}
            
            <p className="text-xs text-gray-500 mt-4">
              *Note: You will sign a free message first, then confirm one gas transaction.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

==========
/apps/web/src/app/providers.tsx
==========
// @file apps/web/src/app/providers.tsx — Wagmi and React Query providers for Web3 connection
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const config = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

==========
/apps/web/tsconfig.json
==========
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}


==========
/context.config.json
==========
{
  "output": "CONTEXT.md",
  "annotations": {
    "prefix": "@file",
    "required": false
  },
  "tree": {
    "exclude": [
      "node_modules/**",
      "**/node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "**/out/**",
      "dist/**",
      "**/dist/**",
      "cache/**",
      "**/cache/**",
      "artifacts/**",
      "**/artifacts/**",
      "broadcast/**",
      "**/broadcast/**",
      "coverage/**",
      "**/coverage/**",
      ".git/**"
    ]
  },
  "scan": {
    "exclude": [
      "**/*.md",
      "node_modules/**",
      "**/node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "**/out/**",
      "dist/**",
      "**/dist/**",
      "cache/**",
      "**/cache/**",
      "artifacts/**",
      "**/artifacts/**",
      "broadcast/**",
      "**/broadcast/**",
      "coverage/**",
      "**/coverage/**",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lockb",
      "CONTEXT.md"
    ]
  },
  "specs": {
    "behavior": "docs/PARALEL.md",
    "contract": "docs/CONTRACT_SPEC.md",
    "stack": "docs/TECH_STACK.md",
    "skills": ".github/skills/*/SKILL.md"
  },
  "secretScan": {
    "failOnMatch": true
  }
}

==========
/contracts/.env
==========
# .env file for the project

## Neon database connection string
DATABASE_URL="postgresql://neondb_owner:npg_KDJNiMmr12ys@ep-crimson-math-azk6l0f1-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

## Private key dari wallet 'platform_owner/platform' (Untuk deploy)
PRIVATE_KEY="0x877778d4365992fd7361836bca1f2233da91c21d79b67457bdee9501da920987"

## URL RPC Arbitrum Sepolia
ARBITRUM_RPC_URL="https://rpc.ankr.com/arbitrum_sepolia/bb9da7a1eb0a3b8532ca1faa26a81800d57e31ca35fc8787572eb51dfb38289c"
USDC_ADDRESS="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"

## Public wallet addresses
PLATFORM_WALLET="0x5472CA834B67De0E54833e6F779725B4E77CA893"
TAX_WALLET="0xA5F1e31bDdadc99936eE2e4358794fB0b2e64F53"
RELAYER_WALLET="0x83A9B466234B81Cf67C4ECc5BD98c1F3e02BeC54"
AUCTION_CONTRACT_ADDRESS="0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c"
NOTARY_WALLET="0xc6bAF074ba3B8112b9ADf1f61F8133875f982FA2"
GUARANTOR_WALLET="0xB8b194df2352ead585843959d3E7363279207f6C"

## Testing for Auction
RELAYER_PRIVATE_KEY="0x83c99b03474521d8da07d1357fab15803a023e288b462d5b88a3dde375cca587"
NOTARY_PRIVATE_KEY="0x6aa29721fd750e29895f04907f0eb3245fce7818d8041100066db20320bdc49a"
CONSIGNOR_PRIVATE_KEY="0x52110937df244a5b04a7e70b0becd122a0a5eb12fe7aed119a036fcc2753574d"
GUARANTOR_PRIVATE_KEY="0x3dd3a387b9ac73f1e3f1e64214297ce820e8034f225832e3ff6ef23d06b05d41"

==========
/contracts/foundry.toml
==========
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
via_ir = true
optimizer = true
optimizer_runs = 200

# See more config options https://github.com/foundry-rs/foundry/blob/master/crates/config/README.md#all-options


==========
/contracts/README.md
==========
## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```


==========
/contracts/script/Deploy.s.sol
==========
// @file contracts/script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address platform = vm.envAddress("PLATFORM_WALLET");
        address tax = vm.envAddress("TAX_WALLET");
        address relayer = vm.envAddress("RELAYER_WALLET");

        vm.startBroadcast(deployerPrivateKey);
        ParalelAuction auction = new ParalelAuction(usdc, platform, tax, relayer);
        vm.stopBroadcast();

        console.log("==========================================");
        console.log("ParalelAuction deployed successfully!");
        console.log("Address:", address(auction));
        console.log("==========================================");
    }
}

==========
/contracts/script/RegisterDummy.s.sol
==========
// @file contracts/script/RegisterDummy.s.sol — Register a dummy auction for UI testing
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract RegisterDummy is Script {
    function run() external {
        address contractAddress = vm.envAddress("AUCTION_CONTRACT_ADDRESS");
        
        // Ambil private key
        uint256 notaryKey = vm.envUint("NOTARY_PRIVATE_KEY");
        uint256 consignorKey = vm.envUint("CONSIGNOR_PRIVATE_KEY");
        uint256 relayerKey = vm.envUint("RELAYER_PRIVATE_KEY"); // <-- TAMBAHAN
        
        address notary = vm.addr(notaryKey);
        address consignor = vm.addr(consignorKey);
        address guarantor = vm.envAddress("GUARANTOR_WALLET");

        ParalelAuction auction = ParalelAuction(contractAddress);

        bytes32 auctionKey = keccak256(abi.encodePacked("AUCTION-TEST-2"));
        bytes32 confHash = keccak256(abi.encodePacked("CODE-123"));
        
        uint128 startBid = 2e6;       // 2 USDC (2 * 10^6)
        uint128 inc = 50000;          // 0.05 USDC (0.05 * 10^6)
        
        uint64 openAt = uint64(block.timestamp + 49 hours);
        uint16 dur = 24;
        
        uint256 expiry = block.timestamp + 1 days;

        // 1. Hitung paramsHash untuk NotaryApproval
        bytes32 paramsHash = keccak256(abi.encode(startBid, inc, openAt, dur));
        
        // 2. Buat signature Notary
        bytes32 notaryHash = keccak256(abi.encode(auction.NOTARY_APPROVAL_TYPEHASH(), auctionKey, paramsHash, confHash, uint256(0), expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), notaryHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryKey, digest);
        bytes memory notarySig = abi.encodePacked(r, s, v);

        // 3. Buat signature Consignor
        bytes32 consHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, confHash, uint256(0), expiry));
        digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), consHash));
        (v, r, s) = vm.sign(consignorKey, digest);
        bytes memory consignorSig = abi.encodePacked(r, s, v);

        // 4. Masukkan ke struct
        ParalelAuction.RegisterAuctionParams memory p = ParalelAuction.RegisterAuctionParams({
            auctionKey: auctionKey, 
            consignor: consignor, 
            guarantor: guarantor, 
            notary: notary,
            category: 1, 
            specHash: keccak256(abi.encodePacked("SPEC-2")), 
            startingBid: startBid,
            bidIncrement: inc,
            openAt: openAt, 
            durationHours: dur, 
            platformBps: 250, 
            guarantorBps: 150, 
            notaryBps: 100, 
            taxBps: 1000,
            confirmationCodeHash: confHash, 
            notarySig: notarySig, 
            consignorSig: consignorSig,
            notaryNonce: 0, 
            notaryExpiry: expiry, 
            consignorNonce: 0, 
            consignorExpiry: expiry
        });

        // PENTING: Masukkan relayerKey agar transaksi diakui sebagai Relayer
        vm.startBroadcast(relayerKey);
        auction.registerAuction(p);
        vm.stopBroadcast();

        console.log("==========================================");
        console.log("Dummy Auction 2 Registered!");
        console.log("Starting Bid: 2 USDC");
        console.log("Bid Increment: 0.05 USDC");
        console.log("AUCTION_KEY:");
        console.logBytes32(auctionKey);
        console.log("==========================================");
    }
}

==========
/contracts/script/Setup.s.sol
==========
// @file contracts/script/Setup.s.sol — Setup script to register partners
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";

contract Setup is Script {
    function run() external {
        // 1. Ambil private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address contractAddress = vm.envAddress("AUCTION_CONTRACT_ADDRESS");
        address notary = vm.envAddress("NOTARY_WALLET");
        address guarantor = vm.envAddress("GUARANTOR_WALLET");

        ParalelAuction auction = ParalelAuction(contractAddress);

        // 2. Masukkan ke dalam broadcast
        vm.startBroadcast(deployerPrivateKey);

        auction.setPartner(notary, ParalelAuction.PartnerType.NOTARY, 0, true);
        console.log("Notary registered:", notary);

        auction.setPartner(guarantor, ParalelAuction.PartnerType.GUARANTOR, 1, true);
        console.log("Guarantor registered:", guarantor);

        vm.stopBroadcast();
    }
}

==========
/contracts/src/interfaces/IERC20Permit.sol
==========
// @file contracts/src/interfaces/IERC20Permit.sol — Interface for USDC (ERC20 + EIP-2612 permit)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

interface IERC20Permit is IERC20 {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

==========
/contracts/src/ParalelAuction.sol
==========
// @file contracts/src/ParalelAuction.sol — Core auction contract
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Permit} from "./interfaces/IERC20Permit.sol";

contract ParalelAuction {
    // ==========================================
    // CONSTANTS
    // ==========================================
    uint16 public constant RANK_SLOTS = 10;
    uint256 public constant SIGNING_WINDOW = 5 minutes;
    uint256 public constant COLLECTION_WINDOW = 48 hours;
    uint256 public constant CLAIM_WINDOW = 168 hours;
    uint128 public constant WITHDRAW_FEE = 2.5e6; 
    
    // PERUBAHAN: Menjadi 6 opsi (dimulai dari 0.05 USDC)
    uint128[6] public allowedIncrements = [50000, 500000, 5000000, 50000000, 500000000, 5000000000];

    // ==========================================
    // ENUMS & STRUCTS
    // ==========================================
    enum Status {
        SCHEDULED, OPEN, CLOSED, AWARDING, COLLECTION, 
        CLAIM_PERIOD, SETTLED, PASSED_IN, WITHDRAWN
    }

    enum PartnerType { NOTARY, GUARANTOR }

    struct Auction {
        address consignor;
        address guarantor;
        address notary;
        uint8 category;
        Status status;
        uint16 currentRound;
        bytes32 specHash;
        uint16 platformBps;
        uint16 guarantorBps;
        uint16 notaryBps;
        uint16 taxBps;
    }

    struct Round {
        uint128 startingBid;
        uint128 bidIncrement;
        uint64 openAt;
        uint64 closeAt;
        uint128 currentBid;
        address currentLeader;
        uint64 bidSeq;
        address[10] topRanks;
        uint8 awardingIndex;
        uint64 awardingDeadline;
        address winner;
        uint128 winnerStake;
        uint64 collectionDeadline;
        uint64 claimPeriodEnd;
    }

    struct Stake {
        uint128 myBid;
        uint64 reachedSeq;
        bool withdrawn;
    }

    struct Partner {
        PartnerType pType;
        uint8 category;
        bool active;
    }

    struct RegisterAuctionParams {
        bytes32 auctionKey;
        address consignor;
        address guarantor;
        address notary;
        uint8 category;
        bytes32 specHash;
        uint128 startingBid;
        uint128 bidIncrement;
        uint64 openAt;
        uint16 durationHours;
        uint16 platformBps;
        uint16 guarantorBps;
        uint16 notaryBps;
        uint16 taxBps;
        bytes32 confirmationCodeHash;
        bytes notarySig;
        bytes consignorSig;
        uint256 notaryNonce;
        uint256 notaryExpiry;
        uint256 consignorNonce;
        uint256 consignorExpiry;
    }

    // ==========================================
    // STATE VARIABLES
    // ==========================================
    address public owner;
    address public relayerWallet;
    address public platformWallet;
    address public taxWallet;
    IERC20Permit public usdc;
    bool private locked;

    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => mapping(uint16 => Round)) public rounds;
    mapping(bytes32 => mapping(uint16 => mapping(address => Stake))) public stakes;
    mapping(address => Partner) public partners;
    mapping(address => uint128) public claimable;
    mapping(address => uint256) public nonces;

    // ==========================================
    // EIP-712 DOMAIN
    // ==========================================
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant NOTARY_APPROVAL_TYPEHASH = keccak256("NotaryApproval(bytes32 auctionKey,bytes32 paramsHash,bytes32 confirmationCodeHash,uint256 nonce,uint256 expiry)");
    bytes32 public constant CONSIGNOR_CONFIRM_TYPEHASH = keccak256("ConsignorConfirm(bytes32 auctionKey,bytes32 confirmationCodeHash,uint256 nonce,uint256 expiry)");
    bytes32 public constant AWARD_SIGN_TYPEHASH = keccak256("AwardSign(bytes32 auctionKey,uint16 roundNo,uint8 rank,uint256 nonce,uint256 expiry)");
    bytes32 public constant COLLECTED_TYPEHASH = keccak256("Collected(bytes32 auctionKey,uint16 roundNo,uint256 nonce,uint256 expiry)");
    bytes32 public constant WITHDRAWN_TYPEHASH = keccak256("Withdrawn(bytes32 auctionKey,uint16 roundNo,uint256 nonce,uint256 expiry)");
    bytes32 public constant WITHDRAW_REQUEST_TYPEHASH = keccak256("WithdrawRequest(bytes32 auctionKey,uint16 roundNo,address wallet,uint256 nonce,uint256 expiry)");

    // ==========================================
    // EVENTS
    // ==========================================
    event AuctionRegistered(bytes32 indexed auctionKey, address consignor, address guarantor, address notary, bytes32 specHash, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours);
    event RoundScheduled(bytes32 indexed auctionKey, uint16 roundNo, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint64 closeAt);
    event BidPlaced(bytes32 indexed auctionKey, uint16 roundNo, address indexed bidder, uint128 added, uint128 myBidAfter, uint128 currentBidAfter, uint64 seq, bool isPreBid);
    event Closed(bytes32 indexed auctionKey, uint16 roundNo);
    event AwardingStarted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint64 deadline);
    event AwardSigned(bytes32 indexed auctionKey, uint16 roundNo, address winner);
    event Defaulted(bytes32 indexed auctionKey, uint16 roundNo, address candidate, uint128 defaultFee);
    event PassedIn(bytes32 indexed auctionKey, uint16 roundNo);
    event Collected(bytes32 indexed auctionKey, uint16 roundNo);
    event ClaimPeriodStarted(bytes32 indexed auctionKey, uint16 roundNo, bool autoIssued);
    event WithdrawnItem(bytes32 indexed auctionKey, uint16 roundNo);
    event FeeCredited(address indexed recipient, uint128 amount);
    event Withdrawal(bytes32 indexed auctionKey, uint16 roundNo, address indexed wallet, uint8 kind, uint128 gross, uint128 fee, uint128 net);
    event Settled(bytes32 indexed auctionKey, uint16 roundNo);

    // ==========================================
    // MODIFIERS & ERRORS
    // ==========================================
    error NotOwner();
    error NotRelayer();
    error PartnerNotRegistered();
    error AuctionExists();
    error InvalidIncrement();
    error IncrementTooLarge();
    error InvalidDuration();
    error InvalidOpenTime();
    error AuctionNotBiddable();
    error BiddingClosed();
    error ConsignorCannotBid();
    error NotMultipleOfIncrement();
    error TooEarly();
    error WrongPhase();
    error BadSignature();
    error CategoryMismatch();
    error AlreadyWithdrawn();
    error NotRefundable();
    error WinnerCannotWithdraw();
    error NothingToClaim();
    error SignatureExpired();
    error NonceUsed();
    error NotCurrentCandidate();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }
    modifier onlyRelayer() { if (msg.sender != relayerWallet) revert NotRelayer(); _; }
    modifier nonReentrant() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================
    constructor(address _usdc, address _platformWallet, address _taxWallet, address _relayerWallet) {
        owner = msg.sender;
        usdc = IERC20Permit(_usdc);
        platformWallet = _platformWallet;
        taxWallet = _taxWallet;
        relayerWallet = _relayerWallet;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("ParalelAuction"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    // ==========================================
    // VIEW FUNCTIONS 
    // ==========================================
    function statusOf(bytes32 auctionKey) public view returns (Status) {
        Auction storage a = auctions[auctionKey];
        Round storage r = rounds[auctionKey][a.currentRound];
        
        if (a.status == Status.SCHEDULED) {
            if (block.timestamp >= r.closeAt) return Status.CLOSED;
            if (block.timestamp >= r.openAt) return Status.OPEN;
        }
        return a.status;
    }

    function getAuction(bytes32 auctionKey) external view returns (Auction memory) {
        return auctions[auctionKey];
    }

    function getRound(bytes32 auctionKey, uint16 roundNo) external view returns (Round memory) {
        return rounds[auctionKey][roundNo];
    }

    function getTopRanks(bytes32 auctionKey, uint16 roundNo) external view returns (address[10] memory) {
        return rounds[auctionKey][roundNo].topRanks;
    }

    function getStake(bytes32 auctionKey, uint16 roundNo, address bidder) external view returns (Stake memory) {
        return stakes[auctionKey][roundNo][bidder];
    }

    function claimableOf(address wallet) external view returns (uint128) {
        return claimable[wallet];
    }

    function refundableOf(bytes32 auctionKey, uint16 roundNo, address bidder) external view returns (uint128 gross, uint128 fee, uint128 net) {
        Stake storage s = stakes[auctionKey][roundNo][bidder];
        if (s.myBid == 0 || s.withdrawn) return (0, 0, 0);
        if (rounds[auctionKey][roundNo].winner == bidder) return (0, 0, 0);

        gross = s.myBid;
        fee = gross < WITHDRAW_FEE ? gross : WITHDRAW_FEE;
        net = gross - fee;
    }

    // ==========================================
    // OWNER & REGISTER
    // ==========================================
    function setPartner(address wallet, PartnerType pType, uint8 category, bool active) external onlyOwner {
        partners[wallet] = Partner(pType, category, active);
    }

    function setRelayer(address newRelayer) external onlyOwner {
        relayerWallet = newRelayer;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert NotOwner();
        owner = newOwner;
    }

    function registerAuction(RegisterAuctionParams calldata p) external onlyRelayer {
        if (auctions[p.auctionKey].consignor != address(0)) revert AuctionExists();
        Partner memory g = partners[p.guarantor];
        Partner memory n = partners[p.notary];
        if (!g.active || g.pType != PartnerType.GUARANTOR || !n.active || n.pType != PartnerType.NOTARY) revert PartnerNotRegistered();
        if (g.category != p.category) revert CategoryMismatch();

        if (p.startingBid == 0) revert InvalidIncrement();
        bool validIncrement = false;
        // PERUBAHAN: Loop menjadi 6
        for (uint i = 0; i < 6; i++) {
            if (p.bidIncrement == allowedIncrements[i]) { validIncrement = true; break; }
        }
        if (!validIncrement) revert InvalidIncrement();
        if (p.bidIncrement * 20 > p.startingBid) revert IncrementTooLarge();
        if (p.durationHours < 12 || p.durationHours > 48) revert InvalidDuration();
        
        uint64 minOpen = uint64(block.timestamp) + 48 hours;
        uint64 maxOpen = uint64(block.timestamp) + 168 hours;
        if (p.openAt < minOpen || p.openAt > maxOpen) revert InvalidOpenTime();

        bytes32 paramsHash = keccak256(abi.encode(p.startingBid, p.bidIncrement, p.openAt, p.durationHours));
        bytes32 notaryHash = keccak256(abi.encode(NOTARY_APPROVAL_TYPEHASH, p.auctionKey, paramsHash, p.confirmationCodeHash, p.notaryNonce, p.notaryExpiry));
        if (!_verifySig(p.notary, notaryHash, p.notaryNonce, p.notaryExpiry, p.notarySig)) revert BadSignature();

        bytes32 consignorHash = keccak256(abi.encode(CONSIGNOR_CONFIRM_TYPEHASH, p.auctionKey, p.confirmationCodeHash, p.consignorNonce, p.consignorExpiry));
        if (!_verifySig(p.consignor, consignorHash, p.consignorNonce, p.consignorExpiry, p.consignorSig)) revert BadSignature();

        auctions[p.auctionKey] = Auction({
            consignor: p.consignor, guarantor: p.guarantor, notary: p.notary, category: p.category,
            status: Status.SCHEDULED, currentRound: 1, specHash: p.specHash,
            platformBps: p.platformBps, guarantorBps: p.guarantorBps, notaryBps: p.notaryBps, taxBps: p.taxBps
        });

        uint64 closeAt = p.openAt + (uint64(p.durationHours) * 1 hours);
        Round storage r = rounds[p.auctionKey][1];
        r.startingBid = p.startingBid;
        r.bidIncrement = p.bidIncrement;
        r.openAt = p.openAt;
        r.closeAt = closeAt;

        emit AuctionRegistered(p.auctionKey, p.consignor, p.guarantor, p.notary, p.specHash, p.startingBid, p.bidIncrement, p.openAt, p.durationHours);
        emit RoundScheduled(p.auctionKey, 1, p.startingBid, p.bidIncrement, p.openAt, closeAt);
    }

    function reuseRound(bytes32 auctionKey, uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        if (a.status != Status.PASSED_IN) revert WrongPhase();

        bytes32 structHash = keccak256(abi.encode(CONSIGNOR_CONFIRM_TYPEHASH, auctionKey, bytes32(0), nonce, expiry));
        if (!_verifySig(a.consignor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        if (startingBid == 0) revert InvalidIncrement();
        bool validIncrement = false;
        // PERUBAHAN: Loop menjadi 6
        for (uint i = 0; i < 6; i++) {
            if (bidIncrement == allowedIncrements[i]) { validIncrement = true; break; }
        }
        if (!validIncrement) revert InvalidIncrement();
        if (bidIncrement * 20 > startingBid) revert IncrementTooLarge();
        if (durationHours < 12 || durationHours > 48) revert InvalidDuration();
        
        uint64 minOpen = uint64(block.timestamp) + 48 hours;
        uint64 maxOpen = uint64(block.timestamp) + 168 hours;
        if (openAt < minOpen || openAt > maxOpen) revert InvalidOpenTime();

        a.currentRound++;
        a.status = Status.SCHEDULED;

        uint16 newRound = a.currentRound;
        uint64 closeAt = openAt + (uint64(durationHours) * 1 hours);
        
        Round storage newRoundData = rounds[auctionKey][newRound];
        newRoundData.startingBid = startingBid;
        newRoundData.bidIncrement = bidIncrement;
        newRoundData.openAt = openAt;
        newRoundData.closeAt = closeAt;

        emit RoundScheduled(auctionKey, newRound, startingBid, bidIncrement, openAt, closeAt);
    }

    function markWithdrawn(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        if (a.status != Status.PASSED_IN) revert WrongPhase();

        bytes32 structHash = keccak256(abi.encode(WITHDRAWN_TYPEHASH, auctionKey, roundNo, nonce, expiry));
        if (!_verifySig(a.guarantor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        a.status = Status.WITHDRAWN;
        emit WithdrawnItem(auctionKey, roundNo);
    }

    // ==========================================
    // BIDDING
    // ==========================================
    function placeBid(bytes32 auctionKey, uint16 roundNo, uint128 amount) external {
        _placeBid(auctionKey, roundNo, amount);
    }

    function placeBidWithPermit(bytes32 auctionKey, uint16 roundNo, uint128 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        Stake storage bidderStake = stakes[auctionKey][roundNo][msg.sender];
        uint128 totalRequired = amount;
        if (bidderStake.myBid == 0) totalRequired += rounds[auctionKey][roundNo].startingBid;
        usdc.permit(msg.sender, address(this), totalRequired, deadline, v, r, s);
        _placeBid(auctionKey, roundNo, amount);
    }

    function _placeBid(bytes32 auctionKey, uint16 roundNo, uint128 amount) internal nonReentrant {
        Auction storage a = auctions[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];

        if (r.closeAt == 0 || block.timestamp >= r.closeAt) revert BiddingClosed();
        if (a.status != Status.SCHEDULED && a.status != Status.OPEN) revert AuctionNotBiddable();
        if (msg.sender == a.consignor) revert ConsignorCannotBid();
        if (amount == 0 || amount % r.bidIncrement != 0) revert NotMultipleOfIncrement();

        Stake storage s = stakes[auctionKey][roundNo][msg.sender];
        uint128 totalToTransfer = (s.myBid == 0) ? (r.startingBid + amount) : amount;

        s.myBid += totalToTransfer;
        s.reachedSeq = r.bidSeq;
        
        if (s.myBid > r.currentBid) {
            r.currentBid = s.myBid;
            r.currentLeader = msg.sender;
        }

        _updateTopRanks(auctionKey, roundNo, msg.sender);
        r.bidSeq++;

        require(usdc.transferFrom(msg.sender, address(this), totalToTransfer), "USDC transfer failed");

        emit BidPlaced(auctionKey, roundNo, msg.sender, amount, s.myBid, r.currentBid, s.reachedSeq, (a.status == Status.SCHEDULED));
    }

    // ==========================================
    // AWARDING & SETTLEMENT
    // ==========================================
    function startAwarding(bytes32 auctionKey, uint16 roundNo) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];

        if (roundNo != a.currentRound) revert WrongPhase();
        if (a.status != Status.SCHEDULED) revert WrongPhase();

        if (block.timestamp < r.closeAt) revert TooEarly();

        emit Closed(auctionKey, roundNo);

        if (r.topRanks[0] == address(0)) {
            a.status = Status.PASSED_IN;
            emit PassedIn(auctionKey, roundNo);
        } else {
            a.status = Status.AWARDING;
            r.awardingIndex = 0;
            r.awardingDeadline = uint64(block.timestamp) + uint64(SIGNING_WINDOW);
            emit AwardingStarted(auctionKey, roundNo, r.topRanks[0], r.awardingDeadline);
        }
    }

    function submitAwardSignature(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];

        if (a.status != Status.AWARDING) revert WrongPhase();
        if (block.timestamp > roundData.awardingDeadline) revert TooEarly(); 

        address candidate = roundData.topRanks[roundData.awardingIndex];
        if (candidate == address(0)) revert NotCurrentCandidate(); 
        
        bytes32 structHash = keccak256(abi.encode(AWARD_SIGN_TYPEHASH, auctionKey, roundNo, roundData.awardingIndex, nonce, expiry));
        if (!_verifySig(candidate, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert NotCurrentCandidate();

        roundData.winner = candidate;
        roundData.winnerStake = stakes[auctionKey][roundNo][candidate].myBid;
        a.status = Status.COLLECTION;
        roundData.collectionDeadline = uint64(block.timestamp) + uint64(COLLECTION_WINDOW);

        emit AwardSigned(auctionKey, roundNo, candidate);
    }

    function advanceCandidate(bytes32 auctionKey, uint16 roundNo) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];

        if (a.status != Status.AWARDING) revert WrongPhase();
        if (block.timestamp <= r.awardingDeadline) revert TooEarly(); 

        address candidate = r.topRanks[r.awardingIndex];
        Stake storage cStake = stakes[auctionKey][roundNo][candidate];
        
        uint16 dynamicDefaultFeeBps = a.platformBps + a.guarantorBps + a.notaryBps;
        uint128 defaultFee = (cStake.myBid * dynamicDefaultFeeBps) / 10000;
        cStake.myBid -= defaultFee;

        uint128 toGuarantor = (defaultFee * a.guarantorBps) / dynamicDefaultFeeBps;
        uint128 toNotary = (defaultFee * a.notaryBps) / dynamicDefaultFeeBps;
        uint128 toPlatform = defaultFee - toGuarantor - toNotary;

        claimable[platformWallet] += toPlatform;
        claimable[a.guarantor] += toGuarantor;
        claimable[a.notary] += toNotary;

        emit FeeCredited(platformWallet, toPlatform);
        emit FeeCredited(a.guarantor, toGuarantor);
        emit FeeCredited(a.notary, toNotary);

        emit Defaulted(auctionKey, roundNo, candidate, defaultFee);

        r.awardingIndex++;
        
        if (r.awardingIndex >= 10 || r.topRanks[r.awardingIndex] == address(0)) {
            a.status = Status.PASSED_IN;
            emit PassedIn(auctionKey, roundNo);
        } else {
            r.awardingDeadline = uint64(block.timestamp) + uint64(SIGNING_WINDOW);
            emit AwardingStarted(auctionKey, roundNo, r.topRanks[r.awardingIndex], r.awardingDeadline);
        }
    }

    function collected(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];
        
        if (a.status != Status.COLLECTION) revert WrongPhase();
        if (block.timestamp > roundData.collectionDeadline) revert TooEarly();

        bytes32 structHash = keccak256(abi.encode(COLLECTED_TYPEHASH, auctionKey, roundNo, nonce, expiry));
        if (!_verifySig(a.guarantor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        a.status = Status.CLAIM_PERIOD;
        roundData.claimPeriodEnd = uint64(block.timestamp) + uint64(CLAIM_WINDOW);
        
        emit Collected(auctionKey, roundNo);
        emit ClaimPeriodStarted(auctionKey, roundNo, false);
    }

    function expireCollection(bytes32 auctionKey, uint16 roundNo) external onlyRelayer {
        Auction storage a = auctions[auctionKey];
        Round storage r = rounds[auctionKey][roundNo];
        
        if (a.status != Status.COLLECTION) revert WrongPhase();
        if (block.timestamp <= r.collectionDeadline) revert TooEarly();

        a.status = Status.CLAIM_PERIOD;
        r.claimPeriodEnd = r.collectionDeadline + uint64(CLAIM_WINDOW);

        emit ClaimPeriodStarted(auctionKey, roundNo, true);
    }

    function withdrawRefund(bytes32 auctionKey, uint16 roundNo, address bidder, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer nonReentrant {
        Auction storage a = auctions[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];
        Stake storage bidderStake = stakes[auctionKey][roundNo][bidder];

        bytes32 structHash = keccak256(abi.encode(WITHDRAW_REQUEST_TYPEHASH, auctionKey, roundNo, bidder, nonce, expiry));
        if (!_verifySig(bidder, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        if (bidderStake.myBid == 0) revert NothingToClaim();
        if (bidderStake.withdrawn) revert AlreadyWithdrawn();
        if (bidder == roundData.winner) revert WinnerCannotWithdraw();

        bool isClosed = block.timestamp >= roundData.closeAt;
        bool isTop10 = false;
        bool isDefaulted = false;
        
        for (uint8 i = 0; i < 10; i++) {
            if (roundData.topRanks[i] == bidder) {
                isTop10 = true;
                if (i < roundData.awardingIndex) isDefaulted = true;
                break;
            }
        }

        if (a.status == Status.SCHEDULED || a.status == Status.OPEN) {
            if (!isClosed) revert TooEarly(); 
            if (isTop10) revert NotRefundable(); 
        } else if (a.status == Status.AWARDING) {
            if (!isDefaulted && isTop10) revert TooEarly(); 
        } else if (a.status == Status.COLLECTION || a.status == Status.CLAIM_PERIOD || a.status == Status.SETTLED) {
            if (isTop10 && !isDefaulted) {
                if (roundData.winner == address(0)) revert TooEarly();
            }
        } else if (a.status == Status.PASSED_IN) {
            // Boleh tarik semua
        } else {
            revert NotRefundable();
        }

        bidderStake.withdrawn = true;
        uint128 gross = bidderStake.myBid;
        uint128 fee = gross < WITHDRAW_FEE ? gross : WITHDRAW_FEE;
        uint128 net = gross - fee;

        if (fee > 0) claimable[platformWallet] += fee;
        require(usdc.transfer(bidder, net), "Transfer failed"); 

        emit Withdrawal(auctionKey, roundNo, bidder, 0, gross, fee, net);
    }

    function withdrawConsignor(bytes32 auctionKey, uint16 roundNo, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external onlyRelayer nonReentrant {
        Auction storage a = auctions[auctionKey];
        Round storage roundData = rounds[auctionKey][roundNo];
        
        if (a.status != Status.CLAIM_PERIOD) revert WrongPhase();
        if (block.timestamp < roundData.claimPeriodEnd) revert TooEarly();

        bytes32 structHash = keccak256(abi.encode(WITHDRAW_REQUEST_TYPEHASH, auctionKey, roundNo, a.consignor, nonce, expiry));
        if (!_verifySig(a.consignor, structHash, nonce, expiry, abi.encodePacked(r, s, v))) revert BadSignature();

        a.status = Status.SETTLED;
        uint128 stake = roundData.winnerStake;

        uint128 toPlatform = (stake * a.platformBps) / 10000;
        uint128 toGuarantor = (stake * a.guarantorBps) / 10000;
        uint128 toNotary = (stake * a.notaryBps) / 10000;
        uint128 toTax = (stake * a.taxBps) / 10000;
        uint128 consignorShare = stake - toPlatform - toGuarantor - toNotary - toTax;

        claimable[platformWallet] += toPlatform;
        claimable[a.guarantor] += toGuarantor;
        claimable[a.notary] += toNotary;
        claimable[taxWallet] += toTax;

        emit FeeCredited(platformWallet, toPlatform);
        emit FeeCredited(a.guarantor, toGuarantor);
        emit FeeCredited(a.notary, toNotary);
        emit FeeCredited(taxWallet, toTax);

        uint128 fee = consignorShare < WITHDRAW_FEE ? consignorShare : WITHDRAW_FEE;
        uint128 net = consignorShare - fee;
        
        if (fee > 0) claimable[platformWallet] += fee;
        require(usdc.transfer(a.consignor, net), "Transfer failed");

        emit Settled(auctionKey, roundNo);
        emit Withdrawal(auctionKey, roundNo, a.consignor, 1, consignorShare, fee, net);
    }

    function withdrawClaimable() external nonReentrant {
        uint128 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimable[msg.sender] = 0;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");

        emit Withdrawal(bytes32(0), 0, msg.sender, 2, amount, 0, amount);
    }

    // ==========================================
    // INTERNAL HELPERS
    // ==========================================
    function _verifySig(address signer, bytes32 structHash, uint256 nonce, uint256 expiry, bytes memory signature) internal returns (bool) {
        if (block.timestamp > expiry) revert SignatureExpired();
        if (nonce != nonces[signer]) revert NonceUsed();

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (signature.length != 65) return false;
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0) || recovered != signer) return false;
        
        nonces[signer]++;
        return true;
    }

    function _updateTopRanks(bytes32 auctionKey, uint16 roundNo, address bidder) internal {
        Round storage r = rounds[auctionKey][roundNo];
        Stake storage newStake = stakes[auctionKey][roundNo][bidder];

        for (uint i = 0; i < 10; i++) {
            if (r.topRanks[i] == bidder) { r.topRanks[i] = address(0); break; }
        }

        uint insertIndex = 10;
        for (uint i = 0; i < 10; i++) {
            if (r.topRanks[i] == address(0)) { insertIndex = i; break; }
            else {
                Stake storage existingStake = stakes[auctionKey][roundNo][r.topRanks[i]];
                if (newStake.myBid > existingStake.myBid || (newStake.myBid == existingStake.myBid && newStake.reachedSeq < existingStake.reachedSeq)) {
                    insertIndex = i; break;
                }
            }
        }

        if (insertIndex < 10) {
            for (uint i = 9; i > insertIndex; i--) { r.topRanks[i] = r.topRanks[i-1]; }
            r.topRanks[insertIndex] = bidder;
        }
    }
}

==========
/contracts/test/mocks/MockERC20.sol
==========
// @file contracts/test/mocks/MockERC20.sol — Mock ERC20 for testing bids
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

==========
/contracts/test/ParalelAuction.t.sol
==========
// @file contracts/test/ParalelAuction.t.sol — Unit tests for core auction logic
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ParalelAuctionTest is Test {
    ParalelAuction public auction;
    MockERC20 public usdc;
    
    address public platform = address(1);
    address public tax = address(2);
    address public relayer = address(3);
    
    uint256 public notaryKey = 0xA11CE;
    uint256 public guarantorKey = 0xB0B; 
    uint256 public consignorKey = 0xC0C; 
    uint256 public bidderKey = 0xD0D;
    
    address public notary = vm.addr(notaryKey);
    address public guarantor = vm.addr(guarantorKey);
    address public consignor = vm.addr(consignorKey);
    address public bidder = vm.addr(bidderKey);

    bytes32 public auctionKey = keccak256(abi.encodePacked("AUCTION-1"));
    bytes32 public confHash = keccak256(abi.encodePacked("CODE-123"));

    function setUp() public {
        usdc = new MockERC20();
        auction = new ParalelAuction(address(usdc), platform, tax, relayer);
        
        auction.setPartner(notary, ParalelAuction.PartnerType.NOTARY, 0, true);
        auction.setPartner(guarantor, ParalelAuction.PartnerType.GUARANTOR, 1, true);
    }

    function _registerHelper() internal {
        bytes32 specHash = keccak256(abi.encodePacked("SPEC-1"));
        uint64 openAt = uint64(block.timestamp + 49 hours);
        uint256 currentExpiry = block.timestamp + 1 days;
        
        uint128 startBid = 1000e6;
        uint128 inc = 5e6;
        uint16 dur = 24;

        bytes32 paramsHash = keccak256(abi.encode(startBid, inc, openAt, dur));
        bytes32 notaryHash = keccak256(abi.encode(auction.NOTARY_APPROVAL_TYPEHASH(), auctionKey, paramsHash, confHash, uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), notaryHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryKey, digest);
        bytes memory notarySig = abi.encodePacked(r, s, v);

        bytes32 consHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, confHash, uint256(0), currentExpiry));
        digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), consHash));
        (v, r, s) = vm.sign(consignorKey, digest);
        bytes memory consignorSig = abi.encodePacked(r, s, v);

        ParalelAuction.RegisterAuctionParams memory p = ParalelAuction.RegisterAuctionParams({
            auctionKey: auctionKey, consignor: consignor, guarantor: guarantor, notary: notary,
            category: 1, specHash: specHash, startingBid: startBid, bidIncrement: inc,
            openAt: openAt, durationHours: dur, platformBps: 250, guarantorBps: 150, notaryBps: 100, taxBps: 1000,
            confirmationCodeHash: confHash, notarySig: notarySig, consignorSig: consignorSig,
            notaryNonce: 0, notaryExpiry: currentExpiry, consignorNonce: 0, consignorExpiry: currentExpiry
        });

        vm.prank(relayer);
        auction.registerAuction(p);
    }

    function _placeBidHelper() internal {
        usdc.mint(bidder, 5000e6);
        vm.prank(bidder);
        usdc.approve(address(auction), type(uint256).max);

        vm.prank(bidder);
        auction.placeBid(auctionKey, 1, 10e6);
    }

    function test_RegisterAuction() public {
        _registerHelper();
        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(a.consignor, consignor);
        assertEq(a.guarantor, guarantor);
        assertEq(a.notary, notary);
    }

    function test_PlaceBid() public {
        _registerHelper();
        _placeBidHelper();
        
        ParalelAuction.Stake memory s = auction.getStake(auctionKey, 1, bidder);
        assertEq(s.myBid, 1010e6, "myBid incorrect");
        assertEq(s.reachedSeq, 0, "seq incorrect");
        assertEq(s.withdrawn, false);

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        assertEq(roundData.currentBid, 1010e6, "currentBid incorrect");
        assertEq(roundData.currentLeader, bidder, "currentLeader incorrect");
    }

    function test_StartAwarding_PassedIn() public {
        _registerHelper();
        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(uint8(a.status), uint8(ParalelAuction.Status.PASSED_IN));
    }

    function test_StartAwarding_And_Sign() public {
        _registerHelper();
        _placeBidHelper();

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.AWARD_SIGN_TYPEHASH(), auctionKey, uint16(1), uint8(0), uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 sigV, bytes32 sigR, bytes32 sigS) = vm.sign(bidderKey, digest);

        vm.prank(relayer);
        auction.submitAwardSignature(auctionKey, 1, 0, currentExpiry, sigV, sigR, sigS);

        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(uint8(a.status), uint8(ParalelAuction.Status.COLLECTION));
        
        // PERBAIKAN: Menggunakan roundDataAfter, bukan r2
        ParalelAuction.Round memory roundDataAfter = auction.getRound(auctionKey, 1);
        assertEq(roundDataAfter.winner, bidder);
    }

    function test_AdvanceCandidate_Defaulted() public {
        _registerHelper();
        _placeBidHelper();

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        vm.warp(block.timestamp + 5 minutes + 1);

        vm.prank(relayer);
        auction.advanceCandidate(auctionKey, 1);

        ParalelAuction.Auction memory a = auction.getAuction(auctionKey);
        assertEq(uint8(a.status), uint8(ParalelAuction.Status.PASSED_IN));

        ParalelAuction.Stake memory s = auction.getStake(auctionKey, 1, bidder);
        assertEq(s.myBid, 959.5e6);
    }

    function test_WithdrawRefund_PassedIn() public {
        _registerHelper();
        _placeBidHelper();

        ParalelAuction.Round memory roundData = auction.getRound(auctionKey, 1);
        vm.warp(roundData.closeAt + 1);

        vm.prank(relayer);
        auction.startAwarding(auctionKey, 1);

        vm.warp(block.timestamp + 5 minutes + 1);
        vm.prank(relayer);
        auction.advanceCandidate(auctionKey, 1);

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.WITHDRAW_REQUEST_TYPEHASH(), auctionKey, uint16(1), bidder, uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 sigV, bytes32 sigR, bytes32 sigS) = vm.sign(bidderKey, digest);

        uint256 balBefore = usdc.balanceOf(bidder);
        
        vm.prank(relayer);
        auction.withdrawRefund(auctionKey, 1, bidder, 0, currentExpiry, sigV, sigR, sigS);

        uint256 balAfter = usdc.balanceOf(bidder);
        assertEq(balAfter - balBefore, 957e6, "Refund amount incorrect");

        assertEq(auction.claimableOf(platform), 27.75e6, "Platform claimable incorrect");
    }
}

==========
/contracts/test/ParalelAuctionAudit.t.sol
==========
// @file contracts/test/ParalelAuctionAudit.t.sol — Fail-first tests untuk audit spesifikasi
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ParalelAuction} from "../src/ParalelAuction.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ParalelAuctionAuditTest is Test {
    ParalelAuction public auction;
    MockERC20 public usdc;
    
    address public platform = address(100);
    address public tax = address(101);
    address public relayer = address(102);
    
    uint256 public notaryKey = 0xA11CE;
    uint256 public guarantorKey = 0xB0B; 
    uint256 public consignorKey = 0xC0C; 
    
    address public notary = vm.addr(notaryKey);
    address public guarantor = vm.addr(guarantorKey);
    address public consignor = vm.addr(consignorKey);

    bytes32 public auctionKey = keccak256(abi.encodePacked("AUCTION-AUDIT"));
    bytes32 public confHash = keccak256(abi.encodePacked("CODE-AUDIT"));

    function setUp() public {
        usdc = new MockERC20();
        auction = new ParalelAuction(address(usdc), platform, tax, relayer);
        
        auction.setPartner(notary, ParalelAuction.PartnerType.NOTARY, 0, true);
        auction.setPartner(guarantor, ParalelAuction.PartnerType.GUARANTOR, 1, true);
        _registerHelper();
    }

    function _registerHelper() internal {
        uint64 openAt = uint64(block.timestamp + 49 hours);
        uint256 currentExpiry = block.timestamp + 1 days;
        
        uint128 startBid = 1000e6;
        uint128 inc = 5e6;
        uint16 dur = 24;

        bytes32 paramsHash = keccak256(abi.encode(startBid, inc, openAt, dur));
        bytes32 notaryHash = keccak256(abi.encode(auction.NOTARY_APPROVAL_TYPEHASH(), auctionKey, paramsHash, confHash, uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), notaryHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(notaryKey, digest);
        bytes memory notarySig = abi.encodePacked(r, s, v); 
        
        bytes32 consHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, confHash, uint256(0), currentExpiry));
        digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), consHash));
        (v, r, s) = vm.sign(consignorKey, digest);
        bytes memory consignorSig = abi.encodePacked(r, s, v);

        ParalelAuction.RegisterAuctionParams memory p = ParalelAuction.RegisterAuctionParams({
            auctionKey: auctionKey, consignor: consignor, guarantor: guarantor, notary: notary,
            category: 1, specHash: keccak256(abi.encodePacked("SPEC")), startingBid: startBid, bidIncrement: inc,
            openAt: openAt, durationHours: dur, platformBps: 250, guarantorBps: 150, notaryBps: 100, taxBps: 1000,
            confirmationCodeHash: confHash, notarySig: notarySig, consignorSig: consignorSig,
            notaryNonce: 0, notaryExpiry: currentExpiry, consignorNonce: 0, consignorExpiry: currentExpiry
        });

        vm.prank(relayer);
        auction.registerAuction(p);
    }

    function test_statusOf_should_return_CLOSED() public {
        ParalelAuction.Round memory rd = auction.getRound(auctionKey, 1);
        vm.warp(rd.closeAt + 1);
        assertEq(uint8(auction.statusOf(auctionKey)), uint8(ParalelAuction.Status.CLOSED), "Status seharusnya CLOSED");
    }

    function test_startAwarding_fake_round_should_revert() public {
        ParalelAuction.Round memory rd = auction.getRound(auctionKey, 1);
        vm.warp(rd.closeAt + 1);

        vm.prank(relayer);
        vm.expectRevert(); 
        auction.startAwarding(auctionKey, 99);
    }

    function test_withdrawRefund_rank11_after_closeAt_should_work() public {
        for (uint160 i = 1; i <= 10; i++) {
            address b = address(i);
            usdc.mint(b, 2000e6);
            vm.prank(b); usdc.approve(address(auction), type(uint256).max);
            vm.prank(b); auction.placeBid(auctionKey, 1, uint128(i * 5e6)); 
        }
        
        uint256 bidder11Key = 0xD11;
        address bidder11 = vm.addr(bidder11Key);
        usdc.mint(bidder11, 2000e6);
        vm.prank(bidder11); usdc.approve(address(auction), type(uint256).max);
        vm.prank(bidder11); auction.placeBid(auctionKey, 1, 5e6);
        
        ParalelAuction.Round memory rd = auction.getRound(auctionKey, 1);
        vm.warp(rd.closeAt + 1); 

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.WITHDRAW_REQUEST_TYPEHASH(), auctionKey, uint16(1), bidder11, uint256(0), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 sigV, bytes32 sigR, bytes32 sigS) = vm.sign(bidder11Key, digest);

        vm.prank(relayer);
        auction.withdrawRefund(auctionKey, 1, bidder11, 0, currentExpiry, sigV, sigR, sigS);
    }

    function test_setRelayer_and_transferOwnership() public {
        address newRelayer = address(999);
        address newOwner = address(888);

        vm.prank(newOwner);
        vm.expectRevert(); 
        auction.setRelayer(newRelayer);

        auction.setRelayer(newRelayer);
        assertEq(auction.relayerWallet(), newRelayer, "Relayer tidak berubah");

        auction.transferOwnership(newOwner);
        assertEq(auction.owner(), newOwner, "Owner tidak berubah");

        vm.expectRevert();
        auction.setRelayer(address(777));
    }

    function test_replayAttack_reuseRound() public {
        ParalelAuction.Round memory rd1 = auction.getRound(auctionKey, 1);
        
        // 1. Selesaikan putaran 1 tanpa bid (PASSED_IN)
        vm.warp(rd1.closeAt + 1);
        vm.prank(relayer); auction.startAwarding(auctionKey, 1);

        uint256 currentExpiry = block.timestamp + 1 days;
        bytes32 structHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, bytes32(0), uint256(1), currentExpiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(consignorKey, digest);

        uint64 newOpenAt = uint64(block.timestamp + 49 hours);

        // 2. Eksekusi re-use pertama (Putaran 2)
        vm.prank(relayer);
        auction.reuseRound(auctionKey, 1000e6, 5e6, newOpenAt, 24, 1, currentExpiry, v, r, s);

        ParalelAuction.Round memory rd2 = auction.getRound(auctionKey, 2);
        
        // 3. Selesaikan putaran 2 tanpa bid (PASSED_IN lagi)
        vm.warp(rd2.closeAt + 1);
        vm.prank(relayer); auction.startAwarding(auctionKey, 2);

        // 4. HACKER MENGGUNAKAN ULANG TANDA TANGAN (nonce 1)
        uint64 hackerOpenAt = uint64(block.timestamp + 50 hours);
        
        // KUNCI PERBAIKAN: Gunakan 100 hari ke depan agar mutlak tidak kena SignatureExpired
        uint256 replayExpiry = block.timestamp + 100 days;
        
        bytes32 replayHash = keccak256(abi.encode(auction.CONSIGNOR_CONFIRM_TYPEHASH(), auctionKey, bytes32(0), uint256(1), replayExpiry));
        bytes32 replayDigest = keccak256(abi.encodePacked("\x19\x01", auction.DOMAIN_SEPARATOR(), replayHash));
        (uint8 hackerV, bytes32 hackerR, bytes32 hackerS) = vm.sign(consignorKey, replayDigest);
        
        vm.prank(relayer);
        // Kontrak HARUS me-revert karena nonce 1 sudah dipakai
        vm.expectRevert(ParalelAuction.NonceUsed.selector); 
        auction.reuseRound(auctionKey, 1000e6, 5e6, hackerOpenAt, 24, 1, replayExpiry, hackerV, hackerR, hackerS);
    }
}

==========
/docs/CONTRACT_SPEC.md
==========
# PARALEL — Spesifikasi Smart Contract

Dokumen pendamping `PARALEL.md` (perilaku) dan `TECH_STACK.md` (tooling). Dokumen ini menurunkan perilaku di PARALEL.md menjadi **daftar fungsi, syarat, efek, dan skenario uji**. Bila ada pertentangan soal perilaku, PARALEL.md menang; butir yang bukan berasal langsung dari PARALEL.md ditandai **[Klarifikasi]** dan dikumpulkan di bagian 9 (sudah disetujui).

Ini spesifikasi, bukan kode. Struktur penyimpanan: PARALEL.md Lampiran D10.

## 1. Ketentuan Umum

- **Satu kontrak** untuk semua auctionID. Identitas: `auctionKey = keccak256(auction_code)`; buku catat per `(auctionKey, roundNo)` dan per bidder.
- **Token:** USDC (6 desimal). Semua nominal `uint` dalam satuan terkecil. IDRX di luar lingkup kontrak saat ini.
- **Waktu:** `block.timestamp` (detik). Status OPEN dan CLOSED **diturunkan dari waktu** (lihat §3.1); tidak ada transaksi khusus untuk membuka lelang. **[Klarifikasi]**
- **Tidak ada fungsi admin yang bisa menarik dana.** Satu-satunya hak `owner`: mendaftarkan partner dan mengganti relayer (§2).
- **Urutan eksekusi:** perbarui state dulu, baru transfer token (checks-effects-interactions), ditambah proteksi reentrancy pada fungsi yang mentransfer token.
- **Pesan bertanda tangan** memakai EIP-712: domain (chain + alamat kontrak), `nonce` per penanda tangan, dan `expiry`. Nonce dipakai sekali (anti-replay).
- **Konstanta:** `RANK_SLOTS = 10`, `SIGNING_WINDOW = 5 menit`, `COLLECTION_WINDOW = 48 jam`, `CLAIM_WINDOW = 168 jam`, `WITHDRAW_FEE = 2.5 USDC`, `DEFAULT_FEE_BPS = platformBps + guarantorBps + notaryBps` (default 500).

## 2. Peran dan Hak Akses

| Peran | Alamat | Boleh memanggil |
|---|---|---|
| Bidder | wallet user | `placeBid` (membayar gas sendiri) |
| Relayer | `relayerWallet` | semua fungsi bertanda tangan dan trigger (platform membayar gas) |
| Owner (platform) | `owner` | `setPartner`, `setRelayer`, `transferOwnership` |
| Wallet penerima | platform, guarantor, notary, tax | `withdrawClaimable` (membayar gas sendiri) |
| Siapa saja | — | fungsi baca (view) |

**Partner registry [Klarifikasi]:** kontrak harus tahu wallet notary dan guarantor mana yang sah, kalau tidak siapa pun bisa mengaku notary. `owner` mendaftarkan partner dengan `setPartner(wallet, type, category, active)`. Guarantor punya kategori; notary tidak. Owner tidak punya kuasa lain atas dana atau lelang.

## 3. Fungsi

### 3.1 Status turunan (view)
`statusOf(auctionKey)` mengembalikan status putaran saat ini:
- tersimpan: `SCHEDULED`..`WITHDRAWN` sesuai transisi di bawah;
- turunan waktu: bila tersimpan `SCHEDULED` dan `now >= openAt` → `OPEN`; bila `now >= closeAt` dan awarding belum dimulai → `CLOSED`.

### 3.2 `registerAuction` — Confirm consignor (membuat auctionID on-chain)
- **Pemanggil:** relayer.
- **Masukan:** auctionKey, consignor, guarantor, notary, category, specHash, metadata spesifikasi/file (untuk event), parameter putaran 1 (startingBid, bidIncrement, openAt, durationHours), snapshot bps (platform, guarantor, notary, tax), tanda tangan notary (`NotaryApproval`) dan consignor (`ConsignorConfirm`).
- **Syarat:**
  - auctionKey belum terpakai.
  - guarantor dan notary terdaftar dan aktif; kategori guarantor = category.
  - `startingBid > 0`; `bidIncrement` ∈ daftar increment (0.05 / 0.5 / 5 / 50 / 500 / 5,000 USDC) dan `bidIncrement × 20 ≤ startingBid` (maks 5%).
  - `durationHours` 12–48; `openAt` ∈ [now + 48 jam, now + 168 jam].
  - kedua tanda tangan valid, belum kedaluwarsa, nonce belum dipakai; hash confirmationCode pada kedua pesan sama.
- **Efek:** simpan Auction dan Round 1; status `SCHEDULED`; `closeAt = openAt + durasi`.
- **Event:** `AuctionRegistered` (membawa metadata lengkap), `RoundScheduled`.

### 3.3 `placeBid` / `placeBidWithPermit` — pre-bid dan live bid
- **Pemanggil:** bidder (gas dibayar bidder).
- **Masukan:** auctionKey, `amount` (tambahan bid, kelipatan increment), dan untuk varian permit: tanda tangan `permit` USDC (EIP-2612) agar tidak perlu transaksi `approve` terpisah. **[Klarifikasi]**
- **Syarat:**
  - putaran status `SCHEDULED` dan `now < closeAt` (pre-bid sebelum `openAt`, live bid setelahnya).
  - `msg.sender ≠ consignor`.
  - `amount > 0` dan `amount % bidIncrement == 0`.
  - **Bid pertama bidder:** dana yang ditransfer = `startingBid + amount`. **Bid berikutnya:** dana = `amount`.
  - transfer USDC dari bidder ke kontrak berhasil.
- **Efek:**
  1. `myBid += dana`; `bidSeq++`; `reachedSeq = bidSeq`.
  2. Bila `myBid > currentBid` (**harus lebih besar, bukan sama**): `currentBid = myBid`, `currentLeader = bidder`. Bila sama, pemimpin lama tetap (yang lebih dulu).
  3. Perbarui `topRanks` (10 slot): bidder dikeluarkan bila sudah ada, lalu disisipkan menurut `myBid` menurun, lalu `reachedSeq` menaik. Bidder di luar 10 besar hanya masuk bila `myBid` lebih besar dari peringkat 10 (atau slot belum penuh).
  4. Bid di bawah `currentBid` **boleh** dan tetap dicatat.
- **Event:** `BidPlaced(auctionKey, roundNo, bidder, added, myBidAfter, currentBidAfter, seq, phase)`.
- **Gagal bila:** lelang bukan `SCHEDULED`/`OPEN`, sudah lewat `closeAt`, bukan kelipatan, consignor, transfer gagal.

### 3.4 `startAwarding` — trigger setelah CLOSED
- **Pemanggil:** relayer.
- **Syarat:** `now ≥ closeAt`, awarding belum dimulai.
- **Efek:**
  - Tidak ada bid → putaran `PASSED_IN`; event `PassedIn`.
  - Ada bid → status `AWARDING`; `awardingIndex = 0`; `awardingDeadline = now + 5 menit`; peringkat terkunci.
- **Event:** `Closed`, lalu `AwardingStarted(candidate, deadline)` atau `PassedIn`.

### 3.5 `submitAwardSignature` — signing provisional winner
- **Pemanggil:** relayer, membawa pesan `AwardSign` dari kandidat (gratis gas bagi bidder).
- **Syarat:** status `AWARDING`; `now ≤ awardingDeadline` (dinilai saat transaksi masuk); penanda tangan = `topRanks[awardingIndex]`; pesan valid, nonce baru.
- **Efek:** `winner = kandidat`; `winnerStake = myBid`; status `COLLECTION`; `collectionDeadline = now + 48 jam`. Peringkat lain yang belum DEFAULTED menjadi dapat ditarik penuh.
- **Event:** `AwardSigned`.

### 3.6 `advanceCandidate` — trigger kandidat berikutnya
- **Pemanggil:** relayer.
- **Syarat:** status `AWARDING`; `now > awardingDeadline`.
- **Efek:**
  1. Kandidat saat ini **DEFAULTED**: `defaultFee = myBid × DEFAULT_FEE_BPS / 10000`, dibagi per bps (platform, guarantor, notary; pembulatan ke bawah, sisa ke platform) dan dicatat ke `claimable` masing-masing (guarantor dan notary dari data auctionID). Tanpa tax.
  2. `awardingIndex++`. Bila masih ada kandidat (maks 10): `awardingDeadline = now + 5 menit` (hitungan 5 menit dimulai saat permintaan dicatat). Bila habis: putaran `PASSED_IN`.
- **Event:** `Defaulted(candidate, defaultFee)`, lalu `AwardingStarted` atau `PassedIn`.

### 3.7 `collected` — guarantor memberi COLLECTED
- **Pemanggil:** relayer, membawa pesan `Collected` dari guarantor.
- **Syarat:** status `COLLECTION`; `now ≤ collectionDeadline`; penanda tangan = guarantor auctionID.
- **Efek:** status `CLAIM_PERIOD`; `claimPeriodEnd = now + 168 jam`.
- **Event:** `Collected`, `ClaimPeriodStarted`.

### 3.8 `expireCollection` — trigger 48 jam habis
- **Pemanggil:** relayer.
- **Syarat:** status `COLLECTION`; `now > collectionDeadline`.
- **Efek:** status `CLAIM_PERIOD`; `claimPeriodEnd = collectionDeadline + 168 jam` (collectionReceipt otomatis dianggap terbit di `collectionDeadline`).
- **Event:** `ClaimPeriodStarted(autoIssued = true)`.

### 3.9 `withdrawRefund` — bidder menarik stake (pull, relayed)
- **Pemanggil:** relayer, membawa pesan `WithdrawRequest` dari bidder (gratis gas bagi bidder).
- **Syarat:** penanda tangan = bidder; belum pernah ditarik; **dapat ditarik** menurut tabel:

| Kondisi bidder (pada putaran itu) | Boleh menarik bila | Jumlah kotor |
|---|---|---|
| Peringkat 11+ (di luar `topRanks`) | `now ≥ closeAt` | `myBid` |
| Peringkat 2–10 (belum DEFAULTED) | winner sudah signing (status ≥ `COLLECTION`) | `myBid` |
| DEFAULTED | setelah DEFAULTED | `myBid − defaultFee` |
| Putaran `PASSED_IN` (siapa pun) | setelah `PASSED_IN` | `myBid` (DEFAULTED: dikurangi default fee) |
| Winner | **tidak pernah** (stake dilepas saat SETTLED) | — |

- **Efek:** `fee = min(WITHDRAW_FEE, jumlah kotor)`; `fee` dicatat ke `claimable[platformWallet]`; `net = kotor − fee` dikirim ke bidder; `withdrawn = true`.
- **Event:** `Withdrawal(kind = REFUND, gross, fee, net)`.

### 3.10 `withdrawConsignor` — withdraw consignor sekaligus SETTLED
- **Pemanggil:** relayer, membawa pesan `WithdrawRequest` dari consignor.
- **Syarat:** status `CLAIM_PERIOD`; `now ≥ claimPeriodEnd`; penanda tangan = consignor.
- **Efek:**
  1. Hitung dari `winnerStake` dengan snapshot bps: platform, guarantor, notary, tax (masing-masing `stake × bps / 10000`, ke bawah). Bagian consignor = sisanya (`stake − keempatnya`), sehingga tidak ada dust tertinggal.
  2. Catat ke `claimable`: platform, guarantor (alamat dari auctionID), notary (alamat dari auctionID), `taxWallet`.
  3. `fee = min(WITHDRAW_FEE, bagian consignor)` dicatat ke `claimable[platformWallet]`; sisanya dikirim ke consignor.
  4. Status `SETTLED`.
- **Event:** `Settled`, `FeeCredited` (per penerima), `Withdrawal(kind = CONSIGNOR_PAYOUT, gross, fee, net)`.
- **Catatan:** bila consignor tidak melakukannya, tidak ada mekanisme cadangan (keputusan sengaja, PARALEL.md §20).

### 3.11 `withdrawClaimable` — penerima commission/tax menarik saldo
- **Pemanggil:** wallet penerima sendiri (membayar gas sendiri); **tanpa pesan bertanda tangan dan tanpa Withdrawal Fee**. **[Klarifikasi]**
- **Syarat:** `claimable[msg.sender] > 0`.
- **Efek:** seluruh saldo dikirim ke `msg.sender`; saldo menjadi 0.
- **Event:** `Withdrawal(kind = FEE_BALANCE, gross, fee = 0, net)`.

### 3.12 `reuseRound` — re-use setelah PASSED_IN
- **Pemanggil:** relayer, membawa pesan `ConsignorConfirm` (re-use) dari consignor.
- **Syarat:** putaran saat ini `PASSED_IN`; status bukan `WITHDRAWN`; penanda tangan = consignor; parameter baru lolos aturan yang sama dengan §3.2 (increment, ≤ 5%, durasi 12–48 jam, `openAt` ∈ [now + 48 jam, now + 168 jam]).
- **Efek:** `currentRound++`; Round baru dengan ledger terpisah; status `SCHEDULED`. Tidak perlu tanda tangan notary lagi. Stake putaran sebelumnya tidak terpengaruh.
- **Event:** `RoundScheduled`.

### 3.13 `markWithdrawn` — consignor menarik barang
- **Pemanggil:** relayer, membawa pesan `Withdrawn` dari guarantor.
- **Syarat:** putaran saat ini `PASSED_IN`; penanda tangan = guarantor auctionID.
- **Efek:** status `WITHDRAWN` (final). Stake putaran terakhir tetap bisa ditarik (aturan `PASSED_IN` di §3.9 berdasarkan hasil putaran, bukan status auctionID).
- **Event:** `WithdrawnItem`.

### 3.14 Fungsi baca (view)
`statusOf`, `getAuction`, `getRound`, `getTopRanks`, `getStake`, `claimableOf(address)`, dan **`refundableOf(auctionKey, roundNo, bidder)`** yang mengembalikan jumlah kotor, Withdrawal Fee, dan jumlah diterima (dipakai UI untuk menampilkan "Amount Received" sebelum withdraw).

### 3.15 Fungsi owner
`setPartner(wallet, type, category, active)`, `setRelayer(wallet)`, `transferOwnership(wallet)`. Tidak ada fungsi lain.

## 4. Event (ringkasan untuk indexer)

`AuctionRegistered`, `RoundScheduled`, `BidPlaced`, `Closed`, `AwardingStarted`, `AwardSigned`, `Defaulted`, `PassedIn`, `Collected`, `ClaimPeriodStarted`, `WithdrawnItem`, `FeeCredited`, `Withdrawal`, `Settled`. Setiap event memuat `auctionKey` dan `roundNo` (bila relevan) sehingga indexer dapat membangun ulang seluruh tabel turunan.

## 5. Kesalahan (revert)

Gunakan custom error yang bernama jelas, mis.: `NotRelayer`, `NotOwner`, `PartnerNotRegistered`, `AuctionExists`, `InvalidIncrement`, `IncrementTooLarge`, `InvalidDuration`, `InvalidOpenTime`, `BadSignature`, `SignatureExpired`, `NonceUsed`, `AuctionNotBiddable`, `BiddingClosed`, `ConsignorCannotBid`, `NotMultipleOfIncrement`, `TooEarly`, `WrongPhase`, `NotCurrentCandidate`, `AlreadyWithdrawn`, `NotRefundable`, `WinnerCannotWithdraw`, `NothingToClaim`.

## 6. Invarian (wajib diuji, termasuk fuzz)

1. `myBid` bidder tidak pernah berkurang selama lelang berjalan.
2. `currentBid` selalu sama dengan `myBid` tertinggi; `currentLeader` adalah yang paling dulu mencapainya.
3. `topRanks` selalu terurut (`myBid` menurun, `reachedSeq` menaik) dan tanpa duplikat.
4. Saldo USDC kontrak ≥ jumlah stake yang belum ditarik + total `claimable`.
5. Per auctionID yang SETTLED: jumlah bagian platform + guarantor + notary + tax + consignor = `winnerStake` tepat.
6. Satu stake hanya bisa ditarik sekali; winner tidak pernah bisa menarik stake lewat `withdrawRefund`.
7. `fee ≤ jumlah kotor` pada setiap withdraw; dana hanya masuk ke pemilik sah (bidder, consignor, atau pemilik `claimable`).
8. Tidak ada jalur yang memindahkan dana ke alamat lain di luar poin 7 (tidak ada fungsi admin penarik dana).
9. Pesan bertanda tangan tidak bisa dipakai dua kali.

## 7. Skenario Uji (Foundry)

**Registrasi:** sukses; auctionKey ganda ditolak; increment di luar daftar; increment > 5% starting bid; durasi < 12 atau > 48 jam; `openAt` < 48 jam atau > 168 jam; tanda tangan notary/consignor salah, kedaluwarsa, atau nonce terpakai; partner tidak terdaftar; kategori guarantor tidak cocok.

**Bidding:** bid pertama = starting bid + bid; bid berikutnya hanya tambahan; bukan kelipatan ditolak; consignor ditolak; bid tepat sebelum dan tepat pada `closeAt`; tie-break (dua bidder mencapai angka sama, yang lebih dulu menang); bid di bawah `currentBid` tercatat; bidder masuk dan keluar dari 10 besar; 11 bidder atau lebih; pre-bid lalu live bid; varian permit.

**Awarding:** tidak ada bid → PASSED_IN; signing kandidat 1 tepat sebelum dan sesudah `awardingDeadline`; kandidat 1 DEFAULTED lalu kandidat 2 signing; 10 kandidat semuanya DEFAULTED → PASSED_IN; bidder kurang dari 10; pembagian default fee dan pembulatan; `advanceCandidate` sebelum waktunya ditolak; penanda tangan bukan kandidat saat ini ditolak.

**Collection dan settlement:** `collected` oleh guarantor; `collected` setelah 48 jam ditolak; `expireCollection`; `withdrawConsignor` sebelum `claimPeriodEnd` ditolak; distribusi akhir tepat sama dengan `winnerStake`; consignor menarik dua kali ditolak.

**Withdraw:** semua baris tabel §3.9; winner ditolak; Withdrawal Fee 2.5 USDC; jumlah ≤ 2.5 USDC → fee dibatasi, bidder menerima 0 tanpa revert; `withdrawClaimable` tanpa fee; pesan withdraw dipakai ulang ditolak.

**Re-use dan WITHDRAWN:** re-use setelah PASSED_IN menghasilkan putaran baru dengan ledger terpisah; stake putaran lama tetap bisa ditarik; `markWithdrawn` mengakhiri auctionID tetapi stake putaran terakhir tetap bisa ditarik.

**Akses:** semua fungsi relayer ditolak untuk selain relayer; fungsi owner ditolak untuk selain owner; `placeBid` boleh siapa saja kecuali consignor.

**Fuzz:** peringkat 10 dibandingkan dengan model referensi (sort sederhana) pada urutan bid acak; jumlah distribusi = `winnerStake` untuk nilai acak; invarian §6 setelah urutan aksi acak.

## 8. Di Luar Lingkup Kontrak

IDRX; verifikasi kebenaran spesifikasi atau identifier (hanya hash dan event); KYC; sengketa; pencegahan shill bidding; mekanisme cadangan bila consignor tidak withdraw; jalur penarikan darurat tanpa relayer; audit keamanan (PARALEL.md §20).

## 9. Klarifikasi (sudah disetujui dan sudah diterapkan di PARALEL.md)

Butir berikut muncul saat menurunkan PARALEL.md menjadi fungsi dan sudah disetujui pemilik proyek:

1. **Partner registry** (§2): `owner` mendaftarkan wallet notary dan guarantor.
2. **`permit` USDC** (§3.3): bid memakai `permit` agar bidder tidak perlu transaksi `approve` terpisah (jika tidak, bid memerlukan dua transaksi yang gasnya dibayar user). Perlu dipastikan USDC di Arbitrum mendukung `permit`.
3. **OPEN diturunkan dari waktu** (§1, §3.1): tidak ada transaksi trigger untuk membuka lelang; CLOSED tercatat saat `startAwarding`. Ini mengubah PARALEL.md §14 yang menyebut "transisi OPEN/CLOSED" sebagai trigger.
4. **Penarikan saldo penerima commission/tax** (§3.11) adalah panggilan langsung dari wallet penerima, tanpa pesan bertanda tangan. Ini berarti `FeeWithdrawRequest` di PARALEL.md Lampiran D10.7 dihapus.
5. **Hitungan 5 menit untuk kandidat berikutnya** dimulai saat `advanceCandidate` dicatat (bukan sambungan dari batas kandidat sebelumnya), sehingga keterlambatan keeper tidak memotong waktu kandidat berikutnya; konsekuensinya total kasus terburuk bisa sedikit lebih dari 50 menit.
6. **Withdrawal Fee masuk ke `claimable[platformWallet]`** (menjadi pendapatan platform, bukan dikirim langsung ke relayer).


==========
/docs/PARALEL.md
==========
# PARALEL — Web3 + RWA Auction (Spesifikasi Prototype)

Dokumen ini adalah sumber kebenaran tunggal untuk implementasi (oleh developer maupun AI). Semua keputusan di dalamnya sudah disepakati pemilik proyek (status: final untuk desain prototype).

Dokumen pendamping: `TECH_STACK.md` (stack dan struktur proyek) dan `CONTRACT_SPEC.md` (fungsi kontrak, invarian, skenario uji). Bila ada pertentangan soal perilaku sistem, dokumen ini yang menang.

Konvensi dokumen:
- Penjelasan ditulis dalam bahasa Indonesia agar dimengerti tim developer.
- **Nama backend** (nama kolom, field kontrak, kode status seperti `SCHEDULED`) bersifat tetap (fixed), berbahasa Inggris, dan tidak berubah antar-bahasa.
- **Nama UI** (label yang dilihat user) menyesuaikan bahasa. Default UI adalah **bahasa Inggris**; terjemahan Indonesia (ID/EN) disediakan lewat i18n. Daftar label per kolom ada di Lampiran D.
- **Format angka internasional:** koma untuk ribuan, titik untuk desimal (5,000 USDC; 0.5 USDC; 1,000,000).

---

## 1. Ringkasan

- Platform lelang aset fisik (RWA) berbasis Web3. Pasar sementara: Indonesia. Status: prototype / pilot sederhana (testnet dulu).
- Masalah yang diselesaikan: transparansi proses lelang dan akses publik.
- Jenis barang bebas (mobil, motor, elektronik, jam tangan, perhiasan, properti, dll), selama barang fisiknya ada dan ada mekanisme jaminan. Consignor wajib menitipkan barang ke custody (guarantor). Guarantor memeriksa kondisi barang; notary menangani dokumen, legalitas, dan perpajakan.
- Jaringan: **Arbitrum** (testnet: Arbitrum Sepolia). Mata uang lelang: **USDC** lebih dulu.

## 2. Prinsip Desain

1. **Non-custodial.** Tim/platform tidak menampung dana. Dana tetap di wallet bidder sampai bidder melakukan bid. Bid adalah transaksi langsung dari wallet bidder ke smart contract. Tidak ada tahap "stake dulu" terpisah.
2. Setiap bid menjadi stake yang terkunci di smart contract. **Bid tidak bisa ditarik** selama lelang berjalan. Stake hanya bisa ditarik sesuai aturan di §10–§13.
3. **Kontrak = sumber kebenaran** untuk bid, stake, peringkat, dan dana. **Database = cermin** (dibangun dari event kontrak) ditambah data off-chain (KYC, file, notifikasi, tanda tangan). Kontrak tidak bisa melihat dunia off-chain, sehingga untuk peristiwa off-chain kontrak hanya mempercayai **tanda tangan digital dari wallet yang ditunjuk** (§15).
4. **Hanya pengambilan di lokasi** (on-site): pemenang datang ke guarantor. Tidak ada pengiriman (delivery) di prototype. Karena hanya satu cara, kata "on-site" tidak perlu ditulis di UI.
5. **Kontrak tidak punya fungsi admin untuk menarik dana.**
6. **Waktu on-chain** memakai block timestamp (detik). Milidetik hanya dicatat di log web-app untuk tampilan dan tidak dipakai menentukan pemenang.
7. **Nominal uang** disimpan sebagai bilangan bulat (integer) dalam satuan terkecil token (USDC punya 6 desimal: 0.05 USDC = `50000`).

## 3. Glosarium Istilah

Istilah di bawah ini sudah disepakati. Kolom "Istilah lama" hanya untuk membantu membaca catatan lama; **jangan pakai istilah lama** di kode, DB, maupun UI.

| Istilah (baku) | Arti | Istilah lama |
|---|---|---|
| consignor | Pemilik barang yang menitipkan barang untuk dilelang | auctioneer / owner |
| CONSIGNMENT | Penyerahan barang dari consignor ke guarantor (tahap PENDING) | DEPOSIT |
| consignmentReceipt | Receipt yang dicetak guarantor saat CONSIGNMENT | auctionReceipt |
| pre-bid / live bid | Bid sebelum OPEN (saat SCHEDULED) / bid saat OPEN | early bid / direct bid |
| bid increment | Kelipatan nominal bid | kelipatan bid |
| starting bid | Nilai pembukaan lelang | nilai pembukaan |
| currentBid | Akumulasi stake tertinggi saat ini (status global/publik) | — |
| myBid | Akumulasi stake satu bidder (status privat di UI) | — |
| SCHEDULED | auctionID sudah lolos guarantor + notary, tercatat on-chain, menunggu jam OPEN | CONFIRMED |
| AWARDING | Tahap penetapan pemenang: provisional winner diminta signing berurutan | SETTLEMENT |
| provisional winner | Kandidat pemenang peringkat 1–10 yang sedang/akan diminta signing | calon pemenang |
| underbidder | Bidder peringkat 2–10 yang tidak ditetapkan sebagai winner | — |
| winner | Provisional winner yang sudah signing | bidWinner |
| DEFAULTED | Kandidat yang tidak signing dalam 5 menit | gugur |
| default fee | Potongan 5% yang dikenakan pada kandidat DEFAULTED | auctionFees (kasus gagal) |
| commission | Potongan 5% dari stake pemenang (2.5% platform, 1.5% guarantor, 1% notary) | auctionFees |
| COLLECTION | Pemenang mengambil barang di guarantor | PICKUP |
| collectionReceipt | Receipt pengambilan | settlementReceipt |
| CLAIM_PERIOD | Masa penjaminan 168 jam setelah collectionReceipt | DISPUTE |
| SETTLED | Status akhir lelang yang berhasil; dana disalurkan | FINISHED (auctionID) |
| COLLECTED | Status dari guarantor: barang sudah diambil pemenang | FINISHED (guarantor) |
| REJECTED | Barang ditolak guarantor (tidak sesuai spesifikasi/foto) | SUSPENDED |
| CANCELED | Masa PENDING 48 jam habis sebelum SCHEDULED | — |
| PASSED_IN | Lelang berakhir tanpa pemenang | — |
| WITHDRAWN | Consignor menarik barang dari guarantor | DROPPED |
| withdrawalReceipt | Receipt penarikan barang | — |
| confirmationCode | Kode dari notary ke email consignor untuk Confirm | APIkey |
| Withdrawal Fee | Potongan tetap 2.5 USDC pada setiap withdraw (§14) | — |

Tidak berubah: PENDING, OPEN, CLOSED, bidder, guarantor, notary, platform.

## 4. Peserta dan Peran

| Peserta | Peran |
|---|---|
| Platform | Sistem: web-app, smart contract, indexer, keeper/relayer (wallet trigger), bot Telegram, feed. |
| Consignor | Pemilik barang. Membuat auctionID, memilih guarantor, menyerahkan barang ke guarantor (CONSIGNMENT), memasukkan confirmationCode, menarik dana setelah CLAIM_PERIOD. **Dilarang bid di auctionID miliknya sendiri.** |
| Bidders | Peserta lelang (pre-bid / live bid). Wajib lolos KYC dan menerima terms & conditions, termasuk kota guarantor yang tertera di auctionID. |
| Custody | **Notary** dan **Guarantor** (lihat di bawah). |

### 4.1 Notary
1. Pejabat Lelang Kelas II / Arbiter legal.
2. Menandatangani digital status APPROVED dari guarantor (tanda tangan ini yang membuat auctionID bisa masuk SCHEDULED) dan menerbitkan confirmationCode.
3. Menerbitkan e-certificate legal (Risalah Lelang Elektronik) yang ditandatangani digital sebagai **output untuk winner**: kepastian hukum bahwa kepemilikan beralih lewat lelang. Ini bukan input dari consignor.
4. Menerbitkan kutipan pajak, sementara mekanisme pembayaran pajak dilakukan secara on-chain oleh smartcontract.

### 4.2 Guarantor
1. Menjamin kondisi barang sesuai spesifikasi dan foto di auctionID.
2. Saat **CONSIGNMENT** (tahap PENDING): memeriksa barang lalu memberi status **REJECTED / APPROVED** (digitally signed). Bila APPROVED, mencetak **consignmentReceipt** untuk consignor. REJECTED/APPROVED hanya diberikan di tahap ini.
3. Saat **COLLECTION** selesai: memberi status **COLLECTED** (digitally signed) dan mencetak **collectionReceipt** untuk winner.
4. Saat **WITHDRAWN** (consignor menarik barang setelah PASSED_IN): memberi status WITHDRAWN (digitally signed) dan mencetak **withdrawalReceipt**.

Dua serah-terima fisik utama dibedakan namanya: **CONSIGNMENT** (consignor → guarantor, tahap PENDING) dan **COLLECTION** (guarantor → winner, setelah AWARDING).

### 4.3 Contoh Guarantor per Kategori

| Kategori | Contoh barang | Guarantor |
|---|---|---|
| Otomotif | mobil, motor (dengan BPKB) | INDOMOTOR |
| Elektronik | laptop, handphone, tv, sepeda listrik, dll | DIGITALSHOP |
| Aksesoris & hobi | jam tangan, buku, figure, toys, dll | ACCSSTORE |
| Perhiasan | kalung, gelang, liontin (emas/perak/platinum/lainnya) | GOLDJEWELRY |
| Properti | rumah, tanah, dll | GREENPROPERTY |

Consignor memilih guarantor saat membuat auctionID (kategori guarantor harus sama dengan kategori barang). Kota guarantor tertera di auctionID sebagai bagian terms & conditions yang wajib diterima bidder. Soal konflik peran notary sebagai arbiter dan tanggung jawab guarantor: diatur sebagai terms & conditions off-chain, tidak dimodelkan di sistem.

## 5. Objek Lelang

### 5.1 Identifier (semua terbuka/publik, disimpan sebagai teks)

| Field | Aturan |
|---|---|
| `document_type` | Otomatis dari kategori: `CERTIFICATE` untuk otomotif (BPKB) dan properti (SHM/SHGB); `INVOICE` (nota) untuk kategori lain. Tidak diisi user. |
| `document_number` | Nomor sertifikat (CERTIFICATE) atau nomor nota (INVOICE). Wajib diisi. Terbuka di on-chain. |
| `chassis_number` | Nomor rangka. **Hanya otomotif**, wajib di sana. Bukan serialNumber. |
| `serial_number` | **Hanya kategori selain otomotif dan properti**, wajib di sana (untuk ponsel: IMEI). Field ini tidak muncul di UI untuk otomotif dan properti. |

Aturan token **`NUL`** (huruf besar): dipakai bila memang tidak ada nilainya. **Hanya boleh** untuk `document_number` bertipe INVOICE dan untuk `serial_number`. Tidak boleh untuk CERTIFICATE dan nomor rangka. `NUL` dikecualikan dari cek duplikat.

Cek duplikat: satu auctionID aktif per `document_number` (kecuali `NUL`).

UI menampilkan petunjuk pengisian per field, contoh: "isi NUL jika tidak ada nota"; "isi serial number objek lelang, isi NUL jika tidak ada".

Alasan identifier dibuat terbuka: semua pihak bisa memverifikasi bahwa barang tidak bersengketa dan sah milik consignor. Masalah pemalsuan identifier adalah perkara hukum dunia nyata, bukan tugas sistem.

### 5.2 Spesifikasi umum dan per kategori

Umum (semua kategori): title, description, condition (`NEW` / `LIKE_NEW` / `GOOD` / `FAIR` / `DAMAGED`), conditionNotes (wajib bila DAMAGED), identifier (§5.1), 5 foto, scan dokumen.

| Kategori | Field khusus |
|---|---|
| Otomotif | brand, model, year, color, mileageKm, chassisNumber |
| Properti | propertyType, lokasi (kelurahan, kecamatan, kota, provinsi), landAreaM2, buildingAreaM2, certificateKind (SHM/SHGB/lainnya) |
| Elektronik | brand, model, purchaseYear, completeness, warrantyUntil (opsional), serialNumber |
| Aksesoris & hobi | brand, modelEdition, year, completeness, serialNumber |
| Perhiasan | jewelryType, metalType (`GOLD` / `SILVER` / `PLATINUM` / `OTHER`), purity (bukan goldPurity, karena bisa perak), weightGram, brand (opsional), serialNumber |

Detail tipe dan label UI per field: Lampiran D2.3.1.

### 5.3 Foto dan file

- **Tepat 5 foto** per auctionID (berbagai sisi).
- Foto, spesifikasi, dan nota/dokumen **wajib masuk on-chain, tetapi yang dicatat adalah metadatanya**: nama file, ekstensi, MIME, resolusi, ukuran, hash isi file, urutan. File asli tetap off-chain (storage). Teks spesifikasi (merek, kondisi, nomor-nomor identifier) dicatat apa adanya.
- Metadata dicatat sebagai **event log** dengan hash di storage kontrak (hemat gas).

## 6. Mata Uang dan Bid Increment

- **USDC**: dipakai lebih dulu (testnet tersedia). Bid increment USDC hanya: **0.5 / 5 / 50 / 500 / 5,000 USDC**. Tidak boleh melebihi **5% dari starting bid**.
- **IDRX**: masih on-proposal. Jika disetujui, consignor memilih salah satu dari 2 opsi staking per auctionID. Daftar increment IDRX (rencana, berlaku bila disetujui): 5,000 / 50,000 / 500,000 / 5,000,000 / 50,000,000 IDRX, maksimal 5% dari starting bid.
- Satu auctionID memakai satu mata uang.

## 7. Parameter auctionID (diisi consignor)

| Parameter | Aturan |
|---|---|
| Jam mulai OPEN | 48–168 jam setelah auctionID berstatus SCHEDULED |
| Starting bid | Ditentukan consignor |
| Bid increment | Pilih satu dari daftar §6, maksimal 5% starting bid |
| Durasi lelang | 12–48 jam |
| Spesifikasi, identifier, 5 foto | §5 |
| Guarantor | §4.3 (kota tertera di auctionID) |
| Mata uang | §6 |
| Persetujuan commission | Consignor menyetujui commission dan tax saat SETTLED (§13) |

Konfigurasi platform (fee, dll) ada di **backend app**, bukan di smart contract; snapshot-nya disalin ke kontrak saat SCHEDULED.

## 8. Mekanisme Bidding

### 8.1 Jenis bid
- **Pre-bid**: bid saat auctionID berstatus SCHEDULED (muncul di feed), sebelum OPEN.
- **Live bid**: bid saat auctionID berstatus OPEN.
- Keduanya memakai aturan yang sama; hanya fasenya berbeda. Dana langsung ditransfer wallet → kontrak (non-custodial).

### 8.2 Aturan akumulasi stake (top-up)
- Setiap bid **menambah stake** bidder. `myBid` = akumulasi seluruh stake bidder itu pada auctionID/putaran tersebut (privat di UI; on-chain tetap tercatat).
- Setiap penambahan harus **kelipatan bid increment** (minimal 1 increment).
- **Bid pertama bidder:** stake = starting bid + bid-nya.
- `currentBid` = `myBid` tertinggi saat ini (status global/publik). Saat OPEN, jika ada pre-bid, `currentBid` awal = pre-bid tertinggi.
- Bid yang menghasilkan akumulasi **di bawah** `currentBid` **boleh** dan tercatat (bidder tetap masuk peringkat).
- Bid tidak bisa ditarik.

**Contoh:** starting bid 1,000 USDC, bid increment 5 USDC.
1. Bidder A bid 10 USDC. Stake pertama = 1,000 + 10 = 1,010 (`myBid` A = 1,010).
2. A menambah 500. `myBid` A = 1,510.
3. Bidder B mencapai `myBid` yang sama, 1,510, kemudian. A tetap di atas karena lebih dulu mencapai 1,510.

### 8.3 Penentuan pemenang dan peringkat
- Pemenang = bidder dengan **`myBid` tertinggi** sebelum timer berakhir.
- Jika beberapa bidder mencapai akumulasi yang sama, yang **lebih dulu mencapainya** menang (first accumulated stake, first-in-first-out).
- Implementasi urutan: batas timer = block timestamp (detik); urutan "lebih dulu" = nomor urut bid (`seq`) yang diberikan kontrak per putaran, yang mengikuti urutan transaksi. Milidetik hanya di log web-app.
- Kontrak menyimpan **peringkat 1–10**, diperbarui di setiap bid (urut: `myBid` menurun, lalu `seq` menaik). Aturan yang sama menentukan urutan provisional winner di AWARDING.
- Feed mencatat wallet yang **lebih dulu mencapai rekor bid tertinggi**; bidder lain yang menyamai tidak mengubah feed kecuali menaikkan satu increment lagi.
- Timer berhenti tegas, **tanpa perpanjangan waktu** (tidak ada anti-sniping).
- Consignor dilarang bid di auctionID-nya: kontrak memblokir wallet consignor; wallet lain yang terkait ditangkap lewat flag KYC.

## 9. Alur dan Status auctionID

### 9.1 Tabel transisi

| Dari | Ke | Syarat |
|---|---|---|
| (awal) | CREATED | consignor mengisi parameter dan data barang |
| CREATED | PENDING | consignor klik Create (mulai hitungan 48 jam) |
| PENDING | REJECTED | guarantor memberi REJECTED saat CONSIGNMENT (barang tidak sesuai spesifikasi/foto) |
| PENDING | CANCELED | 48 jam habis sebelum SCHEDULED (mis. consignor tidak melakukan CONSIGNMENT; juga bila Confirm tidak terjadi atau partner tidak merespons) |
| PENDING | SCHEDULED | guarantor APPROVED + notary tanda tangan + consignor input confirmationCode dan klik Confirm |
| SCHEDULED | OPEN | jam OPEN tercapai |
| OPEN | CLOSED | durasi lelang habis |
| CLOSED | PASSED_IN | tidak ada bid sama sekali |
| CLOSED | AWARDING | ada minimal satu bid |
| AWARDING | COLLECTION | seorang provisional winner signing dalam 5 menit (menjadi winner) |
| AWARDING | PASSED_IN | semua provisional winner (maksimal 10) DEFAULTED |
| COLLECTION | CLAIM_PERIOD | guarantor memberi COLLECTED, atau 48 jam habis (collectionReceipt otomatis) |
| CLAIM_PERIOD | SETTLED | masa 168 jam berakhir dan consignor melakukan withdraw (§11) |
| PASSED_IN | SCHEDULED | consignor memilih re-use (§12) |
| PASSED_IN | WITHDRAWN | consignor menarik barang (§12) |

Status akhir: **REJECTED, CANCELED, SETTLED, WITHDRAWN**. REJECTED dan CANCELED mengharuskan membuat auctionID baru. Keduanya tidak pernah muncul di feed.

### 9.2 Tahap sebelum SCHEDULED (hanya di database)
1. **CREATED** — consignor mengisi semua parameter (§7), spesifikasi, identifier, 5 foto, lalu klik Create. Status CREATED sampai REJECTED/CANCELED hanya ada di database.
2. **PENDING (48 jam)** — guarantor menerima notifikasi. Consignor menyerahkan barang ke guarantor (**CONSIGNMENT**). Guarantor memeriksa barang terhadap spesifikasi dan foto.
   - **REJECTED** → auctionID REJECTED (dengan alasan).
   - **APPROVED** (digitally signed, consignmentReceipt dicetak) → notary menerima notifikasi → notary tanda tangan digital → sistem mengirim **confirmationCode** ke email consignor → consignor memasukkan kode dan klik **Confirm**.
   - Tidak ada CONSIGNMENT / Confirm dalam 48 jam → **CANCELED** (belum ada confirmationCode).
3. **Confirm** = auctionID didaftarkan on-chain. Mulai dari sini kontrak menjadi sumber kebenaran, karena SCHEDULED sudah mengandung tanda tangan notary dan barang sudah berada di guarantor.

### 9.3 Tahap on-chain
4. **SCHEDULED** — muncul di feed (app, X, Telegram). Pre-bid dibuka. Jam OPEN 48–168 jam setelah SCHEDULED.
5. **OPEN** — live bid.
6. **CLOSED** — timer berhenti. Peringkat sudah ada di kontrak (§8.3).
7. **AWARDING / COLLECTION / CLAIM_PERIOD / SETTLED** — §10–§11.

## 10. AWARDING

- Setelah CLOSED, trigger (§14) memulai AWARDING. Peringkat **1–10** dikunci sebagai provisional winner. Stake peringkat **11 ke bawah** dapat ditarik setelah CLOSED tanpa fee (selain Withdrawal Fee, §14).
- Sistem meminta **digital signing** dari provisional winner secara berurutan mulai peringkat 1, **5 menit per kandidat**, dihitung sejak permintaan signing dikirim/dicatat (tidak peduli user offline, tidak punya kuota, atau tertidur: itu tanggung jawab bidder). Tidak ada peringatan UI khusus untuk bid di luar peringkat 10 besar.
- Signing adalah **tanda tangan digital gratis gas** (EIP-712) yang dikirim ke kontrak oleh platform. Kontrak menilai batas 5 menit dengan block timestamp saat tanda tangan diterima.
  - **Signed:** kandidat menjadi **winner**. Stake peringkat lain (2–10, yang belum DEFAULTED) dapat ditarik tanpa fee.
  - **Tidak signing dalam 5 menit:** kandidat **DEFAULTED**. Dikenakan **default fee 5%** dari stake-nya (dibagi 2.5% platform / 1.5% guarantor / 1% notary, **tanpa tax**). Sisanya dapat ditarik. Permintaan bergeser ke kandidat berikutnya dengan aturan sama, sampai maksimal peringkat 10.
- Kasus terburuk: 10 kandidat × 5 menit = 50 menit. Hitungan 5 menit kandidat berikutnya dimulai saat pergeseran dicatat, sehingga bila keeper terlambat total bisa sedikit lebih dari 50 menit.
- Bila semua kandidat DEFAULTED (atau hanya ada sebagian kandidat dan semuanya DEFAULTED) → lelang **PASSED_IN**.
- Aturan penarikan stake ringkas:

| Kondisi bidder | Kapan bisa withdraw | Jumlah |
|---|---|---|
| Peringkat 11+ | setelah CLOSED | seluruh stake |
| Peringkat 2–10 (belum diminta signing atau tidak dipilih) | setelah winner signing | seluruh stake |
| DEFAULTED | setelah DEFAULTED | stake dikurangi default fee 5% |
| Winner | tidak bisa | stake dilepas saat SETTLED (§13) |
| Semua bidder bila PASSED_IN | setelah PASSED_IN | seluruh stake (kecuali default fee bagi yang DEFAULTED) |

## 11. COLLECTION, CLAIM_PERIOD, SETTLED

- **COLLECTION:** winner wajib datang ke guarantor dengan tenggat **48 jam sejak signing**. Saat winner datang, guarantor memberi status **COLLECTED** (digitally signed) dan mencetak **collectionReceipt**. Notary menerbitkan e-certificate untuk winner.
- Bila winner tidak datang dalam 48 jam: collectionReceipt **tetap otomatis tercetak** (`auto_issued`) dan auctionID masuk CLAIM_PERIOD.
- **CLAIM_PERIOD:** masa penjaminan **168 jam (7 hari)** sejak collectionReceipt. Setelah berakhir, kerusakan atau kehilangan objek tidak lagi menjadi tanggung jawab siapa pun. Sengketa dibahas **off-chain**; di sistem ini hanya sebuah state, tanpa fungsi operasional.
- **SETTLED:** setelah CLAIM_PERIOD berakhir, **consignor melakukan withdraw** (aksi user, gratis gas, dengan Withdrawal Fee; §14). Aksi ini menandai auctionID SETTLED, mengirim bagian consignor ke wallet-nya, dan mencatat bagian platform, guarantor, notary, dan tax sebagai saldo yang bisa ditarik masing-masing (§13). Tidak ada mekanisme cadangan bila consignor tidak melakukannya (§20).

## 12. PASSED_IN, Re-use, dan WITHDRAWN

Lelang **PASSED_IN** bila CLOSED tanpa bid sama sekali, atau semua kandidat DEFAULTED. Consignor memilih salah satu:

1. **Re-use auctionID:** consignor hanya boleh mengubah **starting bid, bid increment, jam OPEN, dan durasi**. Putaran baru (`round_no` + 1) **langsung SCHEDULED** (tidak perlu guarantor/notary ulang, karena barang sudah lolos guarantor dan sudah ada tanda tangan notary dan confirmationCode). Jam OPEN 48–168 jam setelah SCHEDULED. Data bid, stake, dan AWARDING dipisah per putaran.
2. **WITHDRAWN (menarik barang):** sistem memberi notifikasi ke guarantor; consignor datang ke guarantor dalam **48 jam**, mengambil barang, dan menerima **withdrawalReceipt**; guarantor memberi status WITHDRAWN. Untuk melelang ulang barang yang sama kelak, buat auctionID baru.

## 13. Commission, Tax, dan Distribusi Dana

### 13.1 Angka default (konfigurasi backend; snapshot di kontrak saat SCHEDULED)

| Komponen | Persentase dari stake winner | Penerima |
|---|---|---|
| Platform commission | 2.5% | wallet platform |
| Guarantor commission | 1.5% | wallet guarantor |
| Notary commission | 1% | wallet notary |
| **Total commission** | **5%** | |
| Tax | 10% | wallet Direktorat Jenderal Pajak RI |
| Sisa untuk consignor | 85% | wallet consignor |

- **Default fee** (kandidat DEFAULTED): 5% dengan pembagian yang sama (2.5 / 1.5 / 1), **tanpa tax**.
- **Tax** hanya timbul bila proses sampai **SETTLED** (winner signing).
- Basis perhitungan: stake winner (akumulasi stake akhir saat CLOSED). Consignor menerima nilai akhir dikurangi tax dan commission.
- Contoh: stake winner 10,000 USDC → platform 250, guarantor 150, notary 100, tax 1,000, consignor 8,500 (sebelum Withdrawal Fee 2.5 USDC pada penarikan consignor).

### 13.2 Alur dana
- Dana winner tetap terkunci sampai SETTLED. Pada SETTLED: bagian consignor dikirim ke consignor (dikurangi Withdrawal Fee); bagian platform, guarantor, notary, dan tax **dicatat sebagai saldo** yang ditarik sendiri oleh masing-masing wallet (pull), supaya satu penerima bermasalah tidak menggagalkan penyaluran yang lain.
- Default fee dicatat sebagai saldo penerima saat kandidat DEFAULTED.

## 14. Model Gas dan Jenis Aksi

| Jenis aksi | Siapa bayar gas | Aksi |
|---|---|---|
| **Bid** (pre-bid, live bid, top-up) | **User** | Satu-satunya aksi yang butuh ETH di wallet user. UI menampilkan keterangan gas fee di bawah tombol. Bid memakai `permit` USDC (EIP-2612) agar cukup satu transaksi, tanpa `approve` terpisah. |
| **Withdraw (pull)** | **Gratis untuk user**, platform membayar gas | Refund bidder dan penarikan dana consignor. User menandatangani permintaan (EIP-712), platform (relayer) mengirim transaksi. **Withdrawal Fee tetap 2.5 USDC** dipotong dari jumlah yang ditarik (di luar commission, default fee, dan tax). Bila jumlah ≤ 2.5 USDC, potongan dibatasi sebesar jumlahnya. Withdrawal Fee menjadi saldo platform. |
| **Trigger** (otomatis) | Platform | Mulai AWARDING (sekaligus mencatat CLOSED), maju ke kandidat berikutnya setelah 5 menit, transisi COLLECTION → CLAIM_PERIOD setelah 48 jam. Status OPEN diturunkan dari waktu dan tidak memerlukan transaksi. |
| **Aksi bertanda tangan** (consignor Confirm, signing AWARDING, atestasi guarantor/notary) | Platform | Penanda tangan menandatangani pesan (gratis gas); platform mengirim ke kontrak. Termasuk gas pendaftaran on-chain (metadata 5 foto) saat Confirm dan saat re-use. |
| Penarikan saldo wallet penerima commission/tax | Wallet penerima sendiri | Lihat §21 butir 1. |

- Keterangan di UI untuk withdraw: tampilkan **"Withdrawal Fee: 2.5 USDC"** dan jumlah bersih yang diterima. Jangan memakai label "gas".
- Platform menanggung gas semua aksi non-bid karena sudah memperoleh commission 5% dan wajib menjaga aplikasi berjalan tanpa kendala.
- Perlu **wallet trigger/relayer** milik platform dengan saldo ETH di Arbitrum. Wallet ini **tidak boleh punya kuasa atas dana**: hanya boleh memanggil fungsi yang aturannya dikunci kontrak (mis. "maju ke kandidat berikutnya" ditolak kontrak bila 5 menit belum lewat).
- Biaya off-chain di luar gas: indexer/RPC, database, penyimpanan file, notifikasi, dan posting ke X (API X kemungkinan berbayar).

## 15. Smart Contract dan Kepercayaan pada Tanda Tangan

- **Satu smart contract untuk semua auctionID.** Buku catat dikunci per `(auctionID, round_no)` dan per bidder. Operasi satu auctionID tidak memengaruhi auctionID lain.
- Kontrak mulai mencatat auctionID saat **SCHEDULED** (Confirm).
- **Peringkat 1–10** diperbarui di setiap bid (setiap bid hanya membandingkan dengan peringkat 10 karena stake hanya bertambah).
- **Refund dan penarikan dana lewat pull** (§14). Dana hanya bisa dikirim ke alamat pemiliknya.
- **Partner registry:** `owner` (platform) mendaftarkan wallet notary dan guarantor yang sah beserta kategori guarantor. Owner tidak punya kuasa lain atas dana atau lelang.
- **Metadata** (spesifikasi, file) dicatat sebagai event log dengan hash di storage.
- **Tanda tangan sebagai bukti off-chain.** Kontrak hanya menerima peristiwa off-chain bila ditandatangani wallet yang terdaftar untuk peran itu (pesan terstruktur gaya EIP-712 dengan domain, nonce, dan masa berlaku):
  - Notary: APPROVED + confirmationCode (dibawa saat pendaftaran).
  - Consignor: Confirm.
  - Bidder: signing AWARDING, permintaan withdraw.
  - Guarantor: COLLECTED, WITHDRAWN.
  - Penerima commission/tax: permintaan penarikan saldo.
- Rincian struktur penyimpanan kontrak: Lampiran D10. Rincian fungsi, invarian, dan skenario uji: `CONTRACT_SPEC.md`.

## 16. AML/KYC dan AI Agent

- Semua **test-only** di prototype:
  - Face verification.
  - National ID: tes dengan 16 digit acak.
  - Statement bill.
  - Data pribadi diisi oleh **AI agent yang membaca ID** (ekstraksi KTP) untuk form registrasi.
- **AI agent hanya dipakai untuk ekstraksi KTP.** Fitur lain (feed, tombol aksi, notifikasi) tidak memakai AI. Bila kelak ditambah, AI agent tidak boleh memegang private key atau memutuskan hal yang menyangkut dana atau status on-chain.

## 17. UI/UX

- Satu antarmuka web untuk **bidders dan consignor**; satu antarmuka untuk **custody** (notary dan guarantor).
- **Default bahasa Inggris**, dengan terjemahan ID/EN. Teks UI disimpan sebagai kunci i18n; satu file per bahasa. Pilihan bahasa disimpan di `users.preferred_language` (`EN` default / `ID`) dan juga dipakai untuk notifikasi (Telegram, email).
- **Istilah lelang tidak diterjemahkan** (Starting Bid, Bid Increment, Current Bid, My Bid, Provisional Winner, nama status seperti SCHEDULED). Yang diterjemahkan hanya teks penjelas, tombol, dan pesan.
- Format angka internasional di kedua bahasa.
- Tombol bid menampilkan keterangan gas fee di bawahnya; tombol withdraw menampilkan Withdrawal Fee dan jumlah bersih.
- Form spesifikasi berbeda per kategori dengan petunjuk pengisian (§5.1).
- Label UI per kolom data: Lampiran D.

## 18. Integrasi

- **Telegram (bot biasa, tanpa AI):** feed, notifikasi (termasuk permintaan signing AWARDING), dan update `currentBid` terbaru **hanya untuk bidder pada auctionID terkait**. Tombol aksi di bot **membuka deep link** ke web app/wallet untuk tanda tangan; **bot tidak memegang key** dan tidak menandatangani apa pun. Alur tombol → tanda tangan harus cepat karena batas 5 menit di AWARDING.
- **X:** feed auction yang akan datang (SCHEDULED), sedang OPEN, dan CLOSED.
- **WhatsApp:** kemungkinan, belum diputuskan.
- REJECTED dan CANCELED tidak pernah masuk feed.

## 19. Infrastruktur dan Pengujian

- **Jaringan:** Arbitrum (testnet Arbitrum Sepolia untuk pilot).
- **Database:** PostgreSQL di Neon (sementara).
- **Hosting aplikasi:** belum ditentukan; pilot memakai opsi gratis. Pertimbangan: web app di Vercel/Cloudflare Pages/Netlify; bot Telegram memakai webhook (cocok untuk serverless). **Keeper dan indexer** perlu eksekusi sering (batas 5 menit AWARDING), sehingga cron gratis yang jarang (mis. Vercel hobby) tidak cukup; opsi: Cloudflare Workers dengan cron trigger, atau layanan antrean terjadwal. Batas free tier dicek ulang saat memilih.
- **Wallet pengujian (8):** 4 wallet penerima (platform, notary, guarantor, tax), 3 wallet user (1 consignor, 2 bidder), dan 1 wallet trigger/relayer.
- Pengujian dilakukan dengan simulasi lengkap seluruh alur (termasuk DEFAULTED, PASSED_IN, re-use, WITHDRAWN) di testnet.

## 20. Di Luar Lingkup dan Keputusan Sengaja

Item berikut **sengaja tidak dimodelkan**. Jangan ditambahkan tanpa persetujuan pemilik proyek.

- Staged bid / auto-bid dan relayer untuk jalur bid (dibuang dulu).
- Pengiriman (delivery) dan form ekspedisi.
- Penyelesaian sengketa; tanggung jawab guarantor dan notary sebagai arbiter (terms & conditions off-chain).
- Mekanisme cadangan bila consignor tidak melakukan withdraw/SETTLED (mis. wallet consignor diretas): tidak dipertimbangkan.
- Jalur penarikan darurat tanpa relayer: tidak ada; platform wajib menjaga relayer berjalan.
- Pencegahan shill bidding (bid memakai wallet lain untuk mengerek harga): tidak dipertimbangkan; risikonya sudah tercermin lewat fee.
- Audit smart contract, pengamanan kunci wallet trigger, dan aspek regulasi/hukum lelang: diabaikan untuk desain prototype ini.
- Perpanjangan waktu anti-sniping.

## 21. Catatan Kesepakatan Tambahan

Butir berikut sudah dikonfirmasi pemilik proyek (butir 1 secara eksplisit; butir 2–4 dianggap setuju kecuali dikoreksi).

1. Wallet penerima commission dan tax (platform, guarantor, notary, tax) menarik saldo sendiri dengan gas sendiri, **tanpa** Withdrawal Fee 2.5 USDC.
2. Withdrawal Fee 2.5 USDC dikenakan **per aksi withdraw** (setiap penarikan refund per auctionID/putaran, dan penarikan consignor).
3. Daftar bid increment IDRX (§6) berlaku bila IDRX disetujui.
4. Batas 5 menit signing AWARDING dinilai kontrak dengan block timestamp saat tanda tangan diterima, sehingga relayer harus mengirim tanda tangan segera.

---

## Lampiran D — Rancangan Database & Smart Contract

Database memakai PostgreSQL (Neon). Smart contract berjalan di Arbitrum. Penomoran bagian lampiran diawali huruf D (D1, D2, ...).

### D0. Aturan Umum

Setiap kolom tabel punya dua **Label UI**: nama yang dilihat user di aplikasi, yaitu **EN (default)** dan **ID (terjemahan)**. Nama kolom backend bersifat tetap (fixed) dan tidak berubah antar-bahasa. Istilah lelang yang sudah baku (Starting Bid, Bid Increment, Current Bid, My Bid, Provisional Winner, Consignor, Guarantor, Notary, dst.) dipakai apa adanya di kedua bahasa. `— (internal)` berarti kolom tidak tampil di UI.

| Aturan | Penjelasan |
|---|---|
| Sumber kebenaran | Smart contract = sumber kebenaran untuk bid, stake, peringkat, dan dana. Database = cermin (dibangun dari event kontrak) + data off-chain (KYC, file, notifikasi, tanda tangan). |
| Nominal uang | `BIGINT` dalam satuan terkecil token. USDC punya 6 desimal: 0.05 USDC = `50000`, 5,000 USDC = `5000000000`. Tidak pernah memakai `FLOAT`/`NUMERIC` desimal. Format tampilan: internasional (koma ribuan, titik desimal). |
| Waktu | `timestamptz` (UTC). Di kontrak: detik (`uint64`, block timestamp). Milidetik hanya `client_ms` di log web-app, hanya untuk tampilan. |
| ID | `uuid` (default `gen_random_uuid()`), kecuali dinyatakan lain. |
| Alamat wallet | `text`, huruf kecil, format `0x` + 40 hex (CHECK `wallet ~ '^0x[0-9a-f]{40}$'`). |
| Hash | `bytea` (32 byte, keccak256/sha256 sesuai konteks). |
| Enum | Disimpan sebagai `text` + CHECK constraint (lebih mudah diubah daripada tipe enum Postgres). Daftar nilai ada di D9. |
| Kolom audit | Setiap tabel punya `created_at timestamptz NOT NULL DEFAULT now()`. Tabel yang bisa berubah punya `updated_at`. Tidak ditulis ulang per tabel, kecuali memang spesial. |
| Penghapusan | Tidak ada hard delete pada data lelang. Riwayat lewat `status_log` dan `chain_events`. |

---

### D1. Pengguna & Mitra

#### D1.1 `users`
Satu baris per wallet yang pernah masuk ke aplikasi.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | uuid | NOT NULL | PK. |
| `wallet` | Wallet Address | Alamat Wallet | text | NOT NULL | UNIQUE. Identitas utama. Huruf kecil. |
| `user_type` | — (internal) | — (internal) | text | NOT NULL | Default `PUBLIC`. Nilai: `PUBLIC` (consignor/bidder), `NOTARY`, `GUARANTOR`, `PLATFORM`. Consignor dan bidder tidak dibedakan di sini karena satu wallet bisa jadi keduanya (peran ditentukan oleh aktivitas, mis. `auctions.consignor_id`). |
| `email` | Email | Email | text | NULL | Tujuan pengiriman confirmationCode. Wajib diisi sebelum menjadi consignor (divalidasi di aplikasi). |
| `preferred_language` | Language | Bahasa | text | NOT NULL | `EN` (default) / `ID`. Bahasa UI dan notifikasi (Telegram, email). |
| `telegram_chat_id` | "Connect Telegram" button | Tombol "Hubungkan Telegram" | bigint | NULL | UNIQUE. Terisi setelah user menautkan bot Telegram. |
| `created_at` / `updated_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

#### D1.2 `kyc_profiles` (test-only)
Data KYC/AML simulasi. Bukan sumber kebenaran apa pun di kontrak.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `user_id` | — (internal) | — (internal) | uuid | NOT NULL | PK dan FK → `users.id`. Satu profil per user. |
| `full_name` | Full Name | Nama Lengkap | text | NOT NULL | Hasil ekstraksi KTP oleh AI agent, boleh dikoreksi user. |
| `nik` | National ID Number (NIK) | NIK | char(16) | NOT NULL | 16 digit acak (test-only). CHECK `nik ~ '^[0-9]{16}$'`. |
| `address` | Address | Alamat | text | NOT NULL | Dari statement bill (test-only). |
| `face_verified` | Face Verification | Verifikasi Wajah | boolean | NOT NULL | Default `false`. Hasil verifikasi wajah (simulasi). |
| `id_extracted_by_ai` | Auto-filled from ID card | Terisi otomatis dari KTP | boolean | NOT NULL | `true` bila data diisi otomatis oleh AI agent. Satu-satunya fitur AI yang disepakati. |
| `status` | KYC Status | Status KYC | text | NOT NULL | `PENDING` / `VERIFIED` / `FAILED`. |
| `verified_at` | Verification Date | Tanggal Verifikasi | timestamptz | NULL | Terisi saat status `VERIFIED`. |
| `created_at` / `updated_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

#### D1.3 `partners`
Notaris dan guarantor. Wallet partner juga didaftarkan di kontrak sebagai penanda tangan yang diizinkan.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | uuid | NOT NULL | PK. |
| `user_id` | — (internal) | — (internal) | uuid | NOT NULL | FK → `users.id`, UNIQUE. Wallet penanda tangan partner. |
| `type` | Role (Notary / Guarantor) | Peran (Notary / Guarantor) | text | NOT NULL | `NOTARY` / `GUARANTOR`. |
| `name` | Partner Name | Nama Partner | text | NOT NULL | Contoh: `INDOMOTOR`, `DIGITALSHOP`, `ACCSSTORE`, `GOLDJEWELRY`, `GREENPROPERTY`. |
| `category` | Category | Kategori | text | NULL | Kategori yang ditangani. Wajib untuk `GUARANTOR`, NULL untuk `NOTARY`. Nilai: lihat D9. |
| `city` | City | Kota | text | NULL | Wajib untuk `GUARANTOR`. Ditampilkan di auctionID sebagai bagian terms & conditions. |
| `active` | — (internal) | — (internal) | boolean | NOT NULL | Default `true`. Partner nonaktif tidak bisa dipilih untuk auctionID baru. |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

---

### D2. Lelang

#### D2.1 `auctions`
Satu baris per auctionID. Parameter yang bisa berubah antar-putaran ada di `auction_rounds`.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | uuid | NOT NULL | PK. |
| `auction_code` | Auction ID | Auction ID | text | NOT NULL | UNIQUE. Kode yang tampil ke publik; memuat kota guarantor. Dihasilkan sistem. |
| `consignor_id` | Consignor | Consignor | uuid | NOT NULL | FK → `users.id`. Dilarang bid di auctionID miliknya (kontrak memblokir wallet ini; wallet lain ditangkap lewat flag KYC). |
| `guarantor_id` | Guarantor | Guarantor | uuid | NOT NULL | FK → `partners.id` (type `GUARANTOR`). Dipilih consignor. Kategorinya harus sama dengan `category`. |
| `notary_id` | Notary | Notary | uuid | NOT NULL | FK → `partners.id` (type `NOTARY`). |
| `category` | Category | Kategori | text | NOT NULL | `OTOMOTIF` / `PROPERTI` / `ELEKTRONIK` / `AKSESORIS_HOBI` / `PERHIASAN`. Menentukan `document_type` dan field di `auction_assets.spec`. |
| `currency` | Currency | Mata Uang | text | NOT NULL | Default `USDC`. `IDRX` baru dibuka jika proposal disetujui; saat itu consignor memilih salah satu dari 2 opsi staking per auctionID. |
| `token_decimals` | — (internal) | — (internal) | smallint | NOT NULL | Default `6` (USDC). Dipakai untuk konversi tampilan. |
| `status` | Status | Status | text | NOT NULL | Lihat D9. Mulai `SCHEDULED` status ini adalah cermin kontrak. Sebelum itu hanya ada di DB. |
| `current_round` | Round | Putaran | smallint | NOT NULL | Default `1`. Naik saat re-use setelah `PASSED_IN`. |
| `pending_at` | — (internal) | — (internal) | timestamptz | NULL | Waktu masuk `PENDING`. |
| `pending_deadline` | Consignment Deadline | Batas Waktu Consignment | timestamptz | NULL | `pending_at + 48 jam`. Lewat tanpa Confirm → `CANCELED`. |
| `fee_config_id` | — (internal) | — (internal) | uuid | NULL | FK → `fee_config.id`. Snapshot fee yang berlaku saat `SCHEDULED`; tidak berubah selama auctionID berjalan. |
| `onchain_tx_hash` | View on Explorer | Lihat di Explorer | text | NULL | Tx pendaftaran ke kontrak (saat `SCHEDULED`). |
| `onchain_registered_at` | Registered On-chain | Terdaftar On-chain | timestamptz | NULL | |
| `created_at` / `updated_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Indeks: `(status)`, `(consignor_id)`, `(guarantor_id)`, `(category, status)`.

#### D2.2 `auction_rounds`
Satu baris per putaran. Re-use auctionID (setelah `PASSED_IN`) menambah putaran baru.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK → `auctions.id`. Bagian PK. |
| `round_no` | Round | Putaran | smallint | NOT NULL | Bagian PK. Mulai dari 1. |
| `starting_bid` | Starting Bid | Starting Bid | bigint | NOT NULL | CHECK `> 0`. Nilai pembukaan. Contoh 1,000 USDC = `1000000000`. |
| `bid_increment` | Bid Increment | Bid Increment | bigint | NOT NULL | USDC hanya: `500000` (0.5), `5000000` (5), `50000000` (50), `500000000` (500), `5000000000` (5,000). CHECK `bid_increment * 20 <= starting_bid` (maks 5% dari starting bid). |
| `scheduled_at` | Scheduled On | Dijadwalkan Pada | timestamptz | NULL | Waktu putaran ini masuk `SCHEDULED`. |
| `open_at` | Open Time | Waktu Mulai (Open) | timestamptz | NOT NULL | Jam OPEN. Harus 48–168 jam setelah `scheduled_at` (divalidasi di aplikasi dan kontrak). |
| `duration_hours` | Duration (hours) | Durasi (jam) | smallint | NOT NULL | CHECK `BETWEEN 12 AND 48`. |
| `close_at` | Close Time | Waktu Berakhir (Close) | timestamptz | NOT NULL | `open_at + duration_hours`. Timer berhenti keras (tanpa perpanjangan anti-sniping). |
| `outcome` | Auction Result | Hasil Lelang | text | NULL | `AWARDED` / `PASSED_IN`. NULL selama lelang berjalan. |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

PK: `(auction_id, round_no)`.

Catatan re-use: hanya `starting_bid`, `bid_increment`, `open_at`, `duration_hours` yang boleh diubah; putaran baru langsung `SCHEDULED` (tanpa guarantor dan notaris ulang).

#### D2.3 `auction_assets`
Spesifikasi objek lelang. Satu baris per auctionID, tidak berubah antar-putaran.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | PK dan FK → `auctions.id`. |
| `title` | Title | Judul | text | NOT NULL | Judul listing. |
| `description` | Description | Deskripsi | text | NOT NULL | Deskripsi bebas. |
| `condition` | Condition | Kondisi | text | NOT NULL | `NEW` / `LIKE_NEW` / `GOOD` / `FAIR` / `DAMAGED`. |
| `condition_notes` | Condition Notes | Catatan Kondisi | text | NULL | Catatan cacat/kekurangan. Wajib bila `DAMAGED`. |
| `document_type` | Document Type (automatic, not filled by user) | Jenis Dokumen (otomatis, tidak diisi user) | text | NOT NULL | `CERTIFICATE` (otomotif = BPKB, properti = SHM/SHGB) atau `INVOICE` (kategori lain = nota). Otomatis dari kategori, tidak diisi user. |
| `document_number` | Certificate Number (automotive/property) or Invoice Number (others) | Nomor Sertifikat (otomotif/properti) atau Nomor Nota (lainnya) | text | NOT NULL | Nomor sertifikat atau nomor nota, disimpan sebagai teks, terbuka (plain) di on-chain. Token `NUL` hanya boleh bila `document_type = INVOICE`. |
| `chassis_number` | Chassis Number | Nomor Rangka | text | NULL | Nomor rangka. Hanya untuk `OTOMOTIF`, wajib di sana. NULL untuk kategori lain. |
| `serial_number` | Serial Number | Serial Number | text | NULL | Hanya untuk kategori selain `OTOMOTIF` dan `PROPERTI`, wajib di sana. Token `NUL` boleh. NULL untuk otomotif/properti. |
| `spec` | "Specifications" section (see D2.3.1) | Bagian "Spesifikasi" (lihat D2.3.1) | jsonb | NOT NULL | Field per kategori (lihat tabel D2.3.1). Divalidasi dengan skema di aplikasi. |
| `spec_hash` | — (internal) | — (internal) | bytea | NOT NULL | Hash gabungan teks spesifikasi + hash file; nilai yang sama dikirim ke kontrak. |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Constraint:
- `document_type = 'CERTIFICATE'` jika kategori `OTOMOTIF`/`PROPERTI`, selain itu `INVOICE`.
- `NUL` ditolak bila `document_type = 'CERTIFICATE'`.
- Unik parsial: satu auctionID aktif per `document_number` (status bukan `REJECTED`, `CANCELED`, `SETTLED`, `WITHDRAWN`), `NUL` dikecualikan.
- Identifier dibuat kolom sendiri (bukan JSONB) supaya bisa di-index untuk cek duplikat.

##### D2.3.1 Isi `spec` per kategori

| Kategori | Key (tipe) | Label UI (EN, default) | Label UI (ID) |
|---|---|---|---|
| `OTOMOTIF` | `brand` (text) | Brand | Merek |
| | `model` (text) | Model | Model |
| | `year` (int) | Year | Tahun |
| | `color` (text) | Color | Warna |
| | `mileageKm` (int) | Mileage (km) | Jarak Tempuh (km) |
| `PROPERTI` | `propertyType` (text) | Property Type | Jenis Properti |
| | `kelurahan`, `kecamatan`, `kota`, `provinsi` (text) | Sub-district (Kelurahan), District (Kecamatan), City, Province | Kelurahan, Kecamatan, Kota, Provinsi |
| | `landAreaM2` (number) | Land Area (m²) | Luas Tanah (m²) |
| | `buildingAreaM2` (number) | Building Area (m²) | Luas Bangunan (m²) |
| | `certificateKind` (SHM/SHGB/lainnya) | Certificate Type | Jenis Sertifikat |
| `ELEKTRONIK` | `brand`, `model` (text) | Brand, Model | Merek, Model |
| | `purchaseYear` (int) | Purchase Year | Tahun Pembelian |
| | `completeness` (text) | Completeness | Kelengkapan |
| | `warrantyUntil` (date, opsional) | Warranty Until | Garansi Sampai |
| `AKSESORIS_HOBI` | `brand` (text) | Brand | Merek |
| | `modelEdition` (text) | Model / Edition | Model / Edisi |
| | `year` (int) | Year | Tahun |
| | `completeness` (text) | Completeness | Kelengkapan |
| `PERHIASAN` | `jewelryType` (text) | Jewelry Type | Jenis Perhiasan |
| | `metalType` (GOLD/SILVER/PLATINUM/OTHER) | Metal Type | Jenis Logam |
| | `purity` (text, mis. "24K"/"925") | Purity | Kadar (Purity) |
| | `weightGram` (number) | Weight (grams) | Berat (gram) |
| | `brand` (text, opsional) | Brand | Merek |

Catatan: sepeda listrik masuk kategori Elektronik. Untuk ponsel, hint UI di kolom Serial Number: "isi IMEI".

Petunjuk pengisian (placeholder/hint) per kolom UI:
- Nomor Nota: "isi NUL jika tidak ada nota".
- Serial Number: "isi serial number objek lelang; isi NUL jika tidak ada".
- Nomor Sertifikat / Nomor Rangka: tidak boleh NUL.

#### D2.4 `auction_files`
Metadata file. File asli tetap off-chain; metadata dan hash masuk on-chain.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | uuid | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK → `auctions.id`. |
| `kind` | File Type | Jenis File | text | NOT NULL | `PHOTO` / `DOCUMENT_SCAN`. |
| `position` | Photo Order | Urutan Foto | smallint | NULL | Urutan foto 1–5. NULL untuk `DOCUMENT_SCAN`. |
| `filename` | File Name | Nama File | text | NOT NULL | Nama file tanpa ekstensi. |
| `extension` | Extension | Ekstensi | text | NOT NULL | Mis. `jpg`, `png`, `pdf`. |
| `mime` | — (internal) | — (internal) | text | NOT NULL | Mis. `image/jpeg`. |
| `width` / `height` | Resolution | Resolusi | int | NULL | Resolusi piksel. NULL untuk dokumen non-gambar. |
| `size_bytes` | File Size | Ukuran File | bigint | NOT NULL | |
| `content_hash` | File Hash (in verification details) | Hash File (di detail verifikasi) | bytea | NOT NULL | Hash isi file; ini yang dicatat on-chain. |
| `storage_url` | — (internal) | — (internal) | text | NOT NULL | Lokasi file off-chain. |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Constraint: tepat 5 baris `PHOTO` per `auction_id` dengan `position` 1–5 (UNIQUE `(auction_id, kind, position)`); validasi jumlah dilakukan sebelum `PENDING`.

---

### D3. Alur, Konfirmasi, dan Tanda Tangan

#### D3.1 `status_log` (append-only)

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | bigserial | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK. |
| `round_no` | — (internal) | — (internal) | smallint | NULL | NULL untuk transisi sebelum `SCHEDULED`. |
| `from_status` | Previous Status | Status Sebelumnya | text | NULL | NULL untuk status awal (`CREATED`). |
| `to_status` | New Status | Status Baru | text | NOT NULL | |
| `actor_user_id` | By | Oleh | uuid | NULL | FK → `users.id`. NULL bila oleh sistem/keeper. |
| `reason` | Reason | Alasan | text | NULL | Mis. alasan `REJECTED`. |
| `tx_hash` | View on Explorer | Lihat di Explorer | text | NULL | Terisi bila transisi terjadi on-chain. |
| `created_at` | Time | Waktu | timestamptz | NOT NULL | |

#### D3.2 `confirmation_codes`
Kode yang diterbitkan notaris setelah guarantor menyatakan APPROVED, dikirim ke email consignor.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | PK dan FK. Satu kode per auctionID (tetap berlaku untuk re-use). |
| `code_hash` | "Confirmation Code" input field (compared against hash) | Kolom input "Confirmation Code" (dibandingkan dengan hash) | bytea | NOT NULL | Hash kode. Kode mentah tidak disimpan. |
| `issued_by_notary` | — (internal) | — (internal) | uuid | NOT NULL | FK → `partners.id`. |
| `signature` | — (internal) | — (internal) | bytea | NOT NULL | Tanda tangan notaris atas kode. |
| `emailed_at` | — (internal) | — (internal) | timestamptz | NULL | |
| `used_at` | — (internal) | — (internal) | timestamptz | NULL | Terisi saat consignor memasukkan kode dan menekan Confirm. |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

#### D3.3 `attestations`
Tanda tangan (gaya EIP-712) dari wallet yang ditunjuk. Kontrak hanya mempercayai tanda tangan ini untuk peristiwa off-chain.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | uuid | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK. |
| `round_no` | — (internal) | — (internal) | smallint | NULL | NULL untuk atestasi level auctionID. |
| `type` | Confirmation Type | Jenis Konfirmasi | text | NOT NULL | `GUARANTOR_APPROVED`, `GUARANTOR_REJECTED`, `NOTARY_APPROVED`, `BIDDER_AWARD_SIGN`, `GUARANTOR_COLLECTED`, `GUARANTOR_WITHDRAWN`, `CONSIGNOR_CONFIRM`, `WITHDRAW_REQUEST`. `GUARANTOR_APPROVED/REJECTED` hanya off-chain (sebelum `SCHEDULED`). |
| `signer_wallet` | Signer | Penanda Tangan | text | NOT NULL | Harus wallet yang terdaftar untuk peran itu. |
| `payload` | — (internal) | — (internal) | jsonb | NOT NULL | Data yang ditandatangani (termasuk domain, nonce, kedaluwarsa). |
| `signature` | Digital Signature | Tanda Tangan Digital | bytea | NOT NULL | |
| `submitted_tx_hash` | — (internal) | — (internal) | text | NULL | Tx yang membawa atestasi ke kontrak. |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

#### D3.4 `receipts`

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | uuid | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK. |
| `round_no` | — (internal) | — (internal) | smallint | NOT NULL | |
| `type` | Receipt Type (Consignment / Collection / Withdrawal Receipt) | Jenis Receipt (Consignment / Collection / Withdrawal Receipt) | text | NOT NULL | `CONSIGNMENT` (barang diterima guarantor), `COLLECTION` (pemenang mengambil), `WITHDRAWAL` (consignor menarik barang). |
| `issued_at` | Issue Date | Tanggal Terbit | timestamptz | NOT NULL | Untuk `COLLECTION` memulai `CLAIM_PERIOD` 168 jam. |
| `auto_issued` | Auto-issued | Diterbitkan Otomatis | boolean | NOT NULL | Default `false`. `true` bila `COLLECTION` tercetak otomatis karena pemenang tidak datang dalam 48 jam sejak signing. |
| `file_url` | "Download Receipt" button | Tombol "Unduh Receipt" | text | NOT NULL | |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

---

### D4. Bid dan AWARDING

#### D4.1 `bids`
Diisi dari event kontrak oleh indexer, bukan dari klien.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | bigserial | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK. |
| `round_no` | — (internal) | — (internal) | smallint | NOT NULL | |
| `phase` | Pre-bid / Live Bid | Pre-bid / Live Bid | text | NOT NULL | `PRE_BID` (saat `SCHEDULED`) / `LIVE_BID` (saat `OPEN`). |
| `bidder_wallet` | Bidder | Bidder | text | NOT NULL | |
| `amount_added` | Added Stake | Tambahan Stake | bigint | NOT NULL | Tambahan stake pada tx ini. Bid pertama = starting bid + bid. |
| `my_bid_after` | My Bid | My Bid | bigint | NOT NULL | Akumulasi stake bidder setelah tx ini. |
| `current_bid_after` | Current Bid | Current Bid | bigint | NOT NULL | `currentBid` global setelah tx ini. |
| `seq` | — (internal) | — (internal) | bigint | NOT NULL | Nomor urut bid dari kontrak per putaran. Dasar tie-break first-in-first-out. |
| `block_number` | — (internal) | — (internal) | bigint | NOT NULL | |
| `tx_index` | — (internal) | — (internal) | int | NOT NULL | |
| `log_index` | — (internal) | — (internal) | int | NOT NULL | |
| `block_ts` | Bid Time | Waktu Bid | timestamptz | NOT NULL | Waktu block (resolusi detik); acuan resmi. |
| `tx_hash` | View on Explorer | Lihat di Explorer | text | NOT NULL | UNIQUE bersama `log_index`. |
| `client_ms` | Milliseconds (detail log only) | Milidetik (hanya di log detail) | bigint | NULL | Epoch milidetik dari klien. Hanya tampilan/log, tidak dipakai menentukan pemenang. |

Bid di bawah `currentBid` boleh dan tercatat (ikut peringkat).

#### D4.2 `bidder_stakes`
Tabel turunan (di-update indexer): posisi terakhir tiap bidder per putaran.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | Bagian PK. |
| `round_no` | — (internal) | — (internal) | smallint | NOT NULL | Bagian PK. |
| `bidder_wallet` | Bidder | Bidder | text | NOT NULL | Bagian PK. |
| `my_bid` | My Bid | My Bid | bigint | NOT NULL | Akumulasi stake saat ini (privat bagi bidder di UI). |
| `reached_seq` | — (internal) | — (internal) | bigint | NOT NULL | `seq` saat `my_bid` terakhir tercapai; yang lebih kecil menang bila `my_bid` sama. |
| `rank` | Rank | Peringkat | smallint | NULL | 1–10 bila masuk peringkat, selain itu NULL. |
| `status` | Stake Status | Status Stake | text | NOT NULL | `ACTIVE`, `PROVISIONAL`, `DEFAULTED`, `WINNER`, `REFUNDABLE`, `REFUNDED`. |
| `refund_claimed_tx` | View on Explorer | Lihat di Explorer | text | NULL | Tx withdraw refund oleh bidder (pull, direlay platform). |
| `updated_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Aturan penarikan (pull, direlay platform, dikenai Withdrawal Fee 2.5 USDC): peringkat 11+ setelah `CLOSED`; peringkat 2–10 setelah winner signing; `DEFAULTED` dikurangi default fee 5%; `WINNER` tidak bisa menarik (stake dilepas saat `SETTLED`); bila putaran `PASSED_IN`, semua stake dapat ditarik (default fee yang sudah dipotong tidak dikembalikan).

#### D4.3 `awarding_attempts`
Permintaan signing ke provisional winner secara berurutan.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | Bagian PK. |
| `round_no` | — (internal) | — (internal) | smallint | NOT NULL | Bagian PK. |
| `rank` | Rank | Peringkat | smallint | NOT NULL | Bagian PK. CHECK `BETWEEN 1 AND 10`. |
| `bidder_wallet` | Provisional Winner | Provisional Winner | text | NOT NULL | |
| `request_sent_at` | Request Sent | Permintaan Dikirim | timestamptz | NOT NULL | Timer 5 menit dihitung dari sini (sejak permintaan dikirim, bukan sejak user membuka). |
| `deadline_at` | Signing countdown (05:00) | Hitung mundur Signing (05:00) | timestamptz | NOT NULL | `request_sent_at + 5 menit`. |
| `result` | Signing Status | Status Signing | text | NOT NULL | `PENDING` / `SIGNED` / `DEFAULTED`. |
| `signed_at` | Signing Time | Waktu Signing | timestamptz | NULL | |
| `default_fee` | Default Fee | Default Fee | bigint | NULL | Terisi bila `DEFAULTED` (5% dari stake). |
| `attestation_id` | — (internal) | — (internal) | uuid | NULL | FK → `attestations.id` (tipe `BIDDER_AWARD_SIGN`). |

Maksimal 10 baris per putaran (kasus terburuk 50 menit). Bila semua `DEFAULTED` → putaran `PASSED_IN`.

---

### D5. Uang

#### D5.1 `fee_config`

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | uuid | NOT NULL | PK. |
| `platform_bps` | Platform Commission | Platform Commission | int | NOT NULL | Default `250` (2.5%). |
| `guarantor_bps` | Guarantor Commission | Guarantor Commission | int | NOT NULL | Default `150` (1.5%). |
| `notary_bps` | Notary Commission | Notary Commission | int | NOT NULL | Default `100` (1%). |
| `tax_bps` | Tax | Tax | int | NOT NULL | Default `1000` (10%). Hanya berlaku bila sampai `SETTLED` (winner signing). |
| `withdraw_fee` | Withdrawal Fee | Withdrawal Fee | bigint | NOT NULL | Default `2500000` (2.5 USDC), tetap. Potongan pada setiap withdraw (pull) yang direlay platform, di luar commission, default fee, dan tax. Di kontrak berupa konstanta yang tidak bisa dinaikkan. |
| `effective_from` | — (internal) | — (internal) | timestamptz | NOT NULL | |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Satuan basis poin (1 bps = 0.01%) supaya tidak ada desimal. Total commission = 5% (2.5 + 1.5 + 1). Konfigurasi ada di backend; snapshot-nya disalin ke kontrak saat `SCHEDULED`.

#### D5.2 `payouts`
Satu baris per penerima per kredit/pembayaran, dari event kontrak.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | bigserial | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK. |
| `round_no` | — (internal) | — (internal) | smallint | NOT NULL | |
| `kind` | Payment Type | Jenis Pembayaran | text | NOT NULL | `SETTLED` (saat auctionID SETTLED) / `DEFAULT_FEE` (kandidat DEFAULTED). |
| `recipient_role` | Recipient | Penerima | text | NOT NULL | `PLATFORM` / `GUARANTOR` / `NOTARY` / `TAX` / `CONSIGNOR`. |
| `recipient_wallet` | Recipient Wallet | Wallet Penerima | text | NOT NULL | |
| `amount` | Amount | Jumlah | bigint | NOT NULL | Nilai kotor bagian penerima, satuan terkecil. Withdrawal Fee tidak termasuk (dicatat di `withdrawals`). |
| `tx_hash` | View on Explorer | Lihat di Explorer | text | NOT NULL | |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Distribusi `SETTLED` dari stake winner: platform 2.5%, guarantor 1.5%, notary 1%, tax 10%, sisa 85% ke consignor. Bagian consignor dikirim langsung saat withdraw consignor; bagian platform, guarantor, notary, dan tax dicatat sebagai saldo yang bisa ditarik sendiri oleh wallet masing-masing. `DEFAULT_FEE` = 5% dibagi 2.5/1.5/1 sebagai saldo penerima, tanpa tax. Tax hanya terjadi bila winner signing.

#### D5.3 `withdrawals`
Setiap penarikan dana (pull) dari kontrak, dari event kontrak.

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | bigserial | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NULL | FK. NULL untuk penarikan saldo wallet penerima commission/tax (gabungan beberapa auctionID). |
| `round_no` | — (internal) | — (internal) | smallint | NULL | |
| `wallet` | Recipient Wallet | Wallet Penerima | text | NOT NULL | Wallet yang menarik. |
| `kind` | Withdrawal Type | Jenis Withdraw | text | NOT NULL | `REFUND` (bidder), `CONSIGNOR_PAYOUT` (sekaligus menandai SETTLED), `FEE_BALANCE` (saldo commission/tax/default fee). |
| `gross_amount` | Gross Amount | Jumlah Kotor | bigint | NOT NULL | Sebelum Withdrawal Fee. |
| `withdraw_fee` | Withdrawal Fee | Withdrawal Fee | bigint | NOT NULL | 2.5 USDC (`2500000`), dibatasi sebesar `gross_amount` bila lebih kecil. 0 untuk `FEE_BALANCE`. |
| `net_amount` | Amount Received | Jumlah Diterima | bigint | NOT NULL | `gross_amount - withdraw_fee`. |
| `relayed` | — (internal) | — (internal) | boolean | NOT NULL | `true` bila dikirim relayer platform (gratis gas bagi user). |
| `tx_hash` | View on Explorer | Lihat di Explorer | text | NOT NULL | |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

---

### D6. Feed dan Notifikasi

#### D6.1 `notifications`

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | bigserial | NOT NULL | PK. |
| `user_id` | — (internal) | — (internal) | uuid | NOT NULL | FK. |
| `auction_id` | — (internal) | — (internal) | uuid | NULL | FK. |
| `channel` | Channel | Kanal | text | NOT NULL | `TELEGRAM` / `EMAIL` / `WEB`. |
| `type` | Notification Type | Jenis Notifikasi | text | NOT NULL | Mis. `OUTBID`, `AWARDING_REQUEST`, `STATUS_CHANGED`, `CONFIRMATION_CODE`. |
| `payload` | Message | Isi Pesan | jsonb | NOT NULL | Isi pesan, termasuk deep link ke halaman tanda tangan. |
| `status` | — (internal) | — (internal) | text | NOT NULL | `QUEUED` / `SENT` / `FAILED`. |
| `sent_at` | Sent Time | Waktu Kirim | timestamptz | NULL | |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Update `currentBid` via Telegram hanya untuk bidder pada auctionID tersebut. Bot Telegram tidak memegang key: tombol aksi hanya membuka deep link ke web app/wallet untuk tanda tangan.

#### D6.2 `feed_posts`

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | bigserial | NOT NULL | PK. |
| `auction_id` | — (internal) | — (internal) | uuid | NOT NULL | FK. |
| `round_no` | — (internal) | — (internal) | smallint | NOT NULL | |
| `kind` | Feed Type (Upcoming / Open / Closed) | Jenis Feed (Upcoming / Open / Closed) | text | NOT NULL | `UPCOMING` / `OPEN` / `CLOSED`. |
| `channel` | — (internal) | — (internal) | text | NOT NULL | `APP` / `X` / `TELEGRAM`. |
| `external_id` | — (internal) | — (internal) | text | NULL | ID posting di X/Telegram. |
| `posted_at` | Posted Time | Waktu Posting | timestamptz | NOT NULL | |

`REJECTED` dan `CANCELED` tidak pernah masuk feed.

---

### D7. Indexer

#### D7.1 `chain_events` (mentah, idempoten)

| Kolom | Label UI (EN, default) | Label UI (ID) | Tipe | Null | Catatan |
|---|---|---|---|---|---|
| `id` | — (internal) | — (internal) | bigserial | NOT NULL | PK. |
| `chain_id` | — (internal) | — (internal) | int | NOT NULL | Arbitrum One atau Arbitrum Sepolia (testnet). |
| `block_number` | — (internal) | — (internal) | bigint | NOT NULL | |
| `block_ts` | — (internal) | — (internal) | timestamptz | NOT NULL | |
| `tx_hash` | — (internal) | — (internal) | text | NOT NULL | |
| `log_index` | — (internal) | — (internal) | int | NOT NULL | UNIQUE `(chain_id, tx_hash, log_index)` supaya event yang diproses ulang tidak ganda. |
| `event_name` | — (internal) | — (internal) | text | NOT NULL | Mis. `AuctionRegistered`, `BidPlaced`, `AwardingStarted`, `Defaulted`, `Collected`, `Settled`. |
| `args` | — (internal) | — (internal) | jsonb | NOT NULL | Argumen event. |
| `processed` | — (internal) | — (internal) | boolean | NOT NULL | Default `false`. |
| `created_at` | — (internal) | — (internal) | timestamptz | NOT NULL | |

Semua tabel turunan (`bids`, `bidder_stakes`, `payouts`, status auctionID on-chain) dibangun dari tabel ini. Jika DB rusak, bangun ulang dari event kontrak. Indexer harus menangani reorg block (tandai event berdasarkan `block_number`, proses ulang bila block berubah).

---

### D8. Relasi

- `users` 1 — N `auctions` (consignor), 1 — 0..1 `kyc_profiles`, 1 — 0..1 `partners`.
- `partners` 1 — N `auctions` (sebagai guarantor atau notaris).
- `auctions` 1 — N `auction_rounds`, 1 — 1 `auction_assets`, 1 — N `auction_files` (5 foto), 1 — N `status_log`, `attestations`, `receipts`, 1 — 0..1 `confirmation_codes`.
- `auction_rounds` 1 — N `bids`, `bidder_stakes`, `awarding_attempts`, `payouts`, `withdrawals`.
- `auctions` N — 1 `fee_config` (snapshot).
- `awarding_attempts` N — 0..1 `attestations`.
- `chain_events` tidak punya FK; dihubungkan lewat `tx_hash`/`log_index`.

### D9. Daftar Nilai Enum

| Nama | Nilai |
|---|---|
| `category` | `OTOMOTIF`, `PROPERTI`, `ELEKTRONIK`, `AKSESORIS_HOBI`, `PERHIASAN` |
| `auctions.status` | `CREATED`, `PENDING`, `REJECTED`, `CANCELED`, `SCHEDULED`, `OPEN`, `CLOSED`, `AWARDING`, `COLLECTION`, `CLAIM_PERIOD`, `SETTLED`, `PASSED_IN`, `WITHDRAWN` |
| `document_type` | `CERTIFICATE`, `INVOICE` |
| `condition` | `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`, `DAMAGED` |
| `user_type` | `PUBLIC`, `NOTARY`, `GUARANTOR`, `PLATFORM` |
| `preferred_language` | `EN` (default), `ID` |
| `payouts.kind` | `SETTLED`, `DEFAULT_FEE` |
| `withdrawals.kind` | `REFUND`, `CONSIGNOR_PAYOUT`, `FEE_BALANCE` |
| `currency` | `USDC` (`IDRX` menunggu proposal) |

---

### D10. Penyimpanan Smart Contract (Arbitrum)

Satu kontrak untuk semua auctionID. Kontrak tidak punya fungsi admin penarik dana. Semua pengeluaran dana berupa pull oleh penerima (lewat tanda tangan penerima, direlay platform). Tipe memakai notasi Solidity.

#### D10.1 Konfigurasi global

| Item | Tipe | Catatan |
|---|---|---|
| `usdc` | address | Alamat token USDC di Arbitrum. |
| `platformWallet`, `taxWallet` | address | Penerima saldo commission/tax. Wallet guarantor dan notary diambil dari data auctionID (lihat D10.2). |
| `owner` | address | Platform. Hanya boleh mendaftarkan partner (wallet notary dan guarantor beserta kategori), mengganti `relayerWallet`, dan mengalihkan kepemilikan. Tidak ada fungsi penarik dana. |
| `relayerWallet` | address | Wallet keeper/relayer platform: mengirim aksi trigger dan aksi bertanda tangan. Tidak punya kuasa atas dana; hanya boleh memanggil fungsi yang aturannya dikunci kontrak (mis. maju ke kandidat berikutnya ditolak bila 5 menit belum lewat). |
| `allowedIncrements` | uint128[5] | `500000, 5000000, 50000000, 500000000, 5000000000`. |
| `withdrawFee` | uint128 (konstanta) | `2500000` (2.5 USDC). Tidak bisa dinaikkan. |
| `claimable` | mapping(address => uint128) | Saldo commission/tax/default fee yang bisa ditarik wallet penerima. |
| `nonces` | mapping(address => uint256) | Anti-replay untuk pesan bertanda tangan (EIP-712). |

#### D10.2 Struct `Auction` — kunci: `auctionKey` (`bytes32`, hash dari `auction_code`)

| Field | Tipe | Catatan |
|---|---|---|
| `consignor` | address | Dilarang bid di auctionKey ini. |
| `guarantor` | address | Penanda tangan COLLECTED/WITHDRAWN; penerima guarantor commission. |
| `notary` | address | Penanda tangan APPROVED, penerbit confirmationCode; penerima notary commission. |
| `category` | uint8 | Sesuai enum. |
| `status` | uint8 | Mulai `SCHEDULED`. |
| `currentRound` | uint16 | |
| `specHash` | bytes32 | Hash spesifikasi + file. Metadata lengkap dicatat sebagai event log untuk menghemat gas. |
| `platformBps`, `guarantorBps`, `notaryBps`, `taxBps` | uint16 ×4 | Snapshot fee saat `SCHEDULED`. |

#### D10.3 Struct `Round` — kunci: `(auctionKey, roundNo)`

| Field | Tipe | Catatan |
|---|---|---|
| `startingBid` | uint128 | Satuan terkecil. |
| `bidIncrement` | uint128 | Salah satu dari `allowedIncrements` dan ≤ 5% `startingBid`. |
| `openAt` | uint64 | Detik (block timestamp). |
| `closeAt` | uint64 | `openAt + duration`. Tidak ada perpanjangan. |
| `currentBid` | uint128 | `myBid` tertinggi (global/publik). |
| `currentLeader` | address | Bidder yang lebih dulu mencapai `currentBid`. |
| `bidSeq` | uint64 | Penghitung urutan bid; dasar tie-break first-in-first-out. |
| `topRanks` | address[10] | Peringkat 1–10, diperbarui tiap bid (urut `myBid` menurun, lalu `reachedSeq` menaik). |
| `awardingIndex` | uint8 | Kandidat yang sedang diminta signing. |
| `awardingDeadline` | uint64 | 5 menit sejak permintaan signing dicatat. |
| `winner` | address | Terisi setelah signing. |
| `winnerStake` | uint128 | Dasar perhitungan commission/tax. |
| `collectionDeadline` | uint64 | 48 jam sejak signing. |
| `claimPeriodEnd` | uint64 | 168 jam sejak collectionReceipt (COLLECTED atau otomatis). |

#### D10.4 Struct `Stake` — `mapping(auctionKey => mapping(roundNo => mapping(address => Stake)))`

| Field | Tipe | Catatan |
|---|---|---|
| `myBid` | uint128 | Akumulasi stake. Dana masuk kontrak lewat transaksi wallet → kontrak; tidak bisa ditarik sebelum aturan penarikan terpenuhi. |
| `reachedSeq` | uint64 | `bidSeq` saat `myBid` terakhir tercapai. |
| `withdrawn` | bool | Sudah ditarik. |

#### D10.5 Event penting
`AuctionRegistered` (membawa metadata spesifikasi/file), `RoundScheduled`, `BidPlaced`, `Closed`, `AwardingStarted`, `AwardSigned`, `Defaulted`, `PassedIn`, `Collected`, `ClaimPeriodStarted`, `WithdrawnItem`, `FeeCredited`, `Withdrawal` (jenis, jumlah kotor, Withdrawal Fee, jumlah diterima), `Settled`. Indexer membaca event ini ke `chain_events`.

#### D10.6 Aksi dan penanggung gas

| Jenis | Siapa bayar gas | Aksi |
|---|---|---|
| Bid | User | pre-bid, live bid, top-up. UI menampilkan keterangan gas fee di bawah tombol. |
| Withdraw (pull) | Platform (relayer); user gratis, dipotong Withdrawal Fee 2.5 USDC | refund bidder; withdraw consignor (sekaligus menandai `SETTLED` dan mencatat saldo platform/guarantor/notary/tax). User menandatangani permintaan (EIP-712). |
| Trigger | Platform (`relayerWallet`) | mulai AWARDING ke peringkat 1 (mencatat CLOSED; OPEN diturunkan dari waktu), maju ke kandidat berikutnya setelah 5 menit, `COLLECTION` → `CLAIM_PERIOD` setelah 48 jam. Kontrak menolak panggilan yang syaratnya belum terpenuhi. |
| Aksi bertanda tangan | Platform | Confirm consignor (pendaftaran on-chain), signing AWARDING bidder, atestasi guarantor (COLLECTED, WITHDRAWN) dan notary, pendaftaran putaran re-use. |
| Penarikan saldo penerima | Wallet penerima sendiri | platform, guarantor, notary, tax menarik `claimable` lewat panggilan langsung dari wallet masing-masing, tanpa pesan bertanda tangan dan tanpa Withdrawal Fee (§21 butir 1). |

#### D10.7 Pesan bertanda tangan (gaya EIP-712)
Setiap pesan memuat domain (chain + alamat kontrak), `nonce`, dan `expiry`:
- `NotaryApproval`: auctionKey, hash parameter putaran 1, hash confirmationCode.
- `ConsignorConfirm`: auctionKey, hash confirmationCode.
- `AwardSign`: auctionKey, roundNo, peringkat.
- `WithdrawRequest`: auctionKey, roundNo, wallet penarik.
- `Collected`, `Withdrawn`: auctionKey, roundNo (ditandatangani guarantor).


==========
/docs/TECH_STACK.md
==========
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
│       ├── components/
│       ├── lib/              # wagmi/viem, format angka, validasi
│       └── messages/         # en.json, id.json (kunci i18n)
├── workers/
│   ├── keeper/               # aksi trigger (cron)
│   ├── indexer/              # event kontrak → DB (cron)
│   └── telegram-bot/         # webhook bot
└── .github/
    ├── copilot-instructions.md
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


==========
/docs/WALLET_OPERATIONS.md
==========
# Catatan Operasional & Arsitektur Paralel

Dokumen ini mencatat keputusan arsitektur penting dan prosedur operasional yang tidak diatur secara detail di dalam kode.

## 1. Peran Relayer (`relayerWallet`)
- **Fungsi:** Membayar gas fee untuk pengguna pada aksi non-bid (seperti `withdrawRefund`, `submitAwardSignature`, dan fungsi *trigger*).
- **Keamanan:** Relayer tidak memiliki kuasa atas dana pengguna. Ia hanya meneruskan pesan yang sudah ditandatangani (EIP-712) atau memicu fungsi yang terkunci oleh waktu.
- **Update Relayer:** Jika Private Key relayer bocor, `owner` dapat memanggil `setRelayer(newAddress)` dan memperbarui `RELAYER_PRIVATE_KEY` di file `.env`.

## 2. Konfigurasi Immutable (Permanen)
Karena Smart Contract bersifat *immutable* (tidak bisa di-upgrade), variabel berikut terkunci selamanya saat kontrak di-deploy:
- `platformWallet` (Penerima komisi platform)
- `taxWallet` (Penerima setoran pajak)
- `USDC_ADDRESS` (Alamat token)
Jika ada kesalahan *typo* pada alamat ini saat deploy, satu-satunya solusi adalah men-deploy kontrak baru.

## 3. Manajemen Partner (Notary & Guarantor)
Berbeda dengan Platform dan Tax, partner bersifat dinamis.
- **Pendaftaran:** Dilakukan dengan memanggil fungsi `setPartner(wallet, type, category, active)`.
- **Mengganti Partner:** Cukup panggil `setPartner` dengan alamat baru atau set `active=false` pada alamat lama. **Tidak perlu** mengubah file `.env` dan tidak perlu men-deploy ulang kontrak.
- **File `.env` (NOTARY_WALLET / GUARANTOR_WALLET):** Hanya digunakan sebagai *input* saat menjalankan script setup pertama kali. File ini bukan sumber kebenaran; sumber kebenaran adalah state di dalam Smart Contract.

==========
/drizzle.config.ts
==========
// @file drizzle.config.ts — Configuration for Drizzle Kit migrations
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './packages/db/src/schema.ts',
  out: './packages/db/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});

==========
/package.json
==========
{
  "name": "paralel",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "context:build": "tsx scripts/context/build.ts",
    "context:check": "tsx scripts/context/build.ts --check"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^5.20261101.1",
    "@types/node": "^20.0.0",
    "drizzle-kit": "^0.31.11",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.2.0",
    "dotenv": "^18.0.9",
    "drizzle-orm": "^0.45.4",
    "postgres": "^4.0.0",
    "viem": "^2.57.14"
  }
}


==========
/packages/db/drizzle/0000_curly_bill_hollister.sql
==========
CREATE TABLE "attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint,
	"type" text NOT NULL,
	"signer_wallet" text NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" "bytea" NOT NULL,
	"submitted_tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_att_type" CHECK ("attestations"."type" IN ('GUARANTOR_APPROVED','GUARANTOR_REJECTED','NOTARY_APPROVED','BIDDER_AWARD_SIGN','GUARANTOR_COLLECTED','GUARANTOR_WITHDRAWN','CONSIGNOR_CONFIRM','WITHDRAW_REQUEST')),
	CONSTRAINT "chk_att_signer_wallet" CHECK ("attestations"."signer_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "auction_assets" (
	"auction_id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"condition" text NOT NULL,
	"condition_notes" text,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"chassis_number" text,
	"serial_number" text,
	"spec" jsonb NOT NULL,
	"spec_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_assets_condition" CHECK ("auction_assets"."condition" IN ('NEW','LIKE_NEW','GOOD','FAIR','DAMAGED')),
	CONSTRAINT "chk_assets_doc_type" CHECK ("auction_assets"."document_type" IN ('CERTIFICATE','INVOICE')),
	CONSTRAINT "chk_assets_damaged_notes" CHECK ("auction_assets"."condition" <> 'DAMAGED' OR "auction_assets"."condition_notes" IS NOT NULL),
	CONSTRAINT "chk_assets_docnum_nul" CHECK ("auction_assets"."document_number" <> 'NUL' OR "auction_assets"."document_type" = 'INVOICE'),
	CONSTRAINT "chk_assets_chassis_not_nul" CHECK ("auction_assets"."chassis_number" IS NULL OR "auction_assets"."chassis_number" <> 'NUL')
);
--> statement-breakpoint
CREATE TABLE "auction_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"position" smallint,
	"filename" text NOT NULL,
	"extension" text NOT NULL,
	"mime" text NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" bigint NOT NULL,
	"content_hash" "bytea" NOT NULL,
	"storage_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_files_kind" CHECK ("auction_files"."kind" IN ('PHOTO','DOCUMENT_SCAN')),
	CONSTRAINT "chk_files_photo_position" CHECK ("auction_files"."kind" <> 'PHOTO' OR "auction_files"."position" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "auction_rounds" (
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"starting_bid" bigint NOT NULL,
	"bid_increment" bigint NOT NULL,
	"scheduled_at" timestamp with time zone,
	"open_at" timestamp with time zone NOT NULL,
	"duration_hours" smallint NOT NULL,
	"close_at" timestamp with time zone NOT NULL,
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_auction_rounds" PRIMARY KEY("auction_id","round_no"),
	CONSTRAINT "chk_rounds_starting_bid" CHECK ("auction_rounds"."starting_bid" > 0),
	CONSTRAINT "chk_rounds_bid_increment" CHECK ("auction_rounds"."bid_increment" IN (50000, 500000, 5000000, 50000000, 500000000, 5000000000)),
	CONSTRAINT "chk_rounds_increment_ratio" CHECK ("auction_rounds"."bid_increment" * 20 <= "auction_rounds"."starting_bid"),
	CONSTRAINT "chk_rounds_duration" CHECK ("auction_rounds"."duration_hours" BETWEEN 12 AND 48),
	CONSTRAINT "chk_rounds_outcome" CHECK ("auction_rounds"."outcome" IS NULL OR "auction_rounds"."outcome" IN ('AWARDED','PASSED_IN'))
);
--> statement-breakpoint
CREATE TABLE "auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_code" text NOT NULL,
	"consignor_id" uuid NOT NULL,
	"guarantor_id" uuid NOT NULL,
	"notary_id" uuid NOT NULL,
	"category" text NOT NULL,
	"currency" text DEFAULT 'USDC' NOT NULL,
	"token_decimals" smallint DEFAULT 6 NOT NULL,
	"status" text NOT NULL,
	"current_round" smallint DEFAULT 1 NOT NULL,
	"pending_at" timestamp with time zone,
	"pending_deadline" timestamp with time zone,
	"fee_config_id" uuid,
	"onchain_tx_hash" text,
	"onchain_registered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auctions_auction_code_unique" UNIQUE("auction_code"),
	CONSTRAINT "chk_auctions_category" CHECK ("auctions"."category" IN ('OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')),
	CONSTRAINT "chk_auctions_currency" CHECK ("auctions"."currency" IN ('USDC')),
	CONSTRAINT "chk_auctions_status" CHECK ("auctions"."status" IN ('CREATED','PENDING','REJECTED','CANCELED','SCHEDULED','OPEN','CLOSED','AWARDING','COLLECTION','CLAIM_PERIOD','SETTLED','PASSED_IN','WITHDRAWN')),
	CONSTRAINT "chk_auctions_current_round" CHECK ("auctions"."current_round" >= 1)
);
--> statement-breakpoint
CREATE TABLE "awarding_attempts" (
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"rank" smallint NOT NULL,
	"bidder_wallet" text NOT NULL,
	"request_sent_at" timestamp with time zone NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"result" text NOT NULL,
	"signed_at" timestamp with time zone,
	"default_fee" bigint,
	"attestation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_awarding_attempts" PRIMARY KEY("auction_id","round_no","rank"),
	CONSTRAINT "chk_awd_rank" CHECK ("awarding_attempts"."rank" BETWEEN 1 AND 10),
	CONSTRAINT "chk_awd_result" CHECK ("awarding_attempts"."result" IN ('PENDING','SIGNED','DEFAULTED'))
);
--> statement-breakpoint
CREATE TABLE "bidder_stakes" (
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"bidder_wallet" text NOT NULL,
	"my_bid" bigint NOT NULL,
	"reached_seq" bigint NOT NULL,
	"rank" smallint,
	"status" text NOT NULL,
	"refund_claimed_tx" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_bidder_stakes" PRIMARY KEY("auction_id","round_no","bidder_wallet"),
	CONSTRAINT "chk_stakes_rank" CHECK ("bidder_stakes"."rank" IS NULL OR "bidder_stakes"."rank" BETWEEN 1 AND 10),
	CONSTRAINT "chk_stakes_status" CHECK ("bidder_stakes"."status" IN ('ACTIVE','PROVISIONAL','DEFAULTED','WINNER','REFUNDABLE','REFUNDED')),
	CONSTRAINT "chk_stakes_bidder_wallet" CHECK ("bidder_stakes"."bidder_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"phase" text NOT NULL,
	"bidder_wallet" text NOT NULL,
	"amount_added" bigint NOT NULL,
	"my_bid_after" bigint NOT NULL,
	"current_bid_after" bigint NOT NULL,
	"seq" bigint NOT NULL,
	"block_number" bigint NOT NULL,
	"tx_index" integer NOT NULL,
	"log_index" integer NOT NULL,
	"block_ts" timestamp with time zone NOT NULL,
	"tx_hash" text NOT NULL,
	"client_ms" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_bids_phase" CHECK ("bids"."phase" IN ('PRE_BID','LIVE_BID')),
	CONSTRAINT "chk_bids_bidder_wallet" CHECK ("bids"."bidder_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "chain_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chain_id" integer NOT NULL,
	"block_number" bigint NOT NULL,
	"block_ts" timestamp with time zone NOT NULL,
	"tx_hash" text NOT NULL,
	"log_index" integer NOT NULL,
	"event_name" text NOT NULL,
	"args" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmation_codes" (
	"auction_id" uuid PRIMARY KEY NOT NULL,
	"code_hash" "bytea" NOT NULL,
	"issued_by_notary" uuid NOT NULL,
	"signature" "bytea" NOT NULL,
	"emailed_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_bps" integer NOT NULL,
	"guarantor_bps" integer NOT NULL,
	"notary_bps" integer NOT NULL,
	"tax_bps" integer NOT NULL,
	"withdraw_fee" bigint NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_posts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"kind" text NOT NULL,
	"channel" text NOT NULL,
	"external_id" text,
	"posted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chk_feed_kind" CHECK ("feed_posts"."kind" IN ('UPCOMING','OPEN','CLOSED')),
	CONSTRAINT "chk_feed_channel" CHECK ("feed_posts"."channel" IN ('APP','X','TELEGRAM'))
);
--> statement-breakpoint
CREATE TABLE "kyc_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"nik" text NOT NULL,
	"address" text NOT NULL,
	"face_verified" boolean DEFAULT false NOT NULL,
	"id_extracted_by_ai" boolean NOT NULL,
	"status" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_kyc_nik" CHECK ("kyc_profiles"."nik" ~ '^[0-9]{16}$'),
	CONSTRAINT "chk_kyc_status" CHECK ("kyc_profiles"."status" IN ('PENDING','VERIFIED','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"auction_id" uuid,
	"channel" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_notif_channel" CHECK ("notifications"."channel" IN ('TELEGRAM','EMAIL','WEB')),
	CONSTRAINT "chk_notif_status" CHECK ("notifications"."status" IN ('QUEUED','SENT','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"city" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "chk_partners_type" CHECK ("partners"."type" IN ('NOTARY','GUARANTOR')),
	CONSTRAINT "chk_partners_category_val" CHECK ("partners"."category" IS NULL OR "partners"."category" IN ('ALL','OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')),
	CONSTRAINT "chk_partners_role_shape" CHECK (
    ("partners"."type" = 'GUARANTOR' AND "partners"."category" IS NOT NULL AND "partners"."city" IS NOT NULL)
    OR ("partners"."type" = 'NOTARY' AND "partners"."category" IS NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"kind" text NOT NULL,
	"recipient_role" text NOT NULL,
	"recipient_wallet" text NOT NULL,
	"amount" bigint NOT NULL,
	"tx_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payout_kind" CHECK ("payouts"."kind" IN ('SETTLED','DEFAULT_FEE')),
	CONSTRAINT "chk_payout_role" CHECK ("payouts"."recipient_role" IN ('PLATFORM','GUARANTOR','NOTARY','TAX','CONSIGNOR')),
	CONSTRAINT "chk_payout_wallet" CHECK ("payouts"."recipient_wallet" ~ '^0x[0-9a-f]{40}$')
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint NOT NULL,
	"type" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"auto_issued" boolean DEFAULT false NOT NULL,
	"file_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_receipts_type" CHECK ("receipts"."type" IN ('CONSIGNMENT','COLLECTION','WITHDRAWAL'))
);
--> statement-breakpoint
CREATE TABLE "status_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid NOT NULL,
	"round_no" smallint,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet" text NOT NULL,
	"user_type" text DEFAULT 'PUBLIC' NOT NULL,
	"email" text,
	"preferred_language" text DEFAULT 'EN' NOT NULL,
	"telegram_chat_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_unique" UNIQUE("wallet"),
	CONSTRAINT "users_telegram_chat_id_unique" UNIQUE("telegram_chat_id"),
	CONSTRAINT "chk_users_wallet" CHECK ("users"."wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_users_user_type" CHECK ("users"."user_type" IN ('PUBLIC','NOTARY','GUARANTOR','PLATFORM')),
	CONSTRAINT "chk_users_pref_lang" CHECK ("users"."preferred_language" IN ('EN','ID'))
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auction_id" uuid,
	"round_no" smallint,
	"wallet" text NOT NULL,
	"kind" text NOT NULL,
	"gross_amount" bigint NOT NULL,
	"withdraw_fee" bigint NOT NULL,
	"net_amount" bigint NOT NULL,
	"relayed" boolean NOT NULL,
	"tx_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_wd_kind" CHECK ("withdrawals"."kind" IN ('REFUND','CONSIGNOR_PAYOUT','FEE_BALANCE')),
	CONSTRAINT "chk_wd_wallet" CHECK ("withdrawals"."wallet" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chk_wd_fee_le_gross" CHECK ("withdrawals"."withdraw_fee" <= "withdrawals"."gross_amount"),
	CONSTRAINT "chk_wd_net_eq" CHECK ("withdrawals"."net_amount" = "withdrawals"."gross_amount" - "withdrawals"."withdraw_fee")
);
--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_assets" ADD CONSTRAINT "auction_assets_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_files" ADD CONSTRAINT "auction_files_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_rounds" ADD CONSTRAINT "auction_rounds_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_consignor_id_users_id_fk" FOREIGN KEY ("consignor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_guarantor_id_partners_id_fk" FOREIGN KEY ("guarantor_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_notary_id_partners_id_fk" FOREIGN KEY ("notary_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_fee_config_id_fee_config_id_fk" FOREIGN KEY ("fee_config_id") REFERENCES "public"."fee_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awarding_attempts" ADD CONSTRAINT "awarding_attempts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awarding_attempts" ADD CONSTRAINT "awarding_attempts_attestation_id_attestations_id_fk" FOREIGN KEY ("attestation_id") REFERENCES "public"."attestations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidder_stakes" ADD CONSTRAINT "bidder_stakes_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_codes" ADD CONSTRAINT "confirmation_codes_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confirmation_codes" ADD CONSTRAINT "confirmation_codes_issued_by_notary_partners_id_fk" FOREIGN KEY ("issued_by_notary") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partners" ADD CONSTRAINT "partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_log" ADD CONSTRAINT "status_log_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_log" ADD CONSTRAINT "status_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_auction_photo_slot" ON "auction_files" USING btree ("auction_id","position") WHERE kind = 'PHOTO';--> statement-breakpoint
CREATE INDEX "idx_auctions_status" ON "auctions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_auctions_consignor" ON "auctions" USING btree ("consignor_id");--> statement-breakpoint
CREATE INDEX "idx_auctions_guarantor" ON "auctions" USING btree ("guarantor_id");--> statement-breakpoint
CREATE INDEX "idx_auctions_cat_status" ON "auctions" USING btree ("category","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bids_tx_log" ON "bids" USING btree ("tx_hash","log_index");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chain_events_tx_log" ON "chain_events" USING btree ("chain_id","tx_hash","log_index");

==========
/packages/db/drizzle/meta/0000_snapshot.json
==========
{
  "id": "0bb4856b-9435-402b-a941-72f0af740cc2",
  "prevId": "00000000-0000-0000-0000-000000000000",
  "version": "7",
  "dialect": "postgresql",
  "tables": {
    "public.attestations": {
      "name": "attestations",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true,
          "default": "gen_random_uuid()"
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": false
        },
        "type": {
          "name": "type",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "signer_wallet": {
          "name": "signer_wallet",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "payload": {
          "name": "payload",
          "type": "jsonb",
          "primaryKey": false,
          "notNull": true
        },
        "signature": {
          "name": "signature",
          "type": "bytea",
          "primaryKey": false,
          "notNull": true
        },
        "submitted_tx_hash": {
          "name": "submitted_tx_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "attestations_auction_id_auctions_id_fk": {
          "name": "attestations_auction_id_auctions_id_fk",
          "tableFrom": "attestations",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_att_type": {
          "name": "chk_att_type",
          "value": "\"attestations\".\"type\" IN ('GUARANTOR_APPROVED','GUARANTOR_REJECTED','NOTARY_APPROVED','BIDDER_AWARD_SIGN','GUARANTOR_COLLECTED','GUARANTOR_WITHDRAWN','CONSIGNOR_CONFIRM','WITHDRAW_REQUEST')"
        },
        "chk_att_signer_wallet": {
          "name": "chk_att_signer_wallet",
          "value": "\"attestations\".\"signer_wallet\" ~ '^0x[0-9a-f]{40}$'"
        }
      },
      "isRLSEnabled": false
    },
    "public.auction_assets": {
      "name": "auction_assets",
      "schema": "",
      "columns": {
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true
        },
        "title": {
          "name": "title",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "description": {
          "name": "description",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "condition": {
          "name": "condition",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "condition_notes": {
          "name": "condition_notes",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "document_type": {
          "name": "document_type",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "document_number": {
          "name": "document_number",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "chassis_number": {
          "name": "chassis_number",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "serial_number": {
          "name": "serial_number",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "spec": {
          "name": "spec",
          "type": "jsonb",
          "primaryKey": false,
          "notNull": true
        },
        "spec_hash": {
          "name": "spec_hash",
          "type": "bytea",
          "primaryKey": false,
          "notNull": true
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "auction_assets_auction_id_auctions_id_fk": {
          "name": "auction_assets_auction_id_auctions_id_fk",
          "tableFrom": "auction_assets",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_assets_condition": {
          "name": "chk_assets_condition",
          "value": "\"auction_assets\".\"condition\" IN ('NEW','LIKE_NEW','GOOD','FAIR','DAMAGED')"
        },
        "chk_assets_doc_type": {
          "name": "chk_assets_doc_type",
          "value": "\"auction_assets\".\"document_type\" IN ('CERTIFICATE','INVOICE')"
        },
        "chk_assets_damaged_notes": {
          "name": "chk_assets_damaged_notes",
          "value": "\"auction_assets\".\"condition\" <> 'DAMAGED' OR \"auction_assets\".\"condition_notes\" IS NOT NULL"
        },
        "chk_assets_docnum_nul": {
          "name": "chk_assets_docnum_nul",
          "value": "\"auction_assets\".\"document_number\" <> 'NUL' OR \"auction_assets\".\"document_type\" = 'INVOICE'"
        },
        "chk_assets_chassis_not_nul": {
          "name": "chk_assets_chassis_not_nul",
          "value": "\"auction_assets\".\"chassis_number\" IS NULL OR \"auction_assets\".\"chassis_number\" <> 'NUL'"
        }
      },
      "isRLSEnabled": false
    },
    "public.auction_files": {
      "name": "auction_files",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true,
          "default": "gen_random_uuid()"
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "kind": {
          "name": "kind",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "position": {
          "name": "position",
          "type": "smallint",
          "primaryKey": false,
          "notNull": false
        },
        "filename": {
          "name": "filename",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "extension": {
          "name": "extension",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "mime": {
          "name": "mime",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "width": {
          "name": "width",
          "type": "integer",
          "primaryKey": false,
          "notNull": false
        },
        "height": {
          "name": "height",
          "type": "integer",
          "primaryKey": false,
          "notNull": false
        },
        "size_bytes": {
          "name": "size_bytes",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "content_hash": {
          "name": "content_hash",
          "type": "bytea",
          "primaryKey": false,
          "notNull": true
        },
        "storage_url": {
          "name": "storage_url",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {
        "uq_auction_photo_slot": {
          "name": "uq_auction_photo_slot",
          "columns": [
            {
              "expression": "auction_id",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            },
            {
              "expression": "position",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": true,
          "where": "kind = 'PHOTO'",
          "concurrently": false,
          "method": "btree",
          "with": {}
        }
      },
      "foreignKeys": {
        "auction_files_auction_id_auctions_id_fk": {
          "name": "auction_files_auction_id_auctions_id_fk",
          "tableFrom": "auction_files",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_files_kind": {
          "name": "chk_files_kind",
          "value": "\"auction_files\".\"kind\" IN ('PHOTO','DOCUMENT_SCAN')"
        },
        "chk_files_photo_position": {
          "name": "chk_files_photo_position",
          "value": "\"auction_files\".\"kind\" <> 'PHOTO' OR \"auction_files\".\"position\" BETWEEN 1 AND 5"
        }
      },
      "isRLSEnabled": false
    },
    "public.auction_rounds": {
      "name": "auction_rounds",
      "schema": "",
      "columns": {
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "starting_bid": {
          "name": "starting_bid",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "bid_increment": {
          "name": "bid_increment",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "scheduled_at": {
          "name": "scheduled_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "open_at": {
          "name": "open_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "duration_hours": {
          "name": "duration_hours",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "close_at": {
          "name": "close_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "outcome": {
          "name": "outcome",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "auction_rounds_auction_id_auctions_id_fk": {
          "name": "auction_rounds_auction_id_auctions_id_fk",
          "tableFrom": "auction_rounds",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {
        "pk_auction_rounds": {
          "name": "pk_auction_rounds",
          "columns": [
            "auction_id",
            "round_no"
          ]
        }
      },
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_rounds_starting_bid": {
          "name": "chk_rounds_starting_bid",
          "value": "\"auction_rounds\".\"starting_bid\" > 0"
        },
        "chk_rounds_bid_increment": {
          "name": "chk_rounds_bid_increment",
          "value": "\"auction_rounds\".\"bid_increment\" IN (50000, 500000, 5000000, 50000000, 500000000, 5000000000)"
        },
        "chk_rounds_increment_ratio": {
          "name": "chk_rounds_increment_ratio",
          "value": "\"auction_rounds\".\"bid_increment\" * 20 <= \"auction_rounds\".\"starting_bid\""
        },
        "chk_rounds_duration": {
          "name": "chk_rounds_duration",
          "value": "\"auction_rounds\".\"duration_hours\" BETWEEN 12 AND 48"
        },
        "chk_rounds_outcome": {
          "name": "chk_rounds_outcome",
          "value": "\"auction_rounds\".\"outcome\" IS NULL OR \"auction_rounds\".\"outcome\" IN ('AWARDED','PASSED_IN')"
        }
      },
      "isRLSEnabled": false
    },
    "public.auctions": {
      "name": "auctions",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true,
          "default": "gen_random_uuid()"
        },
        "auction_code": {
          "name": "auction_code",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "consignor_id": {
          "name": "consignor_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "guarantor_id": {
          "name": "guarantor_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "notary_id": {
          "name": "notary_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "category": {
          "name": "category",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "currency": {
          "name": "currency",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "default": "'USDC'"
        },
        "token_decimals": {
          "name": "token_decimals",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true,
          "default": 6
        },
        "status": {
          "name": "status",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "current_round": {
          "name": "current_round",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true,
          "default": 1
        },
        "pending_at": {
          "name": "pending_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "pending_deadline": {
          "name": "pending_deadline",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "fee_config_id": {
          "name": "fee_config_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": false
        },
        "onchain_tx_hash": {
          "name": "onchain_tx_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "onchain_registered_at": {
          "name": "onchain_registered_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        },
        "updated_at": {
          "name": "updated_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {
        "idx_auctions_status": {
          "name": "idx_auctions_status",
          "columns": [
            {
              "expression": "status",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": false,
          "concurrently": false,
          "method": "btree",
          "with": {}
        },
        "idx_auctions_consignor": {
          "name": "idx_auctions_consignor",
          "columns": [
            {
              "expression": "consignor_id",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": false,
          "concurrently": false,
          "method": "btree",
          "with": {}
        },
        "idx_auctions_guarantor": {
          "name": "idx_auctions_guarantor",
          "columns": [
            {
              "expression": "guarantor_id",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": false,
          "concurrently": false,
          "method": "btree",
          "with": {}
        },
        "idx_auctions_cat_status": {
          "name": "idx_auctions_cat_status",
          "columns": [
            {
              "expression": "category",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            },
            {
              "expression": "status",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": false,
          "concurrently": false,
          "method": "btree",
          "with": {}
        }
      },
      "foreignKeys": {
        "auctions_consignor_id_users_id_fk": {
          "name": "auctions_consignor_id_users_id_fk",
          "tableFrom": "auctions",
          "tableTo": "users",
          "columnsFrom": [
            "consignor_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        },
        "auctions_guarantor_id_partners_id_fk": {
          "name": "auctions_guarantor_id_partners_id_fk",
          "tableFrom": "auctions",
          "tableTo": "partners",
          "columnsFrom": [
            "guarantor_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        },
        "auctions_notary_id_partners_id_fk": {
          "name": "auctions_notary_id_partners_id_fk",
          "tableFrom": "auctions",
          "tableTo": "partners",
          "columnsFrom": [
            "notary_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        },
        "auctions_fee_config_id_fee_config_id_fk": {
          "name": "auctions_fee_config_id_fee_config_id_fk",
          "tableFrom": "auctions",
          "tableTo": "fee_config",
          "columnsFrom": [
            "fee_config_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {
        "auctions_auction_code_unique": {
          "name": "auctions_auction_code_unique",
          "nullsNotDistinct": false,
          "columns": [
            "auction_code"
          ]
        }
      },
      "policies": {},
      "checkConstraints": {
        "chk_auctions_category": {
          "name": "chk_auctions_category",
          "value": "\"auctions\".\"category\" IN ('OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')"
        },
        "chk_auctions_currency": {
          "name": "chk_auctions_currency",
          "value": "\"auctions\".\"currency\" IN ('USDC')"
        },
        "chk_auctions_status": {
          "name": "chk_auctions_status",
          "value": "\"auctions\".\"status\" IN ('CREATED','PENDING','REJECTED','CANCELED','SCHEDULED','OPEN','CLOSED','AWARDING','COLLECTION','CLAIM_PERIOD','SETTLED','PASSED_IN','WITHDRAWN')"
        },
        "chk_auctions_current_round": {
          "name": "chk_auctions_current_round",
          "value": "\"auctions\".\"current_round\" >= 1"
        }
      },
      "isRLSEnabled": false
    },
    "public.awarding_attempts": {
      "name": "awarding_attempts",
      "schema": "",
      "columns": {
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "rank": {
          "name": "rank",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "bidder_wallet": {
          "name": "bidder_wallet",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "request_sent_at": {
          "name": "request_sent_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "deadline_at": {
          "name": "deadline_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "result": {
          "name": "result",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "signed_at": {
          "name": "signed_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "default_fee": {
          "name": "default_fee",
          "type": "bigint",
          "primaryKey": false,
          "notNull": false
        },
        "attestation_id": {
          "name": "attestation_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "awarding_attempts_auction_id_auctions_id_fk": {
          "name": "awarding_attempts_auction_id_auctions_id_fk",
          "tableFrom": "awarding_attempts",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        },
        "awarding_attempts_attestation_id_attestations_id_fk": {
          "name": "awarding_attempts_attestation_id_attestations_id_fk",
          "tableFrom": "awarding_attempts",
          "tableTo": "attestations",
          "columnsFrom": [
            "attestation_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {
        "pk_awarding_attempts": {
          "name": "pk_awarding_attempts",
          "columns": [
            "auction_id",
            "round_no",
            "rank"
          ]
        }
      },
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_awd_rank": {
          "name": "chk_awd_rank",
          "value": "\"awarding_attempts\".\"rank\" BETWEEN 1 AND 10"
        },
        "chk_awd_result": {
          "name": "chk_awd_result",
          "value": "\"awarding_attempts\".\"result\" IN ('PENDING','SIGNED','DEFAULTED')"
        }
      },
      "isRLSEnabled": false
    },
    "public.bidder_stakes": {
      "name": "bidder_stakes",
      "schema": "",
      "columns": {
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "bidder_wallet": {
          "name": "bidder_wallet",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "my_bid": {
          "name": "my_bid",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "reached_seq": {
          "name": "reached_seq",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "rank": {
          "name": "rank",
          "type": "smallint",
          "primaryKey": false,
          "notNull": false
        },
        "status": {
          "name": "status",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "refund_claimed_tx": {
          "name": "refund_claimed_tx",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        },
        "updated_at": {
          "name": "updated_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "bidder_stakes_auction_id_auctions_id_fk": {
          "name": "bidder_stakes_auction_id_auctions_id_fk",
          "tableFrom": "bidder_stakes",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {
        "pk_bidder_stakes": {
          "name": "pk_bidder_stakes",
          "columns": [
            "auction_id",
            "round_no",
            "bidder_wallet"
          ]
        }
      },
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_stakes_rank": {
          "name": "chk_stakes_rank",
          "value": "\"bidder_stakes\".\"rank\" IS NULL OR \"bidder_stakes\".\"rank\" BETWEEN 1 AND 10"
        },
        "chk_stakes_status": {
          "name": "chk_stakes_status",
          "value": "\"bidder_stakes\".\"status\" IN ('ACTIVE','PROVISIONAL','DEFAULTED','WINNER','REFUNDABLE','REFUNDED')"
        },
        "chk_stakes_bidder_wallet": {
          "name": "chk_stakes_bidder_wallet",
          "value": "\"bidder_stakes\".\"bidder_wallet\" ~ '^0x[0-9a-f]{40}$'"
        }
      },
      "isRLSEnabled": false
    },
    "public.bids": {
      "name": "bids",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "bigserial",
          "primaryKey": true,
          "notNull": true
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "phase": {
          "name": "phase",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "bidder_wallet": {
          "name": "bidder_wallet",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "amount_added": {
          "name": "amount_added",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "my_bid_after": {
          "name": "my_bid_after",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "current_bid_after": {
          "name": "current_bid_after",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "seq": {
          "name": "seq",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "block_number": {
          "name": "block_number",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "tx_index": {
          "name": "tx_index",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "log_index": {
          "name": "log_index",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "block_ts": {
          "name": "block_ts",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "tx_hash": {
          "name": "tx_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "client_ms": {
          "name": "client_ms",
          "type": "bigint",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {
        "idx_bids_tx_log": {
          "name": "idx_bids_tx_log",
          "columns": [
            {
              "expression": "tx_hash",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            },
            {
              "expression": "log_index",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": true,
          "concurrently": false,
          "method": "btree",
          "with": {}
        }
      },
      "foreignKeys": {
        "bids_auction_id_auctions_id_fk": {
          "name": "bids_auction_id_auctions_id_fk",
          "tableFrom": "bids",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_bids_phase": {
          "name": "chk_bids_phase",
          "value": "\"bids\".\"phase\" IN ('PRE_BID','LIVE_BID')"
        },
        "chk_bids_bidder_wallet": {
          "name": "chk_bids_bidder_wallet",
          "value": "\"bids\".\"bidder_wallet\" ~ '^0x[0-9a-f]{40}$'"
        }
      },
      "isRLSEnabled": false
    },
    "public.chain_events": {
      "name": "chain_events",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "bigserial",
          "primaryKey": true,
          "notNull": true
        },
        "chain_id": {
          "name": "chain_id",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "block_number": {
          "name": "block_number",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "block_ts": {
          "name": "block_ts",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "tx_hash": {
          "name": "tx_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "log_index": {
          "name": "log_index",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "event_name": {
          "name": "event_name",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "args": {
          "name": "args",
          "type": "jsonb",
          "primaryKey": false,
          "notNull": true
        },
        "processed": {
          "name": "processed",
          "type": "boolean",
          "primaryKey": false,
          "notNull": true,
          "default": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {
        "idx_chain_events_tx_log": {
          "name": "idx_chain_events_tx_log",
          "columns": [
            {
              "expression": "chain_id",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            },
            {
              "expression": "tx_hash",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            },
            {
              "expression": "log_index",
              "isExpression": false,
              "asc": true,
              "nulls": "last"
            }
          ],
          "isUnique": true,
          "concurrently": false,
          "method": "btree",
          "with": {}
        }
      },
      "foreignKeys": {},
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {},
      "isRLSEnabled": false
    },
    "public.confirmation_codes": {
      "name": "confirmation_codes",
      "schema": "",
      "columns": {
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true
        },
        "code_hash": {
          "name": "code_hash",
          "type": "bytea",
          "primaryKey": false,
          "notNull": true
        },
        "issued_by_notary": {
          "name": "issued_by_notary",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "signature": {
          "name": "signature",
          "type": "bytea",
          "primaryKey": false,
          "notNull": true
        },
        "emailed_at": {
          "name": "emailed_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "used_at": {
          "name": "used_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "confirmation_codes_auction_id_auctions_id_fk": {
          "name": "confirmation_codes_auction_id_auctions_id_fk",
          "tableFrom": "confirmation_codes",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        },
        "confirmation_codes_issued_by_notary_partners_id_fk": {
          "name": "confirmation_codes_issued_by_notary_partners_id_fk",
          "tableFrom": "confirmation_codes",
          "tableTo": "partners",
          "columnsFrom": [
            "issued_by_notary"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {},
      "isRLSEnabled": false
    },
    "public.fee_config": {
      "name": "fee_config",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true,
          "default": "gen_random_uuid()"
        },
        "platform_bps": {
          "name": "platform_bps",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "guarantor_bps": {
          "name": "guarantor_bps",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "notary_bps": {
          "name": "notary_bps",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "tax_bps": {
          "name": "tax_bps",
          "type": "integer",
          "primaryKey": false,
          "notNull": true
        },
        "withdraw_fee": {
          "name": "withdraw_fee",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "effective_from": {
          "name": "effective_from",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {},
      "isRLSEnabled": false
    },
    "public.feed_posts": {
      "name": "feed_posts",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "bigserial",
          "primaryKey": true,
          "notNull": true
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "kind": {
          "name": "kind",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "channel": {
          "name": "channel",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "external_id": {
          "name": "external_id",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "posted_at": {
          "name": "posted_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        }
      },
      "indexes": {},
      "foreignKeys": {
        "feed_posts_auction_id_auctions_id_fk": {
          "name": "feed_posts_auction_id_auctions_id_fk",
          "tableFrom": "feed_posts",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_feed_kind": {
          "name": "chk_feed_kind",
          "value": "\"feed_posts\".\"kind\" IN ('UPCOMING','OPEN','CLOSED')"
        },
        "chk_feed_channel": {
          "name": "chk_feed_channel",
          "value": "\"feed_posts\".\"channel\" IN ('APP','X','TELEGRAM')"
        }
      },
      "isRLSEnabled": false
    },
    "public.kyc_profiles": {
      "name": "kyc_profiles",
      "schema": "",
      "columns": {
        "user_id": {
          "name": "user_id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true
        },
        "full_name": {
          "name": "full_name",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "nik": {
          "name": "nik",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "address": {
          "name": "address",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "face_verified": {
          "name": "face_verified",
          "type": "boolean",
          "primaryKey": false,
          "notNull": true,
          "default": false
        },
        "id_extracted_by_ai": {
          "name": "id_extracted_by_ai",
          "type": "boolean",
          "primaryKey": false,
          "notNull": true
        },
        "status": {
          "name": "status",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "verified_at": {
          "name": "verified_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        },
        "updated_at": {
          "name": "updated_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "kyc_profiles_user_id_users_id_fk": {
          "name": "kyc_profiles_user_id_users_id_fk",
          "tableFrom": "kyc_profiles",
          "tableTo": "users",
          "columnsFrom": [
            "user_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_kyc_nik": {
          "name": "chk_kyc_nik",
          "value": "\"kyc_profiles\".\"nik\" ~ '^[0-9]{16}$'"
        },
        "chk_kyc_status": {
          "name": "chk_kyc_status",
          "value": "\"kyc_profiles\".\"status\" IN ('PENDING','VERIFIED','FAILED')"
        }
      },
      "isRLSEnabled": false
    },
    "public.notifications": {
      "name": "notifications",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "bigserial",
          "primaryKey": true,
          "notNull": true
        },
        "user_id": {
          "name": "user_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": false
        },
        "channel": {
          "name": "channel",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "type": {
          "name": "type",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "payload": {
          "name": "payload",
          "type": "jsonb",
          "primaryKey": false,
          "notNull": true
        },
        "status": {
          "name": "status",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "sent_at": {
          "name": "sent_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "notifications_user_id_users_id_fk": {
          "name": "notifications_user_id_users_id_fk",
          "tableFrom": "notifications",
          "tableTo": "users",
          "columnsFrom": [
            "user_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        },
        "notifications_auction_id_auctions_id_fk": {
          "name": "notifications_auction_id_auctions_id_fk",
          "tableFrom": "notifications",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_notif_channel": {
          "name": "chk_notif_channel",
          "value": "\"notifications\".\"channel\" IN ('TELEGRAM','EMAIL','WEB')"
        },
        "chk_notif_status": {
          "name": "chk_notif_status",
          "value": "\"notifications\".\"status\" IN ('QUEUED','SENT','FAILED')"
        }
      },
      "isRLSEnabled": false
    },
    "public.partners": {
      "name": "partners",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true,
          "default": "gen_random_uuid()"
        },
        "user_id": {
          "name": "user_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "type": {
          "name": "type",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "name": {
          "name": "name",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "category": {
          "name": "category",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "city": {
          "name": "city",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "active": {
          "name": "active",
          "type": "boolean",
          "primaryKey": false,
          "notNull": true,
          "default": true
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "partners_user_id_users_id_fk": {
          "name": "partners_user_id_users_id_fk",
          "tableFrom": "partners",
          "tableTo": "users",
          "columnsFrom": [
            "user_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {
        "partners_user_id_unique": {
          "name": "partners_user_id_unique",
          "nullsNotDistinct": false,
          "columns": [
            "user_id"
          ]
        }
      },
      "policies": {},
      "checkConstraints": {
        "chk_partners_type": {
          "name": "chk_partners_type",
          "value": "\"partners\".\"type\" IN ('NOTARY','GUARANTOR')"
        },
        "chk_partners_category_val": {
          "name": "chk_partners_category_val",
          "value": "\"partners\".\"category\" IS NULL OR \"partners\".\"category\" IN ('ALL','OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')"
        },
        "chk_partners_role_shape": {
          "name": "chk_partners_role_shape",
          "value": "\n    (\"partners\".\"type\" = 'GUARANTOR' AND \"partners\".\"category\" IS NOT NULL AND \"partners\".\"city\" IS NOT NULL)\n    OR (\"partners\".\"type\" = 'NOTARY' AND \"partners\".\"category\" IS NULL)\n  "
        }
      },
      "isRLSEnabled": false
    },
    "public.payouts": {
      "name": "payouts",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "bigserial",
          "primaryKey": true,
          "notNull": true
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "kind": {
          "name": "kind",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "recipient_role": {
          "name": "recipient_role",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "recipient_wallet": {
          "name": "recipient_wallet",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "amount": {
          "name": "amount",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "tx_hash": {
          "name": "tx_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "payouts_auction_id_auctions_id_fk": {
          "name": "payouts_auction_id_auctions_id_fk",
          "tableFrom": "payouts",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_payout_kind": {
          "name": "chk_payout_kind",
          "value": "\"payouts\".\"kind\" IN ('SETTLED','DEFAULT_FEE')"
        },
        "chk_payout_role": {
          "name": "chk_payout_role",
          "value": "\"payouts\".\"recipient_role\" IN ('PLATFORM','GUARANTOR','NOTARY','TAX','CONSIGNOR')"
        },
        "chk_payout_wallet": {
          "name": "chk_payout_wallet",
          "value": "\"payouts\".\"recipient_wallet\" ~ '^0x[0-9a-f]{40}$'"
        }
      },
      "isRLSEnabled": false
    },
    "public.receipts": {
      "name": "receipts",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true,
          "default": "gen_random_uuid()"
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": true
        },
        "type": {
          "name": "type",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "issued_at": {
          "name": "issued_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true
        },
        "auto_issued": {
          "name": "auto_issued",
          "type": "boolean",
          "primaryKey": false,
          "notNull": true,
          "default": false
        },
        "file_url": {
          "name": "file_url",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "receipts_auction_id_auctions_id_fk": {
          "name": "receipts_auction_id_auctions_id_fk",
          "tableFrom": "receipts",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_receipts_type": {
          "name": "chk_receipts_type",
          "value": "\"receipts\".\"type\" IN ('CONSIGNMENT','COLLECTION','WITHDRAWAL')"
        }
      },
      "isRLSEnabled": false
    },
    "public.status_log": {
      "name": "status_log",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "bigserial",
          "primaryKey": true,
          "notNull": true
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": true
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": false
        },
        "from_status": {
          "name": "from_status",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "to_status": {
          "name": "to_status",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "actor_user_id": {
          "name": "actor_user_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": false
        },
        "reason": {
          "name": "reason",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "tx_hash": {
          "name": "tx_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "status_log_auction_id_auctions_id_fk": {
          "name": "status_log_auction_id_auctions_id_fk",
          "tableFrom": "status_log",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        },
        "status_log_actor_user_id_users_id_fk": {
          "name": "status_log_actor_user_id_users_id_fk",
          "tableFrom": "status_log",
          "tableTo": "users",
          "columnsFrom": [
            "actor_user_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {},
      "isRLSEnabled": false
    },
    "public.users": {
      "name": "users",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "uuid",
          "primaryKey": true,
          "notNull": true,
          "default": "gen_random_uuid()"
        },
        "wallet": {
          "name": "wallet",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "user_type": {
          "name": "user_type",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "default": "'PUBLIC'"
        },
        "email": {
          "name": "email",
          "type": "text",
          "primaryKey": false,
          "notNull": false
        },
        "preferred_language": {
          "name": "preferred_language",
          "type": "text",
          "primaryKey": false,
          "notNull": true,
          "default": "'EN'"
        },
        "telegram_chat_id": {
          "name": "telegram_chat_id",
          "type": "bigint",
          "primaryKey": false,
          "notNull": false
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        },
        "updated_at": {
          "name": "updated_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {},
      "compositePrimaryKeys": {},
      "uniqueConstraints": {
        "users_wallet_unique": {
          "name": "users_wallet_unique",
          "nullsNotDistinct": false,
          "columns": [
            "wallet"
          ]
        },
        "users_telegram_chat_id_unique": {
          "name": "users_telegram_chat_id_unique",
          "nullsNotDistinct": false,
          "columns": [
            "telegram_chat_id"
          ]
        }
      },
      "policies": {},
      "checkConstraints": {
        "chk_users_wallet": {
          "name": "chk_users_wallet",
          "value": "\"users\".\"wallet\" ~ '^0x[0-9a-f]{40}$'"
        },
        "chk_users_user_type": {
          "name": "chk_users_user_type",
          "value": "\"users\".\"user_type\" IN ('PUBLIC','NOTARY','GUARANTOR','PLATFORM')"
        },
        "chk_users_pref_lang": {
          "name": "chk_users_pref_lang",
          "value": "\"users\".\"preferred_language\" IN ('EN','ID')"
        }
      },
      "isRLSEnabled": false
    },
    "public.withdrawals": {
      "name": "withdrawals",
      "schema": "",
      "columns": {
        "id": {
          "name": "id",
          "type": "bigserial",
          "primaryKey": true,
          "notNull": true
        },
        "auction_id": {
          "name": "auction_id",
          "type": "uuid",
          "primaryKey": false,
          "notNull": false
        },
        "round_no": {
          "name": "round_no",
          "type": "smallint",
          "primaryKey": false,
          "notNull": false
        },
        "wallet": {
          "name": "wallet",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "kind": {
          "name": "kind",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "gross_amount": {
          "name": "gross_amount",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "withdraw_fee": {
          "name": "withdraw_fee",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "net_amount": {
          "name": "net_amount",
          "type": "bigint",
          "primaryKey": false,
          "notNull": true
        },
        "relayed": {
          "name": "relayed",
          "type": "boolean",
          "primaryKey": false,
          "notNull": true
        },
        "tx_hash": {
          "name": "tx_hash",
          "type": "text",
          "primaryKey": false,
          "notNull": true
        },
        "created_at": {
          "name": "created_at",
          "type": "timestamp with time zone",
          "primaryKey": false,
          "notNull": true,
          "default": "now()"
        }
      },
      "indexes": {},
      "foreignKeys": {
        "withdrawals_auction_id_auctions_id_fk": {
          "name": "withdrawals_auction_id_auctions_id_fk",
          "tableFrom": "withdrawals",
          "tableTo": "auctions",
          "columnsFrom": [
            "auction_id"
          ],
          "columnsTo": [
            "id"
          ],
          "onDelete": "no action",
          "onUpdate": "no action"
        }
      },
      "compositePrimaryKeys": {},
      "uniqueConstraints": {},
      "policies": {},
      "checkConstraints": {
        "chk_wd_kind": {
          "name": "chk_wd_kind",
          "value": "\"withdrawals\".\"kind\" IN ('REFUND','CONSIGNOR_PAYOUT','FEE_BALANCE')"
        },
        "chk_wd_wallet": {
          "name": "chk_wd_wallet",
          "value": "\"withdrawals\".\"wallet\" ~ '^0x[0-9a-f]{40}$'"
        },
        "chk_wd_fee_le_gross": {
          "name": "chk_wd_fee_le_gross",
          "value": "\"withdrawals\".\"withdraw_fee\" <= \"withdrawals\".\"gross_amount\""
        },
        "chk_wd_net_eq": {
          "name": "chk_wd_net_eq",
          "value": "\"withdrawals\".\"net_amount\" = \"withdrawals\".\"gross_amount\" - \"withdrawals\".\"withdraw_fee\""
        }
      },
      "isRLSEnabled": false
    }
  },
  "enums": {},
  "schemas": {},
  "sequences": {},
  "roles": {},
  "policies": {},
  "views": {},
  "_meta": {
    "columns": {},
    "schemas": {},
    "tables": {}
  }
}

==========
/packages/db/drizzle/meta/_journal.json
==========
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1793623752384,
      "tag": "0000_curly_bill_hollister",
      "breakpoints": true
    }
  ]
}

==========
/packages/db/src/index.ts
==========
// @file packages/db/src/index.ts — Drizzle client initialization for Neon
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

==========
/packages/db/src/schema.ts
==========
// @file packages/db/src/schema.ts — Drizzle database schema for Paralel
// ref: PARALEL.md Lampiran D1–D7, §D0, §5.1, §6, §7; CONTRACT_SPEC.md §1
import {
  pgTable, uuid, text, timestamp, boolean, bigint, smallint, jsonb,
  customType, integer, bigserial, index, uniqueIndex, primaryKey, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() { return 'bytea'; },
});

// ─── D1. PENGGUNA & MITRA ──────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  wallet: text('wallet').notNull().unique(),
  userType: text('user_type').notNull().default('PUBLIC'),
  email: text('email'),
  preferredLanguage: text('preferred_language').notNull().default('EN'),
  telegramChatId: bigint('telegram_chat_id', { mode: 'bigint' }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_users_wallet', sql`${t.wallet} ~ '^0x[0-9a-f]{40}$'`),
  check('chk_users_user_type', sql`${t.userType} IN ('PUBLIC','NOTARY','GUARANTOR','PLATFORM')`),
  check('chk_users_pref_lang', sql`${t.preferredLanguage} IN ('EN','ID')`),
]);

export const kycProfiles = pgTable('kyc_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  fullName: text('full_name').notNull(),
  nik: text('nik').notNull(),
  address: text('address').notNull(),
  faceVerified: boolean('face_verified').notNull().default(false),
  idExtractedByAi: boolean('id_extracted_by_ai').notNull(),
  status: text('status').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_kyc_nik', sql`${t.nik} ~ '^[0-9]{16}$'`),
  check('chk_kyc_status', sql`${t.status} IN ('PENDING','VERIFIED','FAILED')`),
]);

export const partners = pgTable('partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  city: text('city'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_partners_type', sql`${t.type} IN ('NOTARY','GUARANTOR')`),
  check('chk_partners_category_val', sql`${t.category} IS NULL OR ${t.category} IN ('ALL','OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')`),
  check('chk_partners_role_shape', sql`
    (${t.type} = 'GUARANTOR' AND ${t.category} IS NOT NULL AND ${t.city} IS NOT NULL)
    OR (${t.type} = 'NOTARY' AND ${t.category} IS NULL)
  `),
]);

// ─── D5. FEE CONFIG (harus sebelum auctions karena FK) ─────

export const feeConfig = pgTable('fee_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  platformBps: integer('platform_bps').notNull(),
  guarantorBps: integer('guarantor_bps').notNull(),
  notaryBps: integer('notary_bps').notNull(),
  taxBps: integer('tax_bps').notNull(),
  withdrawFee: bigint('withdraw_fee', { mode: 'bigint' }).notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── D2. LELANG ─────────────────────────────────────────────

export const auctions = pgTable('auctions', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionCode: text('auction_code').notNull().unique(),
  consignorId: uuid('consignor_id').notNull().references(() => users.id),
  guarantorId: uuid('guarantor_id').notNull().references(() => partners.id),
  notaryId: uuid('notary_id').notNull().references(() => partners.id),
  category: text('category').notNull(),
  currency: text('currency').notNull().default('USDC'),
  tokenDecimals: smallint('token_decimals').notNull().default(6),
  status: text('status').notNull(),
  currentRound: smallint('current_round').notNull().default(1),
  pendingAt: timestamp('pending_at', { withTimezone: true }),
  pendingDeadline: timestamp('pending_deadline', { withTimezone: true }),
  feeConfigId: uuid('fee_config_id').references(() => feeConfig.id),
  onchainTxHash: text('onchain_tx_hash'),
  onchainRegisteredAt: timestamp('onchain_registered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_auctions_status').on(t.status),
  index('idx_auctions_consignor').on(t.consignorId),
  index('idx_auctions_guarantor').on(t.guarantorId),
  index('idx_auctions_cat_status').on(t.category, t.status),
  check('chk_auctions_category', sql`${t.category} IN ('OTOMOTIF','PROPERTI','ELEKTRONIK','AKSESORIS_HOBI','PERHIASAN')`),
  check('chk_auctions_currency', sql`${t.currency} IN ('USDC')`),
  check('chk_auctions_status', sql`${t.status} IN ('CREATED','PENDING','REJECTED','CANCELED','SCHEDULED','OPEN','CLOSED','AWARDING','COLLECTION','CLAIM_PERIOD','SETTLED','PASSED_IN','WITHDRAWN')`),
  check('chk_auctions_current_round', sql`${t.currentRound} >= 1`),
]);

export const auctionRounds = pgTable('auction_rounds', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  startingBid: bigint('starting_bid', { mode: 'bigint' }).notNull(),
  bidIncrement: bigint('bid_increment', { mode: 'bigint' }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  openAt: timestamp('open_at', { withTimezone: true }).notNull(),
  durationHours: smallint('duration_hours').notNull(),
  closeAt: timestamp('close_at', { withTimezone: true }).notNull(),
  outcome: text('outcome'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ name: 'pk_auction_rounds', columns: [t.auctionId, t.roundNo] }),
  check('chk_rounds_starting_bid', sql`${t.startingBid} > 0`),
  check('chk_rounds_bid_increment', sql`${t.bidIncrement} IN (50000, 500000, 5000000, 50000000, 500000000, 5000000000)`),
  check('chk_rounds_increment_ratio', sql`${t.bidIncrement} * 20 <= ${t.startingBid}`),
  check('chk_rounds_duration', sql`${t.durationHours} BETWEEN 12 AND 48`),
  check('chk_rounds_outcome', sql`${t.outcome} IS NULL OR ${t.outcome} IN ('AWARDED','PASSED_IN')`),
]);

export const auctionAssets = pgTable('auction_assets', {
  auctionId: uuid('auction_id').primaryKey().references(() => auctions.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  condition: text('condition').notNull(),
  conditionNotes: text('condition_notes'),
  documentType: text('document_type').notNull(),
  documentNumber: text('document_number').notNull(),
  chassisNumber: text('chassis_number'),
  serialNumber: text('serial_number'),
  spec: jsonb('spec').notNull(),
  specHash: bytea('spec_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_assets_condition', sql`${t.condition} IN ('NEW','LIKE_NEW','GOOD','FAIR','DAMAGED')`),
  check('chk_assets_doc_type', sql`${t.documentType} IN ('CERTIFICATE','INVOICE')`),
  check('chk_assets_damaged_notes', sql`${t.condition} <> 'DAMAGED' OR ${t.conditionNotes} IS NOT NULL`),
  check('chk_assets_docnum_nul', sql`${t.documentNumber} <> 'NUL' OR ${t.documentType} = 'INVOICE'`),
  check('chk_assets_chassis_not_nul', sql`${t.chassisNumber} IS NULL OR ${t.chassisNumber} <> 'NUL'`),
]);

export const auctionFiles = pgTable('auction_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  kind: text('kind').notNull(),
  position: smallint('position'),
  filename: text('filename').notNull(),
  extension: text('extension').notNull(),
  mime: text('mime').notNull(),
  width: integer('width'),
  height: integer('height'),
  sizeBytes: bigint('size_bytes', { mode: 'bigint' }).notNull(),
  contentHash: bytea('content_hash').notNull(),
  storageUrl: text('storage_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_files_kind', sql`${t.kind} IN ('PHOTO','DOCUMENT_SCAN')`),
  check('chk_files_photo_position', sql`${t.kind} <> 'PHOTO' OR ${t.position} BETWEEN 1 AND 5`),
  uniqueIndex('uq_auction_photo_slot').on(t.auctionId, t.position).where(sql`kind = 'PHOTO'`),
]);

// ─── D3. ALUR, KONFIRMASI & TANDA TANGAN ────────────────────

export const statusLog = pgTable('status_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no'),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  reason: text('reason'),
  txHash: text('tx_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const confirmationCodes = pgTable('confirmation_codes', {
  auctionId: uuid('auction_id').primaryKey().references(() => auctions.id),
  codeHash: bytea('code_hash').notNull(),
  issuedByNotary: uuid('issued_by_notary').notNull().references(() => partners.id),
  signature: bytea('signature').notNull(),
  emailedAt: timestamp('emailed_at', { withTimezone: true }),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const attestations = pgTable('attestations', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no'),
  type: text('type').notNull(),
  signerWallet: text('signer_wallet').notNull(),
  payload: jsonb('payload').notNull(),
  signature: bytea('signature').notNull(),
  submittedTxHash: text('submitted_tx_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_att_type', sql`${t.type} IN ('GUARANTOR_APPROVED','GUARANTOR_REJECTED','NOTARY_APPROVED','BIDDER_AWARD_SIGN','GUARANTOR_COLLECTED','GUARANTOR_WITHDRAWN','CONSIGNOR_CONFIRM','WITHDRAW_REQUEST')`),
  check('chk_att_signer_wallet', sql`${t.signerWallet} ~ '^0x[0-9a-f]{40}$'`),
]);

export const receipts = pgTable('receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  type: text('type').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  autoIssued: boolean('auto_issued').notNull().default(false),
  fileUrl: text('file_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_receipts_type', sql`${t.type} IN ('CONSIGNMENT','COLLECTION','WITHDRAWAL')`),
]);

// ─── D4. BID DAN AWARDING ───────────────────────────────────

export const bids = pgTable('bids', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  phase: text('phase').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  amountAdded: bigint('amount_added', { mode: 'bigint' }).notNull(),
  myBidAfter: bigint('my_bid_after', { mode: 'bigint' }).notNull(),
  currentBidAfter: bigint('current_bid_after', { mode: 'bigint' }).notNull(),
  seq: bigint('seq', { mode: 'bigint' }).notNull(),
  blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
  txIndex: integer('tx_index').notNull(),
  logIndex: integer('log_index').notNull(),
  blockTs: timestamp('block_ts', { withTimezone: true }).notNull(),
  txHash: text('tx_hash').notNull(),
  clientMs: bigint('client_ms', { mode: 'bigint' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('idx_bids_tx_log').on(t.txHash, t.logIndex),
  check('chk_bids_phase', sql`${t.phase} IN ('PRE_BID','LIVE_BID')`),
  check('chk_bids_bidder_wallet', sql`${t.bidderWallet} ~ '^0x[0-9a-f]{40}$'`),
]);

export const bidderStakes = pgTable('bidder_stakes', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  myBid: bigint('my_bid', { mode: 'bigint' }).notNull(),
  reachedSeq: bigint('reached_seq', { mode: 'bigint' }).notNull(),
  rank: smallint('rank'),
  status: text('status').notNull(),
  refundClaimedTx: text('refund_claimed_tx'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ name: 'pk_bidder_stakes', columns: [t.auctionId, t.roundNo, t.bidderWallet] }),
  check('chk_stakes_rank', sql`${t.rank} IS NULL OR ${t.rank} BETWEEN 1 AND 10`),
  check('chk_stakes_status', sql`${t.status} IN ('ACTIVE','PROVISIONAL','DEFAULTED','WINNER','REFUNDABLE','REFUNDED')`),
  check('chk_stakes_bidder_wallet', sql`${t.bidderWallet} ~ '^0x[0-9a-f]{40}$'`),
]);

export const awardingAttempts = pgTable('awarding_attempts', {
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  rank: smallint('rank').notNull(),
  bidderWallet: text('bidder_wallet').notNull(),
  requestSentAt: timestamp('request_sent_at', { withTimezone: true }).notNull(),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
  result: text('result').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  defaultFee: bigint('default_fee', { mode: 'bigint' }),
  attestationId: uuid('attestation_id').references(() => attestations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ name: 'pk_awarding_attempts', columns: [t.auctionId, t.roundNo, t.rank] }),
  check('chk_awd_rank', sql`${t.rank} BETWEEN 1 AND 10`),
  check('chk_awd_result', sql`${t.result} IN ('PENDING','SIGNED','DEFAULTED')`),
]);

// ─── D5. UANG ───────────────────────────────────────────────

export const payouts = pgTable('payouts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  kind: text('kind').notNull(),
  recipientRole: text('recipient_role').notNull(),
  recipientWallet: text('recipient_wallet').notNull(),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  txHash: text('tx_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_payout_kind', sql`${t.kind} IN ('SETTLED','DEFAULT_FEE')`),
  check('chk_payout_role', sql`${t.recipientRole} IN ('PLATFORM','GUARANTOR','NOTARY','TAX','CONSIGNOR')`),
  check('chk_payout_wallet', sql`${t.recipientWallet} ~ '^0x[0-9a-f]{40}$'`),
]);

export const withdrawals = pgTable('withdrawals', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').references(() => auctions.id),
  roundNo: smallint('round_no'),
  wallet: text('wallet').notNull(),
  kind: text('kind').notNull(),
  grossAmount: bigint('gross_amount', { mode: 'bigint' }).notNull(),
  withdrawFee: bigint('withdraw_fee', { mode: 'bigint' }).notNull(),
  netAmount: bigint('net_amount', { mode: 'bigint' }).notNull(),
  relayed: boolean('relayed').notNull(),
  txHash: text('tx_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_wd_kind', sql`${t.kind} IN ('REFUND','CONSIGNOR_PAYOUT','FEE_BALANCE')`),
  check('chk_wd_wallet', sql`${t.wallet} ~ '^0x[0-9a-f]{40}$'`),
  check('chk_wd_fee_le_gross', sql`${t.withdrawFee} <= ${t.grossAmount}`),
  check('chk_wd_net_eq', sql`${t.netAmount} = ${t.grossAmount} - ${t.withdrawFee}`),
]);

// ─── D6. FEED DAN NOTIFIKASI ────────────────────────────────

export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  auctionId: uuid('auction_id').references(() => auctions.id),
  channel: text('channel').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('chk_notif_channel', sql`${t.channel} IN ('TELEGRAM','EMAIL','WEB')`),
  check('chk_notif_status', sql`${t.status} IN ('QUEUED','SENT','FAILED')`),
]);

export const feedPosts = pgTable('feed_posts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  auctionId: uuid('auction_id').notNull().references(() => auctions.id),
  roundNo: smallint('round_no').notNull(),
  kind: text('kind').notNull(),
  channel: text('channel').notNull(),
  externalId: text('external_id'),
  postedAt: timestamp('posted_at', { withTimezone: true }).notNull(),
}, (t) => [
  check('chk_feed_kind', sql`${t.kind} IN ('UPCOMING','OPEN','CLOSED')`),
  check('chk_feed_channel', sql`${t.channel} IN ('APP','X','TELEGRAM')`),
]);

// ─── D7. INDEXER ────────────────────────────────────────────

export const chainEvents = pgTable('chain_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  chainId: integer('chain_id').notNull(),
  blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
  blockTs: timestamp('block_ts', { withTimezone: true }).notNull(),
  txHash: text('tx_hash').notNull(),
  logIndex: integer('log_index').notNull(),
  eventName: text('event_name').notNull(),
  args: jsonb('args').notNull(),
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('idx_chain_events_tx_log').on(t.chainId, t.txHash, t.logIndex),
]);

// TAMBAHAN BARU: Tabel State untuk Navigasi Kursor Indexer
export const indexerState = pgTable('indexer_state', {
  id: text('id').primaryKey(),
  lastScannedBlock: bigint('last_scanned_block', { mode: 'bigint' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

==========
/packages/db/src/seed-partners.ts
==========
// @file packages/db/src/seed-partners.ts
// Master data partner. Sinkron dengan `setPartner` di Setup.s.sol (421614).
//
// Konvensi pilot: SATU guarantor untuk semua kategori.
// Kontrak tidak memakai `category` selain equality check di registerAuction.
// Backend (Tahap 4) yang selalu mengirim `category = 1` saat memanggil
// registerAuction — nilai di sini adalah label bisnis untuk DB/UI saja.
import type { Category } from './types-seed';

export type PartnerSeed = {
  wallet: `0x${string}`;
  type: 'NOTARY' | 'GUARANTOR';
  name: string;
  category: Category | null;
  city: string | null;
};

export const SEED_PARTNERS: PartnerSeed[] = [
  {
    wallet: '0xc6baf074ba3b8112b9adf1f61f8133875f982fa2',
    type: 'NOTARY',
    name: 'H. S. Siregar, SH',
    category: null,
    city: null,
  },
  {
    wallet: '0xb8b194df2352ead585843959d3e7363279207f6c',
    type: 'GUARANTOR',
    name: 'OCBC NISP',
    // Label bisnis. Bebas ganti; on-chain tetap dikirim 1.
    category: 'ALL',
    city: 'Jakarta',
  },
];

==========
/packages/db/src/seed.ts
==========
// @file packages/db/src/seed.ts
// Jalankan: npx tsx packages/db/src/seed.ts (dari root repo)
// Idempoten: aman dijalankan berkali-kali.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { SEED_PARTNERS } from './seed-partners';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  // 1) fee_config — seed sekali
  const feeCountRows = await sql`SELECT count(*)::int AS "feeCount" FROM fee_config`;
  const feeCount = feeCountRows[0]?.feeCount ?? 0;
  if (feeCount === 0) {
    await db.insert(schema.feeConfig).values({
      platformBps: 250,
      guarantorBps: 150,
      notaryBps: 100,
      taxBps: 1_000,
      withdrawFee: 2_500_000n,
      effectiveFrom: new Date(),
    });
    console.log('✓ fee_config (250/150/100/1000 bps, fee 2.5 USDC)');
  } else {
    console.log('· fee_config already exists');
  }

  // 2) partners — idempoten per wallet
  for (const p of SEED_PARTNERS) {
    await db
      .insert(schema.users)
      .values({
        wallet: p.wallet,
        userType: p.type,
        preferredLanguage: 'EN',
      })
      .onConflictDoNothing({ target: schema.users.wallet });

    const [u] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.wallet, p.wallet))
      .limit(1);
    if (!u) throw new Error(`User insert failed: ${p.wallet}`);

    await db
      .insert(schema.partners)
      .values({
        userId: u.id,
        type: p.type,
        name: p.name,
        category: p.category,
        city: p.city,
        active: true,
      })
      .onConflictDoNothing({ target: schema.partners.userId });

    console.log(`✓ ${p.type.padEnd(8)} ${p.name.padEnd(16)} ${p.wallet}`);
  }

  console.log('\n✅ Seed selesai.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌', e instanceof Error ? e.message : e);
    process.exit(1);
  });

==========
/packages/db/src/triggers.sql
==========
-- @file packages/db/src/triggers.sql
-- Trigger & constraint yang tidak bisa dibuat via Drizzle schema.
-- Jalankan: npx tsx scripts/db-run-sql.ts packages/db/src/triggers.sql
-- Idempoten (aman dijalankan berkali-kali).

-- ─── document_number unik di antara auction aktif ──────────
-- ref: PARALEL.md D2.3 — satu auctionID aktif per document_number,
--      NUL dikecualikan, status final (REJECTED/CANCELED/SETTLED/WITHDRAWN)
--      tidak menghalangi.
CREATE OR REPLACE FUNCTION enforce_document_number_unique() RETURNS trigger AS $$
DECLARE
  conflicting_status text;
BEGIN
  IF NEW.document_number = 'NUL' THEN RETURN NEW; END IF;

  SELECT a.status INTO conflicting_status
  FROM auctions a
  JOIN auction_assets aa ON aa.auction_id = a.id
  WHERE aa.document_number = NEW.document_number
    AND a.id <> NEW.auction_id
    AND a.status NOT IN ('REJECTED','CANCELED','SETTLED','WITHDRAWN')
  LIMIT 1;

  IF conflicting_status IS NOT NULL THEN
    RAISE EXCEPTION 'document_number % already active in another auction (status %)',
      NEW.document_number, conflicting_status
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_number_unique ON auction_assets;
CREATE TRIGGER trg_document_number_unique
  BEFORE INSERT OR UPDATE ON auction_assets
  FOR EACH ROW EXECUTE FUNCTION enforce_document_number_unique();

-- ─── Maksimal 5 foto per auction ────────────────────────────
-- ref: PARALEL.md D2.4 — tepat 5 PHOTO per auction_id.
-- Dicek setelah insert/update; validasi "tepat 5" saat transisi ke PENDING
-- dilakukan di aplikasi.
CREATE OR REPLACE FUNCTION enforce_photo_count_5() RETURNS trigger AS $$
DECLARE
  photo_count int;
BEGIN
  SELECT COUNT(*) INTO photo_count
  FROM auction_files
  WHERE auction_id = NEW.auction_id AND kind = 'PHOTO';

  IF photo_count > 5 THEN
    RAISE EXCEPTION 'auction % has % PHOTO rows; max 5', NEW.auction_id, photo_count;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photo_count_5 ON auction_files;
CREATE TRIGGER trg_photo_count_5
  AFTER INSERT OR UPDATE ON auction_files
  FOR EACH ROW EXECUTE FUNCTION enforce_photo_count_5();

==========
/packages/db/src/types-seed.ts
==========
// @file packages/db/src/types-seed.ts
// 'ALL' khusus untuk partners.category (guarantor pilot lintas kategori).
// Auction.category tetap 5 nilai real di bawah.
export type Category =
  | 'ALL'
  | 'OTOMOTIF'
  | 'PROPERTI'
  | 'ELEKTRONIK'
  | 'AKSESORIS_HOBI'
  | 'PERHIASAN';

==========
/README.md
==========
# PARALEL

Prototype lelang **Web3 + RWA** (aset fisik) di **Arbitrum**, untuk pasar Indonesia. Dana bidder tetap non-custodial; kontrak pintar adalah sumber kebenaran untuk bid, stake, peringkat, dan dana. Status: spesifikasi desain final, implementasi sedang dalam progress.

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


==========
/scripts/context/build.ts
==========
import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'CONTEXT.md');

// HANYA abaikan folder yang benar-benar tidak perlu (library/dependency/build)
const IGNORE_DIRS = [
  '.git', 'node_modules', '.next', 'dist', 'build', 
  'coverage', 'out', 'cache', 'broadcast', '.wrangler', '.turbo',
  'contracts/lib/forge-std'
];

// HANYA abaikan file lockfile (karena ukurannya bisa puluhan ribu baris dan tidak penting untuk logika)
const IGNORE_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'CONTEXT.md'
];

// Abaikan file gambar/biner agar tidak merusak format teks
const BINARY_EXTS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', 
  '.zip', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.svg'
];

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    if (IGNORE_FILES.includes(file)) continue;
    if (IGNORE_DIRS.some(ignore => relativePath.startsWith(ignore) || relativePath.includes(`/${ignore}/`))) continue;

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function buildContext() {
  console.log('🔍 Memindai seluruh file (termasuk file rahasia & .env)...');
  const allFiles = getAllFiles(ROOT_DIR);
  
  let markdown = `# PARALEL Project Context\n\nGenerated at ${new Date().toISOString()}\n\n`;
  let processedCount = 0;

  for (const file of allFiles) {
    const relativePath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
    const ext = path.extname(file).toLowerCase();
    
    // FORMAT PEMISAH
    markdown += `==========\n`;
    markdown += `/${relativePath}\n`;
    markdown += `==========\n`;

    if (BINARY_EXTS.includes(ext)) {
       markdown += `*(Binary file omitted)*\n\n`;
       continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      markdown += `${content}\n\n`;
      processedCount++;
    } catch (e: any) {
      markdown += `*(Error reading file: ${e.message})*\n\n`;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');
  console.log(`✅ Selesai! Context lengkap dibuat di: ${OUTPUT_FILE}`);
  console.log(`📦 Total file dimasukkan: ${processedCount}`);
}

buildContext();

==========
/scripts/db-check.ts
==========
// @file scripts/db-check.ts
// Cek isi database Neon: tabel apa saja yang ada.
// Jalankan: npx tsx scripts/db-check.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ada di root .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// 1. Tabel
const tables = await sql`
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`;

console.log(`\n=== Tables in DB: ${tables.length} ===`);
if (tables.length === 0) {
  console.log('(kosong — belum ada tabel)');
} else {
  for (const t of tables) console.log(`  • ${t.tablename}`);
}

// 2. Migrasi yang pernah dijalankan (kalau ada)
try {
  const migrations = await sql`
    SELECT hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at
  `;
  console.log(`\n=== Drizzle migrations applied: ${migrations.length} ===`);
  for (const m of migrations) console.log(`  • ${m.hash.slice(0, 12)}…  ${m.created_at}`);
} catch {
  console.log('\n=== Drizzle migrations: (tabel __drizzle_migrations belum ada) ===');
}

// 3. Cek specific tables yang kita harapkan
const expected = [
  'users', 'kyc_profiles', 'partners', 'fee_config',
  'auctions', 'auction_rounds', 'auction_assets', 'auction_files',
  'status_log', 'confirmation_codes', 'attestations', 'receipts',
  'bids', 'bidder_stakes', 'awarding_attempts',
  'payouts', 'withdrawals',
  'notifications', 'feed_posts', 'chain_events',
];
const found = new Set(tables.map((t: any) => t.tablename));
const missing = expected.filter((t) => !found.has(t));
const extra = [...found].filter((t) => !expected.includes(t as string));

console.log(`\n=== Expected 20 tables ===`);
console.log(`  Found:   ${expected.length - missing.length}/${expected.length}`);
if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
if (extra.length) console.log(`  Extra:   ${extra.join(', ')}`);

process.exit(0);

==========
/scripts/db-inspect.ts
==========
// @file scripts/db-inspect.ts
// Cek apakah tabel di DB cocok dengan schema.ts baru.
// Jalankan: npx tsx scripts/db-inspect.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL tidak ada di root .env');
  process.exit(1);
}
const sql = neon(url);

const report: Record<string, string> = {};

// 1. auction_rounds — apakah PK composite asli atau cuma unique index?
const pk1 = await sql`
  SELECT constraint_type, constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'auction_rounds' AND constraint_type = 'PRIMARY KEY'
`;
report['auction_rounds has PRIMARY KEY'] = pk1.length > 0 ? '✅' : '❌ (masih unique index)';

// 2. bidder_stakes — PK composite + created_at?
const pk2 = await sql`
  SELECT 1 FROM information_schema.table_constraints
  WHERE table_name = 'bidder_stakes' AND constraint_type = 'PRIMARY KEY'
`;
report['bidder_stakes has PRIMARY KEY'] = pk2.length > 0 ? '✅' : '❌';

const col1 = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'bidder_stakes' AND column_name = 'created_at'
`;
report['bidder_stakes.created_at'] = col1.length > 0 ? '✅' : '❌ (belum ada)';

// 3. awarding_attempts — PK composite + created_at?
const pk3 = await sql`
  SELECT 1 FROM information_schema.table_constraints
  WHERE table_name = 'awarding_attempts' AND constraint_type = 'PRIMARY KEY'
`;
report['awarding_attempts has PRIMARY KEY'] = pk3.length > 0 ? '✅' : '❌';

const col2 = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'awarding_attempts' AND column_name = 'created_at'
`;
report['awarding_attempts.created_at'] = col2.length > 0 ? '✅' : '❌ (belum ada)';

// 4. CHECK constraints (versi baru punya ~30+)
const checks = await sql`
  SELECT constraint_name
  FROM information_schema.table_constraints
  WHERE constraint_type = 'CHECK' AND constraint_schema = 'public'
  ORDER BY constraint_name
`;
report['CHECK constraints count'] = `${checks.length} ${checks.length > 15 ? '✅' : '❌ (versi lama)'}`;

// 5. Partial unique index untuk foto
const idx = await sql`
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'auction_files' AND indexname = 'uq_auction_photo_slot'
`;
report['uq_auction_photo_slot'] = idx.length > 0 ? '✅' : '❌ (belum ada)';

// 6. Jumlah row di tabel-tabel utama (lihat kalau ada data)
const counts = await sql`
  SELECT
    (SELECT count(*) FROM users)        AS users,
    (SELECT count(*) FROM partners)     AS partners,
    (SELECT count(*) FROM fee_config)   AS fee_config,
    (SELECT count(*) FROM auctions)     AS auctions,
    (SELECT count(*) FROM chain_events) AS chain_events
`;
report['Row counts'] = JSON.stringify(counts[0]);

// Print
console.log('\n=== Struktur DB vs schema.ts baru ===\n');
for (const [k, v] of Object.entries(report)) {
  console.log(`  ${k.padEnd(40)} ${v}`);
}
process.exit(0);

==========
/scripts/db-migrations.ts
==========
// @file scripts/db-migrations.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ DATABASE_URL'); process.exit(1); }
const sql = neon(url);

const rows = await sql`
  SELECT id, hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY id
`;
console.log(`Migrations applied: ${rows.length}`);
for (const r of rows) {
  console.log(`  • id=${r.id}  hash=${(r.hash as string).slice(0, 12)}…`);
}
process.exit(0);

==========
/scripts/db-reset.ts
==========
// @file scripts/db-reset.ts
// DROP semua tabel di schema public + drizzle. Untuk reset pilot.
// Jalankan: npx tsx scripts/db-reset.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ DATABASE_URL tidak ada'); process.exit(1); }
const sql = neon(url);

console.log('Dropping schemas public + drizzle…');
await sql`DROP SCHEMA IF EXISTS public CASCADE`;
await sql`CREATE SCHEMA public`;
await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
console.log('✅ Reset selesai.');
process.exit(0);

==========
/scripts/db-run-sql.ts
==========
// @file scripts/db-run-sql.ts
// Jalankan file .sql (multi-statement + $$ blocks) ke Neon.
// Usage: npx tsx scripts/db-run-sql.ts <path-to-sql>
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Client } from '@neondatabase/serverless';

const path = process.argv[2];
if (!path) {
  console.error('Usage: npx tsx scripts/db-run-sql.ts <path-to-sql>');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL tidak ada di root .env');
  process.exit(1);
}

const sqlText = readFileSync(path, 'utf-8');

const client = new Client(url);
await client.connect();
try {
  await client.query(sqlText);
  console.log(`✓ Applied: ${path}`);
} finally {
  await client.end();
}
process.exit(0);

==========
/tsconfig.json
==========
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["node", "@cloudflare/workers-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": [
    "scripts/**/*.ts",
    "packages/**/*.ts",
    "workers/**/*.ts"
  ]
}

==========
/workers/indexer/.dev.vars
==========
# Workers configuration @.dev.vars

## URL Database Neon
DATABASE_URL="postgresql://neondb_owner:npg_KDJNiMmr12ys@ep-crimson-math-azk6l0f1-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

## URL Alchemy
ARBITRUM_RPC_URL="https://rpc.ankr.com/arbitrum_sepolia/bb9da7a1eb0a3b8532ca1faa26a81800d57e31ca35fc8787572eb51dfb38289c"

## Contract address untuk Auction (Jika sudah deploy)
AUCTION_CONTRACT_ADDRESS="0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c"

==========
/workers/indexer/src/abi.json
==========
[
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_usdc",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_platformWallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_taxWallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_relayerWallet",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "AWARD_SIGN_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "CLAIM_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "COLLECTED_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "COLLECTION_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "CONSIGNOR_CONFIRM_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DEFAULT_FEE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DOMAIN_SEPARATOR",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "NOTARY_APPROVAL_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "RANK_SLOTS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SIGNING_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "WITHDRAWN_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "WITHDRAW_FEE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "WITHDRAW_REQUEST_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "advanceCandidate",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowedIncrements",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "auctions",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "consignor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "guarantor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "notary",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "category",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "enum ParalelAuction.Status"
      },
      {
        "name": "currentRound",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "specHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "platformBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "guarantorBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "notaryBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "taxBps",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimable",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "collected",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "expireCollection",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "markWithdrawn",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "nonces",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "partners",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "pType",
        "type": "uint8",
        "internalType": "enum ParalelAuction.PartnerType"
      },
      {
        "name": "category",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "placeBid",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "placeBidWithPermit",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "platformWallet",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refundableOf",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "bidder",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "gross",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "fee",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "net",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerAuction",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "internalType": "struct ParalelAuction.RegisterAuctionParams",
        "components": [
          {
            "name": "auctionKey",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "consignor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "guarantor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "notary",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "category",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "specHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "startingBid",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "bidIncrement",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "openAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "durationHours",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "platformBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "guarantorBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "notaryBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "taxBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "confirmationCodeHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "notarySig",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "consignorSig",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "relayerWallet",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "reuseRound",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "startingBid",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "bidIncrement",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "openAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "durationHours",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "rounds",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "startingBid",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "bidIncrement",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "openAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "closeAt",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "currentBid",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "currentLeader",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "bidSeq",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "awardingIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "awardingDeadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "winner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "winnerStake",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "collectionDeadline",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "claimPeriodEnd",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setPartner",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "pType",
        "type": "uint8",
        "internalType": "enum ParalelAuction.PartnerType"
      },
      {
        "name": "category",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "stakes",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "myBid",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "reachedSeq",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "withdrawn",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "startAwarding",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "statusOf",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum ParalelAuction.Status"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "submitAwardSignature",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "taxWallet",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20Permit"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdrawClaimable",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawConsignor",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawRefund",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "bidder",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AuctionRegistered",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "consignor",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "guarantor",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "notary",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "specHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AwardSigned",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "winner",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AwardingStarted",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "candidate",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BidPlaced",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "bidder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "added",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "myBidAfter",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "currentBidAfter",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "seq",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "isPreBid",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimPeriodStarted",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "autoIssued",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Closed",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Collected",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Defaulted",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "candidate",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "defaultFee",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FeeCredited",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PassedIn",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundScheduled",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "startingBid",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "bidIncrement",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "openAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "closeAt",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Settled",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawal",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "kind",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "gross",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "fee",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "net",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WithdrawnItem",
    "inputs": [
      {
        "name": "auctionKey",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "roundNo",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyWithdrawn",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AuctionExists",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AuctionNotBiddable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BiddingClosed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CategoryMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ConsignorCannotBid",
    "inputs": []
  },
  {
    "type": "error",
    "name": "IncrementTooLarge",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidDuration",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidIncrement",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidOpenTime",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotMultipleOfIncrement",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRefundable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRelayer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PartnerNotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooEarly",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WinnerCannotWithdraw",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongPhase",
    "inputs": []
  }
]


==========
/workers/indexer/src/index.ts
==========
// @file workers/indexer/src/index.ts
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { chainEvents, indexerState } from '../../../packages/db/src/schema';
import { eq } from 'drizzle-orm';
import { Env } from './types';
import abi from './abi.json';
import { processEvents } from './process';

async function runIndexer(env: Env) {
  const sqlClient = neon(env.DATABASE_URL);
  const db = drizzle(sqlClient);

  const client = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(env.ARBITRUM_RPC_URL),
  });

  const finalizedBlock = await client.getBlock({ blockTag: 'finalized' });
  const latestBlock = finalizedBlock.number;

  // 1. Ambil kursor dari indexer_state
  const stateRows = await db.select().from(indexerState).where(eq(indexerState.id, 'main_cursor')).limit(1);
  const START_BLOCK = BigInt(env.START_BLOCK || 325236150n);
  
  let fromBlock = stateRows.length > 0 
    ? BigInt(stateRows[0].lastScannedBlock) + 1n 
    : START_BLOCK;

  if (fromBlock > latestBlock) {
    return { message: 'Indexer is up to date', latestBlock: latestBlock.toString() };
  }

  const MAX_BLOCKS_PER_RUN = 5000n; // Dipercepat untuk catch-up
  const MAX_BLOCK_RANGE = BigInt(env.MAX_BLOCK_RANGE || 100); 
  
  let toBlock = fromBlock + MAX_BLOCKS_PER_RUN - 1n;
  if (toBlock > latestBlock) toBlock = latestBlock;

  let insertedCount = 0;
  let currentFrom = fromBlock;
  const allLogs: any[] = [];
  
  // 2. Fetch Log
  while (currentFrom <= toBlock) {
    let currentTo = currentFrom + MAX_BLOCK_RANGE - 1n;
    if (currentTo > toBlock) currentTo = toBlock;

    const logs = await client.getContractEvents({
      address: env.AUCTION_CONTRACT_ADDRESS,
      abi: abi as any,
      fromBlock: currentFrom,
      toBlock: currentTo,
    });

    allLogs.push(...logs);
    currentFrom = currentTo + 1n;
  }

  // 3. Simpan Log (jika ada)
  if (allLogs.length > 0) {
    const uniqueBlockNumbers = Array.from(new Set(allLogs.map((l) => l.blockNumber)));
    const blockTimestamps = new Map<bigint, bigint>();

    await Promise.all(
      uniqueBlockNumbers.map(async (blockNumber) => {
        const block = await client.getBlock({ blockNumber });
        blockTimestamps.set(blockNumber, block.timestamp);
      })
    );

    const eventsToInsert = allLogs.map((log: any) => {
      const safeArgs = JSON.parse(JSON.stringify(log.args, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v
      ));
      const ts = blockTimestamps.get(log.blockNumber) || 0n;
      
      return {
        chainId: arbitrumSepolia.id,
        blockNumber: log.blockNumber,
        blockTs: new Date(Number(ts) * 1000),
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        eventName: log.eventName,
        args: safeArgs,
        processed: false,
      };
    });
    
    await db.insert(chainEvents).values(eventsToInsert).onConflictDoNothing();
    insertedCount = eventsToInsert.length;
  }

  // 4. WAJIB: Update state kursor (meskipun fetched 0)
  await db.insert(indexerState)
    .values({ id: 'main_cursor', lastScannedBlock: toBlock, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: indexerState.id,
      set: { lastScannedBlock: toBlock, updatedAt: new Date() },
    });

  // 5. Proses event ke tabel turunan
  const result = await processEvents(db, client);

  return {
    message: 'Indexer run successful',
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    latestFinalizedBlock: latestBlock.toString(),
    fetched: insertedCount,
    processed: result.processed,
    failed: result.failed,
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const res = await runIndexer(env);
      return new Response(JSON.stringify(res), { status: 200 });
    } catch (error: any) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const res = await runIndexer(env);
      console.log("Cron run result:", res);
    } catch (error) {
      console.error("Cron run failed:", error);
    }
  },
};

==========
/workers/indexer/src/process.ts
==========
// @file workers/indexer/src/process.ts
import { eq, inArray, sql } from 'drizzle-orm';
import { keccak256, toBytes } from 'viem';
import {
  chainEvents, auctions, auctionRounds, bids, bidderStakes, withdrawals
} from '../../../packages/db/src/schema';

type Db = any;

async function buildAuctionMap(db: Db): Promise<Map<string, string>> {
  const rows = await db.select({ id: auctions.id, auctionCode: auctions.auctionCode }).from(auctions);
  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(keccak256(toBytes(r.auctionCode)), r.id);
  }
  return map;
}

type TxCache = Map<string, number>;
async function getTxIndex(client: any, txHash: string, cache: TxCache): Promise<number> {
  if (cache.has(txHash)) return cache.get(txHash)!;
  const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
  const i = tx.transactionIndex;
  cache.set(txHash, i);
  return i;
}

// 1 Subrequest: Window Function untuk rank
async function recomputeRanks(db: Db, auctionId: string, roundNo: number) {
  await db.execute(sql`
    UPDATE bidder_stakes AS bs
    SET rank = r.new_rank
    FROM (
      SELECT bidder_wallet, ROW_NUMBER() OVER (ORDER BY my_bid DESC, reached_seq ASC) as new_rank
      FROM bidder_stakes
      WHERE auction_id = ${auctionId} AND round_no = ${roundNo}
    ) AS r
    WHERE bs.auction_id = ${auctionId} AND bs.round_no = ${roundNo} AND bs.bidder_wallet = r.bidder_wallet
    AND bs.rank IS DISTINCT FROM (CASE WHEN r.new_rank <= 10 THEN r.new_rank::int ELSE NULL END);
  `);
}

export async function processEvents(db: Db, client: any, limit = 50) {
  const auctionMap = await buildAuctionMap(db);        
  const txCache: TxCache = new Map();                  

  const pending = await db
    .select()
    .from(chainEvents)
    .where(eq(chainEvents.processed, false))
    .limit(limit);

  if (pending.length === 0) return { processed: 0, failed: 0 };

  let ok = 0, failed = 0;

  // Tempat penampungan sementara (Batch Arrays)
  const processedIds: number[] = [];
  const newBids: any[] = [];
  const newStakes: any[] = [];
  const newWithdrawals: any[] = [];
  const auctionStatusUpdates = new Map<string, string>(); // auctionId -> status
  const stakesToRecompute = new Set<string>(); // `${auctionId}:${roundNo}`

  for (const ev of pending) {
    try {
      const auctionId = ev.args.auctionKey ? auctionMap.get(ev.args.auctionKey) : null;
      
      // Jika butuh auctionId tapi tidak ketemu, skip (nanti di-retry)
      const requiresAuction = !['FeeCredited'].includes(ev.eventName);
      if (requiresAuction && !auctionId) {
        throw new Error(`auction not found for key ${ev.args.auctionKey}`);
      }

      switch (ev.eventName) {
        case 'AuctionRegistered':
          auctionStatusUpdates.set(auctionId!, 'SCHEDULED');
          break;

        case 'RoundScheduled':
          await db.insert(auctionRounds).values({
            auctionId, roundNo: Number(ev.args.roundNo),
            startingBid: BigInt(ev.args.startingBid),
            bidIncrement: BigInt(ev.args.bidIncrement),
            openAt: new Date(Number(ev.args.openAt) * 1000),
            closeAt: new Date(Number(ev.args.closeAt) * 1000),
            durationHours: Math.round((Number(ev.args.closeAt) - Number(ev.args.openAt)) / 3600),
            scheduledAt: ev.blockTs,
          }).onConflictDoNothing();
          break;

        case 'BidPlaced': {
          const roundNo = Number(ev.args.roundNo);
          const bidder = ev.args.bidder.toLowerCase();
          const txIndex = await getTxIndex(client, ev.txHash, txCache);

          newBids.push({
            auctionId, roundNo,
            phase: ev.args.isPreBid ? 'PRE_BID' : 'LIVE_BID',
            bidderWallet: bidder,
            amountAdded: BigInt(ev.args.added),
            myBidAfter: BigInt(ev.args.myBidAfter),
            currentBidAfter: BigInt(ev.args.currentBidAfter),
            seq: BigInt(ev.args.seq),
            blockNumber: BigInt(ev.blockNumber),
            txIndex, logIndex: ev.logIndex, blockTs: ev.blockTs, txHash: ev.txHash,
          });

          newStakes.push({
            auctionId, roundNo, bidderWallet: bidder,
            myBid: BigInt(ev.args.myBidAfter),
            reachedSeq: BigInt(ev.args.seq),
            status: 'ACTIVE',
          });

          stakesToRecompute.add(`${auctionId}:${roundNo}`);
          break;
        }

        case 'AwardingStarted':
          auctionStatusUpdates.set(auctionId!, 'AWARDING');
          break;

        case 'AwardSigned':
          auctionStatusUpdates.set(auctionId!, 'COLLECTION');
          await db.update(bidderStakes).set({ status: 'WINNER' })
            .where(sql`${bidderStakes.auctionId} = ${auctionId} AND ${bidderStakes.roundNo} = ${ev.args.roundNo} AND ${bidderStakes.bidderWallet} = ${ev.args.winner.toLowerCase()}`);
          break;

        case 'Defaulted':
          await db.update(bidderStakes).set({ status: 'DEFAULTED' })
            .where(sql`${bidderStakes.auctionId} = ${auctionId} AND ${bidderStakes.roundNo} = ${ev.args.roundNo} AND ${bidderStakes.bidderWallet} = ${ev.args.candidate.toLowerCase()}`);
          break;

        case 'PassedIn':
          auctionStatusUpdates.set(auctionId!, 'PASSED_IN');
          break;

        case 'Collected':
        case 'ClaimPeriodStarted':
          auctionStatusUpdates.set(auctionId!, 'CLAIM_PERIOD');
          break;

        case 'Settled':
          auctionStatusUpdates.set(auctionId!, 'SETTLED');
          break;

        case 'WithdrawnItem':
          auctionStatusUpdates.set(auctionId!, 'WITHDRAWN');
          break;

        case 'Withdrawal': {
          const kindMap = ['REFUND', 'CONSIGNOR_PAYOUT', 'FEE_BALANCE'];
          newWithdrawals.push({
            auctionId,
            roundNo: Number(ev.args.roundNo),
            wallet: ev.args.wallet.toLowerCase(),
            kind: kindMap[Number(ev.args.kind)],
            grossAmount: BigInt(ev.args.gross),
            withdrawFee: BigInt(ev.args.fee),
            netAmount: BigInt(ev.args.net),
            relayed: false,
            txHash: ev.txHash,
          });
          break;
        }

        case 'FeeCredited':
          // DIABAIKAN: Tidak ada auctionKey, tidak cocok dengan skema payouts.
          // Biarkan ter-mark processed tanpa mengubah DB.
          break;

        case 'Closed':
          // Status CLOSED terjadi transisi waktu. Bisa diabaikan karena langsung ke AWARDING/PASSED_IN.
          break;
      }

      processedIds.push(ev.id);
      ok++;
    } catch (err) {
      console.error(`[handler fail] ${ev.eventName} tx=${ev.txHash}:`, err);
      failed++;
    }
  }

  // ─── EKSEKUSI BATCH (Hanya ~5 Subrequest) ─────────────────────
  if (processedIds.length > 0) {
    await db.update(chainEvents).set({ processed: true }).where(inArray(chainEvents.id, processedIds));
  }

  if (newBids.length > 0) {
    await db.insert(bids).values(newBids).onConflictDoNothing();
  }

  if (newStakes.length > 0) {
    // Upsert batch untuk bidder_stakes
    await db.insert(bidderStakes).values(newStakes).onConflictDoUpdate({
      target: [bidderStakes.auctionId, bidderStakes.roundNo, bidderStakes.bidderWallet],
      set: { myBid: sql`EXCLUDED.my_bid`, reachedSeq: sql`EXCLUDED.reached_seq` }
    });
  }

  if (newWithdrawals.length > 0) {
    await db.insert(withdrawals).values(newWithdrawals).onConflictDoNothing();
  }

  // Update status lelang
  for (const [aId, status] of auctionStatusUpdates.entries()) {
    await db.update(auctions).set({ status }).where(eq(auctions.id, aId));
  }

  // Recompute ranks (hanya untuk round yang ada bid baru)
  for (const key of stakesToRecompute) {
    const [aId, rNo] = key.split(':');
    await recomputeRanks(db, aId, Number(rNo));
  }

  return { processed: ok, failed };
}

==========
/workers/indexer/src/types.ts
==========
// @file workers/indexer/src/types.ts
export interface Env {
  DATABASE_URL: string;
  ARBITRUM_RPC_URL: string;
  AUCTION_CONTRACT_ADDRESS: `0x${string}`;
  START_BLOCK: string;
  MAX_BLOCK_RANGE: string;
}

==========
/workers/indexer/wrangler.toml
==========
# @file workers/indexer/wrangler.toml — Cloudflare Worker configuration for the indexer
name = "paralel-indexer"
main = "src/index.ts"
compatibility_date = "2024-03-20"

[vars]
AUCTION_CONTRACT_ADDRESS = "0x80db02BfB4d0163a2dbd7f096178BF7AE5A66d2c"
START_BLOCK = "325236150"
MAX_BLOCK_RANGE = "500"   # Alchemy: 10 Ankr: 100

[triggers]
crons = ["* * * * *"]

