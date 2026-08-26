import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Santri } from '../types';
import Papa from 'papaparse';
import { 
  Search, Users, Plus, X, Save, Upload, FileText,
  ChevronUp, ChevronDown, CheckCircle, AlertCircle, RefreshCw, AlertTriangle,
  Trash2, Edit, CheckSquare, Clock, Link as LinkIcon, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';

// =========================================================================
// CUSTOM HOOK: Debounce (Menghilangkan Lag Saat Mengetik Pencarian)
// =========================================================================
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
const getCurrentDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const getSafeDatetimeLocal = (val: string | undefined | null) => {
  if (!val) return '';
  if (val.length === 10) return `${val}T00:00`; 
  if (val.includes('T')) return val.substring(0, 16); 
  return val;
};

const formatDateDisplay = (val: string | null | undefined) => {
  if (!val) return '-';
  if (val.includes('T')) {
    const [datePart, timePart] = val.split('T');
    const [y, m, d] = datePart.split('-');
    if (y && m && d) return `${d}/${m}/${y} ${timePart.substring(0, 5)}`;
  }
  if (val.includes('-')) {
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return val; 
};

const parseDateForSort = (dateStr: any) => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (str.includes('/')) {
    const parts = str.split(/[ /:-]/);
    if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return str;
};

const initialFormState: Partial<Santri> & { catatan?: string } = {
  nama_lengkap: '', nis: '', nisn: '', nik: '',
  jenis_kelamin: 'Laki-laki', tempat_lahir: '', tanggal_lahir: '', no_hp_santri: '',
  kelas: '', asrama: '', status: 'Aktif',
  tanggal_masuk: getCurrentDateTimeLocal(),
  tahun_masuk: '', 
  tahun_keluar: '', alamat_jalan: '', desa_kelurahan: '', kecamatan: '',
  kabupaten_kota: '', provinsi: '', kode_pos: '', nama_ayah: '',
  pekerjaan_ayah: '', nama_ibu: '', pekerjaan_ibu: '', nama_wali: '', no_hp_wali: '',
  catatan: ''
};

const API_WILAYAH = 'https://www.emsifa.com/api-wilayah-indonesia/api';

// =========================================================================
// 1. KOMPONEN FORM 
// =========================================================================
const FormFields = ({ 
  dataTarget, onChange, onRegionChange 
}: { 
  dataTarget: Partial<Santri> & { catatan?: string }, 
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void, 
  onRegionChange: (updates: Partial<Santri>) => void 
}) => {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [regencies, setRegencies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  const [provId, setProvId] = useState('');
  const [regId, setRegId] = useState('');
  const [distId, setDistId] = useState('');
  const [villId, setVillId] = useState('');

  useEffect(() => { fetch(`${API_WILAYAH}/provinces.json`).then(res => res.json()).then(data => setProvinces(data)).catch(err => console.error("API Wilayah Error:", err)); }, []);
  useEffect(() => { if (dataTarget.provinsi && provinces.length > 0) { const p = provinces.find((x: any) => x.name.toUpperCase() === dataTarget.provinsi?.toUpperCase()); if (p) setProvId(p.id); } else if (!dataTarget.provinsi) setProvId(''); }, [dataTarget.provinsi, provinces]);
  useEffect(() => { if (provId) { fetch(`${API_WILAYAH}/regencies/${provId}.json`).then(res => res.json()).then(data => setRegencies(data)).catch(err => console.error("API Wilayah Error:", err)); } else setRegencies([]); }, [provId]);
  useEffect(() => { if (dataTarget.kabupaten_kota && regencies.length > 0) { const r = regencies.find((x: any) => x.name.toUpperCase() === dataTarget.kabupaten_kota?.toUpperCase()); if (r) setRegId(r.id); } else if (!dataTarget.kabupaten_kota) setRegId(''); }, [dataTarget.kabupaten_kota, regencies]);
  useEffect(() => { if (regId) { fetch(`${API_WILAYAH}/districts/${regId}.json`).then(res => res.json()).then(data => setDistricts(data)).catch(err => console.error("API Wilayah Error:", err)); } else setDistricts([]); }, [regId]);
  useEffect(() => { if (dataTarget.kecamatan && districts.length > 0) { const d = districts.find((x: any) => x.name.toUpperCase() === dataTarget.kecamatan?.toUpperCase()); if (d) setDistId(d.id); } else if (!dataTarget.kecamatan) setDistId(''); }, [dataTarget.kecamatan, districts]);
  useEffect(() => { if (distId) { fetch(`${API_WILAYAH}/villages/${distId}.json`).then(res => res.json()).then(data => setVillages(data)).catch(err => console.error("API Wilayah Error:", err)); } else setVillages([]); }, [distId]);
  useEffect(() => { if (dataTarget.desa_kelurahan && villages.length > 0) { const v = villages.find((x: any) => x.name.toUpperCase() === dataTarget.desa_kelurahan?.toUpperCase()); if (v) setVillId(v.id); } else if (!dataTarget.desa_kelurahan) setVillId(''); }, [dataTarget.desa_kelurahan, villages]);

  const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const id = e.target.value; const name = id ? e.target.options[e.target.selectedIndex].text : ''; setProvId(id); onRegionChange({ provinsi: id ? name : '', kabupaten_kota: '', kecamatan: '', desa_kelurahan: '' }); };
  const handleRegChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const id = e.target.value; const name = id ? e.target.options[e.target.selectedIndex].text : ''; setRegId(id); onRegionChange({ kabupaten_kota: id ? name : '', kecamatan: '', desa_kelurahan: '' }); };
  const handleDistChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const id = e.target.value; const name = id ? e.target.options[e.target.selectedIndex].text : ''; setDistId(id); onRegionChange({ kecamatan: id ? name : '', desa_kelurahan: '' }); };
  const handleVillChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const id = e.target.value; const name = id ? e.target.options[e.target.selectedIndex].text : ''; setVillId(id); onRegionChange({ desa_kelurahan: id ? name : '' }); };

  const handleSetToday = () => { onChange({ target: { name: 'tanggal_masuk', value: getCurrentDateTimeLocal() } } as unknown as React.ChangeEvent<HTMLInputElement>); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Identitas & Pondok</div>
      <div><label className="block text-xs text-gray-500">Nama Lengkap*</label><input required type="text" name="nama_lengkap" value={dataTarget.nama_lengkap || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">NIS</label><input type="text" name="nis" value={dataTarget.nis || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
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
      <div>
        <label className="flex justify-between items-center text-xs text-emerald-600 font-bold mb-1">
          Waktu Pencatatan
          <button type="button" onClick={handleSetToday} className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] transition-colors">
            <Clock className="w-3 h-3"/> Saat Ini
          </button>
        </label>
        <input type="datetime-local" name="tanggal_masuk" value={getSafeDatetimeLocal(dataTarget.tanggal_masuk)} onChange={onChange} className="w-full border border-emerald-300 bg-emerald-50 p-2 rounded focus:ring-1" />
      </div>
      <div><label className="block text-xs text-gray-500 mb-1">Tahun Masuk</label><input type="text" name="tahun_masuk" value={dataTarget.tahun_masuk || ''} onChange={onChange} placeholder="Contoh: 2024" className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500 mb-1">Kelas</label><input type="text" name="kelas" value={dataTarget.kelas || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500 mb-1">Asrama</label><input type="text" name="asrama" value={dataTarget.asrama || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500 mb-1">Status</label>
        <select name="status" value={dataTarget.status || 'Aktif'} onChange={onChange} className="w-full border p-2 rounded focus:ring-1">
          <option value="Aktif">Aktif</option><option value="Alumni/Lulus">Alumni / Lulus</option><option value="Keluar">Keluar</option>
        </select>
      </div>
      <div><label className="block text-xs text-gray-500 mb-1">Tahun Keluar</label><input type="text" name="tahun_keluar" value={dataTarget.tahun_keluar || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>

      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Alamat Lengkap</div>
      <div className="md:col-span-3 mb-2">
        <label className="block text-xs text-gray-500 font-semibold mb-1">Alamat (Jalan / Dusun / RT / RW - Ketik Manual)</label>
        <input type="text" name="alamat_jalan" value={dataTarget.alamat_jalan || ''} onChange={onChange} placeholder="Cth: Jl. Raya Pondok No 1, RT 01 RW 02, Dusun Krajan" className="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500" />
      </div>
      <div><label className="block text-xs text-gray-500">Provinsi</label>
        <select value={provId} onChange={handleProvChange} className="w-full border p-2 rounded focus:ring-1 bg-white">
          <option value="">-- Pilih Provinsi --</option>
          {provinces.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div><label className="block text-xs text-gray-500">Kabupaten / Kota</label>
        <select value={regId} onChange={handleRegChange} disabled={!provId} className="w-full border p-2 rounded focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 bg-white">
          <option value="">-- Pilih Kabupaten --</option>
          {regencies.map((r:any) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div><label className="block text-xs text-gray-500">Kecamatan</label>
        <select value={distId} onChange={handleDistChange} disabled={!regId} className="w-full border p-2 rounded focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 bg-white">
          <option value="">-- Pilih Kecamatan --</option>
          {districts.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div><label className="block text-xs text-gray-500">Desa / Kelurahan</label>
        <select value={villId} onChange={handleVillChange} disabled={!distId} className="w-full border p-2 rounded focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400 bg-white">
          <option value="">-- Pilih Desa --</option>
          {villages.map((v:any) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>
      <div><label className="block text-xs text-gray-500">Kode Pos</label><input type="text" name="kode_pos" value={dataTarget.kode_pos || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      
      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Orang Tua / Wali</div>
      <div><label className="block text-xs text-gray-500">Nama Ayah</label><input type="text" name="nama_ayah" value={dataTarget.nama_ayah || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Pekerjaan Ayah</label><input type="text" name="pekerjaan_ayah" value={dataTarget.pekerjaan_ayah || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Nama Ibu</label><input type="text" name="nama_ibu" value={dataTarget.nama_ibu || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Pekerjaan Ibu</label><input type="text" name="pekerjaan_ibu" value={dataTarget.pekerjaan_ibu || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500">Nama Wali</label><input type="text" name="nama_wali" value={dataTarget.nama_wali || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      <div><label className="block text-xs text-gray-500 font-bold">No. HP Wali (WA Utama)</label><input type="text" name="no_hp_wali" value={dataTarget.no_hp_wali || ''} onChange={onChange} className="w-full border p-2 rounded focus:ring-1" /></div>
      
      <div className="md:col-span-3 pb-1 border-b text-emerald-700 font-bold mt-2">Informasi Tambahan</div>
      <div className="md:col-span-3">
        <label className="block text-xs text-gray-500 mb-1">Catatan Khusus Santri (Opsional)</label>
        <textarea name="catatan" value={dataTarget.catatan || ''} onChange={onChange} rows={3} placeholder="Tuliskan hal penting..." className="w-full border p-2 rounded focus:ring-1 resize-y" />
      </div>
    </div>
  );
};


// =========================================================================
// 2. KOMPONEN BARIS TABEL (React.memo)
// =========================================================================
const SantriTableRow = React.memo(({
  s, isSelected, onSelect, onEdit, onCopyLink
}: {
  s: Santri & { catatan?: string },
  isSelected: boolean,
  onSelect: (id: string) => void,
  onEdit: (s: Santri & { catatan?: string }) => void,
  onCopyLink: (kode: string) => void
}) => {
  return (
    <tr className={`transition-colors ${isSelected ? 'bg-emerald-100/50' : 'hover:bg-emerald-50'}`}>
      <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={isSelected} onChange={() => onSelect(s.id)} /></td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(s)} className="font-bold text-emerald-700 hover:underline text-left">{s.nama_lengkap}</button>
          <button onClick={() => onCopyLink(s.kode_unik || '')} title="Copy Link Portal Santri" className="text-gray-400 hover:text-blue-600 transition-colors"><LinkIcon className="w-4 h-4"/></button>
        </div>
      </td>
      <td className="p-3">{s.nis || '-'}</td>
      <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded">{s.kelas || '-'}</span></td>
      <td className="p-3">{s.asrama || '-'}</td>
      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
      <td className="p-3">{s.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
      <td className="p-3 font-semibold text-emerald-700">{formatDateDisplay(s.tahun_masuk)}</td>
      <td className="p-3 font-semibold text-rose-700">{formatDateDisplay(s.tahun_keluar)}</td>
      <td className="p-3">{s.tempat_lahir || '-'}</td>
      <td className="p-3">{formatDateDisplay(s.tanggal_lahir)}</td>
      <td className="p-3">{s.no_hp_santri || '-'}</td>
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
      <td className="p-3 truncate max-w-[150px]" title={s.catatan || ''}>{s.catatan ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">Ada Catatan</span> : '-'}</td>
      <td className="p-3 font-medium text-emerald-900">{formatDateDisplay(s.tanggal_masuk)}</td>
      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${s.status_sinkronisasi === 'Tersinkron' ? 'bg-blue-100 text-blue-700' : s.status_sinkronisasi === 'Dimodifikasi Manual' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{s.status_sinkronisasi || 'Belum Sinkron'}</span></td>
    </tr>
  );
});


// =========================================================================
// 3. DATA DAN TIPE
// =========================================================================
type ImportAction = 'skip' | 'replace' | 'keep_both';
interface ImportConflict { id: number; importedData: Partial<Santri> & { catatan?: string }; existingData: Santri & { catatan?: string }; action: ImportAction; }

const DB_MAP_FIELDS = [
  { key: 'nama_lengkap', label: 'Nama Lengkap (Wajib)' }, { key: 'nis', label: 'NIS / No Induk' }, { key: 'nisn', label: 'NISN' }, { key: 'nik', label: 'NIK' },
  { key: 'jenis_kelamin', label: 'Jenis Kelamin (L/P)' }, { key: 'tempat_lahir', label: 'Tempat Lahir' }, { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
  { key: 'kelas', label: 'Kelas' }, { key: 'asrama', label: 'Asrama' }, { key: 'status', label: 'Status (Aktif/Keluar)' }, { key: 'alamat_jalan', label: 'Alamat' },
  { key: 'provinsi', label: 'Provinsi' }, { key: 'kabupaten_kota', label: 'Kabupaten/Kota' }, { key: 'kecamatan', label: 'Kecamatan' }, { key: 'desa_kelurahan', label: 'Desa/Kelurahan' },
  { key: 'nama_ayah', label: 'Nama Ayah' }, { key: 'pekerjaan_ayah', label: 'Pekerjaan Ayah' }, { key: 'nama_ibu', label: 'Nama Ibu' }, { key: 'pekerjaan_ibu', label: 'Pekerjaan Ibu' },
  { key: 'catatan', label: 'Catatan Khusus' }, { key: 'tanggal_masuk', label: 'Tgl/Waktu Pencatatan (Masuk)' }, { key: 'tahun_masuk', label: 'Tahun Masuk' }, { key: 'tahun_keluar', label: 'Tahun Keluar' }
];

const BULK_EDIT_FIELDS = [
  { key: 'kelas', label: 'Kelas' }, { key: 'asrama', label: 'Asrama' }, { key: 'status', label: 'Status (Aktif/Alumni/Keluar)' }, { key: 'tanggal_masuk', label: 'Waktu Pencatatan' },
  { key: 'tahun_masuk', label: 'Tahun Masuk' }, { key: 'tahun_keluar', label: 'Tahun Keluar' }, { key: 'jenis_kelamin', label: 'Jenis Kelamin' }, { key: 'provinsi', label: 'Provinsi' },
  { key: 'kabupaten_kota', label: 'Kabupaten / Kota' }, { key: 'kecamatan', label: 'Kecamatan' }, { key: 'desa_kelurahan', label: 'Desa / Kelurahan' }, { key: 'alamat_jalan', label: 'Alamat (Jalan/RT/RW)' },
  { key: 'kode_pos', label: 'Kode Pos' }, { key: 'tempat_lahir', label: 'Tempat Lahir' }, { key: 'tanggal_lahir', label: 'Tanggal Lahir' }, { key: 'nama_ayah', label: 'Nama Ayah' },
  { key: 'pekerjaan_ayah', label: 'Pekerjaan Ayah' }, { key: 'nama_ibu', label: 'Nama Ibu' }, { key: 'pekerjaan_ibu', label: 'Pekerjaan Ibu' }, { key: 'nama_wali', label: 'Nama Wali' },
  { key: 'no_hp_wali', label: 'No. HP Wali (WA)' }, { key: 'no_hp_santri', label: 'No. HP Santri' }, { key: 'catatan', label: 'Catatan Khusus' },
];

export default function SantriPage() {
  const [data, setData] = useState<(Santri & { catatan?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'nama_lengkap', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100; 

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState('kelas');
  const [bulkEditValue, setBulkEditValue] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<(Santri & { catatan?: string }) | null>(null); 
  const [formData, setFormData] = useState<Partial<Santri> & { catatan?: string }>(initialFormState);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showMessage = useCallback((type: 'success' | 'error' | 'info', text: string, duration = 5000) => {
    setMessage({ type, text });
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessage(null), duration);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRaw, setCsvDataRaw] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [importReady, setImportReady] = useState<(Partial<Santri> & { catatan?: string })[]>([]);
  const [importConflicts, setImportConflicts] = useState<ImportConflict[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [failedImports, setFailedImports] = useState<{payload: any, error: string}[]>([]);

  const fetchData = async () => {
    setLoading(true);
    let allData: (Santri & { catatan?: string })[] = [];
    let hasMore = true;
    let page = 0;
    const limit = 1000;

    try {
      while(hasMore) {
        const { data: santriData, error } = await supabase.from('santri').select('*').range(page * limit, (page + 1) * limit - 1);
        if (error) throw error;
        if (santriData) allData = [...allData, ...santriData];
        if (santriData.length < limit) hasMore = false;
        page++;
      }
      setData(allData);

      // Mengambil jumlah antrean review
      const { count } = await supabase.from('pengajuan_santri').select('id', { count: 'exact', head: true }).eq('status_pengajuan', 'Menunggu');
      setPendingReviewCount(count || 0);

    } catch (err: any) {
      showMessage('error', 'Gagal memuat data: ' + err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getUniqueValuesFor = (field: string) => {
    return [...new Set(data.map(s => (s as any)[field]).filter(v => v !== null && v !== ''))].sort();
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (!debouncedSearchQuery) return true;
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      
      // Logika Filter Kolom Spesifik
      if (searchColumn === 'all') {
        return Object.values(item).some((val) => String(val || '').toLowerCase().includes(lowerQuery));
      } else {
        return String((item as any)[searchColumn] || '').toLowerCase().includes(lowerQuery);
      }
    });
  }, [data, debouncedSearchQuery, searchColumn]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key] || ''; let bVal = b[sortConfig.key] || '';
        if (['tanggal_masuk', 'tanggal_lahir', 'tahun_masuk', 'tahun_keluar'].includes(sortConfig.key as string)) {
          aVal = parseDateForSort(aVal); bVal = parseDateForSort(bVal);
        } else {
          aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds([...new Set([...selectedIds, ...paginatedData.map(s => s.id)])]);
    else setSelectedIds(selectedIds.filter(id => !paginatedData.map(s => s.id).includes(id)));
  };

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev: string[]) => {
      if (prev.includes(id)) return prev.filter((i: string) => i !== id);
      return [...prev, id];
    });
  }, []);

  const handleEditClick = useCallback((s: Santri & { catatan?: string }) => { setSelectedSantri(s); }, []);
  
  const handleCopyLink = useCallback((kode: string) => {
    const url = `${window.location.origin}/s/${kode}`;
    navigator.clipboard.writeText(url);
    showMessage('info', `Link Portal berhasil di-copy! (${url})`, 3000);
  }, [showMessage]);

  const handleBulkDelete = async () => {
    if (!window.confirm(`Yakin ingin menghapus ${selectedIds.length} santri secara permanen?`)) return;
    const { error } = await supabase.from('santri').delete().in('id', selectedIds);
    if (!error) { showMessage('success', `${selectedIds.length} data berhasil dihapus.`); setSelectedIds([]); fetchData(); }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Yakin mengubah kolom [${bulkEditField}] menjadi "${bulkEditValue}" untuk ${selectedIds.length} santri?`)) return;
    const payload = { [bulkEditField]: bulkEditValue, status_sinkronisasi: 'Dimodifikasi Manual' };
    const { error } = await supabase.from('santri').update(payload).in('id', selectedIds);
    if (!error) { showMessage('success', `${selectedIds.length} data diseragamkan.`); setIsBulkEditModalOpen(false); setBulkEditValue(''); setSelectedIds([]); fetchData(); } 
    else { showMessage('error', 'Gagal update massal: ' + error.message); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        if (!results.meta.fields) { showMessage('error', 'Gagal membaca header.'); return; }
        setCsvHeaders(results.meta.fields); setCsvDataRaw(results.data);
        const initialMap: Record<string, string> = {};
        DB_MAP_FIELDS.forEach(dbField => {
          const matched = results.meta.fields!.find(h => h.toLowerCase().includes(dbField.key.replace('_', ' ')) || dbField.label.toLowerCase().includes(h.toLowerCase()) || (dbField.key === 'nama_lengkap' && h.toLowerCase().includes('nama')) || (dbField.key === 'tanggal_masuk' && h.toLowerCase().includes('masuk')) || (dbField.key === 'catatan' && h.toLowerCase().includes('catatan')) || (dbField.key === 'alamat_jalan' && h.toLowerCase().includes('alamat')));
          if (matched) initialMap[dbField.key] = matched;
        });
        setColumnMapping(initialMap); setIsMappingModalOpen(true);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    });
  };

  const processMappingAndShowConflicts = () => {
    if (!columnMapping['nama_lengkap']) { alert("Kolom 'Nama Lengkap' wajib dipasangkan!"); return; }
    const newReady: (Partial<Santri> & { catatan?: string })[] = [];
    const newConflicts: ImportConflict[] = [];

    csvDataRaw.forEach((row: any, index) => {
      const mappedSantri: Partial<Santri> & { catatan?: string } = { ...initialFormState, status_sinkronisasi: 'Belum Sinkron' };
      let hasData = false;
      Object.keys(columnMapping).forEach(dbKey => {
        const csvHeader = columnMapping[dbKey];
        if (csvHeader && row[csvHeader] !== undefined && row[csvHeader] !== null) {
          let val = String(row[csvHeader]).trim();
          if (val) {
             if (dbKey === 'jenis_kelamin') val = val.toUpperCase().startsWith('P') ? 'Perempuan' : 'Laki-laki';
             (mappedSantri as any)[dbKey] = val; hasData = true;
          }
        }
      });
      if (!hasData || !mappedSantri.nama_lengkap) return; 
      if (!mappedSantri.tanggal_masuk) mappedSantri.tanggal_masuk = getCurrentDateTimeLocal();

      const existing = data.find(d => d.nama_lengkap?.toLowerCase().trim() === mappedSantri.nama_lengkap?.toLowerCase().trim());
      if (existing) newConflicts.push({ id: index, importedData: mappedSantri, existingData: existing, action: 'skip' });
      else newReady.push(mappedSantri);
    });

    setImportReady(newReady); setImportConflicts(newConflicts);
    setIsMappingModalOpen(false); setIsImportWizardOpen(true);
  };

  const sanitizePayload = (obj: any) => {
    const result = { ...obj };
    Object.keys(result).forEach(key => {
      if (typeof result[key] === 'string') {
        result[key] = result[key].trim();
        if (result[key] === '' || result[key] === '-' || result[key].toLowerCase() === 'n/a') result[key] = null;
      }
      if (['nis', 'nisn', 'nik'].includes(key) && result[key]) {
        const val = result[key].toUpperCase();
        if (val === '-' || val === '0' || val === '_' || val === 'NULL' || val === 'N/A' || val === 'TIDAK ADA') result[key] = null;
      }
      if (['tanggal_lahir', 'tanggal_masuk'].includes(key) && result[key]) {
        let dateStr = result[key];
        if (dateStr.includes('/')) {
          const parts = dateStr.split(/[ /]/); 
          if (parts.length >= 3 && parts[0].length <= 2 && parts[2].length === 4) dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) { result[key] = null; } 
        else {
          if (key === 'tanggal_lahir') result[key] = parsedDate.toISOString().split('T')[0];
          else if (key === 'tanggal_masuk') result[key] = parsedDate.toISOString();
        }
      }
      if (result[key] === undefined) delete result[key];
    });
    return result;
  };

  const executeImport = async () => {
    setIsImporting(true); let successCount = 0; let fails: {payload: any, error: string}[] = [];
    for (const santri of importReady) {
      const payload: any = sanitizePayload({ ...santri, kode_unik: 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).slice(-3) });
      const { error } = await supabase.from('santri').insert([payload]);
      if (!error) successCount++; else fails.push({ payload, error: error.message });
    }
    for (const conflict of importConflicts) {
      if (conflict.action === 'replace') {
        const payload: any = sanitizePayload({ ...conflict.importedData });
        const { error } = await supabase.from('santri').update(payload).eq('id', conflict.existingData.id);
        if (!error) successCount++; else fails.push({ payload, error: error.message });
      } else if (conflict.action === 'keep_both') {
        const payload: any = sanitizePayload({ ...conflict.importedData, kode_unik: 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).slice(-3) });
        const { error } = await supabase.from('santri').insert([payload]);
        if (!error) successCount++; else fails.push({ payload, error: error.message });
      }
    }
    setIsImporting(false); setIsImportWizardOpen(false);
    if (fails.length > 0) setFailedImports(fails);
    else showMessage('success', `Berhasil memproses ${successCount} data santri tanpa masalah.`, 8000);
    fetchData(); 
  };

  const executeForceImport = async () => {
    setIsImporting(true); let successCount = 0; let newFails: {payload: any, error: string}[] = [];
    for (const item of failedImports) {
      const payload = sanitizePayload({ ...item.payload });
      const randFix = Math.random().toString(36).substring(2, 6).toUpperCase();
      if (payload.nis && payload.nis !== null) payload.nis = `${payload.nis}-DUP${randFix}`;
      if (payload.nisn && payload.nisn !== null) payload.nisn = `${payload.nisn}-DUP${randFix}`;
      if (payload.nik && payload.nik !== null) payload.nik = `${payload.nik}-DUP${randFix}`;
      const { error } = await supabase.from('santri').insert([payload]);
      if (!error) successCount++; else newFails.push({ payload, error: error.message });
    }
    setIsImporting(false); setFailedImports(newFails); fetchData();
    if (newFails.length > 0) showMessage('error', `Berhasil memaksa impor ${successCount} data. NAMUN ${newFails.length} DATA MASIH GAGAL. Periksa format kolom unik.`, 8000);
    else showMessage('success', `Berhasil memaksa impor seluruh ${successCount} data!`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target; let updates: any = { [name]: value };
    if (selectedSantri) setSelectedSantri({ ...selectedSantri, ...updates, status_sinkronisasi: 'Dimodifikasi Manual' } as Santri & { catatan?: string });
    else setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleRegionChange = (updates: Partial<Santri>) => {
    if (selectedSantri) setSelectedSantri(prev => ({ ...prev!, ...updates, status_sinkronisasi: 'Dimodifikasi Manual' }));
    else setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = sanitizePayload({ ...formData, kode_unik: 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase(), status_sinkronisasi: 'Belum Sinkron' });
    const { error } = await supabase.from('santri').insert([payload]);
    if (!error) { showMessage('success', `Data berhasil disimpan!`); setFormData({ ...initialFormState, tanggal_masuk: getCurrentDateTimeLocal() }); setIsAddModalOpen(false); fetchData(); } 
    else showMessage('error', 'Gagal menyimpan: ' + error.message);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedSantri) return;
    const { error } = await supabase.from('santri').update(sanitizePayload(selectedSantri)).eq('id', selectedSantri.id);
    if (!error) { showMessage('success', `Data berhasil diperbarui!`); setSelectedSantri(null); fetchData(); } 
    else showMessage('error', 'Gagal memperbarui: ' + error.message);
  };

  return (
    <div className="max-w-[100rem] mx-auto p-4 bg-white shadow-xl rounded-2xl border border-gray-100 min-h-screen">
      
      {/* HEADER & TOMBOL AKSI */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-emerald-600" /> Database Induk Santri</h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">Total: {filteredData.length} Data</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
          
          {/* SEARCH BAR TERBARU DENGAN FILTER KOLOM */}
          <div className="flex w-full md:w-[400px]">
            <select
              value={searchColumn}
              onChange={(e) => {setSearchColumn(e.target.value); setCurrentPage(1);}}
              className="border border-gray-300 rounded-l-lg bg-gray-50 text-sm px-2 py-2 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="all">Semua Kolom</option>
              <option value="nama_lengkap">Nama</option>
              <option value="nis">NIS</option>
              <option value="kelas">Kelas</option>
              <option value="asrama">Asrama</option>
              <option value="desa_kelurahan">Desa</option>
              <option value="alamat_jalan">Alamat</option>
              <option value="status">Status</option>
            </select>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                placeholder="Cari data..." 
                value={searchQuery} 
                onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} 
                className="pl-9 pr-4 py-2 w-full border border-l-0 border-gray-300 rounded-r-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>
          </div>
          
          <Link to="/admin-review" className="relative flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-sm whitespace-nowrap shadow-sm transition-all">
            <Bell className="w-4 h-4" />
            {pendingReviewCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
                {pendingReviewCount}
              </span>
            )}
          </Link>

          <input type="file" accept=".csv, .xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => {setMessage(null); fileInputRef.current?.click();}} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm whitespace-nowrap">
            <Upload className="w-4 h-4" /> Import
          </button>

          <button onClick={() => {setMessage(null); setIsAddModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm whitespace-nowrap">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FLOATING ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex justify-between items-center mb-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckSquare className="w-5 h-5"/> {selectedIds.length} Data Terpilih
          </div>
          <div className="flex gap-2">
            <button onClick={() => {setBulkEditValue(''); setIsBulkEditModalOpen(true);}} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-bold">
              <Edit className="w-3 h-3"/> Ubah Massal
            </button>
            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold">
              <Trash2 className="w-3 h-3"/> Hapus Massal
            </button>
          </div>
        </div>
      )}

      {message && !isAddModalOpen && !selectedSantri && !isBulkEditModalOpen && (
        <div className={`mb-4 p-3 rounded flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : message.type === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4"/> : message.type === 'info' ? <CheckSquare className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>} {message.text}
        </div>
      )}

      {/* TABEL UTAMA (27 KOLOM KEMBALI) */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[70vh]">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10">
            <tr>
              <th className="p-3 border-b text-center w-10">
                <input type="checkbox" className="w-4 h-4 cursor-pointer" checked={paginatedData.length > 0 && paginatedData.every(s => selectedIds.includes(s.id))} onChange={handleSelectAll} />
              </th>
              {[
                'Nama Lengkap', 'NIS', 'Kelas', 'Asrama', 'Status', 'L/P', 'Tahun Masuk', 'Tahun Keluar', 
                'Tempat Lahir', 'Tgl Lahir', 'HP Santri', 'Provinsi', 'Kabupaten/Kota', 'Kecamatan', 'Desa', 'Alamat', 'Kode Pos', 
                'Nama Ayah', 'Pek. Ayah', 'Nama Ibu', 'Pek. Ibu', 'Nama Wali', 'HP Wali', 'Catatan Khusus', 'Waktu Pencatatan', 'Status Sinkron'
              ].map((col, idx) => {
                const keys: Record<string, string> = {
                  'Nama Lengkap': 'nama_lengkap', 'NIS': 'nis', 'Kelas': 'kelas', 'Asrama': 'asrama', 'Status': 'status', 'L/P': 'jenis_kelamin', 'Tahun Masuk': 'tahun_masuk', 'Tahun Keluar': 'tahun_keluar', 'Tempat Lahir': 'tempat_lahir', 'Tgl Lahir': 'tanggal_lahir', 'HP Santri': 'no_hp_santri', 'Prov': 'provinsi', 'Kab': 'kabupaten_kota', 'Kec': 'kecamatan', 'Desa': 'desa_kelurahan', 'Alamat': 'alamat_jalan', 'Pos': 'kode_pos', 'Nama Ayah': 'nama_ayah', 'Pek. Ayah': 'pekerjaan_ayah', 'Nama Ibu': 'nama_ibu', 'Pek. Ibu': 'pekerjaan_ibu', 'Nama Wali': 'nama_wali', 'HP Wali': 'no_hp_wali', 'Catatan Khusus': 'catatan', 'Waktu Pencatatan': 'tanggal_masuk', 'Status Sinkron': 'status_sinkronisasi'
                };
                const sortKey = keys[col];
                return (
                  <th key={idx} className="p-3 border-b cursor-pointer hover:bg-gray-200" onClick={() => sortKey && handleSort(sortKey)}>
                    <div className="flex items-center gap-1">{col} {sortConfig?.key === sortKey && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>)}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={27} className="p-8 text-center text-gray-500"><div className="flex justify-center items-center gap-2"><RefreshCw className="animate-spin w-5 h-5"/> Memuat data...</div></td></tr> : null}
            {!loading && paginatedData.map((s) => (
              <SantriTableRow key={s.id} s={s} isSelected={selectedIds.includes(s.id)} onSelect={handleSelectOne} onEdit={handleEditClick} onCopyLink={handleCopyLink} />
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

      {/* MODAL UBAH MASSAL */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md flex flex-col rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-amber-50">
              <h3 className="text-lg font-bold text-amber-800 flex items-center gap-2"><Edit className="w-5 h-5"/> Ubah {selectedIds.length} Data Massal</h3>
              <button onClick={() => setIsBulkEditModalOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleBulkEditSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Kolom yang akan diseragamkan:</label>
                <select value={bulkEditField} onChange={(e) => {setBulkEditField(e.target.value); setBulkEditValue('');}} className="w-full border p-2 rounded focus:ring-2 focus:ring-amber-500 bg-gray-50 max-h-48 overflow-y-auto">
                  {BULK_EDIT_FIELDS.map(field => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4 relative">
                <label className="flex justify-between items-center text-sm font-bold text-gray-700 mb-2">
                  <span>Ketik / Pilih Nilai Baru:</span>
                  {bulkEditField === 'tanggal_masuk' && (
                    <button type="button" onClick={() => setBulkEditValue(getCurrentDateTimeLocal())} className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded text-xs transition-colors"><Clock className="w-3 h-3"/> Saat Ini</button>
                  )}
                </label>
                {bulkEditField === 'status' ? (
                  <select required value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-amber-500 bg-white"><option value="">-- Pilih Status --</option><option value="Aktif">Aktif</option><option value="Alumni/Lulus">Alumni / Lulus</option><option value="Keluar">Keluar</option></select>
                ) : bulkEditField === 'jenis_kelamin' ? (
                  <select required value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-amber-500 bg-white"><option value="">-- Pilih --</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select>
                ) : bulkEditField === 'tanggal_masuk' ? (
                  <input required type="datetime-local" value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-amber-500" />
                ) : bulkEditField === 'tanggal_lahir' ? (
                  <input required type="date" value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-amber-500" />
                ) : bulkEditField === 'catatan' ? (
                  <textarea required rows={3} value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} placeholder="Tulis catatan..." className="w-full border p-2 rounded focus:ring-2 focus:ring-amber-500"></textarea>
                ) : (
                  <>
                    <input required type="text" list={`suggestions-${bulkEditField}`} value={bulkEditValue} onChange={(e) => setBulkEditValue(e.target.value)} placeholder={`Pilih/ketik ${bulkEditField.replace('_',' ')} baru...`} className="w-full border p-2 rounded focus:ring-2 focus:ring-amber-500" />
                    <datalist id={`suggestions-${bulkEditField}`}>
                      {getUniqueValuesFor(bulkEditField).map(val => <option key={String(val)} value={String(val)} />)}
                    </datalist>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsBulkEditModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-bold text-gray-700">Batal</button>
                <button type="submit" className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm font-bold text-white">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MAPPING & IMPORT */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-blue-50 flex justify-between items-center"><h3 className="text-lg font-bold text-blue-800">Pencocokan Kolom Excel</h3></div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 text-sm">
              <div className="grid grid-cols-1 gap-3">
                {DB_MAP_FIELDS.map(dbField => (
                  <div key={dbField.key} className="flex items-center gap-4 bg-white p-2 rounded border">
                    <div className="w-1/2 font-semibold text-gray-700">{dbField.label}</div>
                    <div className="w-1/2">
                      <select value={columnMapping[dbField.key] || ''} onChange={(e) => setColumnMapping({...columnMapping, [dbField.key]: e.target.value})} className="w-full border p-1.5 rounded focus:ring-1 focus:ring-blue-500 bg-gray-50">
                        <option value="">-- Abaikan --</option>{csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-white flex justify-end gap-3"><button onClick={() => setIsMappingModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm font-bold">Batal</button><button onClick={processMappingAndShowConflicts} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-bold text-white">Lanjut</button></div>
          </div>
        </div>
      )}

      {isImportWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50"><h3 className="text-lg font-bold text-blue-800 flex items-center gap-2"><FileText className="w-5 h-5"/> Review Import Data Santri</h3><button onClick={() => setIsImportWizardOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6"/></button></div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><p className="text-sm text-gray-500">Data Baru (Aman diimpor)</p><p className="text-3xl font-bold text-emerald-600">{importReady.length}</p></div>
                <div className="flex-1 p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50"><p className="text-sm text-amber-700">Duplikat Nama Ditemukan</p><p className="text-3xl font-bold text-amber-600 flex items-center gap-2"><AlertTriangle className="w-6 h-6"/> {importConflicts.length}</p></div>
              </div>
              {importConflicts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-100 border-b font-bold text-gray-700 text-sm">Tindakan untuk Data Duplikat</div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {importConflicts.map((conflict) => (
                      <div key={conflict.id} className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:bg-gray-50">
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 text-base">{conflict.importedData.nama_lengkap}</p>
                          <div className="text-xs text-gray-500 mt-1 space-y-1"><p><span className="font-semibold">DB Lama:</span> NIS: {conflict.existingData.nis || '-'} | Alamat: {conflict.existingData.alamat_jalan || '-'}</p><p><span className="font-semibold text-blue-600">File Baru:</span> NIS: {conflict.importedData.nis || '-'} | Alamat: {conflict.importedData.alamat_jalan || '-'}</p></div>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-lg border">
                          <label className={`cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-md ${conflict.action === 'skip' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}><input type="radio" className="hidden" checked={conflict.action === 'skip'} onChange={() => setImportConflicts(prev => prev.map(c => c.id === conflict.id ? { ...c, action: 'skip' } : c))} />Abaikan</label>
                          <label className={`cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-md ${conflict.action === 'replace' ? 'bg-amber-100 shadow text-amber-800' : 'text-gray-500'}`}><input type="radio" className="hidden" checked={conflict.action === 'replace'} onChange={() => setImportConflicts(prev => prev.map(c => c.id === conflict.id ? { ...c, action: 'replace' } : c))} />Timpa</label>
                          <label className={`cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-md ${conflict.action === 'keep_both' ? 'bg-blue-100 shadow text-blue-800' : 'text-gray-500'}`}><input type="radio" className="hidden" checked={conflict.action === 'keep_both'} onChange={() => setImportConflicts(prev => prev.map(c => c.id === conflict.id ? { ...c, action: 'keep_both' } : c))} />Simpan Keduanya</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-white flex justify-end gap-3"><button disabled={isImporting} onClick={() => setIsImportWizardOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg text-sm font-semibold">Batal</button><button disabled={isImporting} onClick={executeImport} className="px-6 py-2 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">{isImporting ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>} {isImporting ? 'Memproses Data...' : 'Mulai Eksekusi Import'}</button></div>
          </div>
        </div>
      )}

      {failedImports.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl flex flex-col rounded-2xl shadow-2xl overflow-hidden ring-4 ring-rose-500/30">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-rose-50"><h3 className="text-lg font-bold text-rose-800 flex items-center gap-2"><AlertTriangle className="w-6 h-6"/> {failedImports.length} Data Ditolak Server</h3></div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <p className="text-gray-700 mb-4 leading-relaxed text-sm">Sistem mendeteksi ada <b>{failedImports.length} santri</b> yang gagal disimpan karena <b>NIS/NIK sama persis dengan yang sudah ada di database</b>.</p>
              <div className="bg-rose-50 border border-rose-200 rounded p-3 text-xs mb-4 max-h-32 overflow-y-auto"><ul className="list-disc pl-4 text-rose-800">{failedImports.slice(0, 10).map((f, i) => (<li key={i}>{f.payload.nama_lengkap} (NIS: {f.payload.nis || f.payload.nik || '-'}) <br/><span className="text-[10px] opacity-70">Err: {f.error}</span></li>))}{failedImports.length > 10 && <li>...dan {failedImports.length - 10} lainnya</li>}</ul></div>
              <div className="space-y-2">
                <button onClick={executeForceImport} disabled={isImporting} className="w-full text-left px-4 py-3 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors group"><span className="block font-bold text-amber-800 group-hover:text-amber-900">1. Tetap Paksa Impor Semua (Rekomendasi)</span><span className="text-xs text-amber-700 block mt-1">Sistem akan menyisipkan kode tambahan pada NIS/NIK yang bentrok tersebut secara otomatis.</span></button>
                <button onClick={() => setFailedImports([])} disabled={isImporting} className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors group"><span className="block font-bold text-gray-700 group-hover:text-gray-900">2. Abaikan Saja</span><span className="text-xs text-gray-500 block mt-1">Buang data bermasalah tersebut. Hanya data bersih yang disimpan.</span></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH & EDIT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50"><h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2"><Plus className="w-5 h-5"/> Tambah Data Santri Baru</h3><button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6"/></button></div>
            <div className="p-6 overflow-y-auto"><form id="addForm" onSubmit={handleSubmitAdd}><FormFields dataTarget={formData} onChange={handleInputChange} onRegionChange={handleRegionChange} /></form></div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2"><button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg text-sm font-semibold">Tutup</button><button type="submit" form="addForm" className="px-4 py-2 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold"><Save className="w-4 h-4"/> Simpan</button></div>
          </div>
        </div>
      )}

      {selectedSantri && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ring-4 ring-emerald-500/20">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-emerald-50"><h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2"><Edit className="w-5 h-5"/> Detail & Edit Data: {selectedSantri.nama_lengkap}</h3><button onClick={() => setSelectedSantri(null)} className="text-gray-400 hover:text-red-500"><X className="w-6 h-6"/></button></div>
            <div className="p-6 overflow-y-auto"><form id="editForm" onSubmit={handleSubmitEdit}><FormFields dataTarget={selectedSantri} onChange={handleInputChange} onRegionChange={handleRegionChange} /></form></div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2"><button type="button" onClick={() => setSelectedSantri(null)} className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg text-sm font-semibold">Batal</button><button type="submit" form="editForm" className="px-4 py-2 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold"><Save className="w-4 h-4"/> Simpan Perubahan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}