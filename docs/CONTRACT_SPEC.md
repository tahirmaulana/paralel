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
- **Off-chain context (tidak mengubah kontrak):** `p.notary` di-supply oleh backend sebagai **wallet notary yang berhasil sign** di shared queue (lihat PARALEL.md §4.1). `p.confirmationCodeHash` di-supply backend sesuai formula derivasi (PARALEL.md Lampiran D11.3), bukan dibuat notary atau frontend. Kontrak tetap hanya memverifikasi signature valid dari wallet notary yang terdaftar.

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
- **Off-chain follow-up:** on-chain hanya menyimpan `winner` dan `winnerStake`. **E-Certificate di-generate oleh backend off-chain** sebagai output dari `AwardSigned` event. Kontrak tidak memiliki fungsi untuk generate e-certificate (lihat PARALEL.md §4.1.2).

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
- **Off-chain context (tidak mengubah kontrak):** sebelum memanggil `collected`, guarantor mencetak **collectionReceipt** (form fisik) yang ditandatangani winner. Form fisik ini dipegang guarantor sebagai bukti hukum serah terima barang. Sistem tidak enforce physical signature — guarantor bertanggung jawab operasional untuk tidak memanggil `collected` sebelum memegang form bertanda tangan. `collectionReceipt` adalah **dokumen fisik untuk guarantor**, bukan untuk winner; winner menerima e-Certificate (backend, di luar kontrak — §4.1.2 PARALEL.md).

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
- **UI usage (notary dashboard):** membaca `claimableOf(notaryWallet)` on-chain via view call, dan memanggil `withdrawClaimable()` **direct dari wallet notary** (bukan via relayer, bayar gas sendiri, tanpa Withdrawal Fee). Konsisten dengan PARALEL.md §21.1.

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
- **Off-chain context (tidak mengubah kontrak):** sebelum memanggil `markWithdrawn`, guarantor mencetak **withdrawalReceipt** untuk consignor yang menarik barang. Form ini mereferensikan `consignmentReceipt` awal (bukti barang yang di-consign = barang yang ditarik). Sama seperti `collected`, sistem tidak enforce physical signature — guarantor bertanggung jawab operasional.

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
- E-Certificate generation (off-chain, backend). Kontrak tidak menyimpan atau menghasilkan e-certificate.

## 9. Klarifikasi (sudah disetujui dan sudah diterapkan di PARALEL.md)

Butir berikut muncul saat menurunkan PARALEL.md menjadi fungsi dan sudah disetujui pemilik proyek:

1. **Partner registry** (§2): `owner` mendaftarkan wallet notary dan guarantor.
2. **`permit` USDC** (§3.3): bid memakai `permit` agar bidder tidak perlu transaksi `approve` terpisah (jika tidak, bid memerlukan dua transaksi yang gasnya dibayar user). Perlu dipastikan USDC di Arbitrum mendukung `permit`.
3. **OPEN diturunkan dari waktu** (§1, §3.1): tidak ada transaksi trigger untuk membuka lelang; CLOSED tercatat saat `startAwarding`. Ini mengubah PARALEL.md §14 yang menyebut "transisi OPEN/CLOSED" sebagai trigger.
4. **Penarikan saldo penerima commission/tax** (§3.11) adalah panggilan langsung dari wallet penerima, tanpa pesan bertanda tangan. Ini berarti `FeeWithdrawRequest` di PARALEL.md Lampiran D10.7 dihapus.
5. **Hitungan 5 menit untuk kandidat berikutnya** dimulai saat `advanceCandidate` dicatat (bukan sambungan dari batas kandidat sebelumnya), sehingga keterlambatan keeper tidak memotong waktu kandidat berikutnya; konsekuensinya total kasus terburuk bisa sedikit lebih dari 50 menit.
6. **Withdrawal Fee masuk ke `claimable[platformWallet]`** (menjadi pendapatan platform, bukan dikirim langsung ke relayer).