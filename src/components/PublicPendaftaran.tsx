import { useState } from 'react';
import { CheckCircle2, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { submitNewRegistration } from '../lib/securityApi';
import type { NewRegistrationPayload, PublicClaimant } from '../types/security';

type RegistrationField = {
  key: keyof NewRegistrationPayload;
  label: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
};

const identityFields: RegistrationField[] = [
  { key: 'nama_lengkap', label: 'Nama lengkap santri', required: true, wide: true },
  { key: 'nik', label: 'NIK' },
  { key: 'nisn', label: 'NISN' },
  { key: 'jenis_kelamin', label: 'Jenis kelamin' },
  { key: 'tempat_lahir', label: 'Tempat lahir' },
  { key: 'tanggal_lahir', label: 'Tanggal lahir', type: 'date' },
  { key: 'no_hp_santri', label: 'Nomor HP/WhatsApp santri' },
];

const addressFields: RegistrationField[] = [
  { key: 'alamat_jalan', label: 'Jalan/dusun/RT/RW', wide: true },
  { key: 'desa_kelurahan', label: 'Desa/kelurahan' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'kabupaten_kota', label: 'Kabupaten/kota' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'kode_pos', label: 'Kode pos' },
];

const familyFields: RegistrationField[] = [
  { key: 'nama_ayah', label: 'Nama ayah' },
  { key: 'pekerjaan_ayah', label: 'Pekerjaan ayah' },
  { key: 'nama_ibu', label: 'Nama ibu' },
  { key: 'pekerjaan_ibu', label: 'Pekerjaan ibu' },
  { key: 'nama_wali', label: 'Nama wali (jika ada)' },
  { key: 'no_hp_wali', label: 'Nomor HP/WhatsApp orang tua atau wali' },
];

const emptyClaimant: PublicClaimant = { nama_pengaju: '', hubungan: '', kontak_wa: '' };

function RegistrationFields({
  fields,
  form,
  onChange,
}: {
  fields: RegistrationField[];
  form: Partial<Record<keyof NewRegistrationPayload, string>>;
  onChange: (key: keyof NewRegistrationPayload, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className={`text-sm font-bold text-slate-700 ${field.wide ? 'sm:col-span-2' : ''}`}>
          {field.label}{field.required ? ' *' : ''}
          <input
            required={field.required}
            type={field.type || 'text'}
            value={form[field.key] || ''}
            onChange={(event) => onChange(field.key, event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      ))}
    </div>
  );
}

export default function PublicPendaftaran() {
  const [form, setForm] = useState<Partial<Record<keyof NewRegistrationPayload, string>>>({});
  const [claimant, setClaimant] = useState<PublicClaimant>(emptyClaimant);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function updateField(key: keyof NewRegistrationPayload, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value?.trim() || null]),
    ) as NewRegistrationPayload;

    try {
      await submitNewRegistration(payload, {
        nama_pengaju: claimant.nama_pengaju.trim(),
        hubungan: claimant.hubungan.trim(),
        kontak_wa: claimant.kontak_wa.trim(),
      });
      setSuccess(true);
    } catch {
      setError('Pendaftaran belum dapat dikirim. Periksa data lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f5ef] p-5">
        <section className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-700" aria-hidden="true" />
          <h1 className="text-2xl font-black text-emerald-950">Pendaftaran sudah diterima</h1>
          <p className="mt-3 leading-7 text-slate-600">Data akan ditinjau oleh admin sebelum dimasukkan ke buku induk santri.</p>
          <button type="button" onClick={() => { setSuccess(false); setForm({}); setClaimant(emptyClaimant); }} className="mt-6 rounded-xl bg-emerald-800 px-6 py-3 font-bold text-white">Isi pendaftaran lain</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-8 text-slate-800 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 rounded-3xl bg-emerald-950 p-7 text-center text-white shadow-xl sm:p-9">
          <UserPlus className="mx-auto mb-4 h-12 w-12 text-amber-300" aria-hidden="true" />
          <h1 className="text-3xl font-black">Pendaftaran Santri Baru</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-emerald-100">Formulir ini khusus calon santri baru. Perubahan data santri atau alumni lama dilakukan melalui halaman cek data.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl bg-white p-5 shadow-lg shadow-emerald-950/5 sm:p-9">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</p>}

          <section className="space-y-4">
            <h2 className="border-b border-slate-200 pb-2 text-xl font-black text-emerald-950">1. Identitas calon santri</h2>
            <RegistrationFields fields={identityFields} form={form} onChange={updateField} />
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-slate-200 pb-2 text-xl font-black text-emerald-950">2. Alamat</h2>
            <RegistrationFields fields={addressFields} form={form} onChange={updateField} />
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-slate-200 pb-2 text-xl font-black text-emerald-950">3. Orang tua atau wali</h2>
            <RegistrationFields fields={familyFields} form={form} onChange={updateField} />
          </section>

          <fieldset className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:grid-cols-2">
            <legend className="px-2 text-sm font-black text-amber-900">4. Identitas orang yang mengirim formulir</legend>
            <label className="text-sm font-bold text-slate-700">Nama pengaju
              <input required value={claimant.nama_pengaju} onChange={(event) => setClaimant({ ...claimant, nama_pengaju: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" />
            </label>
            <label className="text-sm font-bold text-slate-700">Hubungan dengan santri
              <input required value={claimant.hubungan} onChange={(event) => setClaimant({ ...claimant, hubungan: event.target.value })} placeholder="Contoh: ayah, ibu, diri sendiri" className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" />
            </label>
            <label className="text-sm font-bold text-slate-700 sm:col-span-2">Nomor WhatsApp pengaju
              <input required inputMode="tel" value={claimant.kontak_wa} onChange={(event) => setClaimant({ ...claimant, kontak_wa: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" />
            </label>
          </fieldset>

          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <ShieldCheck className="mr-2 inline h-5 w-5 text-emerald-700" aria-hidden="true" />
            NIS, kelas, asrama, status, dan data administrasi pondok ditetapkan oleh admin setelah peninjauan.
          </div>

          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-4 font-bold text-white disabled:opacity-60">
            <Send className="h-5 w-5" aria-hidden="true" /> {submitting ? 'Mengirim…' : 'Kirim pendaftaran'}
          </button>
        </form>
      </div>
    </main>
  );
}
