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
