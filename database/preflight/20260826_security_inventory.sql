-- SANTRIVA SECURITY PREFLIGHT INVENTORY
-- Jalankan setiap bagian secara terpisah di Supabase SQL Editor.
-- Seluruh bagian hanya membaca metadata atau menghitung data.

-- 01. Tabel dan kolom public
select
  n.nspname as schema_name,
  c.relname as table_name,
  a.attnum as ordinal_position,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  a.attnotnull as is_not_null,
  pg_get_expr(ad.adbin, ad.adrelid) as column_default
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad
  on ad.adrelid = a.attrelid
 and ad.adnum = a.attnum
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and a.attnum > 0
  and not a.attisdropped
order by c.relname, a.attnum;

-- 02. Constraint public beserta definisi lengkap
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid, true) as constraint_definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.conname;

-- 03. Index public
select
  schemaname as schema_name,
  tablename as table_name,
  indexname as index_name,
  indexdef as index_definition
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 04. Status RLS tabel public
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

-- 05. Policy public
select
  schemaname as schema_name,
  tablename as table_name,
  policyname as policy_name,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 06A. Hak schema public dan private
select
  n.nspname as schema_name,
  case
    when acl.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(acl.grantee)
  end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_namespace n
cross join lateral aclexplode(
  coalesce(n.nspacl, acldefault('n', n.nspowner))
) acl
where n.nspname in ('public', 'private')
order by n.nspname, grantee, acl.privilege_type;

-- 06B. Hak tabel dan sequence public
select
  n.nspname as schema_name,
  c.relname as object_name,
  case
    when c.relkind = 'S' then 'sequence'
    else 'table'
  end as object_type,
  case
    when acl.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(acl.grantee)
  end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(
  coalesce(
    c.relacl,
    acldefault(
      case when c.relkind = 'S' then 'S'::"char" else 'r'::"char" end,
      c.relowner
    )
  )
) acl
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'S')
  and (
    acl.grantee = 0
    or pg_get_userbyid(acl.grantee) in ('anon', 'authenticated', 'service_role')
  )
order by c.relname, grantee, acl.privilege_type;

-- 07A. Function non-sistem dan konfigurasi keamanannya
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_function_result(p.oid) as return_type,
  pg_get_userbyid(p.proowner) as owner_name,
  case when p.prosecdef then 'definer' else 'invoker' end as security_mode,
  p.provolatile as volatility,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
order by n.nspname, p.proname, identity_arguments;

-- 07B. Hak menjalankan function non-sistem
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  case
    when acl.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(acl.grantee)
  end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(
  coalesce(p.proacl, acldefault('f', p.proowner))
) acl
where n.nspname not in ('pg_catalog', 'information_schema')
  and (
    acl.grantee = 0
    or pg_get_userbyid(acl.grantee) in ('anon', 'authenticated', 'service_role')
  )
order by n.nspname, p.proname, identity_arguments, grantee;

-- 08. Default privileges
select
  pg_get_userbyid(d.defaclrole) as owner_name,
  coalesce(n.nspname, '(all schemas)') as schema_name,
  d.defaclobjtype as object_type,
  case
    when acl.grantee = 0 then 'PUBLIC'
    else pg_get_userbyid(acl.grantee)
  end as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_default_acl d
left join pg_namespace n on n.oid = d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) acl
order by owner_name, schema_name, object_type, grantee, acl.privilege_type;

-- 09. Role aplikasi dan permission aktual
select
  id,
  nama_role,
  permissions,
  created_at
from public.master_role
order by nama_role;

-- 10. Jumlah Super Admin aktif
select
  count(*) as active_super_admin_count
from public.pengguna p
join public.master_role r on r.id = p.role_id
where lower(r.nama_role) = lower('Super Admin')
  and p.status_akun = 'Aktif';

-- 11. Trigger non-sistem
select
  event_object_schema as table_schema,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema not in ('pg_catalog', 'information_schema')
order by event_object_schema, event_object_table, trigger_name, event_manipulation;

-- 12. Jumlah baris tabel public
select 'log_pelanggaran' as table_name, count(*) as row_count from public.log_pelanggaran
union all select 'manage_users', count(*) from public.manage_users
union all select 'master_jenis', count(*) from public.master_jenis
union all select 'master_role', count(*) from public.master_role
union all select 'pengajuan_santri', count(*) from public.pengajuan_santri
union all select 'pengguna', count(*) from public.pengguna
union all select 'santri', count(*) from public.santri
union all select 'santri_catatan', count(*) from public.santri_catatan
union all select 'santri_prestasi', count(*) from public.santri_prestasi
order by table_name;
