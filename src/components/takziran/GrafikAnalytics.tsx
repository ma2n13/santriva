import { useState, useMemo, memo } from 'react';
import { Calendar, BarChart3, Users, ListFilter, Crown, ChevronDown } from 'lucide-react';

interface GrafikAnalyticsProps {
  logs: any[];
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
}

export const GrafikAnalytics = memo(function GrafikAnalytics({
  logs,
  startDate,
  endDate,
  setStartDate,
  setEndDate
}: GrafikAnalyticsProps) {
  const [detailTab, setDetailTab] = useState<'santri' | 'jenis'>('santri');
  const [openDetail, setOpenDetail] = useState<Record<string, boolean>>({});

  // Analisis Data berdasarkan range tanggal
  const { chartSantri, chartJenis, detailedLogs, maxSantriTotal, maxJenisTotal } = useMemo(() => {
    const filtered = logs.filter(l => l.tgl_melanggar >= startDate && l.tgl_melanggar <= endDate);

    const mapSantri: Record<string, { count: number; santriObj: any }> = {};
    const mapJenis: Record<string, Record<string, number>> = {};
    const groupedDetails: Record<string, any[]> = {};

    filtered.forEach(l => {
      const nama = l.santri?.nama_lengkap || l.nama || 'Santri';
      const jenisNama = l.master_jenis?.nama || l.jenis || 'Umum';

      // Hitung per Santri
      if (!mapSantri[nama]) {
        mapSantri[nama] = { count: 0, santriObj: l.santri || null };
      }
      mapSantri[nama].count++;

      (groupedDetails[nama] = groupedDetails[nama] || []).push(l);

      // Hitung per Jenis
      if (!mapJenis[jenisNama]) mapJenis[jenisNama] = {};
      mapJenis[jenisNama][nama] = (mapJenis[jenisNama][nama] || 0) + 1;
    });

    const sortedSantri = Object.entries(mapSantri)
      .map(([nama, data]) => ({
        nama,
        total: data.count,
        santri: data.santriObj
      }))
      .sort((a, b) => b.total - a.total);

    const sortedJenis = Object.entries(mapJenis)
      .map(([jenis, namesMap]) => {
        const topEntry = Object.entries(namesMap).sort((a, b) => b[1] - a[1])[0];
        const total = Object.values(namesMap).reduce((a, b) => a + b, 0);
        return {
          jenis,
          total,
          topName: topEntry?.[0] || '-',
          topCount: topEntry?.[1] || 0
        };
      })
      .sort((a, b) => b.total - a.total);

    const maxSantri = sortedSantri.length > 0 ? sortedSantri[0].total : 1;
    const maxJenis = sortedJenis.length > 0 ? sortedJenis[0].total : 1;

    return {
      chartSantri: sortedSantri,
      chartJenis: sortedJenis,
      detailedLogs: groupedDetails,
      maxSantriTotal: maxSantri,
      maxJenisTotal: maxJenis
    };
  }, [logs, startDate, endDate]);

  // Shortcut Preset Periode
  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const applyThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* FILTER PERIODE */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Filter Rentang Waktu
          </h3>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => applyPreset(7)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 transition-colors"
            >
              7 Hari
            </button>
            <button
              onClick={() => applyPreset(30)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 transition-colors"
            >
              30 Hari
            </button>
            <button
              onClick={applyThisMonth}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
            >
              Bulan Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* GRAFIK 1: RANKING PELANGGARAN SANTRI */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Ranking Pelanggaran Santri
          </h3>
          <span className="text-xs font-bold text-gray-400">
            {chartSantri.length} Santri Terdata
          </span>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto custom-scrollbar pr-1">
          {chartSantri.slice(0, 15).map((s, idx) => {
            const percentage = Math.round((s.total / maxSantriTotal) * 100);
            return (
              <div key={s.nama} className="group p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-center text-xs mb-1">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black shrink-0 ${
                        idx === 0
                          ? 'bg-red-500 text-white'
                          : idx === 1
                          ? 'bg-orange-500 text-white'
                          : idx === 2
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-gray-800 truncate">{s.nama}</span>
                    {s.santri?.kelas && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-semibold">
                        Kls {s.santri.kelas}
                      </span>
                    )}
                  </div>
                  <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg text-xs shrink-0">
                    {s.total}x
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {chartSantri.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-xs italic">
              Tidak ada data pelanggaran pada rentang waktu ini.
            </div>
          )}
        </div>
      </div>

      {/* GRAFIK 2: DISTRIBUSI JENIS PELANGGARAN */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-red-600" />
            Distribusi per Jenis Kegiatan / Pelanggaran
          </h3>
          <span className="text-xs font-bold text-gray-400">
            {chartJenis.length} Jenis
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
          {chartJenis.map((j) => {
            const percentage = Math.round((j.total / maxJenisTotal) * 100);
            return (
              <div key={j.jenis} className="p-2.5 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/20 transition-all">
                <div className="flex justify-between items-start text-xs mb-1.5">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="font-extrabold text-gray-900 block truncate">{j.jenis}</span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                      <Crown className="w-3 h-3 text-amber-500" />
                      <span>
                        Paling Sering: <b className="text-amber-700">{j.topName}</b> ({j.topCount}x)
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg text-xs shrink-0">
                    {j.total}x
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-500 to-rose-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {chartJenis.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-xs italic">
              Tidak ada data kegiatan pada rentang waktu ini.
            </div>
          )}
        </div>
      </div>

      {/* RINCIAN LENGKAP */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
            Rincian Lengkap Data
          </h3>
          <div className="flex bg-gray-200 p-0.5 rounded-lg text-xs font-bold">
            <button
              onClick={() => setDetailTab('santri')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                detailTab === 'santri' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Santri
            </button>
            <button
              onClick={() => setDetailTab('jenis')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                detailTab === 'jenis' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Jenis
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
          {detailTab === 'santri' && (
            <>
              {chartSantri.map(s => {
                const isOpen = !!openDetail[s.nama];
                const sLogs = detailedLogs[s.nama] || [];
                // Kelompokkan per jenis kegiatan
                const byJenis: Record<string, any[]> = {};
                sLogs.forEach(l => {
                  const jName = l.master_jenis?.nama || l.jenis || 'Umum';
                  (byJenis[jName] = byJenis[jName] || []).push(l);
                });

                return (
                  <div key={s.nama} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div
                      onClick={() => setOpenDetail(prev => ({ ...prev, [s.nama]: !prev[s.nama] }))}
                      className="p-3 bg-gray-50 hover:bg-emerald-50/60 cursor-pointer flex justify-between items-center transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{s.nama}</span>
                        {s.santri?.kelas && (
                          <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                            Kls {s.santri.kelas}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {s.total}x
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-3 bg-white space-y-2 border-t border-gray-100">
                        {Object.entries(byJenis).map(([jName, items]) => (
                          <div key={jName} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-1">
                            <div className="flex justify-between items-center font-bold text-xs text-amber-800">
                              <span>{jName}</span>
                              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded text-[10px]">
                                {items.length}x
                              </span>
                            </div>
                            <div className="space-y-0.5 pt-1">
                              {items.map((item, i) => (
                                <div key={i} className="text-[11px] text-gray-600 flex items-center justify-between">
                                  <span>
                                    • {new Date(item.tgl_melanggar).toLocaleDateString('id-ID', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short'
                                    })}
                                    {item.keterangan && (
                                      <span className="italic text-gray-800"> - "{item.keterangan}"</span>
                                    )}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 rounded ${
                                      item.status_tazir === 'Sudah'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {item.status_tazir === 'Sudah' ? 'Sudah Ditakzir' : 'Belum'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {chartSantri.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  Tidak ada rincian data santri pada periode ini.
                </div>
              )}
            </>
          )}

          {detailTab === 'jenis' && (
            <>
              {chartJenis.map(j => (
                <div key={j.jenis} className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm">{j.jenis}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      Top Pelanggar: <b className="text-amber-800 font-bold">{j.topName}</b> ({j.topCount}x)
                    </p>
                  </div>
                  <span className="bg-red-600 text-white font-black px-3 py-1 rounded-full text-xs shadow-xs">
                    {j.total} Total
                  </span>
                </div>
              ))}

              {chartJenis.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  Tidak ada rincian jenis kegiatan pada periode ini.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default GrafikAnalytics;
