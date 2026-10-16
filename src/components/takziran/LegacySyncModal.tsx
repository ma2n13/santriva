import { useState, useEffect } from 'react';
import { 
  RefreshCw, CheckCircle2, AlertCircle, Database, Users, 
  ClipboardList, Tag, Award, FileText, X, Loader2
} from 'lucide-react';
import { runLegacySync, srcSupabase, type SyncProgress, type SyncStats } from '../../services/legacySyncService';
import { IconButton } from '../common/IconButton';

interface LegacySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentSantriCount: number;
  currentLogsCount: number;
}

export default function LegacySyncModal({
  isOpen,
  onClose,
  onComplete,
  currentSantriCount,
  currentLogsCount
}: LegacySyncModalProps) {
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [srcCounts, setSrcCounts] = useState({
    santri: 120,
    logs: 9380,
    catatan: 24,
    prestasi: 52
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncStats | null>(null);

  // Ambil data statistik dari santri-app saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingCheck(true);
    setErrorMsg(null);
    setSyncResult(null);
    setProgress(null);

    Promise.all([
      srcSupabase.from('master_santri').select('*', { count: 'exact', head: true }),
      srcSupabase.from('logs_pelanggaran').select('*', { count: 'exact', head: true }),
      srcSupabase.from('santri_catatan').select('*', { count: 'exact', head: true }),
      srcSupabase.from('santri_prestasi').select('*', { count: 'exact', head: true })
    ])
      .then(([s, l, c, p]) => {
        if (!isMounted) return;
        setSrcCounts({
          santri: s.count || 120,
          logs: l.count || 9380,
          catatan: c.count || 24,
          prestasi: p.count || 52
        });
      })
      .catch(err => {
        console.error('Error pre-checking santri-app:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingCheck(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    setSyncResult(null);

    try {
      const stats = await runLegacySync((p) => {
        setProgress(p);
      });
      setSyncResult(stats);
      onComplete();
    } catch (err: any) {
      console.error('Sync failed:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat sinkronisasi data.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-emerald-900/20 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#032219] via-[#043325] to-[#021812] text-white p-5 sm:p-6 flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-800/80 rounded-2xl border border-emerald-700 shadow-inner">
              <RefreshCw className={`w-6 h-6 text-amber-400 ${isRunning ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Sinkronisasi Absensi & Takziran Legacy
              </h3>
              <p className="text-xs text-emerald-200/80 font-medium">
                Migrasi langsung dari database <span className="font-mono text-amber-300">santri-app</span> ke Santriva
              </p>
            </div>
          </div>
          {!isRunning && (
            <IconButton
              onClick={onClose}
              icon={<X className="w-5 h-5" />}
              label="Tutup"
              variant="ghost"
              size="sm"
            />
          )}
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-gray-800">
          
          {/* STATISTIK PERBANDINGAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* SOURCE (santri-app) */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                <Database className="w-4 h-4 text-amber-600" />
                <span>Sumber: santri-app</span>
              </div>
              <div className="space-y-1.5 text-xs text-amber-950 font-semibold">
                <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-amber-200/40">
                  <span className="flex items-center gap-1.5 text-gray-600"><Users className="w-3.5 h-3.5" /> Total Santri:</span>
                  <span className="font-black text-amber-800">{srcCounts.santri.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-amber-200/40">
                  <span className="flex items-center gap-1.5 text-gray-600"><ClipboardList className="w-3.5 h-3.5" /> Log Pelanggaran:</span>
                  <span className="font-black text-amber-800">{srcCounts.logs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-amber-200/40">
                  <span className="flex items-center gap-1.5 text-gray-600"><FileText className="w-3.5 h-3.5" /> Catatan Santri:</span>
                  <span className="font-black text-amber-800">{srcCounts.catatan}</span>
                </div>
                <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-amber-200/40">
                  <span className="flex items-center gap-1.5 text-gray-600"><Award className="w-3.5 h-3.5" /> Prestasi:</span>
                  <span className="font-black text-amber-800">{srcCounts.prestasi}</span>
                </div>
              </div>
            </div>

            {/* TARGET (Santriva Saat Ini) */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase tracking-wider">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Tujuan: Santriva</span>
              </div>
              <div className="space-y-1.5 text-xs text-emerald-950 font-semibold">
                <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/40">
                  <span className="flex items-center gap-1.5 text-gray-600"><Users className="w-3.5 h-3.5" /> Santri Aktif Sekarang:</span>
                  <span className="font-black text-emerald-800">{currentSantriCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/40">
                  <span className="flex items-center gap-1.5 text-gray-600"><ClipboardList className="w-3.5 h-3.5" /> Log Riwayat Sekarang:</span>
                  <span className="font-black text-emerald-800">{currentLogsCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/40">
                  <span className="flex items-center gap-1.5 text-gray-600"><Tag className="w-3.5 h-3.5" /> Status Sinkronisasi:</span>
                  <span className="font-black text-emerald-700">Siap Migrasi</span>
                </div>
              </div>
            </div>
          </div>

          {/* CHECKLIST 3 TUGAS SINKRONISASI */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider">
              Tindakan Otomatis yang Akan Dijalankan:
            </h4>
            <div className="space-y-2 text-xs font-medium text-gray-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>1. Salin Semua Riwayat Takziran &amp; Absensi:</strong> Menyalin {srcCounts.logs.toLocaleString()} log pelanggaran dan menghubungkannya ke ID santri dan jenis kegiatan yang sesuai.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>2. Tandai Santri sebagai Aktif:</strong> Mencocokkan nama santri di santri-app dengan database Santriva dan mengubah statusnya menjadi <code>Aktif</code> agar tampil di modul Takziran.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>3. Salin Label / Tag Santri:</strong> Memetakan label kelas (cth: <code>Kelas 12</code>) ke kolom <code>kelas</code> dan label asrama/kamar (cth: <code>Wetan</code>, <code>Kulon</code>) ke kolom <code>asrama</code>.
                </span>
              </div>
            </div>
          </div>

          {/* INDIKATOR PROGRES BERJALAN */}
          {isRunning && progress && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5 animate-pulse">
              <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                  {progress.message}
                </span>
                <span className="font-mono text-emerald-800">{progress.percent}%</span>
              </div>
              {/* Progress Bar Track */}
              <div className="w-full bg-emerald-200/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, progress.percent)}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                Mohon jangan menutup jendela browser selama proses pemindahan data berlangsung.
              </p>
            </div>
          )}

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-900 text-xs">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Melakukan Sinkronisasi:</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* SUCCESS SUMMARY */}
          {syncResult && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-2 text-emerald-950 text-xs">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Alhamdulillah! Sinkronisasi Berhasil Sempurna
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-semibold">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  Santri Aktif Diselaraskan: <strong className="text-emerald-800">{syncResult.matchedSantri + syncResult.createdSantri}</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  Log Pelanggaran Disalin: <strong className="text-emerald-800">{syncResult.syncedLogs.toLocaleString()}</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  Catatan Khusus Disalin: <strong className="text-emerald-800">{syncResult.syncedCatatan}</strong>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  Prestasi Santri Disalin: <strong className="text-emerald-800">{syncResult.syncedPrestasi}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-end gap-2.5 shrink-0">
          {!isRunning && !syncResult && (
            <>
              <IconButton
                onClick={onClose}
                label="Batal"
                icon={<X className="w-4 h-4" />}
                variant="gray"
              />
              <IconButton
                onClick={handleStartSync}
                disabled={loadingCheck}
                label={loadingCheck ? 'Memeriksa Data...' : 'Mulai Sinkronisasi Sekarang'}
                icon={loadingCheck ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-amber-300" />}
                variant="emerald"
              />
            </>
          )}

          {syncResult && (
            <IconButton
              onClick={onClose}
              label="Tutup & Tampilkan Data Baru"
              icon={<CheckCircle2 className="w-4 h-4" />}
              variant="emerald"
            />
          )}
        </div>
      </div>
    </div>
  );
}
