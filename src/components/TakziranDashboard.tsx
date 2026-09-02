import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { supabase } from '../lib/supabase';
import { getTakziranStudents } from '../lib/securityApi';
import type { TakziranStudentSummary } from '../types/security';
import { PenTool, History, Settings, Search, Calendar, FileText, CheckCircle, Save, Plus, Trash2, CheckSquare, Square, ShieldAlert, AlertCircle, UserSearch } from 'lucide-react';

const getTodayDate = () => new Date().toISOString().split('T')[0];
const getCurrentMonth = () => new Date().toISOString().slice(0, 7); 

const SantriCard = memo(({ santri, isSelected, onToggle }: { santri: any, isSelected: boolean, onToggle: (id: string) => void }) => {
  return (
    <div 
      onClick={() => onToggle(santri.id)}
      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
        isSelected ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-white border-gray-100 hover:border-emerald-200 shadow-sm'
      }`}
    >
      <div className={`${isSelected ? 'text-emerald-600' : 'text-gray-300'}`}>
        {isSelected ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
      </div>
      <div>
        <h4 className={`font-bold ${isSelected ? 'text-emerald-900' : 'text-gray-700'}`}>{santri.nama_lengkap}</h4>
        <p className="text-xs text-gray-500">Kelas: {santri.kelas || '-'} | Asrama: {santri.asrama || '-'}</p>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.isSelected === nextProps.isSelected);

export default function TakziranDashboard() {
  const [activeTab, setActiveTab] = useState<'input' | 'riwayat' | 'takziran' | 'pengaturan'>('input');
  const [notification, setNotification] = useState<{type: 'success'|'error', msg: string} | null>(null);

  const [jenisList, setJenisList] = useState<any[]>([]);
  const [santriList, setSantriList] = useState<TakziranStudentSummary[]>([]);
  const [tunggakanList, setTunggakanList] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ jenis_id: '', tgl_melanggar: getTodayDate(), keterangan: '' });
  const [selectedSantri, setSelectedSantri] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  
  const [searchTunggakan, setSearchTunggakan] = useState(''); 

  const [newJenisNama, setNewJenisNama] = useState('');
  const [isAddingJenis, setIsAddingJenis] = useState(false);

  const [riwayatSantriId, setRiwayatSantriId] = useState<string>('');
  const [riwayatMonth, setRiwayatMonth] = useState<string>(getCurrentMonth());
  const [riwayatLogs, setRiwayatLogs] = useState<any[]>([]);
  const [isFetchingRiwayat, setIsFetchingRiwayat] = useState(false);

  const fetchTunggakan = async () => {
    const { data } = await supabase
      .from('log_pelanggaran')
      .select(`id, tgl_melanggar, keterangan, status_tazir, santri(id, nama_lengkap, kelas, asrama), master_jenis(id, nama)`)
      .eq('status_tazir', 'Belum')
      .order('tgl_melanggar', { ascending: true });
    setTunggakanList(data || []);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      const [{ data: jenis }, santri] = await Promise.all([
        supabase.from('master_jenis').select('*').order('nama'),
        getTakziranStudents(null),
      ]);
      setJenisList(jenis || []);
      setSantriList(santri);

      fetchTunggakan();
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!riwayatSantriId || !riwayatMonth) {
      setRiwayatLogs([]);
      return;
    }
    const fetchRiwayat = async () => {
      setIsFetchingRiwayat(true);
      const [year, month] = riwayatMonth.split('-');
      const startDate = `${riwayatMonth}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const { data } = await supabase
        .from('log_pelanggaran')
        .select('*')
        .eq('santri_id', riwayatSantriId)
        .gte('tgl_melanggar', startDate)
        .lte('tgl_melanggar', endDate);
      
      setRiwayatLogs(data || []);
      setIsFetchingRiwayat(false);
    };
    fetchRiwayat();
  }, [riwayatSantriId, riwayatMonth]);

  const calendarDays = useMemo(() => {
    if (!riwayatMonth) return [];
    const [year, month] = riwayatMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [riwayatMonth]);

  const getRiwayatLog = useCallback((jenisId: string, day: number) => {
    const dateStr = `${riwayatMonth}-${String(day).padStart(2, '0')}`;
    return riwayatLogs.find(l => l.jenis_id === jenisId && l.tgl_melanggar === dateStr);
  }, [riwayatMonth, riwayatLogs]);


  const filteredSantri = useMemo(() => {
    return santriList.filter(s => {
      const matchName = s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase());
      const matchKelas = filterKelas ? s.kelas === filterKelas : true;
      return matchName && matchKelas;
    });
  }, [santriList, searchQuery, filterKelas]);
  const listKelas = useMemo(() => Array.from(new Set(santriList.map(s => s.kelas).filter(Boolean))), [santriList]);
  const selectedCount = useMemo(() => Object.values(selectedSantri).filter(Boolean).length, [selectedSantri]);

  const groupedTunggakan = useMemo(() => {
    const groups: Record<string, { santri: any, logs: any[] }> = {};
    tunggakanList.forEach(log => {
      if (!log.santri) return;
      if (!groups[log.santri.id]) groups[log.santri.id] = { santri: log.santri, logs: [] };
      groups[log.santri.id].logs.push(log);
    });
    return Object.values(groups).filter(g => 
      g.santri.nama_lengkap.toLowerCase().includes(searchTunggakan.toLowerCase())
    );
  }, [tunggakanList, searchTunggakan]);

  const handleToggleSantri = useCallback((id: string) => {
    setSelectedSantri(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSubmitMassal = async () => {
    if (!formData.jenis_id) return setNotification({ type: 'error', msg: 'Pilih jenis kegiatan/pelanggaran!' });
    if (selectedCount === 0) return setNotification({ type: 'error', msg: 'Pilih minimal 1 santri!' });
    setIsSubmitting(true);
    try {
      const payload = Object.keys(selectedSantri).filter(id => selectedSantri[id]).map(id => ({
        santri_id: id, jenis_id: formData.jenis_id, tgl_melanggar: formData.tgl_melanggar,
        keterangan: formData.keterangan || null, status_tazir: 'Belum', input_by: 'Petugas'
      }));
      const { error } = await supabase.from('log_pelanggaran').insert(payload);
      if (error) throw error;

      setNotification({ type: 'success', msg: `Berhasil mencatat ${selectedCount} santri!` });
      setSelectedSantri({}); 
      setFormData(prev => ({...prev, keterangan: ''})); 
      fetchTunggakan();
      if(riwayatSantriId) setRiwayatMonth(prev => prev); 
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', msg: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelesaikanTakziran = async (logId: string) => {
    setTunggakanList(prev => prev.filter(log => log.id !== logId));
    await supabase.from('log_pelanggaran').update({ status_tazir: 'Sudah' }).eq('id', logId);
  };

  const handleSelesaikanSemua = async (logs: any[]) => {
    if(!confirm('Tandai semua pelanggaran santri ini sudah ditakzir?')) return;
    const logIds = logs.map(l => l.id);
    setTunggakanList(prev => prev.filter(log => !logIds.includes(log.id)));
    await supabase.from('log_pelanggaran').update({ status_tazir: 'Sudah' }).in('id', logIds);
  };

  const handleDeleteLogRiwayat = async (logId: string) => {
    if(!confirm('Hapus riwayat absen/pelanggaran ini secara permanen?')) return;
    setRiwayatLogs(prev => prev.filter(l => l.id !== logId)); 
    await supabase.from('log_pelanggaran').delete().eq('id', logId);
    fetchTunggakan(); 
  };

  const handleAddJenis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJenisNama.trim()) return;
    setIsAddingJenis(true);
    const { error } = await supabase.from('master_jenis').insert([{ nama: newJenisNama.trim() }]);
    if (!error) {
      setNewJenisNama('');
      const { data } = await supabase.from('master_jenis').select('*').order('nama');
      setJenisList(data || []);
    }
    setIsAddingJenis(false);
  };
  
  const handleDeleteJenis = async (id: string) => {
    if (confirm('Hapus jenis ini?')) {
      await supabase.from('master_jenis').delete().eq('id', id);
      setJenisList(prev => prev.filter(j => j.id !== id));
    }
  };

  return (
    <div className="bg-white md:rounded-2xl md:shadow-xl border-gray-200 overflow-hidden min-h-[85vh] flex flex-col md:m-4 md:border">
      {/* HEADER NAVIGASI */}
      <div className="bg-emerald-800 text-white p-4 sm:p-6 pb-0">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><ShieldAlert className="w-6 h-6"/> Kedisiplinan & Takziran</h2>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('input')} className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold whitespace-nowrap ${activeTab === 'input' ? 'bg-gray-50 text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700'}`}><PenTool className="w-4 h-4" /> Input Massal</button>
          <button onClick={() => setActiveTab('takziran')} className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold whitespace-nowrap ${activeTab === 'takziran' ? 'bg-gray-50 text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700'}`}>
            <AlertCircle className="w-4 h-4" /> Daftar Tunggakan
            {tunggakanList.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{tunggakanList.length}</span>}
          </button>
          <button onClick={() => setActiveTab('riwayat')} className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold whitespace-nowrap ${activeTab === 'riwayat' ? 'bg-gray-50 text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700'}`}><History className="w-4 h-4" /> Riwayat Kalender</button>
          <button onClick={() => setActiveTab('pengaturan')} className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold whitespace-nowrap ${activeTab === 'pengaturan' ? 'bg-gray-50 text-emerald-800' : 'text-emerald-100 hover:bg-emerald-700'}`}><Settings className="w-4 h-4" /> Master Kegiatan</button>
        </div>
      </div>

      <div className="p-4 sm:p-6 flex-1 bg-gray-50">
        
        {/* --- TAB 1 & 2 DIBIARKAN SAMA (DIPOTONG DEMI KERINGKASAN TAMPILAN) --- */}
        {activeTab === 'input' && (
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/3 space-y-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4 sticky top-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">Pengaturan Absen</h3>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600"/> Kegiatan (Master)</label>
                  <select value={formData.jenis_id} onChange={e => setFormData({...formData, jenis_id: e.target.value})} className="w-full border-gray-300 p-2.5 rounded-xl bg-gray-50 border outline-none font-semibold text-gray-800">
                    <option value="">-- Pilih --</option>
                    {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600"/> Tanggal</label>
                  <input type="date" value={formData.tgl_melanggar} onChange={e => setFormData({...formData, tgl_melanggar: e.target.value})} className="w-full border-gray-300 p-2.5 rounded-xl bg-gray-50 border outline-none font-semibold text-gray-800" />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><PenTool className="w-4 h-4 text-emerald-600"/> Catatan (Opsional)</label>
                  <textarea value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} placeholder="Cth: Terlambat, Alfa..." rows={2} className="w-full border-gray-300 p-2 rounded-xl bg-gray-50 border outline-none text-sm"></textarea>
                </div>
                <div className="pt-4">
                  <button onClick={handleSubmitMassal} disabled={isSubmitting || selectedCount === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-md transition-all">
                    <Save className="w-5 h-5"/> {isSubmitting ? 'Menyimpan...' : `Simpan (${selectedCount} Anak)`}
                  </button>
                  {notification && <p className={`mt-2 text-sm font-bold text-center ${notification.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>{notification.msg}</p>}
                </div>
              </div>
            </div>
            <div className="w-full lg:w-2/3 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[60vh]">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari santri..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-gray-50 outline-none font-medium" />
                </div>
                <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)} className="p-2.5 rounded-xl border border-gray-300 bg-gray-50 outline-none font-medium sm:w-40">
                  <option value="">Semua Kelas</option>
                  {listKelas.map((k: any) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredSantri.map(santri => (
                    <SantriCard key={santri.id} santri={santri} isSelected={!!selectedSantri[santri.id]} onToggle={handleToggleSantri} />
                  ))}
                  {filteredSantri.length === 0 && <div className="col-span-full text-center text-gray-400 py-10 font-medium">Tidak ada santri yang sesuai kriteria.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'takziran' && (
          <div className="max-w-4xl mx-auto space-y-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Daftar Santri Belum Ditakzir</h3>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input type="text" value={searchTunggakan} onChange={e => setSearchTunggakan(e.target.value)} placeholder="Cari nama..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 bg-white outline-none text-sm" />
                </div>
             </div>

             {groupedTunggakan.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                  <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4"/>
                  <h4 className="text-lg font-bold text-gray-600">Alhamdulillah, Bersih!</h4>
                  <p className="text-gray-400">Tidak ada santri yang memiliki tunggakan takziran.</p>
                </div>
             ) : (
                <div className="space-y-4">
                  {groupedTunggakan.map(group => (
                    <div key={group.santri.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                         <div>
                           <h4 className="font-bold text-gray-800 text-lg">{group.santri.nama_lengkap}</h4>
                           <p className="text-xs text-gray-500 font-medium">Kelas: {group.santri.kelas} | Asrama: {group.santri.asrama}</p>
                         </div>
                         <button onClick={() => handleSelesaikanSemua(group.logs)} className="text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-lg transition-colors border border-emerald-200">
                           Selesaikan Semua ({group.logs.length})
                         </button>
                      </div>
                      <div className="divide-y divide-gray-100">
                         {group.logs.map(log => (
                           <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold">Belum</span>
                                  <span className="font-semibold text-gray-800">{log.master_jenis?.nama || 'Unknown'}</span>
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-2"><Calendar className="w-3 h-3"/> {new Date(log.tgl_melanggar).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                {log.keterangan && <p className="text-sm text-gray-600 mt-1 italic">"{log.keterangan}"</p>}
                              </div>
                              <button onClick={() => handleSelesaikanTakziran(log.id)} className="flex items-center gap-1 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors shadow-sm">
                                <CheckCircle className="w-4 h-4"/> Takzir
                              </button>
                           </div>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        )}

        {/* --- TAB 3: RIWAYAT KALENDER (DENGAN TOMBOL WA & FIX CSS WARN) --- */}
        {activeTab === 'riwayat' && (
          <div className="max-w-7xl mx-auto space-y-4">
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                {/* CSS Conflict FIXED: 'block' dihapus */}
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2"><UserSearch className="w-4 h-4 text-emerald-600"/> Pilih Nama Santri</label>
                <select 
                  value={riwayatSantriId} 
                  onChange={e => setRiwayatSantriId(e.target.value)} 
                  className="w-full border-gray-300 p-3 rounded-xl bg-gray-50 border outline-none font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Ketik / Pilih Nama Santri --</option>
                  {santriList.map(s => <option key={s.id} value={s.id}>{s.nama_lengkap} ({s.kelas || '-'})</option>)}
                </select>
              </div>
              <div className="w-full md:w-64">
                {/* CSS Conflict FIXED: 'block' dihapus */}
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2"><Calendar className="w-4 h-4 text-emerald-600"/> Bulan & Tahun</label>
                <input 
                  type="month" 
                  value={riwayatMonth} 
                  onChange={e => setRiwayatMonth(e.target.value)} 
                  className="w-full border-gray-300 p-3 rounded-xl bg-gray-50 border outline-none font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500" 
                />
              </div>
            </div>

            {riwayatSantriId ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div>
                     <h3 className="font-bold text-gray-800">
                       Grid Kehadiran: <span className="text-emerald-700">{santriList.find(s => s.id === riwayatSantriId)?.nama_lengkap}</span>
                     </h3>
                     <div className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold inline-block mt-2">
                       Total Bolos: {riwayatLogs.length} Kali
                     </div>
                   </div>

                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                    <thead className="bg-gray-100 text-gray-600 text-xs">
                      <tr>
                        <th className="p-3 border font-extrabold w-48 sticky left-0 bg-gray-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Jenis Kegiatan</th>
                        {calendarDays.map(d => (
                          <th key={d} className="p-2 border text-center font-bold w-10 min-w-[40px]">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jenisList.map((j, index) => (
                        <tr key={j.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-emerald-50 transition-colors`}>
                          <td className="p-3 border font-semibold text-gray-700 sticky left-0 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10 text-xs truncate max-w-[12rem]" title={j.nama}>
                            {j.nama}
                          </td>
                          {calendarDays.map(d => {
                            const log = getRiwayatLog(j.id, d);
                            return (
                              <td key={d} className="border text-center relative group p-0 align-middle">
                                {log ? (
                                  <button 
                                    onClick={() => handleDeleteLogRiwayat(log.id)}
                                    title={log.keterangan ? `Catatan: ${log.keterangan}\n\nKlik untuk menghapus.` : 'Klik untuk menghapus log ini.'}
                                    className="w-full h-full min-h-[2.5rem] flex items-center justify-center font-bold text-red-600 bg-red-100 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                                  >
                                    X
                                  </button>
                                ) : (
                                  <div className="w-full h-full min-h-[2.5rem] flex items-center justify-center text-gray-200 font-light">
                                    -
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {isFetchingRiwayat && <div className="p-4 text-center text-sm font-bold text-emerald-600 animate-pulse">Menyinkronkan data bulan ini...</div>}
                
                <div className="p-4 bg-yellow-50 border-t border-yellow-100 text-xs text-yellow-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                  <p><strong>Tips:</strong> Kotak berhuruf <span className="text-red-600 font-bold bg-red-100 px-1 rounded">X</span> menandakan santri tidak hadir/melanggar pada tanggal tersebut. Arahkan kursor ke X untuk melihat keterangan. Klik X jika Anda ingin <strong>menghapus/membatalkan</strong> riwayat absen tersebut.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <UserSearch className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
                <h4 className="text-lg font-bold text-gray-500">Pilih Nama Santri</h4>
                <p className="text-gray-400">Silakan pilih nama santri di atas untuk melihat kalender kehadirannya.</p>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: MASTER DATA --- */}
        {activeTab === 'pengaturan' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Tambah Jenis Kegiatan</h3>
              <form onSubmit={handleAddJenis} className="flex gap-3">
                <input type="text" value={newJenisNama} onChange={e => setNewJenisNama(e.target.value)} placeholder="Cth: Ngaji Subuh..." className="flex-1 border border-gray-300 p-2.5 rounded-xl outline-none" required />
                <button disabled={isAddingJenis} type="submit" className="bg-emerald-600 text-white px-5 rounded-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5"/> Tambah</button>
              </form>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Daftar Jenis</h3>
              <div className="divide-y max-h-96 overflow-y-auto pr-2">
                {jenisList.map(j => (
                  <div key={j.id} className="py-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">{j.nama}</span>
                    <button onClick={() => handleDeleteJenis(j.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      
      </div>
    </div>
  );
}
