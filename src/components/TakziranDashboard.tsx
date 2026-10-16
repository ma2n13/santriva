import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  PenTool, History, Settings, Search, CheckCircle, 
  Save, Plus, Trash2, ShieldAlert, AlertCircle, 
  BarChart3, ArrowUpDown, Tag, Edit3, X, Check,
  RefreshCw, Database, CopyCheck, CheckSquare
} from 'lucide-react';
import AiWaMessageModal from './AiWaMessageModal';
import TopViolators from './takziran/TopViolators';
import SantriAccordionItem from './takziran/SantriAccordionItem';
import GrafikAnalytics from './takziran/GrafikAnalytics';
import LegacySyncModal from './takziran/LegacySyncModal';
import DuplicateReviewModal from './DuplicateReviewModal';
import { formatSantriName } from '../utils/nameFormat';
import { IconButton } from './common/IconButton';

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
      className={`px-2 py-2 rounded-xl text-center cursor-pointer select-none border transition-all duration-150 flex flex-col items-center justify-center min-h-[50px] ${
        isSelected 
          ? 'bg-emerald-800 text-white font-bold border-emerald-800 shadow-md ring-2 ring-emerald-600/40 transform scale-[1.01]' 
          : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-400 hover:bg-emerald-50/40 shadow-xs'
      }`}
    >
      <span className="w-full text-[11px] sm:text-xs font-bold leading-tight break-words text-balance">
        {formatSantriName(santri.nama_lengkap)}
      </span>
      {(santri.kelas || santri.asrama) && (
        <span className={`text-[9px] sm:text-[10px] truncate max-w-full mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-gray-400'}`}>
          {santri.kelas ? `Kls ${santri.kelas}` : ''}{santri.kelas && santri.asrama ? ' • ' : ''}{santri.asrama || ''}
        </span>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.isSelected === nextProps.isSelected && prevProps.santri.id === nextProps.santri.id);

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

  // Modal Sinkronisasi Legacy santri-app
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Modal Review Duplikat & Standarisasi Nama
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

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

  // Ekstrak Semua Tag Unik (Kelas & Asrama / Label)
  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    santriList.forEach(s => {
      if (s.kelas) tags.add(`Kls ${s.kelas}`);
      if (s.asrama) {
        s.asrama.split(',').forEach((t: string) => {
          const trimmed = t.trim();
          if (trimmed) tags.add(trimmed);
        });
      }
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

    // Filter Tag (Kelas & Asrama / Label)
    if (selectedTags.length > 0) {
      list = list.filter(s => {
        const asramaTags = (s.asrama || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        const studentTags = [`Kls ${s.kelas}`, ...asramaTags].filter(Boolean);
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

  const handleSelectAllVisible = useCallback(() => {
    setSelectedSantri(prev => {
      const next = { ...prev };
      inputFilteredSantri.forEach(s => {
        next[s.id] = true;
      });
      return next;
    });
  }, [inputFilteredSantri]);

  const handleClearSelection = useCallback(() => {
    setSelectedSantri({});
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
    <div className="w-full bg-white rounded-3xl shadow-xl shadow-emerald-950/5 border border-emerald-900/10 overflow-hidden min-h-[calc(100vh-6rem)] flex flex-col">
      {/* HEADER NAVIGASI DASHBOARD */}
      <div className="bg-gradient-to-r from-[#032219] via-[#043325] to-[#021812] text-white p-3 sm:p-6 pb-0 shadow-xs border-b border-emerald-800">
        <div className="flex flex-wrap justify-between items-center mb-2 sm:mb-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-800/80 rounded-xl border border-emerald-700">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Absensi & Kedisiplinan Santri
              </h2>
              <p className="hidden sm:block text-xs text-emerald-200 font-medium">
                Pencatatan Kehadiran, Takziran, Kalender, Analitik & Asisten AI WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              onClick={() => setShowDuplicateModal(true)}
              label="Review Duplikat"
              icon={<CopyCheck className="w-3.5 h-3.5 text-emerald-400" />}
              variant="gradient-emerald"
              size="sm"
            />

            <IconButton
              onClick={() => setShowSyncModal(true)}
              label="Sinkronisasi santri-app"
              icon={<RefreshCw className="w-3.5 h-3.5 text-amber-400" />}
              variant="gradient-amber"
              size="sm"
            />
          </div>
        </div>

        {/* TAB BUTTONS (Icon-only by default, expand on hover/active/click) */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide text-xs sm:text-sm font-bold">
          {canInput && (
            <button
              onClick={() => setActiveTab('input')}
              title="Input Massal"
              className={`group flex items-center p-2.5 sm:py-3 rounded-t-xl whitespace-nowrap transition-all select-none ${
                activeTab === 'input'
                  ? 'bg-gray-50 text-emerald-900 shadow-xs px-3.5'
                  : 'text-emerald-100 hover:bg-emerald-800/60 px-2.5 hover:px-3.5'
              }`}
            >
              <PenTool className="w-4 h-4 shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 font-bold ${
                activeTab === 'input' ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
              }`}>
                Input Massal
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('takziran')}
            title="Takziran Aktif"
            className={`group relative flex items-center p-2.5 sm:py-3 rounded-t-xl whitespace-nowrap transition-all select-none ${
              activeTab === 'takziran'
                ? 'bg-gray-50 text-emerald-900 shadow-xs px-3.5'
                : 'text-emerald-100 hover:bg-emerald-800/60 px-2.5 hover:px-3.5'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 font-bold ${
              activeTab === 'takziran' ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
            }`}>
              Takziran
            </span>
            {totalPendingTazir > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full ml-1.5 font-black animate-pulse shrink-0">
                {totalPendingTazir}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            title="Riwayat & Kalender"
            className={`group flex items-center p-2.5 sm:py-3 rounded-t-xl whitespace-nowrap transition-all select-none ${
              activeTab === 'riwayat'
                ? 'bg-gray-50 text-emerald-900 shadow-xs px-3.5'
                : 'text-emerald-100 hover:bg-emerald-800/60 px-2.5 hover:px-3.5'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 font-bold ${
              activeTab === 'riwayat' ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
            }`}>
              Riwayat & Kalender
            </span>
          </button>

          <button
            onClick={() => setActiveTab('grafik')}
            title="Grafik & Analitik"
            className={`group flex items-center p-2.5 sm:py-3 rounded-t-xl whitespace-nowrap transition-all select-none ${
              activeTab === 'grafik'
                ? 'bg-gray-50 text-emerald-900 shadow-xs px-3.5'
                : 'text-emerald-100 hover:bg-emerald-800/60 px-2.5 hover:px-3.5'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 font-bold ${
              activeTab === 'grafik' ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
            }`}>
              Grafik & Analitik
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pengaturan')}
            title="Master Kegiatan"
            className={`group flex items-center p-2.5 sm:py-3 rounded-t-xl whitespace-nowrap transition-all select-none ${
              activeTab === 'pengaturan'
                ? 'bg-gray-50 text-emerald-900 shadow-xs px-3.5'
                : 'text-emerald-100 hover:bg-emerald-800/60 px-2.5 hover:px-3.5'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 font-bold ${
              activeTab === 'pengaturan' ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
            }`}>
              Master Kegiatan
            </span>
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
      <div className="p-2.5 sm:p-6 flex-1 bg-gray-50 pb-24 sm:pb-8">
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
              <div className="max-w-4xl mx-auto w-full bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
                {/* PANDUAN PENTING BANNER */}
                <div className="bg-amber-100/90 border-l-4 border-amber-500 text-amber-950 p-2.5 sm:p-3 rounded-lg shadow-xs text-xs font-medium flex items-start gap-2">
                  <span className="text-amber-600 text-base shrink-0 leading-none">⚠️</span>
                  <span className="leading-relaxed">
                    <b className="uppercase">Panduan Penting:</b> Silakan <b>KLIK</b> pada nama santri yang <b>TIDAK HADIR</b> atau <b>MELANGGAR</b>. Santri yang hadir/tertib tidak perlu Anda klik.
                  </span>
                </div>

                {/* FORM BARIS ATAS: JENIS KEGIATAN, TANGGAL, KELAS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-none">
                  {/* Jenis Kegiatan */}
                  <div className="relative">
                    <select
                      value={formData.jenis_id}
                      onChange={e => setFormData(p => ({ ...p, jenis_id: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all cursor-pointer"
                    >
                      <option value="">-- Pilih Jenis Kegiatan --</option>
                      {jenisList.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tanggal */}
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.tgl_melanggar}
                      onChange={e => setFormData(p => ({ ...p, tgl_melanggar: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all cursor-pointer"
                    />
                  </div>

                  {/* Filter Kelas */}
                  <div className="relative">
                    <select
                      value={inputFilterKelas}
                      onChange={e => setInputFilterKelas(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all cursor-pointer"
                    >
                      <option value="">Semua Kelas</option>
                      {listKelasInput.map((k: any) => (
                        <option key={k} value={k}>
                          Kelas {k}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* CARI SANTRI + QUICK ACTIONS (PILIH SEMUA & RESET) */}
                <div className="flex gap-2 items-center flex-none">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={inputSearchQuery}
                      onChange={e => setInputSearchQuery(e.target.value)}
                      placeholder="Cari Santri..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                    />
                    {inputSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInputSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 font-bold text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <IconButton
                    type="button"
                    onClick={handleSelectAllVisible}
                    label="Pilih Semua"
                    icon={<CheckSquare className="w-3.5 h-3.5" />}
                    variant="gray"
                    size="sm"
                  />

                  {selectedCount > 0 && (
                    <IconButton
                      type="button"
                      onClick={handleClearSelection}
                      label="Reset Pilihan"
                      icon={<X className="w-3.5 h-3.5" />}
                      variant="rose"
                      size="sm"
                    />
                  )}
                </div>

                {/* GRID NAMA SANTRI (2 Kolom di HP, 3 di SM, 4 di MD) */}
                <div className="bg-gray-50/70 rounded-xl border border-gray-200 p-2 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 content-start gap-1.5 sm:gap-2 max-h-[50vh] sm:max-h-[55vh] custom-scrollbar">
                  {inputFilteredSantri.map(santri => (
                    <SantriInputCard
                      key={santri.id}
                      santri={santri}
                      isSelected={!!selectedSantri[santri.id]}
                      onToggle={handleToggleSantriInput}
                    />
                  ))}
                  {inputFilteredSantri.length === 0 && (
                    <div className="col-span-full text-center text-gray-400 text-xs py-12 italic">
                      Santri tidak ditemukan
                    </div>
                  )}
                </div>

                {/* FORM BARIS BAWAH: CATATAN + TOMBOL SIMPAN */}
                <div className="pt-2 border-t border-gray-200 flex flex-col sm:flex-row gap-2 flex-none">
                  <input
                    type="text"
                    placeholder="Catatan (Opsional)..."
                    value={formData.keterangan}
                    onChange={e => setFormData(p => ({ ...p, keterangan: e.target.value }))}
                    className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 font-medium"
                  />
                  <IconButton
                    type="button"
                    onClick={handleSubmitMassal}
                    disabled={isSubmitting || selectedCount === 0}
                    label={isSubmitting ? 'Menyimpan...' : 'Simpan Absen'}
                    icon={<Save className="w-4 h-4" />}
                    variant="emerald"
                    badge={selectedCount > 0 ? selectedCount : null}
                    badgeColor="bg-emerald-950"
                  />
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

                    <IconButton
                      onClick={() => setSortMode(prev => (prev === 'count' ? 'alpha' : 'count'))}
                      label={`Urutan: ${sortMode === 'count' ? 'Terbanyak' : 'A-Z'}`}
                      icon={<ArrowUpDown className="w-3.5 h-3.5 text-emerald-700" />}
                      variant="gray"
                      size="sm"
                    />
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
                        <IconButton
                          onClick={() => setSelectedTags([])}
                          label="Reset Filter"
                          icon={<X className="w-3 h-3 text-red-600" />}
                          variant="ghost"
                          size="sm"
                        />
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
                {/* KARTU SINKRONISASI LEGACY SANTRI-APP */}
                <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#021812] text-white p-6 rounded-2xl shadow-md border border-emerald-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
                      <Database className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white tracking-wide">
                        Sinkronisasi Data dari santri-app
                      </h3>
                      <p className="text-xs text-emerald-200/80">
                        Pindahkan 9.380 riwayat takziran, tandai 120 santri aktif, dan salin seluruh label/tag
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <IconButton
                      onClick={() => setShowSyncModal(true)}
                      label="Buka Panel Sinkronisasi"
                      icon={<RefreshCw className="w-3.5 h-3.5" />}
                      variant="gradient-amber"
                    />
                  </div>
                </div>

                {/* KARTU REVIEW DUPLIKAT & STANDARISASI FORMAT NAMA */}
                <div className="bg-gradient-to-br from-[#0c2b22] via-[#083a2d] to-[#042018] text-white p-6 rounded-2xl shadow-md border border-emerald-700/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-400/20 text-emerald-300 rounded-xl border border-emerald-400/30">
                      <CopyCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white tracking-wide">
                        Pemeriksaan Duplikat & Standarisasi Format Nama
                      </h3>
                      <p className="text-xs text-emerald-200/80">
                        Cari nama dobel, gabungkan riwayat absensi santri, dan ubah massal seluruh nama database menjadi Title Case (Ahmad Said).
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <IconButton
                      onClick={() => setShowDuplicateModal(true)}
                      label="Review Duplikat & Format"
                      icon={<CopyCheck className="w-3.5 h-3.5 text-emerald-400" />}
                      variant="gradient-emerald"
                    />
                  </div>
                </div>
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
                    <IconButton
                      disabled={isAddingJenis}
                      type="submit"
                      label="Tambah Jenis"
                      icon={<Plus className="w-4 h-4" />}
                      variant="emerald"
                    />
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
                            <IconButton
                              onClick={handleUpdateJenis}
                              icon={<Check className="w-4 h-4" />}
                              label="Simpan"
                              variant="emerald"
                              size="sm"
                            />
                            <IconButton
                              onClick={() => setEditingJenis(null)}
                              icon={<X className="w-4 h-4" />}
                              label="Batal"
                              variant="gray"
                              size="sm"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-gray-800 flex-1">{j.nama}</span>
                            <div className="flex items-center gap-1">
                              <IconButton
                                onClick={() => setEditingJenis({ id: j.id, nama: j.nama })}
                                icon={<Edit3 className="w-4 h-4" />}
                                label="Edit"
                                variant="sky"
                                size="sm"
                              />
                              <IconButton
                                onClick={() => handleDeleteJenis(j.id)}
                                icon={<Trash2 className="w-4 h-4" />}
                                label="Hapus"
                                variant="rose"
                                size="sm"
                              />
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

      {/* MODAL SINKRONISASI LEGACY SANTRI-APP */}
      <LegacySyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onComplete={() => {
          fetchAllData();
          showToast('Sinkronisasi data legacy santri-app berhasil!');
        }}
        currentSantriCount={santriList.length}
        currentLogsCount={allLogs.length}
      />

      {/* MODAL REVIEW DUPLIKAT & STANDARISASI FORMAT NAMA */}
      <DuplicateReviewModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onDataChanged={fetchAllData}
      />
    </div>
  );
}