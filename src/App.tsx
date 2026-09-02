import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import {
  CheckSquare, ClipboardList, Clock, LogOut, Menu, Send, ShieldAlert,
  UserPlus, Users, X, XCircle,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { getMyProfile, listRegistrationRoles, registerMyProfile } from './lib/securityApi';
import type { MyProfile, RolePermission } from './types/security';
import AdminReview from './components/AdminReview';
import CekDataPublik from './components/CekDataPublik';
import LoginPage from './components/LoginPage';
import PengaturanSistem from './components/PengaturanSistem';
import PortalSantri from './components/PortalSantri';
import PublicPendaftaran from './components/PublicPendaftaran';
import SantriPage from './components/SantriPage';
import TakziranDashboard from './components/TakziranDashboard';

interface RegistrationUser {
  email?: string;
  user_metadata?: { full_name?: string };
}

export function FormPendaftaranAkun({
  user,
  onRegistered,
}: {
  user: RegistrationUser;
  onRegistered: () => void | Promise<void>;
}) {
  const [nama, setNama] = useState(user.user_metadata?.full_name || '');
  const [usulanRole, setUsulanRole] = useState('');
  const [roles, setRoles] = useState<Array<{ nama_role: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listRegistrationRoles()
      .then((data) => { if (active) setRoles(data); })
      .catch(() => { if (active) setError('Daftar posisi belum dapat dimuat. Silakan coba lagi.'); });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await registerMyProfile(nama.trim(), usulanRole);
      await onRegistered();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pendaftaran akun belum dapat dikirim.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FDFBF7] p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600"><UserPlus aria-hidden="true" /></div>
        <h1 className="text-center text-2xl font-black text-emerald-950">Lengkapi Data Anda</h1>
        <p className="mb-6 mt-2 text-center text-sm text-gray-500">Pilih posisi yang diajukan. Admin akan meninjau sebelum memberi akses.</p>
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-xs font-bold uppercase text-emerald-900">Email (Google)
            <input disabled value={user.email || ''} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm text-gray-500" />
          </label>
          <label className="block text-xs font-bold uppercase text-emerald-900">Nama Lengkap Anda
            <input required value={nama} onChange={(event) => setNama(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm" />
          </label>
          <label className="block text-xs font-bold uppercase text-emerald-900">Role / Posisi yang Diminta
            <select required value={usulanRole} onChange={(event) => setUsulanRole(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-bold">
              <option value="" disabled>-- Pilih Posisi Anda --</option>
              {roles.map((role) => <option key={role.nama_role} value={role.nama_role}>{role.nama_role}</option>)}
            </select>
          </label>
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3.5 font-bold text-white disabled:opacity-60"><Send className="h-4 w-4" aria-hidden="true" />{loading ? 'Mengirim…' : 'Kirim Pengajuan Akses'}</button>
        </form>
        <button type="button" onClick={() => void supabase.auth.signOut()} className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-red-500">Batalkan & Keluar</button>
      </section>
    </main>
  );
}

function MenungguVerifikasi() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] p-6 text-center">
      <Clock className="mb-6 h-24 w-24 text-amber-500" aria-hidden="true" />
      <h1 className="text-3xl font-black text-emerald-950">Pengajuan Sedang Diproses</h1>
      <p className="mt-3 max-w-md leading-relaxed text-gray-600">Pengajuan akses sedang menunggu validasi Super Admin.</p>
      <button type="button" onClick={() => void supabase.auth.signOut()} className="mt-8 flex items-center gap-2 rounded-xl bg-emerald-800 px-8 py-3 font-bold text-white"><LogOut className="h-4 w-4" aria-hidden="true" />Keluar Akun</button>
    </main>
  );
}

function AkunDitolak() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] p-6 text-center">
      <XCircle className="mb-6 h-24 w-24 text-red-500" aria-hidden="true" />
      <h1 className="text-3xl font-black text-red-950">Akses Ditolak</h1>
      <p className="mt-3 max-w-md leading-relaxed text-gray-600">Hubungi pihak pesantren jika keputusan ini perlu diperiksa kembali.</p>
      <button type="button" onClick={() => void supabase.auth.signOut()} className="mt-8 flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3 font-bold text-white"><LogOut className="h-4 w-4" aria-hidden="true" />Keluar Akun</button>
    </main>
  );
}

function AdminLayout({ children, profile }: { children: React.ReactNode; profile: MyProfile }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const permissions = profile.role?.permissions ?? [];
  const hasPermission = (permission: RolePermission) => permissions.includes(permission);
  const menuItems = [
    { path: '/', label: 'Buku Induk Santri', icon: Users, show: hasPermission('akses_induk') },
    { path: '/review', label: 'Review Pengajuan', icon: CheckSquare, show: hasPermission('validasi_pengajuan') },
    { path: '/takziran', label: 'Absensi & Takziran', icon: ClipboardList, show: hasPermission('akses_takziran') },
    { path: '/pengaturan', label: 'Pengaturan Sistem', icon: ShieldAlert, show: hasPermission('kelola_pengguna') },
  ].filter((item) => item.show);

  const menu = menuItems.map((item) => {
    const Icon = item.icon;
    return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3.5 font-bold ${location.pathname === item.path ? 'bg-amber-500 text-emerald-950' : 'text-emerald-100 hover:bg-emerald-800'}`}><Icon className="h-5 w-5" aria-hidden="true" />{item.label}</Link>;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#FDFBF7]">
      <aside className="hidden w-72 flex-col border-r-4 border-amber-500 bg-gradient-to-b from-[#064e3b] to-emerald-900 text-white md:flex">
        <div className="border-b border-emerald-800 p-6 text-center"><h1 className="text-xl font-black text-amber-400">SIM Santri</h1><p className="text-xs text-emerald-200">Daruttauhid Jepara</p></div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">{menu}</nav>
        <div className="border-t border-emerald-800 p-4"><p className="truncate text-xs font-bold text-emerald-300">{profile.nama_lengkap}</p><p className="mt-1 text-xs font-bold uppercase text-amber-400">{profile.role?.nama_role || 'Belum Ada Role'}</p><button type="button" onClick={() => void supabase.auth.signOut()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-900/60 p-3 text-sm font-bold text-rose-200"><LogOut className="h-4 w-4" aria-hidden="true" />Keluar</button></div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b-2 border-amber-500 bg-emerald-900 px-4 text-white md:hidden"><strong className="text-amber-400">SIM Santri</strong><button type="button" aria-label="Buka menu" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button></header>
      {mobileOpen && <div className="fixed inset-0 z-20 space-y-2 bg-emerald-950/95 px-4 pt-20 md:hidden">{menu}</div>}
      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-8 md:pt-8">{children}</main>
    </div>
  );
}

function ProtectedApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(await getMyProfile());
    } catch {
      setError('Profil pengguna belum dapat dimuat. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) void refreshProfile(); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) void refreshProfile(); else { setProfile(null); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [refreshProfile]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] font-bold text-emerald-800">Menghubungkan ke server…</div>;
  if (!session) return <LoginPage />;
  if (error) return <main className="flex min-h-screen items-center justify-center bg-[#FDFBF7] p-5"><section className="rounded-2xl bg-white p-7 text-center shadow"><p role="alert" className="font-semibold text-red-700">{error}</p><button type="button" onClick={() => void refreshProfile()} className="mt-4 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white">Coba lagi</button></section></main>;
  if (!profile) return <FormPendaftaranAkun user={session.user} onRegistered={refreshProfile} />;
  if (profile.status_akun === 'Ditolak') return <AkunDitolak />;
  if (profile.status_akun !== 'Aktif' || !profile.role_id || !profile.role) return <MenungguVerifikasi />;

  const permissions = profile.role.permissions;
  const hasPermission = (permission: RolePermission) => permissions.includes(permission);
  return (
    <AdminLayout profile={profile}>
      <Routes>
        {hasPermission('akses_induk') && <Route path="/" element={<SantriPage permissions={permissions} />} />}
        {hasPermission('validasi_pengajuan') && <Route path="/review" element={<AdminReview permissions={permissions} />} />}
        {hasPermission('akses_takziran') && <Route path="/takziran" element={<TakziranDashboard />} />}
        {hasPermission('kelola_pengguna') && <Route path="/pengaturan" element={<PengaturanSistem />} />}
        <Route path="*" element={<div className="p-10 text-center font-bold text-gray-500">Anda tidak memiliki hak akses ke halaman ini.</div>} />
      </Routes>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pendaftaran" element={<PublicPendaftaran />} />
        <Route path="/cek-data" element={<CekDataPublik />} />
        <Route path="/s" element={<PortalSantri />} />
        <Route path="/*" element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  );
}
