-- Santriva anonymous public RPC verification
--
-- Run this file twice in Supabase SQL Editor:
-- 1. Before migration 02: it MUST fail with PUBLIC_RPC_TEST_FAILED.
-- 2. After migration 02: it MUST return PUBLIC_SECURITY_FUNCTIONS_TEST_OK.
--
-- All fixtures are inside one transaction and are rolled back at the end.

begin;

do $$
declare
  v_missing text;
begin
  select string_agg(signature, ', ' order by signature)
    into v_missing
  from (
    values
      ('public.get_wali_portal(text)', to_regprocedure('public.get_wali_portal(text)')),
      ('public.submit_pengajuan_wali(text,jsonb,jsonb)', to_regprocedure('public.submit_pengajuan_wali(text,jsonb,jsonb)')),
      ('public.search_santri_public(text,integer,integer)', to_regprocedure('public.search_santri_public(text,integer,integer)')),
      ('public.get_ringkasan_santri_public(uuid)', to_regprocedure('public.get_ringkasan_santri_public(uuid)')),
      ('public.submit_koreksi_public(uuid,jsonb,jsonb)', to_regprocedure('public.submit_koreksi_public(uuid,jsonb,jsonb)')),
      ('public.request_wali_access(uuid,jsonb)', to_regprocedure('public.request_wali_access(uuid,jsonb)')),
      ('public.submit_pendaftaran_baru(jsonb,jsonb)', to_regprocedure('public.submit_pendaftaran_baru(jsonb,jsonb)'))
  ) as required_functions(signature, function_oid)
  where function_oid is null;

  if v_missing is not null then
    raise exception 'PUBLIC_RPC_TEST_FAILED: fungsi belum tersedia: %', v_missing;
  end if;

  if pg_get_function_result('public.get_wali_portal(text)'::regprocedure) <> 'jsonb'
     or pg_get_function_result('public.submit_pengajuan_wali(text,jsonb,jsonb)'::regprocedure) <> 'uuid'
     or pg_get_function_result('public.get_ringkasan_santri_public(uuid)'::regprocedure) <> 'jsonb'
     or pg_get_function_result('public.submit_koreksi_public(uuid,jsonb,jsonb)'::regprocedure) <> 'uuid'
     or pg_get_function_result('public.request_wali_access(uuid,jsonb)'::regprocedure) <> 'uuid'
     or pg_get_function_result('public.submit_pendaftaran_baru(jsonb,jsonb)'::regprocedure) <> 'uuid' then
    raise exception 'PUBLIC_RPC_TEST_FAILED: return type satu atau lebih fungsi tidak sesuai';
  end if;

  if pg_get_function_result('public.search_santri_public(text,integer,integer)'::regprocedure)
     not like 'TABLE(selection_token uuid, nama_lengkap text, status text, tahun_masuk text, tahun_keluar text, kelas text, asrama text, desa_kelurahan text, kecamatan text, kabupaten_kota text, total_count bigint)' then
    raise exception 'PUBLIC_RPC_TEST_FAILED: kontrak hasil pencarian publik tidak sesuai';
  end if;

  if not has_function_privilege('anon', 'public.get_wali_portal(text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.submit_pengajuan_wali(text,jsonb,jsonb)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.search_santri_public(text,integer,integer)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.get_ringkasan_santri_public(uuid)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.submit_koreksi_public(uuid,jsonb,jsonb)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.request_wali_access(uuid,jsonb)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.submit_pendaftaran_baru(jsonb,jsonb)', 'EXECUTE') then
    raise exception 'PUBLIC_RPC_TEST_FAILED: anon belum memperoleh EXECUTE yang diperlukan';
  end if;

  if has_function_privilege('anon', 'private.normalize_wali_token(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.generate_wali_token()', 'EXECUTE')
     or has_function_privilege('anon', 'private.mask_identifier(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.mask_phone(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.filter_santri_payload(jsonb,text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.filter_pengaju_payload(jsonb)', 'EXECUTE') then
    raise exception 'PUBLIC_RPC_TEST_FAILED: anon dapat menjalankan helper private';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'review_pengajuan',
        'get_or_create_wali_token',
        'rotate_wali_token',
        'set_wali_access_status',
        'review_wali_access_request',
        'admin_save_role',
        'admin_delete_role',
        'admin_update_user'
      )
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'PUBLIC_RPC_TEST_FAILED: anon dapat menjalankan fungsi administratif';
  end if;
end
$$;

create temporary table _public_rpc_test_context (
  santri_a uuid not null,
  santri_b uuid not null,
  prefix text not null,
  token_a text not null,
  token_b text not null,
  initial_santri_a jsonb not null,
  search_token uuid,
  portal_submission uuid,
  public_submission uuid,
  access_request uuid,
  new_registration uuid
) on commit drop;

create temporary table _public_rpc_search_results (
  selection_token uuid,
  nama_lengkap text,
  status text,
  tahun_masuk text,
  tahun_keluar text,
  kelas text,
  asrama text,
  desa_kelurahan text,
  kecamatan text,
  kabupaten_kota text,
  total_count bigint
) on commit drop;

grant select, insert, update on _public_rpc_test_context to anon;
grant select, insert, update on _public_rpc_search_results to anon;

do $$
declare
  v_santri_a uuid := gen_random_uuid();
  v_santri_b uuid := gen_random_uuid();
  v_prefix text := 'ZZZRPC' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_jenis uuid := gen_random_uuid();
  v_generated text;
begin
  for i in 1..25 loop
    v_generated := private.generate_wali_token();
    if v_generated !~ '^[0-9A-HJKMNP-TV-Z]{10}$' then
      raise exception 'PUBLIC_RPC_TEST_FAILED: generator menghasilkan token tidak valid: %', v_generated;
    end if;
  end loop;

  insert into public.santri (
    id, nama_lengkap, nis, nisn, nik, jenis_kelamin, tempat_lahir,
    tanggal_lahir, no_hp_santri, kelas, asrama, status, tahun_masuk,
    alamat_jalan, desa_kelurahan, kecamatan, kabupaten_kota, provinsi,
    nama_ayah, nama_ibu, nama_wali, no_hp_wali
  ) values
  (
    v_santri_a, v_prefix || ' A', 'TST-A', '1234567890', '1234567890123456',
    'Laki-laki', 'Jepara', date '2001-02-03', '081234567890', '1A',
    'Utara', 'Aktif', '2020', 'Jalan Rahasia A', 'Desa A', 'Kecamatan A',
    'Kabupaten A', 'Jawa Tengah', 'Ayah A', 'Ibu A', 'Wali A', '081111111111'
  ),
  (
    v_santri_b, v_prefix || ' B', 'TST-B', '0987654321', '6543210987654321',
    'Perempuan', 'Kudus', date '2002-03-04', '082345678901', '1B',
    'Selatan', 'Alumni', '2021', 'Jalan Rahasia B', 'Desa B', 'Kecamatan B',
    'Kabupaten B', 'Jawa Tengah', 'Ayah B', 'Ibu B', 'Wali B', '082222222222'
  );

  insert into public.santri (id, nama_lengkap, status, tahun_masuk)
  select gen_random_uuid(), v_prefix || ' ' || lpad(g::text, 2, '0'), 'Aktif', '2022'
  from generate_series(1, 23) as g;

  insert into public.master_jenis (id, nama, tipe)
  values (v_jenis, v_prefix || ' Pelanggaran', 'Pelanggaran');

  insert into public.log_pelanggaran (
    santri_id, jenis_id, tgl_melanggar, status_tazir, keterangan
  ) values (
    v_santri_a, v_jenis, current_date, 'Belum', 'Pelanggaran uji A'
  );

  insert into public.santri_catatan (santri_id, isi, tampil_ke_wali)
  values
    (v_santri_a, 'CATATAN_INTERNAL_RAHASIA', false),
    (v_santri_a, 'CATATAN_BOLEH_WALI', true);

  insert into public.santri_prestasi (santri_id, prestasi)
  values (v_santri_a, 'PRESTASI_UJI_A');

  insert into private.wali_portal_access (santri_id, token, aktif)
  values
    (v_santri_a, 'ABCDE23456', true),
    (v_santri_b, 'FGHJK78901', true);

  insert into _public_rpc_test_context (
    santri_a, santri_b, prefix, token_a, token_b, initial_santri_a
  )
  select v_santri_a, v_santri_b, v_prefix, 'ABCDE23456', 'FGHJK78901', to_jsonb(s)
  from public.santri s
  where s.id = v_santri_a;
end
$$;

set local role anon;

do $$
declare
  v_context _public_rpc_test_context%rowtype;
  v_portal jsonb;
  v_submission uuid;
  v_rejected boolean := false;
begin
  select * into v_context from _public_rpc_test_context limit 1;

  v_portal := public.get_wali_portal('abcde-23456');

  if v_portal is null then
    raise exception 'PUBLIC_RPC_TEST_FAILED: token A yang aktif tidak membuka portal';
  end if;

  if v_portal #>> '{profil,nama_lengkap}' <> v_context.prefix || ' A' then
    raise exception 'PUBLIC_RPC_TEST_FAILED: token A tidak mengarah tepat ke santri A';
  end if;

  if v_portal::text like '%' || (v_context.santri_b::text) || '%'
     or v_portal::text like '%' || v_context.prefix || ' B%' then
    raise exception 'PUBLIC_RPC_TEST_FAILED: token A membocorkan data santri B';
  end if;

  if v_portal::text like '%1234567890123456%'
     or v_portal::text like '%1234567890%'
     or v_portal::text like '%081234567890%'
     or v_portal::text like '%081111111111%' then
    raise exception 'PUBLIC_RPC_TEST_FAILED: identifier atau nomor HP utuh bocor dari portal';
  end if;

  if v_portal::text like '%CATATAN_INTERNAL_RAHASIA%'
     or v_portal::text not like '%CATATAN_BOLEH_WALI%'
     or v_portal::text not like '%PRESTASI_UJI_A%'
     or v_portal::text not like '%Pelanggaran uji A%' then
    raise exception 'PUBLIC_RPC_TEST_FAILED: penyaringan isi portal tidak sesuai';
  end if;

  if public.get_wali_portal('TOKEN-SALAH') is not null then
    raise exception 'PUBLIC_RPC_TEST_FAILED: token salah menghasilkan data';
  end if;

  v_submission := public.submit_pengajuan_wali(
    'abcde-23456',
    jsonb_build_object('nama_lengkap', v_context.prefix || ' A Koreksi'),
    jsonb_build_object(
      'nama_pengaju', 'Pengaju Portal',
      'hubungan', 'Wali',
      'kontak_wa', '081200000001'
    )
  );

  update _public_rpc_test_context
  set portal_submission = v_submission;

  begin
    perform public.submit_pengajuan_wali(
      'abcde-23456',
      '{"kode_unik":"BOCOR"}'::jsonb,
      '{"nama_pengaju":"X","hubungan":"Wali","kontak_wa":"081200000001"}'::jsonb
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'PUBLIC_RPC_TEST_FAILED: field di luar allowlist diterima';
  end if;

  v_rejected := false;
  begin
    perform * from public.search_santri_public('ab', 1, 20);
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'PUBLIC_RPC_TEST_FAILED: pencarian dua huruf tidak ditolak';
  end if;
end
$$;

insert into _public_rpc_search_results
select *
from public.search_santri_public(
  (select prefix from _public_rpc_test_context limit 1),
  1,
  999
);

do $$
declare
  v_context _public_rpc_test_context%rowtype;
  v_count integer;
  v_total bigint;
  v_selection uuid;
  v_summary jsonb;
  v_public_submission uuid;
  v_access_request uuid;
  v_registration uuid;
begin
  select * into v_context from _public_rpc_test_context limit 1;
  select count(*), max(total_count)
    into v_count, v_total
  from _public_rpc_search_results;

  select results.selection_token
    into v_selection
  from _public_rpc_search_results results
  order by results.selection_token::text
  limit 1;

  if v_count <> 20 or v_total <> 25 then
    raise exception 'PUBLIC_RPC_TEST_FAILED: pagination wajib 20 gagal (rows %, total %)', v_count, v_total;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema like 'pg_temp%'
      and table_name = '_public_rpc_search_results'
      and column_name = 'santri_id'
  ) then
    raise exception 'PUBLIC_RPC_TEST_FAILED: pencarian publik mengembalikan santri_id';
  end if;

  v_summary := public.get_ringkasan_santri_public(v_selection);
  if v_summary is null
     or v_summary::text like '%' || v_context.santri_a::text || '%'
     or v_summary::text like '%1234567890123456%'
     or v_summary::text like '%1234567890%'
     or v_summary::text like '%081234567890%' then
    raise exception 'PUBLIC_RPC_TEST_FAILED: ringkasan publik kosong atau membocorkan data utuh';
  end if;

  v_public_submission := public.submit_koreksi_public(
    v_selection,
    '{"pekerjaan_ibu":"Guru"}'::jsonb,
    '{"nama_pengaju":"Pengaju Publik","hubungan":"Alumni","kontak_wa":"081200000002"}'::jsonb
  );

  v_access_request := public.request_wali_access(
    v_selection,
    '{"nama_pengaju":"Peminta Akses","hubungan":"Wali","kontak_wa":"081200000003"}'::jsonb
  );

  v_registration := public.submit_pendaftaran_baru(
    jsonb_build_object(
      'nama_lengkap', v_context.prefix || ' PENDAFTAR BARU',
      'jenis_kelamin', 'Laki-laki',
      'tempat_lahir', 'Jepara',
      'tanggal_lahir', '2010-01-02',
      'nama_ayah', 'Ayah Pendaftar',
      'nama_ibu', 'Ibu Pendaftar',
      'no_hp_wali', '081200000004'
    ),
    '{"nama_pengaju":"Pendaftar","hubungan":"Orang Tua","kontak_wa":"081200000004"}'::jsonb
  );

  update _public_rpc_test_context
  set search_token = v_selection,
      public_submission = v_public_submission,
      access_request = v_access_request,
      new_registration = v_registration;
end
$$;

reset role;

do $$
declare
  v_context _public_rpc_test_context%rowtype;
  v_current_santri jsonb;
begin
  select * into v_context from _public_rpc_test_context limit 1;
  select to_jsonb(s) into v_current_santri
  from public.santri s
  where s.id = v_context.santri_a;

  if v_current_santri <> v_context.initial_santri_a then
    raise exception 'PUBLIC_RPC_TEST_FAILED: pengajuan mengubah tabel santri secara langsung';
  end if;

  if not exists (
    select 1 from public.pengajuan_santri p
    where p.id = v_context.portal_submission
      and p.santri_id = v_context.santri_a
      and p.jenis_pengajuan = 'Update'
      and p.status_pengajuan = 'Menunggu'
      and p.sumber_pengajuan = 'portal_wali'
      and p.informasi_pengaju ->> 'nama_pengaju' = 'Pengaju Portal'
      and p.data_pengajuan ? 'nama_lengkap'
      and not (p.data_pengajuan ? 'kontak_wa')
  ) then
    raise exception 'PUBLIC_RPC_TEST_FAILED: pengajuan portal tidak tersimpan dengan benar';
  end if;

  if not exists (
    select 1 from public.pengajuan_santri p
    where p.id = v_context.public_submission
      and p.jenis_pengajuan = 'Update'
      and p.status_pengajuan = 'Menunggu'
      and p.sumber_pengajuan = 'pencarian_publik'
      and p.informasi_pengaju ->> 'nama_pengaju' = 'Pengaju Publik'
  ) then
    raise exception 'PUBLIC_RPC_TEST_FAILED: koreksi publik tidak tersimpan dengan benar';
  end if;

  if not exists (
    select 1 from public.permintaan_akses_wali r
    where r.id = v_context.access_request
      and r.status = 'Menunggu'
      and r.nama_pengaju = 'Peminta Akses'
  ) then
    raise exception 'PUBLIC_RPC_TEST_FAILED: permintaan akses tidak masuk antrean';
  end if;

  if not exists (
    select 1 from public.pengajuan_santri p
    where p.id = v_context.new_registration
      and p.santri_id is null
      and p.jenis_pengajuan = 'Baru'
      and p.status_pengajuan = 'Menunggu'
      and p.sumber_pengajuan = 'pendaftaran_publik'
      and p.data_pengajuan ? 'nama_lengkap'
      and not (p.data_pengajuan ? 'nis')
      and not (p.data_pengajuan ? 'status')
      and not (p.data_pengajuan ? 'kode_unik')
  ) then
    raise exception 'PUBLIC_RPC_TEST_FAILED: pendaftaran baru tidak tersimpan dengan benar';
  end if;

  update private.wali_portal_access
  set aktif = false, disabled_at = now()
  where santri_id = v_context.santri_b;

  update private.public_search_selection
  set expires_at = now() - interval '1 minute'
  where token = v_context.search_token;
end
$$;

set local role anon;

do $$
declare
  v_context _public_rpc_test_context%rowtype;
  v_expired_rejected boolean := false;
begin
  select * into v_context from _public_rpc_test_context limit 1;

  if public.get_wali_portal(v_context.token_b) is not null then
    raise exception 'PUBLIC_RPC_TEST_FAILED: token nonaktif masih dapat membuka portal';
  end if;

  begin
    perform public.get_ringkasan_santri_public(v_context.search_token);
  exception when others then
    v_expired_rejected := true;
  end;

  if not v_expired_rejected then
    raise exception 'PUBLIC_RPC_TEST_FAILED: selection token kedaluwarsa masih diterima';
  end if;
end
$$;

reset role;

select
  'PUBLIC_SECURITY_FUNCTIONS_TEST_OK' as result,
  25 as fixture_santri_dibuat_dan_dibatalkan,
  20 as hasil_per_halaman,
  true as data_uji_akan_dirollback;

rollback;
