import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, ArrowLeft, Clock, Eye, Edit3, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mendefinisikan urutan dan ejaan label yang benar, termasuk huruf kapital untuk singkatan
const REVIEW_FIELDS = [
  { key: 'nama_lengkap', label: 'Nama Lengkap' },
  { key: 'nik', label: 'NIK' },
  { key: 'nisn', label: 'NISN' },
  { key: 'jenis_kelamin', label: 'Jenis Kelamin' },
  { key: 'tempat_lahir', label: 'Tempat Lahir' },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
  { key: 'no_hp_santri', label: 'No. HP Santri / WA' },
  
  { key: 'nis', label: 'NIS (Nomor Induk Santri)' },
  { key: 'tanggal_masuk', label: 'Waktu Pencatatan (Masuk)' },
  { key: 'tahun_masuk', label: 'Tahun Masuk' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'asrama', label: 'Asrama' },
  { key: 'status', label: 'Status' },
  { key: 'tahun_keluar', label: 'Tahun Keluar' },
  
  { key: 'alamat_jalan', label: 'Alamat (Jalan/RT/RW)' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'kabupaten_kota', label: 'Kabupaten/Kota' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'desa_kelurahan', label: 'Desa/Kelurahan' },
  { key: 'kode_pos', label: 'Kode Pos' },
  
  { key: 'nama_ayah', label: 'Nama Ayah' },
  { key: 'pekerjaan_ayah', label: 'Pekerjaan Ayah' },
  { key: 'nama_ibu', label: 'Nama Ibu' },
  { key: 'pekerjaan_ibu', label: 'Pekerjaan Ibu' },
  { key: 'nama_wali', label: 'Nama Wali' },
  { key: 'no_hp_wali', label: 'No. HP Wali / Ortu' },
  
  { key: 'catatan', label: 'Catatan Khusus' }
];

export default function AdminReview() {
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // State untuk menyimpan data yang sedang diedit oleh admin
  const [editData, setEditData] = useState<Record<string, any> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('pengajuan_santri')
      .select('*').eq('status_pengajuan', 'Menunggu').order('created_at', { ascending: false });
    setPengajuanList(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Saat item dipilih, siapkan datanya di panel edit
  const handleSelectItem = (p: any) => {
    setSelectedItem(p);
    // Mengambil data dari JSON pengajuan dan memastikan semua field tersedia untuk diedit
    const dataToEdit = { ...p.data_pengajuan };
    setEditData(dataToEdit);
  };

  const handleEditChange = (key: string, value: string) => {
    if (editData) {
      setEditData({ ...editData, [key]: value });
    }
  };

  const handleApprove = async () => {
    if (!selectedItem || !editData) return;
    if (!window.confirm('Yakin setujui data ini masuk ke Buku Induk?')) return;
    
    setIsSubmitting(true);
    try {
      // 1. Ambil data hasil editan admin
      const finalData = { ...editData };
      
      // 2. Cegah error: Hapus field bawaan pengajuan yang dilarang masuk ke tabel santri utama
      delete finalData.id;
      delete finalData.kode_unik;
      delete finalData.created_at;
      delete finalData.updated_at;

      // 3. Bersihkan string kosong menjadi null (PENTING untuk mencegah error duplicate pada NIS/NIK kosong)
      Object.keys(finalData).forEach(k => {
        if (typeof finalData[k] === 'string') {
          finalData[k] = finalData[k].trim();
          if (finalData[k] === '') {
            finalData[k] = null;
          }
        }
      });

      // 4. Eksekusi Insert / Update dengan penangkapan Error Supabase
      if (selectedItem.jenis_pengajuan === 'Baru') {
        const kodeBaru = 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).slice(-3);
        const payload = { ...finalData, kode_unik: kodeBaru, status_sinkronisasi: 'Belum Sinkron' };
        
        // PENTING: Periksa apakah ada error saat insert
        const { error } = await supabase.from('santri').insert([payload]);
        if (error) throw new Error(error.message); 
        
      } else {
        // PENTING: Periksa apakah ada error saat update
        const { error } = await supabase.from('santri').update(finalData).eq('id', selectedItem.santri_id);
        if (error) throw new Error(error.message);
      }
      
      // 5. Jika sukses masuk ke tabel santri, barulah ubah status pengajuannya
      const { error: errUpdateStatus } = await supabase.from('pengajuan_santri').update({ 
        status_pengajuan: 'Disetujui', 
        data_pengajuan: finalData 
      }).eq('id', selectedItem.id);
      
      if (errUpdateStatus) throw new Error(errUpdateStatus.message);

      alert('Alhamdulillah! Data Berhasil Disetujui dan Masuk ke Buku Induk Santri.');
      setSelectedItem(null);
      setEditData(null);
      fetchData();
    } catch (err: any) { 
      // Munculkan peringatan mengapa database menolak data ini
      alert('GAGAL MENYIMPAN KE BUKU INDUK!\n\nAlasan Server: ' + err.message + '\n\nSilakan perbaiki data yang bermasalah (misalnya ada NIS/NIK yang kembar dengan santri lain) lalu klik Setujui kembali.'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    const alasan = window.prompt('Alasan penolakan (kosongkan jika tidak ada):');
    if (alasan === null) return; // Jika user menekan 'Cancel' pada prompt
    
    setIsSubmitting(true);
    try {
      await supabase.from('pengajuan_santri').update({ 
        status_pengajuan: 'Ditolak', 
        catatan_admin: alasan 
      }).eq('id', selectedItem.id);
      
      alert('Data Ditolak!');
      setSelectedItem(null); 
      setEditData(null);
      fetchData();
    } catch (err: any) { 
      alert('Gagal Menolak: ' + err.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper untuk format value pada input datetime
  const getSafeDatetimeLocal = (val: string | undefined | null) => {
    if (!val) return '';
    if (val.length === 10) return `${val}T00:00`; 
    if (val.includes('T')) return val.substring(0, 16); 
    return val;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 bg-white shadow-xl rounded-2xl min-h-screen">
      <div className="flex items-center gap-4 border-b pb-4 mb-6">
        <Link to="/" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><ArrowLeft className="w-5 h-5"/></Link>
        <h2 className="text-2xl font-bold text-gray-800">Review Pengajuan Data</h2>
      </div>

      {loading ? <p className="text-center text-gray-500 py-10 font-medium">Memuat antrean pengajuan...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daftar Tunggu (Kiri) */}
          <div className="lg:col-span-1 border-r pr-4 space-y-3 max-h-[80vh] overflow-y-auto">
            {pengajuanList.length === 0 && (
              <div className="text-center py-10 bg-emerald-50 rounded-xl border border-emerald-100">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-50"/>
                <p className="text-emerald-700 text-sm font-bold">Alhamdulillah, tidak ada antrean.<br/>Semua data sudah direview!</p>
              </div>
            )}
            {pengajuanList.map((p) => (
              <div 
                key={p.id} 
                onClick={() => handleSelectItem(p)} 
                className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedItem?.id === p.id ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-400' : 'bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.jenis_pengajuan === 'Baru' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.jenis_pengajuan}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-gray-800 text-sm">{p.data_pengajuan.nama_lengkap || '(Tanpa Nama)'}</h4>
                <p className="text-xs text-gray-500 mt-1">{p.data_pengajuan.alamat_jalan || p.data_pengajuan.desa_kelurahan || 'Alamat tidak diisi'}</p>
              </div>
            ))}
          </div>

          {/* Panel Detail & Edit (Kanan) */}
          <div className="lg:col-span-2">
            {!selectedItem || !editData ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-300 min-h-[400px]">
                <Eye className="w-16 h-16 mb-4 opacity-20"/> 
                <p className="font-semibold text-gray-500">Pilih daftar pengajuan di sebelah kiri untuk meninjau dan memvalidasi.</p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col h-full max-h-[80vh]">
                <div className="border-b pb-3 mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600"/> Edit & Validasi Data
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-amber-600 bg-amber-50 p-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4"/>
                    Pastikan kolom unik (NIS/NIK) tidak bentrok dengan data santri yang sudah ada!
                  </div>
                </div>
                
                {/* Scrollable Form Area */}
                <div className="overflow-y-auto flex-1 pr-2 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {REVIEW_FIELDS.map((field) => {
                      const val = editData[field.key] || '';
                      
                      return (
                        <div key={field.key} className="flex flex-col">
                          <label className="text-xs font-bold text-gray-700 mb-1">
                            {field.label}
                          </label>
                          {field.key === 'catatan' ? (
                            <textarea
                              value={val}
                              onChange={(e) => handleEditChange(field.key, e.target.value)}
                              rows={2}
                              className="border border-gray-300 p-2 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 transition-colors"
                            />
                          ) : field.key === 'jenis_kelamin' ? (
                            <select
                              value={val}
                              onChange={(e) => handleEditChange(field.key, e.target.value)}
                              className="border border-gray-300 p-2 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 transition-colors"
                            >
                              <option value="Laki-laki">Laki-laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          ) : field.key === 'status' ? (
                            <select
                              value={val}
                              onChange={(e) => handleEditChange(field.key, e.target.value)}
                              className="border border-gray-300 p-2 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 transition-colors"
                            >
                              <option value="Aktif">Aktif</option>
                              <option value="Alumni/Lulus">Alumni / Lulus</option>
                              <option value="Keluar">Keluar</option>
                            </select>
                          ) : (
                            <input
                              type={field.key === 'tanggal_masuk' ? 'datetime-local' : field.key.includes('tanggal') ? 'date' : 'text'}
                              value={field.key === 'tanggal_masuk' ? getSafeDatetimeLocal(val) : val}
                              onChange={(e) => handleEditChange(field.key, e.target.value)}
                              className="border border-gray-300 p-2 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 transition-colors"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons Pinned at Bottom */}
                <div className="flex gap-4 border-t pt-4 bg-white">
                  <button disabled={isSubmitting} onClick={handleApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-sm">
                    {isSubmitting ? <span className="animate-spin text-xl">↻</span> : <CheckCircle className="w-5 h-5"/>} 
                    {isSubmitting ? 'Menyimpan...' : 'Setujui & Simpan ke Induk'}
                  </button>
                  <button disabled={isSubmitting} onClick={handleReject} className="flex-1 bg-rose-100 hover:bg-rose-200 disabled:bg-gray-100 text-rose-700 disabled:text-gray-400 font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors">
                    <XCircle className="w-5 h-5"/> Tolak Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}