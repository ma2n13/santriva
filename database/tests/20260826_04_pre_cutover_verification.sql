-- Santriva pre-cutover verification
--
-- Read-only hard gate before enabling RLS and revoking legacy table grants.
-- Run this file in full in Supabase SQL Editor. A passing run ends with
-- PRE_CUTOVER_VERIFICATION_OK. This file never enables RLS or changes data.

begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

do $$
declare
  v_signature text;
  v_oid regprocedure;
  v_owner text;
  v_security_definer boolean;
  v_config text;
  v_missing text[] := array[]::text[];
  v_untrusted_owner text[] := array[]::text[];
  v_unsafe_search_path text[] := array[]::text[];
  v_all_functions constant text[] := array[
    'private.normalize_wali_token(text)',
    'private.generate_wali_token()',
    'private.mask_identifier(text)',
    'private.mask_phone(text)',
    'private.filter_santri_payload(jsonb,text)',
    'private.filter_pengaju_payload(jsonb)',
    'private.has_permission(text)',
    'private.require_permission(text)',
    'private.validate_role_permissions(jsonb)',
    'private.apply_santri_payload(uuid,jsonb,text)',
    'public.get_wali_portal(text)',
    'public.submit_pengajuan_wali(text,jsonb,jsonb)',
    'public.search_santri_public(text,integer,integer)',
    'public.get_ringkasan_santri_public(uuid)',
    'public.submit_koreksi_public(uuid,jsonb,jsonb)',
    'public.request_wali_access(uuid,jsonb)',
    'public.submit_pendaftaran_baru(jsonb,jsonb)',
    'public.get_my_profile()',
    'public.list_registration_roles()',
    'public.register_my_profile(text,text)',
    'public.review_pengajuan(uuid,text,text)',
    'public.get_or_create_wali_token(uuid)',
    'public.rotate_wali_token(uuid)',
    'public.set_wali_access_status(uuid,boolean)',
    'public.review_wali_access_request(uuid,text,text)',
    'public.admin_save_role(uuid,text,jsonb)',
    'public.admin_delete_role(uuid)',
    'public.admin_update_user(uuid,uuid,text)',
    'public.get_takziran_santri(text)'
  ];
begin
  foreach v_signature in array v_all_functions loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null then
      v_missing := array_append(v_missing, v_signature);
      continue;
    end if;

    select pg_get_userbyid(p.proowner), p.prosecdef,
           coalesce(array_to_string(p.proconfig, ','), '')
      into v_owner, v_security_definer, v_config
    from pg_proc p
    where p.oid = v_oid;

    if v_owner not in ('postgres', 'supabase_admin') then
      v_untrusted_owner := array_append(v_untrusted_owner, v_signature || ' owner=' || coalesce(v_owner, 'NULL'));
    end if;

    if v_security_definer and v_config not like '%search_path=%' then
      v_unsafe_search_path := array_append(v_unsafe_search_path, v_signature);
    end if;
  end loop;

  if cardinality(v_missing) > 0 then
    raise exception 'PRE_CUTOVER_FAILED: fungsi belum tersedia: %', array_to_string(v_missing, ', ');
  end if;
  if cardinality(v_untrusted_owner) > 0 then
    raise exception 'PRE_CUTOVER_FAILED: owner fungsi tidak tepercaya: %', array_to_string(v_untrusted_owner, ', ');
  end if;
  if cardinality(v_unsafe_search_path) > 0 then
    raise exception 'PRE_CUTOVER_FAILED: SECURITY DEFINER tanpa search_path aman: %', array_to_string(v_unsafe_search_path, ', ');
  end if;
end
$$;

do $$
declare
  v_signature text;
  v_oid regprocedure;
  v_invalid text[] := array[]::text[];
  v_anon_functions constant text[] := array[
    'public.get_wali_portal(text)',
    'public.submit_pengajuan_wali(text,jsonb,jsonb)',
    'public.search_santri_public(text,integer,integer)',
    'public.get_ringkasan_santri_public(uuid)',
    'public.submit_koreksi_public(uuid,jsonb,jsonb)',
    'public.request_wali_access(uuid,jsonb)',
    'public.submit_pendaftaran_baru(jsonb,jsonb)'
  ];
  v_authenticated_functions constant text[] := array[
    'public.get_my_profile()',
    'public.list_registration_roles()',
    'public.register_my_profile(text,text)',
    'public.review_pengajuan(uuid,text,text)',
    'public.get_or_create_wali_token(uuid)',
    'public.rotate_wali_token(uuid)',
    'public.set_wali_access_status(uuid,boolean)',
    'public.review_wali_access_request(uuid,text,text)',
    'public.admin_save_role(uuid,text,jsonb)',
    'public.admin_delete_role(uuid)',
    'public.admin_update_user(uuid,uuid,text)',
    'public.get_takziran_santri(text)'
  ];
begin
  foreach v_signature in array v_anon_functions loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null
       or not has_function_privilege('anon', v_oid, 'EXECUTE')
       or not has_function_privilege('authenticated', v_oid, 'EXECUTE') then
      v_invalid := array_append(v_invalid, v_signature || ' public grant');
    end if;
  end loop;

  foreach v_signature in array v_authenticated_functions loop
    v_oid := to_regprocedure(v_signature);
    if v_oid is null
       or not has_function_privilege('authenticated', v_oid, 'EXECUTE')
       or has_function_privilege('anon', v_oid, 'EXECUTE') then
      v_invalid := array_append(v_invalid, v_signature || ' authenticated grant');
    end if;
  end loop;

  if not has_schema_privilege('authenticated', 'private', 'USAGE')
     or has_schema_privilege('anon', 'private', 'USAGE')
     or not has_function_privilege('authenticated', 'private.has_permission(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.has_permission(text)', 'EXECUTE') then
    v_invalid := array_append(v_invalid, 'private.has_permission/schema private');
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname <> 'has_permission'
      and p.oid in (
        to_regprocedure('private.normalize_wali_token(text)'),
        to_regprocedure('private.generate_wali_token()'),
        to_regprocedure('private.mask_identifier(text)'),
        to_regprocedure('private.mask_phone(text)'),
        to_regprocedure('private.filter_santri_payload(jsonb,text)'),
        to_regprocedure('private.filter_pengaju_payload(jsonb)'),
        to_regprocedure('private.require_permission(text)'),
        to_regprocedure('private.validate_role_permissions(jsonb)'),
        to_regprocedure('private.apply_santri_payload(uuid,jsonb,text)')
      )
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ) then
    v_invalid := array_append(v_invalid, 'helper private terbuka ke API role');
  end if;

  if cardinality(v_invalid) > 0 then
    raise exception 'PRE_CUTOVER_FAILED: grant RPC tidak sesuai: %', array_to_string(v_invalid, ', ');
  end if;

  if pg_get_function_result('public.get_takziran_santri(text)'::regprocedure)
       <> 'TABLE(id uuid, nama_lengkap text, nis text, kelas text, asrama text)' then
    raise exception 'PRE_CUTOVER_FAILED: kontrak takziran membocorkan kolom tambahan';
  end if;

  if pg_get_function_result('public.search_santri_public(text,integer,integer)'::regprocedure)
       not like 'TABLE(selection_token uuid, nama_lengkap text, status text, tahun_masuk text, tahun_keluar text, kelas text, asrama text, desa_kelurahan text, kecamatan text, kabupaten_kota text, total_count bigint)' then
    raise exception 'PRE_CUTOVER_FAILED: kontrak pencarian publik berubah';
  end if;
end
$$;

do $$
declare
  v_missing text;
begin
  select string_agg(required.policy_name, ', ' order by required.policy_name)
    into v_missing
  from (
    values
      ('santri', 'santri_select_with_akses_induk'),
      ('santri', 'santri_insert_with_edit_induk'),
      ('santri', 'santri_update_with_edit_induk'),
      ('santri', 'santri_delete_with_hapus_induk'),
      ('pengajuan_santri', 'pengajuan_select_with_validasi_pengajuan'),
      ('pengguna', 'pengguna_select_self_or_kelola'),
      ('master_role', 'master_role_select_with_kelola_pengguna'),
      ('master_jenis', 'master_jenis_select_with_akses_takziran'),
      ('master_jenis', 'master_jenis_insert_with_input_takziran'),
      ('master_jenis', 'master_jenis_update_with_input_takziran'),
      ('master_jenis', 'master_jenis_delete_with_input_takziran'),
      ('log_pelanggaran', 'log_pelanggaran_select_with_akses_takziran'),
      ('log_pelanggaran', 'log_pelanggaran_insert_with_input_takziran'),
      ('log_pelanggaran', 'log_pelanggaran_update_with_input_takziran'),
      ('log_pelanggaran', 'log_pelanggaran_delete_with_input_takziran'),
      ('santri_catatan', 'santri_catatan_select_with_akses_induk'),
      ('santri_catatan', 'santri_catatan_insert_with_edit_induk'),
      ('santri_catatan', 'santri_catatan_update_with_edit_induk'),
      ('santri_catatan', 'santri_catatan_delete_with_edit_induk'),
      ('santri_prestasi', 'santri_prestasi_select_with_akses_induk'),
      ('santri_prestasi', 'santri_prestasi_insert_with_edit_induk'),
      ('santri_prestasi', 'santri_prestasi_update_with_edit_induk'),
      ('santri_prestasi', 'santri_prestasi_delete_with_edit_induk'),
      ('permintaan_akses_wali', 'permintaan_akses_wali_select_with_edit_induk')
  ) required(table_name, policy_name)
  left join pg_policies policy
    on policy.schemaname = 'public'
   and policy.tablename = required.table_name
   and policy.policyname = required.policy_name
  where policy.policyname is null;

  if v_missing is not null then
    raise exception 'PRE_CUTOVER_FAILED: policy staged belum lengkap: %', v_missing;
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'santri', 'pengguna', 'master_role', 'pengajuan_santri',
        'log_pelanggaran', 'santri_catatan', 'santri_prestasi',
        'master_jenis', 'manage_users', 'permintaan_akses_wali'
      )
      and c.relrowsecurity
  ) then
    raise exception 'PRE_CUTOVER_FAILED: RLS sudah aktif sebelum hard gate';
  end if;
end
$$;

do $$
declare
  v_missing text[] := array[]::text[];
  v_private_owner text;
begin
  select pg_get_userbyid(n.nspowner)
    into v_private_owner
  from pg_namespace n
  where n.nspname = 'private';

  if v_private_owner not in ('postgres', 'supabase_admin') then
    raise exception 'PRE_CUTOVER_FAILED: schema private tidak ada atau owner tidak tepercaya: %', coalesce(v_private_owner, 'NULL');
  end if;

  if to_regclass('private.wali_portal_access') is null then
    v_missing := array_append(v_missing, 'private.wali_portal_access');
  end if;
  if to_regclass('private.public_search_selection') is null then
    v_missing := array_append(v_missing, 'private.public_search_selection');
  end if;
  if to_regclass('public.permintaan_akses_wali') is null then
    v_missing := array_append(v_missing, 'public.permintaan_akses_wali');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pengajuan_santri'
      and column_name = 'sumber_pengajuan' and data_type = 'text' and is_nullable = 'NO'
  ) then
    v_missing := array_append(v_missing, 'pengajuan_santri.sumber_pengajuan');
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pengajuan_santri'
      and column_name = 'informasi_pengaju' and data_type = 'jsonb'
  ) then
    v_missing := array_append(v_missing, 'pengajuan_santri.informasi_pengaju');
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'santri_catatan'
      and column_name = 'tampil_ke_wali' and data_type = 'boolean' and is_nullable = 'NO'
  ) then
    v_missing := array_append(v_missing, 'santri_catatan.tampil_ke_wali');
  end if;

  if cardinality(v_missing) > 0 then
    raise exception 'PRE_CUTOVER_FAILED: fondasi database belum lengkap: %', array_to_string(v_missing, ', ');
  end if;

  if exists (
    select 1
    from public.master_role
    where lower(btrim(nama_role)) = 'super admin'
      and not coalesce(permissions, '[]'::jsonb) @> '["hapus_induk"]'::jsonb
  ) then
    raise exception 'PRE_CUTOVER_FAILED: Super Admin belum mempunyai hapus_induk';
  end if;
end
$$;

do $$
declare
  v_table text;
  v_minimum bigint;
  v_actual bigint;
begin
  for v_table, v_minimum in
    select * from (values
      ('log_pelanggaran', 1::bigint),
      ('manage_users', 0::bigint),
      ('master_jenis', 19::bigint),
      ('master_role', 2::bigint),
      ('pengajuan_santri', 4::bigint),
      ('pengguna', 2::bigint),
      ('santri', 1541::bigint),
      ('santri_catatan', 0::bigint),
      ('santri_prestasi', 0::bigint)
    ) baseline(table_name, minimum_count)
  loop
    execute format('select count(*) from public.%I', v_table) into v_actual;
    if v_actual < v_minimum then
      raise exception 'PRE_CUTOVER_FAILED: jumlah % berkurang; baseline %, sekarang %', v_table, v_minimum, v_actual;
    end if;
  end loop;

  select count(*)
    into v_actual
  from public.pengguna pengguna
  join public.master_role role on role.id = pengguna.role_id
  where pengguna.status_akun = 'Aktif'
    and lower(btrim(role.nama_role)) = 'super admin';

  if v_actual < 2 then
    raise exception 'PRE_CUTOVER_FAILED: Super Admin aktif berkurang; baseline 2, sekarang %', v_actual;
  end if;
end
$$;

rollback;

select
  'PRE_CUTOVER_VERIFICATION_OK' as result,
  current_timestamp as checked_at,
  (select count(*) from public.santri) as santri_count,
  (select count(*) from public.pengajuan_santri) as pengajuan_count,
  (select count(*) from public.pengguna) as pengguna_count,
  (select count(*) from public.master_role) as role_count,
  false as rls_diubah_oleh_script_ini;
