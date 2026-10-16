import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  PenTool, History, Settings, Search, Calendar, FileText, CheckCircle, 
  Save, Plus, Trash2, CheckSquare, Square, ShieldAlert, AlertCircle, 
  BarChart3, ArrowUpDown, Tag, Edit3, X, Check
} from 'lucide-react';
import AiWaMessageModal from './AiWaMessageModal';
import TopViolators from './takziran/TopViolators';
import SantriAccordionItem from './takziran/SantriAccordionItem';
import GrafikAnalytics from './takziran/GrafikAnalytics';

const getTodayDate = () => new Date().toISOString().split('T')[0];
const getThirtyDaysAgoDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

const SantriInputCard = memo(({ 
  santri, 
  isSelected, 
  onToggle 
}: { 
  santri: any; 
  isSelected: boolean; 
  onToggle: (id: string) => void;
}) => {
  return (
    <div 
      onClick={() => onToggle(santri.id)}
      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 select-none ${
        isSelected 
          ? 'bg-emerald-50 border-emerald-500 shadow-md transform scale-[1.01]' 
          : 'bg-white border-gray-100 hover:border-emerald-200 shadow-xs'
      }`}
    >
      <div className={`${isSelected ? 'text-emerald-600' : 'text-gray-300'} shrink-0`}>
        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-emerald-950 font-black' : 'text-gray-800'}`}>
          {santri.nama_lengkap}
        </h4>
        <p className="text-xs text-gray-500 truncate">
          Kelas: {santri.kelas || '-'} | Asrama: {santri.asrama || '-'}
        </p>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.isSelected === nextProps.isSelected);

interface TakziranDashboardProps {
  canInput?: boolean;
  currentUser?: any;
}

export default function TakziranDashboard({ canInput = true, currentUser }: TakziranDashboardProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'takziran' | 'riwayat' | 'grafik' | 'pengaturan'>(
    canInput ? 'input' : 'takziran'
  );
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Data master & log
  const [jenisList, setJenisList] = useState<any[]>([]);
  const [santriList, setSantriList] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [catatanList, setCatatanList] = useState<any[]>([]);
  const [prestasiList, setPrestasiList] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form Input Massal
  const [formData, setFormData] = useState({ jenis_id: '', tgl_melanggar: getTodayDate(), keterangan: '' });
  const [selectedSantri, setSelectedSantri] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputSearchQuery, setInputSearchQuery] = useState('');
  const [inputFilterKelas, setInputFilterKelas] = useState('');

  // Filter & Search untuk Tab Takziran & Riwayat
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'alpha' | 'count'>('alpha');
  const [expandedSantri, setExpandedSantri] = useState<Record<string, boolean>>({});

  // Filter Grafik
  const [grafikStart, setGrafikStart] = useState(getThirtyDaysAgoDate());
  const [grafikEnd, setGrafikEnd] = useState(getTodayDate());

  // Master Jenis State
  const [newJenisNama, setNewJenisNama] = useState('');
  const [isAddingJenis, setIsAddingJenis] = useState(false);
  const [editingJenis, setEditingJenis] = useState<{ id: string; nama: string } | null>(null);

  // Modal AI WA
  const [aiModalTarget, setAiModalTarget] = useState<{ santri: any; logs: any[] } | null>(null);

  // Helper Toast
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // Fetch Semua Data Utama
  const fetchAllData = useCallback(async () => {
    try {
      const [jenisRes, santriRes, logsRes, catatanRes, prestasiRes] = await Promise.all([
        supabase.from('master_jenis').select('*').order('nama'),
        supabase.from('santri').select('id, kode_unik, nama_lengkap, kelas, asrama, no_hp_wali, status').eq('status', 'Aktif').order('nama_lengkap'),
        supabase.from('log_pelanggaran').select('*, santri(id, nama_lengkap, kelas, asrama), master_jenis(id, nama)').order('tgl_melanggar', { ascending: false }),
        supabase.from('santri_catatan').select('*').order('created_at', { ascending: false }),
        supabase.from('santri_prestasi').select('*').order('created_at', { ascending: false })
      ]);

      setJenisList(jenisRes.data || []);
      setSantriList(santriRes.data || []);
      setAllLogs(logsRes.data || []);
      setCatatanList(catatanRes.data || []);
      setPrestasiList(prestasiRes.data || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Supabase Realtime channel
    const channel = supabase.channel('takziran_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'log_pelanggaran' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'santri_catatan' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'santri_prestasi' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'master_jenis' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  // Petugas & Admin identification
  const currentUserName = currentUser?.nama_lengkap || 'Pengurus';
  const isAdmin = currentUser?.master_role?.nama_role === 'Super Admin' || currentUser?.master_role?.permissions?.includes('kelola_pengguna') || false;
  const canDelete = isAdmin || canInput;
  const canTazir = true;

  // Grouping logs, catatan, prestasi per santri_id
  const groupedLogs = useMemo(() => {
    const map: Record<string, any[]> = {};
    allLogs.forEach(l => {
      const sId = l.santri_id || l.santri?.id;
      if (sId) {
        (map[sId] = map[sId] || []).push(l);
      }
    });
    return map;
  }, [allLogs]);

  const groupedCatatan = useMemo(() => {
    const map: Record<string, any[]> = {};
    catatanList.forEach(c => {
      if (c.santri_id) {
        (map[c.santri_id] = map[c.santri_id] || []).push(c);
      }
    });
    return map;
  }, [catatanList]);

  const groupedPrestasi = useMemo(() => {
    const map: Record<string, any[]> = {};
    prestasiList.forEach(p => {
      if (p.santri_id) {
        (map[p.santri_id] = map[p.santri_id] || []).push(p);
      }
    });
    return map;
  }, [prestasiList]);

  // Ekstrak Semua Tag Unik (Kelas & Asrama)
  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    santriList.forEach(s => {
      if (s.kelas) tags.add(`Kls ${s.kelas}`);
      if (s.asrama) tags.add(s.asrama);
    });
    return Array.from(tags).sort();
  }, [santriList]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  }, []);

  // Filtered Santri untuk Tab Takziran dan Tab Riwayat
  const filteredSantriList = useMemo(() => {
    let list = [...santriList];

    // Filter Pencarian Teks
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => {
        const matchName = s.nama_lengkap.toLowerCase().includes(q);
        const matchKelas = s.kelas?.toLowerCase().includes(q);
        const matchAsrama = s.asrama?.toLowerCase().includes(q);
        const sLogs = groupedLogs[s.id] || [];
        const matchViolation = sLogs.some(
          l => (l.master_jenis?.nama || l.jenis || '').toLowerCase().includes(q) || (l.keterangan || '').toLowerCase().includes(q)
        );
        return matchName || matchKelas || matchAsrama || matchViolation;
      });
    }

    // Filter Tag (Kelas & Asrama)
    if (selectedTags.length > 0) {
      list = list.filter(s => {
        const studentTags = [`Kls ${s.kelas}`, s.asrama].filter(Boolean);
        return selectedTags.some(tag => studentTags.includes(tag));
      });
    }

    // Filter Tab Takziran (Hanya santri dengan pelanggaran belum takzir)
    if (activeTab === 'takziran') {
      list = list.filter(s => {
        const sLogs = groupedLogs[s.id] || [];
        return sLogs.some(l => l.status_tazir === 'Belum');
      });
    }

    // Sorting
    return list.sort((a, b) => {
      if (sortMode === 'count') {
        const aLogs = groupedLogs[a.id] || [];
        const bLogs = groupedLogs[b.id] || [];
        const countA = activeTab === 'takziran' ? aLogs.filter(l => l.status_tazir === 'Belum').length : aLogs.length;
        const countB = activeTab === 'takziran' ? bLogs.filter(l => l.status_tazir === 'Belum').length : bLogs.length;
        if (countA !== countB) return countB - countA;
      }
      return a.nama_lengkap.localeCompare(b.nama_lengkap);
    });
  }, [santriList, searchQuery, selectedTags, activeTab, groupedLogs, sortMode]);

  // Santri filter untuk Tab Input Massal
  const inputFilteredSantri = useMemo(() => {
    return santriList.filter(s => {
      const matchName = s.nama_lengkap.toLowerCase().includes(inputSearchQuery.toLowerCase());
      const matchKelas = inputFilterKelas ? s.kelas === inputFilterKelas : true;
      return matchName && matchKelas;
    });
  }, [santriList, inputSearchQuery, inputFilterKelas]);

  const listKelasInput = useMemo(
    () => Array.from(new Set(santriList.map(s => s.kelas).filter(Boolean))),
    [santriList]
  );
  const selectedCount = useMemo(() => Object.values(selectedSantri).filter(Boolean).length, [selectedSantri]);

  const handleToggleSantriInput = useCallback((id: string) => {
    setSelectedSantri(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleToggleExpandSantri = useCallback((santriId: string) => {
    setExpandedSantri(prev => ({ ...prev, [santriId]: !prev[santriId] }));
  }, []);

  // Handler Submit Input Massal
  const handleSubmitMassal = async () => {
    if (!formData.jenis_id) return showToast('Pilih jenis kegiatan/pelanggaran!', 'error');
    if (selectedCount === 0) return showToast('Pilih minimal 1 santri!', 'error');

    setIsSubmitting(true);
    try {
      const payload = Object.keys(selectedSantri)
        .filter(id => selectedSantri[id])
        .map(id => ({
          santri_id: id,
          jenis_id: formData.jenis_id,
          tgl_melanggar: formData.tgl_melanggar,
          keterangan: formData.keterangan || null,
          status_tazir: 'Belum',
          input_by: currentUserName
        }));

      const { error } = await supabase.from('log_pelanggaran').insert(payload);
      if (error) throw error;

      showToast(`Alhamdulillah, berhasil mencatat kehadiran ${selectedCount} santri!`);
      setSelectedSantri({});
      setFormData(prev => ({ ...prev, keterangan: '' }));
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Takzir
  const handleTazirSingle = useCallback(async (logId: string) => {
    try {
      const { error } = await supabase
        .from('log_pelanggaran')
        .update({ status_tazir: 'Sudah', tazir_by: currentUserName })
        .eq('id', logId);

      if (error) throw error;
      setAllLogs(prev =>
        prev.map(l => (l.id === logId ? { ...l, status_tazir: 'Sudah', tazir_by: currentUserName } : l))
      );
      showToast('Status takziran berhasil diperbarui!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [currentUserName, showToast]);

  const handleTazirBulk = useCallback(async (_santriId: string, logIds: string[]) => {
    try {
      const { error } = await supabase
        .from('log_pelanggaran')
        .update({ status_tazir: 'Sudah', tazir_by: currentUserName })
        .in('id', logIds);

      if (error) throw error;
      setAllLogs(prev =>
        prev.map(l => (logIds.includes(l.id) ? { ...l, status_tazir: 'Sudah', tazir_by: currentUserName } : l))
      );
      showToast(`Berhasil menyelesaikan ${logIds.length} takziran santri!`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [currentUserName, showToast]);

  // Handler Hapus Log
  const handleDeleteLog = useCallback(async (logId: string) => {
    try {
      const { error } = await supabase.from('log_pelanggaran').delete().eq('id', logId);
      if (error) throw error;
      setAllLogs(prev => prev.filter(l => l.id !== logId));
      showToast('Log pelanggaran berhasil dihapus.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleDeleteManyLogs = useCallback(async (logIds: string[]) => {
    try {
      const { error } = await supabase.from('log_pelanggaran').delete().in('id', logIds);
      if (error) throw error;
      setAllLogs(prev => prev.filter(l => !logIds.includes(l.id)));
      showToast(`${logIds.length} log berhasil dihapus.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleDeleteAllLogs = useCallback(async (santriId: string, nama: string) => {
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus SELURUH riwayat absensi ${nama}? Data tidak dapat dikembalikan!`)) {
      return;
    }
    try {
      const { error } = await supabase.from('log_pelanggaran').delete().eq('santri_id', santriId);
      if (error) throw error;
      setAllLogs(prev => prev.filter(l => (l.santri_id || l.santri?.id) !== santriId));
      showToast(`Seluruh riwayat pelanggaran ${nama} telah dihapus.`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  // Handler Catatan Santri
  const handleAddNote = useCallback(async (santriId: string, text: string) => {
    try {
      const { data, error } = await supabase
        .from('santri_catatan')
        .insert([{ santri_id: santriId, isi: text }])
        .select()
        .single();

      if (error) throw error;
      setCatatanList(prev => [data, ...prev]);
      showToast('Catatan santri berhasil ditambahkan!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleUpdateNote = useCallback(async (noteId: string, text: string) => {
    try {
      const { error } = await supabase.from('santri_catatan').update({ isi: text }).eq('id', noteId);
      if (error) throw error;
      setCatatanList(prev => prev.map(c => (c.id === noteId ? { ...c, isi: text } : c)));
      showToast('Catatan diperbarui.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await supabase.from('santri_catatan').delete().eq('id', noteId);
      if (error) throw error;
      setCatatanList(prev => prev.filter(c => c.id !== noteId));
      showToast('Catatan dihapus.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  // Handler Prestasi Santri
  const handleAddPrestasi = useCallback(async (santriId: string, text: string) => {
    try {
      const { data, error } = await supabase
        .from('santri_prestasi')
        .insert([{ santri_id: santriId, prestasi: text }])
        .select()
        .single();

      if (error) throw error;
      setPrestasiList(prev => [data, ...prev]);
      showToast('Prestasi santri berhasil ditambahkan!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleUpdatePrestasi = useCallback(async (prestasiId: string, text: string) => {
    try {
      const { error } = await supabase.from('santri_prestasi').update({ prestasi: text }).eq('id', prestasiId);
      if (error) throw error;
      setPrestasiList(prev => prev.map(p => (p.id === prestasiId ? { ...p, prestasi: text } : p)));
      showToast('Prestasi diperbarui.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const handleDeletePrestasi = useCallback(async (prestasiId: string) => {
    try {
      const { error } = await supabase.from('santri_prestasi').delete().eq('id', prestasiId);
      if (error) throw error;
      setPrestasiList(prev => prev.filter(p => p.id !== prestasiId));
      showToast('Prestasi dihapus.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  // Handler Master Jenis
  const handleAddJenis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJenisNama.trim()) return;
    setIsAddingJenis(true);
    try {
      const { data, error } = await supabase
        .from('master_jenis')
        .insert([{ nama: newJenisNama.trim() }])
        .select()
        .single();

      if (error) throw error;
      setJenisList(prev => [...prev, data].sort((a, b) => a.nama.localeCompare(b.nama)));
      setNewJenisNama('');
      showToast('Jenis kegiatan baru berhasil ditambahkan!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsAddingJenis(false);
    }
  };

  const handleUpdateJenis = async () => {
    if (!editingJenis || !editingJenis.nama.trim()) return;
    try {
      const { error } = await supabase
        .from('master_jenis')
        .update({ nama: editingJenis.nama.trim() })
        .eq('id', editingJenis.id);

      if (error) throw error;
      setJenisList(prev =>
        prev
          .map(j => (j.id === editingJenis.id ? { ...j, nama: editingJenis.nama.trim() } : j))
          .sort((a, b) => a.nama.localeCompare(b.nama))
      );
      setEditingJenis(null);
      showToast('Jenis kegiatan diperbarui!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteJenis = async (id: string) => {
    if (!confirm('Hapus jenis kegiatan ini? Data pelanggaran lama mungkin kehilangan nama referensi.')) return;
    try {
      const { error } = await supabase.from('master_jenis').delete().eq('id', id);
      if (error) throw error;
      setJenisList(prev => prev.filter(j => j.id !== id));
      showToast('Jenis kegiatan dihapus.');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Callback klik santri di Top 10 Leaderboard
  const handleSelectSantriFromTop = useCallback((santriId: string, nama: string) => {
    setSearchQuery(nama);
    setActiveTab('riwayat');
    setExpandedSantri(prev => ({ ...prev, [santriId]: true }));
  }, []);

  // Jumlah tunggakan aktif
  const totalPendingTazir = useMemo(
    () => allLogs.filter(l => l.status_tazir === 'Belum').length,
    [allLogs]
  );

  return (
    <div className="bg-white md:rounded-2xl md:shadow-xl border-gray-200 overflow-hidden min-h-[88vh] flex flex-col md:m-4 md:border">
      {/* HEADER NAVIGASI DASHBOARD */}
      <div className="bg-emerald-900 text-white p-4 sm:p-6 pb-0 shadow-xs border-b border-emerald-800">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800/80 rounded-xl border border-emerald-700">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Absensi & Kedisiplinan Santri
              </h2>
              <p className="text-xs text-emerald-200 font-medium">
                Pencatatan Kehadiran, Takziran, Kalender, Analitik & Asisten AI WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide text-xs sm:text-sm font-bold">
          {canInput && (
            <button
              onClick={() => setActiveTab('input')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl whitespace-nowrap transition-all ${
                activeTab === 'input'
                  ? 'bg-gray-50 text-emerald-900 shadow-xs'
                  : 'text-emerald-100 hover:bg-emerald-800/60'
              }`}
            >
              <PenTool className="w-4 h-4" /> Input Massal
            </button>
          )}

          <button
            onClick={() => setActiveTab('takziran')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl whitespace-nowrap transition-all ${
              activeTab === 'takziran'
                ? 'bg-gray-50 text-emerald-900 shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-800/60'
            }`}
          >
            <AlertCircle className="w-4 h-4" /> Takziran
            {totalPendingTazir > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 font-black animate-pulse">
                {totalPendingTazir}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl whitespace-nowrap transition-all ${
              activeTab === 'riwayat'
                ? 'bg-gray-50 text-emerald-900 shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-800/60'
            }`}
          >
            <History className="w-4 h-4" /> Riwayat & Kalender
          </button>

          <button
            onClick={() => setActiveTab('grafik')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl whitespace-nowrap transition-all ${
              activeTab === 'grafik'
                ? 'bg-gray-50 text-emerald-900 shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Grafik & Analitik
          </button>

          <button
            onClick={() => setActiveTab('pengaturan')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl whitespace-nowrap transition-all ${
              activeTab === 'pengaturan'
                ? 'bg-gray-50 text-emerald-900 shadow-xs'
                : 'text-emerald-100 hover:bg-emerald-800/60'
            }`}
          >
            <Settings className="w-4 h-4" /> Master Kegiatan
          </button>
        </div>
      </div>

      {/* NOTIFIKASI TOAST */}
      {notification && (
        <div className="fixed top-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div
            className={`px-5 py-2.5 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2 animate-bounce ${
              notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.msg}
          </div>
        </div>
      )}

      {/* KONTEN UTAMA */}
      <div className="p-4 sm:p-6 flex-1 bg-gray-50">
        {loadingInitial ? (
          <div className="py-20 text-center font-bold text-emerald-700 animate-pulse text-sm">
            Memuat data absensi & santri...
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* TAB 1: INPUT MASSAL (ATTENDANCE CHECK-OFF)                     */}
            {/* ============================================================== */}
            {activeTab === 'input' && canInput && (
              <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/3 space-y-4">
                  <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200 space-y-4 sticky top-4">
                    <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
                      Pengaturan Absen
                    </h3>

                    <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-3 rounded-r-xl text-xs font-medium space-y-1">
                      <b className="uppercase flex items-center gap-1 text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5" /> Panduan Pengisian:
                      </b>
                      <p>
                        Klik pada nama santri yang <b>TIDAK HADIR / MELANGGAR</b>. Santri yang hadir tertib tidak perlu diklik.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" /> Jenis Kegiatan (Master)
                      </label>
                      <select
                        value={formData.jenis_id}
                        onChange={e => setFormData({ ...formData, jenis_id: e.target.value })}
                        className="w-full border-gray-200 p-2.5 rounded-xl bg-gray-50 border outline-none font-bold text-sm text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih Jenis Kegiatan --</option>
                        {jenisList.map(j => (
                          <option key={j.id} value={j.id}>
                            {j.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600" /> Tanggal
                      </label>
                      <input
                        type="date"
                        value={formData.tgl_melanggar}
                        onChange={e => setFormData({ ...formData, tgl_melanggar: e.target.value })}
                        className="w-full border-gray-200 p-2.5 rounded-xl bg-gray-50 border outline-none font-bold text-sm text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-emerald-600" /> Catatan Tambahan (Opsional)
                      </label>
                      <textarea
                        value={formData.keterangan}
                        onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                        placeholder="Cth: Izin pulang, sakit tanpa surat, terlambat..."
                        rows={2}
                        className="w-full border-gray-200 p-2.5 rounded-xl bg-gray-50 border outline-none text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleSubmitMassal}
                        disabled={isSubmitting || selectedCount === 0}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 text-white font-extrabold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        {isSubmitting ? 'Menyimpan...' : `Simpan Absen (${selectedCount} Santri)`}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-2/3 bg-white p-5 rounded-2xl shadow-xs border border-gray-200 flex flex-col min-h-[65vh]">
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={inputSearchQuery}
                        onChange={e => setInputSearchQuery(e.target.value)}
                        placeholder="Cari nama santri..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none font-semibold text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <select
                      value={inputFilterKelas}
                      onChange={e => setInputFilterKelas(e.target.value)}
                      className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none font-bold text-xs sm:w-40 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Semua Kelas</option>
                      {listKelasInput.map((k: any) => (
                        <option key={k} value={k}>
                          Kelas {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 pb-4 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {inputFilteredSantri.map(santri => (
                        <SantriInputCard
                          key={santri.id}
                          santri={santri}
                          isSelected={!!selectedSantri[santri.id]}
                          onToggle={handleToggleSantriInput}
                        />
                      ))}
                      {inputFilteredSantri.length === 0 && (
                        <div className="col-span-full text-center text-gray-400 py-16 font-medium text-xs italic">
                          Tidak ada santri yang sesuai kriteria pencarian.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: TAKZIRAN & TAB 3: RIWAYAT & KALENDER                    */}
            {/* ============================================================== */}
            {(activeTab === 'takziran' || activeTab === 'riwayat') && (
              <div className="max-w-6xl mx-auto space-y-4">
                {/* TOP 10 LEADERBOARD CAROUSEL (Hanya pada Tab Riwayat saat tidak sedang search) */}
                {activeTab === 'riwayat' && !searchQuery.trim() && selectedTags.length === 0 && (
                  <TopViolators logs={allLogs} onSelectSantri={handleSelectSantriFromTop} />
                )}

                {/* SEARCH BAR & SORT TOGGLE & TAG FILTER BAR */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari nama santri, kelas, asrama, atau keterangan..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none font-semibold text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3.5 top-2.5 text-gray-400 hover:text-red-500 font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setSortMode(prev => (prev === 'count' ? 'alpha' : 'count'))}
                      className="px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Urutan: {sortMode === 'count' ? 'Terbanyak' : 'A-Z'}</span>
                    </button>
                  </div>

                  {/* TagFilterBar: Chips Kelas & Asrama */}
                  {allUniqueTags.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs pt-1 border-t border-gray-100">
                      <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">
                        Filter:
                      </span>
                      {allUniqueTags.map(tag => {
                        const isActive = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                              isActive
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                      {selectedTags.length > 0 && (
                        <button
                          onClick={() => setSelectedTags([])}
                          className="text-[11px] text-red-600 font-bold hover:underline px-2 shrink-0 cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* DAFTAR SANTRI ACCORDION */}
                <div className="space-y-3">
                  {filteredSantriList.map(santri => (
                    <SantriAccordionItem
                      key={santri.id}
                      santri={santri}
                      santriLogs={groupedLogs[santri.id] || []}
                      notes={groupedCatatan[santri.id] || []}
                      prestasiItems={groupedPrestasi[santri.id] || []}
                      filterTazir={activeTab === 'takziran'}
                      isExpanded={!!expandedSantri[santri.id]}
                      onToggleExpand={handleToggleExpandSantri}
                      types={jenisList}
                      isAdmin={isAdmin}
                      canDelete={canDelete}
                      canTazir={canTazir}
                      onTazirSingle={handleTazirSingle}
                      onTazirBulk={handleTazirBulk}
                      onDeleteLog={handleDeleteLog}
                      onDeleteManyLogs={handleDeleteManyLogs}
                      onDeleteAllLogs={handleDeleteAllLogs}
                      onAddNote={handleAddNote}
                      onUpdateNote={handleUpdateNote}
                      onDeleteNote={handleDeleteNote}
                      onAddPrestasi={handleAddPrestasi}
                      onUpdatePrestasi={handleUpdatePrestasi}
                      onDeletePrestasi={handleDeletePrestasi}
                      onOpenAiWaModal={(s, l) => setAiModalTarget({ santri: s, logs: l })}
                    />
                  ))}

                  {filteredSantriList.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                      <h4 className="text-base font-bold text-gray-700">
                        {activeTab === 'takziran'
                          ? 'Alhamdulillah, Tidak Ada Tunggakan Takziran!'
                          : 'Tidak Ada Data Santri Sesuai Kriteria.'}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {activeTab === 'takziran'
                          ? 'Semua santri dalam keadaan tertib atau telah ditakzir.'
                          : 'Coba ubah kata kunci pencarian atau reset filter tag.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: GRAFIK & ANALITIK TREND PELANGGARAN                     */}
            {/* ============================================================== */}
            {activeTab === 'grafik' && (
              <GrafikAnalytics
                logs={allLogs}
                startDate={grafikStart}
                endDate={grafikEnd}
                setStartDate={setGrafikStart}
                setEndDate={setGrafikEnd}
              />
            )}

            {/* ============================================================== */}
            {/* TAB 5: MASTER KEGIATAN & JENIS PELANGGARAN                     */}
            {/* ============================================================== */}
            {activeTab === 'pengaturan' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
                  <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide mb-4">
                    Tambah Jenis Kegiatan Baru
                  </h3>
                  <form onSubmit={handleAddJenis} className="flex gap-2">
                    <input
                      type="text"
                      value={newJenisNama}
                      onChange={e => setNewJenisNama(e.target.value)}
                      placeholder="Cth: Sholat Subuh Berjamaah, Mengaji Sorogan..."
                      className="flex-1 border border-gray-200 p-2.5 rounded-xl bg-gray-50 outline-none text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <button
                      disabled={isAddingJenis}
                      type="submit"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Tambah
                    </button>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">
                      Daftar Master Kegiatan ({jenisList.length})
                    </h3>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                    {jenisList.map(j => (
                      <div key={j.id} className="py-3 flex justify-between items-center text-xs gap-3">
                        {editingJenis && editingJenis.id === j.id ? (
                          <div className="flex-1 flex gap-2">
                            <input
                              autoFocus
                              type="text"
                              value={editingJenis.nama}
                              onChange={e => setEditingJenis({ id: editingJenis.id, nama: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleUpdateJenis()}
                              className="flex-1 p-2 bg-white border border-emerald-400 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              onClick={handleUpdateJenis}
                              className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs hover:bg-emerald-700 cursor-pointer"
                              title="Simpan"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingJenis(null)}
                              className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer"
                              title="Batal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-gray-800 flex-1">{j.nama}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingJenis({ id: j.id, nama: j.nama })}
                                className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors cursor-pointer"
                                title="Edit Nama"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteJenis(j.id)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Jenis"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {jenisList.length === 0 && (
                      <div className="p-8 text-center text-gray-400 text-xs italic">
                        Belum ada data master jenis kegiatan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL GENERATOR PESAN AI WA */}
      {aiModalTarget && (
        <AiWaMessageModal
          isOpen={!!aiModalTarget}
          onClose={() => setAiModalTarget(null)}
          santri={aiModalTarget.santri}
          logs={aiModalTarget.logs}
          periode={new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        />
      )}
    </div>
  );
}