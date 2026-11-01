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