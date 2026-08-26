import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  User, Calendar, CreditCard, Award, FileText, Save, CheckCircle2, 
  AlertTriangle, ShieldCheck, BookOpen, Edit, Camera, Clock, X
} from 'lucide-react';

export default function PortalSantri() {
  const { kode } = useParams<{ kode: string }>();

  const [activeTab, setActiveTab] = useState<'profil' | 'kegiatan' | 'keuangan' | 'prestasi'>('profil');
  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Data Laporan
  const [logs, setLogs] = useState<any[]>([]);
  const [catatanList, setCatatanList] = useState<any[]>([]);
  const [prestasiList, setPrestasiList] = useState<any[]>([]);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  
  // Form Usulan Perubahan Data
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!kode) { setLoading(false); return; }

    const fetchPortalData = async () => {
      setLoading(true);
      try {
        let sData = null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidRegex.test(kode)) {
          const { data } = await supabase.from('santri').select('*').eq('id', kode).maybeSingle();
          sData = data;
        }
        if (!sData) {
          const { data } = await supabase.from('santri').select('*').eq('kode_unik', kode).maybeSingle();
          sData = data;
        }
        if (!sData) {
          const { data } = await supabase.from('santri').select('*').eq('nis', kode).maybeSingle();
          sData = data;
        }

        if (!sData) throw new Error('Data santri tidak ditemukan.');
        
        setSantri(sData);
        initForm(sData);

        // Cek usulan yang masih menunggu (Pending)
        const { count } = await supabase
          .from('pengajuan_santri')
          .select('*', { count: 'exact', head: true })
          .eq('santri_id', sData.id)
          .eq('status_pengajuan', 'Menunggu');
        
        setHasPendingRequest((count || 0) > 0);

        // Fetch Log Kedisiplinan
        const { data: logData } = await supabase
          .from('log_pelanggaran')
          .select('*, master_jenis(nama)')
          .eq('santri_id', sData.id)
          .order('tgl_melanggar', { ascending: false });
        setLogs(logData || []);

        // Fetch Catatan & Prestasi (Diperbaiki: Menggunakan created_at)
        const { data: catData, error: catError } = await supabase
          .from('santri_catatan')
          .select('*')
          .eq('nama', sData.nama_lengkap);
          
        if (catError) console.warn("Gagal ambil catatan:", catError.message);
        setCatatanList(catData || []);

        // Fetch Prestasi (Tanpa order agar tidak error 400)
        const { data: presData, error: presError } = await supabase
          .from('santri_prestasi')
          .select('*')
          .eq('nama', sData.nama_lengkap);
          
        if (presError) console.warn("Gagal ambil prestasi:", presError.message);
        setPrestasiList(presData || []);

      } catch (err: any) {
        console.error("Gagal memuat portal:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [kode]);

  const initForm = (data: any) => {
    setEditForm({
      nama_lengkap: data.nama_lengkap || '',
      tempat_lahir: data.tempat_lahir || '',
      tanggal_lahir: data.tanggal_lahir || '',
      jenis_kelamin: data.jenis_kelamin || 'Laki-laki',
      nama_ayah: data.nama_ayah || '',
      nama_ibu: data.nama_ibu || '',
      nama_wali: data.nama_wali || '',
      no_hp_wali: data.no_hp_wali || '',
      alamat_jalan: data.alamat_jalan || '',
      desa_kelurahan: data.desa_kelurahan || '',
      kecamatan: data.kecamatan || '',
      kabupaten_kota: data.kabupaten_kota || '',
      foto_profil: data.foto_profil || ''
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setEditForm({ ...editForm, foto_profil: compressedBase64 });
      };
    };
  };

  const handleSubmitUsulan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!santri) return;
    setIsSaving(true);
    
    try {
      // Diperbaiki: Menggunakan key 'data_pengajuan' sesuai database Anda
      const payload = {
        santri_id: santri.id,
        nama_santri: santri.nama_lengkap,
        status_pengajuan: 'Menunggu',
        data_pengajuan: editForm 
      };

      const { error } = await supabase.from('pengajuan_santri').insert([payload]);

      if (error) throw error;
      
      setSavedSuccess(true);
      setHasPendingRequest(true);
      setIsEditing(false);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err: any) {
      alert('Gagal mengirim usulan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-emerald-900 font-bold tracking-wide">Menyiapkan Portal...</p>
        </div>
      </div>
    );
  }

  if (!santri) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-emerald-900/5 max-w-md w-full text-center space-y-4 border border-emerald-100">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-black text-emerald-900">Akses Tidak Ditemukan</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Link portal mungkin telah kedaluwarsa atau terjadi pembaruan sistem. Mohon hubungi admin Daruttauhid Al-'Alawiyyah Jepara.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12 font-sans selection:bg-amber-200">
      
      {/* HEADER: Keselarasan Logo (Emerald & Gold) */}
      <div className="bg-gradient-to-b from-[#064e3b] to-emerald-900 text-white pt-12 pb-24 px-4 sm:px-6 shadow-2xl relative overflow-hidden border-b-4 border-amber-500">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-emerald-400 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center text-center space-y-5">
          <img 
            src="/logo.jpg" 
            alt="Logo Daruttauhid Al-'Alawiyyah" 
            className="w-24 h-24 rounded-full border-4 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] object-cover bg-white"
            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=Logo'; }} 
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-amber-50 drop-shadow-md">
              Sistem Informasi Manajemen
            </h1>
            <p className="text-amber-400 font-bold text-sm sm:text-base tracking-widest uppercase">
              Daruttauhid Al-'Alawiyyah Jepara
            </p>
          </div>
        </div>
      </div>

      {/* PROFIL CARD OVERLAPPING HEADER */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-12 relative z-20 mb-8">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-emerald-900/10 border-2 border-emerald-50 p-6 flex flex-col sm:flex-row items-center gap-6 backdrop-blur-xl">
          <div className="relative">
            {santri.foto_profil ? (
              <img src={santri.foto_profil} alt="Foto Profil" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-amber-100 shadow-md" />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-emerald-50 text-emerald-800 border-4 border-amber-100 flex items-center justify-center text-4xl font-black shadow-md">
                {santri.nama_lengkap.charAt(0)}
              </div>
            )}
            <span className="absolute bottom-1 right-1 bg-amber-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
              <ShieldCheck className="w-5 h-5" />
            </span>
          </div>
          
          <div className="text-center sm:text-left flex-1">
            <p className="text-sm font-bold text-amber-600 mb-1">Assalamu'alaikum, Wali dari</p>
            <h2 className="text-2xl font-black text-emerald-950 leading-tight">{santri.nama_lengkap}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">NIS: {santri.nis || '-'}</span>
              <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">Kelas: {santri.kelas || '-'}</span>
              <span className="bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">Asrama: {santri.asrama || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* TABS MENU */}
        <div className="bg-white rounded-2xl shadow-sm p-1.5 flex overflow-x-auto scrollbar-hide border border-emerald-100 mb-6 sticky top-4 z-30">
          {[
            { id: 'profil', label: 'Data & Profil', icon: User },
            { id: 'kegiatan', label: 'Kedisiplinan', icon: BookOpen, badge: logs.length },
            { id: 'keuangan', label: 'Keuangan', icon: CreditCard },
            { id: 'prestasi', label: 'Catatan', icon: Award }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-900/20' 
                  : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
              {tab.badge ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-amber-400 text-emerald-900' : 'bg-amber-100 text-amber-700'}`}>{tab.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* NOTIFIKASI SUKSES / PENDING */}
        {savedSuccess && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
            <div className="bg-emerald-100 p-2 rounded-full"><CheckCircle2 className="w-5 h-5 text-emerald-700" /></div>
            Alhamdulillah, usulan perubahan data berhasil dikirim dan sedang menunggu tinjauan pengurus.
          </div>
        )}

        {/* TAB 1: DATA DIRI & USULAN PERUBAHAN */}
        {activeTab === 'profil' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {!isEditing ? (
              <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 p-6 sm:p-8 space-y-6 relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-gray-100 pb-5">
                  <div>
                    <h3 className="text-xl font-bold text-emerald-950">Data Administrasi Santri</h3>
                    <p className="text-xs text-gray-500 mt-1">Data resmi yang terdaftar di database Daruttauhid</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                  <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Nama Lengkap</p><p className="font-bold text-gray-800 text-base">{santri.nama_lengkap}</p></div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Tempat, Tanggal Lahir</p><p className="font-bold text-gray-800">{santri.tempat_lahir || '-'}, {santri.tanggal_lahir ? new Date(santri.tanggal_lahir).toLocaleDateString('id-ID') : '-'}</p></div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Nama Orang Tua</p><p className="font-bold text-gray-800">Ayah: {santri.nama_ayah || '-'} <br/>Ibu: {santri.nama_ibu || '-'}</p></div>
                  <div><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Kontak Wali</p><p className="font-bold text-gray-800">{santri.nama_wali || 'Belum diatur'}<br/><span className="text-emerald-700">{santri.no_hp_wali || 'Belum ada nomor WA'}</span></p></div>
                  <div className="sm:col-span-2"><p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Alamat Lengkap</p><p className="font-bold text-gray-800 leading-relaxed">{santri.alamat_jalan || '-'}, {santri.desa_kelurahan || ''}, Kec. {santri.kecamatan || ''}, {santri.kabupaten_kota || ''}</p></div>
                </div>

                <div className="pt-6 mt-2 border-t border-gray-100">
                  {hasPendingRequest ? (
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-center justify-between text-sm border border-amber-200">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                        <span className="font-bold">Usulan perubahan data sedang dalam antrean validasi pengurus.</span>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm">
                      <Edit className="w-4 h-4"/> Usulkan Perbaikan / Pembaruan Data
                    </button>
                  )}
                </div>
              </div>
            ) : (
              
              /* FORM USULAN PERUBAHAN */
              <form onSubmit={handleSubmitUsulan} className="bg-white rounded-[2rem] shadow-xl shadow-emerald-900/10 border border-amber-200 p-6 sm:p-8 space-y-6 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start border-b border-gray-100 pb-5">
                  <div>
                    <h3 className="text-xl font-black text-emerald-900 flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-amber-500" /> Form Pembaruan Data
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">Silakan perbaiki data. Hanya "Nama Lengkap" dan "Alamat Lengkap" yang wajib diisi.</p>
                  </div>
                  <button type="button" onClick={() => {setIsEditing(false); initForm(santri);}} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>

                {/* Upload Foto Profil Ringan */}
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#FDFBF7] p-6 rounded-2xl border border-amber-100">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                     {editForm.foto_profil ? (
                        <img src={editForm.foto_profil} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-80 transition-opacity" />
                     ) : (
                        <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border-4 border-white shadow-md group-hover:bg-emerald-200 transition-colors">
                          <Camera className="w-8 h-8" />
                        </div>
                     )}
                     <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Camera className="w-6 h-6 text-white" />
                     </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <h4 className="font-bold text-emerald-950 text-sm">Foto Profil Santri</h4>
                    <p className="text-xs text-gray-500 mt-1 mb-3">Format JPG/PNG. Otomatis dikompres agar kuota tetap hemat.</p>
                    <input type="file" id="foto_profil" name="foto_profil" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold bg-white border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg hover:bg-emerald-50 shadow-sm">Pilih Foto...</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label htmlFor="nama_lengkap" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Nama Lengkap Sesuai KK <span className="text-red-500">*</span></label>
                    <input id="nama_lengkap" name="nama_lengkap" required type="text" value={editForm.nama_lengkap} onChange={e => setEditForm({...editForm, nama_lengkap: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label htmlFor="tempat_lahir" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Tempat Lahir</label>
                    <input id="tempat_lahir" name="tempat_lahir" type="text" value={editForm.tempat_lahir} onChange={e => setEditForm({...editForm, tempat_lahir: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label htmlFor="tanggal_lahir" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Tanggal Lahir</label>
                    <input id="tanggal_lahir" name="tanggal_lahir" type="date" value={editForm.tanggal_lahir} onChange={e => setEditForm({...editForm, tanggal_lahir: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  
                  <div className="sm:col-span-2 pt-2 pb-1 border-b border-gray-100"><h4 className="font-bold text-emerald-800">Informasi Orang Tua / Wali</h4></div>
                  <div>
                    <label htmlFor="nama_ayah" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Nama Ayah</label>
                    <input id="nama_ayah" name="nama_ayah" type="text" value={editForm.nama_ayah} onChange={e => setEditForm({...editForm, nama_ayah: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label htmlFor="nama_ibu" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Nama Ibu</label>
                    <input id="nama_ibu" name="nama_ibu" type="text" value={editForm.nama_ibu} onChange={e => setEditForm({...editForm, nama_ibu: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label htmlFor="nama_wali" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Nama Wali (Utama)</label>
                    <input id="nama_wali" name="nama_wali" type="text" value={editForm.nama_wali} onChange={e => setEditForm({...editForm, nama_wali: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" placeholder="Nama pengasuh/wali aktif" />
                  </div>
                  <div>
                    <label htmlFor="no_hp_wali" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">No. WhatsApp Wali</label>
                    <input id="no_hp_wali" name="no_hp_wali" type="text" value={editForm.no_hp_wali} onChange={e => setEditForm({...editForm, no_hp_wali: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" placeholder="08123xxxx" />
                  </div>
                  
                  <div className="sm:col-span-2 pt-2 pb-1 border-b border-gray-100"><h4 className="font-bold text-emerald-800">Alamat Rumah Lengkap</h4></div>
                  <div className="sm:col-span-2">
                    <label htmlFor="alamat_jalan" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Jalan / Dusun / RT / RW <span className="text-red-500">*</span></label>
                    <input id="alamat_jalan" name="alamat_jalan" required type="text" value={editForm.alamat_jalan} onChange={e => setEditForm({...editForm, alamat_jalan: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label htmlFor="desa_kelurahan" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Desa / Kelurahan</label>
                    <input id="desa_kelurahan" name="desa_kelurahan" type="text" value={editForm.desa_kelurahan} onChange={e => setEditForm({...editForm, desa_kelurahan: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label htmlFor="kecamatan" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Kecamatan</label>
                    <input id="kecamatan" name="kecamatan" type="text" value={editForm.kecamatan} onChange={e => setEditForm({...editForm, kecamatan: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                  <div>
                    <label htmlFor="kabupaten_kota" className="block text-xs font-bold text-emerald-900 mb-1.5 uppercase tracking-wide">Kabupaten / Kota</label>
                    <input id="kabupaten_kota" name="kabupaten_kota" type="text" value={editForm.kabupaten_kota} onChange={e => setEditForm({...editForm, kabupaten_kota: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                  <button type="button" onClick={() => {setIsEditing(false); initForm(santri);}} className="py-3 px-6 rounded-xl font-bold text-emerald-900 bg-amber-100 hover:bg-amber-200 transition-colors text-sm">Batalkan</button>
                  <button type="submit" disabled={isSaving} className="py-3 px-6 rounded-xl font-bold text-white bg-emerald-800 hover:bg-emerald-900 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all text-sm disabled:opacity-70">
                    <Save className="w-4 h-4" /> {isSaving ? 'Mengirim Usulan...' : 'Kirim Usulan Perbaikan'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Kedisiplinan */}
        {activeTab === 'kegiatan' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 p-6 sm:p-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
              <div><h3 className="text-xl font-bold text-emerald-950">Catatan Kedisiplinan</h3><p className="text-xs text-gray-500 mt-1">Kehadiran & Pelanggaran</p></div>
              <span className="bg-amber-100 text-amber-900 font-bold text-xs px-4 py-1.5 rounded-full border border-amber-300">Total: {logs.length}</span>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-16 bg-[#FDFBF7] rounded-2xl border border-dashed border-emerald-300">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-700" /></div>
                <p className="font-bold text-emerald-900 text-lg">Alhamdulillah, Sangat Disiplin!</p>
                <p className="text-sm text-gray-500 mt-1">Ananda belum memiliki catatan pelanggaran.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="p-5 rounded-2xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-amber-300 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${log.status_tazir === 'Sudah' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{log.status_tazir === 'Sudah' ? 'Telah Ditakzir' : 'Belum Ditakzir'}</span>
                        <span className="font-bold text-emerald-950">{log.master_jenis?.nama || log.jenis || 'Kegiatan'}</span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5 font-medium"><Calendar className="w-3.5 h-3.5 text-amber-500" /> {new Date(log.tgl_melanggar || log.tglMelanggar).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      {log.keterangan && <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded-lg border border-gray-200 italic">"{log.keterangan}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Keuangan */}
        {activeTab === 'keuangan' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 p-6 sm:p-8 space-y-6 animate-in fade-in duration-500">
            <div><h3 className="text-xl font-bold text-emerald-950">Laporan Keuangan</h3><p className="text-xs text-gray-500 mt-1">Informasi syahriah & tagihan</p></div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-amber-200 p-6 rounded-[1.5rem] flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-white px-2 py-1 rounded-md shadow-sm border border-emerald-100">Bulan Ini</span>
                <h4 className="text-2xl font-black text-emerald-950 mt-3">Lunas Tanpa Tunggakan</h4>
                <p className="text-sm text-emerald-800 mt-1 font-medium">Terima kasih telah menunaikan kewajiban tepat waktu.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Prestasi & Catatan (Ditampilkan Keduanya) */}
        {activeTab === 'prestasi' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-emerald-950 mb-6 flex items-center gap-2"><Award className="w-6 h-6 text-amber-500" /> Prestasi Ananda</h3>
              {prestasiList.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-[#FDFBF7] p-4 rounded-xl text-center border border-gray-200">Belum ada catatan yang terekam.</p>
              ) : (
                <div className="space-y-3">{prestasiList.map((p: any) => (<div key={p.id} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200"><p className="font-bold text-emerald-900">{p.prestasi}</p><p className="text-xs text-amber-700 mt-1">{new Date(p.created_at || p.createdAt).toLocaleDateString('id-ID')}</p></div>))}</div>
              )}
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-emerald-100 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-emerald-950 mb-6 flex items-center gap-2"><FileText className="w-6 h-6 text-blue-500" /> Catatan Perkembangan</h3>
              {catatanList.length === 0 ? (
                <p className="text-sm text-gray-500 italic bg-[#FDFBF7] p-4 rounded-xl text-center border border-gray-200">Belum ada catatan khusus dari pengurus.</p>
              ) : (
                <div className="space-y-3">
                  {catatanList.map((c: any) => (
                    <div key={c.id} className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                      <p className="font-medium text-blue-950">"{c.isi}"</p>
                      <p className="text-xs text-blue-700 mt-1">{new Date(c.created_at || c.createdAt).toLocaleDateString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-500 font-medium pb-8">
          Sistem Informasi Manajemen &copy; {new Date().getFullYear()} <br/>
          <span className="font-bold text-emerald-900">Daruttauhid Al-'Alawiyyah Jepara</span>
        </div>
      </div>
    </div>
  );
}