-- ==============================================================================
-- MIGRASI APPROVAL TRANSAKSIONAL: STORED PROCEDURE PostgreSQL (RPC)
-- Tanggal: 16 Oktober 2026
-- Petunjuk: Jalankan di SQL Editor dashboard Supabase Anda.
-- ==============================================================================

-- 1. FUNGSI APPROVAL TRANSAKSIONAL (ACID)
CREATE OR REPLACE FUNCTION public.approve_santri_submission(
    p_submission_id UUID,
    p_final_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_submission RECORD;
    v_santri_id UUID;
    v_kode_unik TEXT;
    v_clean_data JSONB;
BEGIN
    -- 1. Kunci baris pengajuan untuk mencegah double approval / race condition
    SELECT * INTO v_submission 
    FROM public.pengajuan_santri 
    WHERE id = p_submission_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan dengan ID % tidak ditemukan.', p_submission_id;
    END IF;

    IF v_submission.status_pengajuan <> 'Menunggu' THEN
        RAISE EXCEPTION 'Pengajuan ini sudah berstatus "%" dan tidak dapat disetujui kembali.', v_submission.status_pengajuan;
    END IF;

    -- 2. Bersihkan payload dari field internal atau non-kolom tabel santri
    v_clean_data := p_final_data - 'id' - 'created_at' - 'updated_at' - 'foto_profil' 
                                 - 'santri_id' - 'jenis_pengajuan' - 'status_pengajuan' - 'catatan_admin';

    -- 3. Eksekusi Berdasarkan Jenis Pengajuan
    IF v_submission.jenis_pengajuan = 'Baru' THEN
        -- Generate kode unik santri jika belum ada
        v_kode_unik := COALESCE(
            NULLIF(trim(p_final_data->>'kode_unik'), ''),
            'STR-' || upper(substr(md5(random()::text), 1, 6)) || upper(substr(to_hex(extract(epoch from now())::bigint), -3))
        );

        INSERT INTO public.santri (
            kode_unik,
            nama_lengkap,
            nis,
            nisn,
            nik,
            jenis_kelamin,
            tempat_lahir,
            tanggal_lahir,
            no_hp_santri,
            kelas,
            asrama,
            status,
            tanggal_masuk,
            alamat_jalan,
            desa_kelurahan,
            kecamatan,
            kabupaten_kota,
            provinsi,
            kode_pos,
            nama_ayah,
            pekerjaan_ayah,
            nama_ibu,
            pekerjaan_ibu,
            nama_wali,
            no_hp_wali,
            tahun_masuk,
            tahun_keluar,
            emis_id,
            status_sinkronisasi,
            catatan
        ) VALUES (
            v_kode_unik,
            NULLIF(trim(v_clean_data->>'nama_lengkap'), ''),
            NULLIF(trim(v_clean_data->>'nis'), ''),
            NULLIF(trim(v_clean_data->>'nisn'), ''),
            NULLIF(trim(v_clean_data->>'nik'), ''),
            COALESCE(NULLIF(trim(v_clean_data->>'jenis_kelamin'), ''), 'Laki-laki'),
            NULLIF(trim(v_clean_data->>'tempat_lahir'), ''),
            CASE WHEN NULLIF(trim(v_clean_data->>'tanggal_lahir'), '') IS NOT NULL 
                 THEN (v_clean_data->>'tanggal_lahir')::date 
                 ELSE NULL END,
            NULLIF(trim(v_clean_data->>'no_hp_santri'), ''),
            NULLIF(trim(v_clean_data->>'kelas'), ''),
            NULLIF(trim(v_clean_data->>'asrama'), ''),
            COALESCE(NULLIF(trim(v_clean_data->>'status'), ''), 'Aktif'),
            CASE WHEN NULLIF(trim(v_clean_data->>'tanggal_masuk'), '') IS NOT NULL 
                 THEN (v_clean_data->>'tanggal_masuk')::date 
                 ELSE CURRENT_DATE END,
            NULLIF(trim(v_clean_data->>'alamat_jalan'), ''),
            NULLIF(trim(v_clean_data->>'desa_kelurahan'), ''),
            NULLIF(trim(v_clean_data->>'kecamatan'), ''),
            NULLIF(trim(v_clean_data->>'kabupaten_kota'), ''),
            NULLIF(trim(v_clean_data->>'provinsi'), ''),
            NULLIF(trim(v_clean_data->>'kode_pos'), ''),
            NULLIF(trim(v_clean_data->>'nama_ayah'), ''),
            NULLIF(trim(v_clean_data->>'pekerjaan_ayah'), ''),
            NULLIF(trim(v_clean_data->>'nama_ibu'), ''),
            NULLIF(trim(v_clean_data->>'pekerjaan_ibu'), ''),
            NULLIF(trim(v_clean_data->>'nama_wali'), ''),
            NULLIF(trim(v_clean_data->>'no_hp_wali'), ''),
            NULLIF(trim(v_clean_data->>'tahun_masuk'), ''),
            NULLIF(trim(v_clean_data->>'tahun_keluar'), ''),
            NULLIF(trim(v_clean_data->>'emis_id'), ''),
            COALESCE(NULLIF(trim(v_clean_data->>'status_sinkronisasi'), ''), 'Belum Sinkron'),
            NULLIF(trim(v_clean_data->>'catatan'), '')
        )
        RETURNING id INTO v_santri_id;

    ELSE -- 'Update'
        v_santri_id := v_submission.santri_id;
        IF v_santri_id IS NULL THEN
            RAISE EXCEPTION 'ID santri pada pengajuan perbaikan data tidak boleh kosong.';
        END IF;

        UPDATE public.santri SET
            nama_lengkap        = COALESCE(NULLIF(trim(v_clean_data->>'nama_lengkap'), ''), nama_lengkap),
            nis                 = COALESCE(NULLIF(trim(v_clean_data->>'nis'), ''), nis),
            nisn                = COALESCE(NULLIF(trim(v_clean_data->>'nisn'), ''), nisn),
            nik                 = COALESCE(NULLIF(trim(v_clean_data->>'nik'), ''), nik),
            jenis_kelamin       = COALESCE(NULLIF(trim(v_clean_data->>'jenis_kelamin'), ''), jenis_kelamin),
            tempat_lahir        = COALESCE(NULLIF(trim(v_clean_data->>'tempat_lahir'), ''), tempat_lahir),
            tanggal_lahir       = CASE WHEN NULLIF(trim(v_clean_data->>'tanggal_lahir'), '') IS NOT NULL 
                                       THEN (v_clean_data->>'tanggal_lahir')::date 
                                       ELSE tanggal_lahir END,
            no_hp_santri        = COALESCE(NULLIF(trim(v_clean_data->>'no_hp_santri'), ''), no_hp_santri),
            kelas               = COALESCE(NULLIF(trim(v_clean_data->>'kelas'), ''), kelas),
            asrama              = COALESCE(NULLIF(trim(v_clean_data->>'asrama'), ''), asrama),
            status              = COALESCE(NULLIF(trim(v_clean_data->>'status'), ''), status),
            alamat_jalan        = COALESCE(NULLIF(trim(v_clean_data->>'alamat_jalan'), ''), alamat_jalan),
            desa_kelurahan      = COALESCE(NULLIF(trim(v_clean_data->>'desa_kelurahan'), ''), desa_kelurahan),
            kecamatan           = COALESCE(NULLIF(trim(v_clean_data->>'kecamatan'), ''), kecamatan),
            kabupaten_kota      = COALESCE(NULLIF(trim(v_clean_data->>'kabupaten_kota'), ''), kabupaten_kota),
            provinsi            = COALESCE(NULLIF(trim(v_clean_data->>'provinsi'), ''), provinsi),
            kode_pos            = COALESCE(NULLIF(trim(v_clean_data->>'kode_pos'), ''), kode_pos),
            nama_ayah           = COALESCE(NULLIF(trim(v_clean_data->>'nama_ayah'), ''), nama_ayah),
            pekerjaan_ayah      = COALESCE(NULLIF(trim(v_clean_data->>'pekerjaan_ayah'), ''), pekerjaan_ayah),
            nama_ibu            = COALESCE(NULLIF(trim(v_clean_data->>'nama_ibu'), ''), nama_ibu),
            pekerjaan_ibu       = COALESCE(NULLIF(trim(v_clean_data->>'pekerjaan_ibu'), ''), pekerjaan_ibu),
            nama_wali           = COALESCE(NULLIF(trim(v_clean_data->>'nama_wali'), ''), nama_wali),
            no_hp_wali          = COALESCE(NULLIF(trim(v_clean_data->>'no_hp_wali'), ''), no_hp_wali),
            tahun_masuk         = COALESCE(NULLIF(trim(v_clean_data->>'tahun_masuk'), ''), tahun_masuk),
            tahun_keluar        = COALESCE(NULLIF(trim(v_clean_data->>'tahun_keluar'), ''), tahun_keluar),
            catatan             = COALESCE(NULLIF(trim(v_clean_data->>'catatan'), ''), catatan),
            status_sinkronisasi = 'Dimodifikasi Manual',
            terakhir_sinkron    = now()
        WHERE id = v_santri_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Data santri dengan ID % tidak ditemukan di Buku Induk.', v_santri_id;
        END IF;
    END IF;

    -- 4. Mutasi status pengajuan menjadi 'Disetujui' dalam satu transaksi utuh
    UPDATE public.pengajuan_santri SET
        status_pengajuan = 'Disetujui',
        santri_id        = v_santri_id,
        data_pengajuan   = v_clean_data
    WHERE id = p_submission_id;

    RETURN jsonb_build_object(
        'success', true,
        'santri_id', v_santri_id,
        'jenis_pengajuan', v_submission.jenis_pengajuan,
        'message', 'Pengajuan berhasil disetujui secara transaksional.'
    );
END;
$$;

-- 2. FUNGSI PENOLAKAN TRANSAKSIONAL (RPC)
CREATE OR REPLACE FUNCTION public.reject_santri_submission(
    p_submission_id UUID,
    p_catatan_admin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.pengajuan_santri SET
        status_pengajuan = 'Ditolak',
        catatan_admin    = p_catatan_admin
    WHERE id = p_submission_id AND status_pengajuan = 'Menunggu';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan atau sudah tidak berstatus Menunggu.';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Beri izin eksekusi ke role authenticated (Pengurus / Admin yang login)
GRANT EXECUTE ON FUNCTION public.approve_santri_submission(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_santri_submission(UUID, TEXT) TO authenticated;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
