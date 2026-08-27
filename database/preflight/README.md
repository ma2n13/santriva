# Santriva Security Preflight

Folder ini menyimpan inventaris baca-saja dan hasil pemeriksaan sebelum migrasi keamanan dijalankan.

## Backup awal

- Waktu ekspor data: 27 Agustus 2026, sekitar 07.05–07.18 waktu komputer pengelola.
- Lokasi lokal: `D:\Backup\santriva-before-security-2026-08-26`.
- Arsip lokal: `D:\Backup\santriva-before-security-2026-08-27.zip`.
- Backup otomatis Supabase: tidak tersedia.
- Tabel berisi data diekspor dari Supabase sebagai CSV.
- `santri_catatan`, `santri_prestasi`, dan `manage_users` terverifikasi kosong; file CSV-nya hanya memuat header.
- Pemulihan data dilakukan dengan membuat struktur database terlebih dahulu, lalu mengimpor CSV sesuai urutan dependensi dan memeriksa foreign key sebelum aplikasi dibuka kembali.
- File backup memuat data pribadi dan tidak boleh dimasukkan ke Git atau dibagikan melalui kanal publik.

## Menjalankan inventaris

1. Buka `20260826_security_inventory.sql` di VS Code.
2. Salin satu bagian bernomor ke Supabase SQL Editor.
3. Jalankan bagian tersebut tanpa menggabungkannya dengan migrasi.
4. Unduh hasilnya sebagai CSV ke `database/preflight/results/`.
5. Gunakan nama hasil berikut:

   - `01_columns.csv`
   - `02_constraints.csv`
   - `03_indexes.csv`
   - `04_rls.csv`
   - `05_policies.csv`
   - `06a_schema_privileges.csv`
   - `06b_relation_privileges.csv`
   - `07a_functions.csv`
   - `07b_function_privileges.csv`
   - `08_default_privileges.csv`
   - `09_application_roles.csv`
   - `10_active_super_admin.csv`
   - `11_triggers.csv`
   - `12_row_counts.csv`

## Gerbang sebelum migrasi

Jangan menjalankan migrasi apabila:

- salah satu bagian inventaris gagal;
- hasil menunjukkan struktur berbeda dari source yang diaudit;
- jumlah Super Admin aktif adalah nol;
- backup tidak dapat dibuka;
- ada perubahan database yang belum dipahami.

RLS dan penguncian grants baru dilakukan setelah frontend pengganti lulus pengujian preview.

## Task 2 — fondasi keamanan aditif

Task 2 menambahkan tempat penyimpanan privat dan antrean baru tanpa mengaktifkan RLS atau menghapus akses lama. Aplikasi produksi lama tetap dapat berjalan setelah tahap ini.

File yang digunakan:

- `../tests/20260826_01_security_foundation_test.sql`
- `../migrations/20260826_01_security_foundation.sql`

Urutan wajib di Supabase SQL Editor:

1. Jalankan file test. Sebelum migrasi, hasilnya **harus gagal** dengan pesan `FOUNDATION_TEST_FAILED`. Ini membuktikan test mampu mendeteksi bahwa fondasi belum ada.
2. Jalankan file migration. Hasil akhirnya harus menampilkan `SECURITY_FOUNDATION_APPLIED` dengan jumlah santri, pengajuan, dan pengguna yang tidak berkurang.
3. Jalankan kembali file test. Hasil akhirnya harus menampilkan `SECURITY_FOUNDATION_TEST_OK`.
4. Jika migration menampilkan `MIGRATION_ABORTED`, jangan menjalankan SQL lain. Seluruh transaksi akan dibatalkan otomatis; simpan pesan error untuk diperiksa.

Migrasi ini sengaja tidak melakukan hal berikut:

- tidak menjalankan `DROP`, `TRUNCATE`, atau `DELETE`;
- tidak memperbarui baris pada tabel `santri`;
- tidak mengaktifkan RLS;
- tidak menghapus policy lama;
- tidak membuka tabel privat kepada `anon` atau `authenticated`.

Nilai lama pada `pengajuan_santri` diberi sumber `legacy`. Catatan santri lama diberi `tampil_ke_wali = false`, sehingga tidak otomatis terlihat oleh wali. Permission baru `hapus_induk` hanya ditambahkan kepada role Super Admin.
