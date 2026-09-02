import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, Copy, KeyRound, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { reviewSubmission, reviewWaliAccessRequest } from '../lib/securityApi';
import type { PublicClaimant, ReviewDecision, RolePermission } from '../types/security';

interface SubmissionRecord {
  id: string;
  santri_id: string | null;
  jenis_pengajuan: string;
  status_pengajuan: string;
  sumber_pengajuan: string;
  informasi_pengaju: PublicClaimant | null;
  data_pengajuan: Record<string, unknown>;
  created_at: string;
}

interface AccessRequestRecord {
  id: string;
  santri_id: string;
  nama_pengaju: string;
  hubungan: string;
  kontak_wa: string;
  status: string;
  created_at: string;
  santri?: { nama_lengkap?: string } | null;
}

const labels: Record<string, string> = {
  nama_lengkap: 'Nama lengkap', nik: 'NIK', nisn: 'NISN', jenis_kelamin: 'Jenis kelamin',
  tempat_lahir: 'Tempat lahir', tanggal_lahir: 'Tanggal lahir', no_hp_santri: 'Nomor HP santri',
  nis: 'NIS', tanggal_masuk: 'Tanggal masuk', tahun_masuk: 'Tahun masuk', kelas: 'Kelas',
  asrama: 'Asrama', status: 'Status', tahun_keluar: 'Tahun keluar', alamat_jalan: 'Alamat jalan',
  provinsi: 'Provinsi', kabupaten_kota: 'Kabupaten/kota', kecamatan: 'Kecamatan',
  desa_kelurahan: 'Desa/kelurahan', kode_pos: 'Kode pos', nama_ayah: 'Nama ayah',
  pekerjaan_ayah: 'Pekerjaan ayah', nama_ibu: 'Nama ibu', pekerjaan_ibu: 'Pekerjaan ibu',
  nama_wali: 'Nama wali', no_hp_wali: 'Nomor HP wali', catatan: 'Catatan',
};

function claimantText(claimant: PublicClaimant | null) {
  if (!claimant) return 'Informasi pengaju tidak tersedia (data lama).';
  return `${claimant.nama_pengaju} • ${claimant.hubungan} • ${claimant.kontak_wa}`;
}

export default function AdminReview({ permissions = [] }: { permissions?: RolePermission[] }) {
  const canReviewAccess = permissions.includes('edit_induk');
  const [tab, setTab] = useState<'submission' | 'access'>('submission');
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestRecord[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRecord | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<AccessRequestRecord | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [approvedLink, setApprovedLink] = useState('');

  const fetchQueues = useCallback(async () => {
    const submissionRequest = supabase.from('pengajuan_santri')
      .select('*').eq('status_pengajuan', 'Menunggu').order('created_at', { ascending: false });
    const accessRequest = canReviewAccess
      ? supabase.from('permintaan_akses_wali').select('*, santri(nama_lengkap)').eq('status', 'Menunggu').order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null });
    const [submissionResult, accessResult] = await Promise.all([submissionRequest, accessRequest]);
    if (submissionResult.error || accessResult.error) {
      setMessage({ type: 'error', text: 'Antrean review belum dapat dimuat.' });
    } else {
      setSubmissions((submissionResult.data || []) as SubmissionRecord[]);
      setAccessRequests((accessResult.data || []) as AccessRequestRecord[]);
    }
    setLoading(false);
  }, [canReviewAccess]);

  useEffect(() => {
    void Promise.resolve().then(fetchQueues);
  }, [fetchQueues]);

  async function decideSubmission(decision: ReviewDecision) {
    if (!selectedSubmission) return;
    if (!window.confirm(`${decision} pengajuan ini?`)) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await reviewSubmission(selectedSubmission.id, decision, adminNote.trim());
      setMessage({ type: 'success', text: `Pengajuan berhasil ${decision.toLowerCase()}.` });
      setSelectedSubmission(null);
      setAdminNote('');
      await fetchQueues();
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : 'Review belum dapat disimpan.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function decideAccess(decision: ReviewDecision) {
    if (!selectedAccess) return;
    if (!window.confirm(`${decision} permintaan akses ini?`)) return;
    setSubmitting(true);
    setMessage(null);
    setApprovedLink('');
    try {
      const result = await reviewWaliAccessRequest(selectedAccess.id, decision, adminNote.trim());
      if (decision === 'Disetujui' && result.token) setApprovedLink(`${window.location.origin}/s#${result.token}`);
      setMessage({ type: 'success', text: `Permintaan akses berhasil ${decision.toLowerCase()}.` });
      setSelectedAccess(null);
      setAdminNote('');
      await fetchQueues();
    } catch (caught) {
      setMessage({ type: 'error', text: caught instanceof Error ? caught.message : 'Review akses belum dapat disimpan.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl rounded-2xl bg-white p-4 shadow-xl">
      <header className="mb-6 flex items-center gap-4 border-b pb-4">
        <Link to="/" aria-label="Kembali" className="rounded-full bg-gray-100 p-2"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold text-gray-800">Review Pengajuan</h1><p className="text-sm text-gray-500">Keputusan diterapkan oleh database dalam satu transaksi.</p></div>
      </header>
      {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-xl p-4 font-semibold ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
      {approvedLink && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Salin tautan berikut dan kirim manual kepada pemohon:</p><p className="mt-2 break-all font-mono text-sm">{approvedLink}</p><button type="button" onClick={() => void navigator.clipboard.writeText(approvedLink)} className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white"><Copy className="h-4 w-4" />Salin tautan</button></div>}
      <div className="mb-6 flex gap-2 rounded-xl bg-gray-100 p-1">
        <button type="button" onClick={() => setTab('submission')} className={`flex-1 rounded-lg px-4 py-3 font-bold ${tab === 'submission' ? 'bg-white text-emerald-800 shadow' : 'text-gray-500'}`}>Pengajuan Data ({submissions.length})</button>
        {canReviewAccess && <button type="button" onClick={() => setTab('access')} className={`flex-1 rounded-lg px-4 py-3 font-bold ${tab === 'access' ? 'bg-white text-emerald-800 shadow' : 'text-gray-500'}`}>Permintaan Akses ({accessRequests.length})</button>}
      </div>
      {loading ? <p className="py-16 text-center font-semibold text-gray-500">Memuat antrean…</p> : tab === 'submission' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <aside className="space-y-3 lg:col-span-1">
            {submissions.length === 0 && <p className="rounded-xl bg-emerald-50 p-6 text-center font-bold text-emerald-700">Tidak ada antrean pengajuan.</p>}
            {submissions.map((item) => <button type="button" key={item.id} onClick={() => { setSelectedSubmission(item); setAdminNote(''); }} className={`w-full rounded-xl border p-4 text-left ${selectedSubmission?.id === item.id ? 'border-blue-400 bg-blue-50' : 'bg-gray-50'}`} aria-label={`Tinjau ${String(item.data_pengajuan.nama_lengkap || 'Tanpa Nama')}`}><span className="block text-xs font-bold uppercase text-amber-700">{item.jenis_pengajuan} • {item.sumber_pengajuan}</span><strong className="mt-2 block">{String(item.data_pengajuan.nama_lengkap || 'Tanpa Nama')}</strong><span className="mt-1 flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" />{new Date(item.created_at).toLocaleDateString('id-ID')}</span></button>)}
          </aside>
          <section className="lg:col-span-2">
            {!selectedSubmission ? <p className="rounded-xl border border-dashed p-16 text-center text-gray-500">Pilih pengajuan untuk melihat detail.</p> : <div className="space-y-5 rounded-xl border p-5"><div><p className="text-xs font-bold uppercase text-gray-500">Sumber</p><p className="font-semibold">{selectedSubmission.sumber_pengajuan}</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-xs font-bold uppercase text-amber-800">Informasi pengaju</p><p className="mt-1 text-sm">{claimantText(selectedSubmission.informasi_pengaju)}</p></div><dl className="grid gap-3 sm:grid-cols-2">{Object.entries(selectedSubmission.data_pengajuan).map(([key, value]) => <div key={key} className="rounded-lg bg-gray-50 p-3"><dt className="text-xs font-bold uppercase text-gray-500">{labels[key] || key}</dt><dd className="mt-1 break-words font-semibold">{value === null || value === '' ? '-' : String(value)}</dd></div>)}</dl><label className="block text-sm font-bold">Catatan admin<textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><div className="flex flex-col gap-3 sm:flex-row"><button type="button" disabled={submitting} onClick={() => void decideSubmission('Disetujui')} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white"><CheckCircle className="mr-2 inline h-5 w-5" />Setujui pengajuan</button><button type="button" disabled={submitting} onClick={() => void decideSubmission('Ditolak')} className="flex-1 rounded-xl bg-red-100 py-3 font-bold text-red-700"><XCircle className="mr-2 inline h-5 w-5" />Tolak pengajuan</button></div></div>}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <aside className="space-y-3">{accessRequests.length === 0 && <p className="rounded-xl bg-emerald-50 p-6 text-center font-bold text-emerald-700">Tidak ada permintaan akses.</p>}{accessRequests.map((item) => <button type="button" key={item.id} onClick={() => { setSelectedAccess(item); setAdminNote(''); }} aria-label={`Tinjau akses ${item.nama_pengaju}`} className="w-full rounded-xl border bg-gray-50 p-4 text-left"><strong>{item.santri?.nama_lengkap || 'Santri'}</strong><span className="mt-1 block text-sm">{item.nama_pengaju} • {item.hubungan}</span></button>)}</aside>
          <section className="lg:col-span-2">{!selectedAccess ? <p className="rounded-xl border border-dashed p-16 text-center text-gray-500">Pilih permintaan akses.</p> : <div className="space-y-5 rounded-xl border p-5"><h2 className="flex items-center gap-2 text-xl font-black"><KeyRound className="text-emerald-700" />Permintaan akses wali</h2><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase text-gray-500">Nama pengaju</dt><dd>{selectedAccess.nama_pengaju}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Hubungan</dt><dd>{selectedAccess.hubungan}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">WhatsApp</dt><dd>{selectedAccess.kontak_wa}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Santri</dt><dd>{selectedAccess.santri?.nama_lengkap || '-'}</dd></div></dl><label className="block text-sm font-bold">Catatan admin<textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><div className="flex gap-3"><button type="button" disabled={submitting} onClick={() => void decideAccess('Disetujui')} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white">Setujui akses</button><button type="button" disabled={submitting} onClick={() => void decideAccess('Ditolak')} className="flex-1 rounded-xl bg-red-100 py-3 font-bold text-red-700">Tolak akses</button></div></div>}</section>
        </div>
      )}
    </div>
  );
}
