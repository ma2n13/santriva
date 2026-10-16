import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CopyCheck, GitMerge, Trash2, CheckCircle2, AlertCircle, 
  Search, RefreshCw, X, Loader2, Sparkles, Filter
} from 'lucide-react';
import { 
  findDuplicateSantri, mergeSantri, deleteDuplicateSantri, 
  standardizeAllDatabaseNames, type DuplicateGroup, type DuplicateItem 
} from '../services/duplicateService';
import { formatSantriName } from '../utils/nameFormat';
import { IconButton } from './common/IconButton';

interface DuplicateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export default function DuplicateReviewModal({
  isOpen,
  onClose,
  onDataChanged
}: DuplicateReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'review' | 'standardize'>('review');
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pilihan primary item per kelompok: key = normalizedName, value = primaryId
  const [selectedPrimaries, setSelectedPrimaries] = useState<Record<string, string>>({});

  // Status proses aksi
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // State Standarisasi Nama
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [standardizeProgress, setStandardizeProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [standardizeResult, setStandardizeResult] = useState<{ totalChecked: number; totalUpdated: number } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Fetch Duplikat
  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await findDuplicateSantri();
      setDuplicateGroups(groups);

      // Default pilih item pertama (yang skor tertinggi / aktif) sebagai primary
      const defaultPrimaries: Record<string, string> = {};
      groups.forEach(g => {
        if (g.items.length > 0) {
          defaultPrimaries[g.normalizedName] = g.items[0].santri.id;
        }
      });
      setSelectedPrimaries(defaultPrimaries);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat daftar nama dobel', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      loadDuplicates();
      setStandardizeResult(null);
    }
  }, [isOpen, loadDuplicates]);

  // Filter kelompok duplikat berdasarkan toggle aktif & search bar
  const filteredGroups = useMemo(() => {
    let list = [...duplicateGroups];
    if (filterActiveOnly) {
      list = list.filter(g => g.hasActive);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(g => 
        g.displayName.toLowerCase().includes(q) || 
        g.items.some(it => it.santri.nama_lengkap.toLowerCase().includes(q))
      );
    }
    return list;
  }, [duplicateGroups, filterActiveOnly, searchQuery]);

  // Handler Gabungkan Data
  const handleMerge = async (group: DuplicateGroup, duplicateId: string) => {
    const primaryId = selectedPrimaries[group.normalizedName] || group.items[0].santri.id;
    if (primaryId === duplicateId) {
      return showToast('Data utama dan duplikat tidak boleh sama.', 'error');
    }

    const primaryItem = group.items.find(i => i.santri.id === primaryId);
    const duplicateItem = group.items.find(i => i.santri.id === duplicateId);

    const confirmMsg = `Konfirmasi penggabungan:\n\n` +
      `Data Utama (Disimpan):\n• ${formatSantriName(primaryItem?.santri.nama_lengkap)} (${primaryItem?.santri.status}, ${primaryItem?.logsCount} logs)\n\n` +
      `Data Duplikat (Akan Digabung & Dihapus):\n• ${formatSantriName(duplicateItem?.santri.nama_lengkap)} (${duplicateItem?.santri.status}, ${duplicateItem?.logsCount} logs)\n\n` +
      `Seluruh riwayat takziran, catatan, dan tagihan dari duplikat akan otomatis dipindahkan ke Data Utama. Lanjutkan?`;

    if (!confirm(confirmMsg)) return;

    setProcessingId(duplicateId);
    try {
      const res = await mergeSantri(primaryId, duplicateId);
      showToast(res.message, 'success');
      onDataChanged();
      await loadDuplicates();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handler Hapus Duplikat
  const handleDelete = async (item: DuplicateItem) => {
    const confirmMsg = item.logsCount > 0
      ? `PERINGATAN: Santri "${item.santri.nama_lengkap}" memiliki ${item.logsCount} riwayat log takziran!\n\n` +
        `Jika Anda menghapusnya, seluruh riwayat takziran tersebut juga akan terhapus permanen.\n` +
        `Saran: Sebaiknya gunakan fitur "Gabungkan Data" agar riwayat takzirannya tetap aman.\n\nYakin tetap ingin menghapus santri ini?`
      : `Hapus rekaman duplikat "${item.santri.nama_lengkap}" (${item.santri.status})? Data ini tidak memiliki riwayat log.`;

    if (!confirm(confirmMsg)) return;

    setProcessingId(item.santri.id);
    try {
      await deleteDuplicateSantri(item.santri.id, true);
      showToast(`Data duplikat "${formatSantriName(item.santri.nama_lengkap)}" berhasil dihapus.`, 'success');
      onDataChanged();
      await loadDuplicates();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handler Standarisasi Semua Nama
  const handleStandardizeAll = async () => {
    if (!confirm('Proses ini akan memeriksa seluruh nama di database Buku Induk dan menyesuaikan penulisannya menjadi standar Title Case (cth: "Ahmad Said", bukan "AHMAD SAID"). Lanjutkan?')) return;

    setIsStandardizing(true);
    setStandardizeResult(null);

    try {
      const res = await standardizeAllDatabaseNames((curr, tot, name) => {
        setStandardizeProgress({ current: curr, total: tot, currentName: name });
      });
      setStandardizeResult(res);
      showToast(`Berhasil menstandarisasikan ${res.totalUpdated} nama santri!`, 'success');
      onDataChanged();
      await loadDuplicates();
    } catch (err: any) {
      showToast(err.message || 'Gagal standarisasi nama', 'error');
    } finally {
      setIsStandardizing(false);
      setStandardizeProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-emerald-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-emerald-900/20 overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="bg-gradient-to-r from-[#032219] via-[#043325] to-[#021812] text-white p-5 sm:p-6 pb-0 border-b border-emerald-800 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-800/80 rounded-2xl border border-emerald-700 shadow-inner">
                <CopyCheck className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Pemeriksaan &amp; Review Nama Dobel
                </h3>
                <p className="text-xs text-emerald-200/80 font-medium">
                  Review santri dengan nama ganda, gabungkan riwayat absensi, atau standarisasi penulisan nama
                </p>
              </div>
            </div>
            <IconButton
              onClick={onClose}
              icon={<X className="w-5 h-5" />}
              label="Tutup"
              variant="ghost"
              size="sm"
            />
          </div>

          {/* TAB NAVIGASI MODAL */}
          <div className="flex gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('review')}
              title={`Review Nama Dobel (${duplicateGroups.length})`}
              className={`group flex items-center p-2.5 rounded-t-xl transition-all cursor-pointer ${
                activeTab === 'review'
                  ? 'bg-gray-50 text-emerald-950 shadow-xs px-3.5'
                  : 'text-emerald-200 hover:bg-emerald-800/50 px-2.5 hover:px-3.5'
              }`}
            >
              <CopyCheck className="w-4 h-4 text-amber-500 shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 font-bold ${
                activeTab === 'review' ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
              }`}>
                Review Nama Dobel ({duplicateGroups.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('standardize')}
              title="Standarisasi Format Nama (Title Case)"
              className={`group flex items-center p-2.5 rounded-t-xl transition-all cursor-pointer ${
                activeTab === 'standardize'
                  ? 'bg-gray-50 text-emerald-950 shadow-xs px-3.5'
                  : 'text-emerald-200 hover:bg-emerald-800/50 px-2.5 hover:px-3.5'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 font-bold ${
                activeTab === 'standardize' ? 'max-w-xs opacity-100 ml-2' : 'max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2'
              }`}>
                Standarisasi Format Nama
              </span>
            </button>
          </div>
        </div>

        {/* TOAST NOTIFIKASI */}
        {notification && (
          <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between ${
            notification.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{notification.msg}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-xs hover:underline cursor-pointer">✕</button>
          </div>
        )}

        {/* BODY TAB 1: REVIEW & PENGGABUNGAN NAMA DOBEL */}
        {activeTab === 'review' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 bg-gray-50 flex-1">
            {/* FILTER & PENCARIAN */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama santri dobel..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-gray-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <IconButton
                  onClick={() => setFilterActiveOnly(prev => !prev)}
                  label={filterActiveOnly ? 'Santri Aktif Saja' : 'Seluruh Duplikat'}
                  icon={<Filter className="w-3.5 h-3.5" />}
                  variant={filterActiveOnly ? 'emerald' : 'gray'}
                  size="sm"
                />

                <IconButton
                  onClick={loadDuplicates}
                  disabled={loading}
                  label={loading ? 'Memuat...' : 'Muat Ulang'}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                  variant="gray"
                  size="sm"
                />
              </div>
            </div>

            {/* DAFTAR KELOMPOK NAMA DOBEL */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-xs font-bold">Menganalisis dan mencari nama-nama dobel...</span>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-extrabold text-sm text-gray-800">
                  {filterActiveOnly ? 'Tidak Ditemukan Nama Dobel pada Santri Aktif!' : 'Tidak Ada Nama Dobel yang Ditemukan!'}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Seluruh nama santri pada filter ini telah unik dan tertata rapi.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map(group => {
                  const currentPrimaryId = selectedPrimaries[group.normalizedName] || group.items[0]?.santri.id;

                  return (
                    <div 
                      key={group.normalizedName} 
                      className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
                    >
                      {/* GROUP HEADER */}
                      <div className="bg-gradient-to-r from-emerald-50 to-amber-50/40 px-4 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-emerald-950 font-display">
                            {group.displayName}
                          </span>
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-full">
                            {group.items.length} Data Terdaftar
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Pilih salah satu sebagai <strong>Data Utama</strong> untuk digabungkan
                        </p>
                      </div>

                      {/* ITEM CARDS */}
                      <div className="p-3 sm:p-4 divide-y divide-gray-100 space-y-3">
                        {group.items.map(item => {
                          const isPrimary = currentPrimaryId === item.santri.id;
                          const isProcessing = processingId === item.santri.id;

                          return (
                            <div 
                              key={item.santri.id}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                                isPrimary 
                                  ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs' 
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {/* INFORMASI SANTRI */}
                              <div className="flex items-start gap-3 flex-1">
                                <input
                                  type="radio"
                                  name={`primary-${group.normalizedName}`}
                                  checked={isPrimary}
                                  onChange={() => setSelectedPrimaries(p => ({ ...p, [group.normalizedName]: item.santri.id }))}
                                  className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  title="Pilih sebagai Data Utama"
                                />

                                <div className="space-y-1 text-xs">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-extrabold text-gray-900 text-sm">
                                      {formatSantriName(item.santri.nama_lengkap)}
                                    </span>
                                    <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded border">
                                      {item.santri.kode_unik}
                                    </span>
                                    {isPrimary && (
                                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.2 rounded-md shadow-xs">
                                        Data Utama
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
                                    <span className={`px-2 py-0.5 rounded font-bold ${
                                      item.santri.status === 'Aktif' 
                                        ? 'bg-emerald-100 text-emerald-900' 
                                        : item.santri.status === 'AKTIF TANPA ROMBEL' 
                                        ? 'bg-amber-100 text-amber-900' 
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      Status: {item.santri.status}
                                    </span>
                                    {item.santri.kelas && (
                                      <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded font-semibold border border-blue-200/60">
                                        Kls {item.santri.kelas}
                                      </span>
                                    )}
                                    {item.santri.asrama && (
                                      <span className="bg-purple-50 text-purple-900 px-2 py-0.5 rounded font-semibold border border-purple-200/60">
                                        {item.santri.asrama}
                                      </span>
                                    )}
                                    {item.santri.nis && (
                                      <span className="text-gray-500 font-mono">NIS: {item.santri.nis}</span>
                                    )}
                                  </div>

                                  {/* STATISTIK LOG / RIWAYAT */}
                                  <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold text-gray-500">
                                    <span className={item.logsCount > 0 ? 'text-emerald-700 font-bold' : ''}>
                                      • {item.logsCount} Log Riwayat
                                    </span>
                                    <span>• {item.catatanCount} Catatan</span>
                                    <span>• {item.prestasiCount} Prestasi</span>
                                  </div>
                                </div>
                              </div>

                              {/* TOMBOL TINDAKAN */}
                              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                {!isPrimary && (
                                  <>
                                    <IconButton
                                      onClick={() => handleMerge(group, item.santri.id)}
                                      disabled={!!processingId}
                                      label="Gabungkan ke Utama"
                                      icon={isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5 text-amber-300" />}
                                      variant="emerald"
                                      size="sm"
                                    />

                                    <IconButton
                                      onClick={() => handleDelete(item)}
                                      disabled={!!processingId}
                                      label="Hapus Duplikat"
                                      icon={<Trash2 className="w-3.5 h-3.5" />}
                                      variant="rose"
                                      size="sm"
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BODY TAB 2: STANDARISASI FORMAT NAMA */}
        {activeTab === 'standardize' && (
          <div className="p-6 overflow-y-auto space-y-6 bg-gray-50 flex-1">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-gray-900">
                    Standar Penulisan Nama Santri: Title Case
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Sistem kini menetapkan standar resmi penulisan nama seperti <strong className="text-emerald-800">Ahmad Said</strong> (bukan kapital semua seperti <span className="font-mono text-red-600">AHMAD SAID</span> atau huruf kecil semua).
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
                <h5 className="font-bold text-emerald-900 uppercase tracking-wide">
                  Aturan Otomatis yang Diterapkan:
                </h5>
                <ul className="list-disc list-inside space-y-1 text-emerald-950 font-medium">
                  <li><strong>Tampilan Otomatis:</strong> Di seluruh modul (Buku Induk, Absensi, Takziran, Wali Portal, Admin Review), nama otomatis ditampilkan dalam standar Title Case.</li>
                  <li><strong>Penyimpanan Otomatis:</strong> Setiap pendaftaran santri baru, edit data, maupun impor file Excel akan otomatis disesuaikan format namanya sebelum disimpan.</li>
                  <li><strong>Penanganan Khusus:</strong> Nama dengan tanda petik/apostrof internal (seperti <em>Ma'arif</em>, <em>Syifa'ul</em>, <em>Syafi'i</em>) dan partikel <em>Al-</em> tetap mempertahankan ejaan aslinya yang benar.</li>
                </ul>
              </div>

              {/* INDIKATOR PROGRES STANDARISASI DATABASE */}
              {isStandardizing && standardizeProgress && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-xs animate-pulse">
                  <div className="flex justify-between items-center font-bold text-amber-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                      Menstandarisasikan: {standardizeProgress.currentName}
                    </span>
                    <span className="font-mono">
                      {standardizeProgress.current} / {standardizeProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-amber-600 h-2 rounded-full transition-all duration-200" 
                      style={{ width: `${Math.round((standardizeProgress.current / standardizeProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* LAPORAN SUKSES */}
              {standardizeResult && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-900 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Berhasil memeriksa {standardizeResult.totalChecked} santri dan memperbarui {standardizeResult.totalUpdated} nama menjadi standar Title Case!
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <IconButton
                  onClick={handleStandardizeAll}
                  disabled={isStandardizing}
                  label={isStandardizing ? 'Menstandarisasikan Database...' : 'Mulai Standarisasi Semua Nama'}
                  icon={isStandardizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                  variant="emerald"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
          <IconButton
            onClick={onClose}
            label="Tutup"
            icon={<X className="w-4 h-4" />}
            variant="gray"
          />
        </div>
      </div>
    </div>
  );
}
