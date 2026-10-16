-- ==============================================================================
-- MIGRASI KEAMANAN: AKTIFKAN ROW LEVEL SECURITY (RLS) & POLICY UNTUK SANTRIVA
-- Tanggal: 16 Oktober 2026
-- Petunjuk: Jalankan skrip ini di SQL Editor dashboard Supabase Anda.
-- ==============================================================================

-- 1. AKTIFKAN RLS PADA SELURUH 9 TABEL
ALTER TABLE public.santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengajuan_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.santri_catatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.santri_prestasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_jenis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manage_users ENABLE ROW LEVEL SECURITY;

-- 2. BERSIHKAN POLICY LAMA YANG BERSIFAT TERLALU TERBUKA (JIKA ADA)
DROP POLICY IF EXISTS "Publik bisa melihat data santri" ON public.santri;
DROP POLICY IF EXISTS "Publik bisa membuat pengajuan" ON public.pengajuan_santri;
DROP POLICY IF EXISTS "Publik bisa melihat data pengajuan tertentu" ON public.pengajuan_santri;
DROP POLICY IF EXISTS "Admin bisa mengubah data pengajuan" ON public.pengajuan_santri;

-- ==============================================================================
-- 3. POLICIES: TABEL santri
-- ==============================================================================
-- Pengguna publik/anon dapat membaca santri (untuk portal wali /s/:kode dan verifikasi pendaftaran)
CREATE POLICY "santri_select_public" 
ON public.santri 
FOR SELECT 
TO public 
USING (true);

-- Pengurus yang terotentikasi (authenticated) memiliki akses penuh CRUD
CREATE POLICY "santri_all_authenticated" 
ON public.santri 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 4. POLICIES: TABEL pengajuan_santri
-- ==============================================================================
-- Publik dapat membuat pengajuan baru atau usulan pembaruan
CREATE POLICY "pengajuan_santri_insert_public" 
ON public.pengajuan_santri 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Publik dapat membaca status pengajuan santri (untuk mengecek apakah ada pending di portal)
CREATE POLICY "pengajuan_santri_select_public" 
ON public.pengajuan_santri 
FOR SELECT 
TO public 
USING (true);

-- Pengurus terotentikasi dapat melihat, mengubah, menyetujui, atau menolak pengajuan
CREATE POLICY "pengajuan_santri_all_authenticated" 
ON public.pengajuan_santri 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 5. POLICIES: TABEL log_pelanggaran
-- ==============================================================================
-- Publik dapat melihat riwayat pelanggaran santri (ditampilkan di portal /s/:kode)
CREATE POLICY "log_pelanggaran_select_public" 
ON public.log_pelanggaran 
FOR SELECT 
TO public 
USING (true);

-- Pengurus terotentikasi dapat menginput, memperbarui, dan menghapus log pelanggaran
CREATE POLICY "log_pelanggaran_all_authenticated" 
ON public.log_pelanggaran 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 6. POLICIES: TABEL santri_catatan & santri_prestasi
-- ==============================================================================
CREATE POLICY "santri_catatan_select_public" 
ON public.santri_catatan 
FOR SELECT 
TO public 
USING (true);

CREATE POLICY "santri_catatan_all_authenticated" 
ON public.santri_catatan 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "santri_prestasi_select_public" 
ON public.santri_prestasi 
FOR SELECT 
TO public 
USING (true);

CREATE POLICY "santri_prestasi_all_authenticated" 
ON public.santri_prestasi 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 7. POLICIES: TABEL master_jenis & master_role
-- ==============================================================================
-- Publik perlu membaca master_jenis dan master_role (untuk form pendaftaran pengguna & portal)
CREATE POLICY "master_jenis_select_public" 
ON public.master_jenis 
FOR SELECT 
TO public 
USING (true);

CREATE POLICY "master_jenis_all_authenticated" 
ON public.master_jenis 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "master_role_select_public" 
ON public.master_role 
FOR SELECT 
TO public 
USING (true);

CREATE POLICY "master_role_all_authenticated" 
ON public.master_role 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 8. POLICIES: TABEL pengguna
-- ==============================================================================
-- Pengguna dapat mendaftar (upsert akun mereka sendiri saat pertama kali login Google)
CREATE POLICY "pengguna_upsert_own_or_auth" 
ON public.pengguna 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 9. NOTIFIKASI POSTGREST RELOAD SCHEMA CACHE
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
