## 📄 DOKUMEN HANDOFF PROJECT: SANTRIHUB (ERP PESANTREN)

### 1. Tujuan Utama Aplikasi

Membangun ERP Pesantren / Sistem Informasi Pesantren modern dari nol (bernama SantriHub) untuk menggantikan tiga aplikasi lama (santri-app, santri-management, santri-bayar) menjadi satu sistem terpusat (*Single Source of Truth*). Fokus awal adalah sistem absensi sekolah secara *real-time* yang nantinya akan diperluas menjadi sistem manajemen pesantren skala penuh.

### 2. Teknologi yang Digunakan

* **Frontend:** React (dibangun dengan Vite dan menggunakan TypeScript).


* **Backend & Database:** PostgreSQL yang di- *hosting* di Supabase.


* **Authentication:** Supabase Auth terintegrasi dengan Google OAuth (Single Sign-On).


* **Hosting/Deployment:** Vercel (direncanakan/dijadikan target *best practice*).


* **Library Penting:** Tailwind CSS v3, shadcn/ui, React Router DOM, TanStack Query (React Query), lucide-react (ikon), dan `xlsx` (untuk manipulasi/import Excel).



### 3. Struktur Aplikasi & File/Folder Penting

Aplikasi menggunakan **Feature-Driven Architecture** (Arsitektur Berbasis Fitur) agar sangat modular dan *scalable*.

* `src/features/`: Pusat logika bisnis dan UI per modul (contoh: `/auth`, `/students`, `/classes`, `/schedules`, `/attendance`).


* `src/components/`: Untuk komponen UI *dumb* (tidak terikat logika *database*), seperti komponen dari shadcn/ui atau struktur *Layout*.


* `src/lib/`: Menyimpan inisialisasi pihak ketiga, seperti `supabase.ts`.


* `src/context/`: Menyimpan *State Global* seperti `AuthContext.tsx`.



### 4. Struktur Database Lengkap (Supabase PostgreSQL)

Menggunakan UUID sebagai *Primary Key*.

* **Tabel & Relasi:**
* `profiles`: Terhubung dengan `auth.users` Supabase. Kolom: `id`, `role`, `full_name`, `email`.


* `academic_years`: Kolom: `id`, `name`, `is_active`.


* `teachers`: Kolom: `id`, `user_id`, `code`, `name`.


* `students`: Kolom: `id`, `nis`, `name`, `gender`, `class_id` (opsional), `status`.


* `classes`: Kolom: `id`, `name`, `academic_year_id` (Foreign Key).


* `class_students`: Tabel *junction* relasi *Many-to-Many* antara siswa dan kelas.


* `subjects`: Daftar mata pelajaran.


* `schedules`: Jadwal. Kolom: `id`, `class_id`, `subject_id`, `teacher_id`, `day_of_week`, `start_time`, `end_time`, `jam_ke`.


* `attendance_sessions` & `attendance_records`: Untuk merekam absensi per sesi dan per anak.




* **Constraint Penting:** `UNIQUE(schedule_id, session_date)` untuk mencegah absen ganda, `UNIQUE(code)` pada guru, dan `ON DELETE CASCADE` untuk menjaga integritas data.


* **RLS/Security:** Row Level Security (RLS) diaktifkan penuh. Ada kebijakan (`policy`) yang membatasi hak akses *CRUD* hanya untuk *role* `authenticated`, serta *Database Trigger* untuk otomatis mendaftarkan profil pengguna setelah *Login Google*.



### 5. Semua Fitur yang Pernah Diminta

* Login via Google OAuth untuk Guru dan Admin dengan pemisahan *Role*.


* Manajemen Master Data: Guru, Kelas, Siswa, Mapel, Jadwal.


* Absensi setiap jam pelajaran (7 jam/hari) sesuai jadwal guru mengajar hari itu.


* Otomatisasi kalkulasi kehadiran (H/A/I/S) dan rekapitulasi (Harian - Tahunan).


* Import otomatis data santri dan jadwal/guru menggunakan file Excel (Leger).


* UI minimalis, cepat, elegan (*dark mode*, menggunakan *card* shadcn/ui).


* Modul perluasan masa depan: Pelanggaran, Tahfidz, Nilai, Pembayaran SPP, Perizinan, Surat, Inventaris, Donatur, Keuangan.



### 6. Fitur yang Sudah Selesai

* Setup proyek (Vite, TS, Tailwind, shadcn/ui) dan Konfigurasi *Path Alias*.


* Autentikasi Google OAuth + *Trigger Database* penentuan kasta tertinggi (Super Admin).


* Global State via `AuthContext` dan proteksi halaman via `AuthGuard`.


* Manajemen Kelas & Tahun Ajaran (UI interaktif).


* Import massal data Santri dari Excel dengan penyesuaian otomatis.


* Pemetaan Siswa ke Kelas (*Class-Student Mapping*) dengan fitur *drag/move*, *checkbox* massal, dan *search bar*.


* Ubah massal (*Bulk Edit*) data siswa (kelas, status, gender).


* Import pintar jadwal guru dari Excel Waka Kurikulum.


* Mesin inti halaman Absensi (*Real-time* filter jadwal hari ini).



### 7. Fitur yang Masih Belum Selesai

* Rekapitulasi Absensi (Harian, Mingguan, Bulanan, Semester, Tahunan).


* Filter Level Akses di UI: Memastikan antarmuka Guru terkunci hanya untuk kelasnya, sementara Admin bisa melihat semuanya.


* *Dashboard* yang menampilkan statistik kehadiran/persentase.


* Modul-modul perluasan (Tahfidz, Keuangan, dll.).



### 8. Aturan Bisnis Aplikasi

* Guru hanya dapat mengisi absensi sesuai jadwal mengajarnya hari ini.


* Semua siswa secara otomatis dianggap Hadir (*default*), guru cukup menandai Alpha, Izin, atau Sakit.


* Data identitas dan historis harus utuh: Jika data berubah, harus diubah di akar (Database) bukan direkayasa di *Frontend* (*Single Source of Truth*).



### 9. Keputusan Desain/Arsitektur

* **Feature-Driven Architecture:** Dipilih agar ketika modul Tahfidz atau SPP ditambahkan kelak, foldernya terisolasi dan tidak merusak fitur lama.


* **TanStack Query:** Dipilih untuk mengambil, memvalidasi, dan melakukan *caching* data agar UI terasa secepat aplikasi *native* tanpa banyak fungsi *loading* manual.


* **SSO Google:** Dipilih karena membebaskan guru dari hafalan *password* dan memindahkan beban keamanan *login* ke pihak Google.


* **Hard Reset Tabel vs Migration:** Untuk tabel yang struktur *constraint*-nya rusak, dipilih metode *drop table* (Nuclear SQL) mengingat proyek masih dalam fase inisiasi dan belum ada data produksi vital, menjamin skema 100% sempurna.



### 10. Perubahan Penting pada Kode

* Mengganti konversi Angka Romawi (misal VIIIA) ke Arab (8A) dari level React *Frontend* dipindahkan langsung ke pembersihan di level *Database* via *Query SQL Update*.


* Rombak total halaman Data Siswa untuk memasukkan fitur Pencarian, *Sorting*, dan *Bulk Edit* dalam wujud *Modal/Popup*.


* Memisahkan logika keamanan `AuthContext` dan `AuthGuard` dari `App.tsx` ke dalam folder khusus agar *App.tsx* bersih bertindak sebagai orkestrator *Router* saja.



### 11. Bug yang Pernah Muncul & Penyelesaiannya

* **Bug 403 Forbidden (Import Siswa):** RLS menghalangi *insert* data. *Solusi:* Menulis *policy SQL* untuk `authenticated user`.


* **Bug UI Mepet Pinggir Layar:** *Solusi:* Membungkus *layout* di `DashboardLayout.tsx` dengan *utility class* `max-w-7xl mx-auto px-6 py-8`.


* **Bug Google Redirect Loop (API Key Not Found):** Terjadi karena memakai *Client ID* lama. *Solusi:* Membuat *Client ID* Google Cloud yang sepenuhnya baru khusus untuk SantriHub.


* **Bug 400 Bad Request (Import Guru):** Kolom tidak *UNIQUE*. *Solusi:* Menambahkan constraint `UNIQUE(code)` di tabel `teachers`.


* **Bug 500 Internal Server Error (Import Guru):** Kegagalan *Bulk Upsert* akibat karakter spasi tak kasatmata dan *cache* PostgREST. *Solusi:* Deep debugging data, membersihkan spasi tersembunyi, dan *NOTIFY pgrst reload*.



### 12. Kesalahan yang Pernah AI (Saya) Lakukan

* **Lupa Memberi Policy RLS:** Saya memerintahkan mengaktifkan RLS namun lupa memberikan kodenya, sehingga sistem menolak data sah dari pengguna yang sudah *login*.


* **Asumsi *IF NOT EXISTS*:** Saya membuat skrip SQL dengan `CREATE TABLE IF NOT EXISTS`. Karena tabel sudah terlanjur ada dari sesi sebelumnya (tanpa constraint *UNIQUE*), skrip saya terlewati diam-diam, yang menyebabkan error fatal saat proses *Upsert*.


* **Kelalaian UI (*Padding*):** Lupa menerapkan kelas pembungkus *layout* yang benar pada kerangka awal, mengakibatkan teks menempel di ujung layar PC/HP.


* **Asumsi Trigger SQL:** Memberikan *script* pembuatan trigger di Supabase tanpa mengecek apakah fungsi/trigger lama dari aplikasi sebelumnya (santri-app) akan berkonflik.



### 13. Larangan Eksplisit dari Pengguna (Aturan Pengembangan)

1. **Jangan pernah mengubah kode tanpa diminta**.


2. **Jangan membuat asumsi**.


3. Jelaskan dahulu jika ada konflik.


4. **Kerjakan SATU langkah setiap kali**.


5. Setelah selesai satu langkah, **berhenti dan tunggu instruksi**.


6. Selalu jelaskan alasan teknis setiap keputusan.


7. **Jangan melakukan refactoring besar tanpa izin**.


8. Aplikasi harus selalu bisa dijalankan setelah perubahan.


9. Jangan menghapus fitur lama.


10. Utamakan *maintainability* (kemudahan pemeliharaan) daripada kecepatan.



### 14. Hubungan File Penting

* **`src/App.tsx`:** Jantung aplikasi. Menyatukan `AuthContext`, *TanStack Query*, dan mendaftarkan semua *Route* halaman.


* **`src/features/auth/AuthContext.tsx` & `AuthGuard.tsx`:** Mengambil data Supabase *Auth*, menentukan apakah pengguna itu Super Admin atau Guru, lalu memblokir akses jika *role* tidak cocok.


* **`src/features/students/StudentManagementPage.tsx`:** Terhubung ke *database* untuk *CRUD* siswa dan memiliki komponen pengurutan (*sorting*) dan penyesuaian massal.


* **`src/features/classes/ClassStudentMappingPage.tsx`:** Mengambil data dari Siswa dan Kelas, bertindak sebagai *junction tool* untuk memindahkan siswa antar-rombel.



### 15. Environment Variables

*(Nama saja)*

* `VITE_SUPABASE_URL`

* `VITE_SUPABASE_ANON_KEY`


### 16. Layanan Eksternal yang Digunakan

* **Supabase:** Menggunakan PostgreSQL (*Database*), PostgREST (*API Middleware*), dan Auth (Sistem *Login*).
* **Google Cloud Console:** Untuk menyediakan *OAuth Consent Screen* dan kredensial *Client ID* untuk *login* Google.


* *(Tidak diketahui/perlu diverifikasi)*: Tidak ada webhook, *cron job*, atau layanan eksternal lain yang ditambahkan sejauh ini pada proyek SantriHub (berbeda dengan proyek AutoWA sebelumnya).

### 17. Kondisi Aplikasi Versi Terakhir

Kerangka utama (*authentication, routing, RBAC layout*) sudah sangat stabil. Master Data (Tahun Ajaran, Kelas, Pemetaan Siswa, Guru, dan Ekstraksi Jadwal Waka Kurikulum) berhasil dimasukkan ke *database*. Layar antarmuka Mesin Inti Absensi (`AttendancePage.tsx`) sudah selesai dirender dan dapat melacak jadwal pelajaran berdasarkan hari (*Real-Time*).

### 18. Masalah yang Diketahui Saat Ini

* **Schema Cache Supabase:** Jika melakukan perubahan skema (*ALTER TABLE*) via SQL, API *Frontend* kadang mengalami *stuck* karena Supabase *PostgREST* belum me-*refresh* memori. Dibutuhkan *query* manual `NOTIFY pgrst, 'reload schema'`.



### 19. Pekerjaan Terakhir Sedang Dikerjakan

Menguji coba fitur "Mesin Inti — Fitur Absensi Real-Time" di mana guru bisa melihat tabel berdasarkan jadwal.

### 20. Saran untuk AI Berikutnya

* **Patuhi Aturan 1-10 dengan Ketat:** Jangan *generate* seluruh aplikasi sekaligus. Tunggu instruksi "lanjut" dari *user* untuk berpindah ke tahap berikutnya.


* **Sinkronisasi UI dan RLS:** Jika Anda mendesain halaman baru yang melakukan interaksi `INSERT/UPDATE`, pastikan Anda memeriksa terlebih dahulu apakah aturan RLS di tabel terkait sudah diizinkan untuk `authenticated user`.


* **Hati-hati dengan PostgREST:** Mengingat arsitekturnya memakai Supabase, jangan berasumsi *database* langsung responsif terhadap perubahan skema kolom. *Debug* melalui *Error Code PostgREST* jika permintaan REST API ditolak.