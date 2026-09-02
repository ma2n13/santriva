-- Santriva authenticated authorization and staged RLS verification
--
-- Run twice:
-- 1. Before migrations 03 and 04: MUST fail with AUTH_SECURITY_TEST_FAILED.
-- 2. After both migrations: MUST return AUTHENTICATED_SECURITY_TEST_OK.
--
-- Test users and data live inside this transaction and are rolled back.

begin;

do $$
declare
  v_missing_functions text;
  v_missing_policies text;
  v_invalid_grants text;
begin
  select string_agg(signature, ', ' order by signature)
    into v_missing_functions
  from (
    values
      ('private.has_permission(text)', to_regprocedure('private.has_permission(text)')),
      ('public.get_my_profile()', to_regprocedure('public.get_my_profile()')),
      ('public.list_registration_roles()', to_regprocedure('public.list_registration_roles()')),
      ('public.register_my_profile(text,text)', to_regprocedure('public.register_my_profile(text,text)')),
      ('public.review_pengajuan(uuid,text,text)', to_regprocedure('public.review_pengajuan(uuid,text,text)')),
      ('public.get_or_create_wali_token(uuid)', to_regprocedure('public.get_or_create_wali_token(uuid)')),
      ('public.rotate_wali_token(uuid)', to_regprocedure('public.rotate_wali_token(uuid)')),
      ('public.set_wali_access_status(uuid,boolean)', to_regprocedure('public.set_wali_access_status(uuid,boolean)')),
      ('public.review_wali_access_request(uuid,text,text)', to_regprocedure('public.review_wali_access_request(uuid,text,text)')),
      ('public.admin_save_role(uuid,text,jsonb)', to_regprocedure('public.admin_save_role(uuid,text,jsonb)')),
      ('public.admin_delete_role(uuid)', to_regprocedure('public.admin_delete_role(uuid)')),
      ('public.admin_update_user(uuid,uuid,text)', to_regprocedure('public.admin_update_user(uuid,uuid,text)')),
      ('public.get_takziran_santri(text)', to_regprocedure('public.get_takziran_santri(text)'))
  ) as required_functions(signature, function_oid)
  where function_oid is null;

  if v_missing_functions is not null then
    raise exception 'AUTH_SECURITY_TEST_FAILED: fungsi belum tersedia: %', v_missing_functions;
  end if;

  select string_agg(required.policy_name, ', ' order by required.policy_name)
    into v_missing_policies
  from (
    values
      ('public', 'santri', 'santri_select_with_akses_induk'),
      ('public', 'santri', 'santri_insert_with_edit_induk'),
      ('public', 'santri', 'santri_update_with_edit_induk'),
      ('public', 'santri', 'santri_delete_with_hapus_induk'),
      ('public', 'pengajuan_santri', 'pengajuan_select_with_validasi_pengajuan'),
      ('public', 'pengguna', 'pengguna_select_self_or_kelola'),
      ('public', 'master_role', 'master_role_select_with_kelola_pengguna'),
      ('public', 'master_jenis', 'master_jenis_select_with_akses_takziran'),
      ('public', 'log_pelanggaran', 'log_pelanggaran_select_with_akses_takziran'),
      ('public', 'santri_catatan', 'santri_catatan_select_with_akses_induk'),
      ('public', 'santri_prestasi', 'santri_prestasi_select_with_akses_induk'),
      ('public', 'permintaan_akses_wali', 'permintaan_akses_wali_select_with_edit_induk')
  ) as required(schema_name, table_name, policy_name)
  left join pg_policies policies
    on policies.schemaname = required.schema_name
   and policies.tablename = required.table_name
   and policies.policyname = required.policy_name
  where policies.policyname is null;

  if v_missing_policies is not null then
    raise exception 'AUTH_SECURITY_TEST_FAILED: policy staged belum tersedia: %', v_missing_policies;
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
    raise exception 'AUTH_SECURITY_TEST_FAILED: RLS aktif terlalu awal';
  end if;

  if not has_schema_privilege('authenticated', 'private', 'USAGE')
     or not has_function_privilege('authenticated', 'private.has_permission(text)', 'EXECUTE')
     or has_schema_privilege('anon', 'private', 'USAGE')
     or has_function_privilege('anon', 'private.has_permission(text)', 'EXECUTE') then
    raise exception 'AUTH_SECURITY_TEST_FAILED: izin helper private tidak sesuai';
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
    raise exception 'AUTH_SECURITY_TEST_FAILED: grant RPC authenticated tidak sesuai: %', v_invalid_grants;
  end if;

  if pg_get_function_result('public.get_takziran_santri(text)'::regprocedure)
     <> 'TABLE(id uuid, nama_lengkap text, nis text, kelas text, asrama text)' then
    raise exception 'AUTH_SECURITY_TEST_FAILED: kontrak daftar santri takziran membocorkan kolom lain';
  end if;

  if not has_table_privilege('authenticated', 'public.santri', 'DELETE') then
    raise exception 'AUTH_SECURITY_TEST_FAILED: fixture tidak dapat menguji policy DELETE karena GRANT tabel tidak tersedia';
  end if;
end
$$;

create temporary table _auth_security_context (
  prefix text not null,
  role_access uuid not null,
  role_edit uuid not null,
  role_takziran uuid not null,
  role_validation uuid not null,
  role_manage uuid not null,
  role_super uuid not null,
  user_no_profile uuid not null,
  user_register uuid not null,
  user_waiting uuid not null,
  user_rejected uuid not null,
  user_access uuid not null,
  user_edit uuid not null,
  user_takziran uuid not null,
  user_validation uuid not null,
  user_manage uuid not null,
  user_super uuid not null,
  user_target uuid not null,
  santri_review uuid not null,
  santri_delete_denied uuid not null,
  santri_delete_allowed uuid not null,
  pengajuan_valid uuid not null,
  pengajuan_invalid uuid not null,
  pengajuan_new uuid not null,
  access_request uuid not null,
  original_review_santri jsonb not null,
  created_role uuid
) on commit drop;

grant select, update on _auth_security_context to authenticated;

do $$
declare
  v_prefix text := 'ZZZAUTH' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_role_access uuid := gen_random_uuid();
  v_role_edit uuid := gen_random_uuid();
  v_role_takziran uuid := gen_random_uuid();
  v_role_validation uuid := gen_random_uuid();
  v_role_manage uuid := gen_random_uuid();
  v_role_super uuid := gen_random_uuid();
  v_user_no_profile uuid := gen_random_uuid();
  v_user_register uuid := gen_random_uuid();
  v_user_waiting uuid := gen_random_uuid();
  v_user_rejected uuid := gen_random_uuid();
  v_user_access uuid := gen_random_uuid();
  v_user_edit uuid := gen_random_uuid();
  v_user_takziran uuid := gen_random_uuid();
  v_user_validation uuid := gen_random_uuid();
  v_user_manage uuid := gen_random_uuid();
  v_user_super uuid := gen_random_uuid();
  v_user_target uuid := gen_random_uuid();
  v_santri_review uuid := gen_random_uuid();
  v_santri_delete_denied uuid := gen_random_uuid();
  v_santri_delete_allowed uuid := gen_random_uuid();
  v_pengajuan_valid uuid := gen_random_uuid();
  v_pengajuan_invalid uuid := gen_random_uuid();
  v_pengajuan_new uuid := gen_random_uuid();
  v_access_request uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, created_at, updated_at)
  values
    (v_user_no_profile, lower(v_prefix) || '.no-profile@example.invalid', now(), now()),
    (v_user_register, lower(v_prefix) || '.register@example.invalid', now(), now()),
    (v_user_waiting, lower(v_prefix) || '.waiting@example.invalid', now(), now()),
    (v_user_rejected, lower(v_prefix) || '.rejected@example.invalid', now(), now()),
    (v_user_access, lower(v_prefix) || '.access@example.invalid', now(), now()),
    (v_user_edit, lower(v_prefix) || '.edit@example.invalid', now(), now()),
    (v_user_takziran, lower(v_prefix) || '.takziran@example.invalid', now(), now()),
    (v_user_validation, lower(v_prefix) || '.validation@example.invalid', now(), now()),
    (v_user_manage, lower(v_prefix) || '.manage@example.invalid', now(), now()),
    (v_user_super, lower(v_prefix) || '.super@example.invalid', now(), now()),
    (v_user_target, lower(v_prefix) || '.target@example.invalid', now(), now());

  insert into public.master_role (id, nama_role, permissions)
  values
    (v_role_access, v_prefix || ' Akses Induk', '["akses_induk"]'::jsonb),
    (v_role_edit, v_prefix || ' Edit Induk', '["akses_induk","edit_induk"]'::jsonb),
    (v_role_takziran, v_prefix || ' Takziran', '["akses_takziran","input_takziran"]'::jsonb),
    (v_role_validation, v_prefix || ' Validasi', '["validasi_pengajuan"]'::jsonb),
    (v_role_manage, v_prefix || ' Kelola', '["kelola_pengguna"]'::jsonb),
    (
      v_role_super,
      'Super Admin',
      '["akses_induk","edit_induk","hapus_induk","akses_takziran","input_takziran","validasi_pengajuan","kelola_pengguna","akses_keuangan"]'::jsonb
    );

  insert into public.pengguna (
    id, email, nama_lengkap, role_id, usulan_role, status_akun
  ) values
    (v_user_waiting, lower(v_prefix) || '.waiting@example.invalid', v_prefix || ' Waiting', v_role_access, 'Pengurus', 'Menunggu'),
    (v_user_rejected, lower(v_prefix) || '.rejected@example.invalid', v_prefix || ' Rejected', v_role_access, 'Pengurus', 'Ditolak'),
    (v_user_access, lower(v_prefix) || '.access@example.invalid', v_prefix || ' Access', v_role_access, null, 'Aktif'),
    (v_user_edit, lower(v_prefix) || '.edit@example.invalid', v_prefix || ' Edit', v_role_edit, null, 'Aktif'),
    (v_user_takziran, lower(v_prefix) || '.takziran@example.invalid', v_prefix || ' Takziran', v_role_takziran, null, 'Aktif'),
    (v_user_validation, lower(v_prefix) || '.validation@example.invalid', v_prefix || ' Validation', v_role_validation, null, 'Aktif'),
    (v_user_manage, lower(v_prefix) || '.manage@example.invalid', v_prefix || ' Manage', v_role_manage, null, 'Aktif'),
    (v_user_super, lower(v_prefix) || '.super@example.invalid', v_prefix || ' Super', v_role_super, null, 'Aktif'),
    (v_user_target, lower(v_prefix) || '.target@example.invalid', v_prefix || ' Target', null, 'Pengurus', 'Menunggu');

  insert into public.santri (
    id, nama_lengkap, nis, nisn, nik, kelas, asrama, status,
    no_hp_wali, alamat_jalan, nama_ayah, nama_ibu
  ) values
    (
      v_santri_review, v_prefix || ' Santri Lama', 'AUTH-001', '1111111111',
      '1111111111111111', '1A', 'Utara', 'Aktif', '081111111111',
      'Alamat Lama', 'Ayah Lama', 'Ibu Lama'
    ),
    (v_santri_delete_denied, v_prefix || ' Tidak Boleh Dihapus', 'AUTH-002', null, null, '1B', 'Utara', 'Aktif', null, null, null, null),
    (v_santri_delete_allowed, v_prefix || ' Boleh Dihapus', 'AUTH-003', null, null, '1C', 'Utara', 'Aktif', null, null, null, null);

  insert into public.pengajuan_santri (
    id, santri_id, jenis_pengajuan, status_pengajuan, data_pengajuan,
    sumber_pengajuan, informasi_pengaju
  ) values
    (
      v_pengajuan_valid,
      v_santri_review,
      'Update',
      'Menunggu',
      jsonb_build_object(
        'nama_lengkap', v_prefix || ' Santri Diperbarui',
        'pekerjaan_ibu', 'Guru',
        'tanggal_lahir', '2005-02-03'
      ),
      'pencarian_publik',
      jsonb_build_object(
        'nama_pengaju', 'NAMA_PENGAJU_TIDAK_BOLEH_MENJADI_NAMA_SANTRI',
        'hubungan', 'Alumni',
        'kontak_wa', '081200000001'
      )
    ),
    (
      v_pengajuan_invalid,
      v_santri_review,
      'Update',
      'Menunggu',
      '{"tanggal_lahir":"bukan-tanggal"}'::jsonb,
      'legacy',
      null
    ),
    (
      v_pengajuan_new,
      null,
      'Baru',
      'Menunggu',
      jsonb_build_object(
        'nama_lengkap', v_prefix || ' Santri Baru',
        'jenis_kelamin', 'Laki-laki',
        'nama_ayah', 'Ayah Baru',
        'nama_ibu', 'Ibu Baru'
      ),
      'pendaftaran_publik',
      '{"nama_pengaju":"Pendaftar","hubungan":"Orang Tua","kontak_wa":"081200000002"}'::jsonb
    );

  insert into public.permintaan_akses_wali (
    id, santri_id, nama_pengaju, hubungan, kontak_wa, status
  ) values (
    v_access_request, v_santri_review, 'Peminta Akses', 'Wali', '081200000003', 'Menunggu'
  );

  insert into _auth_security_context (
    prefix,
    role_access, role_edit, role_takziran, role_validation, role_manage, role_super,
    user_no_profile, user_register, user_waiting, user_rejected, user_access,
    user_edit, user_takziran, user_validation, user_manage, user_super, user_target,
    santri_review, santri_delete_denied, santri_delete_allowed,
    pengajuan_valid, pengajuan_invalid, pengajuan_new, access_request,
    original_review_santri
  )
  select
    v_prefix,
    v_role_access, v_role_edit, v_role_takziran, v_role_validation, v_role_manage, v_role_super,
    v_user_no_profile, v_user_register, v_user_waiting, v_user_rejected, v_user_access,
    v_user_edit, v_user_takziran, v_user_validation, v_user_manage, v_user_super, v_user_target,
    v_santri_review, v_santri_delete_denied, v_santri_delete_allowed,
    v_pengajuan_valid, v_pengajuan_invalid, v_pengajuan_new, v_access_request,
    to_jsonb(s)
  from public.santri s
  where s.id = v_santri_review;
end
$$;

-- User without a profile receives no profile and no permission.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_no_profile from _auth_security_context),
    'email', (select lower(prefix) || '.no-profile@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
begin
  if public.get_my_profile() is not null then
    raise exception 'AUTH_SECURITY_TEST_FAILED: akun tanpa profil memperoleh profil';
  end if;

  if private.has_permission('akses_induk') then
    raise exception 'AUTH_SECURITY_TEST_FAILED: akun tanpa profil memperoleh permission';
  end if;
end
$$;

reset role;

-- Registration derives id/email from JWT and forces Menunggu with no role.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_register from _auth_security_context),
    'email', (select lower(prefix) || '.register@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_result jsonb;
begin
  select * into v_context from _auth_security_context limit 1;

  if exists (
    select 1 from public.list_registration_roles() roles
    where lower(btrim(roles.nama_role)) = 'super admin'
  ) then
    raise exception 'AUTH_SECURITY_TEST_FAILED: Super Admin muncul pada pilihan pendaftaran';
  end if;

  v_result := public.register_my_profile(
    v_context.prefix || ' Pendaftar',
    v_context.prefix || ' Akses Induk'
  );

  if v_result ->> 'status_akun' <> 'Menunggu'
     or nullif(v_result ->> 'role_id', '') is not null then
    raise exception 'AUTH_SECURITY_TEST_FAILED: pendaftaran dapat menentukan status atau role';
  end if;
end
$$;

reset role;

do $$
declare
  v_context _auth_security_context%rowtype;
begin
  select * into v_context from _auth_security_context limit 1;

  if not exists (
    select 1 from public.pengguna p
    where p.id = v_context.user_register
      and p.email = lower(v_context.prefix) || '.register@example.invalid'
      and p.role_id is null
      and p.status_akun = 'Menunggu'
  ) then
    raise exception 'AUTH_SECURITY_TEST_FAILED: profil pendaftaran tidak tersimpan secara aman';
  end if;
end
$$;

-- Menunggu and Ditolak never receive permissions.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_waiting from _auth_security_context),
    'email', (select lower(prefix) || '.waiting@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_rejected boolean := false;
begin
  if private.has_permission('akses_induk') then
    raise exception 'AUTH_SECURITY_TEST_FAILED: akun Menunggu memperoleh permission';
  end if;

  begin
    perform * from public.get_takziran_santri(null);
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: akun Menunggu dapat membuka takziran';
  end if;
end
$$;

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_rejected from _auth_security_context),
    'email', (select lower(prefix) || '.rejected@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
begin
  if private.has_permission('akses_induk') then
    raise exception 'AUTH_SECURITY_TEST_FAILED: akun Ditolak memperoleh permission';
  end if;
end
$$;

reset role;

-- akses_induk may create/copy a token; edit_induk may rotate/disable it.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_access from _auth_security_context),
    'email', (select lower(prefix) || '.access@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_token text;
  v_rotate_rejected boolean := false;
begin
  select * into v_context from _auth_security_context limit 1;
  v_token := public.get_or_create_wali_token(v_context.santri_review);

  if v_token !~ '^[0-9A-HJKMNP-TV-Z]{10}$' then
    raise exception 'AUTH_SECURITY_TEST_FAILED: token wali tidak valid';
  end if;

  begin
    perform public.rotate_wali_token(v_context.santri_review);
  exception when others then
    v_rotate_rejected := true;
  end;

  if not v_rotate_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: akses_induk tanpa edit_induk dapat merotasi token';
  end if;
end
$$;

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_edit from _auth_security_context),
    'email', (select lower(prefix) || '.edit@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_old_token text;
  v_new_token text;
  v_access_review jsonb;
  v_disable_result boolean;
  v_portal_after_disable jsonb;
  v_enable_result boolean;
  v_portal_after_enable jsonb;
begin
  select * into v_context from _auth_security_context limit 1;
  v_old_token := public.get_or_create_wali_token(v_context.santri_review);
  v_new_token := public.rotate_wali_token(v_context.santri_review);

  if v_new_token = v_old_token or v_new_token !~ '^[0-9A-HJKMNP-TV-Z]{10}$' then
    raise exception 'AUTH_SECURITY_TEST_FAILED: rotasi token gagal';
  end if;

  -- Keep state changes and observations in separate SQL statements. A STABLE
  -- reader called in the same expression as a VOLATILE writer can observe the
  -- statement's earlier snapshot instead of the just-written state.
  v_disable_result := public.set_wali_access_status(v_context.santri_review, false);
  v_portal_after_disable := public.get_wali_portal(v_new_token);
  v_enable_result := public.set_wali_access_status(v_context.santri_review, true);
  v_portal_after_enable := public.get_wali_portal(v_new_token);

  if not v_disable_result then
    raise exception 'AUTH_SECURITY_TEST_FAILED: menonaktifkan akses wali gagal';
  end if;

  if v_portal_after_disable is not null then
    raise exception 'AUTH_SECURITY_TEST_FAILED: token nonaktif masih membuka portal';
  end if;

  if not v_enable_result or v_portal_after_enable is null then
    raise exception 'AUTH_SECURITY_TEST_FAILED: mengaktifkan kembali akses wali gagal';
  end if;

  v_access_review := public.review_wali_access_request(
    v_context.access_request,
    'Disetujui',
    'Identitas sudah diperiksa'
  );

  if v_access_review ->> 'status' <> 'Disetujui'
     or (v_access_review ->> 'token') !~ '^[0-9A-HJKMNP-TV-Z]{10}$' then
    raise exception 'AUTH_SECURITY_TEST_FAILED: review permintaan akses wali gagal';
  end if;
end
$$;

reset role;

-- Takziran receives only five approved columns and no PII.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_takziran from _auth_security_context),
    'email', (select lower(prefix) || '.takziran@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_result jsonb;
begin
  select * into v_context from _auth_security_context limit 1;

  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb)
    into v_result
  from public.get_takziran_santri(v_context.prefix) rows;

  if jsonb_array_length(v_result) < 1
     or v_result::text like '%1111111111111111%'
     or v_result::text like '%081111111111%'
     or v_result::text like '%Alamat Lama%'
     or v_result::text like '%Ayah Lama%'
     or v_result::text like '%Ibu Lama%' then
    raise exception 'AUTH_SECURITY_TEST_FAILED: hasil takziran kosong atau membocorkan PII';
  end if;
end
$$;

reset role;

-- Review is atomic, allowlisted, and can happen only once.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_validation from _auth_security_context),
    'email', (select lower(prefix) || '.validation@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_result jsonb;
  v_second_rejected boolean := false;
  v_invalid_rejected boolean := false;
begin
  select * into v_context from _auth_security_context limit 1;

  v_result := public.review_pengajuan(v_context.pengajuan_valid, 'Disetujui', 'Data sesuai');
  if v_result ->> 'status' <> 'Disetujui' then
    raise exception 'AUTH_SECURITY_TEST_FAILED: pengajuan valid tidak disetujui';
  end if;

  begin
    perform public.review_pengajuan(v_context.pengajuan_valid, 'Disetujui', 'Review kedua');
  exception when others then
    v_second_rejected := true;
  end;

  if not v_second_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: pengajuan yang sama dapat direview dua kali';
  end if;

  begin
    perform public.review_pengajuan(v_context.pengajuan_invalid, 'Disetujui', 'Seharusnya gagal');
  exception when others then
    v_invalid_rejected := true;
  end;

  if not v_invalid_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: payload invalid disetujui';
  end if;

  v_result := public.review_pengajuan(v_context.pengajuan_new, 'Disetujui', 'Pendaftar diterima');
  if v_result ->> 'status' <> 'Disetujui' or nullif(v_result ->> 'santri_id', '') is null then
    raise exception 'AUTH_SECURITY_TEST_FAILED: pendaftaran baru tidak dibuat atomik';
  end if;
end
$$;

reset role;

do $$
declare
  v_context _auth_security_context%rowtype;
begin
  select * into v_context from _auth_security_context limit 1;

  if not exists (
    select 1 from public.santri s
    where s.id = v_context.santri_review
      and s.nama_lengkap = v_context.prefix || ' Santri Diperbarui'
      and s.pekerjaan_ibu = 'Guru'
      and s.tanggal_lahir = date '2005-02-03'
      and s.nama_lengkap <> 'NAMA_PENGAJU_TIDAK_BOLEH_MENJADI_NAMA_SANTRI'
  ) then
    raise exception 'AUTH_SECURITY_TEST_FAILED: data_pengajuan tidak diterapkan dengan benar';
  end if;

  if not exists (
    select 1 from public.pengajuan_santri p
    where p.id = v_context.pengajuan_invalid
      and p.status_pengajuan = 'Menunggu'
  ) then
    raise exception 'AUTH_SECURITY_TEST_FAILED: review gagal tidak rollback seluruh perubahan';
  end if;

  if not exists (
    select 1 from public.pengajuan_santri p
    join public.santri s on s.id = p.santri_id
    where p.id = v_context.pengajuan_new
      and p.status_pengajuan = 'Disetujui'
      and s.nama_lengkap = v_context.prefix || ' Santri Baru'
  ) then
    raise exception 'AUTH_SECURITY_TEST_FAILED: santri baru dan pengajuan tidak tersimpan bersama';
  end if;
end
$$;

-- Role/user administration protects self and Super Admin.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_manage from _auth_security_context),
    'email', (select lower(prefix) || '.manage@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_created_role uuid;
  v_invalid_permission_rejected boolean := false;
  v_self_rejected boolean := false;
  v_super_delete_rejected boolean := false;
  v_last_super_rejected boolean := false;
begin
  select * into v_context from _auth_security_context limit 1;

  v_created_role := public.admin_save_role(
    null,
    v_context.prefix || ' Role Baru',
    '["akses_induk","edit_induk"]'::jsonb
  );

  update _auth_security_context set created_role = v_created_role;

  begin
    perform public.admin_save_role(
      null,
      v_context.prefix || ' Role Invalid',
      '["permission_tidak_dikenal"]'::jsonb
    );
  exception when others then
    v_invalid_permission_rejected := true;
  end;

  if not v_invalid_permission_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: permission tidak dikenal diterima';
  end if;

  begin
    perform public.admin_update_user(v_context.user_manage, v_created_role, 'Aktif');
  exception when others then
    v_self_rejected := true;
  end;

  if not v_self_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: admin dapat mengubah role/status sendiri';
  end if;

  begin
    perform public.admin_delete_role(v_context.role_super);
  exception when others then
    v_super_delete_rejected := true;
  end;

  if not v_super_delete_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: role Super Admin dapat dihapus';
  end if;

  begin
    perform public.admin_update_user(v_context.user_super, null, 'Ditolak');
  exception when others then
    v_last_super_rejected := true;
  end;

  if not v_last_super_rejected then
    raise exception 'AUTH_SECURITY_TEST_FAILED: Super Admin aktif terakhir dapat dinonaktifkan';
  end if;

  if not public.admin_update_user(v_context.user_target, v_context.role_access, 'Aktif') then
    raise exception 'AUTH_SECURITY_TEST_FAILED: admin gagal mengaktifkan pengguna lain';
  end if;

  if not public.admin_delete_role(v_created_role) then
    raise exception 'AUTH_SECURITY_TEST_FAILED: role biasa tidak dapat dihapus';
  end if;
end
$$;

reset role;

-- Exercise staged RLS inside this rollback-only transaction.
alter table public.santri enable row level security;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_edit from _auth_security_context),
    'email', (select lower(prefix) || '.edit@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_deleted integer;
begin
  select * into v_context from _auth_security_context limit 1;

  delete from public.santri s where s.id = v_context.santri_delete_denied;
  get diagnostics v_deleted = row_count;

  if v_deleted <> 0 then
    raise exception 'AUTH_SECURITY_TEST_FAILED: edit_induk dapat DELETE tanpa hapus_induk';
  end if;
end
$$;

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_super from _auth_security_context),
    'email', (select lower(prefix) || '.super@example.invalid' from _auth_security_context),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

do $$
declare
  v_context _auth_security_context%rowtype;
  v_deleted integer;
begin
  select * into v_context from _auth_security_context limit 1;

  delete from public.santri s where s.id = v_context.santri_delete_allowed;
  get diagnostics v_deleted = row_count;

  if v_deleted <> 1 then
    raise exception 'AUTH_SECURITY_TEST_FAILED: hapus_induk tidak dapat DELETE';
  end if;
end
$$;

reset role;

select
  'AUTHENTICATED_SECURITY_TEST_OK' as result,
  true as seluruh_fixture_dirollback,
  false as rls_tetap_nonaktif_setelah_rollback;

rollback;
