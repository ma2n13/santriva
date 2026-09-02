-- Santriva staged RLS policies
--
-- This migration creates deterministic policies but intentionally does NOT
-- enable RLS, revoke table grants, or remove the legacy open policies.

begin;

-- Buku induk santri
drop policy if exists santri_select_with_akses_induk on public.santri;
drop policy if exists santri_insert_with_edit_induk on public.santri;
drop policy if exists santri_update_with_edit_induk on public.santri;
drop policy if exists santri_delete_with_hapus_induk on public.santri;

create policy santri_select_with_akses_induk
  on public.santri for select to authenticated
  using ((select private.has_permission('akses_induk')));

create policy santri_insert_with_edit_induk
  on public.santri for insert to authenticated
  with check ((select private.has_permission('edit_induk')));

create policy santri_update_with_edit_induk
  on public.santri for update to authenticated
  using ((select private.has_permission('edit_induk')))
  with check ((select private.has_permission('edit_induk')));

create policy santri_delete_with_hapus_induk
  on public.santri for delete to authenticated
  using ((select private.has_permission('hapus_induk')));

-- Pengajuan hanya dibaca langsung oleh validator. Review dilakukan melalui RPC.
drop policy if exists pengajuan_select_with_validasi_pengajuan on public.pengajuan_santri;

create policy pengajuan_select_with_validasi_pengajuan
  on public.pengajuan_santri for select to authenticated
  using ((select private.has_permission('validasi_pengajuan')));

-- Profil sendiri dapat dibaca; pengelola dapat membaca seluruh pengguna.
drop policy if exists pengguna_select_self_or_kelola on public.pengguna;

create policy pengguna_select_self_or_kelola
  on public.pengguna for select to authenticated
  using (
    ((select auth.uid()) is not null and (select auth.uid()) = id)
    or (select private.has_permission('kelola_pengguna'))
  );

-- Role dapat dibaca pengelola; perubahan hanya melalui RPC tervalidasi.
drop policy if exists master_role_select_with_kelola_pengguna on public.master_role;

create policy master_role_select_with_kelola_pengguna
  on public.master_role for select to authenticated
  using ((select private.has_permission('kelola_pengguna')));

-- Master jenis takziran
drop policy if exists master_jenis_select_with_akses_takziran on public.master_jenis;
drop policy if exists master_jenis_insert_with_input_takziran on public.master_jenis;
drop policy if exists master_jenis_update_with_input_takziran on public.master_jenis;
drop policy if exists master_jenis_delete_with_input_takziran on public.master_jenis;

create policy master_jenis_select_with_akses_takziran
  on public.master_jenis for select to authenticated
  using ((select private.has_permission('akses_takziran')));

create policy master_jenis_insert_with_input_takziran
  on public.master_jenis for insert to authenticated
  with check ((select private.has_permission('input_takziran')));

create policy master_jenis_update_with_input_takziran
  on public.master_jenis for update to authenticated
  using ((select private.has_permission('input_takziran')))
  with check ((select private.has_permission('input_takziran')));

create policy master_jenis_delete_with_input_takziran
  on public.master_jenis for delete to authenticated
  using ((select private.has_permission('input_takziran')));

-- Log pelanggaran/takziran
drop policy if exists log_pelanggaran_select_with_akses_takziran on public.log_pelanggaran;
drop policy if exists log_pelanggaran_insert_with_input_takziran on public.log_pelanggaran;
drop policy if exists log_pelanggaran_update_with_input_takziran on public.log_pelanggaran;
drop policy if exists log_pelanggaran_delete_with_input_takziran on public.log_pelanggaran;

create policy log_pelanggaran_select_with_akses_takziran
  on public.log_pelanggaran for select to authenticated
  using ((select private.has_permission('akses_takziran')));

create policy log_pelanggaran_insert_with_input_takziran
  on public.log_pelanggaran for insert to authenticated
  with check ((select private.has_permission('input_takziran')));

create policy log_pelanggaran_update_with_input_takziran
  on public.log_pelanggaran for update to authenticated
  using ((select private.has_permission('input_takziran')))
  with check ((select private.has_permission('input_takziran')));

create policy log_pelanggaran_delete_with_input_takziran
  on public.log_pelanggaran for delete to authenticated
  using ((select private.has_permission('input_takziran')));

-- Catatan santri
drop policy if exists santri_catatan_select_with_akses_induk on public.santri_catatan;
drop policy if exists santri_catatan_insert_with_edit_induk on public.santri_catatan;
drop policy if exists santri_catatan_update_with_edit_induk on public.santri_catatan;
drop policy if exists santri_catatan_delete_with_edit_induk on public.santri_catatan;

create policy santri_catatan_select_with_akses_induk
  on public.santri_catatan for select to authenticated
  using ((select private.has_permission('akses_induk')));

create policy santri_catatan_insert_with_edit_induk
  on public.santri_catatan for insert to authenticated
  with check ((select private.has_permission('edit_induk')));

create policy santri_catatan_update_with_edit_induk
  on public.santri_catatan for update to authenticated
  using ((select private.has_permission('edit_induk')))
  with check ((select private.has_permission('edit_induk')));

create policy santri_catatan_delete_with_edit_induk
  on public.santri_catatan for delete to authenticated
  using ((select private.has_permission('edit_induk')));

-- Prestasi santri
drop policy if exists santri_prestasi_select_with_akses_induk on public.santri_prestasi;
drop policy if exists santri_prestasi_insert_with_edit_induk on public.santri_prestasi;
drop policy if exists santri_prestasi_update_with_edit_induk on public.santri_prestasi;
drop policy if exists santri_prestasi_delete_with_edit_induk on public.santri_prestasi;

create policy santri_prestasi_select_with_akses_induk
  on public.santri_prestasi for select to authenticated
  using ((select private.has_permission('akses_induk')));

create policy santri_prestasi_insert_with_edit_induk
  on public.santri_prestasi for insert to authenticated
  with check ((select private.has_permission('edit_induk')));

create policy santri_prestasi_update_with_edit_induk
  on public.santri_prestasi for update to authenticated
  using ((select private.has_permission('edit_induk')))
  with check ((select private.has_permission('edit_induk')));

create policy santri_prestasi_delete_with_edit_induk
  on public.santri_prestasi for delete to authenticated
  using ((select private.has_permission('edit_induk')));

-- Permintaan akses wali dibaca admin buku induk; review dilakukan melalui RPC.
drop policy if exists permintaan_akses_wali_select_with_edit_induk on public.permintaan_akses_wali;

create policy permintaan_akses_wali_select_with_edit_induk
  on public.permintaan_akses_wali for select to authenticated
  using ((select private.has_permission('edit_induk')));

-- manage_users sengaja tidak mendapat policy aplikasi karena tidak digunakan.

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
      ('log_pelanggaran', 'log_pelanggaran_select_with_akses_takziran'),
      ('santri_catatan', 'santri_catatan_select_with_akses_induk'),
      ('santri_prestasi', 'santri_prestasi_select_with_akses_induk'),
      ('permintaan_akses_wali', 'permintaan_akses_wali_select_with_edit_induk')
  ) required(table_name, policy_name)
  left join pg_policies policy
    on policy.schemaname = 'public'
   and policy.tablename = required.table_name
   and policy.policyname = required.policy_name
  where policy.policyname is null;

  if v_missing is not null then
    raise exception 'MIGRATION_ABORTED: policy staged tidak lengkap: %', v_missing;
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'santri', 'pengajuan_santri', 'pengguna', 'master_role',
        'log_pelanggaran', 'master_jenis', 'santri_catatan',
        'santri_prestasi', 'manage_users', 'permintaan_akses_wali'
      )
      and c.relrowsecurity
  ) then
    raise exception 'MIGRATION_ABORTED: RLS aktif terlalu awal';
  end if;
end
$$;

commit;

select
  'RLS_POLICIES_STAGED' as result,
  false as rls_diaktifkan_pada_tahap_ini,
  false as grant_tabel_diubah_pada_tahap_ini;
