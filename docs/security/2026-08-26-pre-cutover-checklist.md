# Checklist Pra-Penguncian Keamanan Santriva

Dokumen ini adalah gerbang terakhir sebelum RLS dan pembatasan akses tabel diaktifkan. Jangan menjalankan migrasi cutover bila satu pemeriksaan wajib belum lulus.

## Identitas pengujian

- Commit frontend yang diuji (harus memuat `ead0cdd`): ______________________________
- Branch: `security-hardening`
- URL preview: ______________________________
- Nama penguji: ______________________________
- Mulai pengujian (tanggal dan jam): ______________________________
- Selesai pengujian (tanggal dan jam): ______________________________

## A. Pemeriksaan otomatis lokal

- [ ] `npm ci` selesai tanpa error.
- [ ] `npm run test:run` lulus seluruhnya; catat jumlah: ______ test.
- [ ] `npm run build` selesai tanpa error.
- [ ] Scan source tidak menemukan credential lama pada alur aktif.
- [ ] Utang lint lama dicatat terpisah dan tidak bertambah karena Task 8.

Catatan hasil:

```text

```

## B. Preview dan environment

- [ ] Preview berasal dari commit frontend yang dicatat di atas pada branch `security-hardening`.
- [ ] Preview memakai `VITE_SUPABASE_URL` yang benar.
- [ ] Preview memakai `VITE_SUPABASE_ANON_KEY`.
- [ ] Tidak ada `service_role` key di Vercel, source, browser, atau output build.
- [ ] Production belum diganti oleh preview ini.

URL dan catatan:

```text

```

## C. Portal wali `/s#TOKEN`

- [ ] Token valid membuka hanya satu santri yang sesuai.
- [ ] NIK dan NISN ditampilkan tersamarkan.
- [ ] Token salah menampilkan pesan umum yang sama dengan token nonaktif.
- [ ] Buat ulang tautan menghasilkan token baru.
- [ ] Tautan lama tidak dapat dipakai setelah dibuat ulang.
- [ ] Nonaktifkan akses membuat token berhenti bekerja.
- [ ] Aktifkan kembali akses bekerja tanpa menghapus data santri.
- [ ] Usulan perubahan masuk ke antrean dan tidak langsung mengubah tabel `santri`.

Token uji jangan ditulis di dokumen ini. Catatan:

```text

```

## D. Pencarian wali/alumni `/cek-data`

- [ ] Pencarian dua huruf ditolak.
- [ ] Pencarian tiga huruf diterima.
- [ ] Semua hasil tersedia melalui halaman berisi maksimal 20 hasil.
- [ ] Hasil hanya menampilkan nama, status, tahun, kelas/asrama, desa, kecamatan, dan kabupaten/kota.
- [ ] Alamat jalan, RT/RW, NIK, NISN, tanggal lahir, nomor HP, dan UUID tidak tampil pada hasil.
- [ ] Ringkasan detail tetap tersamarkan.
- [ ] Koreksi mewajibkan nama pengaju, hubungan, dan nomor WhatsApp pengaju.
- [ ] Permintaan akses tidak mengirim koreksi data.
- [ ] Pengajuan masuk antrean admin dan tidak langsung mengubah data santri.

Kata pencarian uji dan catatan:

```text

```

## E. Pendaftaran publik `/pendaftaran`

- [ ] Halaman hanya menyediakan pendaftaran santri baru.
- [ ] Tidak ada pencarian atau pembukaan data santri lama.
- [ ] Parameter `?edit=` tidak membuka mode edit.
- [ ] Pendaftaran masuk sebagai pengajuan `Baru` dan `Menunggu`.
- [ ] Data baru belum masuk tabel `santri` sebelum disetujui admin.

Catatan:

```text

```

## F. Pemeriksaan respons jaringan browser

Buka Developer Tools (`F12`) → **Network** → pilih **Fetch/XHR**, kemudian ulangi portal dan pencarian publik.

- [ ] Respons pencarian tidak mengandung `santri_id` atau UUID santri.
- [ ] Respons pencarian tidak mengandung alamat jalan lengkap.
- [ ] Respons ringkasan tidak mengandung NIK, NISN, atau nomor HP lengkap.
- [ ] Respons portal tidak mengandung nilai sensitif lengkap yang seharusnya disamarkan.
- [ ] Token portal tidak muncul pada URL sebelum tanda `#`, log console, atau referrer.
- [ ] Tidak ada request publik langsung ke REST tabel `santri`, `pengajuan_santri`, `log_pelanggaran`, `santri_catatan`, atau `santri_prestasi`.

Catatan pemeriksaan Network:

```text

```

## G. Akun, role, dan admin

- [ ] Akun tanpa profil hanya dapat mendaftarkan profil sendiri.
- [ ] Akun `Menunggu` tidak dapat membuka data aplikasi.
- [ ] Akun `Ditolak` tidak dapat membuka data aplikasi.
- [ ] `akses_induk` dapat membaca buku induk, tetapi tidak otomatis dapat mengubah atau menghapus.
- [ ] `edit_induk` dapat menambah/mengubah, tetapi tidak dapat menghapus tanpa `hapus_induk`.
- [ ] `hapus_induk` menampilkan dan mengizinkan aksi hapus.
- [ ] `validasi_pengajuan` dapat menyetujui/menolak melalui satu proses review.
- [ ] `akses_takziran` hanya menerima identitas minimum santri.
- [ ] `input_takziran` dapat mengelola data takziran.
- [ ] `kelola_pengguna` dapat mengelola role dan pengguna melalui RPC.
- [ ] Pengguna tidak dapat mengubah role atau status dirinya sendiri.
- [ ] Role Super Admin tidak dapat dihapus.
- [ ] Super Admin aktif terakhir tidak dapat dinonaktifkan.
- [ ] Review permintaan akses menghasilkan tautan untuk disalin manual, bukan dikirim otomatis.

Akun/role uji dan catatan tanpa menulis password:

```text

```

## H. Pemeriksaan database pra-cutover

Jalankan `database/tests/20260826_04_pre_cutover_verification.sql` utuh di Supabase SQL Editor.

- [ ] Hasil akhir adalah `PRE_CUTOVER_VERIFICATION_OK`.
- [ ] Seluruh fungsi wajib tersedia dan dimiliki owner tepercaya.
- [ ] Seluruh fungsi `SECURITY DEFINER` memakai `search_path` aman.
- [ ] Grant RPC anon/authenticated sesuai kontrak.
- [ ] Seluruh policy baru sudah tersedia dalam keadaan staged.
- [ ] RLS masih belum aktif sebelum cutover.
- [ ] Tabel dan kolom fondasi keamanan lengkap.
- [ ] Jumlah data tidak lebih kecil dari baseline 27 Agustus 2026.
- [ ] Minimal dua Super Admin aktif masih tersedia pada baseline pra-cutover.

Salin hasil akhir SQL tanpa data sensitif:

```text

```

## HARD GATE

- [ ] Semua kotak wajib A–H sudah lulus.
- [ ] Tidak ada error terbuka yang belum dijelaskan.
- [ ] Backup `D:\Backup\santriva-before-security-2026-08-27.zip` masih tersedia dan dapat dibuka.
- [ ] Commit preview yang diuji sama dengan commit yang akan dipakai saat cutover.
- [ ] Saya menyatakan Task 8 lulus dan mengizinkan penyusunan Task 9; ini belum berarti menjalankan cutover.

Nama: ______________________________

Tanggal dan jam: ______________________________

Keputusan: **LULUS / BERHENTI**

## Lampiran: klasifikasi hasil scan source

| Temuan | Klasifikasi |
|---|---|
| `src/types/index.ts` dan fixture test masih menyebut `kode_unik` | Kompatibilitas data lama saja; tidak dipakai sebagai credential atau tautan. |
| `?edit=` pada `CekDataPublik.test.tsx` | Test regresi untuk memastikan mode edit publik lama ditolak. |
| Query langsung pada `SantriPage.tsx` | Akses pengguna login; akan dibatasi policy `akses_induk`, `edit_induk`, dan `hapus_induk`. |
| Query langsung pada `TakziranDashboard.tsx` | Hanya log/master jenis; akan dibatasi policy `akses_takziran` dan `input_takziran`. Daftar santri memakai RPC minimum. |
| Query langsung pada `AdminReview.tsx` | Hanya membaca antrean sesuai policy; keputusan review memakai RPC atomik. |
| Query langsung pada `PengaturanSistem.tsx` | Hanya membaca role/pengguna; seluruh mutasi memakai RPC admin. |
| `SantriForm.tsx` dan `SantriList.tsx` | Komponen lama tidak terpakai dan dihapus pada Task 8 karena masih memuat akses/token lama. |
