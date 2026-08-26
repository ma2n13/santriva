import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Santri } from '../types';
import { CheckCircle, AlertCircle, Send, UserPlus, RefreshCw, Search } from 'lucide-react';

const API_WILAYAH = 'https://www.emsifa.com/api-wilayah-indonesia/api';

const getCurrentDateTimeLocal = () => {
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const initialFormState: Partial<Santri> & { catatan?: string } = {
  nama_lengkap: '', nis: '', nisn: '', nik: '', jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', no_hp_santri: '',
  kelas: '', asrama: '', status: 'Aktif', tanggal_masuk: getCurrentDateTimeLocal(), tahun_masuk: '', tahun_keluar: '', 
  alamat_jalan: '', desa_kelurahan: '', kecamatan: '', kabupaten_kota: '', provinsi: '', kode_pos: '', nama_ayah: '',
  pekerjaan_ayah: '', nama_ibu: '', pekerjaan_ibu: '', nama_wali: '', no_hp_wali: '', catatan: ''
};

export default function PublicPendaftaran() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit'); 

  const [jenisPengajuan, setJenisPengajuan] = useState<'Baru' | 'Update'>(editId ? 'Update' : 'Baru');
  const [formData, setFormData] = useState<Partial<Santri> & { catatan?: string }>(initialFormState);
  const [selectedSantriId, setSelectedSantriId] = useState<string | null>(editId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<any[]>([]);
  const [regencies, setRegencies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  
  const [provId, setProvId] = useState(''); 
  const [regId, setRegId] = useState('');
  const [distId, setDistId] = useState(''); 
  const [villId, setVillId] = useState('');

  useEffect(() => {
    if (editId) {
      supabase.from('santri').select('*').eq('id', editId).single().then(({data}) => {
        if(data) setFormData(data);
      });
    }
  }, [editId]);

  // DIPERBAIKI: Batas pencarian dinaikkan menjadi 50 agar menampilkan lebih banyak hasil yang cocok
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from('santri')
        .select('id, nama_lengkap, nis, desa_kelurahan, alamat_jalan')
        .ilike('nama_lengkap', `%${searchQuery}%`).limit(50);
      setSearchResults(data || []); setIsSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => { fetch(`${API_WILAYAH}/provinces.json`).then(res => res.json()).then(data => setProvinces(data)); }, []);
  useEffect(() => { if (provId) fetch(`${API_WILAYAH}/regencies/${provId}.json`).then(res => res.json()).then(data => setRegencies(data)); else setRegencies([]); }, [provId]);
  useEffect(() => { if (regId) fetch(`${API_WILAYAH}/districts/${regId}.json`).then(res => res.json()).then(data => setDistricts(data)); else setDistricts([]); }, [regId]);
  useEffect(() => { if (distId) fetch(`${API_WILAYAH}/villages/${distId}.json`).then(res => res.json()).then(data => setVillages(data)); else setVillages([]); }, [distId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSelectSantri = async (id: string) => {
    const { data } = await supabase.from('santri').select('*').eq('id', id).single();
    if(data) { setFormData(data); setSelectedSantriId(id); setSearchQuery(''); setSearchResults([]); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jenisPengajuan === 'Update' && !selectedSantriId) { setErrorMsg("Pilih nama santri terlebih dahulu untuk di-update."); return; }
    setIsSubmitting(true); setErrorMsg(null);
    try {
      const cleanData = { ...formData };
      Object.keys(cleanData).forEach(key => { if (typeof (cleanData as any)[key] === 'string' && (cleanData as any)[key].trim() === '') (cleanData as any)[key] = null; });
      const payload = { jenis_pengajuan: jenisPengajuan, data_pengajuan: cleanData, santri_id: selectedSantriId || null };
      const { error } = await supabase.from('pengajuan_santri').insert([payload]);
      if (error) throw error;
      setIsSuccess(true); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) { setErrorMsg(err.message); } finally { setIsSubmitting(false); }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Alhamdulillah!</h2>
          <p className="text-gray-600 mb-6">Data Anda berhasil dikirim dan sedang ditinjau oleh Admin. Setelah disetujui, data akan masuk ke Sistem Induk.</p>
          <button onClick={() => window.location.reload()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl">Tutup</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-emerald-700 p-8 text-center text-white"><h1 className="text-3xl font-bold">Formulir Data Santri</h1></div>

        {!editId && (
          <div className="flex border-b">
            <button onClick={() => {setJenisPengajuan('Baru'); setSelectedSantriId(null); setFormData(initialFormState);}} className={`flex-1 py-4 font-bold transition-colors ${jenisPengajuan === 'Baru' ? 'bg-emerald-50 text-emerald-700 border-b-4 border-emerald-600' : 'text-gray-500 hover:bg-gray-50'}`}><UserPlus className="w-5 h-5 inline mr-2"/> Pendaftar Baru</button>
            <button onClick={() => {setJenisPengajuan('Update'); setSelectedSantriId(null); setFormData(initialFormState);}} className={`flex-1 py-4 font-bold transition-colors ${jenisPengajuan === 'Update' ? 'bg-blue-50 text-blue-700 border-b-4 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}><RefreshCw className="w-5 h-5 inline mr-2"/> Edit Data Santri</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-10">
          {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-700 flex items-center gap-3 rounded"><AlertCircle className="w-6 h-6"/> <p className="font-semibold">{errorMsg}</p></div>}

          {jenisPengajuan === 'Update' && !selectedSantriId && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl">
              <label className="block text-blue-900 font-bold mb-2">Cari Nama Santri yang ingin diedit:</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-blue-400 w-5 h-5"/>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ketik nama santri..." className="w-full pl-10 pr-4 py-3 rounded-xl border-blue-300 focus:ring-2 focus:ring-blue-500 font-semibold" />
              </div>
              {isSearching && <p className="text-sm mt-2 text-blue-600">Mencari...</p>}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-white rounded-xl shadow-lg border max-h-60 overflow-y-auto">
                  {searchResults.map(s => (
                    <div key={s.id} onClick={() => handleSelectSantri(s.id)} className="p-3 border-b hover:bg-blue-50 cursor-pointer">
                      <div className="font-bold text-gray-800">{s.nama_lengkap}</div>
                      <div className="text-xs text-gray-500">NIS: {s.nis || '-'} | Alamat: {s.alamat_jalan || s.desa_kelurahan || '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(jenisPengajuan === 'Baru' || (jenisPengajuan === 'Update' && selectedSantriId)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              
              <div className="md:col-span-2 pb-2 border-b text-emerald-700 font-extrabold text-lg mt-4">1. Identitas Diri</div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Nama Lengkap Sesuai Ijazah/KK *</label><input required type="text" name="nama_lengkap" value={formData.nama_lengkap || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg focus:ring-2 bg-gray-50" /></div>
              <div><label className="block text-sm font-semibold mb-1">NIK</label><input type="text" name="nik" value={formData.nik || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">NISN</label><input type="text" name="nisn" value={formData.nisn || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">Jenis Kelamin</label><select name="jenis_kelamin" value={formData.jenis_kelamin || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg"><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></div>
              <div><label className="block text-sm font-semibold mb-1">Tempat Lahir</label><input type="text" name="tempat_lahir" value={formData.tempat_lahir || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">Tanggal Lahir</label><input type="date" name="tanggal_lahir" value={formData.tanggal_lahir || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">No. HP / WhatsApp Santri</label><input type="text" name="no_hp_santri" value={formData.no_hp_santri || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>

              <div className="md:col-span-2 pb-2 border-b text-emerald-700 font-extrabold text-lg mt-6 flex items-center">
                2. Administrasi & Pondok 
                {jenisPengajuan === 'Baru' && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded ml-3 border border-amber-200">🔒</span>}
              </div>
              <div><label className="block text-sm font-semibold mb-1">NIS (Bila Ada)</label><input disabled={jenisPengajuan === 'Baru'} type="text" name="nis" value={formData.nis || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed" /></div>
              <div><label className="block text-sm font-semibold mb-1">Tahun Masuk</label><input disabled={jenisPengajuan === 'Baru'} type="text" name="tahun_masuk" value={formData.tahun_masuk || ''} onChange={handleChange} placeholder="Contoh: 2024" className="w-full border-gray-300 border p-2.5 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed" /></div>
              <div><label className="block text-sm font-semibold mb-1">Kelas</label><input disabled={jenisPengajuan === 'Baru'} type="text" name="kelas" value={formData.kelas || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed" /></div>
              <div><label className="block text-sm font-semibold mb-1">Asrama</label><input disabled={jenisPengajuan === 'Baru'} type="text" name="asrama" value={formData.asrama || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed" /></div>
              <div><label className="block text-sm font-semibold mb-1">Status</label><select disabled={jenisPengajuan === 'Baru'} name="status" value={formData.status || 'Aktif'} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"><option value="Aktif">Aktif</option><option value="Alumni/Lulus">Alumni / Lulus</option><option value="Keluar">Keluar</option></select></div>
              <div><label className="block text-sm font-semibold mb-1">Tahun Keluar</label><input disabled={jenisPengajuan === 'Baru'} type="text" name="tahun_keluar" value={formData.tahun_keluar || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed" /></div>

              <div className="md:col-span-2 pb-2 border-b text-emerald-700 font-extrabold text-lg mt-6">3. Alamat Lengkap</div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Jalan / Dusun / RT / RW (Ketik Manual) *</label><input required type="text" name="alamat_jalan" value={formData.alamat_jalan || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Provinsi</label>
                <select value={provId} onChange={(e) => { const id = e.target.value; setProvId(id); setFormData({...formData, provinsi: id ? e.target.options[e.target.selectedIndex].text : '', kabupaten_kota: '', kecamatan: '', desa_kelurahan: ''}); }} className="w-full border p-2.5 rounded-lg bg-white">
                  <option value="">-- Pilih Provinsi --</option>
                  {provinces.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Kabupaten / Kota</label>
                <select value={regId} disabled={!provId} onChange={(e) => { const id = e.target.value; setRegId(id); setFormData({...formData, kabupaten_kota: id ? e.target.options[e.target.selectedIndex].text : '', kecamatan: '', desa_kelurahan: ''}); }} className="w-full border p-2.5 rounded-lg bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
                  <option value="">-- Pilih Kabupaten --</option>
                  {regencies.map((r:any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Kecamatan</label>
                <select value={distId} disabled={!regId} onChange={(e) => { const id = e.target.value; setDistId(id); setFormData({...formData, kecamatan: id ? e.target.options[e.target.selectedIndex].text : '', desa_kelurahan: ''}); }} className="w-full border p-2.5 rounded-lg bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
                  <option value="">-- Pilih Kecamatan --</option>
                  {districts.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Desa / Kelurahan</label>
                <select value={villId} disabled={!distId} onChange={(e) => { const id = e.target.value; setVillId(id); setFormData({...formData, desa_kelurahan: id ? e.target.options[e.target.selectedIndex].text : ''}); }} className="w-full border p-2.5 rounded-lg bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
                  <option value="">-- Pilih Desa --</option>
                  {villages.map((v:any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Kode Pos</label><input type="text" name="kode_pos" value={formData.kode_pos || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>

              <div className="md:col-span-2 pb-2 border-b text-emerald-700 font-extrabold text-lg mt-6">4. Data Orang Tua / Wali</div>
              <div><label className="block text-sm font-semibold mb-1">Nama Ayah</label><input type="text" name="nama_ayah" value={formData.nama_ayah || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">Pekerjaan Ayah</label><input type="text" name="pekerjaan_ayah" value={formData.pekerjaan_ayah || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">Nama Ibu</label><input type="text" name="nama_ibu" value={formData.nama_ibu || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">Pekerjaan Ibu</label><input type="text" name="pekerjaan_ibu" value={formData.pekerjaan_ibu || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">Nama Wali (Opsional)</label><input type="text" name="nama_wali" value={formData.nama_wali || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>
              <div><label className="block text-sm font-semibold mb-1">No. WhatsApp Orang Tua / Wali</label><input type="text" name="no_hp_wali" value={formData.no_hp_wali || ''} onChange={handleChange} className="w-full border-gray-300 border p-2.5 rounded-lg" /></div>

              <div className="md:col-span-2 pb-2 border-b text-emerald-700 font-extrabold text-lg mt-6">5. Informasi Tambahan</div>
              <div className="md:col-span-2"><label className="block text-sm font-semibold mb-1">Catatan Khusus (Riwayat Medis, dll)</label><textarea name="catatan" value={formData.catatan || ''} onChange={handleChange} rows={3} className="w-full border-gray-300 border p-2.5 rounded-lg"></textarea></div>

              <div className="md:col-span-2 mt-10 pt-6 border-t flex justify-end">
                <button disabled={isSubmitting} type="submit" className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                  {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>} Kirim Data Pengajuan
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}