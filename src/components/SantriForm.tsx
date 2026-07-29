import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Santri } from '../types';
import * as XLSX from 'xlsx';
import { 
  UserPlus, 
  FileSpreadsheet, 
  Upload, 
  Save, 
  CheckCircle, 
  AlertCircle,
  Download,
  User,
  Home,
  Users,
  Building
} from 'lucide-react';

export default function SantriForm() {
  // State untuk mode tampilan: 'manual' atau 'import'
  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State untuk Form Manual
  const [formData, setFormData] = useState<Partial<Santri>>({
    nama_lengkap: '',
    nis: '',
    nisn: '',
    nik: '',
    jenis_kelamin: 'Laki-laki',
    tempat_lahir: '',
    tanggal_lahir: '',
    no_hp_santri: '',
    kelas: '',
    asrama: '',
    status: 'Aktif',
    tanggal_masuk: new Date().toISOString().split('T')[0],
    alamat_jalan: '',
    desa_kelurahan: '',
    kecamatan: '',
    kabupaten_kota: '',
    provinsi: '',
    kode_pos: '',
    nama_ayah: '',
    pekerjaan_ayah: '',
    nama_ibu: '',
    pekerjaan_ibu: '',
    nama_wali: '',
    no_hp_wali: '',
  });

  // State untuk Import Excel
  const [excelData, setExcelData] = useState<Partial<Santri>[]>([]);
  const [fileName, setFileName] = useState<string>('');

  // Handle Perubahan Input Manual
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit Data Manual ke Supabase
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_lengkap) {
      setMessage({ type: 'error', text: 'Nama Lengkap wajib diisi!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Buat kode unik otomatis jika tidak ada
      const kodeUnik = 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error } = await supabase.from('santri').insert([
        {
          ...formData,
          kode_unik: kodeUnik,
        },
      ]);

      if (error) throw error;

      setMessage({ type: 'success', text: `Data santri "${formData.nama_lengkap}" berhasil disimpan!` });
      // Reset Form
      setFormData({
        nama_lengkap: '',
        nis: '',
        nisn: '',
        nik: '',
        jenis_kelamin: 'Laki-laki',
        tempat_lahir: '',
        tanggal_lahir: '',
        no_hp_santri: '',
        kelas: '',
        asrama: '',
        status: 'Aktif',
        tanggal_masuk: new Date().toISOString().split('T')[0],
        alamat_jalan: '',
        desa_kelurahan: '',
        kecamatan: '',
        kabupaten_kota: '',
        provinsi: '',
        kode_pos: '',
        nama_ayah: '',
        pekerjaan_ayah: '',
        nama_ibu: '',
        pekerjaan_ibu: '',
        nama_wali: '',
        no_hp_wali: '',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menyimpan data santri.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Baca File Excel / CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        // Petakan data dari Excel ke struktur tabel 'santri'
        const parsedSantri: Partial<Santri>[] = data.map((item) => ({
          nama_lengkap: item['Nama Lengkap'] || item['nama_lengkap'] || item['Nama'] || '',
          nis: item['NIS'] ? String(item['NIS']) : null,
          nisn: item['NISN'] ? String(item['NISN']) : null,
          nik: item['NIK'] ? String(item['NIK']) : null,
          jenis_kelamin: item['Jenis Kelamin'] || item['jenis_kelamin'] || 'Laki-laki',
          tempat_lahir: item['Tempat Lahir'] || item['tempat_lahir'] || null,
          tanggal_lahir: item['Tanggal Lahir'] || item['tanggal_lahir'] || null,
          kelas: item['Kelas'] || item['kelas'] || null,
          asrama: item['Asrama'] || item['asrama'] || null,
          no_hp_wali: item['No HP Wali'] || item['no_hp_wali'] || item['Phone'] || null,
          no_hp_santri: item['No HP Santri'] || item['no_hp_santri'] || null,
          alamat_jalan: item['Alamat'] || item['alamat_jalan'] || null,
          desa_kelurahan: item['Desa/Kelurahan'] || item['desa_kelurahan'] || null,
          kecamatan: item['Kecamatan'] || item['kecamatan'] || null,
          kabupaten_kota: item['Kabupaten/Kota'] || item['kabupaten_kota'] || null,
          provinsi: item['Provinsi'] || item['provinsi'] || null,
          nama_ayah: item['Nama Ayah'] || item['nama_ayah'] || null,
          nama_ibu: item['Nama Ibu'] || item['nama_ibu'] || null,
          nama_wali: item['Nama Wali'] || item['nama_wali'] || null,
          status: item['Status'] || 'Aktif',
          kode_unik: item['Kode Unik'] || 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        })).filter(s => s.nama_lengkap.trim() !== '');

        setExcelData(parsedSantri);
        setMessage({ type: 'success', text: `Berhasil membaca ${parsedSantri.length} data dari file "${file.name}".` });
      } catch (err) {
        setMessage({ type: 'error', text: 'Format file tidak valid atau gagal dibaca.' });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit Import Excel ke Supabase
  const handleSubmitImport = async () => {
    if (excelData.length === 0) {
      setMessage({ type: 'error', text: 'Belum ada data spreadsheet yang diunggah!' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.from('santri').insert(excelData);

      if (error) throw error;

      setMessage({ type: 'success', text: `Berhasil mengimpor ${excelData.length} data santri ke database!` });
      setExcelData([]);
      setFileName('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengimpor data massal.' });
    } finally {
      setLoading(false);
    }
  };

  // Download Template Excel
  const downloadTemplate = () => {
    const templateData = [
      {
        'Nama Lengkap': 'Ahmad Fauzi',
        'NIS': '2026001',
        'NISN': '0051234567',
        'NIK': '3321012345670001',
        'Jenis Kelamin': 'Laki-laki',
        'Tempat Lahir': 'Demak',
        'Tanggal Lahir': '2010-05-15',
        'Kelas': 'Kelas 7A',
        'Asrama': 'Wetan',
        'No HP Wali': '081234567890',
        'No HP Santri': '089876543210',
        'Alamat': 'Jl. Pesantren No. 12',
        'Desa/Kelurahan': 'Bintoro',
        'Kecamatan': 'Demak',
        'Kabupaten/Kota': 'Demak',
        'Provinsi': 'Jawa Tengah',
        'Nama Ayah': 'Bapak Supardi',
        'Nama Ibu': 'Ibu Siti Khadijah',
        'Nama Wali': 'Bapak Supardi',
        'Status': 'Aktif'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Santri');
    XLSX.writeFile(workbook, 'Template_Import_SantriVa.xlsx');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 bg-white shadow-xl rounded-2xl border border-gray-100 my-6">
      {/* Header Modal & Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-emerald-600" />
            Tambah Data Santri Baru
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Buku Induk Santri & Siswa Madrasah Terpadu
          </p>
        </div>

        {/* Tab Pilihan Mode */}
        <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => { setMode('manual'); setMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'manual'
                ? 'bg-white text-emerald-700 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" />
            Input Manual
          </button>

          <button
            type="button"
            onClick={() => { setMode('import'); setMessage(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === 'import'
                ? 'bg-white text-emerald-700 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </button>
        </div>
      </div>

      {/* Alert Notifikasi Status */}
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
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* MODE 1: FORM INPUT MANUAL */}
      {mode === 'manual' && (
        <form onSubmit={handleSubmitManual} className="mt-6 space-y-8">
          {/* SEKSI 1: IDENTITAS UTAMA */}
          <div>
            <h3 className="text-base font-semibold text-emerald-800 border-l-4 border-emerald-600 pl-3 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Data Identitas Santri / Siswa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nama_lengkap"
                  value={formData.nama_lengkap || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Ahmad Fauzi Rahmat"
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Kelamin</label>
                <select
                  name="jenis_kelamin"
                  value={formData.jenis_kelamin || 'Laki-laki'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">NIS (Nomor Induk Santri)</label>
                <input
                  type="text"
                  name="nis"
                  value={formData.nis || ''}
                  onChange={handleChange}
                  placeholder="2026001"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">NISN (Nasional)</label>
                <input
                  type="text"
                  name="nisn"
                  value={formData.nisn || ''}
                  onChange={handleChange}
                  placeholder="0051234567"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">NIK (Kartu Keluarga)</label>
                <input
                  type="text"
                  name="nik"
                  value={formData.nik || ''}
                  onChange={handleChange}
                  placeholder="3321012345670001"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  name="tempat_lahir"
                  value={formData.tempat_lahir || ''}
                  onChange={handleChange}
                  placeholder="Demak"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  name="tanggal_lahir"
                  value={formData.tanggal_lahir || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">No. HP Santri</label>
                <input
                  type="text"
                  name="no_hp_santri"
                  value={formData.no_hp_santri || ''}
                  onChange={handleChange}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEKSI 2: AKADEMIK & PONDOK */}
          <div>
            <h3 className="text-base font-semibold text-emerald-800 border-l-4 border-emerald-600 pl-3 mb-4 flex items-center gap-2">
              <Building className="w-4 h-4" /> Data Akademik & Pondok
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kelas</label>
                <input
                  type="text"
                  name="kelas"
                  value={formData.kelas || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Kelas 7A, Kelas 12"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Asrama / Komplek</label>
                <input
                  type="text"
                  name="asrama"
                  value={formData.asrama || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Wetan, Kulon, Putri Kidul"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Santri</label>
                <select
                  name="status"
                  value={formData.status || 'Aktif'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Alumni/Lulus">Alumni / Lulus</option>
                  <option value="Pindah">Pindah</option>
                  <option value="Keluar">Keluar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Masuk</label>
                <input
                  type="date"
                  name="tanggal_masuk"
                  value={formData.tanggal_masuk || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEKSI 3: ALAMAT LENGKAP */}
          <div>
            <h3 className="text-base font-semibold text-emerald-800 border-l-4 border-emerald-600 pl-3 mb-4 flex items-center gap-2">
              <Home className="w-4 h-4" /> Alamat Tempat Tinggal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Jalan / RT / RW / Dusun</label>
                <input
                  type="text"
                  name="alamat_jalan"
                  value={formData.alamat_jalan || ''}
                  onChange={handleChange}
                  placeholder="Jl. Raya Kauman No. 45 RT 02/01"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Desa / Kelurahan</label>
                <input
                  type="text"
                  name="desa_kelurahan"
                  value={formData.desa_kelurahan || ''}
                  onChange={handleChange}
                  placeholder="Bintoro"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kecamatan</label>
                <input
                  type="text"
                  name="kecamatan"
                  value={formData.kecamatan || ''}
                  onChange={handleChange}
                  placeholder="Demak"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kabupaten / Kota</label>
                <input
                  type="text"
                  name="kabupaten_kota"
                  value={formData.kabupaten_kota || ''}
                  onChange={handleChange}
                  placeholder="Demak"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Provinsi</label>
                <input
                  type="text"
                  name="provinsi"
                  value={formData.provinsi || ''}
                  onChange={handleChange}
                  placeholder="Jawa Tengah"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kode Pos</label>
                <input
                  type="text"
                  name="kode_pos"
                  value={formData.kode_pos || ''}
                  onChange={handleChange}
                  placeholder="59511"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEKSI 4: DATA ORANG TUA / WALI */}
          <div>
            <h3 className="text-base font-semibold text-emerald-800 border-l-4 border-emerald-600 pl-3 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Data Orang Tua & Wali
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Ayah</label>
                <input
                  type="text"
                  name="nama_ayah"
                  value={formData.nama_ayah || ''}
                  onChange={handleChange}
                  placeholder="Nama Ayah Kandung"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pekerjaan Ayah</label>
                <input
                  type="text"
                  name="pekerjaan_ayah"
                  value={formData.pekerjaan_ayah || ''}
                  onChange={handleChange}
                  placeholder="Wiraswasta / PNS / Petani"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Ibu</label>
                <input
                  type="text"
                  name="nama_ibu"
                  value={formData.nama_ibu || ''}
                  onChange={handleChange}
                  placeholder="Nama Ibu Kandung"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pekerjaan Ibu</label>
                <input
                  type="text"
                  name="pekerjaan_ibu"
                  value={formData.pekerjaan_ibu || ''}
                  onChange={handleChange}
                  placeholder="Ibu Rumah Tangga / Guru"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Wali</label>
                <input
                  type="text"
                  name="nama_wali"
                  value={formData.nama_wali || ''}
                  onChange={handleChange}
                  placeholder="Kosongkan jika sama dengan Ayah/Ibu"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  No. HP Wali (Utama Notifikasi WA)
                </label>
                <input
                  type="text"
                  name="no_hp_wali"
                  value={formData.no_hp_wali || ''}
                  onChange={handleChange}
                  placeholder="081234567890 (Gunakan format HP)"
                  className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-emerald-50/30"
                />
              </div>
            </div>
          </div>

          {/* Tombol Simpan Manual */}
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Menyimpan...' : 'Simpan Data Santri'}
            </button>
          </div>
        </form>
      )}

      {/* MODE 2: IMPORT EXCEL / SPREADSHEET */}
      {mode === 'import' && (
        <div className="mt-6 space-y-6">
          {/* Box Area Unggah File */}
          <div className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-8 text-center bg-gray-50/50 transition-all">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              Pilih File Spreadsheet (.xlsx, .xls, atau .csv)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Unggah file data santri dari komputer atau perangkat Anda
            </p>

            <div className="flex flex-wrap justify-center items-center gap-3">
              <label className="cursor-pointer px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-md transition-all">
                Pilih File
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium text-sm rounded-xl transition-all"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Unduh Template Format
              </button>
            </div>

            {fileName && (
              <div className="mt-4 inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                File terpilih: {fileName}
              </div>
            )}
          </div>

          {/* Tabel Preview Data Excel yang siap diimport */}
          {excelData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-800">
                  Preview Data Terbaca ({excelData.length} Santri)
                </h4>
                <button
                  type="button"
                  onClick={handleSubmitImport}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Mengimpor...' : 'Impor Semua Data ke Supabase'}
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left text-gray-600">
                  <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Nama Lengkap</th>
                      <th className="p-3">NIS</th>
                      <th className="p-3">Kelas</th>
                      <th className="p-3">Asrama</th>
                      <th className="p-3">No. HP Wali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {excelData.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold">{i + 1}</td>
                        <td className="p-3 font-medium text-gray-900">{s.nama_lengkap}</td>
                        <td className="p-3">{s.nis || '-'}</td>
                        <td className="p-3">{s.kelas || '-'}</td>
                        <td className="p-3">{s.asrama || '-'}</td>
                        <td className="p-3">{s.no_hp_wali || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}