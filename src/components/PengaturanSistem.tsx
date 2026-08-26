import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Users, Plus, Edit3, Trash2, Save, X, CheckSquare, Square, XCircle } from 'lucide-react';

const PERMISSIONS_LIST = [
  { id: 'akses_induk', label: 'Melihat Buku Induk Santri' },
  { id: 'edit_induk', label: 'Menambah & Mengubah Data Santri' },
  { id: 'validasi_pengajuan', label: 'Menyetujui/Menolak Usulan Wali' },
  { id: 'akses_takziran', label: 'Melihat Riwayat Takziran & Absen' },
  { id: 'input_takziran', label: 'Menginput Pelanggaran/Absen' },
  { id: 'akses_keuangan', label: 'Melihat Modul Keuangan' },
  { id: 'kelola_pengguna', label: 'Mengelola Pengguna & Hak Akses' },
];

export default function PengaturanSistem() {
  const [activeTab, setActiveTab] = useState<'role' | 'pengguna'>('role');
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // State Form Role
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [namaRole, setNamaRole] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  const fetchRoles = async () => {
    const { data } = await supabase.from('master_role').select('*').order('nama_role');
    setRoles(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('pengguna').select('*, master_role(nama_role)').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  // =================== MANAJEMEN ROLE ===================
  const handleTogglePerm = (permId: string) => setSelectedPerms(prev => prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]);

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaRole.trim()) return;
    setIsSaving(true);
    try {
      if (editId) await supabase.from('master_role').update({ nama_role: namaRole, permissions: selectedPerms }).eq('id', editId);
      else await supabase.from('master_role').insert([{ nama_role: namaRole, permissions: selectedPerms }]);
      setIsFormOpen(false);
      fetchRoles();
    } catch (err: any) { alert(err.message); } 
    finally { setIsSaving(false); }
  };

  const handleDeleteRole = async (id: string, nama: string) => {
    if(nama === 'Super Admin') return alert('Super Admin tidak boleh dihapus!');
    if(confirm(`Hapus role ${nama}?`)) {
      await supabase.from('master_role').delete().eq('id', id);
      fetchRoles(); fetchUsers();
    }
  };

  const openForm = (role?: any) => {
    if (role) { setEditId(role.id); setNamaRole(role.nama_role); setSelectedPerms(role.permissions || []); } 
    else { setEditId(''); setNamaRole(''); setSelectedPerms([]); }
    setIsFormOpen(true);
  };

  // =================== MANAJEMEN PENGGUNA (APPROVAL) ===================
  const handleChangeUserRole = async (userId: string, newRoleId: string) => {
    const roleVal = newRoleId === '' ? null : newRoleId;
    const statusVal = newRoleId === '' ? 'Menunggu' : 'Aktif';
    await supabase.from('pengguna').update({ role_id: roleVal, status_akun: statusVal }).eq('id', userId);
    fetchUsers();
  };

  const handleRejectUser = async (userId: string) => {
    if (confirm('Yakin ingin menolak dan mencabut akses pengguna ini?')) {
      await supabase.from('pengguna').update({ role_id: null, status_akun: 'Ditolak' }).eq('id', userId);
      fetchUsers();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-[2rem] p-1.5 flex shadow-sm border border-emerald-50 w-full sm:w-max">
        <button onClick={() => setActiveTab('role')} className={`flex-1 sm:px-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'role' ? 'bg-emerald-800 text-white shadow-md' : 'text-gray-500 hover:bg-emerald-50'}`}><ShieldAlert className="w-4 h-4" /> Master Role</button>
        <button onClick={() => setActiveTab('pengguna')} className={`flex-1 sm:px-8 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'pengguna' ? 'bg-emerald-800 text-white shadow-md' : 'text-gray-500 hover:bg-emerald-50'}`}><Users className="w-4 h-4" /> Validasi Akun Pengguna</button>
      </div>

      {activeTab === 'role' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-emerald-950">Master Hak Akses (Role)</h2>
            {!isFormOpen && <button onClick={() => openForm()} className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm"><Plus className="w-4 h-4"/> Buat Role Baru</button>}
          </div>

          {isFormOpen ? (
            <form onSubmit={handleSaveRole} className="bg-[#FDFBF7] p-6 rounded-2xl border border-amber-200 mb-8 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-emerald-900">{editId ? 'Edit Role' : 'Tambah Role Baru'}</h3>
                <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5"/></button>
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold text-emerald-800 uppercase mb-2">Nama Role</label>
                <input required type="text" value={namaRole} onChange={e => setNamaRole(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold" placeholder="Cth: Bendahara, Pengurus Takziran..." />
              </div>
              <label className="block text-xs font-bold text-emerald-800 uppercase mb-3">Tentukan Hak Akses (Centang yang diizinkan)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {PERMISSIONS_LIST.map(p => {
                  const isChecked = selectedPerms.includes(p.id);
                  return (
                    <div key={p.id} onClick={() => handleTogglePerm(p.id)} className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-colors ${isChecked ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200'}`}>
                      {isChecked ? <CheckSquare className="w-5 h-5 text-emerald-600"/> : <Square className="w-5 h-5"/>}
                      <span className="text-sm font-bold">{p.label}</span>
                    </div>
                  );
                })}
              </div>
              <button disabled={isSaving} type="submit" className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><Save className="w-4 h-4"/> {isSaving ? 'Menyimpan...' : 'Simpan Role'}</button>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map(r => (
                <div key={r.id} className="border border-gray-100 bg-gray-50 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-lg text-emerald-950">{r.nama_role}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {r.permissions?.length > 0 ? r.permissions.map((p:string) => (
                        <span key={p} className="bg-white border border-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-md">{PERMISSIONS_LIST.find(x => x.id === p)?.label || p}</span>
                      )) : <span className="text-xs text-gray-400 italic">Tidak memiliki hak akses apa pun.</span>}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200">
                    <button onClick={() => openForm(r)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                    {r.nama_role !== 'Super Admin' && <button onClick={() => handleDeleteRole(r.id, r.nama_role)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pengguna' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-emerald-950">Validasi Pendaftaran Akun</h2>
            <p className="text-xs text-gray-500 mt-1">Setujui role yang diusulkan oleh pendaftar, atau ubah sesuai kebijakan.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50 text-emerald-900 text-xs uppercase font-bold border-b-2 border-emerald-100">
                <tr>
                  <th className="px-4 py-4 rounded-tl-xl">Informasi Pengguna</th>
                  <th className="px-4 py-4">Usulan Posisi (Role)</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 rounded-tr-xl w-72">Tindakan / Setujui Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{u.nama_lengkap}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-4 font-bold text-amber-700">{u.usulan_role || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      {u.status_akun === 'Aktif' ? <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Aktif</span> :
                       u.status_akun === 'Ditolak' ? <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Ditolak</span> :
                       <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Menunggu</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <select 
                          value={u.role_id || ''} 
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className={`flex-1 p-2 rounded-xl border outline-none font-bold text-xs ${u.role_id ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-white border-amber-300 text-amber-900 shadow-[0_0_10px_rgba(245,158,11,0.2)]'}`}
                        >
                          <option value="">-- Tetapkan Role --</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.nama_role}</option>)}
                        </select>
                        <button onClick={() => handleRejectUser(u.id)} title="Tolak / Hapus Akses" className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-colors border border-red-200">
                          <XCircle className="w-5 h-5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}