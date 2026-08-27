-- Santriva restricted anonymous RPC layer
--
-- Prerequisite: 20260826_01_security_foundation.sql
-- This migration creates functions only. It does not enable RLS, remove old
-- policies, delete data, or update rows in public.santri.

begin;

create temporary table _santriva_rpc_row_counts (
  table_name text primary key,
  row_count bigint not null
) on commit drop;

insert into _santriva_rpc_row_counts (table_name, row_count)
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
  ('wali_portal_access', (select count(*) from private.wali_portal_access)),
  ('public_search_selection', (select count(*) from private.public_search_selection));

do $$
begin
  if to_regnamespace('private') is null
     or to_regclass('private.wali_portal_access') is null
     or to_regclass('private.public_search_selection') is null
     or to_regclass('public.permintaan_akses_wali') is null then
    raise exception 'MIGRATION_ABORTED: jalankan security foundation Task 2 terlebih dahulu';
  end if;
end
$$;

create or replace function private.normalize_wali_token(token_input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    translate(
      regexp_replace(upper(token_input), '[^0-9A-Z]', '', 'g'),
      'OIL',
      '011'
    ),
    ''
  );
$$;

create or replace function private.generate_wali_token()
returns text
language sql
volatile
set search_path = ''
as $$
  with random_data as (
    select extensions.gen_random_bytes(10) as bytes
  )
  select string_agg(
    substr(
      '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
      (get_byte(random_data.bytes, positions.i) % 32) + 1,
      1
    ),
    '' order by positions.i
  )
  from random_data
  cross join generate_series(0, 9) as positions(i);
$$;

create or replace function private.mask_identifier(value_input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(value_input), '') is null then null
    when char_length(btrim(value_input)) <= 4
      then repeat('•', char_length(btrim(value_input)))
    when char_length(btrim(value_input)) <= 8
      then left(btrim(value_input), 2)
        || repeat('•', greatest(char_length(btrim(value_input)) - 4, 1))
        || right(btrim(value_input), 2)
    else left(btrim(value_input), 4)
      || repeat('•', char_length(btrim(value_input)) - 8)
      || right(btrim(value_input), 4)
  end;
$$;

create or replace function private.mask_phone(value_input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(value_input), '') is null then null
    when char_length(btrim(value_input)) <= 6
      then repeat('•', char_length(btrim(value_input)))
    else left(btrim(value_input), 2)
      || repeat('•', char_length(btrim(value_input)) - 6)
      || right(btrim(value_input), 4)
  end;
$$;

create or replace function private.filter_santri_payload(
  payload_input jsonb,
  mode_input text
)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_allowed text[];
  v_key text;
  v_value jsonb;
  v_text text;
  v_result jsonb := '{}'::jsonb;
begin
  if mode_input = 'update' then
    v_allowed := array[
      'nama_lengkap', 'nisn', 'nik', 'jenis_kelamin', 'tempat_lahir',
      'tanggal_lahir', 'no_hp_santri', 'kelas', 'asrama', 'status',
      'tanggal_masuk', 'tahun_masuk', 'tahun_keluar', 'alamat_jalan',
      'desa_kelurahan', 'kecamatan', 'kabupaten_kota', 'provinsi',
      'kode_pos', 'nama_ayah', 'pekerjaan_ayah', 'nama_ibu',
      'pekerjaan_ibu', 'nama_wali', 'no_hp_wali'
    ];
  elsif mode_input = 'registration' then
    v_allowed := array[
      'nama_lengkap', 'nisn', 'nik', 'jenis_kelamin', 'tempat_lahir',
      'tanggal_lahir', 'no_hp_santri', 'alamat_jalan', 'desa_kelurahan',
      'kecamatan', 'kabupaten_kota', 'provinsi', 'kode_pos', 'nama_ayah',
      'pekerjaan_ayah', 'nama_ibu', 'pekerjaan_ibu', 'nama_wali',
      'no_hp_wali'
    ];
  else
    raise exception using errcode = '22023', message = 'Data tidak valid.';
  end if;

  if payload_input is null or jsonb_typeof(payload_input) <> 'object' then
    raise exception using errcode = '22023', message = 'Data tidak valid.';
  end if;

  for v_key, v_value in
    select item.key, item.value
    from jsonb_each(payload_input) as item
  loop
    if not (v_key = any(v_allowed)) then
      raise exception using errcode = '22023', message = 'Data tidak valid.';
    end if;

    if jsonb_typeof(v_value) = 'null' then
      v_result := v_result || jsonb_build_object(v_key, null);
      continue;
    end if;

    if jsonb_typeof(v_value) <> 'string' then
      raise exception using errcode = '22023', message = 'Data tidak valid.';
    end if;

    v_text := btrim(v_value #>> '{}');

    if char_length(v_text) > 1000 then
      raise exception using errcode = '22023', message = 'Data tidak valid.';
    end if;

    if v_key = 'nama_lengkap' and char_length(v_text) > 200 then
      raise exception using errcode = '22023', message = 'Data tidak valid.';
    end if;

    if v_key = 'nik' and v_text <> '' and v_text !~ '^[0-9]{16}$' then
      raise exception using errcode = '22023', message = 'Data tidak valid.';
    end if;

    if v_key = 'nisn' and v_text <> '' and v_text !~ '^[0-9]{10}$' then
      raise exception using errcode = '22023', message = 'Data tidak valid.';
    end if;

    if v_key in ('no_hp_santri', 'no_hp_wali')
       and v_text <> ''
       and v_text !~ '^[0-9+(). -]{6,25}$' then
      raise exception using errcode = '22023', message = 'Data tidak valid.';
    end if;

    if v_key in ('tanggal_lahir', 'tanggal_masuk') and v_text <> '' then
      begin
        perform v_text::date;
      exception when others then
        raise exception using errcode = '22023', message = 'Data tidak valid.';
      end;
    end if;

    v_result := v_result || jsonb_build_object(v_key, v_text);
  end loop;

  return v_result;
end;
$$;

create or replace function private.filter_pengaju_payload(payload_input jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_name text;
  v_relation text;
  v_contact text;
begin
  if payload_input is null or jsonb_typeof(payload_input) <> 'object' then
    raise exception using errcode = '22023', message = 'Data pengaju tidak valid.';
  end if;

  for v_key in select jsonb_object_keys(payload_input)
  loop
    if v_key not in ('nama_pengaju', 'hubungan', 'kontak_wa') then
      raise exception using errcode = '22023', message = 'Data pengaju tidak valid.';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_each(payload_input) as item
    where jsonb_typeof(item.value) not in ('string', 'null')
  ) then
    raise exception using errcode = '22023', message = 'Data pengaju tidak valid.';
  end if;

  v_name := btrim(coalesce(payload_input ->> 'nama_pengaju', ''));
  v_relation := btrim(coalesce(payload_input ->> 'hubungan', ''));
  v_contact := btrim(coalesce(payload_input ->> 'kontak_wa', ''));

  if v_name = '' or char_length(v_name) > 150
     or v_relation = '' or char_length(v_relation) > 80
     or v_contact = '' or v_contact !~ '^[0-9+(). -]{6,25}$' then
    raise exception using errcode = '22023', message = 'Data pengaju tidak valid.';
  end if;

  return jsonb_build_object(
    'nama_pengaju', v_name,
    'hubungan', v_relation,
    'kontak_wa', v_contact
  );
end;
$$;

create or replace function public.get_wali_portal(token_input text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_santri_id uuid;
  v_profile jsonb;
begin
  select access.santri_id
    into v_santri_id
  from private.wali_portal_access access
  where access.token = private.normalize_wali_token(token_input)
    and access.aktif = true
  limit 1;

  if v_santri_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'nama_lengkap', s.nama_lengkap,
    'nis', s.nis,
    'nisn', private.mask_identifier(s.nisn),
    'nik', private.mask_identifier(s.nik),
    'jenis_kelamin', s.jenis_kelamin,
    'tempat_lahir', s.tempat_lahir,
    'tanggal_lahir', s.tanggal_lahir,
    'no_hp_santri', private.mask_phone(s.no_hp_santri),
    'kelas', s.kelas,
    'asrama', s.asrama,
    'status', s.status,
    'tanggal_masuk', s.tanggal_masuk,
    'tahun_masuk', s.tahun_masuk,
    'tahun_keluar', s.tahun_keluar,
    'alamat_jalan', s.alamat_jalan,
    'desa_kelurahan', s.desa_kelurahan,
    'kecamatan', s.kecamatan,
    'kabupaten_kota', s.kabupaten_kota,
    'provinsi', s.provinsi,
    'kode_pos', s.kode_pos,
    'nama_ayah', s.nama_ayah,
    'pekerjaan_ayah', s.pekerjaan_ayah,
    'nama_ibu', s.nama_ibu,
    'pekerjaan_ibu', s.pekerjaan_ibu,
    'nama_wali', s.nama_wali,
    'no_hp_wali', private.mask_phone(s.no_hp_wali)
  )
    into v_profile
  from public.santri s
  where s.id = v_santri_id;

  if v_profile is null then
    return null;
  end if;

  return jsonb_build_object(
    'profil', v_profile,
    'pelanggaran', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'jenis', jenis.nama,
            'tanggal', logs.tgl_melanggar,
            'status_tazir', logs.status_tazir,
            'keterangan', logs.keterangan
          ) order by logs.tgl_melanggar desc, logs.created_at desc
        ),
        '[]'::jsonb
      )
      from public.log_pelanggaran logs
      left join public.master_jenis jenis on jenis.id = logs.jenis_id
      where logs.santri_id = v_santri_id
    ),
    'prestasi', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'prestasi', prestasi.prestasi,
            'tanggal', prestasi.created_at
          ) order by prestasi.created_at desc
        ),
        '[]'::jsonb
      )
      from public.santri_prestasi prestasi
      where prestasi.santri_id = v_santri_id
    ),
    'catatan', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'isi', catatan.isi,
            'tanggal', catatan.created_at
          ) order by catatan.created_at desc
        ),
        '[]'::jsonb
      )
      from public.santri_catatan catatan
      where catatan.santri_id = v_santri_id
        and catatan.tampil_ke_wali = true
    ),
    'pengajuan_menunggu', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'jenis_pengajuan', pengajuan.jenis_pengajuan,
            'status_pengajuan', pengajuan.status_pengajuan,
            'sumber_pengajuan', pengajuan.sumber_pengajuan,
            'created_at', pengajuan.created_at
          ) order by pengajuan.created_at desc
        ),
        '[]'::jsonb
      )
      from public.pengajuan_santri pengajuan
      where pengajuan.santri_id = v_santri_id
        and pengajuan.status_pengajuan = 'Menunggu'
    )
  );
end;
$$;

create or replace function public.submit_pengajuan_wali(
  token_input text,
  data_input jsonb,
  pengaju_input jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_santri_id uuid;
  v_data jsonb;
  v_pengaju jsonb;
  v_id uuid;
begin
  select access.santri_id
    into v_santri_id
  from private.wali_portal_access access
  where access.token = private.normalize_wali_token(token_input)
    and access.aktif = true
  limit 1;

  if v_santri_id is null then
    raise exception using errcode = '22023', message = 'Permintaan tidak dapat diproses.';
  end if;

  v_data := private.filter_santri_payload(data_input, 'update');
  v_pengaju := private.filter_pengaju_payload(pengaju_input);

  if v_data = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Data tidak valid.';
  end if;

  insert into public.pengajuan_santri (
    santri_id,
    jenis_pengajuan,
    status_pengajuan,
    data_pengajuan,
    sumber_pengajuan,
    informasi_pengaju
  ) values (
    v_santri_id,
    'Update',
    'Menunggu',
    v_data,
    'portal_wali',
    v_pengaju
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.search_santri_public(
  search_text text,
  page_number integer default 1,
  page_size integer default 20
)
returns table (
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
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(search_text, ''));
  v_pattern text;
  v_offset bigint;
begin
  if char_length(v_query) < 3 then
    raise exception using errcode = '22023', message = 'Masukkan minimal tiga huruf nama.';
  end if;

  v_pattern := replace(
    replace(
      replace(v_query, chr(92), chr(92) || chr(92)),
      '%', chr(92) || '%'
    ),
    '_', chr(92) || '_'
  );

  v_offset := (greatest(coalesce(page_number, 1), 1)::bigint - 1) * 20;

  delete from private.public_search_selection selection
  where selection.expires_at <= clock_timestamp();

  return query
  with matches as (
    select
      s.id,
      s.nama_lengkap,
      s.status,
      s.tahun_masuk,
      s.tahun_keluar,
      s.kelas,
      s.asrama,
      s.desa_kelurahan,
      s.kecamatan,
      s.kabupaten_kota,
      count(*) over() as total_count
    from public.santri s
    where s.nama_lengkap ilike ('%' || v_pattern || '%') escape E'\\'
  ),
  paged as (
    select *
    from matches
    order by lower(matches.nama_lengkap), matches.id
    offset v_offset
    limit 20
  ),
  issued as (
    insert into private.public_search_selection (santri_id, expires_at)
    select paged.id, clock_timestamp() + interval '30 minutes'
    from paged
    returning token, santri_id
  )
  select
    issued.token,
    paged.nama_lengkap,
    paged.status,
    paged.tahun_masuk,
    paged.tahun_keluar,
    paged.kelas,
    paged.asrama,
    paged.desa_kelurahan,
    paged.kecamatan,
    paged.kabupaten_kota,
    paged.total_count
  from paged
  join issued on issued.santri_id = paged.id
  order by lower(paged.nama_lengkap), paged.id;

  -- page_size is intentionally ignored. The server always enforces 20 rows.
end;
$$;

create or replace function public.get_ringkasan_santri_public(selection_token_input uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_santri_id uuid;
  v_result jsonb;
begin
  select selection.santri_id
    into v_santri_id
  from private.public_search_selection selection
  where selection.token = selection_token_input
    and selection.expires_at > clock_timestamp()
  limit 1;

  if v_santri_id is null then
    raise exception using
      errcode = '22023',
      message = 'Pilihan telah kedaluwarsa. Silakan ulangi pencarian.';
  end if;

  select jsonb_build_object(
    'nama_lengkap', s.nama_lengkap,
    'status', s.status,
    'kelas', s.kelas,
    'asrama', s.asrama,
    'tahun_masuk', s.tahun_masuk,
    'tahun_keluar', s.tahun_keluar,
    'desa_kelurahan', s.desa_kelurahan,
    'kecamatan', s.kecamatan,
    'kabupaten_kota', s.kabupaten_kota,
    'ringkasan', jsonb_build_object(
      'nisn', jsonb_build_object(
        'terisi', nullif(btrim(s.nisn), '') is not null,
        'nilai', private.mask_identifier(s.nisn)
      ),
      'nik', jsonb_build_object(
        'terisi', nullif(btrim(s.nik), '') is not null,
        'nilai', private.mask_identifier(s.nik)
      ),
      'jenis_kelamin', jsonb_build_object(
        'terisi', nullif(btrim(s.jenis_kelamin), '') is not null
      ),
      'tempat_lahir', jsonb_build_object(
        'terisi', nullif(btrim(s.tempat_lahir), '') is not null
      ),
      'tanggal_lahir', jsonb_build_object(
        'terisi', s.tanggal_lahir is not null,
        'nilai', case when s.tanggal_lahir is null then null
          else '••-••-' || extract(year from s.tanggal_lahir)::integer::text end
      ),
      'no_hp_santri', jsonb_build_object(
        'terisi', nullif(btrim(s.no_hp_santri), '') is not null,
        'nilai', private.mask_phone(s.no_hp_santri)
      ),
      'alamat_jalan', jsonb_build_object(
        'terisi', nullif(btrim(s.alamat_jalan), '') is not null
      ),
      'provinsi', jsonb_build_object(
        'terisi', nullif(btrim(s.provinsi), '') is not null
      ),
      'kode_pos', jsonb_build_object(
        'terisi', nullif(btrim(s.kode_pos), '') is not null
      ),
      'nama_ayah', jsonb_build_object(
        'terisi', nullif(btrim(s.nama_ayah), '') is not null
      ),
      'pekerjaan_ayah', jsonb_build_object(
        'terisi', nullif(btrim(s.pekerjaan_ayah), '') is not null
      ),
      'nama_ibu', jsonb_build_object(
        'terisi', nullif(btrim(s.nama_ibu), '') is not null
      ),
      'pekerjaan_ibu', jsonb_build_object(
        'terisi', nullif(btrim(s.pekerjaan_ibu), '') is not null
      ),
      'nama_wali', jsonb_build_object(
        'terisi', nullif(btrim(s.nama_wali), '') is not null
      ),
      'no_hp_wali', jsonb_build_object(
        'terisi', nullif(btrim(s.no_hp_wali), '') is not null,
        'nilai', private.mask_phone(s.no_hp_wali)
      )
    )
  )
    into v_result
  from public.santri s
  where s.id = v_santri_id;

  if v_result is null then
    raise exception using
      errcode = '22023',
      message = 'Pilihan telah kedaluwarsa. Silakan ulangi pencarian.';
  end if;

  return v_result;
end;
$$;

create or replace function public.submit_koreksi_public(
  selection_token_input uuid,
  data_input jsonb,
  pengaju_input jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_santri_id uuid;
  v_data jsonb;
  v_pengaju jsonb;
  v_id uuid;
begin
  select selection.santri_id
    into v_santri_id
  from private.public_search_selection selection
  where selection.token = selection_token_input
    and selection.expires_at > clock_timestamp()
  limit 1;

  if v_santri_id is null then
    raise exception using
      errcode = '22023',
      message = 'Pilihan telah kedaluwarsa. Silakan ulangi pencarian.';
  end if;

  v_data := private.filter_santri_payload(data_input, 'update');
  v_pengaju := private.filter_pengaju_payload(pengaju_input);

  if v_data = '{}'::jsonb then
    raise exception using errcode = '22023', message = 'Data tidak valid.';
  end if;

  insert into public.pengajuan_santri (
    santri_id,
    jenis_pengajuan,
    status_pengajuan,
    data_pengajuan,
    sumber_pengajuan,
    informasi_pengaju
  ) values (
    v_santri_id,
    'Update',
    'Menunggu',
    v_data,
    'pencarian_publik',
    v_pengaju
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.request_wali_access(
  selection_token_input uuid,
  pengaju_input jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_santri_id uuid;
  v_pengaju jsonb;
  v_id uuid;
begin
  select selection.santri_id
    into v_santri_id
  from private.public_search_selection selection
  where selection.token = selection_token_input
    and selection.expires_at > clock_timestamp()
  limit 1;

  if v_santri_id is null then
    raise exception using
      errcode = '22023',
      message = 'Pilihan telah kedaluwarsa. Silakan ulangi pencarian.';
  end if;

  v_pengaju := private.filter_pengaju_payload(pengaju_input);

  insert into public.permintaan_akses_wali (
    santri_id,
    nama_pengaju,
    hubungan,
    kontak_wa,
    status
  ) values (
    v_santri_id,
    v_pengaju ->> 'nama_pengaju',
    v_pengaju ->> 'hubungan',
    v_pengaju ->> 'kontak_wa',
    'Menunggu'
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.submit_pendaftaran_baru(
  data_input jsonb,
  pengaju_input jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
  v_pengaju jsonb;
  v_id uuid;
begin
  v_data := private.filter_santri_payload(data_input, 'registration');
  v_pengaju := private.filter_pengaju_payload(pengaju_input);

  if nullif(btrim(v_data ->> 'nama_lengkap'), '') is null then
    raise exception using errcode = '22023', message = 'Data tidak valid.';
  end if;

  if (
    nullif(v_data ->> 'nik', '') is not null
    and exists (
      select 1 from public.santri s where s.nik = v_data ->> 'nik'
    )
  ) or (
    nullif(v_data ->> 'nisn', '') is not null
    and exists (
      select 1 from public.santri s where s.nisn = v_data ->> 'nisn'
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Pendaftaran tidak dapat diproses. Silakan hubungi admin.';
  end if;

  insert into public.pengajuan_santri (
    santri_id,
    jenis_pengajuan,
    status_pengajuan,
    data_pengajuan,
    sumber_pengajuan,
    informasi_pengaju
  ) values (
    null,
    'Baru',
    'Menunggu',
    v_data,
    'pendaftaran_publik',
    v_pengaju
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function private.normalize_wali_token(text) from public, anon, authenticated;
revoke all on function private.generate_wali_token() from public, anon, authenticated;
revoke all on function private.mask_identifier(text) from public, anon, authenticated;
revoke all on function private.mask_phone(text) from public, anon, authenticated;
revoke all on function private.filter_santri_payload(jsonb, text) from public, anon, authenticated;
revoke all on function private.filter_pengaju_payload(jsonb) from public, anon, authenticated;

revoke all on function public.get_wali_portal(text) from public;
revoke all on function public.submit_pengajuan_wali(text, jsonb, jsonb) from public;
revoke all on function public.search_santri_public(text, integer, integer) from public;
revoke all on function public.get_ringkasan_santri_public(uuid) from public;
revoke all on function public.submit_koreksi_public(uuid, jsonb, jsonb) from public;
revoke all on function public.request_wali_access(uuid, jsonb) from public;
revoke all on function public.submit_pendaftaran_baru(jsonb, jsonb) from public;

grant execute on function public.get_wali_portal(text) to anon, authenticated;
grant execute on function public.submit_pengajuan_wali(text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.search_santri_public(text, integer, integer) to anon, authenticated;
grant execute on function public.get_ringkasan_santri_public(uuid) to anon, authenticated;
grant execute on function public.submit_koreksi_public(uuid, jsonb, jsonb) to anon, authenticated;
grant execute on function public.request_wali_access(uuid, jsonb) to anon, authenticated;
grant execute on function public.submit_pendaftaran_baru(jsonb, jsonb) to anon, authenticated;

do $$
declare
  v_bad_function text;
begin
  select string_agg(n.nspname || '.' || p.proname, ', ' order by p.proname)
    into v_bad_function
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid in (
      'public.get_wali_portal(text)'::regprocedure,
      'public.submit_pengajuan_wali(text,jsonb,jsonb)'::regprocedure,
      'public.search_santri_public(text,integer,integer)'::regprocedure,
      'public.get_ringkasan_santri_public(uuid)'::regprocedure,
      'public.submit_koreksi_public(uuid,jsonb,jsonb)'::regprocedure,
      'public.request_wali_access(uuid,jsonb)'::regprocedure,
      'public.submit_pendaftaran_baru(jsonb,jsonb)'::regprocedure
    )
    and (
      not p.prosecdef
      or coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%'
    );

  if v_bad_function is not null then
    raise exception 'MIGRATION_ABORTED: fungsi publik tidak aman: %', v_bad_function;
  end if;

  if has_function_privilege('anon', 'private.normalize_wali_token(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.generate_wali_token()', 'EXECUTE')
     or has_function_privilege('anon', 'private.mask_identifier(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.mask_phone(text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.filter_santri_payload(jsonb,text)', 'EXECUTE')
     or has_function_privilege('anon', 'private.filter_pengaju_payload(jsonb)', 'EXECUTE') then
    raise exception 'MIGRATION_ABORTED: helper private masih dapat dijalankan anon';
  end if;

  if not has_function_privilege('anon', 'public.get_wali_portal(text)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.submit_pengajuan_wali(text,jsonb,jsonb)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.search_santri_public(text,integer,integer)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.get_ringkasan_santri_public(uuid)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.submit_koreksi_public(uuid,jsonb,jsonb)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.request_wali_access(uuid,jsonb)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.submit_pendaftaran_baru(jsonb,jsonb)', 'EXECUTE') then
    raise exception 'MIGRATION_ABORTED: grant RPC publik tidak lengkap';
  end if;

  if (select row_count from _santriva_rpc_row_counts where table_name = 'santri')
       <> (select count(*) from public.santri)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'pengajuan_santri')
       <> (select count(*) from public.pengajuan_santri)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'pengguna')
       <> (select count(*) from public.pengguna)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'master_role')
       <> (select count(*) from public.master_role)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'log_pelanggaran')
       <> (select count(*) from public.log_pelanggaran)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'master_jenis')
       <> (select count(*) from public.master_jenis)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'santri_catatan')
       <> (select count(*) from public.santri_catatan)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'santri_prestasi')
       <> (select count(*) from public.santri_prestasi)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'manage_users')
       <> (select count(*) from public.manage_users)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'permintaan_akses_wali')
       <> (select count(*) from public.permintaan_akses_wali)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'wali_portal_access')
       <> (select count(*) from private.wali_portal_access)
     or (select row_count from _santriva_rpc_row_counts where table_name = 'public_search_selection')
       <> (select count(*) from private.public_search_selection) then
    raise exception 'MIGRATION_ABORTED: jumlah baris berubah; seluruh transaksi dibatalkan';
  end if;
end
$$;

commit;

select
  'PUBLIC_SECURITY_FUNCTIONS_APPLIED' as result,
  7 as jumlah_rpc_publik,
  6 as jumlah_helper_private,
  false as rls_diaktifkan_pada_tahap_ini;
