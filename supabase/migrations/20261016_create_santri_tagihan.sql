-- ==============================================================================
-- MIGRASI MODUL KEUANGAN RIIL: TABEL santri_tagihan & ROW LEVEL SECURITY
-- Tanggal: 16 Oktober 2026
-- Petunjuk: Jalankan di SQL Editor dashboard Supabase Anda.
-- ==============================================================================

-- 1. Buat Tabel santri_tagihan
CREATE TABLE IF NOT EXISTS public.santri_tagihan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    santri_id UUID NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
    judul TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'Syahriah', -- Syahriah, Pendaftaran, Kitab, Kegiatan, Lainnya
    periode TEXT, -- Contoh: 'Oktober 2026', 'Semester Ganjil 2026/2027'
    nominal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    jumlah_terbayar NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Belum Lunas', -- Lunas, Sebagian, Belum Lunas, Gratis/Beasiswa
    jatuh_tempo DATE,
    tgl_bayar_terakhir TIMESTAMPTZ,
    metode_pembayaran TEXT, -- Tunai, Transfer Bank, QRIS, Potongan Beasiswa
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Buat Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_santri_tagihan_santri_id ON public.santri_tagihan(santri_id);
CREATE INDEX IF NOT EXISTS idx_santri_tagihan_status ON public.santri_tagihan(status);
CREATE INDEX IF NOT EXISTS idx_santri_tagihan_kategori ON public.santri_tagihan(kategori);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.santri_tagihan ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Akses Baca Publik (untuk Portal Santri / Wali di rute /s/:kode)
DROP POLICY IF EXISTS "santri_tagihan_select_public" ON public.santri_tagihan;
CREATE POLICY "santri_tagihan_select_public" 
ON public.santri_tagihan 
FOR SELECT 
TO public 
USING (true);

-- 5. Policy: Akses Penuh Pengurus / Bendahara Terotentikasi (CRUD)
DROP POLICY IF EXISTS "santri_tagihan_all_authenticated" ON public.santri_tagihan;
CREATE POLICY "santri_tagihan_all_authenticated" 
ON public.santri_tagihan 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. Trigger update updated_at otomatis
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_santri_tagihan_updated_at ON public.santri_tagihan;
CREATE TRIGGER trigger_santri_tagihan_updated_at
BEFORE UPDATE ON public.santri_tagihan
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 7. Muat ulang cache skema PostgREST agar API Supabase segera mengenali tabel baru
NOTIFY pgrst, 'reload schema';
