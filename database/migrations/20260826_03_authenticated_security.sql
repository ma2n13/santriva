-- Santriva authenticated authorization functions
-- Prerequisites: migrations 01 and 02.
-- This file does not enable RLS and does not remove legacy policies.

begin;

create temporary table _santriva_authenticated_counts (
  table_name text primary key,
  row_count bigint not null
) on commit drop;

insert into _santriva_authenticated_counts (table_name, row_count)
values
  ('santri', (select count(*) from public.santri)),
  ('pengajuan_santri', (select count(*) from public.pengajuan_santri)),
  ('pengguna', (select count(*) from public.pengguna)),
  ('master_role', (select count(*) from public.master_role)),
  ('log_pelanggaran', (select count(*) from public.log_pelanggaran)),
  ('master_jenis', (select count(*) from public.master_jenis)),
  ('santri_catatan', (select count(*) from public.santri_catatan)),
  ('santri_prestasi', (select count(*) from public.santri_prestasi)),
  ('manage_users', (select count(*) from public.manage_users)),
  ('permintaan_akses_wali', (select count(*) from public.permintaan_akses_wali)),
  ('wali_portal_access', (select count(*) from private.wali_portal_access));

do $$
begin
  if to_regprocedure('private.filter_santri_payload(jsonb,text)') is null
     or to_regprocedure('private.generate_wali_token()') is null
     or to_regclass('public.permintaan_akses_wali') is null then
    raise exception 'MIGRATION_ABORTED: jalankan migrasi Task 2 dan Task 3 terlebih dahulu';
  end if;
end
$$;

create or replace function private.has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.pengguna pengguna
    join public.master_role role on role.id = pengguna.role_id
    where pengguna.id = auth.uid()
      and pengguna.status_akun = 'Aktif'
      and jsonb_typeof(coalesce(role.permissions, '[]'::jsonb)) = 'array'
      and coalesce(role.permissions, '[]'::jsonb)
        @> jsonb_build_array(permission_name)
  );
$$;

create or replace function private.require_permission(permission_name text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_permission(permission_name) then
    raise exception using
      errcode = '42501',
      message = 'Anda tidak memiliki izin untuk tindakan ini.';
  end if;
end;
$$;

create or replace function private.validate_role_permissions(permissions_input jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_known constant text[] := array[
    'akses_induk',
    'edit_induk',
    'hapus_induk',
    'akses_takziran',
    'input_takziran',
    'validasi_pengajuan',
    'kelola_pengguna',
    'akses_keuangan'
  ];
  v_result jsonb;
begin
  if permissions_input is null or jsonb_typeof(permissions_input) <> 'array' then
    raise exception using errcode = '22023', message = 'Daftar permission tidak valid.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(permissions_input) as items(value)
    where jsonb_typeof(items.value) <> 'string'
  ) then
    raise exception using errcode = '22023', message = 'Daftar permission tidak valid.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(permissions_input) as items(value)
    where not (items.value = any(v_known))
  ) then
    raise exception using errcode = '22023', message = 'Daftar permission tidak valid.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(values_unique.value) order by values_unique.value), '[]'::jsonb)
    into v_result
  from (
    select distinct items.value
    from jsonb_array_elements_text(permissions_input) as items(value)
  ) values_unique;

  return v_result;
end;
$$;

create or replace function private.apply_santri_payload(
  santri_id_input uuid,
  payload_input jsonb,
  mode_input text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
  v_id uuid;
begin
  if mode_input = 'registration' then
    v_data := private.filter_santri_payload(payload_input, 'registration');

    if nullif(btrim(v_data ->> 'nama_lengkap'), '') is null then
      raise exception using errcode = '22023', message = 'Data santri tidak valid.';
    end if;

    insert into public.santri (
      nama_lengkap,
      nisn,
      nik,
      jenis_kelamin,
      tempat_lahir,
      tanggal_lahir,
      no_hp_santri,
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
      no_hp_wali
    ) values (
      v_data ->> 'nama_lengkap',
      nullif(v_data ->> 'nisn', ''),
      nullif(v_data ->> 'nik', ''),
      nullif(v_data ->> 'jenis_kelamin', ''),
      nullif(v_data ->> 'tempat_lahir', ''),
      nullif(v_data ->> 'tanggal_lahir', '')::date,
      nullif(v_data ->> 'no_hp_santri', ''),
      nullif(v_data ->> 'alamat_jalan', ''),
      nullif(v_data ->> 'desa_kelurahan', ''),
      nullif(v_data ->> 'kecamatan', ''),
      nullif(v_data ->> 'kabupaten_kota', ''),
      nullif(v_data ->> 'provinsi', ''),
      nullif(v_data ->> 'kode_pos', ''),
      nullif(v_data ->> 'nama_ayah', ''),
      nullif(v_data ->> 'pekerjaan_ayah', ''),
      nullif(v_data ->> 'nama_ibu', ''),
      nullif(v_data ->> 'pekerjaan_ibu', ''),
      nullif(v_data ->> 'nama_wali', ''),
      nullif(v_data ->> 'no_hp_wali', '')
    )
    returning id into v_id;

    return v_id;
  end if;

  if mode_input <> 'update' or santri_id_input is null then
    raise exception using errcode = '22023', message = 'Data santri tidak valid.';
  end if;

  v_data := private.filter_santri_payload(payload_input, 'update');

  if v_data = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Data santri tidak valid.';
  end if;

  if v_data ? 'nama_lengkap'
     and nullif(btrim(v_data ->> 'nama_lengkap'), '') is null then
    raise exception using errcode = '22023', message = 'Data santri tidak valid.';
  end if;

  update public.santri santri
  set
    nama_lengkap = case when v_data ? 'nama_lengkap' then v_data ->> 'nama_lengkap' else santri.nama_lengkap end,
    nisn = case when v_data ? 'nisn' then nullif(v_data ->> 'nisn', '') else santri.nisn end,
    nik = case when v_data ? 'nik' then nullif(v_data ->> 'nik', '') else santri.nik end,
    jenis_kelamin = case when v_data ? 'jenis_kelamin' then nullif(v_data ->> 'jenis_kelamin', '') else santri.jenis_kelamin end,
    tempat_lahir = case when v_data ? 'tempat_lahir' then nullif(v_data ->> 'tempat_lahir', '') else santri.tempat_lahir end,
    tanggal_lahir = case when v_data ? 'tanggal_lahir' then nullif(v_data ->> 'tanggal_lahir', '')::date else santri.tanggal_lahir end,
    no_hp_santri = case when v_data ? 'no_hp_santri' then nullif(v_data ->> 'no_hp_santri', '') else santri.no_hp_santri end,
    kelas = case when v_data ? 'kelas' then nullif(v_data ->> 'kelas', '') else santri.kelas end,
    asrama = case when v_data ? 'asrama' then nullif(v_data ->> 'asrama', '') else santri.asrama end,
    status = case when v_data ? 'status' then nullif(v_data ->> 'status', '') else santri.status end,
    tanggal_masuk = case when v_data ? 'tanggal_masuk' then nullif(v_data ->> 'tanggal_masuk', '')::date else santri.tanggal_masuk end,
    tahun_masuk = case when v_data ? 'tahun_masuk' then nullif(v_data ->> 'tahun_masuk', '') else santri.tahun_masuk end,
    tahun_keluar = case when v_data ? 'tahun_keluar' then nullif(v_data ->> 'tahun_keluar', '') else santri.tahun_keluar end,
    alamat_jalan = case when v_data ? 'alamat_jalan' then nullif(v_data ->> 'alamat_jalan', '') else santri.alamat_jalan end,
    desa_kelurahan = case when v_data ? 'desa_kelurahan' then nullif(v_data ->> 'desa_kelurahan', '') else santri.desa_kelurahan end,
    kecamatan = case when v_data ? 'kecamatan' then nullif(v_data ->> 'kecamatan', '') else santri.kecamatan end,
    kabupaten_kota = case when v_data ? 'kabupaten_kota' then nullif(v_data ->> 'kabupaten_kota', '') else santri.kabupaten_kota end,
    provinsi = case when v_data ? 'provinsi' then nullif(v_data ->> 'provinsi', '') else santri.provinsi end,
    kode_pos = case when v_data ? 'kode_pos' then nullif(v_data ->> 'kode_pos', '') else santri.kode_pos end,
    nama_ayah = case when v_data ? 'nama_ayah' then nullif(v_data ->> 'nama_ayah', '') else santri.nama_ayah end,
    pekerjaan_ayah = case when v_data ? 'pekerjaan_ayah' then nullif(v_data ->> 'pekerjaan_ayah', '') else santri.pekerjaan_ayah end,
    nama_ibu = case when v_data ? 'nama_ibu' then nullif(v_data ->> 'nama_ibu', '') else santri.nama_ibu end,
    pekerjaan_ibu = case when v_data ? 'pekerjaan_ibu' then nullif(v_data ->> 'pekerjaan_ibu', '') else santri.pekerjaan_ibu end,
    nama_wali = case when v_data ? 'nama_wali' then nullif(v_data ->> 'nama_wali', '') else santri.nama_wali end,
    no_hp_wali = case when v_data ? 'no_hp_wali' then nullif(v_data ->> 'no_hp_wali', '') else santri.no_hp_wali end
  where santri.id = santri_id_input
  returning santri.id into v_id;

  if v_id is null then
    raise exception using errcode = '22023', message = 'Data santri tidak ditemukan.';
  end if;

  return v_id;
end;
$$;

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', pengguna.id,
    'email', pengguna.email,
    'nama_lengkap', pengguna.nama_lengkap,
    'usulan_role', pengguna.usulan_role,
    'status_akun', pengguna.status_akun,
    'role_id', pengguna.role_id,
    'role', case when role.id is null then null else jsonb_build_object(
      'nama_role', role.nama_role,
      'permissions', coalesce(role.permissions, '[]'::jsonb)
    ) end
  )
  from public.pengguna pengguna
  left join public.master_role role on role.id = pengguna.role_id
  where pengguna.id = auth.uid()
  limit 1;
$$;

create or replace function public.list_registration_roles()
returns table (nama_role text)
language sql
stable
security definer
set search_path = ''
as $$
  select role.nama_role
  from public.master_role role
  where lower(btrim(role.nama_role)) <> 'super admin'
  order by lower(role.nama_role), role.id;
$$;

create or replace function public.register_my_profile(
  nama_lengkap text,
  usulan_role text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := btrim(coalesce(auth.jwt() ->> 'email', ''));
  v_name text := btrim(coalesce($1, ''));
  v_role text := btrim(coalesce($2, ''));
begin
  if v_user_id is null or v_email = '' or char_length(v_email) > 320
     or char_length(v_name) < 2 or char_length(v_name) > 150
     or v_role = '' or char_length(v_role) > 100 then
    raise exception using errcode = '22023', message = 'Pendaftaran akun tidak valid.';
  end if;

  if lower(v_role) = 'super admin'
     or not exists (
       select 1 from public.master_role role
       where lower(btrim(role.nama_role)) = lower(v_role)
         and lower(btrim(role.nama_role)) <> 'super admin'
     ) then
    raise exception using errcode = '22023', message = 'Pendaftaran akun tidak valid.';
  end if;

  if exists (select 1 from public.pengguna pengguna where pengguna.id = v_user_id) then
    raise exception using errcode = '23505', message = 'Profil akun sudah terdaftar.';
  end if;

  insert into public.pengguna (
    id, email, nama_lengkap, role_id, usulan_role, status_akun
  ) values (
    v_user_id, v_email, v_name, null, v_role, 'Menunggu'
  );

  return public.get_my_profile();
end;
$$;

create or replace function public.review_pengajuan(
  pengajuan_id uuid,
  keputusan text,
  catatan_admin text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_submission public.pengajuan_santri%rowtype;
  v_decision text;
  v_santri_id uuid;
begin
  perform private.require_permission('validasi_pengajuan');

  v_decision := case lower(btrim(coalesce($2, '')))
    when 'disetujui' then 'Disetujui'
    when 'ditolak' then 'Ditolak'
    else null
  end;

  if v_decision is null or char_length(coalesce($3, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Keputusan tidak valid.';
  end if;

  select pengajuan.*
    into v_submission
  from public.pengajuan_santri pengajuan
  where pengajuan.id = $1
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Pengajuan tidak ditemukan.';
  end if;

  if v_submission.status_pengajuan <> 'Menunggu' then
    raise exception using errcode = '22023', message = 'Pengajuan sudah pernah ditinjau.';
  end if;

  if v_decision = 'Disetujui' then
    if v_submission.jenis_pengajuan = 'Update' then
      v_santri_id := private.apply_santri_payload(
        v_submission.santri_id,
        v_submission.data_pengajuan,
        'update'
      );
    elsif v_submission.jenis_pengajuan = 'Baru' then
      v_santri_id := private.apply_santri_payload(
        null,
        v_submission.data_pengajuan,
        'registration'
      );
    else
      raise exception using errcode = '22023', message = 'Jenis pengajuan tidak valid.';
    end if;
  else
    v_santri_id := v_submission.santri_id;
  end if;

  update public.pengajuan_santri pengajuan
  set status_pengajuan = v_decision,
      catatan_admin = nullif(btrim(coalesce($3, '')), ''),
      santri_id = v_santri_id
  where pengajuan.id = v_submission.id;

  return jsonb_build_object(
    'id', v_submission.id,
    'status', v_decision,
    'santri_id', v_santri_id
  );
end;
$$;

create or replace function public.get_or_create_wali_token(santri_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  perform private.require_permission('akses_induk');

  if not exists (select 1 from public.santri santri where santri.id = $1) then
    raise exception using errcode = '22023', message = 'Data santri tidak ditemukan.';
  end if;

  select access.token into v_token
  from private.wali_portal_access access
  where access.santri_id = $1;

  if v_token is not null then
    return v_token;
  end if;

  for attempt in 1..20 loop
    v_token := private.generate_wali_token();

    insert into private.wali_portal_access (santri_id, token, aktif)
    values ($1, v_token, true)
    on conflict do nothing
    returning token into v_token;

    if v_token is not null then
      return v_token;
    end if;

    select access.token into v_token
    from private.wali_portal_access access
    where access.santri_id = $1;

    if v_token is not null then
      return v_token;
    end if;
  end loop;

  raise exception using errcode = 'P0001', message = 'Token tidak dapat dibuat.';
end;
$$;

create or replace function public.rotate_wali_token(santri_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  perform private.require_permission('edit_induk');

  if not exists (select 1 from public.santri santri where santri.id = $1) then
    raise exception using errcode = '22023', message = 'Data santri tidak ditemukan.';
  end if;

  for attempt in 1..20 loop
    v_token := private.generate_wali_token();
    begin
      insert into private.wali_portal_access (
        santri_id, token, aktif, created_at, rotated_at, disabled_at
      ) values (
        $1, v_token, true, now(), now(), null
      )
      on conflict on constraint wali_portal_access_pkey do update
      set token = excluded.token,
          aktif = true,
          rotated_at = now(),
          disabled_at = null
      returning token into v_token;

      return v_token;
    exception when unique_violation then
      null;
    end;
  end loop;

  raise exception using errcode = 'P0001', message = 'Token tidak dapat dibuat.';
end;
$$;

create or replace function public.set_wali_access_status(
  santri_id uuid,
  aktif boolean
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_changed integer;
begin
  perform private.require_permission('edit_induk');

  if $2 is null then
    raise exception using errcode = '22023', message = 'Status akses tidak valid.';
  end if;

  if not exists (select 1 from public.santri santri where santri.id = $1) then
    raise exception using errcode = '22023', message = 'Data santri tidak ditemukan.';
  end if;

  if $2 = false then
    update private.wali_portal_access access
    set aktif = false,
        disabled_at = now()
    where access.santri_id = $1;

    get diagnostics v_changed = row_count;
    return v_changed > 0;
  end if;

  if not exists (
    select 1 from private.wali_portal_access access where access.santri_id = $1
  ) then
    perform public.rotate_wali_token($1);
  else
    update private.wali_portal_access access
    set aktif = true,
        disabled_at = null
    where access.santri_id = $1;
  end if;

  return true;
end;
$$;

create or replace function public.review_wali_access_request(
  request_id uuid,
  keputusan text,
  catatan_admin text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.permintaan_akses_wali%rowtype;
  v_decision text;
  v_token text;
begin
  perform private.require_permission('edit_induk');

  v_decision := case lower(btrim(coalesce($2, '')))
    when 'disetujui' then 'Disetujui'
    when 'ditolak' then 'Ditolak'
    else null
  end;

  if v_decision is null or char_length(coalesce($3, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Keputusan tidak valid.';
  end if;

  select request.* into v_request
  from public.permintaan_akses_wali request
  where request.id = $1
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Permintaan akses tidak ditemukan.';
  end if;

  if v_request.status <> 'Menunggu' then
    raise exception using errcode = '22023', message = 'Permintaan sudah pernah ditinjau.';
  end if;

  if v_decision = 'Disetujui' then
    v_token := public.get_or_create_wali_token(v_request.santri_id);
    perform public.set_wali_access_status(v_request.santri_id, true);
  end if;

  update public.permintaan_akses_wali request
  set status = v_decision,
      catatan_admin = nullif(btrim(coalesce($3, '')), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where request.id = v_request.id;

  return jsonb_build_object(
    'id', v_request.id,
    'status', v_decision,
    'token', v_token
  );
end;
$$;

create or replace function public.admin_save_role(
  role_id uuid,
  nama_role text,
  permissions jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce($2, ''));
  v_permissions jsonb;
  v_existing public.master_role%rowtype;
  v_id uuid;
  v_all_permissions constant jsonb := '["akses_induk","edit_induk","hapus_induk","akses_takziran","input_takziran","validasi_pengajuan","kelola_pengguna","akses_keuangan"]'::jsonb;
begin
  perform private.require_permission('kelola_pengguna');

  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception using errcode = '22023', message = 'Nama role tidak valid.';
  end if;

  v_permissions := private.validate_role_permissions($3);

  if $1 is null then
    if lower(v_name) = 'super admin' then
      raise exception using errcode = '22023', message = 'Role Super Admin tidak dapat dibuat ulang.';
    end if;

    if exists (
      select 1 from public.master_role role
      where lower(btrim(role.nama_role)) = lower(v_name)
    ) then
      raise exception using errcode = '23505', message = 'Nama role sudah digunakan.';
    end if;

    insert into public.master_role (nama_role, permissions)
    values (v_name, v_permissions)
    returning id into v_id;

    return v_id;
  end if;

  select role.* into v_existing
  from public.master_role role
  where role.id = $1
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Role tidak ditemukan.';
  end if;

  if lower(btrim(v_existing.nama_role)) = 'super admin' then
    if lower(v_name) <> 'super admin' then
      raise exception using errcode = '22023', message = 'Role Super Admin tidak dapat diganti nama.';
    end if;
    v_name := 'Super Admin';
    v_permissions := v_all_permissions;
  elsif lower(v_name) = 'super admin' then
    raise exception using errcode = '22023', message = 'Nama Super Admin dilindungi.';
  end if;

  if exists (
    select 1 from public.master_role role
    where role.id <> $1
      and lower(btrim(role.nama_role)) = lower(v_name)
  ) then
    raise exception using errcode = '23505', message = 'Nama role sudah digunakan.';
  end if;

  update public.master_role role
  set nama_role = v_name,
      permissions = v_permissions
  where role.id = $1
  returning role.id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_delete_role(role_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role public.master_role%rowtype;
begin
  perform private.require_permission('kelola_pengguna');

  select role.* into v_role
  from public.master_role role
  where role.id = $1
  for update;

  if not found then
    return false;
  end if;

  if lower(btrim(v_role.nama_role)) = 'super admin' then
    raise exception using errcode = '22023', message = 'Role Super Admin tidak dapat dihapus.';
  end if;

  if exists (select 1 from public.pengguna pengguna where pengguna.role_id = $1) then
    raise exception using errcode = '23503', message = 'Role masih digunakan oleh pengguna.';
  end if;

  delete from public.master_role role where role.id = $1;
  return true;
end;
$$;

create or replace function public.admin_update_user(
  user_id uuid,
  role_id uuid,
  status_akun text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user public.pengguna%rowtype;
  v_current_role_name text;
  v_new_status text;
begin
  perform private.require_permission('kelola_pengguna');

  if $1 = auth.uid() then
    raise exception using errcode = '42501', message = 'Role atau status akun sendiri tidak dapat diubah.';
  end if;

  v_new_status := case lower(btrim(coalesce($3, '')))
    when 'aktif' then 'Aktif'
    when 'menunggu' then 'Menunggu'
    when 'ditolak' then 'Ditolak'
    else null
  end;

  if v_new_status is null then
    raise exception using errcode = '22023', message = 'Status akun tidak valid.';
  end if;

  select pengguna.* into v_user
  from public.pengguna pengguna
  where pengguna.id = $1
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Pengguna tidak ditemukan.';
  end if;

  select role.nama_role into v_current_role_name
  from public.master_role role
  where role.id = v_user.role_id;

  if v_new_status = 'Aktif' then
    if $2 is null or not exists (
      select 1 from public.master_role role where role.id = $2
    ) then
      raise exception using errcode = '22023', message = 'Role pengguna tidak valid.';
    end if;
  end if;

  if v_user.status_akun = 'Aktif'
     and lower(btrim(coalesce(v_current_role_name, ''))) = 'super admin'
     and (v_new_status <> 'Aktif' or $2 is distinct from v_user.role_id)
     and (
       select count(*)
       from public.pengguna pengguna
       where pengguna.role_id = v_user.role_id
         and pengguna.status_akun = 'Aktif'
     ) <= 1 then
    raise exception using errcode = '42501', message = 'Super Admin aktif terakhir tidak dapat dinonaktifkan.';
  end if;

  update public.pengguna pengguna
  set role_id = case when v_new_status = 'Aktif' then $2 else null end,
      status_akun = v_new_status
  where pengguna.id = $1;

  return true;
end;
$$;

create or replace function public.get_takziran_santri(search_text text default null)
returns table (
  id uuid,
  nama_lengkap text,
  nis text,
  kelas text,
  asrama text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := btrim(coalesce($1, ''));
  v_pattern text;
begin
  perform private.require_permission('akses_takziran');

  if char_length(v_search) > 100 then
    raise exception using errcode = '22023', message = 'Pencarian tidak valid.';
  end if;

  v_pattern := replace(
    replace(
      replace(v_search, chr(92), chr(92) || chr(92)),
      '%', chr(92) || '%'
    ),
    '_', chr(92) || '_'
  );

  return query
  select santri.id, santri.nama_lengkap, santri.nis, santri.kelas, santri.asrama
  from public.santri santri
  where v_search = ''
     or santri.nama_lengkap ilike ('%' || v_pattern || '%') escape E'\\'
     or coalesce(santri.nis, '') ilike ('%' || v_pattern || '%') escape E'\\'
  order by lower(santri.nama_lengkap), santri.id;
end;
$$;

revoke all on function private.has_permission(text) from public, anon, authenticated;
revoke all on function private.require_permission(text) from public, anon, authenticated;
revoke all on function private.validate_role_permissions(jsonb) from public, anon, authenticated;
revoke all on function private.apply_santri_payload(uuid, jsonb, text) from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.has_permission(text) to authenticated;

-- Supabase projects may grant new functions both through PUBLIC and directly
-- to API roles. Clear every route first, then grant only authenticated.
revoke all on function public.get_my_profile() from public, anon, authenticated;
revoke all on function public.list_registration_roles() from public, anon, authenticated;
revoke all on function public.register_my_profile(text, text) from public, anon, authenticated;
revoke all on function public.review_pengajuan(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_or_create_wali_token(uuid) from public, anon, authenticated;
revoke all on function public.rotate_wali_token(uuid) from public, anon, authenticated;
revoke all on function public.set_wali_access_status(uuid, boolean) from public, anon, authenticated;
revoke all on function public.review_wali_access_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_save_role(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_delete_role(uuid) from public, anon, authenticated;
revoke all on function public.admin_update_user(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_takziran_santri(text) from public, anon, authenticated;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.list_registration_roles() to authenticated;
grant execute on function public.register_my_profile(text, text) to authenticated;
grant execute on function public.review_pengajuan(uuid, text, text) to authenticated;
grant execute on function public.get_or_create_wali_token(uuid) to authenticated;
grant execute on function public.rotate_wali_token(uuid) to authenticated;
grant execute on function public.set_wali_access_status(uuid, boolean) to authenticated;
grant execute on function public.review_wali_access_request(uuid, text, text) to authenticated;
grant execute on function public.admin_save_role(uuid, text, jsonb) to authenticated;
grant execute on function public.admin_delete_role(uuid) to authenticated;
grant execute on function public.admin_update_user(uuid, uuid, text) to authenticated;
grant execute on function public.get_takziran_santri(text) to authenticated;

do $$
declare
  v_unsafe text;
  v_invalid_grants text;
begin
  select string_agg(p.proname, ', ' order by p.proname)
    into v_unsafe
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid in (
      'public.get_my_profile()'::regprocedure,
      'public.list_registration_roles()'::regprocedure,
      'public.register_my_profile(text,text)'::regprocedure,
      'public.review_pengajuan(uuid,text,text)'::regprocedure,
      'public.get_or_create_wali_token(uuid)'::regprocedure,
      'public.rotate_wali_token(uuid)'::regprocedure,
      'public.set_wali_access_status(uuid,boolean)'::regprocedure,
      'public.review_wali_access_request(uuid,text,text)'::regprocedure,
      'public.admin_save_role(uuid,text,jsonb)'::regprocedure,
      'public.admin_delete_role(uuid)'::regprocedure,
      'public.admin_update_user(uuid,uuid,text)'::regprocedure,
      'public.get_takziran_santri(text)'::regprocedure
    )
    and (
      not p.prosecdef
      or coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%'
    );

  if v_unsafe is not null then
    raise exception 'MIGRATION_ABORTED: fungsi SECURITY DEFINER tidak aman: %', v_unsafe;
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
     or has_function_privilege('anon', 'private.has_permission(text)', 'EXECUTE')
     or not has_schema_privilege('authenticated', 'private', 'USAGE')
     or not has_function_privilege('authenticated', 'private.has_permission(text)', 'EXECUTE') then
    raise exception 'MIGRATION_ABORTED: grant helper permission tidak sesuai';
  end if;

  select string_agg(function_oid::text, ', ' order by function_oid::text)
    into v_invalid_grants
  from unnest(array[
    'public.get_my_profile()'::regprocedure,
    'public.list_registration_roles()'::regprocedure,
    'public.register_my_profile(text,text)'::regprocedure,
    'public.review_pengajuan(uuid,text,text)'::regprocedure,
    'public.get_or_create_wali_token(uuid)'::regprocedure,
    'public.rotate_wali_token(uuid)'::regprocedure,
    'public.set_wali_access_status(uuid,boolean)'::regprocedure,
    'public.review_wali_access_request(uuid,text,text)'::regprocedure,
    'public.admin_save_role(uuid,text,jsonb)'::regprocedure,
    'public.admin_delete_role(uuid)'::regprocedure,
    'public.admin_update_user(uuid,uuid,text)'::regprocedure,
    'public.get_takziran_santri(text)'::regprocedure
  ]) as rpc(function_oid)
  where not has_function_privilege('authenticated', function_oid, 'EXECUTE')
     or has_function_privilege('anon', function_oid, 'EXECUTE');

  if v_invalid_grants is not null then
    raise exception 'MIGRATION_ABORTED: grant RPC authenticated tidak sesuai: %', v_invalid_grants;
  end if;

  if (select row_count from _santriva_authenticated_counts where table_name = 'santri') <> (select count(*) from public.santri)
     or (select row_count from _santriva_authenticated_counts where table_name = 'pengajuan_santri') <> (select count(*) from public.pengajuan_santri)
     or (select row_count from _santriva_authenticated_counts where table_name = 'pengguna') <> (select count(*) from public.pengguna)
     or (select row_count from _santriva_authenticated_counts where table_name = 'master_role') <> (select count(*) from public.master_role)
     or (select row_count from _santriva_authenticated_counts where table_name = 'log_pelanggaran') <> (select count(*) from public.log_pelanggaran)
     or (select row_count from _santriva_authenticated_counts where table_name = 'master_jenis') <> (select count(*) from public.master_jenis)
     or (select row_count from _santriva_authenticated_counts where table_name = 'santri_catatan') <> (select count(*) from public.santri_catatan)
     or (select row_count from _santriva_authenticated_counts where table_name = 'santri_prestasi') <> (select count(*) from public.santri_prestasi)
     or (select row_count from _santriva_authenticated_counts where table_name = 'manage_users') <> (select count(*) from public.manage_users)
     or (select row_count from _santriva_authenticated_counts where table_name = 'permintaan_akses_wali') <> (select count(*) from public.permintaan_akses_wali)
     or (select row_count from _santriva_authenticated_counts where table_name = 'wali_portal_access') <> (select count(*) from private.wali_portal_access) then
    raise exception 'MIGRATION_ABORTED: jumlah baris berubah; seluruh transaksi dibatalkan';
  end if;
end
$$;

commit;

select
  'AUTHENTICATED_SECURITY_FUNCTIONS_APPLIED' as result,
  12 as jumlah_rpc_authenticated,
  false as rls_diaktifkan_pada_tahap_ini;
