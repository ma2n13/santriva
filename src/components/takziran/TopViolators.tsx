import { useMemo, memo } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { formatSantriName } from '../../utils/nameFormat';

interface TopViolatorEntry {
  santriId: string;
  nama: string;
  kelas?: string | null;
  asrama?: string | null;
  count: number;
}

interface TopViolatorGroup {
  jenisNama: string;
  topNames: TopViolatorEntry[];
}

interface TopViolatorsProps {
  logs: any[];
  onSelectSantri: (santriId: string, nama: string) => void;
}

export const TopViolators = memo(function TopViolators({ logs, onSelectSantri }: TopViolatorsProps) {
  const topData = useMemo(() => {
    // Batas 2 bulan terakhir
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 2);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const recentLogs = logs.filter(l => l.tgl_melanggar >= cutoffStr);
    const grouped: Record<string, Record<string, TopViolatorEntry>> = {};

    recentLogs.forEach(l => {
      const jenisName = l.master_jenis?.nama || l.jenis_nama || 'Umum';
      const santriId = l.santri_id || l.santri?.id;
      const santriNama = l.santri?.nama_lengkap || l.nama || 'Santri';

      if (!santriId) return;

      if (!grouped[jenisName]) grouped[jenisName] = {};
      if (!grouped[jenisName][santriId]) {
        grouped[jenisName][santriId] = {
          santriId,
          nama: santriNama,
          kelas: l.santri?.kelas || null,
          asrama: l.santri?.asrama || null,
          count: 0
        };
      }
      grouped[jenisName][santriId].count++;
    });

    const result: TopViolatorGroup[] = Object.entries(grouped)
      .map(([jenisNama, santriObj]) => {
        const topNames = Object.values(santriObj)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        return { jenisNama, topNames };
      })
      .filter(d => d.topNames.length > 0)
      .sort((a, b) => b.topNames[0].count - a.topNames[0].count);

    return result;
  }, [logs]);

  if (topData.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="bg-amber-100 text-amber-700 p-1.5 rounded-lg shadow-sm">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              Top 10 Pelanggaran
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                2 Bulan Terakhir
              </span>
            </h3>
            <p className="text-[10px] text-gray-500">Klik nama santri untuk langsung membuka kalender & rinciannya</p>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar snap-x">
        {topData.map((group, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-xl p-3 min-w-[240px] max-w-[280px] shrink-0 snap-start shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2">
                <h4
                  className="font-bold text-emerald-800 text-xs uppercase truncate max-w-[190px]"
                  title={group.jenisNama}
                >
                  {group.jenisNama}
                </h4>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>

              <div className="space-y-1">
                {group.topNames.map((santri, i) => (
                  <div
                    key={santri.santriId}
                    onClick={() => onSelectSantri(santri.santriId, santri.nama)}
                    className="flex justify-between items-center p-1.5 hover:bg-emerald-50/70 rounded-lg cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className={`w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0 shadow-xs ${
                          i === 0
                            ? 'bg-red-500 text-white'
                            : i === 1
                            ? 'bg-orange-500 text-white'
                            : i === 2
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="truncate">
                        <span className="text-[11px] font-semibold text-gray-700 truncate group-hover:text-emerald-800 transition-colors block">
                          {formatSantriName(santri.nama)}
                        </span>
                        {(santri.kelas || santri.asrama) && (
                          <span className="text-[9px] text-gray-400 block leading-tight truncate">
                            {santri.kelas ? `Kls ${santri.kelas}` : ''}
                            {santri.kelas && santri.asrama ? ' • ' : ''}
                            {santri.asrama || ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 group-hover:bg-emerald-100 group-hover:text-emerald-800 text-gray-600 px-1.5 py-0.5 rounded shadow-xs shrink-0 transition-colors">
                      {santri.count}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default TopViolators;
