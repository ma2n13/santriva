import { useState, useEffect } from 'react';
import type { Santri } from '../types';
import { 
  generateAiLaporan, 
  generateTemplateLaporan, 
  getGeminiApiKey, 
  setGeminiApiKey 
} from '../lib/gemini';
import { 
  Sparkles, X, Send, Copy, Check, Key, 
  ExternalLink, RefreshCw, Heart, FileText, AlertCircle
} from 'lucide-react';

interface AiWaMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  santri: Partial<Santri> | null;
  logs: any[];
  periode: string;
}

export default function AiWaMessageModal({
  isOpen,
  onClose,
  santri,
  logs,
  periode
}: AiWaMessageModalProps) {
  const [tone, setTone] = useState<'tarbiyah' | 'formal' | 'tegas'>('tarbiyah');
  const [catatanTambahan, setCatatanTambahan] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Sinkronkan API key saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
    }
  }, [isOpen]);

  // Siapkan draft awal saat santri atau periode berganti
  useEffect(() => {
    if (isOpen && santri) {
      const portalKode = santri.kode_unik || santri.id || '';
      const portalUrl = `${window.location.origin}/s/${portalKode}`;
      const initialText = generateTemplateLaporan({
        santri,
        logs,
        periode,
        portalUrl,
        tone,
        catatanTambahan
      });
      setMessageText(initialText);
    }
  }, [isOpen, santri, logs, periode, tone]);

  if (!isOpen || !santri) return null;

  const portalKode = santri.kode_unik || santri.id || '';
  const portalUrl = `${window.location.origin}/s/${portalKode}`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateAiLaporan({
        santri,
        logs,
        periode,
        portalUrl,
        tone,
        catatanTambahan,
        apiKey
      });
      setMessageText(result);
    } catch (err: any) {
      console.error('Error generating AI text:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKey);
    setShowKeyInput(false);
    alert('Kunci API Gemini berhasil disimpan untuk sesi browser ini!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = santri.no_hp_wali || santri.no_hp_santri;
    if (!rawPhone) {
      alert('Nomor HP Wali Santri tidak ditemukan pada Buku Induk! Silakan salin teks dan kirim secara manual.');
      return;
    }

    let phone = rawPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
  };

  const hasApiKey = Boolean(apiKey || getGeminiApiKey());

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-emerald-100">
        
        {/* HEADER MODAL */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/80 rounded-xl border border-emerald-600">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Asisten AI — Generator Pesan WhatsApp
              </h3>
              <p className="text-xs text-emerald-200">
                Santri: <span className="font-semibold text-white">{santri.nama_lengkap}</span> {santri.kelas ? `(Kelas ${santri.kelas})` : ''}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KONTEN UTAMA */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1 bg-[#FDFBF7]">
          
          {/* Status Kunci Gemini & Bar Bantuan */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs">
              <Key className="w-4 h-4 text-emerald-700" />
              <span className="font-medium text-gray-700">
                Status Model AI: 
                <span className={`ml-1.5 font-bold px-2 py-0.5 rounded-md ${hasApiKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {hasApiKey ? 'Gemini 1.5 Flash Aktif' : 'Template Cerdas Bawaan'}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 flex items-center gap-1"
            >
              {showKeyInput ? 'Tutup Pengaturan Kunci' : 'Atur Gemini API Key'}
            </button>
          </div>

          {/* Form Input API Key jika dibuka */}
          {showKeyInput && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Google Gemini API Key</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Masukkan API Key dari Google AI Studio untuk mengaktifkan penalaran penuh AI.
                  </p>
                </div>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
                >
                  Dapatkan Gratis <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 border border-emerald-300 rounded-xl p-2.5 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Simpan
                </button>
              </div>
            </div>
          )}

          {/* Pengaturan Nada Bicara (Tone) */}
          <div>
            <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wide mb-2">
              Gaya Bahasa / Nada Pesan
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTone('tarbiyah')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tone === 'tarbiyah' 
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 mb-0.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Tarbiyah & Doa
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">Sangat santun, bernuansa doa bersama</p>
              </button>

              <button
                type="button"
                onClick={() => setTone('formal')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tone === 'formal' 
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 mb-0.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" /> Formal & Baku
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">Ringkas, resmi, dan informatif</p>
              </button>

              <button
                type="button"
                onClick={() => setTone('tegas')}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  tone === 'tegas' 
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 mb-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Tegas & Disiplin
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">Untuk santri dengan banyak bolos</p>
              </button>
            </div>
          </div>

          {/* Catatan Tambahan Pengurus (Opsional) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="catatanTambahan" className="block text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Catatan Khusus dari Pengurus (Opsional)
              </label>
              <span className="text-[11px] text-gray-400">Dimasukkan ke dalam narasi</span>
            </div>
            <input
              id="catatanTambahan"
              name="catatanTambahan"
              type="text"
              placeholder="Contoh: Mohon diingatkan hafalan juz 30, atau ananda sangat rajin mengaji..."
              value={catatanTambahan}
              onChange={(e) => setCatatanTambahan(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-xl bg-white outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
            />
          </div>

          {/* Tombol Trigger Generate Ulang AI */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-gray-500 font-medium">
              Data: <b>{logs.length} catatan</b> pada periode <b>{periode}</b>
            </span>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/15 transition-all disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Menyusun Pesan...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Susun Ulang dengan AI
                </>
              )}
            </button>
          </div>

          {/* Editor Pratinjau Teks Pesan WhatsApp */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="waMessageText" className="block text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Pratinjau Pesan WhatsApp (Bisa Diedit Manual)
              </label>
              <span className="text-[11px] text-gray-400">{messageText.length} karakter</span>
            </div>
            <textarea
              id="waMessageText"
              name="waMessageText"
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full border border-gray-200 p-3.5 rounded-2xl bg-white outline-none focus:ring-2 focus:ring-emerald-600 font-mono text-xs leading-relaxed text-gray-800"
            />
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-gray-500 font-medium w-full sm:w-auto text-center sm:text-left">
            Tujuan: <b>{santri.no_hp_wali || santri.no_hp_santri || 'Nomor Belum Terisi'}</b>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Salin Teks
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#128C7E] hover:to-[#075E54] text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Buka di WhatsApp
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
