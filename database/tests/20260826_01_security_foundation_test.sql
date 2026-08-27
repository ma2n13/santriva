-- Santriva security foundation verification
--
-- Run this file twice in Supabase SQL Editor:
-- 1. Before the migration: it MUST fail because the foundation is not present yet.
-- 2. After the migration: it MUST finish and return SECURITY_FOUNDATION_TEST_OK.
--
-- This test is read-only. The transaction is rolled back at the end.

begin;

do $$
declare
  v_private_owner text;
  v_token_check text;
  v_source_check text;
  v_access_status_check text;
begin
  select pg_get_userbyid(n.nspowner)
    into v_private_owner
  from pg_namespace n
  where n.nspname = 'private';

  if v_private_owner is null then
    raise exception 'FOUNDATION_TEST_FAILED: schema private belum ada';
  end if;

  if v_private_owner not in ('postgres', 'supabase_admin') then
    raise exception 'FOUNDATION_TEST_FAILED: owner schema private tidak dipercaya: %', v_private_owner;
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'FOUNDATION_TEST_FAILED: anon/authenticated masih dapat memakai schema private';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relname = 'wali_portal_access'
      and c.relkind = 'r'
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: private.wali_portal_access belum ada';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'private'
      and c.relname = 'public_search_selection'
      and c.relkind = 'r'
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: private.public_search_selection belum ada';
  end if;

  if to_regclass('public.permintaan_akses_wali') is null then
    raise exception 'FOUNDATION_TEST_FAILED: public.permintaan_akses_wali belum ada';
  end if;

  if has_table_privilege('anon', 'private.wali_portal_access', 'SELECT')
     or has_table_privilege('authenticated', 'private.wali_portal_access', 'SELECT')
     or has_table_privilege('anon', 'private.public_search_selection', 'SELECT')
     or has_table_privilege('authenticated', 'private.public_search_selection', 'SELECT') then
    raise exception 'FOUNDATION_TEST_FAILED: tabel private dapat dibaca langsung oleh client';
  end if;

  if has_table_privilege('anon', 'public.permintaan_akses_wali', 'SELECT')
     or has_table_privilege('anon', 'public.permintaan_akses_wali', 'INSERT')
     or has_table_privilege('authenticated', 'public.permintaan_akses_wali', 'SELECT')
     or has_table_privilege('authenticated', 'public.permintaan_akses_wali', 'INSERT') then
    raise exception 'FOUNDATION_TEST_FAILED: antrean akses wali sudah terbuka sebelum RPC aman dibuat';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pengajuan_santri'
      and column_name = 'sumber_pengajuan'
      and data_type = 'text'
      and is_nullable = 'NO'
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: kolom pengajuan_santri.sumber_pengajuan tidak sesuai';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pengajuan_santri'
      and column_name = 'informasi_pengaju'
      and data_type = 'jsonb'
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: kolom pengajuan_santri.informasi_pengaju tidak sesuai';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'santri_catatan'
      and column_name = 'tampil_ke_wali'
      and data_type = 'boolean'
      and is_nullable = 'NO'
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: kolom santri_catatan.tampil_ke_wali tidak sesuai';
  end if;

  select pg_get_constraintdef(c.oid, true)
    into v_token_check
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'private'
    and t.relname = 'wali_portal_access'
    and c.conname = 'wali_portal_access_token_format_check';

  if v_token_check is null or v_token_check not like '%0-9A-HJKMNP-TV-Z%10%' then
    raise exception 'FOUNDATION_TEST_FAILED: format token portal wali tidak terlindungi';
  end if;

  select pg_get_constraintdef(c.oid, true)
    into v_source_check
  from pg_constraint c
  where c.conrelid = 'public.pengajuan_santri'::regclass
    and c.conname = 'pengajuan_santri_sumber_pengajuan_check';

  if v_source_check is null
     or v_source_check not like '%legacy%'
     or v_source_check not like '%pendaftaran_publik%'
     or v_source_check not like '%portal_wali%'
     or v_source_check not like '%pencarian_publik%' then
    raise exception 'FOUNDATION_TEST_FAILED: daftar sumber pengajuan tidak sesuai';
  end if;

  select pg_get_constraintdef(c.oid, true)
    into v_access_status_check
  from pg_constraint c
  where c.conrelid = 'public.permintaan_akses_wali'::regclass
    and c.conname = 'permintaan_akses_wali_status_check';

  if v_access_status_check is null
     or v_access_status_check not like '%Menunggu%'
     or v_access_status_check not like '%Disetujui%'
     or v_access_status_check not like '%Ditolak%' then
    raise exception 'FOUNDATION_TEST_FAILED: daftar status permintaan akses tidak sesuai';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'private'
      and indexname = 'idx_public_search_selection_expires_at'
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: index kedaluwarsa kode pencarian belum ada';
  end if;

  if not exists (
    select 1
    from public.master_role
    where lower(btrim(nama_role)) = 'super admin'
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: role Super Admin tidak ditemukan';
  end if;

  if exists (
    select 1
    from public.master_role
    where lower(btrim(nama_role)) = 'super admin'
      and not coalesce(permissions, '[]'::jsonb) @> '["hapus_induk"]'::jsonb
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: Super Admin belum memiliki permission hapus_induk';
  end if;

  if exists (
    select 1
    from public.master_role
    where lower(btrim(nama_role)) <> 'super admin'
      and coalesce(permissions, '[]'::jsonb) @> '["hapus_induk"]'::jsonb
  ) then
    raise exception 'FOUNDATION_TEST_FAILED: hapus_induk diberikan kepada role selain Super Admin';
  end if;

  if (select count(*) from public.santri) < 1541 then
    raise exception 'FOUNDATION_TEST_FAILED: jumlah santri lebih kecil dari baseline 1541';
  end if;

  if (select count(*) from public.pengajuan_santri) < 4 then
    raise exception 'FOUNDATION_TEST_FAILED: jumlah pengajuan lebih kecil dari baseline 4';
  end if;

  if (select count(*) from public.pengguna) < 2 then
    raise exception 'FOUNDATION_TEST_FAILED: jumlah pengguna lebih kecil dari baseline 2';
  end if;
end
$$;

select
  'SECURITY_FOUNDATION_TEST_OK' as result,
  (select count(*) from public.santri) as jumlah_santri,
  (select count(*) from public.pengajuan_santri) as jumlah_pengajuan,
  (select count(*) from public.pengguna) as jumlah_pengguna;

rollback;
