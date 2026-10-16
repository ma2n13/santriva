import { useState, useMemo, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Printer, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { exportAttendanceToExcel, exportAttendanceToPrint } from '../../utils/exportAttendance';

const INDO_DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface HistoryGridProps {
  santriId: string;
  nama: string;
  kelas?: string | null;
  asrama?: string | null;
  logs: any[];
  types: { id: string; nama: string }[];
  isAdmin?: boolean;
  canDelete?: boolean;
  onDeleteLog?: (logId: string) => void;
  onDeleteAll?: (santriId: string, nama: string) => void;
}

export const HistoryGrid = memo(function HistoryGrid({
  santriId,
  nama,
  kelas,
  asrama,
  logs,
  types,
  isAdmin = false,
  canDelete = false,
  onDeleteLog,
  onDeleteAll
}: HistoryGridProps) {
  const [currDate, setCurrDate] = useState(() => new Date());
  const [activeCellModal, setActiveCellModal] = useState<any | null>(null);

  const changeMonth = useCallback((delta: number) => {
    setCurrDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + delta);
      return d;
    });
  }, []);

  const { year, month, daysInMonth, monthName, daysArray, firstDayOfWeek } = useMemo(() => {
    const year = currDate.getFullYear();
    const month = currDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return {
      year,
      month,
      daysInMonth,
      monthName: currDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
      daysArray: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      firstDayOfWeek: new Date(year, month, 1).getDay()
    };
  }, [currDate]);

  // Log bulan ini
  const currentMonthLogs = useMemo(() => {
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    return logs.filter(l => l.tgl_melanggar >= startStr && l.tgl_melanggar <= endStr);
  }, [logs, year, month, daysInMonth]);

  // Map untuk lookup O(1)
  const violationsMap = useMemo(() => {
    const map = new Map<string, any>();
    currentMonthLogs.forEach(l => {
      const typeKey = l.jenis_id || l.master_jenis?.nama || l.jenis;
      map.set(`${typeKey}_${l.tgl_melanggar}`, l);
      if (l.master_jenis?.nama) {
        map.set(`${l.master_jenis.nama}_${l.tgl_melanggar}`, l);
      }
    });
    return map;
  }, [currentMonthLogs]);

  const handleExportExcel = useCallback(() => {
    exportAttendanceToExcel({
      nama,
      kelas,
      asrama,
      logs,
      types,
      currentDate: currDate
    });
  }, [nama, kelas, asrama, logs, types, currDate]);

  const handleExportPrint = useCallback(() => {
    exportAttendanceToPrint({
      nama,
      kelas,
      asrama,
      logs,
      types,
      currentDate: currDate
    });
  }, [nama, kelas, asrama, logs, types, currDate]);

  const handleDeleteAllConfirm = useCallback(() => {
    if (onDeleteAll) {
      onDeleteAll(santriId, nama);
    }
  }, [onDeleteAll, santriId, nama]);

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm select-none">
      {/* HEADER BAR BULAN & EKSPOR */}
      <div className="flex flex-wrap justify-between items-center bg-gray-50 p-2.5 border-b border-gray-200 gap-2">
        <div className="flex items-center gap-1.5 min-w-[200px]">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 rounded-lg transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-sm text-emerald-950 uppercase tracking-wide px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-xs">
            {monthName}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 rounded-lg transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold shadow-xs cursor-pointer"
            title="Unduh Lembar Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">XLSX</span>
          </button>
          <button
            onClick={handleExportPrint}
            className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold shadow-xs cursor-pointer"
            title="Cetak / Simpan PDF Landscape"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          {isAdmin && onDeleteAll && (
            <button
              onClick={handleDeleteAllConfirm}
              className="bg-gray-100 hover:bg-red-50 text-red-600 border border-red-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              title={`Hapus seluruh riwayat pelanggaran ${nama}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MATRIX KALENDER */}
      <div className="overflow-x-auto custom-scrollbar pb-1">
        <div className="inline-block min-w-full align-middle">
          {/* Header Hari */}
          <div className="flex border-b border-gray-200 bg-gray-100/80">
            <div className="sticky left-0 z-20 w-44 min-w-[11rem] bg-gray-200 border-r border-gray-300 shrink-0 p-2 text-xs font-black text-gray-700 flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
              Jenis Kegiatan
            </div>
            {daysArray.map(d => {
              const dayName = INDO_DAY_NAMES[(firstDayOfWeek + d - 1) % 7];
              const isSunday = dayName === 'Min';
              return (
                <div
                  key={d}
                  className={`h-11 min-w-[2.25rem] w-9 flex flex-col items-center justify-center border-r border-gray-200 shrink-0 ${
                    isSunday ? 'bg-red-50/70' : 'bg-gray-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold leading-none ${isSunday ? 'text-red-700 font-extrabold' : 'text-gray-700'}`}>
                    {d}
                  </span>
                  <span className={`text-[8px] mt-0.5 font-semibold ${isSunday ? 'text-red-600 font-extrabold' : 'text-gray-400'}`}>
                    {dayName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Baris Jenis Kegiatan */}
          {types.map(jenis => (
            <div key={jenis.id} className="flex border-b border-gray-100 hover:bg-emerald-50/30 transition-colors">
              <div
                className="sticky left-0 z-10 w-44 min-w-[11rem] bg-white border-r border-gray-200 shrink-0 px-3 py-1.5 text-[11px] font-medium leading-tight flex items-center text-gray-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate"
                title={jenis.nama}
              >
                {jenis.nama}
              </div>
              {daysArray.map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const violation = violationsMap.get(`${jenis.id}_${dateStr}`) || violationsMap.get(`${jenis.nama}_${dateStr}`);

                let cellBg = 'bg-white hover:bg-gray-50';
                let content = '-';
                let textColor = 'text-gray-200';

                if (violation) {
                  if (violation.status_tazir === 'Sudah') {
                    cellBg = 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer';
                    content = 'X';
                    textColor = 'text-white font-black';
                  } else {
                    cellBg = 'bg-red-600 hover:bg-red-700 text-white shadow-inner cursor-pointer';
                    content = 'X';
                    textColor = 'text-white font-black';
                  }
                }

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => violation && setActiveCellModal(violation)}
                    className={`h-9 min-w-[2.25rem] w-9 flex items-center justify-center border-r border-gray-100 text-[10px] transition-all shrink-0 ${cellBg} ${textColor}`}
                    title={
                      violation
                        ? `${violation.master_jenis?.nama || jenis.nama} (${violation.tgl_melanggar})\nStatus: ${violation.status_tazir === 'Sudah' ? 'Sudah Ditakzir' : 'Belum Ditakzir'}${violation.keterangan ? `\nCatatan: ${violation.keterangan}` : ''}\nKlik untuk rincian.`
                        : `Tanggal ${day} - Tertib`
                    }
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ))}

          {types.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-400 italic">
              Belum ada master jenis kegiatan. Tambahkan di tab Master Kegiatan.
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETAIL PELANGGARAN KETIKA SEL DIKLIK */}
      {activeCellModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h4 className="font-extrabold text-base text-gray-900">Detail Pelanggaran</h4>
                <p className="text-xs text-gray-500 font-medium">{nama}</p>
              </div>
              <button
                onClick={() => setActiveCellModal(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Kegiatan:</span>
                <span className="font-bold text-gray-800">{activeCellModal.master_jenis?.nama || 'Umum'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Tanggal:</span>
                <span className="font-bold text-gray-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  {new Date(activeCellModal.tgl_melanggar).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Status Takziran:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    activeCellModal.status_tazir === 'Sudah'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {activeCellModal.status_tazir === 'Sudah'
                    ? `Sudah Ditakzir (${activeCellModal.tazir_by || 'Pengurus'})`
                    : 'Belum Ditakzir'}
                </span>
              </div>
              {activeCellModal.input_by && (
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Petugas Input:</span>
                  <span className="font-semibold text-gray-700">{activeCellModal.input_by}</span>
                </div>
              )}
              {activeCellModal.keterangan && (
                <div className="pt-1">
                  <span className="text-gray-500 font-medium block mb-1">Catatan Pelanggaran:</span>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 italic">
                    "{activeCellModal.keterangan}"
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setActiveCellModal(null)}
                className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Tutup
              </button>
              {canDelete && onDeleteLog && (
                <button
                  onClick={() => {
                    if (confirm('Hapus log pelanggaran tanggal ini?')) {
                      onDeleteLog(activeCellModal.id);
                      setActiveCellModal(null);
                    }
                  }}
                  className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Log
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KETERANGAN LEGENDA */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-red-600 text-white font-bold text-[9px] flex items-center justify-center">X</span>
            <span>Belum Takzir</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center">X</span>
            <span>Sudah Ditakzir</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-gray-100 text-gray-400 font-light text-[9px] flex items-center justify-center">-</span>
            <span>Hadir / Tertib</span>
          </span>
        </div>
        <div className="text-[10px] text-gray-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Klik kotak merah/kuning untuk melihat rincian & menghapus log
        </div>
      </div>
    </div>
  );
});

export default HistoryGrid;
