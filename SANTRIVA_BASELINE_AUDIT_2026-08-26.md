# Baseline & Audit Proyek Santriva

**Tanggal audit:** 26 Agustus 2026 (Asia/Jakarta)  
**Repository:** `ma2n13/santriva`  
**Branch:** `main`  
**Commit yang diaudit:** [`ba9a128f6a2549b768aec31e820f19c66e1da452`](https://github.com/ma2n13/santriva/commit/ba9a128f6a2549b768aec31e820f19c66e1da452) — *Add Supabase database structure*  
**Dokumen pembanding:** `PROJECT_HANDOFF.md`, 310 baris, SHA-256 `3839385ce5de25e321cdbe48bb8352313e193089947eed00820684155dd5d28d`

## Ringkasan Eksekutif

Repository aktual bukan aplikasi absensi akademik tujuh jam yang digambarkan dalam `PROJECT_HANDOFF.md`. Kondisi aktual adalah aplikasi **SIM Santri / Santriva** untuk buku induk santri, pendaftaran dan usulan perubahan data, review admin, portal wali/santri, kedisiplinan/takziran, serta pengelolaan pengguna dan role.

Fondasi React–Supabase sudah dapat dikompilasi, tetapi proyek belum layak dianggap aman atau stabil untuk produksi. Temuan terpenting:

1. **RLS nonaktif pada seluruh sembilan tabel** menurut ekspor database. Empat policy yang ada tidak aktif; bahkan policy `pengajuan_santri` memberikan `ALL` kepada role PostgreSQL `public` dengan kondisi `true`.
2. Proteksi role terutama berada di frontend. Permission `edit_induk` dan `input_takziran` didefinisikan tetapi tidak pernah dipakai untuk membatasi tombol atau mutasi. Pengguna yang boleh melihat modul juga memperoleh seluruh kontrol tulis di modul tersebut, jika database mengizinkannya.
3. Portal publik memiliki beberapa ketidakcocokan pasti dengan database: memakai kolom `nama` yang tidak ada pada `santri_catatan` dan `santri_prestasi`; mengirim `nama_santri` yang tidak ada; tidak mengirim `jenis_pengajuan` yang wajib; dan membawa `foto_profil` yang tidak ada pada tabel `santri` ketika pengajuan disetujui.
4. Halaman Buku Induk menautkan `/admin-review`, sedangkan route aktual adalah `/review`. Tombol WhatsApp menautkan `/wali?id=...`, tetapi route `/wali` tidak tersedia.
5. Modul keuangan portal menampilkan **“Lunas Tanpa Tunggakan” secara statis** tanpa query database. Ini bukan data keuangan aktual.
6. `npm ci` gagal pada npm 10 dan npm 11 karena `package-lock.json` tidak sinkron. Build sekunder berhasil setelah dependency dipasang tanpa memakai lockfile; lint gagal dengan **111 error dan 1 warning**; tidak ada test.
7. `PROJECT_HANDOFF.md` sebagian besar berasal dari proyek atau rancangan lain: struktur `src/features`, `AuthContext`, tabel akademik, jadwal, TanStack Query, shadcn/ui, trigger profil, dan RLS penuh tidak ditemukan pada kode/database aktual.

Tidak ada kode repository yang diubah selama audit.

---

## 1. Gambaran Aplikasi

### Tujuan aktual

Aplikasi aktual adalah sistem informasi manajemen santri untuk Pondok Pesantren Daruttauhid Al-'Alawiyyah Jepara. Fokus yang benar-benar terlihat dalam kode adalah:

- pengelolaan buku induk dan identitas santri;
- input manual, edit massal, hapus massal, dan import data;
- pendaftaran santri baru serta usulan pembaruan data melalui halaman publik;
- review dan persetujuan pengajuan oleh pengurus;
- portal publik per santri untuk profil, kedisiplinan, catatan, prestasi, dan tampilan keuangan sementara;
- input pelanggaran/ketidakhadiran massal dan penyelesaian takziran;
- pengelolaan role, permission, serta approval akun pengguna.

### Pengguna

| Kelompok | Cara masuk | Fungsi aktual |
|---|---|---|
| Pengurus/staf | Google OAuth melalui Supabase Auth | Mengakses modul internal sesuai permission role di frontend |
| Super Admin/pengelola pengguna | Google OAuth + profil `pengguna` aktif dengan permission `kelola_pengguna` | Mengelola role dan status akun |
| Pendaftar/wali | Tanpa login melalui `/pendaftaran` | Mengirim data baru atau usulan pembaruan |
| Wali/pengunjung portal | Tanpa login melalui `/s/:kode` | Melihat informasi santri dan mengusulkan pembaruan profil |

### Hubungan antarmodul

- `santri` menjadi tabel pusat.
- `pengajuan_santri` menampung pengajuan publik/portal sebelum admin menyalinnya ke `santri`.
- `log_pelanggaran` menghubungkan `santri` dengan `master_jenis`.
- `santri_catatan` dan `santri_prestasi` seharusnya terhubung melalui `santri_id`, tetapi query portal saat ini memakai nama santri.
- `pengguna` menghubungkan akun Supabase Auth dengan `master_role`.

Tidak ditemukan modul guru, kelas akademik, mapel, jadwal pelajaran, sesi absensi akademik, atau rekap kehadiran tujuh jam per hari.

---

## 2. Stack Teknologi

Sumber: [`package.json`](https://github.com/ma2n13/santriva/blob/ba9a128f6a2549b768aec31e820f19c66e1da452/package.json), [`package-lock.json`](https://github.com/ma2n13/santriva/blob/ba9a128f6a2549b768aec31e820f19c66e1da452/package-lock.json), dan konfigurasi repository.

| Area | Teknologi aktual |
|---|---|
| Frontend | React 19, React DOM 19, TypeScript |
| Bundler/dev server | Vite 8 + `@vitejs/plugin-react` |
| Routing | React Router DOM 7 dengan `BrowserRouter` |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer; banyak utility class langsung di komponen |
| Backend/API | Supabase JavaScript client ke PostgREST dan Supabase Auth; tidak ada backend server lokal |
| Database | PostgreSQL di Supabase |
| Authentication | Google OAuth melalui Supabase Auth |
| Import | Papa Parse pada halaman aktif; `xlsx` hanya dipakai oleh komponen lama yang tidak dirender |
| Ikon | `lucide-react` |
| Deployment | SPA di Vercel; `vercel.json` me-rewrite semua path ke `index.html` |
| Layanan wilayah | API Wilayah Indonesia `emsifa.com` |
| WhatsApp | Deep link `wa.me`, bukan WhatsApp API |

Versi direct dependency yang terkunci antara lain: Supabase JS `2.110.9`, React/React DOM `19.2.8`, React Router DOM `7.18.2`, Papa Parse `5.5.4`, `xlsx` `0.18.5`, TypeScript `6.0.3`, dan Vite `8.1.5`.

Hal yang **tidak ditemukan**: shadcn/ui, TanStack Query, Firebase, Redux/Zustand, path alias, server function, Edge Function, cron, webhook, test framework, atau CI GitHub Actions.

### Environment variable

Kode tidak mereferensikan `import.meta.env` atau `process.env`. URL Supabase dan anon key ditulis langsung dalam [`src/lib/supabase.ts`](https://github.com/ma2n13/santriva/blob/ba9a128f6a2549b768aec31e820f19c66e1da452/src/lib/supabase.ts).

Anon key memang dirancang untuk berada di aplikasi browser dan bukan service-role secret. Masalah utamanya adalah pemisahan environment/rotasi konfigurasi dan, terutama, ketergantungan mutlak pada RLS/grant yang saat ini belum aman atau belum lengkap buktinya.

---

## 3. Struktur Proyek

Struktur aktual bersifat sederhana dan berpusat pada komponen, bukan Feature-Driven Architecture.

| Path | Fungsi | Status/kritis |
|---|---|---|
| `src/main.tsx` | Entry point React dan `StrictMode` | Kritis |
| `src/App.tsx` | Router, session, profil pengguna, onboarding akun, layout, dan RBAC frontend | Sangat kritis; terlalu banyak tanggung jawab |
| `src/lib/supabase.ts` | Membuat satu Supabase client | Sangat kritis |
| `src/types/index.ts` | Interface `Santri` manual | Kritis, tetapi belum sinkron penuh dengan DB |
| `src/components/SantriPage.tsx` | Buku induk, CRUD, bulk edit/delete, import, pagination, link portal | Sangat kritis; 850 baris |
| `src/components/PublicPendaftaran.tsx` | Form publik data baru/update | Kritis karena akses publik dan PII |
| `src/components/AdminReview.tsx` | Review lalu insert/update `santri` | Sangat kritis terhadap integritas data |
| `src/components/PortalSantri.tsx` | Portal publik santri/wali | Sangat kritis; beberapa kontrak DB salah |
| `src/components/TakziranDashboard.tsx` | Input, tunggakan, riwayat, master jenis | Sangat kritis; read/write tercampur |
| `src/components/PengaturanSistem.tsx` | Role/permission dan approval akun | Sangat kritis terhadap authorization |
| `src/components/LoginPage.tsx` | Tombol Google OAuth | Kritis |
| `database/*.csv` | Ekspor kolom, constraint, index, policy, dan status RLS | Sumber kebenaran DB yang tersedia |
| `vercel.json` | Fallback SPA | Kritis untuk routing produksi |

### File tidak terhubung ke aplikasi aktif

- `src/components/SantriForm.tsx` dan `src/components/SantriList.tsx` tidak di-import oleh file aktif. Keduanya tampak sebagai implementasi lama/duplikat.
- `src/App.css` tidak di-import.
- `src/assets/hero.png`, `react.svg`, dan `vite.svg` tidak dipakai.
- `xlsx` hanya di-import oleh `SantriForm.tsx`, sehingga tidak ditemukan pada bundle produksi hasil audit.

Tidak ditemukan folder `hooks`, `context`, `store`, `services`, `api`, `server`, atau `functions`. Hook debounce dibuat lokal di `SantriPage.tsx`; seluruh query Supabase dipanggil langsung dari komponen.

---

## 4. Routing dan Navigasi

Sumber: [`src/App.tsx`](https://github.com/ma2n13/santriva/blob/ba9a128f6a2549b768aec31e820f19c66e1da452/src/App.tsx).

| Path | Komponen | Akses menurut kode | Catatan |
|---|---|---|---|
| `/pendaftaran` | `PublicPendaftaran` | Publik, tanpa login | Membaca/mencari `santri` dan insert `pengajuan_santri` |
| `/s/:kode` | `PortalSantri` | Publik, tanpa login | `kode` dapat berupa UUID, `kode_unik`, atau NIS |
| `/` | `SantriPage` | Login, akun `Aktif`, punya `role_id`, permission `akses_induk` | Semua tombol edit/import/delete tetap tampil; `edit_induk` tidak diperiksa |
| `/review` | `AdminReview` | Sama + `validasi_pengajuan` | Review pengajuan |
| `/takziran` | `TakziranDashboard` | Sama + `akses_takziran` | Semua fungsi tulis tetap tersedia; `input_takziran` tidak diperiksa |
| `/pengaturan` | `PengaturanSistem` | Sama + `kelola_pengguna` | Role dan approval akun |
| route internal lain | Pesan “tidak memiliki hak akses” | Pengguna internal | Tidak ada redirect otomatis |

### Route/link bermasalah

1. `SantriPage` menggunakan `<Link to="/admin-review">`, tetapi route yang terdaftar adalah `/review`. Tombol lonceng antrean membuka halaman tidak berizin/tidak ditemukan.
2. `TakziranDashboard` membuat link `/wali?id=<uuid>`, tetapi tidak ada route `/wali`. Route portal yang benar secara struktur adalah `/s/:kode`.
3. Sidebar `/review` sendiri benar; bug hanya terdapat pada tombol lonceng di Buku Induk.

---

## 5. Authentication dan Authorization

### Alur login dan session

1. `LoginPage` menjalankan `supabase.auth.signInWithOAuth({ provider: 'google' })` dan kembali ke `window.location.origin`.
2. `App` memanggil `supabase.auth.getSession()` saat mount.
3. `onAuthStateChange` menjaga session ketika login/logout berubah.
4. Untuk session aktif, aplikasi mengambil `pengguna` beserta relasi `master_role(nama_role, permissions)` dengan `id = auth user.id`.

### Pendaftaran/approval akun

- Jika baris `pengguna` belum ada atau belum memiliki `usulan_role` dan `role_id`, pengguna mengisi nama dan role yang diusulkan.
- Form melakukan `upsert` ke `pengguna` dan menetapkan `status_akun = 'Menunggu'`.
- `PengaturanSistem` dapat menetapkan `role_id`; pemilihan role otomatis mengubah status menjadi `Aktif`.
- Penolakan menetapkan `role_id = null` dan `status_akun = 'Ditolak'`.
- Status selain `Aktif`, atau akun tanpa `role_id`, masuk layar menunggu.

Nilai status yang digunakan kode: `Menunggu`, `Aktif`, `Ditolak`. Ekspor database tidak menunjukkan check constraint untuk nilai `status_akun`, sehingga daftar nilai ini berasal dari kode, bukan constraint yang terverifikasi.

### Permission aktual

| Permission | Dipakai untuk route/menu | Dipakai untuk aksi tulis di dalam halaman |
|---|---:|---:|
| `akses_induk` | Ya | Secara tidak langsung memberi seluruh halaman termasuk mutasi |
| `edit_induk` | Tidak | Tidak |
| `validasi_pengajuan` | Ya | Ya, karena seluruh halaman review hanya bisa dibuka dengan permission ini |
| `akses_takziran` | Ya | Secara tidak langsung memberi seluruh fungsi tulis |
| `input_takziran` | Tidak | Tidak |
| `akses_keuangan` | Tidak ada route/modul internal | Tidak |
| `kelola_pengguna` | Ya | Ya |

### Risiko authorization

- RBAC frontend hanya menyembunyikan route/menu. Ini bukan batas keamanan database.
- `edit_induk` dan `input_takziran` adalah permission semu: tersimpan/dapat dicentang, tetapi tidak memengaruhi perilaku aplikasi.
- `TakziranDashboard` menggabungkan melihat riwayat, input pelanggaran, menghapus log, menandai takzir, dan mengelola master jenis di satu route.
- `SantriPage` menggabungkan membaca PII, menambah, mengubah, import, dan hapus massal di satu route.
- Fetch profil mengabaikan object `error` dari Supabase. Kegagalan query dapat dianggap seolah profil tidak ada dan memunculkan form pendaftaran ulang.
- `upsert` pendaftaran selalu menulis `status_akun = 'Menunggu'`; pada keadaan profil aktif gagal terbaca sementara, alur ini berpotensi menurunkan status akun jika pengguna mengirim form lagi.

### Hubungan Auth dengan database

`pengguna.id` memiliki foreign key, tetapi ekspor constraint tidak mencantumkan schema/tabel target. Pola kode sangat mengarah ke `auth.users.id`, namun target persisnya **Belum dapat diverifikasi** dari file yang tersedia. Tidak ada ekspor function/trigger untuk membuktikan pembuatan profil otomatis.

---

## 6. Database

Sumber: folder [`database`](https://github.com/ma2n13/santriva/tree/ba9a128f6a2549b768aec31e820f19c66e1da452/database). Terdapat 9 tabel, 81 kolom, 44 entri constraint, 17 index, 4 policy, dan 9 status RLS.

### Ringkasan tabel

| Tabel | Fungsi/kolom penting | PK/FK/unique | RLS/policy |
|---|---|---|---|
| `santri` | Pusat identitas, pondok, alamat, orang tua, sinkronisasi, catatan | PK `id`; unique `kode_unik`, `emis_id`; tidak ada unique NIS/NISN/NIK | RLS nonaktif; policy publik `SELECT true` ada tetapi inert |
| `pengajuan_santri` | `jenis_pengajuan`, `status_pengajuan`, JSONB `data_pengajuan`, `catatan_admin` | PK `id`; FK `santri_id → santri.id`; check ada tetapi definisi nilainya tidak ikut diekspor | RLS nonaktif; tiga policy publik, termasuk `ALL true` |
| `log_pelanggaran` | Tanggal, status takzir, keterangan, petugas | PK `id`; FK ke `santri` dan `master_jenis` | RLS nonaktif; tidak ada policy |
| `master_jenis` | Nama dan tipe kegiatan/pelanggaran | PK `id` | RLS nonaktif; tidak ada policy |
| `master_role` | Nama role dan array JSONB permissions | PK `id` | RLS nonaktif; tidak ada policy |
| `pengguna` | Profil akun, usulan role, status akun | PK `id`; FK `role_id → master_role.id`; target FK `id` tidak terekspor lengkap | RLS nonaktif; tidak ada policy |
| `santri_catatan` | Catatan perkembangan (`isi`) | PK `id`; FK `santri_id → santri.id` | RLS nonaktif; tidak ada policy |
| `santri_prestasi` | Prestasi (`prestasi`) | PK `id`; FK `santri_id → santri.id` | RLS nonaktif; tidak ada policy |
| `manage_users` | Email, nickname, role, assigned types/tags | PK `id`; unique `email` | Tidak dipakai frontend; RLS nonaktif |

### Index

- `santri`: index pada `nama_lengkap`, `nis`, dan `status`, plus index unique untuk PK, `kode_unik`, dan `emis_id`.
- `pengajuan_santri`: index pada `jenis_pengajuan` dan `status_pengajuan`.
- Tidak ditemukan index eksplisit pada FK `log_pelanggaran.santri_id`, `log_pelanggaran.jenis_id`, `pengajuan_santri.santri_id`, `santri_catatan.santri_id`, atau `santri_prestasi.santri_id`.

### Policy/RLS

Ekspor menunjukkan `rls_enabled=false` dan `rls_forced=false` untuk semua tabel. Konsekuensinya, empat policy tidak sedang menjadi filter akses.

Policy yang terekspor:

- `santri`: role `public` boleh `SELECT` dengan `true`.
- `pengajuan_santri`: role `public` boleh `SELECT true`, `INSERT ... WITH CHECK true`, dan `ALL` dengan `qual=true`.

Role PostgreSQL `public` mencakup semua role, termasuk anon dan authenticated. Jika RLS dinyalakan tanpa mengubah policy, `pengajuan_santri` tetap akan sangat terbuka. Dampak aktual saat RLS nonaktif juga bergantung pada table grants kepada `anon`/`authenticated`; ekspor grant tidak tersedia, sehingga rincian operasi yang benar-benar diizinkan oleh PostgREST **Belum dapat diverifikasi**.

### Function, trigger, role, grant, dan ON DELETE

Folder database tidak berisi ekspor function, trigger, role membership, GRANT/REVOKE, storage policy, atau detail aksi `ON DELETE/ON UPDATE`. Hal-hal tersebut **Belum dapat diverifikasi**. Jangan berasumsi tidak ada di live database hanya karena tidak ada dalam folder; yang dapat dipastikan hanyalah tidak ada buktinya dalam ekspor/repository.

---

## 7. Alur Data

### A. Login dan approval akun

`LoginPage → Supabase Google OAuth → session → App.fetchUserProfile → pengguna + master_role → pemeriksaan status/permission → route internal`

Mutasi approval: `PengaturanSistem → update pengguna.role_id/status_akun → fetch ulang pengguna → UI`.

### B. Buku induk

`SantriPage → select santri per 1.000 baris → gabung seluruh data di browser → filter/sort/pagination lokal → UI`.

Tambah/edit/bulk edit/delete/import dipanggil langsung dari komponen ke tabel `santri`, tanpa service layer dan tanpa transaksi server.

### C. Pendaftaran publik

`/pendaftaran → form/search santri → JSON data_pengajuan → insert pengajuan_santri → layar sukses`.

Untuk mode update, halaman publik dapat mencari nama, mengambil `id`, lalu mengambil seluruh baris `santri` dengan `select('*')`.

### D. Review admin

`AdminReview → select pengajuan Menunggu → edit JSON → insert/update santri → update status pengajuan → UI`.

Proses dua langkah ini tidak atomik. Jika insert/update santri berhasil tetapi update status pengajuan gagal, pengajuan tetap “Menunggu”. Percobaan ulang dapat membuat duplikasi data baru atau mengulang mutasi.

### E. Takziran

`TakziranDashboard → select master_jenis + santri Aktif → pilih banyak santri → insert banyak log_pelanggaran → daftar tunggakan/kalender → update/delete log`.

`input_by` selalu string `Petugas`, bukan ID/email user yang login. `tazir_by` tidak pernah diisi oleh frontend.

### F. Portal santri

`/s/:kode → cari santri berdasarkan UUID/kode_unik/NIS → ambil pengajuan pending + log + catatan + prestasi → UI`.

Alur ini bermasalah:

- `santri_catatan.eq('nama', ...)` dan `santri_prestasi.eq('nama', ...)` memakai kolom yang tidak ada; FK aktual adalah `santri_id`.
- Insert usulan portal membawa `nama_santri` yang tidak ada.
- Insert tidak membawa `jenis_pengajuan`, padahal kolom tersebut `NOT NULL`.
- Form portal selalu menyertakan `foto_profil`; tabel `santri` tidak memiliki kolom tersebut. Saat admin menyetujui, key itu tidak dibuang dan dapat membuat update/insert ditolak.

---

## 8. Fitur Aplikasi

### Sudah memiliki implementasi lengkap pada level kode

Istilah ini berarti alur UI dan query ditemukan lengkap; bukan jaminan live database mengizinkan atau seluruh edge case berhasil.

- Login Google OAuth dan session listener.
- Form onboarding akun, status menunggu/ditolak/aktif.
- Route/menu berbasis permission.
- Buku induk: baca semua data, pencarian, sort, pagination, tambah/edit/bulk edit/bulk delete.
- Pendaftaran publik data baru/update dan antrean review.
- Review admin untuk pengajuan publik dari `PublicPendaftaran`.
- Input massal pelanggaran, daftar belum ditakzir, penyelesaian, kalender riwayat, master jenis.
- Pengelolaan role serta approval akun.
- Deployment fallback SPA melalui Vercel.

### Setengah jadi

- **Import spreadsheet:** halaman aktif memakai Papa Parse, tetapi input menerima `.csv`, `.xlsx`, dan `.xls`. Papa Parse cocok untuk CSV, bukan workbook Excel biner. Implementasi XLSX yang benar berada di `SantriForm.tsx`, tetapi file itu tidak dirender.
- **Portal santri:** UI luas, tetapi kontrak data catatan/prestasi/usulan salah.
- **Link WhatsApp wali:** pesan dibuat, tetapi URL aplikasi yang dibagikan (`/wali`) tidak ada.
- **Permission:** daftar permission tersedia, tetapi permission baca/tulis belum dipisahkan dalam perilaku komponen.
- **Keuangan portal:** baru berupa tampilan statis, bukan modul data.
- **Sinkronisasi EMIS:** kolom dan label status ada, tetapi tidak ditemukan service/API sinkronisasi.

### Belum selesai/tidak ditemukan

- Absensi akademik 7 jam pelajaran dan jadwal guru.
- Rekap hadir/sakit/izin/alpa harian sampai tahunan.
- Master guru, kelas, mapel, tahun ajaran, jadwal, dan junction kelas-siswa.
- Dashboard statistik kehadiran.
- Modul keuangan aktual, pembayaran, tahfidz, nilai, perizinan, surat, inventaris, donatur.
- Audit trail yang mengikat mutasi ke user login.
- Test otomatis dan CI.

### Bermasalah

- Tombol antrean review membuka path salah.
- Tombol WA membagikan path yang tidak tersedia.
- Query `nama` pada tabel catatan/prestasi tidak valid.
- Payload portal tidak sesuai `pengajuan_santri`.
- `foto_profil` tidak ada pada `santri`.
- Keuangan selalu menyatakan lunas tanpa sumber data.
- Permission `edit_induk`/`input_takziran` tidak efektif.
- Import “paksa” menambahkan `-DUPxxxx` ke NIS/NISN/NIK, padahal database tidak memiliki unique constraint pada ketiga kolom tersebut. Pesan error selalu menyimpulkan konflik NIS/NIK walau kegagalan dapat berasal dari sebab lain.
- Kolom tabel `Provinsi`, `Kabupaten/Kota`, `Kecamatan`, dan `Kode Pos` memiliki mapping key sort yang tidak cocok (`Prov`, `Kab`, `Kec`, `Pos`), sehingga klik header tersebut tidak mengurutkan data.
- Waktu pencatatan memakai input datetime, tetapi `santri.tanggal_masuk` bertipe `date`; waktu tidak dapat disimpan sebagai jam-menit.

### Disebut di `PROJECT_HANDOFF.md` tetapi tidak ditemukan

`src/features`, `AuthContext`, `AuthGuard`, `DashboardLayout`, shadcn/ui, TanStack Query, tabel akademik, master guru/kelas/mapel/jadwal, real-time attendance page, mapping kelas-siswa, trigger profil, full RLS authenticated, path alias, dan dark mode.

---

## 9. Aturan Bisnis

Aturan berikut benar-benar tercermin dalam kode/database saat ini:

1. Hanya akun dengan session, `status_akun='Aktif'`, dan `role_id` yang boleh masuk area internal.
2. Menu internal muncul berdasarkan array `master_role.permissions`.
3. `Super Admin` tidak ditampilkan dalam pilihan role saat pendaftaran akun dan tidak boleh dihapus melalui UI.
4. Data santri baru memerlukan `nama_lengkap`; kode portal dibuat otomatis dengan prefix `STR-`.
5. Pendaftaran/usulan publik masuk ke `pengajuan_santri` dengan status awal `Menunggu` dan tidak langsung mengubah `santri`.
6. Admin dapat mengedit isi pengajuan sebelum menyetujui.
7. Santri yang ditampilkan di modul takziran dibatasi `status='Aktif'`.
8. Log baru berstatus takzir `Belum`; pengurus dapat mengubahnya menjadi `Sudah`.
9. Konflik import dideteksi berdasarkan persamaan nama lengkap, bukan ID/NIS/NIK.
10. Buku Induk mengambil semua data ke browser dan menampilkan maksimal 100 baris per halaman.

Aturan yang disebut handoff tentang guru hanya boleh mengabsen jadwal hari ini dan default semua siswa Hadir tidak memiliki implementasi aktual.

---

## 10. Integrasi Eksternal

| Integrasi | Bukti aktual | Batas audit |
|---|---|---|
| Supabase | Client, PostgREST query, Auth | Pengaturan live grant/provider tidak diperiksa |
| Google OAuth | `provider: 'google'` | Client ID, consent screen, dan redirect allowlist **Belum dapat diverifikasi** |
| Vercel | Homepage repository dan `vercel.json` | Project settings, env, Node version, dan deployment commit live **Belum dapat diverifikasi** |
| API Wilayah EMSIFA | Fetch provinsi–desa pada dua komponen | Ketersediaan/CORS live tidak diuji |
| WhatsApp | `wa.me` deep link | Bukan API, webhook, atau pengiriman otomatis |
| SVG Repo | Gambar ikon Google eksternal | Ketergantungan jaringan pada halaman login |

Tidak ditemukan Firebase, Google Sheets, WhatsApp API, cron job, webhook, Supabase Storage, RPC, Edge Function, atau API server milik proyek.

---

## 11. Risiko Teknis

### Kritis

1. **RLS dan boundary keamanan database tidak memadai.** Semua tabel tercatat RLS nonaktif. Policy yang tersedia terlalu terbuka dan grant aktual tidak diekspor.
2. **PII dapat diakses melalui alur publik bila grant memungkinkan.** `/pendaftaran` dapat mencari santri dan `select('*')`; `/s/:kode` menerima UUID, kode unik, atau NIS serta menampilkan identitas, kontak wali, alamat, dan kedisiplinan.
3. **Authorization write tidak mengikuti permission.** Permission read membuka komponen yang juga mempunyai insert/update/delete.
4. **Portal tidak sinkron dengan schema** dan usulan perubahan portal dipastikan mempunyai payload yang salah.
5. **Status keuangan palsu/statis** berisiko menyesatkan wali.
6. **Approval tidak transaksional** sehingga partial success dan duplikasi dapat terjadi.

### Tinggi

- Dua admin dapat menyetujui pengajuan yang sama secara bersamaan; tidak ada lock, RPC transaksional, atau update status bersyarat.
- Pengecekan “sudah ada pengajuan pending” di portal hanya berupa count lalu insert; dua request paralel tetap dapat lolos.
- Beberapa mutasi optimistik menghapus data dari state sebelum memastikan query berhasil (`TakziranDashboard`). Error update/delete sering diabaikan.
- Penghapusan role/user/master jenis sering tidak memeriksa error. UI dapat terlihat berhasil padahal database menolak.
- Hapus massal `santri` dapat berbenturan dengan FK; detail cascade tidak terekspor dan error pada `handleBulkDelete` tidak ditampilkan.
- Import dilakukan satu per satu dari browser. Jika sebagian gagal, database berada dalam keadaan parsial.
- “Force import” sengaja mengubah identitas resmi NIS/NISN/NIK untuk melewati asumsi konflik.
- Profil user query mengabaikan error dan dapat salah mengarahkan user ke pendaftaran ulang.

### Menengah

- `SantriPage` 61 KB/850 baris, `PortalSantri` 32 KB, `SantriForm` 29 KB, dan `TakziranDashboard` 28 KB; tanggung jawab sangat rapat.
- Seluruh data santri dimuat ke browser. Saat data membesar, waktu muat, memori, dan paparan PII meningkat.
- Tidak ada generated database types; `any` luas membuat mismatch schema lolos TypeScript.
- `kode_unik` dibuat di browser dengan `Math.random`; unique constraint mengurangi duplikasi tetapi tidak ada retry khusus ketika collision.
- Hanya PK/unique dan beberapa kolom pencarian yang di-index; FK/log historis dapat melambat.
- Bundle JavaScript 605,04 KB minified (164,97 KB gzip) dan memicu warning chunk >500 KB.
- URL Supabase hardcoded menyulitkan environment dev/staging/production.

### Dependency

Audit registry menemukan satu kerentanan direct berlevel **high** pada `xlsx@0.18.5`: [Prototype Pollution](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) dan [ReDoS](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9). `xlsx` saat ini hanya dipakai komponen mati dan tidak ditemukan dalam bundle produksi audit, sehingga paparan runtime aktif lebih rendah; dependency tetap berada dalam project/install dan perlu keputusan terencana.

---

## 12. Technical Debt

### Harus segera diperbaiki

- Tetapkan model akses database, ekspor grants/function/trigger lengkap, lalu perbaiki RLS/policy berdasarkan role nyata.
- Perbaiki kontrak `PortalSantri` dengan database sebelum menerima usulan portal.
- Pisahkan permission baca dan tulis secara nyata di UI sekaligus RLS/database.
- Hentikan klaim keuangan statis atau sambungkan ke data aktual.
- Jadikan approval pengajuan transaksional/idempotent.
- Sinkronkan `package-lock.json` agar `npm ci` berhasil.
- Perbaiki route `/admin-review` dan `/wali`.
- Hentikan “force import” yang memodifikasi NIS/NISN/NIK tanpa memahami error asli.

### Sebaiknya diperbaiki nanti

- Ganti `any` dengan tipe Supabase yang digenerate dan domain type yang jelas.
- Pisahkan query/service dari UI setelah kontrak fitur stabil; jangan refactor serentak.
- Tambahkan test untuk auth gate, permission, pengajuan, approval, import, dan takziran.
- Tangani seluruh error Supabase dan rollback state optimistik bila gagal.
- Gunakan server-side pagination/filtering untuk data besar.
- Tambahkan index FK/query yang dibuktikan oleh pengukuran.
- Code splitting per route.
- Bersihkan komponen/aset/dependency mati setelah dipastikan tidak dibutuhkan.
- Gunakan environment variable untuk konfigurasi URL/key per environment.

### Tidak perlu disentuh sekarang

- Gaya visual Tailwind, warna, dan layout selama tidak terkait bug/aksesibilitas.
- Memindahkan seluruh proyek ke Feature-Driven Architecture.
- Menambah TanStack Query atau state library hanya demi mengikuti handoff lama.
- Mengganti React Router, Vite, atau Supabase tanpa kebutuhan fitur.
- Merapikan `App.css` sebelum diputuskan apakah file itu akan dipakai atau dihapus.

---

## 13. Konflik Informasi dan Audit `PROJECT_HANDOFF.md`

### A. Terkonfirmasi

- React + Vite + TypeScript.
- PostgreSQL/Supabase.
- Google OAuth melalui Supabase Auth.
- Vercel digunakan sebagai target/deployment SPA.
- Tailwind CSS v3, React Router DOM, lucide-react, dan dependency `xlsx` ada.
- UUID digunakan sebagai PK pada tabel aktual.
- Tidak ditemukan cron/webhook dalam source repository.
- Larangan pengguna tentang tidak mengubah kode tanpa instruksi, tidak berasumsi, tidak menghapus fitur lama, dan tidak melakukan refactor besar tetap menjadi aturan pengembangan.

### B. Belum dapat diverifikasi

- Konfigurasi Google Cloud Client ID, consent screen, dan redirect URL live.
- Riwayat error 403/400/500 dan solusi spesifik yang diklaim.
- Konflik trigger aplikasi lama.
- PostgREST pernah memerlukan `NOTIFY pgrst` pada database ini.
- Nilai/definisi check constraint `jenis_pengajuan` dan `status_pengajuan`.
- Function/trigger/grants yang mungkin ada di live Supabase tetapi tidak diekspor.
- Commit yang sedang live pada deployment Vercel.

### C. Sudah tidak berlaku

- “Pekerjaan terakhir” berupa mesin absensi real-time akademik.
- Klaim `App.tsx` hanya menjadi router bersih; aktualnya App juga menangani session, profil, onboarding, status akun, layout, dan permission.
- Rancangan hard reset tabel sebagai keputusan aktif. Database sekarang telah berisi struktur lain dan tidak boleh dianggap kosong/tidak vital.
- Nama dan struktur “SantriHub” dalam handoff tidak sesuai repository/app aktual “Santriva/SIM Santri”.

### D. Bertentangan

| Klaim handoff | Bukti aktual |
|---|---|
| Feature-Driven `src/features` | Tidak ada `src/features`; logika berada di `src/components` |
| `AuthContext` dan `AuthGuard` | Tidak ada; auth berada di `App.tsx` |
| TanStack Query dan shadcn/ui | Tidak ada di dependency/import |
| Tabel `profiles`, `students`, `teachers`, `classes`, `schedules`, attendance | Database aktual memiliki `pengguna`, `santri`, `master_role`, `log_pelanggaran`, dll. |
| RLS aktif penuh untuk authenticated | RLS nonaktif pada seluruh tabel |
| Trigger otomatis membuat profil | Tidak ada bukti function/trigger; kode menyediakan form/upsert manual |
| Environment `VITE_SUPABASE_URL/ANON_KEY` | Tidak direferensikan; URL/key hardcoded |
| Master kelas/tahun ajar/guru/jadwal selesai | File, route, dan tabel tidak ditemukan |
| Absensi real-time akademik selesai | Yang ada adalah takziran/kedisiplinan berbasis `log_pelanggaran` |
| `UNIQUE(schedule_id, session_date)` dan `UNIQUE(teacher.code)` | Tabel/constraint tersebut tidak ada |
| `ON DELETE CASCADE` terverifikasi | Detail ON DELETE tidak ikut diekspor |
| Kerangka auth/routing/RBAC sangat stabil | Build bisa dilakukan, tetapi authorization dan RLS memiliki risiko kritis |

### E. Perlu pemeriksaan lanjutan

- Export database tambahan: functions, triggers, grants, role memberships, exact check definitions, FK action, storage policies.
- Konfigurasi Supabase Auth provider dan redirect allowlist.
- Vercel project settings, Node/npm version, environment variables, dan deployment SHA.
- Uji live yang aman menggunakan database staging/salinan tanpa membaca PII produksi.
- Data volume, pola penggunaan role, dan role mana yang saat ini aktif.

Urutan sumber kebenaran menghasilkan keputusan: commit GitHub + folder database mengalahkan handoff untuk semua fakta teknis aktual.

---

## 14. Kesalahan Lama yang Tidak Boleh Diulangi

Berdasarkan handoff dan bukti audit aktual:

1. Jangan membuat tabel/kolom/route/permission berdasarkan ingatan handoff.
2. Jangan menganggap policy ada berarti RLS aktif; periksa `rls_enabled`, role target, `USING`, `WITH CHECK`, dan GRANT.
3. Jangan mengaktifkan RLS lalu sekadar memberi policy `true` kepada `public`.
4. Jangan menulis SQL `IF NOT EXISTS` lalu menganggap constraint/index berhasil dibuat.
5. Jangan menjalankan hard reset/drop table dengan asumsi database belum berisi data penting.
6. Jangan menambahkan function/trigger sebelum menginventaris function/trigger lama.
7. Jangan menganggap NIS/NISN/NIK unique; schema aktual hanya membuktikan unique `kode_unik` dan `emis_id`.
8. Jangan menambah field seperti `nama_santri` atau `foto_profil` sebelum memastikan kolom/JSON contract.
9. Jangan menyelesaikan error import dengan mengubah nomor identitas resmi secara otomatis.
10. Jangan menyembunyikan kegagalan Supabase dengan state optimistik atau pesan sukses tanpa memeriksa `error`.
11. Jangan menyebut fitur “selesai” hanya karena UI tampil; cocokkan query, constraint, RLS, dan alur gagal parsial.
12. Jangan menjadikan route guard frontend sebagai satu-satunya authorization.
13. Jangan menghapus fitur lama atau mengubah UI di luar permintaan saat memperbaiki bug kecil.
14. Jangan melakukan refactor besar sebelum risiko keamanan dan kontrak database selesai dipetakan.
15. Jika file diubah kelak, berikan isi file penuh dari baris pertama sampai terakhir, tetapi perubahan logic tetap minimal.

---

## 15. Kondisi Proyek Saat Ini

### Tingkat kelengkapan

Proyek adalah prototipe/fase awal yang sudah mempunyai beberapa alur bisnis nyata, bukan sekadar template. Buku Induk, pengajuan publik, takziran, auth, dan role sudah mempunyai UI serta query langsung.

### Modul relatif paling matang

- Struktur SPA/Vite/Vercel.
- Tampilan Buku Induk dan operasi data dasar pada level komponen.
- Kerangka session Google OAuth dan status akun.
- UI input/tunggakan/riwayat takziran.

### Modul belum stabil

- Portal santri dan usulan pembaruannya.
- Authorization/RLS semua modul.
- Approval pengajuan karena tidak transaksional.
- Import spreadsheet dan force import.
- Pengelolaan role karena permission tidak seluruhnya diterapkan.
- Keuangan karena hanya placeholder statis.

### Masalah/risiko utama

Keamanan data dan ketepatan kontrak frontend–database lebih mendesak daripada penambahan fitur baru. Risiko terbesar adalah paparan PII, mutasi tanpa boundary role yang kuat, dan alur portal/review yang tidak cocok dengan schema.

### Kesiapan pengembangan

Repository sudah cukup jelas untuk dilanjutkan secara bertahap, tetapi **belum aman dijadikan baseline produksi yang stabil**. Pengembangan fitur baru sebaiknya menunggu penyelesaian keputusan security model dan kontrak portal/database.

---

## 16. Rekomendasi Langkah Berikutnya

### Kritis

1. Ekspor dan audit grants, function, trigger, check definition, serta FK action dari Supabase; lakukan backup/snapshot sebelum SQL apa pun.
2. Rancang matriks akses anon/authenticated/role aplikasi untuk setiap tabel dan operasi; baru kemudian siapkan SQL RLS/policy yang aman.
3. Putuskan desain akses portal publik: token/kode yang tidak dapat ditebak, kolom apa yang boleh dilihat, dan apakah NIS/UUID boleh dipakai langsung.
4. Perbaiki kontrak portal: `santri_id`, `jenis_pengajuan`, hilangkan/dukungan resmi `nama_santri` dan `foto_profil`.
5. Terapkan permission `edit_induk` dan `input_takziran` pada UI serta enforcement database.
6. Hilangkan status keuangan statis sampai ada data yang benar.
7. Jadikan approval pengajuan atomik/idempotent, idealnya melalui function/RPC yang terverifikasi.
8. Sinkronkan lockfile lalu ulangi `npm ci`, build, lint, dan audit dependency.

### Penting

1. Perbaiki link `/admin-review` dan `/wali`.
2. Batasi import aktif ke CSV atau gunakan parser XLSX yang aman dan benar; hapus force import yang mengubah identitas.
3. Tambahkan error handling pada setiap mutasi Supabase.
4. Buat generated Supabase types dan kurangi `any` secara bertahap pada file yang sedang disentuh.
5. Tambahkan test minimal untuk auth/permission, pengajuan-review, portal, import, dan takziran.
6. Evaluasi index berdasarkan query utama dan volume data.
7. Pisahkan route besar dengan lazy loading untuk menurunkan bundle awal.

### Peningkatan opsional

- Rapikan komponen mati/aset template setelah ada konfirmasi.
- Buat service layer per modul secara bertahap, bukan rewrite arsitektur.
- Tambahkan dashboard/rekap setelah model data dan keamanan stabil.
- Pertimbangkan TanStack Query hanya jika caching/invalidation benar-benar diperlukan.
- Tambahkan CI setelah `npm ci` dapat direproduksi.

Tidak ada rekomendasi di atas yang diimplementasikan dalam tahap audit ini.

---

## Lampiran: Hasil Verifikasi

### Pemeriksaan repository

- Commit lokal sama dengan commit GitHub: `ba9a128f6a2549b768aec31e820f19c66e1da452`.
- Tree berisi 39 file tracked; tidak ada `AGENTS.md`, `.github/workflows`, test, server, atau function.
- `git status --short` tetap bersih setelah audit; tidak ada perubahan source/lockfile.

### Install/build/lint/test

| Pemeriksaan | Hasil |
|---|---|
| `npm ci` pada Node 24.19/npm 11.9 | Gagal: lockfile kehilangan `@emnapi/core` dan `@emnapi/runtime` |
| `npm ci` dengan npm 10.9.4 pada clone bersih | Gagal dengan sebab yang sama |
| Instalasi sekunder `npm install --no-save --package-lock=false` | Berhasil; tidak mengubah file tracked |
| `npm run build` setelah instalasi sekunder | Berhasil; 1.864 modul; JS 605,04 KB minified/164,97 KB gzip; warning chunk besar |
| `npm run lint` | Gagal: 111 error, 1 warning |
| Test | Tidak ada test file atau script `test` |

Build sekunder membuktikan source TypeScript dapat dikompilasi dengan dependency yang ter-resolve saat audit, tetapi bukan bukti clean build berbasis lockfile karena `npm ci` gagal.

### Ringkasan lint per file

| File | Error | Warning |
|---|---:|---:|
| `src/App.tsx` | 7 | 0 |
| `AdminReview.tsx` | 7 | 0 |
| `PengaturanSistem.tsx` | 6 | 0 |
| `PortalSantri.tsx` | 14 | 0 |
| `PublicPendaftaran.tsx` | 17 | 0 |
| `SantriForm.tsx` | 4 | 0 |
| `SantriList.tsx` | 4 | 0 |
| `SantriPage.tsx` | 41 | 1 |
| `TakziranDashboard.tsx` | 11 | 0 |

Mayoritas berasal dari `no-explicit-any`, disusul aturan React Hooks, satu unused variable, dan `prefer-const`. Lint failure adalah kondisi aktual, tetapi tidak semuanya berisiko sama; jangan melakukan refactor massal hanya demi angka nol.
