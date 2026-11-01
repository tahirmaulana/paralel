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
7. **Nominal uang** disimpan sebagai bilangan bulat (integer) dalam satuan terkecil token (USDC punya 6 desimal: 0.5 USDC = `500000`).

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
1. Arbiter legal.
2. Menandatangani digital status APPROVED dari guarantor (tanda tangan ini yang membuat auctionID bisa masuk SCHEDULED) dan menerbitkan confirmationCode.
3. Menerbitkan e-certificate legal yang ditandatangani digital sebagai **output untuk winner** (khusus otomotif dan properti): kepastian hukum bahwa kepemilikan beralih lewat lelang. Ini bukan input dari consignor.
4. Menerbitkan kutipan pajak dan mengurus mekanisme pembayaran pajak.

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

- **COLLECTION:** winner wajib datang ke guarantor dengan tenggat **48 jam sejak signing**. Saat winner datang, guarantor memberi status **COLLECTED** (digitally signed) dan mencetak **collectionReceipt**. Notary menerbitkan e-certificate untuk winner (otomotif/properti).
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
| Tax | 10% | wallet tax (disetor notary/off-chain) |
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
| Nominal uang | `BIGINT` dalam satuan terkecil token. USDC punya 6 desimal: 0.5 USDC = `500000`, 5,000 USDC = `5000000000`. Tidak pernah memakai `FLOAT`/`NUMERIC` desimal. Format tampilan: internasional (koma ribuan, titik desimal). |
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
