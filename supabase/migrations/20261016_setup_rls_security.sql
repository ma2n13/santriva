-- ==============================================================================
-- MIGRASI KEAMANAN: AKTIFKAN ROW LEVEL SECURITY (RLS) & POLICY UNTUK SANTRIVA
-- Tanggal: 16 Oktober 2026
-- Petunjuk: Jalankan skrip ini di SQL Editor dashboard Supabase Anda.
-- Skrip ini sepenuhnya IDEMPOTEN (dapat dijalankan berulang kali dengan aman).
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

-- 2. BERSIHKAN POLICY LAMA DARI REPO SEBELUMNYA (JIKA ADA)
DROP POLICY IF EXISTS "Publik bisa melihat data santri" ON public.santri;
DROP POLICY IF EXISTS "Publik bisa membuat pengajuan" ON public.pengajuan_santri;
DROP POLICY IF EXISTS "Publik bisa melihat data pengajuan tertentu" ON public.pengajuan_santri;
DROP POLICY IF EXISTS "Admin bisa mengubah data pengajuan" ON public.pengajuan_santri;

-- ==============================================================================
-- 3. POLICIES: TABEL santri
-- ==============================================================================
DROP POLICY IF EXISTS "santri_select_public" ON public.santri;
CREATE POLICY "santri_select_public" 
ON public.santri 
FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "santri_all_authenticated" ON public.santri;
CREATE POLICY "santri_all_authenticated" 
ON public.santri 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 4. POLICIES: TABEL pengajuan_santri
-- ==============================================================================
DROP POLICY IF EXISTS "pengajuan_santri_insert_public" ON public.pengajuan_santri;
CREATE POLICY "pengajuan_santri_insert_public" 
ON public.pengajuan_santri 
FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "pengajuan_santri_select_public" ON public.pengajuan_santri;
CREATE POLICY "pengajuan_santri_select_public" 
ON public.pengajuan_santri 
FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "pengajuan_santri_all_authenticated" ON public.pengajuan_santri;
CREATE POLICY "pengajuan_santri_all_authenticated" 
ON public.pengajuan_santri 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 5. POLICIES: TABEL log_pelanggaran
-- ==============================================================================
DROP POLICY IF EXISTS "log_pelanggaran_select_public" ON public.log_pelanggaran;
CREATE POLICY "log_pelanggaran_select_public" 
ON public.log_pelanggaran 
FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "log_pelanggaran_all_authenticated" ON public.log_pelanggaran;
CREATE POLICY "log_pelanggaran_all_authenticated" 
ON public.log_pelanggaran 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 6. POLICIES: TABEL santri_catatan & santri_prestasi
-- ==============================================================================
DROP POLICY IF EXISTS "santri_catatan_select_public" ON public.santri_catatan;
CREATE POLICY "santri_catatan_select_public" 
ON public.santri_catatan 
FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "santri_catatan_all_authenticated" ON public.santri_catatan;
CREATE POLICY "santri_catatan_all_authenticated" 
ON public.santri_catatan 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "santri_prestasi_select_public" ON public.santri_prestasi;
CREATE POLICY "santri_prestasi_select_public" 
ON public.santri_prestasi 
FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "santri_prestasi_all_authenticated" ON public.santri_prestasi;
CREATE POLICY "santri_prestasi_all_authenticated" 
ON public.santri_prestasi 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 7. POLICIES: TABEL master_jenis & master_role
-- ==============================================================================
DROP POLICY IF EXISTS "master_jenis_select_public" ON public.master_jenis;
CREATE POLICY "master_jenis_select_public" 
ON public.master_jenis 
FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "master_jenis_all_authenticated" ON public.master_jenis;
CREATE POLICY "master_jenis_all_authenticated" 
ON public.master_jenis 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "master_role_select_public" ON public.master_role;
CREATE POLICY "master_role_select_public" 
ON public.master_role 
FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "master_role_all_authenticated" ON public.master_role;
CREATE POLICY "master_role_all_authenticated" 
ON public.master_role 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 8. POLICIES: TABEL pengguna & manage_users
-- ==============================================================================
DROP POLICY IF EXISTS "pengguna_upsert_own_or_auth" ON public.pengguna;
CREATE POLICY "pengguna_upsert_own_or_auth" 
ON public.pengguna 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "manage_users_all_authenticated" ON public.manage_users;
CREATE POLICY "manage_users_all_authenticated" 
ON public.manage_users 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ==============================================================================
-- 9. NOTIFIKASI POSTGREST RELOAD SCHEMA CACHE
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
