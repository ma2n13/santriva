-- Santriva security foundation (additive and idempotent)
--
-- This migration does NOT enable RLS and does NOT remove old policies.
-- It does not delete old rows, drop old objects, or update public.santri.
-- Run the matching test before and after this migration.

begin;

create temporary table _santriva_foundation_row_counts (
  table_name text primary key,
  row_count bigint not null
) on commit drop;

insert into _santriva_foundation_row_counts (table_name, row_count)
values
  ('santri', (select count(*) from public.santri)),
  ('pengajuan_santri', (select count(*) from public.pengajuan_santri)),
  ('pengguna', (select count(*) from public.pengguna)),
  ('master_role', (select count(*) from public.master_role)),
  ('log_pelanggaran', (select count(*) from public.log_pelanggaran)),
  ('master_jenis', (select count(*) from public.master_jenis)),
  ('santri_catatan', (select count(*) from public.santri_catatan)),
  ('santri_prestasi', (select count(*) from public.santri_prestasi)),
  ('manage_users', (select count(*) from public.manage_users));

create extension if not exists pgcrypto;

do $$
declare
  v_owner text;
begin
  select pg_get_userbyid(n.nspowner)
    into v_owner
  from pg_namespace n
  where n.nspname = 'private';

  if v_owner is null then
    execute 'create schema private authorization postgres';
  elsif v_owner not in ('postgres', 'supabase_admin') then
    raise exception 'MIGRATION_ABORTED: schema private sudah ada dengan owner yang tidak dipercaya: %', v_owner;
  end if;
end
$$;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists private.wali_portal_access (
  santri_id uuid primary key
    references public.santri(id) on delete cascade,
  token text not null unique,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  disabled_at timestamptz,
  constraint wali_portal_access_token_format_check
    check (token ~ '^[0-9A-HJKMNP-TV-Z]{10}$')
);

create table if not exists private.public_search_selection (
  token uuid primary key default gen_random_uuid(),
  santri_id uuid not null
    references public.santri(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now()
);

create table if not exists public.permintaan_akses_wali (
  id uuid primary key default gen_random_uuid(),
  santri_id uuid not null
    references public.santri(id) on delete cascade,
  nama_pengaju text not null,
  hubungan text not null,
  kontak_wa text not null,
  status text not null default 'Menunggu',
  catatan_admin text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
    references public.pengguna(id) on delete set null,
  constraint permintaan_akses_wali_status_check
    check (status = any (array['Menunggu'::text, 'Disetujui'::text, 'Ditolak'::text]))
);

-- The public queue remains closed until the protected RPC layer is installed.
revoke all on table public.permintaan_akses_wali from public;
revoke all on table public.permintaan_akses_wali from anon;
revoke all on table public.permintaan_akses_wali from authenticated;

revoke all on all tables in schema private from public;
revoke all on all tables in schema private from anon;
revoke all on all tables in schema private from authenticated;

alter default privileges in schema private revoke all on tables from public;
alter default privileges in schema private revoke all on tables from anon;
alter default privileges in schema private revoke all on tables from authenticated;

alter table public.pengajuan_santri
  add column if not exists sumber_pengajuan text not null default 'legacy',
  add column if not exists informasi_pengaju jsonb;

alter table public.santri_catatan
  add column if not exists tampil_ke_wali boolean not null default false;

do $$
declare
  v_definition text;
begin
  select pg_get_constraintdef(c.oid, true)
    into v_definition
  from pg_constraint c
  where c.conrelid = 'public.pengajuan_santri'::regclass
    and c.conname = 'pengajuan_santri_sumber_pengajuan_check';

  if v_definition is null then
    alter table public.pengajuan_santri
      add constraint pengajuan_santri_sumber_pengajuan_check
      check (
        sumber_pengajuan = any (
          array[
            'legacy'::text,
            'pendaftaran_publik'::text,
            'portal_wali'::text,
            'pencarian_publik'::text
          ]
        )
      );
  elsif v_definition not like '%legacy%'
     or v_definition not like '%pendaftaran_publik%'
     or v_definition not like '%portal_wali%'
     or v_definition not like '%pencarian_publik%' then
    raise exception 'MIGRATION_ABORTED: constraint sumber_pengajuan sudah ada tetapi isinya berbeda';
  end if;
end
$$;

create index if not exists idx_public_search_selection_expires_at
  on private.public_search_selection (expires_at);

create index if not exists idx_public_search_selection_santri_id
  on private.public_search_selection (santri_id);

create index if not exists idx_permintaan_akses_wali_status_created_at
  on public.permintaan_akses_wali (status, created_at desc);

create index if not exists idx_permintaan_akses_wali_santri_id
  on public.permintaan_akses_wali (santri_id);

create index if not exists idx_pengajuan_santri_sumber_status
  on public.pengajuan_santri (sumber_pengajuan, status_pengajuan, created_at desc);

do $$
begin
  if not exists (
    select 1
    from public.master_role
    where lower(btrim(nama_role)) = 'super admin'
  ) then
    raise exception 'MIGRATION_ABORTED: role Super Admin tidak ditemukan';
  end if;

  if exists (
    select 1
    from public.master_role
    where lower(btrim(nama_role)) = 'super admin'
      and permissions is not null
      and jsonb_typeof(permissions) <> 'array'
  ) then
    raise exception 'MIGRATION_ABORTED: permissions Super Admin bukan array JSON';
  end if;

  update public.master_role
  set permissions = coalesce(permissions, '[]'::jsonb) || '["hapus_induk"]'::jsonb
  where lower(btrim(nama_role)) = 'super admin'
    and not coalesce(permissions, '[]'::jsonb) @> '["hapus_induk"]'::jsonb;
end
$$;

do $$
declare
  v_owner text;
  v_source_default text;
  v_catatan_default text;
begin
  select pg_get_userbyid(n.nspowner)
    into v_owner
  from pg_namespace n
  where n.nspname = 'private';

  if v_owner not in ('postgres', 'supabase_admin') then
    raise exception 'MIGRATION_ABORTED: owner akhir schema private tidak dipercaya: %', v_owner;
  end if;

  if to_regclass('private.wali_portal_access') is null
     or to_regclass('private.public_search_selection') is null
     or to_regclass('public.permintaan_akses_wali') is null then
    raise exception 'MIGRATION_ABORTED: satu atau lebih tabel fondasi tidak terbentuk';
  end if;

  select column_default
    into v_source_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'pengajuan_santri'
    and column_name = 'sumber_pengajuan'
    and data_type = 'text'
    and is_nullable = 'NO';

  if v_source_default is null or v_source_default not like '%legacy%' then
    raise exception 'MIGRATION_ABORTED: kolom sumber_pengajuan tidak sesuai';
  end if;

  select column_default
    into v_catatan_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'santri_catatan'
    and column_name = 'tampil_ke_wali'
    and data_type = 'boolean'
    and is_nullable = 'NO';

  if v_catatan_default is null or v_catatan_default <> 'false' then
    raise exception 'MIGRATION_ABORTED: kolom tampil_ke_wali tidak sesuai';
  end if;

  if exists (
    select 1
    from public.master_role
    where lower(btrim(nama_role)) = 'super admin'
      and not coalesce(permissions, '[]'::jsonb) @> '["hapus_induk"]'::jsonb
  ) then
    raise exception 'MIGRATION_ABORTED: permission hapus_induk gagal ditambahkan';
  end if;

  if (select row_count from _santriva_foundation_row_counts where table_name = 'santri')
       <> (select count(*) from public.santri)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'pengajuan_santri')
       <> (select count(*) from public.pengajuan_santri)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'pengguna')
       <> (select count(*) from public.pengguna)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'master_role')
       <> (select count(*) from public.master_role)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'log_pelanggaran')
       <> (select count(*) from public.log_pelanggaran)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'master_jenis')
       <> (select count(*) from public.master_jenis)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'santri_catatan')
       <> (select count(*) from public.santri_catatan)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'santri_prestasi')
       <> (select count(*) from public.santri_prestasi)
     or (select row_count from _santriva_foundation_row_counts where table_name = 'manage_users')
       <> (select count(*) from public.manage_users) then
    raise exception 'MIGRATION_ABORTED: jumlah baris tabel lama berubah; seluruh transaksi dibatalkan';
  end if;
end
$$;

commit;

select
  'SECURITY_FOUNDATION_APPLIED' as result,
  (select count(*) from public.santri) as jumlah_santri,
  (select count(*) from public.pengajuan_santri) as jumlah_pengajuan,
  (select count(*) from public.pengguna) as jumlah_pengguna;
