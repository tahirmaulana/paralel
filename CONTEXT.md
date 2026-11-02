# CONTEXT

> **AUTO-GENERATED** — jangan edit manual. Regenerate: `npm run context:build`.

## Header

- Commit: `78c4b538e784b6375c7a0d1594da0fb864071c02`
- Node: `v24.21.0`
- Package manager: `npm`
- Foundry: `forge Version: 1.8.7`

## Tree

```
├── .github/
│   └── skills/
│       ├── paralel-backend-relay_SKILL.md
│       ├── paralel-contracts_SKILL.md
│       ├── paralel-database_SKILL.md
│       ├── paralel-indexer-keeper_SKILL.md
│       ├── paralel-telegram-bot_SKILL.md
│       └── paralel-web-ui_SKILL.md
├── apps/
│   └── web/
│       ├── public/
│       │   ├── file.svg
│       │   ├── globe.svg
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── src/
│       │   └── app/
│       │       ├── abi.json
│       │       ├── favicon.ico
│       │       ├── globals.css
│       │       ├── layout.tsx
│       │       ├── page.tsx
│       │       └── providers.tsx
│       ├── .gitignore
│       ├── AGENTS.md
│       ├── eslint.config.mjs
│       ├── next.config.ts
│       ├── package-lock.json
│       ├── package.json
│       ├── README.md
│       └── tsconfig.json
├── contracts/
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   ├── RegisterDummy.s.sol
│   │   └── Setup.s.sol
│   ├── src/
│   │   ├── interfaces/
│   │   │   └── IERC20Permit.sol
│   │   └── ParalelAuction.sol
│   ├── test/
│   │   ├── mocks/
│   │   │   └── MockERC20.sol
│   │   ├── ParalelAuction.t.sol
│   │   └── ParalelAuctionAudit.t.sol
│   ├── foundry.toml
│   └── README.md
├── docs/
│   ├── CONTRACT_SPEC.md
│   ├── PARALEL.md
│   ├── TECH_STACK.md
│   └── WALLET_OPERATIONS.md
├── packages/
│   └── db/
│       ├── drizzle/
│       │   ├── meta/
│       │   │   ├── _journal.json
│       │   │   └── 0000_snapshot.json
│       │   └── 0000_curly_bill_hollister.sql
│       └── src/
│           ├── index.ts
│           ├── schema.ts
│           ├── seed-partners.ts
│           ├── seed.ts
│           ├── triggers.sql
│           └── types-seed.ts
├── scripts/
│   ├── context/
│   │   └── build.ts
│   ├── db-check.ts
│   ├── db-inspect.ts
│   ├── db-migrations.ts
│   ├── db-reset.ts
│   └── db-run-sql.ts
├── workers/
│   └── indexer/
│       ├── src/
│       │   ├── abi.json
│       │   ├── index.ts
│       │   └── types.ts
│       ├── .dev.vars
│       └── wrangler.toml
├── .env.example
├── .gitignore
├── context.config.json
├── CONTEXT.md
├── drizzle.config.ts
├── package-lock.json
├── package.json
├── README.md
└── tsconfig.json
```

## Gap analysis

Total: DONE=83 STUB=0 MISSING=225

### `docs/CONTRACT_SPEC.md`
- [DONE] `placeBid` (function) — ref `docs/CONTRACT_SPEC.md:21` · `contracts/src/ParalelAuction.sol:355`
- [MISSING] `relayerWallet` (unknown) — ref `docs/CONTRACT_SPEC.md:22`
- [DONE] `setPartner` (function) — ref `docs/CONTRACT_SPEC.md:23` · `contracts/src/ParalelAuction.sol:247`
- [DONE] `setRelayer` (function) — ref `docs/CONTRACT_SPEC.md:23` · `contracts/src/ParalelAuction.sol:251`
- [DONE] `transferOwnership` (function) — ref `docs/CONTRACT_SPEC.md:23` · `contracts/src/ParalelAuction.sol:255`
- [DONE] `withdrawClaimable` (function) — ref `docs/CONTRACT_SPEC.md:24` · `contracts/src/ParalelAuction.sol:599`
- [MISSING] `SCHEDULED` (unknown) — ref `docs/CONTRACT_SPEC.md:33`
- [MISSING] `WITHDRAWN` (unknown) — ref `docs/CONTRACT_SPEC.md:33`
- [MISSING] `OPEN` (unknown) — ref `docs/CONTRACT_SPEC.md:34`
- [MISSING] `CLOSED` (unknown) — ref `docs/CONTRACT_SPEC.md:34`
- [DONE] `registerAuction` (function) — ref `docs/CONTRACT_SPEC.md:36` · `contracts/src/ParalelAuction.sol:260`
- [MISSING] `NotaryApproval` (unknown) — ref `docs/CONTRACT_SPEC.md:38`
- [MISSING] `ConsignorConfirm` (unknown) — ref `docs/CONTRACT_SPEC.md:38`
- [MISSING] `bidIncrement` (unknown) — ref `docs/CONTRACT_SPEC.md:42`
- [MISSING] `durationHours` (unknown) — ref `docs/CONTRACT_SPEC.md:43`
- [MISSING] `openAt` (unknown) — ref `docs/CONTRACT_SPEC.md:43`
- [DONE] `AuctionRegistered` (event) — ref `docs/CONTRACT_SPEC.md:46` · `contracts/src/ParalelAuction.sol:128`
- [DONE] `RoundScheduled` (event) — ref `docs/CONTRACT_SPEC.md:46` · `contracts/src/ParalelAuction.sol:129`
- [DONE] `placeBidWithPermit` (function) — ref `docs/CONTRACT_SPEC.md:48` · `contracts/src/ParalelAuction.sol:359`
- [MISSING] `topRanks` (unknown) — ref `docs/CONTRACT_SPEC.md:60`
- [MISSING] `myBid` (unknown) — ref `docs/CONTRACT_SPEC.md:60`
- [MISSING] `reachedSeq` (unknown) — ref `docs/CONTRACT_SPEC.md:60`
- [MISSING] `currentBid` (unknown) — ref `docs/CONTRACT_SPEC.md:61`
- [MISSING] `closeAt` (unknown) — ref `docs/CONTRACT_SPEC.md:63`
- [DONE] `startAwarding` (function) — ref `docs/CONTRACT_SPEC.md:65` · `contracts/src/ParalelAuction.sol:398`
- [DONE] `PassedIn` (event) — ref `docs/CONTRACT_SPEC.md:69` · `contracts/src/ParalelAuction.sol:135`
- [MISSING] `AWARDING` (unknown) — ref `docs/CONTRACT_SPEC.md:70`
- [DONE] `Closed` (event) — ref `docs/CONTRACT_SPEC.md:71` · `contracts/src/ParalelAuction.sol:131`
- [DONE] `submitAwardSignature` (function) — ref `docs/CONTRACT_SPEC.md:73` · `contracts/src/ParalelAuction.sol:420`
- [MISSING] `AwardSign` (unknown) — ref `docs/CONTRACT_SPEC.md:74`
- [MISSING] `COLLECTION` (unknown) — ref `docs/CONTRACT_SPEC.md:76`
- [DONE] `AwardSigned` (event) — ref `docs/CONTRACT_SPEC.md:77` · `contracts/src/ParalelAuction.sol:133`
- [DONE] `advanceCandidate` (function) — ref `docs/CONTRACT_SPEC.md:79` · `contracts/src/ParalelAuction.sol:441`
- [DONE] `AwardingStarted` (event) — ref `docs/CONTRACT_SPEC.md:85` · `contracts/src/ParalelAuction.sol:132`
- [DONE] `Collected` (event) — ref `docs/CONTRACT_SPEC.md:88` · `contracts/src/ParalelAuction.sol:136`
- [DONE] `ClaimPeriodStarted` (event) — ref `docs/CONTRACT_SPEC.md:91` · `contracts/src/ParalelAuction.sol:137`
- [DONE] `expireCollection` (function) — ref `docs/CONTRACT_SPEC.md:93` · `contracts/src/ParalelAuction.sol:497`
- [MISSING] `collectionDeadline` (unknown) — ref `docs/CONTRACT_SPEC.md:96`
- [DONE] `withdrawRefund` (function) — ref `docs/CONTRACT_SPEC.md:99` · `contracts/src/ParalelAuction.sol:510`
- [MISSING] `WithdrawRequest` (unknown) — ref `docs/CONTRACT_SPEC.md:100`
- [DONE] `withdrawConsignor` (function) — ref `docs/CONTRACT_SPEC.md:114` · `contracts/src/ParalelAuction.sol:560`
- [MISSING] `winnerStake` (unknown) — ref `docs/CONTRACT_SPEC.md:118`
- [MISSING] `taxWallet` (unknown) — ref `docs/CONTRACT_SPEC.md:119`
- [MISSING] `SETTLED` (unknown) — ref `docs/CONTRACT_SPEC.md:121`
- [DONE] `Settled` (event) — ref `docs/CONTRACT_SPEC.md:122` · `contracts/src/ParalelAuction.sol:141`
- [DONE] `FeeCredited` (event) — ref `docs/CONTRACT_SPEC.md:122` · `contracts/src/ParalelAuction.sol:139`
- [DONE] `reuseRound` (function) — ref `docs/CONTRACT_SPEC.md:131` · `contracts/src/ParalelAuction.sol:305`
- [DONE] `markWithdrawn` (function) — ref `docs/CONTRACT_SPEC.md:137` · `contracts/src/ParalelAuction.sol:341`
- [MISSING] `Withdrawn` (unknown) — ref `docs/CONTRACT_SPEC.md:138`
- [DONE] `WithdrawnItem` (event) — ref `docs/CONTRACT_SPEC.md:141` · `contracts/src/ParalelAuction.sol:138`
- [DONE] `statusOf` (function) — ref `docs/CONTRACT_SPEC.md:144` · `contracts/src/ParalelAuction.sol:203`
- [DONE] `getAuction` (function) — ref `docs/CONTRACT_SPEC.md:144` · `contracts/src/ParalelAuction.sol:214`
- [DONE] `getRound` (function) — ref `docs/CONTRACT_SPEC.md:144` · `contracts/src/ParalelAuction.sol:218`
- [DONE] `getTopRanks` (function) — ref `docs/CONTRACT_SPEC.md:144` · `contracts/src/ParalelAuction.sol:222`
- [DONE] `getStake` (function) — ref `docs/CONTRACT_SPEC.md:144` · `contracts/src/ParalelAuction.sol:226`
- [DONE] `BidPlaced` (event) — ref `docs/CONTRACT_SPEC.md:151` · `contracts/src/ParalelAuction.sol:130`
- [DONE] `Defaulted` (event) — ref `docs/CONTRACT_SPEC.md:151` · `contracts/src/ParalelAuction.sol:134`
- [DONE] `Withdrawal` (event) — ref `docs/CONTRACT_SPEC.md:151` · `contracts/src/ParalelAuction.sol:140`
- [MISSING] `auctionKey` (unknown) — ref `docs/CONTRACT_SPEC.md:151`
- [MISSING] `roundNo` (unknown) — ref `docs/CONTRACT_SPEC.md:151`
- [DONE] `NotRelayer` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:147`
- [DONE] `NotOwner` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:146`
- [DONE] `PartnerNotRegistered` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:148`
- [DONE] `AuctionExists` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:149`
- [DONE] `InvalidIncrement` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:150`
- [DONE] `IncrementTooLarge` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:151`
- [DONE] `InvalidDuration` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:152`
- [DONE] `InvalidOpenTime` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:153`
- [DONE] `BadSignature` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:160`
- [DONE] `SignatureExpired` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:166`
- [DONE] `NonceUsed` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:167`
- [DONE] `AuctionNotBiddable` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:154`
- [DONE] `BiddingClosed` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:155`
- [DONE] `ConsignorCannotBid` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:156`
- [DONE] `NotMultipleOfIncrement` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:157`
- [DONE] `TooEarly` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:158`
- [DONE] `WrongPhase` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:159`
- [DONE] `NotCurrentCandidate` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:168`
- [DONE] `AlreadyWithdrawn` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:162`
- [DONE] `NotRefundable` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:163`
- [DONE] `WinnerCannotWithdraw` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:164`
- [DONE] `NothingToClaim` (error) — ref `docs/CONTRACT_SPEC.md:155` · `contracts/src/ParalelAuction.sol:165`
- [MISSING] `currentLeader` (unknown) — ref `docs/CONTRACT_SPEC.md:160`
- [MISSING] `awardingDeadline` (unknown) — ref `docs/CONTRACT_SPEC.md:175`
- [MISSING] `claimPeriodEnd` (unknown) — ref `docs/CONTRACT_SPEC.md:177`
- [MISSING] `FeeWithdrawRequest` (unknown) — ref `docs/CONTRACT_SPEC.md:198`

### `docs/PARALEL.md`
- [MISSING] `SCHEDULED` (unknown) — ref `docs/PARALEL.md:9`
- [MISSING] `document_type` (unknown) — ref `docs/PARALEL.md:110`
- [MISSING] `CERTIFICATE` (unknown) — ref `docs/PARALEL.md:110`
- [MISSING] `INVOICE` (unknown) — ref `docs/PARALEL.md:110`
- [MISSING] `document_number` (unknown) — ref `docs/PARALEL.md:111`
- [MISSING] `chassis_number` (unknown) — ref `docs/PARALEL.md:112`
- [MISSING] `serial_number` (unknown) — ref `docs/PARALEL.md:113`
- [MISSING] `NUL` (unknown) — ref `docs/PARALEL.md:115`
- [MISSING] `NEW` (unknown) — ref `docs/PARALEL.md:125`
- [MISSING] `GOOD` (unknown) — ref `docs/PARALEL.md:125`
- [MISSING] `FAIR` (unknown) — ref `docs/PARALEL.md:125`
- [MISSING] `DAMAGED` (unknown) — ref `docs/PARALEL.md:125`
- [MISSING] `GOLD` (unknown) — ref `docs/PARALEL.md:133`
- [MISSING] `SILVER` (unknown) — ref `docs/PARALEL.md:133`
- [MISSING] `PLATINUM` (unknown) — ref `docs/PARALEL.md:133`
- [MISSING] `OTHER` (unknown) — ref `docs/PARALEL.md:133`
- [MISSING] `myBid` (unknown) — ref `docs/PARALEL.md:172`
- [MISSING] `currentBid` (unknown) — ref `docs/PARALEL.md:175`
- [MISSING] `auto_issued` (unknown) — ref `docs/PARALEL.md:253`
- [MISSING] `round_no` (unknown) — ref `docs/PARALEL.md:261`
- [MISSING] `BIGINT` (unknown) — ref `docs/PARALEL.md:386`
- [MISSING] `FLOAT` (unknown) — ref `docs/PARALEL.md:386`
- [MISSING] `NUMERIC` (unknown) — ref `docs/PARALEL.md:386`
- [MISSING] `client_ms` (unknown) — ref `docs/PARALEL.md:387`
- [MISSING] `updated_at` (unknown) — ref `docs/PARALEL.md:392`
- [DONE] `status_log` (table) — ref `docs/PARALEL.md:393` · `packages/db/drizzle/0000_curly_bill_hollister.sql:272`
- [DONE] `chain_events` (table) — ref `docs/PARALEL.md:393` · `packages/db/drizzle/0000_curly_bill_hollister.sql:152`
- [MISSING] `user_type` (unknown) — ref `docs/PARALEL.md:406`
- [MISSING] `PUBLIC` (unknown) — ref `docs/PARALEL.md:406`
- [MISSING] `NOTARY` (unknown) — ref `docs/PARALEL.md:406`
- [MISSING] `GUARANTOR` (unknown) — ref `docs/PARALEL.md:406`
- [MISSING] `PLATFORM` (unknown) — ref `docs/PARALEL.md:406`
- [MISSING] `preferred_language` (unknown) — ref `docs/PARALEL.md:408`
- [MISSING] `telegram_chat_id` (unknown) — ref `docs/PARALEL.md:409`
- [MISSING] `created_at` (unknown) — ref `docs/PARALEL.md:410`
- [DONE] `kyc_profiles` (table) — ref `docs/PARALEL.md:412` · `packages/db/drizzle/0000_curly_bill_hollister.sql:198`
- [MISSING] `user_id` (unknown) — ref `docs/PARALEL.md:417`
- [MISSING] `full_name` (unknown) — ref `docs/PARALEL.md:418`
- [MISSING] `face_verified` (unknown) — ref `docs/PARALEL.md:421`
- [MISSING] `id_extracted_by_ai` (unknown) — ref `docs/PARALEL.md:422`
- [MISSING] `PENDING` (unknown) — ref `docs/PARALEL.md:423`
- [MISSING] `VERIFIED` (unknown) — ref `docs/PARALEL.md:423`
- [MISSING] `FAILED` (unknown) — ref `docs/PARALEL.md:423`
- [MISSING] `verified_at` (unknown) — ref `docs/PARALEL.md:424`
- [MISSING] `INDOMOTOR` (unknown) — ref `docs/PARALEL.md:435`
- [MISSING] `DIGITALSHOP` (unknown) — ref `docs/PARALEL.md:435`
- [MISSING] `ACCSSTORE` (unknown) — ref `docs/PARALEL.md:435`
- [MISSING] `GOLDJEWELRY` (unknown) — ref `docs/PARALEL.md:435`
- [MISSING] `GREENPROPERTY` (unknown) — ref `docs/PARALEL.md:435`
- [DONE] `auction_rounds` (table) — ref `docs/PARALEL.md:446` · `packages/db/drizzle/0000_curly_bill_hollister.sql:53`
- [MISSING] `auction_code` (unknown) — ref `docs/PARALEL.md:451`
- [MISSING] `consignor_id` (unknown) — ref `docs/PARALEL.md:452`
- [MISSING] `guarantor_id` (unknown) — ref `docs/PARALEL.md:453`
- [MISSING] `notary_id` (unknown) — ref `docs/PARALEL.md:454`
- [MISSING] `OTOMOTIF` (unknown) — ref `docs/PARALEL.md:455`
- [MISSING] `PROPERTI` (unknown) — ref `docs/PARALEL.md:455`
- [MISSING] `ELEKTRONIK` (unknown) — ref `docs/PARALEL.md:455`
- [MISSING] `PERHIASAN` (unknown) — ref `docs/PARALEL.md:455`
- [MISSING] `USDC` (unknown) — ref `docs/PARALEL.md:456`
- [MISSING] `IDRX` (unknown) — ref `docs/PARALEL.md:456`
- [MISSING] `token_decimals` (unknown) — ref `docs/PARALEL.md:457`
- [MISSING] `current_round` (unknown) — ref `docs/PARALEL.md:459`
- [MISSING] `pending_at` (unknown) — ref `docs/PARALEL.md:460`
- [MISSING] `pending_deadline` (unknown) — ref `docs/PARALEL.md:461`
- [MISSING] `CANCELED` (unknown) — ref `docs/PARALEL.md:461`
- [MISSING] `fee_config_id` (unknown) — ref `docs/PARALEL.md:462`
- [MISSING] `onchain_tx_hash` (unknown) — ref `docs/PARALEL.md:463`
- [MISSING] `onchain_registered_at` (unknown) — ref `docs/PARALEL.md:464`
- [MISSING] `auction_id` (unknown) — ref `docs/PARALEL.md:474`
- [MISSING] `starting_bid` (unknown) — ref `docs/PARALEL.md:476`
- [MISSING] `bid_increment` (unknown) — ref `docs/PARALEL.md:477`
- [MISSING] `scheduled_at` (unknown) — ref `docs/PARALEL.md:478`
- [MISSING] `open_at` (unknown) — ref `docs/PARALEL.md:479`
- [MISSING] `duration_hours` (unknown) — ref `docs/PARALEL.md:480`
- [MISSING] `close_at` (unknown) — ref `docs/PARALEL.md:481`
- [MISSING] `AWARDED` (unknown) — ref `docs/PARALEL.md:482`
- [DONE] `auction_assets` (table) — ref `docs/PARALEL.md:489` · `packages/db/drizzle/0000_curly_bill_hollister.sql:15`
- [MISSING] `condition_notes` (unknown) — ref `docs/PARALEL.md:498`
- [MISSING] `spec_hash` (unknown) — ref `docs/PARALEL.md:504`
- [MISSING] `REJECTED` (unknown) — ref `docs/PARALEL.md:510`
- [MISSING] `SETTLED` (unknown) — ref `docs/PARALEL.md:510`
- [MISSING] `WITHDRAWN` (unknown) — ref `docs/PARALEL.md:510`
- [MISSING] `mileageKm` (unknown) — ref `docs/PARALEL.md:521`
- [MISSING] `propertyType` (unknown) — ref `docs/PARALEL.md:522`
- [MISSING] `landAreaM2` (unknown) — ref `docs/PARALEL.md:524`
- [MISSING] `buildingAreaM2` (unknown) — ref `docs/PARALEL.md:525`
- [MISSING] `certificateKind` (unknown) — ref `docs/PARALEL.md:526`
- [MISSING] `purchaseYear` (unknown) — ref `docs/PARALEL.md:528`
- [MISSING] `warrantyUntil` (unknown) — ref `docs/PARALEL.md:530`
- [MISSING] `modelEdition` (unknown) — ref `docs/PARALEL.md:532`
- [MISSING] `jewelryType` (unknown) — ref `docs/PARALEL.md:535`
- [MISSING] `metalType` (unknown) — ref `docs/PARALEL.md:536`
- [MISSING] `weightGram` (unknown) — ref `docs/PARALEL.md:538`
- [DONE] `auction_files` (table) — ref `docs/PARALEL.md:548` · `packages/db/drizzle/0000_curly_bill_hollister.sql:35`
- [MISSING] `PHOTO` (unknown) — ref `docs/PARALEL.md:555`
- [MISSING] `size_bytes` (unknown) — ref `docs/PARALEL.md:561`
- [MISSING] `content_hash` (unknown) — ref `docs/PARALEL.md:562`
- [MISSING] `storage_url` (unknown) — ref `docs/PARALEL.md:563`
- [MISSING] `from_status` (unknown) — ref `docs/PARALEL.md:579`
- [MISSING] `CREATED` (unknown) — ref `docs/PARALEL.md:579`
- [MISSING] `to_status` (unknown) — ref `docs/PARALEL.md:580`
- [MISSING] `actor_user_id` (unknown) — ref `docs/PARALEL.md:581`
- [MISSING] `tx_hash` (unknown) — ref `docs/PARALEL.md:583`
- [DONE] `confirmation_codes` (table) — ref `docs/PARALEL.md:586` · `packages/db/drizzle/0000_curly_bill_hollister.sql:165`
- [MISSING] `code_hash` (unknown) — ref `docs/PARALEL.md:592`
- [MISSING] `issued_by_notary` (unknown) — ref `docs/PARALEL.md:593`
- [MISSING] `emailed_at` (unknown) — ref `docs/PARALEL.md:595`
- [MISSING] `used_at` (unknown) — ref `docs/PARALEL.md:596`
- [MISSING] `signer_wallet` (unknown) — ref `docs/PARALEL.md:608`
- [MISSING] `submitted_tx_hash` (unknown) — ref `docs/PARALEL.md:611`
- [MISSING] `CONSIGNMENT` (unknown) — ref `docs/PARALEL.md:621`
- [MISSING] `COLLECTION` (unknown) — ref `docs/PARALEL.md:621`
- [MISSING] `WITHDRAWAL` (unknown) — ref `docs/PARALEL.md:621`
- [MISSING] `issued_at` (unknown) — ref `docs/PARALEL.md:622`
- [MISSING] `file_url` (unknown) — ref `docs/PARALEL.md:624`
- [MISSING] `OPEN` (unknown) — ref `docs/PARALEL.md:639`
- [MISSING] `bidder_wallet` (unknown) — ref `docs/PARALEL.md:640`
- [MISSING] `amount_added` (unknown) — ref `docs/PARALEL.md:641`
- [MISSING] `my_bid_after` (unknown) — ref `docs/PARALEL.md:642`
- [MISSING] `current_bid_after` (unknown) — ref `docs/PARALEL.md:643`
- [MISSING] `block_number` (unknown) — ref `docs/PARALEL.md:645`
- [MISSING] `tx_index` (unknown) — ref `docs/PARALEL.md:646`
- [MISSING] `log_index` (unknown) — ref `docs/PARALEL.md:647`
- [MISSING] `block_ts` (unknown) — ref `docs/PARALEL.md:648`
- [DONE] `bidder_stakes` (table) — ref `docs/PARALEL.md:654` · `packages/db/drizzle/0000_curly_bill_hollister.sql:114`
- [MISSING] `my_bid` (unknown) — ref `docs/PARALEL.md:662`
- [MISSING] `reached_seq` (unknown) — ref `docs/PARALEL.md:663`
- [MISSING] `ACTIVE` (unknown) — ref `docs/PARALEL.md:665`
- [MISSING] `PROVISIONAL` (unknown) — ref `docs/PARALEL.md:665`
- [MISSING] `DEFAULTED` (unknown) — ref `docs/PARALEL.md:665`
- [MISSING] `WINNER` (unknown) — ref `docs/PARALEL.md:665`
- [MISSING] `REFUNDABLE` (unknown) — ref `docs/PARALEL.md:665`
- [MISSING] `REFUNDED` (unknown) — ref `docs/PARALEL.md:665`
- [MISSING] `refund_claimed_tx` (unknown) — ref `docs/PARALEL.md:666`
- [MISSING] `CLOSED` (unknown) — ref `docs/PARALEL.md:669`
- [DONE] `awarding_attempts` (table) — ref `docs/PARALEL.md:671` · `packages/db/drizzle/0000_curly_bill_hollister.sql:97`
- [MISSING] `request_sent_at` (unknown) — ref `docs/PARALEL.md:680`
- [MISSING] `deadline_at` (unknown) — ref `docs/PARALEL.md:681`
- [MISSING] `SIGNED` (unknown) — ref `docs/PARALEL.md:682`
- [MISSING] `signed_at` (unknown) — ref `docs/PARALEL.md:683`
- [MISSING] `default_fee` (unknown) — ref `docs/PARALEL.md:684`
- [MISSING] `attestation_id` (unknown) — ref `docs/PARALEL.md:685`
- [DONE] `fee_config` (table) — ref `docs/PARALEL.md:693` · `packages/db/drizzle/0000_curly_bill_hollister.sql:175`
- [MISSING] `platform_bps` (unknown) — ref `docs/PARALEL.md:698`
- [MISSING] `guarantor_bps` (unknown) — ref `docs/PARALEL.md:699`
- [MISSING] `notary_bps` (unknown) — ref `docs/PARALEL.md:700`
- [MISSING] `tax_bps` (unknown) — ref `docs/PARALEL.md:701`
- [MISSING] `withdraw_fee` (unknown) — ref `docs/PARALEL.md:702`
- [MISSING] `effective_from` (unknown) — ref `docs/PARALEL.md:703`
- [MISSING] `recipient_role` (unknown) — ref `docs/PARALEL.md:717`
- [MISSING] `TAX` (unknown) — ref `docs/PARALEL.md:717`
- [MISSING] `CONSIGNOR` (unknown) — ref `docs/PARALEL.md:717`
- [MISSING] `recipient_wallet` (unknown) — ref `docs/PARALEL.md:718`
- [MISSING] `REFUND` (unknown) — ref `docs/PARALEL.md:734`
- [MISSING] `gross_amount` (unknown) — ref `docs/PARALEL.md:735`
- [MISSING] `net_amount` (unknown) — ref `docs/PARALEL.md:737`
- [MISSING] `TELEGRAM` (unknown) — ref `docs/PARALEL.md:753`
- [MISSING] `EMAIL` (unknown) — ref `docs/PARALEL.md:753`
- [MISSING] `WEB` (unknown) — ref `docs/PARALEL.md:753`
- [MISSING] `OUTBID` (unknown) — ref `docs/PARALEL.md:754`
- [MISSING] `QUEUED` (unknown) — ref `docs/PARALEL.md:756`
- [MISSING] `SENT` (unknown) — ref `docs/PARALEL.md:756`
- [MISSING] `sent_at` (unknown) — ref `docs/PARALEL.md:757`
- [DONE] `feed_posts` (table) — ref `docs/PARALEL.md:762` · `packages/db/drizzle/0000_curly_bill_hollister.sql:186`
- [MISSING] `UPCOMING` (unknown) — ref `docs/PARALEL.md:769`
- [MISSING] `APP` (unknown) — ref `docs/PARALEL.md:770`
- [MISSING] `external_id` (unknown) — ref `docs/PARALEL.md:771`
- [MISSING] `posted_at` (unknown) — ref `docs/PARALEL.md:772`
- [MISSING] `chain_id` (unknown) — ref `docs/PARALEL.md:785`
- [MISSING] `event_name` (unknown) — ref `docs/PARALEL.md:790`
- [DONE] `AuctionRegistered` (event) — ref `docs/PARALEL.md:790` · `contracts/src/ParalelAuction.sol:128`
- [DONE] `BidPlaced` (event) — ref `docs/PARALEL.md:790` · `contracts/src/ParalelAuction.sol:130`
- [DONE] `AwardingStarted` (event) — ref `docs/PARALEL.md:790` · `contracts/src/ParalelAuction.sol:132`
- [DONE] `Defaulted` (event) — ref `docs/PARALEL.md:790` · `contracts/src/ParalelAuction.sol:134`
- [DONE] `Collected` (event) — ref `docs/PARALEL.md:790` · `contracts/src/ParalelAuction.sol:136`
- [DONE] `Settled` (event) — ref `docs/PARALEL.md:790` · `contracts/src/ParalelAuction.sol:141`
- [MISSING] `AWARDING` (unknown) — ref `docs/PARALEL.md:814`
- [MISSING] `platformWallet` (unknown) — ref `docs/PARALEL.md:834`
- [MISSING] `taxWallet` (unknown) — ref `docs/PARALEL.md:834`
- [MISSING] `relayerWallet` (unknown) — ref `docs/PARALEL.md:835`
- [MISSING] `allowedIncrements` (unknown) — ref `docs/PARALEL.md:837`
- [MISSING] `withdrawFee` (unknown) — ref `docs/PARALEL.md:838`
- [MISSING] `Auction` (unknown) — ref `docs/PARALEL.md:842`
- [MISSING] `auctionKey` (unknown) — ref `docs/PARALEL.md:842`
- [MISSING] `currentRound` (unknown) — ref `docs/PARALEL.md:851`
- [MISSING] `specHash` (unknown) — ref `docs/PARALEL.md:852`
- [MISSING] `platformBps` (unknown) — ref `docs/PARALEL.md:853`
- [MISSING] `guarantorBps` (unknown) — ref `docs/PARALEL.md:853`
- [MISSING] `notaryBps` (unknown) — ref `docs/PARALEL.md:853`
- [MISSING] `taxBps` (unknown) — ref `docs/PARALEL.md:853`
- [MISSING] `Round` (unknown) — ref `docs/PARALEL.md:855`
- [MISSING] `startingBid` (unknown) — ref `docs/PARALEL.md:859`
- [MISSING] `bidIncrement` (unknown) — ref `docs/PARALEL.md:860`
- [MISSING] `openAt` (unknown) — ref `docs/PARALEL.md:861`
- [MISSING] `closeAt` (unknown) — ref `docs/PARALEL.md:862`
- [MISSING] `currentLeader` (unknown) — ref `docs/PARALEL.md:864`
- [MISSING] `bidSeq` (unknown) — ref `docs/PARALEL.md:865`
- [MISSING] `topRanks` (unknown) — ref `docs/PARALEL.md:866`
- [MISSING] `reachedSeq` (unknown) — ref `docs/PARALEL.md:866`
- [MISSING] `awardingIndex` (unknown) — ref `docs/PARALEL.md:867`
- [MISSING] `awardingDeadline` (unknown) — ref `docs/PARALEL.md:868`
- [MISSING] `winnerStake` (unknown) — ref `docs/PARALEL.md:870`
- [MISSING] `collectionDeadline` (unknown) — ref `docs/PARALEL.md:871`
- [MISSING] `claimPeriodEnd` (unknown) — ref `docs/PARALEL.md:872`
- [MISSING] `Stake` (unknown) — ref `docs/PARALEL.md:874`
- [DONE] `RoundScheduled` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:129`
- [DONE] `Closed` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:131`
- [DONE] `AwardSigned` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:133`
- [DONE] `PassedIn` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:135`
- [DONE] `ClaimPeriodStarted` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:137`
- [DONE] `WithdrawnItem` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:138`
- [DONE] `FeeCredited` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:139`
- [DONE] `Withdrawal` (event) — ref `docs/PARALEL.md:883` · `contracts/src/ParalelAuction.sol:140`
- [MISSING] `NotaryApproval` (unknown) — ref `docs/PARALEL.md:897`
- [MISSING] `ConsignorConfirm` (unknown) — ref `docs/PARALEL.md:898`
- [MISSING] `AwardSign` (unknown) — ref `docs/PARALEL.md:899`
- [MISSING] `WithdrawRequest` (unknown) — ref `docs/PARALEL.md:900`
- [MISSING] `Withdrawn` (unknown) — ref `docs/PARALEL.md:901`

### `docs/TECH_STACK.md`
- [DONE] `chain_events` (table) — ref `docs/TECH_STACK.md:94` · `packages/db/drizzle/0000_curly_bill_hollister.sql:152`
- [DONE] `bidder_stakes` (table) — ref `docs/TECH_STACK.md:94` · `packages/db/drizzle/0000_curly_bill_hollister.sql:114`
- [MISSING] `NUL` (unknown) — ref `docs/TECH_STACK.md:104`
- [MISSING] `document_number` (unknown) — ref `docs/TECH_STACK.md:104`

## Next actions


## Env keys

- `PRIVATE_KEY`
- `ARBITRUM_RPC_URL`
- `USDC_ADDRESS`
- `PLATFORM_WALLET`
- `TAX_WALLET`
- `RELAYER_WALLET`
- `DATABASE_URL`
- `ARBITRUM_RPC_URL`
- `AUCTION_CONTRACT_ADDRESS`
- `RELAYER_PRIVATE_KEY`
- `DATABASE_URL`
- `ARBITRUM_RPC_URL`
- `AUCTION_CONTRACT_ADDRESS`

## Config files

- `tsconfig.json`
- `drizzle.config.ts`
- `package.json`
- `context.config.json`

## Known TODO

- `apps/web/src/app/favicon.ico:1` —     00     �%  6          �  �%       h  �6  (   0   `           $                                                                
- `apps/web/src/app/favicon.ico:4` — �   �   �   �   �   �   �   �   �   �   �   �   �   �   o   �   �   �   �   �   �   �   �   �   �   �   �   ��������������������������������
- `scripts/context/build.ts:108` — // ---------- TODO scan ----------
- `scripts/context/build.ts:114` — if (/\b(TODO|FIXME|XXX)\b|unimplemented!|todo!/.test(lines[i])) {
- `scripts/context/build.ts:127` — return /unimplemented!|todo!|throw new Error\(['"]not implemented|TODO:\s*implement/i.test(c);
- `scripts/context/build.ts:420` — L.push('## Known TODO');
