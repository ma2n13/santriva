import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Santri } from '../types';
import { 
  Search, Users, Plus, X, Save, Edit3, 
  ChevronUp, ChevronDown, CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';

const initialFormState: Partial<Santri> = {
  nama_lengkap: '', nis: '', nisn: '', nik: '',
  jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', no_hp_santri: '',
  kelas: '', asrama: '', status: 'Aktif',
  tanggal_masuk: new Date().toISOString().split('T')[0],
  tahun_masuk: new Date().getFullYear().toString(), 
  tahun_keluar: '', alamat_jalan: '', desa_kelurahan: '', kecamatan: '',
  kabupaten_kota: '', provinsi: '', kode_pos: '', nama_ayah: '',
  pekerjaan_ayah: '', nama_ibu: '', pekerjaan_ibu: '', nama_wali: '', no_hp_wali: ''
};

// =========================================================================
// KOMPONEN FORM (Terpisah agar tidak re-render, kini ditambah API Wilayah)
// =========================================================================
const FormFields = ({ 
  dataTarget, 
  onChange, 
  onRegionChange 
}: { 
  dataTarget: Partial<Santri>, 
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void,
  onRegionChange: (updates: Partial<Santri>) => void
}) => {
  // State Data Wilayah (Dari API)
  const [provinces, setProvinces] = useState<any[]>([]);
  const [regencies, setRegencies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  // State ID Wilayah Terpilih (Untuk Fetching API)
  const [provId, setProvId] = useState('');
  const [regId, setRegId] = useState('');
  const [distId, setDistId] = useState('');
  const [villId, setVillId] = useState('');

  // 1. Ambil Data Provinsi saat form pertama kali dimuat
  useEffect(() => {
    fetch('https://wilayah.id/api/provinces.json')
      .then(res => res.json())
      .then(data => setProvinces(data.data || data))
      .catch(err => console.error("API Wilayah Error:", err));
  }, []);

  // 2. Sinkronkan ID Provinsi jika edit data (Reverse Lookup nama ke ID)
  useEffect(() => {
    if (dataTarget.provinsi && provinces.length > 0) {
      const p = provinces.find((x: any) => x.name.toUpperCase() === dataTarget.provinsi?.toUpperCase());
      if (p) setProvId(p.code || p.id);
    } else if (!dataTarget.provinsi) {
      setProvId('');
    }
  }, [dataTarget.provinsi, provinces]);

  // 3. Ambil Kabupaten berdasarkan Provinsi
  useEffect(() => {
    if (provId) {
      fetch(`https://wilayah.id/api/regencies/${provId}.json`)
        .then(res => res.json())
        .then(data => setRegencies(data.data || data));
    } else { setRegencies([]); }
  }, [provId]);

  // 4. Sinkronkan ID Kabupaten
  useEffect(() => {
    if (dataTarget.kabupaten_kota && regencies.length > 0) {
      const r = regencies.find((x: any) => x.name.toUpperCase() === dataTarget.kabupaten_kota?.toUpperCase());
      if (r) setRegId(r.code || r.id);
    } else if (!dataTarget.kabupaten_kota) {
      setRegId('');
    }
  }, [dataTarget.kabupaten_kota, regencies]);

  // 5. Ambil Kecamatan berdasarkan Kabupaten
  useEffect(() => {
    if (regId) {
      fetch(`https://wilayah.id/api/districts/${regId}.json`)
        .then(res => res.json())
        .then(data => setDistricts(data.data || data));
    } else { setDistricts([]); }
  }, [regId]);

  // 6. Sinkronkan ID Kecamatan
  useEffect(() => {
    if (dataTarget.kecamatan && districts.length > 0) {
      const d = districts.find((x: any) => x.name.toUpperCase() === dataTarget.kecamatan?.toUpperCase());
      if (d) setDistId(d.code || d.id);
    } else if (!dataTarget.kecamatan) {
      setDistId('');
    }
  }, [dataTarget.kecamatan, districts]);

  // 7. Ambil Desa berdasarkan Kecamatan
  useEffect(() => {
    if (distId) {
      fetch(`https://wilayah.id/api/villages/${distId}.json`)
        .then(res => res.json())
        .then(data => setVillages(data.data || data));
    } else { setVillages([]); }
  }, [distId]);

  // 8. Sinkronkan ID Desa
  useEffect(() => {
    if (dataTarget.desa_kelurahan && villages.length > 0) {
      const v = villages.find((x: any) => x.name.toUpperCase() === dataTarget.desa_kelurahan?.toUpperCase());
      if (v) setVillId(v.code || v.id);
    } else if (!dataTarget.desa_kelurahan) {
      setVillId('');
    }
  }, [dataTarget.desa_kelurahan, villages]);

  // --- Handlers Wilayah (Update Database dengan NAMA, Update State dengan ID) ---
  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setProvId(id);
    onRegionChange({ provinsi: id ? name : '', kabupaten_kota: '', kecamatan: '', desa_kelurahan: '' });
  };

  const handleRegChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setRegId(id);
    onRegionChange({ kabupaten_kota: id ? name : '', kecamatan: '', desa_kelurahan: '' });
  };

  const handleDistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setDistId(id);
    onRegionChange({ kecamatan: id ? name : '', desa_kelurahan: '' });
  };

  const handleVillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setVillId(id);
    onRegionChange({ desa_kelurahan: id ? name : '' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Identitas & Pondok</div>
      <div><label className="block text-xs text-gray-500">Nama Lengkap*</label><input required type="text" name="nama_lengkap" value={dataTarget.nama_lengkap || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">NIS (Induk Santri/Sekolah)</label><input type="text" name="nis" value={dataTarget.nis || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">NISN</label><input type="text" name="nisn" value={dataTarget.nisn || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">NIK</label><input type="text" name="nik" value={dataTarget.nik || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Jenis Kelamin</label>
        <select name="jenis_kelamin" value={dataTarget.jenis_kelamin || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1">
          <option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option>
        </select>
      </div>
      <div><label className="block text-xs text-gray-500">Tempat Lahir</label><input type="text" name="tempat_lahir" value={dataTarget.tempat_lahir || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Tanggal Lahir</label><input type="date" name="tanggal_lahir" value={dataTarget.tanggal_lahir || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">No. HP Santri</label><input type="text" name="no_hp_santri" value={dataTarget.no_hp_santri || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      
      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Administrasi Akademik</div>
      <div><label className="block text-xs text-emerald-600 font-bold">Tanggal Pencatatan</label><input type="date" name="tanggal_masuk" value={dataTarget.tanggal_masuk || ''} onChange={onChange} className="w-full border border-emerald-300 bg-emerald-50 p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-emerald-600 font-bold">Tahun Masuk (Otomatis)</label><input type="text" name="tahun_masuk" value={dataTarget.tahun_masuk || ''} onChange={onChange} className="w-full border border-emerald-300 bg-emerald-50 p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Kelas</label><input type="text" name="kelas" value={dataTarget.kelas || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Asrama</label><input type="text" name="asrama" value={dataTarget.asrama || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Status</label>
        <select name="status" value={dataTarget.status || 'Aktif'} onChange={onChange} className="w-full border p-2 rounded focus:ring-1">
          <option value="Aktif">Aktif</option><option value="Alumni/Lulus">Alumni / Lulus</option><option value="Keluar">Keluar</option>
        </select>
      </div>
      <div><label className="block text-xs text-gray-500">Tahun Keluar</label><input type="text" name="tahun_keluar" value={dataTarget.tahun_keluar || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>

      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Alamat Lengkap (Terintegrasi API Wilayah)</div>
      
      {/* CASCADING DROPDOWNS API WILAYAH */}
      <div>
        <label className="block text-xs text-gray-500">Provinsi</label>
        <select value={provId} onChange={handleProvChange} className="w-full border p-2 rounded focus:ring-1 bg-white">
          <option value="">-- Pilih Provinsi --</option>
          {provinces.map((p:any) => <option key={p.code || p.id} value={p.code || p.id}>{p.name}</option>)}
        </select>
      </div>
      
      <div>
        <label className="block text-xs text-gray-500">Kabupaten / Kota</label>
        <select value={regId} onChange={handleRegChange} disabled={!provId} className="w-full border p-2 rounded focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 bg-white">
          <option value="">-- Pilih Kabupaten --</option>
          {regencies.map((r:any) => <option key={r.code || r.id} value={r.code || r.id}>{r.name}</option>)}
        </select>
      </div>
      
      <div>
        <label className="block text-xs text-gray-500">Kecamatan</label>
        <select value={distId} onChange={handleDistChange} disabled={!regId} className="w-full border p-2 rounded focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 bg-white">
          <option value="">-- Pilih Kecamatan --</option>
          {districts.map((d:any) => <option key={d.code || d.id} value={d.code || d.id}>{d.name}</option>)}
        </select>
      </div>
      
      <div>
        <label className="block text-xs text-gray-500">Desa / Kelurahan</label>
        <select value={villId} onChange={handleVillChange} disabled={!distId} className="w-full border p-2 rounded focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 bg-white">
          <option value="">-- Pilih Desa --</option>
          {villages.map((v:any) => <option key={v.code || v.id} value={v.code || v.id}>{v.name}</option>)}
        </select>
      </div>

      <div><label className="block text-xs text-gray-500">Kode Pos</label><input type="text" name="kode_pos" value={dataTarget.kode_pos || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      
      <div className="md:col-span-3">
        <label className="block text-xs text-gray-500">Jalan / Dusun / RT / RW (Ketik Manual)</label>
        <input type="text" name="alamat_jalan" value={dataTarget.alamat_jalan || ''} onChange={onChange} placeholder="Cth: Jl. Raya Pondok No 1, RT 01 RW 02, Dusun Krajan" className="w-full border p-2 rounded focus:ring-1" />
      </div>

      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Orang Tua / Wali</div>
      <div><label className="block text-xs text-gray-500">Nama Ayah</label><input type="text" name="nama_ayah" value={dataTarget.nama_ayah || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Pekerjaan Ayah</label><input type="text" name="pekerjaan_ayah" value={dataTarget.pekerjaan_ayah || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Nama Ibu</label><input type="text" name="nama_ibu" value={dataTarget.nama_ibu || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Pekerjaan Ibu</label><input type="text" name="pekerjaan_ibu" value={dataTarget.pekerjaan_ibu || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Nama Wali</label><input type="text" name="nama_wali" value={dataTarget.nama_wali || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500 font-bold">No. HP Wali (WA Utama)</label><input type="text" name="no_hp_wali" value={dataTarget.no_hp_wali || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
    </div>
  );
};


// =========================================================================
// HALAMAN UTAMA
// =========================================================================
export default function SantriPage() {
  const [data, setData] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Santri; direction: 'asc' | 'desc' } | null>({ key: 'nama_lengkap', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; 

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null); 
  
  const [formData, setFormData] = useState<Partial<Santri>>(initialFormState);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: santriData, error } = await supabase.from('santri').select('*');
    if (!error && santriData) setData(santriData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return Object.values(item).some((val) => 
        String(val || '').toLowerCase().includes(lowerQuery)
      );
    });
  }, [data, searchQuery]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.key] || '').toLowerCase();
        const bVal = String((b as any)[sortConfig.key] || '').toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: keyof Santri) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let updates: any = { [name]: value };

    if (name === 'tanggal_masuk' && value) {
      const yearExtracted = value.split('-')[0];
      if (yearExtracted.length === 4) updates['tahun_masuk'] = yearExtracted;
    }

    if (selectedSantri) {
      updates['status_sinkronisasi'] = 'Dimodifikasi Manual';
      setSelectedSantri({ ...selectedSantri, ...updates } as Santri);
    } else {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  // Fungsi Khusus Menangkap Perubahan Data dari Dropdown Wilayah
  const handleRegionChange = (updates: Partial<Santri>) => {
    if (selectedSantri) {
      setSelectedSantri(prev => ({ ...prev!, ...updates, status_sinkronisasi: 'Dimodifikasi Manual' }));
    } else {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const kodeUnik = 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const payload = { ...formData, kode_unik: kodeUnik, status_sinkronisasi: 'Belum Sinkron' };
    const { error } = await supabase.from('santri').insert([payload]);
    
    if (error) {
      setMessage({ type: 'error', text: 'Gagal menyimpan: ' + error.message });
    } else {
      setMessage({ type: 'success', text: `Data "${formData.nama_lengkap}" berhasil disimpan!` });
      setFormData({
        ...initialFormState,
        tanggal_masuk: new Date().toISOString().split('T')[0],
        tahun_masuk: new Date().getFullYear().toString(),
      });
      fetchData(); 
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return;

    const { error } = await supabase.from('santri').update(selectedSantri).eq('id', selectedSantri.id);
    if (error) setMessage({ type: 'error', text: 'Gagal memperbarui: ' + error.message });
    else {
      alert(`Data "${selectedSantri.nama_lengkap}" berhasil diperbarui!`);
      setSelectedSantri(null); 
      fetchData();
    }
  };

  return (
    <div className="max-w-[100rem] mx-auto p-4 bg-white shadow-xl rounded-2xl border border-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-emerald-600" /> Database Induk Santri
          </h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            Total: {filteredData.length} Data 
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded text-xs font-semibold flex items-center gap-1">
              <RefreshCw className="w-3 h-3"/> EMIS Ready
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input 
              type="text" placeholder="Cari apapun..." 
              value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
              className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button onClick={() => {setMessage(null); setIsAddModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> Tambah Data
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[70vh]">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10">
            <tr>
              {['Nama Lengkap', 'NIS', 'Kelas', 'Asrama', 'Status', 'L/P', 'Tgl Pencatatan', 'Tahun Masuk', 'Tempat Lahir', 'Tgl Lahir', 'HP Santri', 'Status Sinkron', 'Prov', 'Kab', 'Kec', 'Desa', 'Jalan', 'Pos', 'Nama Ayah', 'Pek. Ayah', 'Nama Ibu', 'Pek. Ibu', 'Nama Wali', 'HP Wali'].map((col, idx) => {
                const keys: Record<string, keyof Santri> = {
                  'Nama Lengkap': 'nama_lengkap', 'NIS': 'nis', 'Kelas': 'kelas', 'Asrama': 'asrama', 'Status': 'status', 'L/P': 'jenis_kelamin', 'Tahun Masuk': 'tahun_masuk', 'Tgl Pencatatan': 'tanggal_masuk', 'Status Sinkron': 'status_sinkronisasi'
                };
                const sortKey = keys[col];
                
                return (
                  <th key={idx} className="p-3 border-b cursor-pointer hover:bg-gray-200" onClick={() => sortKey && handleSort(sortKey)}>
                    <div className="flex items-center gap-1">
                      {col}
                      {sortConfig?.key === sortKey && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={24} className="p-8 text-center text-gray-500">Memuat data...</td></tr> : null}
            {!loading && paginatedData.map((s) => (
              <tr key={s.id} className="hover:bg-emerald-50 transition-colors">
                <td className="p-3">
                  <button onClick={() => setSelectedSantri(s)} className="font-bold text-emerald-700 hover:underline flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> {s.nama_lengkap}
                  </button>
                </td>
                <td className="p-3">{s.nis || '-'}</td>
                <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded">{s.kelas || '-'}</span></td>
                <td className="p-3">{s.asrama || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-3">{s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                <td className="p-3">{s.tanggal_masuk || '-'}</td>
                <td className="p-3 font-semibold text-emerald-700">{s.tahun_masuk || '-'}</td>
                <td className="p-3">{s.tempat_lahir || '-'}</td>
                <td className="p-3">{s.tanggal_lahir || '-'}</td>
                <td className="p-3">{s.no_hp_santri || '-'}</td>
                <td className="p-3">
                   <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.status_sinkronisasi === 'Tersinkron' ? 'bg-blue-100 text-blue-700' : s.status_sinkronisasi === 'Dimodifikasi Manual' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                     {s.status_sinkronisasi || 'Belum Sinkron'}
                   </span>
                </td>
                
                {/* Posisi Alamat Dirapikan */}
                <td className="p-3">{s.provinsi || '-'}</td>
                <td className="p-3">{s.kabupaten_kota || '-'}</td>
                <td className="p-3">{s.kecamatan || '-'}</td>
                <td className="p-3">{s.desa_kelurahan || '-'}</td>
                <td className="p-3 truncate max-w-[150px]" title={s.alamat_jalan || ''}>{s.alamat_jalan || '-'}</td>
                <td className="p-3">{s.kode_pos || '-'}</td>
                
                <td className="p-3">{s.nama_ayah || '-'}</td>
                <td className="p-3">{s.pekerjaan_ayah || '-'}</td>
                <td className="p-3">{s.nama_ibu || '-'}</td>
                <td className="p-3">{s.pekerjaan_ibu || '-'}</td>
                <td className="p-3">{s.nama_wali || '-'}</td>
                <td className="p-3">{s.no_hp_wali || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
        <div>Halaman {currentPage} dari {totalPages || 1}</div>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Sebelumnya</button>
          <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">Selanjutnya</button>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                <Plus className="w-5 h-5"/> Tambah Data Santri Baru
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {message && (
                <div className={`mb-4 p-3 rounded flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>} {message.text}
                </div>
              )}
              <form id="addForm" onSubmit={handleSubmitAdd}>
                <FormFields dataTarget={formData} onChange={handleInputChange} onRegionChange={handleRegionChange} />
              </form>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
              <p className="text-xs text-gray-500">*Form otomatis kosong & siap isi ulang setelah Simpan</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold">Tutup</button>
                <button type="submit" form="addForm" className="px-4 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                  <Save className="w-4 h-4"/> Simpan & Lanjut Isi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSantri && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ring-4 ring-emerald-500/20">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-emerald-50">
              <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5"/> Detail & Edit Data: {selectedSantri.nama_lengkap}
              </h3>
              <button onClick={() => setSelectedSantri(null)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="editForm" onSubmit={handleSubmitEdit}>
                <FormFields dataTarget={selectedSantri} onChange={handleInputChange} onRegionChange={handleRegionChange} />
              </form>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedSantri(null)} className="px-4 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold">Batal</button>
              <button type="submit" form="editForm" className="px-4 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                <Save className="w-4 h-4"/> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}