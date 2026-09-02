import { useEffect, useState } from 'react';
import { Award, BookOpen, CheckCircle2, FileText, ShieldCheck, UserRound } from 'lucide-react';
import { readPortalToken } from '../lib/portalToken';
import { getWaliPortal, submitWaliCorrection } from '../lib/securityApi';
import type { PublicClaimant, StudentCorrectionPayload, WaliPortalProfile, WaliPortalResponse } from '../types/security';

const INVALID_LINK_MESSAGE = 'Tautan tidak dapat digunakan. Hubungi admin untuk meminta tautan baru.';

const profileLabels: Array<{ key: keyof WaliPortalProfile; label: string }> = [
  ['nama_lengkap', 'Nama lengkap'], ['nis', 'NIS'], ['nisn', 'NISN'], ['nik', 'NIK'],
  ['jenis_kelamin', 'Jenis kelamin'], ['tempat_lahir', 'Tempat lahir'], ['tanggal_lahir', 'Tanggal lahir'],
  ['no_hp_santri', 'Nomor HP santri'], ['kelas', 'Kelas'], ['asrama', 'Asrama'], ['status', 'Status'],
  ['tanggal_masuk', 'Tanggal masuk'], ['tahun_masuk', 'Tahun masuk'], ['tahun_keluar', 'Tahun keluar'],
  ['alamat_jalan', 'Alamat jalan'], ['desa_kelurahan', 'Desa/kelurahan'], ['kecamatan', 'Kecamatan'],
  ['kabupaten_kota', 'Kabupaten/kota'], ['provinsi', 'Provinsi'], ['kode_pos', 'Kode pos'],
  ['nama_ayah', 'Nama ayah'], ['pekerjaan_ayah', 'Pekerjaan ayah'], ['nama_ibu', 'Nama ibu'],
  ['pekerjaan_ibu', 'Pekerjaan ibu'], ['nama_wali', 'Nama wali'], ['no_hp_wali', 'Nomor HP wali'],
].map(([key, label]) => ({ key: key as keyof WaliPortalProfile, label }));

const correctionFields: Array<{ key: keyof StudentCorrectionPayload; label: string; type?: string }> = [
  ['nama_lengkap', 'Nama lengkap yang benar'], ['nisn', 'NISN yang benar'], ['nik', 'NIK yang benar'],
  ['jenis_kelamin', 'Jenis kelamin yang benar'], ['tempat_lahir', 'Tempat lahir yang benar'],
  ['tanggal_lahir', 'Tanggal lahir yang benar', 'date'], ['no_hp_santri', 'Nomor HP santri yang benar'],
  ['alamat_jalan', 'Alamat jalan yang benar'], ['desa_kelurahan', 'Desa/kelurahan yang benar'],
  ['kecamatan', 'Kecamatan yang benar'], ['kabupaten_kota', 'Kabupaten/kota yang benar'],
  ['provinsi', 'Provinsi yang benar'], ['kode_pos', 'Kode pos yang benar'], ['nama_ayah', 'Nama ayah yang benar'],
  ['pekerjaan_ayah', 'Pekerjaan ayah yang benar'], ['nama_ibu', 'Nama ibu yang benar'],
  ['pekerjaan_ibu', 'Pekerjaan ibu yang benar'], ['nama_wali', 'Nama wali yang benar'],
  ['no_hp_wali', 'Nomor HP wali yang benar'],
].map(([key, label, type]) => ({ key: key as keyof StudentCorrectionPayload, label, type }));

const emptyClaimant: PublicClaimant = { nama_pengaju: '', hubungan: '', kontak_wa: '' };

export default function PortalSantri() {
  const [portal, setPortal] = useState<WaliPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState<StudentCorrectionPayload>({});
  const [claimant, setClaimant] = useState<PublicClaimant>(emptyClaimant);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const token = readPortalToken(window.location.hash);
    if (!token) {
      queueMicrotask(() => {
        if (active) { setInvalidLink(true); setLoading(false); }
      });
      return () => { active = false; };
    }

    getWaliPortal(token)
      .then((data) => {
        if (!active) return;
        if (data) setPortal(data); else setInvalidLink(true);
      })
      .catch(() => { if (active) setInvalidLink(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleCorrection(event: React.FormEvent) {
    event.preventDefault();
    const token = readPortalToken(window.location.hash);
    if (!token) { setInvalidLink(true); return; }
    if (!Object.values(correction).some((value) => value?.trim())) {
      setFormError('Isi minimal satu data yang ingin dikoreksi.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await submitWaliCorrection(token, correction, claimant);
      setSuccess(true);
      setEditing(false);
      setCorrection({});
      setClaimant(emptyClaimant);
    } catch {
      setFormError('Usulan belum dapat dikirim. Periksa data lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] font-bold text-emerald-900">Memuat portal wali…</main>;

  if (invalidLink || !portal) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-5">
        <section className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
          <ShieldCheck className="mx-auto mb-4 h-14 w-14 text-amber-600" aria-hidden="true" />
          <h1 className="text-2xl font-black text-emerald-950">Akses portal tidak tersedia</h1>
          <p className="mt-3 leading-7 text-slate-600">{INVALID_LINK_MESSAGE}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-8 text-slate-800 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-emerald-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-400 p-3 text-emerald-950"><UserRound aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Portal wali</p>
              <h1 className="mt-1 text-3xl font-black">{portal.profil.nama_lengkap}</h1>
              <p className="mt-2 text-sm text-emerald-100">{[portal.profil.status, portal.profil.kelas, portal.profil.asrama].filter(Boolean).join(' • ')}</p>
            </div>
          </div>
        </header>

        {portal.pengajuan_menunggu.length > 0 && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">Ada {portal.pengajuan_menunggu.length} pengajuan yang masih menunggu peninjauan admin.</p>}
        {success && <p role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 aria-hidden="true" /> Usulan sudah dikirim dan akan ditinjau admin.</p>}

        <section className="rounded-3xl bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><FileText className="text-emerald-700" aria-hidden="true" /><h2 className="text-xl font-black text-emerald-950">Data santri</h2></div>
            <button type="button" onClick={() => { setEditing(!editing); setFormError(''); }} className="rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white">{editing ? 'Tutup formulir' : 'Usulkan perubahan'}</button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {profileLabels.map(({ key, label }) => <div key={key} className="rounded-xl border border-slate-200 p-4"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{portal.profil[key] || 'Belum terisi'}</dd></div>)}
          </dl>

          {editing && (
            <form onSubmit={handleCorrection} className="mt-8 space-y-6 border-t border-slate-200 pt-7">
              <div><h3 className="text-xl font-black text-emerald-950">Isi hanya data yang perlu diperbaiki</h3><p className="mt-1 text-sm text-slate-600">Nilai di portal tetap tersamarkan. Ketik nilai lengkap yang menurut Anda benar.</p></div>
              {formError && <p role="alert" className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{formError}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                {correctionFields.map((field) => <label key={field.key} className="text-sm font-bold text-slate-700">{field.label}<input type={field.type || 'text'} value={correction[field.key] || ''} onChange={(event) => setCorrection({ ...correction, [field.key]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>)}
              </div>
              <fieldset className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:grid-cols-2">
                <legend className="px-2 text-sm font-black text-amber-900">Identitas pengaju</legend>
                <label className="text-sm font-bold text-slate-700">Nama pengaju<input required value={claimant.nama_pengaju} onChange={(event) => setClaimant({ ...claimant, nama_pengaju: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>
                <label className="text-sm font-bold text-slate-700">Hubungan dengan santri/alumni<input required value={claimant.hubungan} onChange={(event) => setClaimant({ ...claimant, hubungan: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>
                <label className="text-sm font-bold text-slate-700 sm:col-span-2">Nomor WhatsApp pengaju<input required inputMode="tel" value={claimant.kontak_wa} onChange={(event) => setClaimant({ ...claimant, kontak_wa: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>
              </fieldset>
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-emerald-800 px-6 py-3.5 font-bold text-white disabled:opacity-60">{submitting ? 'Mengirim…' : 'Kirim usulan perubahan'}</button>
            </form>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl bg-white p-6 shadow-lg shadow-emerald-950/5">
            <h2 className="flex items-center gap-2 text-lg font-black text-emerald-950"><BookOpen className="text-emerald-700" aria-hidden="true" /> Kedisiplinan</h2>
            {portal.pelanggaran.length === 0 ? <p className="mt-4 text-sm text-slate-500">Tidak ada data yang dapat ditampilkan.</p> : <ul className="mt-4 space-y-3">{portal.pelanggaran.map((item, index) => <li key={`${item.tanggal}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{item.jenis || 'Catatan'}</strong><br />{item.tanggal || '-'} • {item.status_tazir || '-'}</li>)}</ul>}
          </article>
          <article className="rounded-3xl bg-white p-6 shadow-lg shadow-emerald-950/5">
            <h2 className="flex items-center gap-2 text-lg font-black text-emerald-950"><Award className="text-amber-600" aria-hidden="true" /> Prestasi</h2>
            {portal.prestasi.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada prestasi yang ditampilkan.</p> : <ul className="mt-4 space-y-3">{portal.prestasi.map((item, index) => <li key={`${item.tanggal}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{item.prestasi}</strong><br />{item.tanggal}</li>)}</ul>}
          </article>
          <article className="rounded-3xl bg-white p-6 shadow-lg shadow-emerald-950/5">
            <h2 className="flex items-center gap-2 text-lg font-black text-emerald-950"><ShieldCheck className="text-emerald-700" aria-hidden="true" /> Catatan wali</h2>
            {portal.catatan.length === 0 ? <p className="mt-4 text-sm text-slate-500">Belum ada catatan yang ditampilkan.</p> : <ul className="mt-4 space-y-3">{portal.catatan.map((item, index) => <li key={`${item.tanggal}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm"><strong>{item.isi}</strong><br />{item.tanggal}</li>)}</ul>}
          </article>
        </section>
      </div>
    </main>
  );
}
