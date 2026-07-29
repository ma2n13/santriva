import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Santri } from '../types';
import { Trash2, Edit, Search, Users, ShieldAlert, CheckCircle } from 'lucide-react';

export default function SantriList() {
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State untuk Modal Edit
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);

  // Ambil Data dari Supabase
  const fetchSantri = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      setSantriList(data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal memuat data santri: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSantri();
  }, []);

  // Hapus Data Santri
  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data santri "${nama}"?`)) return;

    try {
      const { error } = await supabase.from('santri').delete().eq('id', id);
      if (error) throw error;

      setMessage({ type: 'success', text: `Data santri "${nama}" berhasil dihapus.` });
      setSantriList(santriList.filter((s) => s.id !== id));
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal menghapus data: ' + err.message });
    }
  };

  // Simpan Perubahan Edit
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSantri) return;

    try {
      const { error } = await supabase
        .from('santri')
        .update({
          nama_lengkap: editingSantri.nama_lengkap,
          nis: editingSantri.nis,
          kelas: editingSantri.kelas,
          asrama: editingSantri.asrama,
          no_hp_wali: editingSantri.no_hp_wali,
          status: editingSantri.status,
        })
        .eq('id', editingSantri.id);

      if (error) throw error;

      setMessage({ type: 'success', text: `Data santri "${editingSantri.nama_lengkap}" berhasil diperbarui!` });
      setEditingSantri(null);
      fetchSantri();
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Gagal memperbarui data: ' + err.message });
    }
  };

  // Filter Pencarian
  const filteredSantri = santriList.filter(
    (s) =>
      s.nama_lengkap?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.kelas?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-white shadow-xl rounded-2xl border border-gray-100 my-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            Database & Buku Induk Santri
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Total terdaftar: <span className="font-bold text-emerald-600">{santriList.length}</span> Santri / Siswa
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Cari nama, NIS, atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full sm:w-72"
          />
        </div>
      </div>

      {/* Pesan Notifikasi */}
      {message && (
        <div
          className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabel Data Santri */}
      <div className="mt-6 overflow-x-auto border border-gray-200 rounded-xl">
        {loading ? (
          <div className="text-center py-12 text-gray-500 font-medium">Memuat data dari database...</div>
        ) : filteredSantri.length === 0 ? (
          <div className="text-center py-12 text-gray-500 font-medium">Belum ada data santri yang ditemukan.</div>
        ) : (
          <table className="w-full text-xs sm:text-sm text-left text-gray-600">
            <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">No</th>
                <th className="p-3.5">Nama Lengkap</th>
                <th className="p-3.5">NIS</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Asrama</th>
                <th className="p-3.5">No. HP Wali</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSantri.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3.5 font-semibold text-gray-500">{i + 1}</td>
                  <td className="p-3.5 font-bold text-gray-900">{s.nama_lengkap}</td>
                  <td className="p-3.5">{s.nis || '-'}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md font-semibold text-xs">
                      {s.kelas || '-'}
                    </span>
                  </td>
                  <td className="p-3.5">{s.asrama || '-'}</td>
                  <td className="p-3.5">{s.no_hp_wali || '-'}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        s.status === 'Aktif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => setEditingSantri(s)}
                      className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition-all"
                      title="Edit Data"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.nama_lengkap)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                      title="Hapus Data"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL / FORM POPUP EDIT */}
      {editingSantri && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-lg w-full p-6 rounded-2xl shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 border-b pb-3">
              <Edit className="w-5 h-5 text-emerald-600" />
              Edit Data Santri
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingSantri.nama_lengkap || ''}
                  onChange={(e) => setEditingSantri({ ...editingSantri, nama_lengkap: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">NIS</label>
                  <input
                    type="text"
                    value={editingSantri.nis || ''}
                    onChange={(e) => setEditingSantri({ ...editingSantri, nis: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={editingSantri.kelas || ''}
                    onChange={(e) => setEditingSantri({ ...editingSantri, kelas: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Asrama</label>
                  <input
                    type="text"
                    value={editingSantri.asrama || ''}
                    onChange={(e) => setEditingSantri({ ...editingSantri, asrama: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={editingSantri.status || 'Aktif'}
                    onChange={(e) => setEditingSantri({ ...editingSantri, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Alumni/Lulus">Alumni / Lulus</option>
                    <option value="Pindah">Pindah</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">No. HP Wali</label>
                <input
                  type="text"
                  value={editingSantri.no_hp_wali || ''}
                  onChange={(e) => setEditingSantri({ ...editingSantri, no_hp_wali: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingSantri(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}