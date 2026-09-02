import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, ShieldCheck } from 'lucide-react';
import {
  getPublicStudentSummary,
  requestWaliAccess,
  searchPublicStudents,
  submitPublicCorrection,
} from '../lib/securityApi';
import type {
  PublicClaimant,
  PublicMaskedSummary,
  PublicSearchResult,
  StudentCorrectionPayload,
} from '../types/security';

const PAGE_SIZE = 20;

const summaryLabels: Record<keyof PublicMaskedSummary['ringkasan'], string> = {
  nisn: 'NISN',
  nik: 'NIK',
  jenis_kelamin: 'Jenis kelamin',
  tempat_lahir: 'Tempat lahir',
  tanggal_lahir: 'Tanggal lahir',
  no_hp_santri: 'Nomor HP santri',
  alamat_jalan: 'Alamat jalan',
  provinsi: 'Provinsi',
  kode_pos: 'Kode pos',
  nama_ayah: 'Nama ayah',
  pekerjaan_ayah: 'Pekerjaan ayah',
  nama_ibu: 'Nama ibu',
  pekerjaan_ibu: 'Pekerjaan ibu',
  nama_wali: 'Nama wali',
  no_hp_wali: 'Nomor HP wali',
};

const correctionFields: Array<{
  name: keyof StudentCorrectionPayload;
  label: string;
  type?: string;
}> = [
  { name: 'nama_lengkap', label: 'Nama lengkap yang benar' },
  { name: 'nisn', label: 'NISN yang benar' },
  { name: 'nik', label: 'NIK yang benar' },
  { name: 'jenis_kelamin', label: 'Jenis kelamin yang benar' },
  { name: 'tempat_lahir', label: 'Tempat lahir yang benar' },
  { name: 'tanggal_lahir', label: 'Tanggal lahir yang benar', type: 'date' },
  { name: 'no_hp_santri', label: 'Nomor HP santri yang benar' },
  { name: 'alamat_jalan', label: 'Alamat jalan yang benar' },
  { name: 'desa_kelurahan', label: 'Desa/kelurahan yang benar' },
  { name: 'kecamatan', label: 'Kecamatan yang benar' },
  { name: 'kabupaten_kota', label: 'Kabupaten/kota yang benar' },
  { name: 'provinsi', label: 'Provinsi yang benar' },
  { name: 'kode_pos', label: 'Kode pos yang benar' },
  { name: 'nama_ayah', label: 'Nama ayah yang benar' },
  { name: 'pekerjaan_ayah', label: 'Pekerjaan ayah yang benar' },
  { name: 'nama_ibu', label: 'Nama ibu yang benar' },
  { name: 'pekerjaan_ibu', label: 'Pekerjaan ibu yang benar' },
  { name: 'nama_wali', label: 'Nama wali yang benar' },
  { name: 'no_hp_wali', label: 'Nomor HP wali yang benar' },
];

const emptyClaimant: PublicClaimant = {
  nama_pengaju: '',
  hubungan: '',
  kontak_wa: '',
};

function publicAddress(item: Pick<PublicSearchResult, 'desa_kelurahan' | 'kecamatan' | 'kabupaten_kota'>) {
  return [item.desa_kelurahan, item.kecamatan, item.kabupaten_kota]
    .filter((value): value is string => Boolean(value))
    .join(', ') || 'Alamat umum belum tersedia';
}

function ClaimantFields({
  claimant,
  onChange,
  relationLabel = 'Hubungan dengan santri/alumni',
}: {
  claimant: PublicClaimant;
  onChange: (claimant: PublicClaimant) => void;
  relationLabel?: string;
}) {
  return (
    <fieldset className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:grid-cols-2">
      <legend className="px-2 text-sm font-black text-amber-900">Identitas pengaju</legend>
      <label className="text-sm font-bold text-slate-700">
        Nama pengaju
        <input
          required
          value={claimant.nama_pengaju}
          onChange={(event) => onChange({ ...claimant, nama_pengaju: event.target.value })}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"
        />
      </label>
      <label className="text-sm font-bold text-slate-700">
        {relationLabel}
        <input
          required
          value={claimant.hubungan}
          onChange={(event) => onChange({ ...claimant, hubungan: event.target.value })}
          placeholder="Contoh: diri sendiri, anak, ayah"
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"
        />
      </label>
      <label className="text-sm font-bold text-slate-700 sm:col-span-2">
        Nomor WhatsApp pengaju
        <input
          required
          inputMode="tel"
          value={claimant.kontak_wa}
          onChange={(event) => onChange({ ...claimant, kontak_wa: event.target.value })}
          placeholder="Contoh: 081234567890"
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"
        />
      </label>
    </fieldset>
  );
}

export default function CekDataPublik() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PublicSearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectionToken, setSelectionToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<PublicMaskedSummary | null>(null);
  const [mode, setMode] = useState<'correction' | 'access' | null>(null);
  const [claimant, setClaimant] = useState<PublicClaimant>(emptyClaimant);
  const [correction, setCorrection] = useState<StudentCorrectionPayload>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function loadResults(searchText: string, pageNumber: number) {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const nextResults = await searchPublicStudents(searchText, pageNumber);
      setResults(nextResults);
      setTotalCount(nextResults[0]?.total_count ?? 0);
      setPage(pageNumber);
      setActiveQuery(searchText);
    } catch {
      setResults([]);
      setTotalCount(0);
      setError('Pencarian belum dapat diproses. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized.length < 3) {
      setError('Ketik minimal 3 huruf nama.');
      setResults([]);
      return;
    }
    void loadResults(normalized, 1);
  }

  async function handleSelect(item: PublicSearchResult) {
    setLoading(true);
    setError('');
    try {
      const nextSummary = await getPublicStudentSummary(item.selection_token);
      setSelectionToken(item.selection_token);
      setSummary(nextSummary);
      setMode(null);
      setClaimant(emptyClaimant);
      setCorrection({});
    } catch {
      setSelectionToken(null);
      setSummary(null);
      setError('Pilihan telah kedaluwarsa. Silakan cari dan pilih nama kembali.');
    } finally {
      setLoading(false);
    }
  }

  function returnToResults() {
    setSelectionToken(null);
    setSummary(null);
    setMode(null);
    setClaimant(emptyClaimant);
    setCorrection({});
    setError('');
    setSuccess('');
  }

  async function submitAction(event: React.FormEvent) {
    event.preventDefault();
    if (!selectionToken || !mode) return;

    if (mode === 'correction') {
      const hasCorrection = Object.values(correction).some((value) => value?.trim());
      if (!hasCorrection) {
        setError('Isi minimal satu data yang ingin dikoreksi.');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      if (mode === 'access') {
        await requestWaliAccess(selectionToken, claimant);
        setSuccess('Permintaan akses sudah dikirim dan akan diperiksa admin.');
      } else {
        await submitPublicCorrection(selectionToken, correction, claimant);
        setSuccess('Usulan koreksi sudah dikirim dan akan ditinjau admin.');
      }
      setMode(null);
    } catch {
      setSelectionToken(null);
      setSummary(null);
      setMode(null);
      setError('Pilihan telah kedaluwarsa. Silakan cari dan pilih nama kembali.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-8 text-slate-800 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-800 text-white">
            <Search aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black text-emerald-950">Cek Data Santri & Alumni</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Cari nama, periksa ringkasan tersamarkan, lalu kirim koreksi untuk ditinjau admin.
          </p>
        </header>

        {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
        {success && <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">{success}</p>}

        {!summary ? (
          <section className="rounded-3xl bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-8">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
              <label className="flex-1 text-sm font-bold text-slate-700">
                Nama santri atau alumni
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ketik minimal 3 huruf"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3.5 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <button type="submit" disabled={loading} className="self-end rounded-xl bg-emerald-800 px-7 py-3.5 font-bold text-white disabled:opacity-60">
                {loading ? 'Mencari…' : 'Cari data'}
              </button>
            </form>

            {activeQuery && !loading && (
              <div className="mt-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                  <p><strong>{totalCount}</strong> hasil untuk “{activeQuery}”</p>
                  <p>20 hasil per halaman</p>
                </div>
                {results.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-5 text-center text-slate-600">Tidak ada nama yang cocok.</p>
                ) : (
                  <ul className="space-y-3">
                    {results.map((item) => (
                      <li key={item.selection_token}>
                        <button
                          type="button"
                          aria-label={`Pilih ${item.nama_lengkap}`}
                          onClick={() => void handleSelect(item)}
                          className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50"
                        >
                          <span className="block text-lg font-black text-emerald-950">{item.nama_lengkap}</span>
                          <span className="mt-1 block text-sm text-slate-600">
                            {[item.status, item.tahun_masuk && `Masuk ${item.tahun_masuk}`, item.tahun_keluar && `Keluar ${item.tahun_keluar}`, item.kelas, item.asrama]
                              .filter(Boolean).join(' • ') || 'Keterangan belum tersedia'}
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-slate-700">{publicAddress(item)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {totalCount > 0 && (
                  <nav aria-label="Halaman hasil pencarian" className="mt-6 flex items-center justify-center gap-4">
                    <button
                      type="button"
                      aria-label="Halaman sebelumnya"
                      disabled={loading || page <= 1}
                      onClick={() => void loadResults(activeQuery, page - 1)}
                      className="rounded-xl border border-slate-300 p-2 disabled:opacity-30"
                    ><ChevronLeft aria-hidden="true" /></button>
                    <span className="text-sm font-bold">Halaman {page} dari {totalPages}</span>
                    <button
                      type="button"
                      aria-label="Halaman berikutnya"
                      disabled={loading || page >= totalPages}
                      onClick={() => void loadResults(activeQuery, page + 1)}
                      className="rounded-xl border border-slate-300 p-2 disabled:opacity-30"
                    ><ChevronRight aria-hidden="true" /></button>
                  </nav>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-8">
            <button type="button" onClick={returnToResults} className="mb-5 flex items-center gap-2 text-sm font-bold text-emerald-800">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke hasil pencarian
            </button>
            <div className="rounded-2xl bg-emerald-950 p-5 text-white">
              <h2 className="text-2xl font-black">{summary.nama_lengkap}</h2>
              <p className="mt-1 text-sm text-emerald-100">{[summary.status, summary.asrama, summary.tahun_masuk && `Masuk ${summary.tahun_masuk}`, summary.tahun_keluar && `Keluar ${summary.tahun_keluar}`].filter(Boolean).join(' • ')}</p>
              <p className="mt-2 text-sm font-semibold text-emerald-50">{publicAddress(summary)}</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Object.entries(summary.ringkasan).map(([key, field]) => (
                <div key={key} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{summaryLabels[key as keyof PublicMaskedSummary['ringkasan']]}</p>
                  <p className="mt-1 font-semibold text-slate-800">{field.terisi ? field.nilai || 'Sudah terisi' : 'Belum terisi'}</p>
                </div>
              ))}
            </div>

            {!mode && !success && (
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setMode('correction')} className="rounded-xl bg-emerald-800 px-5 py-3.5 font-bold text-white">Ajukan koreksi</button>
                <button type="button" onClick={() => setMode('access')} className="rounded-xl border-2 border-emerald-800 px-5 py-3 font-bold text-emerald-900">Minta akses lengkap</button>
              </div>
            )}

            {mode && (
              <form onSubmit={submitAction} className="mt-7 space-y-6 border-t border-slate-200 pt-7">
                <h3 className="text-xl font-black text-emerald-950">{mode === 'correction' ? 'Usulkan data yang benar' : 'Minta verifikasi admin'}</h3>
                {mode === 'correction' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {correctionFields.map((field) => (
                      <label key={field.name} className="text-sm font-bold text-slate-700">
                        {field.label}
                        <input
                          type={field.type || 'text'}
                          value={correction[field.name] || ''}
                          onChange={(event) => setCorrection({ ...correction, [field.name]: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal"
                        />
                      </label>
                    ))}
                  </div>
                )}
                <ClaimantFields claimant={claimant} onChange={setClaimant} />
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setMode(null)} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Batal</button>
                  <button type="submit" disabled={loading} className="rounded-xl bg-emerald-800 px-6 py-3 font-bold text-white disabled:opacity-60">
                    {loading ? 'Mengirim…' : mode === 'correction' ? 'Kirim usulan koreksi' : 'Kirim permintaan akses'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <p className="mx-auto mt-6 flex max-w-2xl items-start gap-2 text-center text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Nilai sensitif tetap disamarkan. Setiap perubahan dan permintaan akses harus diperiksa admin.
        </p>
      </div>
    </main>
  );
}
