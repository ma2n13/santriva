import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { 
  Users, ClipboardList, CheckSquare, UserPlus, Menu, X,
  ShieldAlert, LogOut, XCircle, Send, Clock
} from 'lucide-react';

// Import Halaman
import SantriPage from './components/SantriPage';
import PortalSantri from './components/PortalSantri';
import TakziranDashboard from './components/TakziranDashboard';
import PublicPendaftaran from './components/PublicPendaftaran';
import CekDataPublik from './components/CekDataPublik';
import AdminReview from './components/AdminReview';
import LoginPage from './components/LoginPage';
import PengaturanSistem from './components/PengaturanSistem';

// ==========================================
// KOMPONEN: Form Pendaftaran Pengguna Baru
// ==========================================
function FormPendaftaranAkun({ user, onRegistered }: { user: any, onRegistered: () => void }) {
  const [nama, setNama] = useState(user.user_metadata?.full_name || '');
  const [usulanRole, setUsulanRole] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ambil daftar role dari database (Sembunyikan Super Admin agar tidak dipilih sembarangan)
    supabase.from('master_role').select('nama_role').neq('nama_role', 'Super Admin')
      .then(({ data }) => setRoles(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Gunakan UPSERT agar jika akun lama tertinggal di database, data tetap bisa diperbarui
    const { error } = await supabase.from('pengguna').upsert([{
      id: user.id, 
      email: user.email, 
      nama_lengkap: nama, 
      usulan_role: usulanRole,
      status_akun: 'Menunggu'
    }]);
    setLoading(false);
    
    if (error) alert('Gagal mendaftar: ' + error.message);
    else onRegistered();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4 font-sans">
      <div className="bg-white max-w-md w-full p-8 rounded-[2rem] shadow-xl border border-emerald-100">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-emerald-950 text-center">Lengkapi Data Anda</h2>
        <p className="text-sm text-gray-500 text-center mt-2 mb-6">Akun Google Anda belum terdaftar di SIM Santri. Silakan isi form pengajuan akses ini.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Email (Google)</label>
            <input type="text" disabled value={user.email} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-100 text-gray-500 font-medium text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Nama Lengkap Anda</label>
            <input required type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm text-gray-800" />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Role / Posisi yang Diminta</label>
            <select required value={usulanRole} onChange={e => setUsulanRole(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm text-gray-800 cursor-pointer">
              <option value="" disabled>-- Pilih Posisi Anda --</option>
              {roles.map(r => <option key={r.nama_role} value={r.nama_role}>{r.nama_role}</option>)}
            </select>
          </div>
          <button disabled={loading} type="submit" className="w-full mt-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
            {loading ? <span className="animate-spin text-xl">↻</span> : <Send className="w-4 h-4" />} Kirim Pengajuan Akses
          </button>
        </form>
        <button onClick={() => supabase.auth.signOut()} className="w-full mt-3 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">Batalkan & Keluar</button>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: Layar Menunggu Verifikasi
// ==========================================
function MenungguVerifikasi() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-center p-6 font-sans">
      <Clock className="w-24 h-24 text-amber-500 mb-6 drop-shadow-md animate-pulse" />
      <h2 className="text-3xl font-black text-emerald-950">Pengajuan Sedang Diproses</h2>
      <p className="text-gray-600 mt-3 max-w-md font-medium leading-relaxed">
        Pendaftaran Anda telah kami terima dan saat ini sedang menunggu validasi dari Super Admin. Silakan cek kembali secara berkala.
      </p>
      <button onClick={() => supabase.auth.signOut()} className="mt-8 px-8 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
        <LogOut className="w-4 h-4"/> Keluar Akun
      </button>
    </div>
  );
}

// ==========================================
// KOMPONEN: Layar Akun Ditolak
// ==========================================
function AkunDitolak() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-center p-6 font-sans">
      <XCircle className="w-24 h-24 text-red-500 mb-6 drop-shadow-md" />
      <h2 className="text-3xl font-black text-red-950">Akses Ditolak</h2>
      <p className="text-gray-600 mt-3 max-w-md font-medium leading-relaxed">
        Mohon maaf, pengajuan akses Anda ke sistem SIM Santri telah ditolak oleh Admin. Hubungi pihak sekolah jika ini adalah sebuah kesalahan.
      </p>
      <button onClick={() => supabase.auth.signOut()} className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
        <LogOut className="w-4 h-4"/> Keluar Akun
      </button>
    </div>
  );
}

// ==========================================
// KOMPONEN: Layout Admin dengan Validasi Hak Akses
// ==========================================
function AdminLayout({ children, userProfile }: { children: React.ReactNode, userProfile: any }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const hasPerm = (perm: string) => userProfile?.master_role?.permissions?.includes(perm) || false;

  const menuItems = [
    { path: '/', label: 'Buku Induk Santri', icon: <Users className="w-5 h-5" />, show: hasPerm('akses_induk') },
    { path: '/review', label: 'Review Pengajuan', icon: <CheckSquare className="w-5 h-5" />, show: hasPerm('validasi_pengajuan') },
    { path: '/takziran', label: 'Absensi & Takziran', icon: <ClipboardList className="w-5 h-5" />, show: hasPerm('akses_takziran') },
    { path: '/pengaturan', label: 'Pengaturan Sistem', icon: <ShieldAlert className="w-5 h-5" />, show: hasPerm('kelola_pengguna') },
  ].filter(item => item.show);

  return (
    <div className="flex h-screen bg-[#FDFBF7] overflow-hidden font-sans selection:bg-amber-200 selection:text-emerald-900">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 bg-gradient-to-b from-[#064e3b] to-emerald-900 text-emerald-50 shadow-2xl z-20 border-r-4 border-amber-500">
        <div className="p-6 flex items-center justify-center border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-full border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] object-cover bg-white" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150'; }} />
            <div>
              <h1 className="text-lg font-black text-amber-400 leading-tight">SIM Santri</h1>
              <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-200">Daruttauhid Jepara</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-bold text-emerald-400/70 uppercase tracking-wider mb-4 mt-2">Menu Utama</p>
          {menuItems.map(item => (
            <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-bold ${location.pathname === item.path ? 'bg-amber-500 text-emerald-950 shadow-lg' : 'text-emerald-100 hover:bg-emerald-800'}`}>
              {item.icon} <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Profil & Logout */}
        <div className="p-4 border-t border-emerald-800/50 bg-emerald-950/30">
          <div className="px-4 py-3 mb-3 bg-emerald-900/50 rounded-xl border border-emerald-800">
             <p className="text-xs text-emerald-400 font-bold truncate">{userProfile?.nama_lengkap}</p>
             <p className="text-[10px] text-amber-400 font-bold uppercase mt-0.5">{userProfile?.master_role?.nama_role || 'Belum Ada Role'}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-rose-900/40 hover:bg-rose-900/80 rounded-xl text-rose-300 transition-colors text-sm font-bold border border-rose-900/50">
            <LogOut className="w-4 h-4"/> Keluar Akun
          </button>
        </div>
      </aside>

      {/* TOPBAR MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#064e3b] to-emerald-900 text-white flex items-center justify-between px-4 z-30 border-b-2 border-amber-500">
        <div className="flex items-center gap-2"><img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-full border border-amber-400 bg-white" /><h1 className="text-lg font-black text-amber-400">SIM Santri</h1></div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-amber-400 bg-emerald-800/50 rounded-lg">{isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-emerald-950/95 backdrop-blur-sm text-white pt-20 px-4 pb-4 overflow-y-auto">
           <nav className="space-y-2">
            {menuItems.map(item => (<Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-4 rounded-xl font-bold ${location.pathname === item.path ? 'bg-amber-500 text-emerald-950' : 'text-emerald-200'}`}>{item.icon} <span>{item.label}</span></Link>))}
            <button onClick={() => supabase.auth.signOut()} className="w-full mt-8 flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-rose-300 border border-rose-900 bg-rose-950/50 font-bold"><LogOut className="w-5 h-5"/> Keluar Akun</button>
          </nav>
        </div>
      )}

      {/* AREA KONTEN UTAMA */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 p-4 sm:p-8">
        {children}
      </main>
    </div>
  );
}

// ==========================================
// ROOT APP
// ==========================================
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user);
      else setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user);
      else { setUserProfile(null); setLoadingAuth(false); }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user: any) => {
    try {
      const { data } = await supabase.from('pengguna').select('*, master_role(nama_role, permissions)').eq('id', user.id).maybeSingle();
      setUserProfile(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAuth(false);
    }
  };

  if (loadingAuth) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7] text-emerald-800 font-bold animate-pulse">Menghubungkan ke server...</div>;

  const renderProtectedRoutes = () => {
    if (!session) return <LoginPage />;
    
    // Tampilkan Form Jika data belum ada, ATAU data lama tapi belum punya usulan_role & belum disetujui
    if (!userProfile || (!userProfile.usulan_role && !userProfile.role_id)) {
      return <FormPendaftaranAkun user={session.user} onRegistered={() => fetchUserProfile(session.user)} />;
    }

    // Blokir jika ditolak
    if (userProfile.status_akun === 'Ditolak') return <AkunDitolak />;

    // Jika status BUKAN 'Aktif' atau TIDAK PUNYA Role, larang masuk!
    if (userProfile.status_akun !== 'Aktif' || !userProfile.role_id) {
      return <MenungguVerifikasi />;
    }

    // Jika lolos semua pengecekan, berarti status == 'Aktif' DAN punya role_id
    const hasPerm = (perm: string) => userProfile?.master_role?.permissions?.includes(perm) || false;

    return (
      <AdminLayout userProfile={userProfile}>
        <Routes>
          {hasPerm('akses_induk') && <Route path="/" element={<SantriPage />} />}
          {hasPerm('validasi_pengajuan') && <Route path="/review" element={<AdminReview />} />}
          {hasPerm('akses_takziran') && <Route path="/takziran" element={<TakziranDashboard />} />}
          {hasPerm('kelola_pengguna') && <Route path="/pengaturan" element={<PengaturanSistem />} />}
          <Route path="*" element={<div className="p-10 text-center font-bold text-gray-500">Anda tidak memiliki hak akses ke halaman ini.</div>} />
        </Routes>
      </AdminLayout>
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/pendaftaran" element={<PublicPendaftaran />} />
        <Route path="/cek-data" element={<CekDataPublik />} />
        <Route path="/s" element={<PortalSantri />} />
        <Route path="/*" element={renderProtectedRoutes()} />
      </Routes>
    </BrowserRouter>
  );
}
