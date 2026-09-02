import { useCallback, useEffect, useState } from 'react';
import { Edit3, Plus, Save, ShieldAlert, Trash2, Users, X, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteRole, saveRole, updateUser } from '../lib/securityApi';
import type { AccountStatus, RolePermission } from '../types/security';

interface RoleRecord {
  id: string;
  nama_role: string;
  permissions: RolePermission[];
}

interface UserRecord {
  id: string;
  email: string;
  nama_lengkap: string;
  usulan_role: string | null;
  status_akun: AccountStatus;
  role_id: string | null;
  master_role?: { nama_role?: string } | null;
}

const permissionsList: Array<{ id: RolePermission; label: string }> = [
  { id: 'akses_induk', label: 'Melihat Buku Induk Santri' },
  { id: 'edit_induk', label: 'Menambah & Mengubah Data Santri' },
  { id: 'hapus_induk', label: 'Menghapus Data Santri' },
  { id: 'validasi_pengajuan', label: 'Menyetujui/Menolak Usulan Wali' },
  { id: 'akses_takziran', label: 'Melihat Riwayat Takziran & Absen' },
  { id: 'input_takziran', label: 'Menginput Pelanggaran/Absen' },
  { id: 'akses_keuangan', label: 'Melihat Modul Keuangan' },
  { id: 'kelola_pengguna', label: 'Mengelola Pengguna & Hak Akses' },
];

export default function PengaturanSistem() {
  const [activeTab, setActiveTab] = useState<'role' | 'pengguna'>('role');
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<RolePermission[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase.from('master_role').select('*').order('nama_role');
    if (error) throw error;
    setRoles((data || []) as RoleRecord[]);
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('pengguna').select('*, master_role(nama_role)').order('created_at', { ascending: false });
    if (error) throw error;
    setUsers((data || []) as UserRecord[]);
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(() => Promise.all([fetchRoles(), fetchUsers()]))
      .catch(() => setMessage({ type: 'error', text: 'Data pengaturan belum dapat dimuat.' }));
  }, [fetchRoles, fetchUsers]);

  function openForm(role?: RoleRecord) {
    setEditId(role?.id ?? null);
    setRoleName(role?.nama_role ?? '');
    setSelectedPermissions(role?.permissions ?? []);
    setFormOpen(true);
    setMessage(null);
  }

  function togglePermission(permission: RolePermission) {
    setSelectedPermissions((current) => current.includes(permission)
      ? current.filter((item) => item !== permission)
      : [...current, permission]);
  }

  async function handleSaveRole(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveRole(editId, roleName.trim(), selectedPermissions);
      await fetchRoles();
      setFormOpen(false);
      setMessage({ type: 'success', text: 'Role berhasil disimpan.' });
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : 'Role belum dapat disimpan.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(role: RoleRecord) {
    if (role.nama_role === 'Super Admin' || !window.confirm(`Hapus role ${role.nama_role}?`)) return;
    setMessage(null);
    try {
      await deleteRole(role.id);
      await Promise.all([fetchRoles(), fetchUsers()]);
      setMessage({ type: 'success', text: 'Role berhasil dihapus.' });
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : 'Role belum dapat dihapus.' });
    }
  }

  async function handleChangeUserRole(user: UserRecord, newRoleId: string) {
    const roleId = newRoleId || null;
    const status: AccountStatus = roleId ? 'Aktif' : 'Menunggu';
    setMessage(null);
    try {
      await updateUser(user.id, roleId, status);
      await fetchUsers();
      setMessage({ type: 'success', text: `Akses ${user.nama_lengkap} berhasil diperbarui.` });
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : 'Akun belum dapat diperbarui.' });
    }
  }

  async function handleRejectUser(user: UserRecord) {
    if (!window.confirm(`Tolak dan cabut akses ${user.nama_lengkap}?`)) return;
    setMessage(null);
    try {
      await updateUser(user.id, null, 'Ditolak');
      await fetchUsers();
      setMessage({ type: 'success', text: `Akses ${user.nama_lengkap} ditolak.` });
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : 'Akun belum dapat diperbarui.' });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-xl p-4 font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
      <div className="flex w-full rounded-[2rem] border border-emerald-50 bg-white p-1.5 shadow-sm sm:w-max">
        <button type="button" onClick={() => setActiveTab('role')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold ${activeTab === 'role' ? 'bg-emerald-800 text-white' : 'text-gray-500'}`}><ShieldAlert className="h-4 w-4" />Master Role</button>
        <button type="button" onClick={() => setActiveTab('pengguna')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-bold ${activeTab === 'pengguna' ? 'bg-emerald-800 text-white' : 'text-gray-500'}`}><Users className="h-4 w-4" />Validasi Akun Pengguna</button>
      </div>

      {activeTab === 'role' && <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between"><h1 className="text-xl font-bold text-emerald-950">Master Hak Akses</h1>{!formOpen && <button type="button" onClick={() => openForm()} className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-emerald-950"><Plus className="h-4 w-4" />Buat Role Baru</button>}</div>
        {formOpen ? <form onSubmit={handleSaveRole} className="mb-8 rounded-2xl border border-amber-200 bg-[#FDFBF7] p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-emerald-900">{editId ? 'Edit Role' : 'Tambah Role Baru'}</h2><button type="button" aria-label="Tutup formulir" onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></div>
          <label className="mb-5 block text-xs font-bold uppercase text-emerald-800">Nama Role<input required value={roleName} onChange={(event) => setRoleName(event.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3 text-sm" /></label>
          <fieldset><legend className="mb-3 text-xs font-bold uppercase text-emerald-800">Tentukan Hak Akses</legend><div className="grid gap-3 sm:grid-cols-2">{permissionsList.map((permission) => <label key={permission.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${selectedPermissions.includes(permission.id) ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-gray-100 text-gray-600'}`}><input type="checkbox" checked={selectedPermissions.includes(permission.id)} onChange={() => togglePermission(permission.id)} />{permission.label}</label>)}</div></fieldset>
          <button disabled={saving} type="submit" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 font-bold text-white"><Save className="h-4 w-4" />{saving ? 'Menyimpan…' : 'Simpan Role'}</button>
        </form> : <div className="grid gap-4 md:grid-cols-2">{roles.map((role) => <article key={role.id} className="flex flex-col justify-between rounded-2xl border bg-gray-50 p-5"><div><h2 className="text-lg font-black text-emerald-950">{role.nama_role}</h2><div className="mt-3 flex flex-wrap gap-1.5">{role.permissions.length > 0 ? role.permissions.map((permission) => <span key={permission} className="rounded-md border border-emerald-100 bg-white px-2 py-1 text-[10px] font-bold text-emerald-700">{permissionsList.find((item) => item.id === permission)?.label || permission}</span>) : <span className="text-xs italic text-gray-400">Tidak memiliki hak akses.</span>}</div></div><div className="mt-5 flex justify-end gap-2 border-t pt-4"><button type="button" aria-label={`Edit role ${role.nama_role}`} onClick={() => openForm(role)} className="rounded-lg bg-blue-50 p-2 text-blue-600"><Edit3 className="h-4 w-4" /></button>{role.nama_role !== 'Super Admin' && <button type="button" aria-label={`Hapus role ${role.nama_role}`} onClick={() => void handleDeleteRole(role)} className="rounded-lg bg-red-50 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>}</div></article>)}</div>}
      </section>}

      {activeTab === 'pengguna' && <section className="rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm sm:p-8"><h1 className="mb-6 text-xl font-bold text-emerald-950">Validasi Pendaftaran Akun</h1><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-emerald-50 text-xs uppercase text-emerald-900"><tr><th className="p-4">Pengguna</th><th className="p-4">Usulan</th><th className="p-4">Status</th><th className="p-4">Tindakan</th></tr></thead><tbody className="divide-y">{users.map((user) => <tr key={user.id}><td className="p-4"><strong>{user.nama_lengkap}</strong><span className="block text-xs text-gray-500">{user.email}</span></td><td className="p-4 font-bold text-amber-700">{user.usulan_role || '-'}</td><td className="p-4">{user.status_akun}</td><td className="p-4"><div className="flex gap-2"><select aria-label={`Role ${user.nama_lengkap}`} value={user.role_id || ''} onChange={(event) => void handleChangeUserRole(user, event.target.value)} className="flex-1 rounded-xl border p-2 text-xs font-bold"><option value="">-- Tetapkan Role --</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.nama_role}</option>)}</select><button type="button" aria-label={`Tolak akses ${user.nama_lengkap}`} onClick={() => void handleRejectUser(user)} className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600"><XCircle className="h-5 w-5" /></button></div></td></tr>)}</tbody></table></div></section>}
    </div>
  );
}
