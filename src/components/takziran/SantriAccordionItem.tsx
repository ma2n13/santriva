import { useState, useCallback, useMemo, memo } from 'react';
import { 
  ChevronDown, CheckCircle, Trash2, Calendar, User, 
  Star, FileText, Check, X, Sparkles, CheckSquare, Square, Edit3, Plus
} from 'lucide-react';
import HistoryGrid from './HistoryGrid';

interface SantriAccordionItemProps {
  santri: any;
  santriLogs: any[];
  notes: any[];
  prestasiItems: any[];
  filterTazir: boolean;
  isExpanded: boolean;
  onToggleExpand: (santriId: string) => void;
  types: { id: string; nama: string }[];
  isAdmin: boolean;
  canDelete: boolean;
  canTazir: boolean;
  onTazirSingle: (logId: string) => void;
  onTazirBulk: (santriId: string, logIds: string[]) => void;
  onDeleteLog: (logId: string) => void;
  onDeleteManyLogs: (logIds: string[]) => void;
  onDeleteAllLogs: (santriId: string, nama: string) => void;
  onAddNote: (santriId: string, text: string) => void;
  onUpdateNote: (noteId: string, text: string) => void;
  onDeleteNote: (noteId: string) => void;
  onAddPrestasi: (santriId: string, text: string) => void;
  onUpdatePrestasi: (prestasiId: string, text: string) => void;
  onDeletePrestasi: (prestasiId: string) => void;
  onOpenAiWaModal: (santri: any, logs: any[]) => void;
}

export const SantriAccordionItem = memo(function SantriAccordionItem({
  santri,
  santriLogs,
  notes,
  prestasiItems,
  filterTazir,
  isExpanded,
  onToggleExpand,
  types,
  isAdmin,
  canDelete,
  canTazir,
  onTazirSingle,
  onTazirBulk,
  onDeleteLog,
  onDeleteManyLogs,
  onDeleteAllLogs,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddPrestasi,
  onUpdatePrestasi,
  onDeletePrestasi,
  onOpenAiWaModal
}: SantriAccordionItemProps) {
  // Local state untuk inline editing catatan / prestasi
  const [editState, setEditState] = useState<{ type: 'note' | 'prestasi' | null; id: string | null; text: string }>({
    type: null,
    id: null,
    text: ''
  });

  // Local state untuk form input baru
  const [noteInput, setNoteInput] = useState('');
  const [prestasiInput, setPrestasiInput] = useState('');

  // Local state untuk seleksi massal checklist pelanggaran
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);

  const startEdit = useCallback((type: 'note' | 'prestasi', item: any) => {
    setEditState({
      type,
      id: item.id,
      text: type === 'note' ? item.isi : item.prestasi
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditState({ type: null, id: null, text: '' });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editState.text.trim() || !editState.id) return cancelEdit();
    if (editState.type === 'note') {
      onUpdateNote(editState.id, editState.text.trim());
    } else if (editState.type === 'prestasi') {
      onUpdatePrestasi(editState.id, editState.text.trim());
    }
    cancelEdit();
  }, [editState, onUpdateNote, onUpdatePrestasi, cancelEdit]);

  const handleCreateNote = useCallback(() => {
    if (!noteInput.trim()) return;
    onAddNote(santri.id, noteInput.trim());
    setNoteInput('');
  }, [noteInput, onAddNote, santri.id]);

  const handleCreatePrestasi = useCallback(() => {
    if (!prestasiInput.trim()) return;
    onAddPrestasi(santri.id, prestasiInput.trim());
    setPrestasiInput('');
  }, [prestasiInput, onAddPrestasi, santri.id]);

  // Log filter belum takzir vs semua
  const pendingLogs = useMemo(() => santriLogs.filter(l => l.status_tazir === 'Belum'), [santriLogs]);
  const displayCount = filterTazir ? pendingLogs.length : santriLogs.length;

  const toggleSelectLog = useCallback((id: string) => {
    setSelectedLogIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const handleSelectAllLogs = useCallback(() => {
    setSelectedLogIds(prev => (prev.length === pendingLogs.length ? [] : pendingLogs.map(l => l.id)));
  }, [pendingLogs]);

  const handleBulkTakzirAction = useCallback(() => {
    if (selectedLogIds.length === 0) return;
    onTazirBulk(santri.id, selectedLogIds);
    setSelectedLogIds([]);
  }, [selectedLogIds, onTazirBulk, santri.id]);

  const handleBulkDeleteAction = useCallback(() => {
    if (selectedLogIds.length === 0) return;
    if (confirm(`Hapus ${selectedLogIds.length} item pelanggaran terpilih?`)) {
      onDeleteManyLogs(selectedLogIds);
      setSelectedLogIds([]);
    }
  }, [selectedLogIds, onDeleteManyLogs]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:border-emerald-300 transition-all">
      {/* HEADER ACCORDION */}
      <div
        className="p-3.5 sm:p-4 bg-gray-50/80 hover:bg-emerald-50/50 flex justify-between items-center cursor-pointer transition-colors border-b border-gray-100"
        onClick={() => onToggleExpand(santri.id)}
      >
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4 className="font-extrabold text-base text-gray-900 truncate">{santri.nama_lengkap}</h4>
            {santri.kelas && (
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Kls {santri.kelas}
              </span>
            )}
            {santri.asrama && (
              <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                {santri.asrama}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 font-medium">
            {filterTazir
              ? `${pendingLogs.length} pelanggaran menunggu takziran`
              : `${santriLogs.length} total catatan pelanggaran`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black shadow-xs ${
              displayCount > 0
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {displayCount}
          </span>

          {filterTazir && canTazir && pendingLogs.length > 0 && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (confirm(`Selesaikan seluruh (${pendingLogs.length}) takziran santri ${santri.nama_lengkap}?`)) {
                  onTazirBulk(santri.id, pendingLogs.map(l => l.id));
                }
              }}
              className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-xl font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Takzir Semua
            </button>
          )}

          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-emerald-700' : ''
            }`}
          />
        </div>
      </div>

      {/* ISI EXPANDED ACCORDION */}
      {isExpanded && (
        <div className="bg-white p-3 sm:p-5 space-y-4 animate-fade-in border-t border-gray-100">
          {/* JIKA TAB TAKZIRAN: DAFTAR PELANGGARAN BELUM DITAKZIR */}
          {filterTazir ? (
            <div className="space-y-3">
              <div className="flex flex-wrap justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllLogs}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-emerald-800 cursor-pointer"
                  >
                    {selectedLogIds.length === pendingLogs.length && pendingLogs.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                    <span>Pilih Semua ({pendingLogs.length})</span>
                  </button>
                </div>

                {selectedLogIds.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {canTazir && (
                      <button
                        onClick={handleBulkTakzirAction}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Takzir Terpilih ({selectedLogIds.length})
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={handleBulkDeleteAction}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedLogIds.length})
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                {pendingLogs.map(l => {
                  const isChecked = selectedLogIds.includes(l.id);
                  return (
                    <div
                      key={l.id}
                      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isChecked ? 'bg-emerald-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSelectLog(l.id)}
                          className="mt-1 text-gray-400 hover:text-emerald-700 cursor-pointer shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-extrabold text-sm text-gray-900">
                              {l.master_jenis?.nama || l.jenis || 'Kegiatan'}
                            </span>
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                              Belum Takzir
                            </span>
                            {l.keterangan && (
                              <span className="text-xs italic text-indigo-900 bg-indigo-50 border-l-2 border-indigo-400 px-2 py-0.5 rounded">
                                "{l.keterangan}"
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              {new Date(l.tgl_melanggar).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            {l.input_by && (
                              <span className="inline-flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-gray-700 border border-gray-200">
                                <User className="w-2.5 h-2.5 text-gray-500" /> Input: {l.input_by}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {canTazir && (
                          <button
                            onClick={() => onTazirSingle(l.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Takzir
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (confirm('Hapus pelanggaran ini?')) onDeleteLog(l.id);
                            }}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {pendingLogs.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-xs italic bg-gray-50">
                    Alhamdulillah, santri ini tidak memiliki tunggakan takziran aktif.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* JIKA TAB RIWAYAT: KALENDER GRID + RINCIAN + PRESTASI + CATATAN */
            <div className="space-y-4">
              {/* TOMBOL CEPAT ASISTEN AI WHATSAPP */}
              <div className="flex flex-wrap justify-between items-center bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/50 p-3 rounded-xl border border-emerald-200 gap-2">
                <div>
                  <h5 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Laporan Wali Santri Otomatis
                  </h5>
                  <p className="text-[10px] text-emerald-800">
                    Kirim laporan kehadiran bulanan santri langsung ke WhatsApp wali via Asisten AI
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAiWaModal(santri, santriLogs)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Buka Asisten AI WA
                </button>
              </div>

              {/* GRID KALENDER */}
              <HistoryGrid
                santriId={santri.id}
                nama={santri.nama_lengkap}
                kelas={santri.kelas}
                asrama={santri.asrama}
                logs={santriLogs}
                types={types}
                isAdmin={isAdmin}
                canDelete={canDelete}
                onDeleteLog={onDeleteLog}
                onDeleteAll={onDeleteAllLogs}
              />

              {/* RINCIAN RIWAYAT CHRONOLOGICAL */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <div className="p-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase text-gray-700 flex justify-between items-center">
                  <span>Rincian Seluruh Riwayat ({santriLogs.length})</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto custom-scrollbar">
                  {santriLogs.map(l => (
                    <div
                      key={l.id}
                      className="p-2.5 sm:p-3 flex justify-between items-start gap-2 hover:bg-gray-50 transition-colors text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{l.master_jenis?.nama || l.jenis}</span>
                          {l.status_tazir === 'Sudah' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                              Ditakzir {l.tazir_by ? `oleh ${l.tazir_by}` : 'Pengurus'}
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                              Belum ditakzir
                            </span>
                          )}
                          {l.keterangan && (
                            <span className="text-[10px] italic text-indigo-900 bg-indigo-50 border-l-2 border-indigo-400 px-2 py-0.5 rounded">
                              "{l.keterangan}"
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 flex flex-wrap items-center gap-2">
                          <span>
                            {new Date(l.tgl_melanggar).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                          {l.input_by && (
                            <span className="bg-gray-100 px-1 py-0.5 rounded text-[9px] font-medium text-gray-600 border border-gray-200">
                              Petugas: {l.input_by}
                            </span>
                          )}
                        </div>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (confirm('Hapus log riwayat ini?')) onDeleteLog(l.id);
                          }}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {santriLogs.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 italic">
                      Belum ada riwayat pelanggaran untuk santri ini.
                    </div>
                  )}
                </div>
              </div>

              {/* SEKSI PRESTASI SANTRI */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="p-2.5 bg-emerald-50 border-b border-emerald-100 text-[11px] font-black uppercase text-emerald-900 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Prestasi & Penghargaan Santri ({prestasiItems.length})</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {prestasiItems.map(p => (
                    <div
                      key={p.id}
                      className="p-2.5 flex justify-between items-start gap-2 text-xs hover:bg-emerald-50/30 transition-colors"
                    >
                      {editState.type === 'prestasi' && editState.id === p.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            autoFocus
                            type="text"
                            className="flex-1 bg-white border border-emerald-400 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            value={editState.text}
                            onChange={e => setEditState({ ...editState, text: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                          />
                          <button
                            onClick={saveEdit}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg shadow-xs cursor-pointer"
                            title="Simpan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1.5 rounded-lg cursor-pointer"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="font-semibold text-gray-800 break-words">{p.prestasi}</span>
                            <span className="block text-[9px] text-gray-400 mt-0.5">
                              {new Date(p.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => startEdit('prestasi', p)}
                              className="text-blue-500 hover:bg-blue-50 p-1 rounded-md transition-colors cursor-pointer"
                              title="Edit Prestasi"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Hapus prestasi ini?')) onDeletePrestasi(p.id);
                              }}
                              className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors cursor-pointer"
                              title="Hapus Prestasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {prestasiItems.length === 0 && (
                    <div className="p-3 text-center text-[11px] text-gray-400 italic">
                      Belum ada prestasi dicatat untuk santri ini.
                    </div>
                  )}
                </div>

                {/* Form Tambah Prestasi */}
                <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Masukkan prestasi (cth: Juara 1 Pidato Bahasa Arab)..."
                    value={prestasiInput}
                    onChange={e => setPrestasiInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreatePrestasi()}
                  />
                  <button
                    onClick={handleCreatePrestasi}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </div>
              </div>

              {/* SEKSI CATATAN KHUSUS SANTRI */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="p-2.5 bg-amber-50 border-b border-amber-100 text-[11px] font-black uppercase text-amber-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Catatan Khusus Perkembangan Santri ({notes.length})</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {notes.map(n => (
                    <div
                      key={n.id}
                      className="p-2.5 flex justify-between items-start gap-2 text-xs hover:bg-amber-50/30 transition-colors"
                    >
                      {editState.type === 'note' && editState.id === n.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            autoFocus
                            type="text"
                            className="flex-1 bg-white border border-amber-400 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                            value={editState.text}
                            onChange={e => setEditState({ ...editState, text: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                          />
                          <button
                            onClick={saveEdit}
                            className="bg-amber-600 hover:bg-amber-700 text-white p-1.5 rounded-lg shadow-xs cursor-pointer"
                            title="Simpan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1.5 rounded-lg cursor-pointer"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="font-medium text-gray-800 break-words">{n.isi}</span>
                            <span className="block text-[9px] text-gray-400 mt-0.5">
                              {new Date(n.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => startEdit('note', n)}
                              className="text-blue-500 hover:bg-blue-50 p-1 rounded-md transition-colors cursor-pointer"
                              title="Edit Catatan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Hapus catatan ini?')) onDeleteNote(n.id);
                              }}
                              className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors cursor-pointer"
                              title="Hapus Catatan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {notes.length === 0 && (
                    <div className="p-3 text-center text-[11px] text-gray-400 italic">
                      Belum ada catatan khusus untuk santri ini.
                    </div>
                  )}
                </div>

                {/* Form Tambah Catatan */}
                <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Tambahkan catatan khusus pembimbing/wali kelas..."
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateNote()}
                  />
                  <button
                    onClick={handleCreateNote}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SantriAccordionItem;
