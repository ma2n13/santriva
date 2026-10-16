import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { 
  Users, ClipboardList, CheckSquare, UserPlus, Menu, X,
  ShieldAlert, LogOut, XCircle, Send, Clock, PanelLeftClose, PanelLeft,
  ChevronRight, ChevronLeft, Calendar, Bell
} from 'lucide-react';


// Import Halaman
import SantriPage from './components/SantriPage';
import PortalSantri from './components/PortalSantri';
import TakziranDashboard from './components/TakziranDashboard';
import PublicPendaftaran from './components/PublicPendaftaran';
import AdminReview from './components/AdminReview';
import LoginPage from './components/LoginPage';
import PengaturanSistem from './components/PengaturanSistem';
import { IconButton } from './components/common/IconButton';

// ==========================================
// KOMPONEN LOGO PONDOK (Bisa diatur ukurannya, lebih besar & mewah)
// ==========================================
function PondokLogoEmblem({ size = 'lg', className = '' }: { size?: 'md' | 'lg' | 'xl', className?: string }) {
  const sizeClasses = {
    md: 'w-11 h-11 rounded-2xl p-0.5',
    lg: 'w-14 h-14 rounded-2xl p-1',
    xl: 'w-16 h-16 rounded-[1.25rem] p-1'
  }[size];

  const imgRadius = {
    md: 'rounded-[14px]',
    lg: 'rounded-[13px]',
    xl: 'rounded-[16px]'
  }[size];

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className={`${sizeClasses} bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-500 shadow-lg shadow-amber-500/25 flex items-center justify-center`}>
        <img 
          src="/logo.jpg" 
          alt="Logo Pondok Daruttauhid" 
          className={`w-full h-full ${imgRadius} object-cover bg-white`} 
          onError={(e) => { e.currentTarget.style.display = 'none'; }} 
        />
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN TEKS HEADER (Cukup Tulisan Saja Tanpa Logo)
// ==========================================
function InstitutionTextHeader({ light = false, mobile = false }: { light?: boolean, mobile?: boolean }) {
  if (mobile) {
    return (
      <div className="flex flex-col text-left">
        <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80 inline-block w-fit leading-none">
          Manajemen Pondok &amp; Madrasah
        </span>
        <div className="flex items-center gap-1 mt-1 leading-none">
          <span className="text-xs sm:text-sm font-black text-gray-900 tracking-tight font-display truncate">
            Daruttauhid Al-'Alawiyyah
          </span>
          <span className="text-[7.5px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-300/60 shrink-0">
            Jepara
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col text-left">
      <div className="flex items-center gap-1.5 leading-none">
        <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border inline-block w-fit ${
          light 
            ? 'text-emerald-300 bg-emerald-950/80 border-emerald-700/60' 
            : 'text-emerald-800 bg-emerald-50 border-emerald-200/80'
        }`}>
          Manajemen Pondok &amp; Madrasah
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1 leading-none">
        <h1 className={`text-sm sm:text-base font-extrabold tracking-tight font-display ${light ? 'text-white' : 'text-gray-900'}`}>
          Daruttauhid Al-'Alawiyyah
        </h1>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          light
            ? 'text-amber-300 bg-amber-400/20 border-amber-400/30'
            : 'text-amber-800 bg-amber-100/90 border-amber-300/60'
        }`}>
          Jepara
        </span>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: Form Pendaftaran Pengguna Baru
// ==========================================
function FormPendaftaranAkun({ user, onRegistered }: { user: any, onRegistered: () => void }) {
  const [nama, setNama] = useState(user.user_metadata?.full_name || '');
  const [usulanRole, setUsulanRole] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('master_role').select('nama_role').neq('nama_role', 'Super Admin')
      .then(({ data }) => setRoles(data || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9] p-4 font-sans">
      <div className="bg-white max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl border border-emerald-100">
        <div className="flex flex-col items-center gap-2.5 mb-5 text-center">
          <PondokLogoEmblem size="lg" />
          <InstitutionTextHeader />
        </div>
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-amber-200">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-emerald-950">Lengkapi Profil Pengguna</h2>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
            Akun Google Anda belum terdaftar di sistem Manajemen Pondok dan Madrasah Daruttauhid Al-'Alawiyyah Jepara. Silakan isi form pengajuan hak akses berikut.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Email Google</label>
            <input type="text" disabled value={user.email} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-100 text-gray-500 font-medium text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Nama Lengkap Anda</label>
            <input required type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm text-gray-800" />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-900 uppercase mb-1">Posisi / Role yang Diajukan</label>
            <select required value={usulanRole} onChange={e => setUsulanRole(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm text-gray-800 cursor-pointer">
              <option value="" disabled>-- Pilih Posisi Anda --</option>
              {roles.map(r => <option key={r.nama_role} value={r.nama_role}>{r.nama_role}</option>)}
            </select>
          </div>
          <div className="flex justify-center mt-4">
            <IconButton 
              disabled={loading} 
              type="submit" 
              icon={loading ? <span className="animate-spin text-lg">↻</span> : <Send className="w-4 h-4" />}
              label={loading ? 'Mengirim...' : 'Kirim Pengajuan Akses'}
              variant="dark"
              size="lg"
            />
          </div>
        </form>
        <div className="flex justify-center mt-3">
          <IconButton 
            onClick={() => supabase.auth.signOut()} 
            icon={<LogOut className="w-4 h-4" />}
            label="Batalkan & Keluar"
            variant="rose"
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: Layar Menunggu Verifikasi
// ==========================================
function MenungguVerifikasi() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAF9] text-center p-6 font-sans">
      <div className="bg-white max-w-lg w-full p-8 rounded-[2.5rem] shadow-2xl border border-emerald-100 flex flex-col items-center">
        <div className="flex flex-col items-center gap-2 mb-6">
          <PondokLogoEmblem size="lg" />
          <InstitutionTextHeader />
        </div>
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5 border-2 border-amber-200 shadow-inner">
          <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-emerald-950">Pengajuan Sedang Diverifikasi</h2>
        <p className="text-gray-600 mt-3 text-sm leading-relaxed max-w-sm">
          Pendaftaran akun Anda telah kami terima di sistem Manajemen Pondok dan Madrasah Daruttauhid Al-'Alawiyyah Jepara dan saat ini sedang menunggu persetujuan dari Super Admin.
        </p>
        <div className="mt-8">
          <IconButton 
            onClick={() => supabase.auth.signOut()} 
            icon={<LogOut className="w-4 h-4"/>}
            label="Keluar Akun"
            variant="dark"
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: Layar Akun Ditolak
// ==========================================
function AkunDitolak() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAF9] text-center p-6 font-sans">
      <div className="bg-white max-w-lg w-full p-8 rounded-[2.5rem] shadow-2xl border border-red-100 flex flex-col items-center">
        <div className="flex flex-col items-center gap-2 mb-6">
          <PondokLogoEmblem size="lg" />
          <InstitutionTextHeader />
        </div>
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5 border-2 border-red-200">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-red-950">Akses Ditolak</h2>
        <p className="text-gray-600 mt-3 text-sm leading-relaxed max-w-sm">
          Mohon maaf, pengajuan akses Anda ke sistem Manajemen Pondok dan Madrasah Daruttauhid Al-'Alawiyyah Jepara telah ditolak oleh Admin. Hubungi pihak pengurus pondok jika ini merupakan kekeliruan.
        </p>
        <div className="mt-8">
          <IconButton 
            onClick={() => supabase.auth.signOut()} 
            icon={<LogOut className="w-4 h-4"/>}
            label="Keluar Akun"
            variant="rose"
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// KOMPONEN: Layout Admin Modern & Lapang (Icon-first Collapsible Sidebar)
// ==========================================
function AdminLayout({ children, userProfile }: { children: React.ReactNode, userProfile: any }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  // State sidebar collapsed: default TRUE agar layar terasa lapang & tidak sempit
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed_pref');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed_pref', String(next));
      return next;
    });
  };

  const hasPerm = (perm: string) => userProfile?.master_role?.permissions?.includes(perm) || false;

  useEffect(() => {
    if (hasPerm('validasi_pengajuan')) {
      supabase.from('pengajuan_santri')
        .select('id', { count: 'exact', head: true })
        .eq('status_pengajuan', 'Menunggu')
        .then(({ count }) => setPendingReviewCount(count || 0));
    }
  }, [userProfile, location.pathname]);

  const menuItems = [
    { 
      path: '/', 
      label: 'Buku Induk Santri', 
      shortLabel: 'Santri',
      icon: <Users className="w-5 h-5 shrink-0" />, 
      show: hasPerm('akses_induk') 
    },
    { 
      path: '/review', 
      label: 'Review Pengajuan', 
      shortLabel: 'Review',
      icon: <CheckSquare className="w-5 h-5 shrink-0" />, 
      badge: pendingReviewCount,
      show: hasPerm('validasi_pengajuan') 
    },
    { 
      path: '/takziran', 
      label: 'Absensi & Takziran', 
      shortLabel: 'Absensi',
      icon: <ClipboardList className="w-5 h-5 shrink-0" />, 
      show: hasPerm('akses_takziran') 
    },
    { 
      path: '/pengaturan', 
      label: 'Pengaturan Sistem', 
      shortLabel: 'Pengaturan',
      icon: <ShieldAlert className="w-5 h-5 shrink-0" />, 
      show: hasPerm('kelola_pengguna') 
    },
  ].filter(item => item.show);

  const activeMenuItem = menuItems.find(item => item.path === location.pathname) || menuItems[0];

  const currentDateDisplay = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="flex h-screen bg-[#F8FAF9] overflow-hidden font-sans">
      
      {/* ========================================== */}
      {/* SIDEBAR DESKTOP: HANYA LOGO PONDOK SAJA SEDIKIT AGAK BESAR */}
      {/* (Tanpa Tulisan Nama Institusi) */}
      {/* ========================================== */}
      <aside 
        className={`hidden md:flex flex-col bg-gradient-to-b from-[#032219] via-[#043325] to-[#021812] text-white shadow-2xl z-30 transition-all duration-300 ease-in-out border-r border-emerald-900/60 relative ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Header Sidebar: Cukup Logo Pondok Saja Sedikit Agak Besar */}
        <div className={`h-24 flex items-center border-b border-emerald-800/40 shrink-0 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-6'
        }`}>
          <button 
            onClick={toggleSidebar}
            title={isCollapsed ? 'Klik untuk memperluas menu' : 'Klik untuk menciutkan menu'}
            className="group relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          >
            {/* Logo Pondok Sedikit Agak Besar (w-14 h-14) dengan Lingkaran Emas Mewah */}
            <PondokLogoEmblem size="lg" />

            {/* Tooltip pada logo saat icon mode */}
            {isCollapsed && (
              <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-2 bg-emerald-950/95 backdrop-blur-md text-white text-xs font-bold rounded-xl shadow-2xl border border-emerald-700/60 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <span>Pondok &amp; Madrasah Daruttauhid</span>
                <p className="text-[10px] text-amber-300 font-normal">Klik untuk perluas sidebar</p>
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-950 border-l border-b border-emerald-700/60 rotate-45" />
              </div>
            )}
          </button>

          {/* Tombol ciutkan ketika expanded */}
          {!isCollapsed && (
            <button 
              onClick={toggleSidebar}
              title="Ciutkan Menu ke Mode Icon"
              className="p-2 text-emerald-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Navigasi Menu Icon */}
        <nav className="flex-1 py-5 px-3 space-y-2 overflow-visible">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-extrabold text-emerald-400/80 uppercase tracking-widest mb-3">
              Menu Navigasi
            </p>
          )}

          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            const hasBadge = (item.badge || 0) > 0;

            return (
              <div key={item.path} className="relative group">
                <Link 
                  to={item.path} 
                  className={`flex items-center rounded-2xl transition-all duration-200 font-bold ${
                    isCollapsed 
                      ? 'w-12 h-12 mx-auto justify-center' 
                      : 'px-4 py-3.5 gap-3.5 w-full'
                  } ${
                    isActive 
                      ? 'bg-amber-400 text-emerald-950 shadow-lg shadow-amber-400/30 font-black' 
                      : 'text-emerald-100/80 hover:bg-emerald-800/60 hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    {item.icon}
                    {hasBadge && isCollapsed ? (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-emerald-950 animate-pulse" />
                    ) : null}
                  </div>

                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="text-sm font-semibold truncate tracking-tight">{item.label}</span>
                      {hasBadge ? (
                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  )}
                </Link>

                {/* FLOATING HOVER TOOLTIP KETERANGAN MENU (Keluar saat kursor diarahkan) */}
                {isCollapsed && (
                  <div className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3.5 py-2.5 bg-emerald-950/95 backdrop-blur-md text-white text-xs font-semibold rounded-2xl shadow-2xl border border-emerald-600/50 whitespace-nowrap opacity-0 pointer-events-none -translate-x-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 transition-all duration-200 z-50 flex items-center gap-2.5">
                    <span className="font-bold">{item.label}</span>
                    {hasBadge ? (
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                        {item.badge}
                      </span>
                    ) : null}
                    {isActive && (
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-400/20 px-1.5 py-0.5 rounded">
                        Aktif
                      </span>
                    )}
                    {/* Arrow Pointer */}
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-950 border-l border-b border-emerald-600/50 rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Sidebar: User Profile & Expand Button */}
        <div className="p-3 border-t border-emerald-800/40 bg-black/20 shrink-0">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              {/* Avatar dengan hover popover */}
              <div className="relative group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-md cursor-pointer border border-emerald-600/50">
                  {userProfile?.nama_lengkap ? userProfile.nama_lengkap.charAt(0).toUpperCase() : 'U'}
                </div>
                {/* Popover User saat hover */}
                <div className="absolute left-[calc(100%+14px)] bottom-0 p-3 bg-emerald-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-emerald-600/50 whitespace-nowrap opacity-0 pointer-events-none -translate-x-2 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 transition-all duration-200 z-50">
                  <p className="text-xs font-bold text-white">{userProfile?.nama_lengkap}</p>
                  <p className="text-[10px] font-semibold text-amber-300 uppercase mt-0.5">{userProfile?.master_role?.nama_role || 'Staff'}</p>
                  <div className="mt-2.5 flex justify-center">
                    <IconButton 
                      onClick={() => supabase.auth.signOut()} 
                      icon={<LogOut className="w-3.5 h-3.5" />}
                      label="Keluar"
                      variant="rose"
                      size="sm"
                    />
                  </div>
                  <div className="absolute -left-1.5 bottom-3 w-3 h-3 bg-emerald-950 border-l border-b border-emerald-600/50 rotate-45" />
                </div>
              </div>

              {/* Tombol Perluas Sidebar */}
              <button 
                onClick={toggleSidebar}
                title="Perluas Sidebar"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="px-3 py-2.5 bg-emerald-950/70 rounded-xl border border-emerald-800/80">
                <p className="text-xs text-white font-bold truncate">{userProfile?.nama_lengkap}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-black text-amber-300 uppercase bg-amber-400/20 px-1.5 py-0.5 rounded">
                    {userProfile?.master_role?.nama_role || 'Staff'}
                  </span>
                  <button 
                    onClick={toggleSidebar}
                    title="Ciutkan Menu"
                    className="text-xs text-emerald-400 hover:text-emerald-200 flex items-center gap-1 font-semibold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Ciutkan
                  </button>
                </div>
              </div>
              <div className="flex justify-center">
                <IconButton 
                  onClick={() => supabase.auth.signOut()} 
                  icon={<LogOut className="w-4 h-4"/>}
                  label="Keluar Akun"
                  variant="rose"
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================== */}
      {/* AREA UTAMA, TOPBAR & RESPONSIVE MOBILE */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* DESKTOP TOPBAR: CUKUP TULISAN SAJA TANPA LOGO */}
        <header className="hidden md:flex h-16 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs items-center justify-between px-6 z-20 shrink-0">
          {/* Sisi Kiri Topbar */}
          <div className="flex items-center gap-4">
            <IconButton 
              onClick={toggleSidebar} 
              icon={isCollapsed ? <PanelLeft className="w-5 h-5 text-emerald-800" /> : <PanelLeftClose className="w-5 h-5 text-gray-600" />}
              label={isCollapsed ? 'Perluas Menu' : 'Ciutkan Menu'}
              variant="ghost"
              size="sm"
            />

            {/* Model Tulisan Header Cantik & Hemat Tempat (TANPA LOGO) */}
            <div className="border-l border-gray-200 pl-4">
              <InstitutionTextHeader />
            </div>

            {/* Active Page Indicator */}
            {activeMenuItem && (
              <div className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1 bg-gray-50 rounded-full border border-gray-200/80 text-xs font-bold text-gray-700">
                <span className="text-emerald-700">{activeMenuItem.icon}</span>
                <span>{activeMenuItem.label}</span>
              </div>
            )}
          </div>

          {/* Sisi Kanan Topbar */}
          <div className="flex items-center gap-3">
            {/* Tanggal Hari Ini */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200 text-xs font-semibold text-gray-600">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{currentDateDisplay}</span>
            </div>

            {/* Quick Link Review Pengajuan jika ada yang menunggu */}
            {(pendingReviewCount > 0 && hasPerm('validasi_pengajuan')) ? (
              <Link 
                to="/review" 
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold transition-all shadow-xs"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                <span>{pendingReviewCount} Pengajuan Baru</span>
              </Link>
            ) : null}

            {/* User Capsule */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-800 to-amber-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
                {userProfile?.nama_lengkap ? userProfile.nama_lengkap.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[140px]">
                  {userProfile?.nama_lengkap}
                </p>
                <p className="text-[10px] font-bold text-emerald-700 uppercase leading-none mt-0.5">
                  {userProfile?.master_role?.nama_role || 'Staff'}
                </p>
              </div>
            </div>

            {/* Quick Sign Out */}
            <IconButton 
              onClick={() => supabase.auth.signOut()} 
              icon={<LogOut className="w-4 h-4" />}
              label="Keluar Akun"
              variant="rose"
              size="sm"
            />
          </div>
        </header>

        {/* ========================================== */}
        {/* TOPBAR MOBILE (Cukup Tulisan Saja Tanpa Logo) */}
        {/* ========================================== */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md text-gray-900 flex items-center justify-between px-3 sm:px-4 z-40 border-b border-gray-200/90 shadow-xs">
          <InstitutionTextHeader mobile />
          
          <div className="flex items-center gap-2">
            {(pendingReviewCount > 0 && hasPerm('validasi_pengajuan')) ? (
              <Link 
                to="/review" 
                className="relative p-2 text-amber-600 bg-amber-50 rounded-xl border border-amber-200"
                title="Review Pengajuan"
              >
                <Bell className="w-5 h-5 animate-bounce" />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingReviewCount}
                </span>
              </Link>
            ) : null}

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="p-2.5 text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200/80 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ========================================== */}
        {/* MOBILE DRAWER (Menu Geser Samping Lengkap) */}
        {/* ========================================== */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
            <div className="w-[84%] max-w-xs bg-gradient-to-b from-[#032219] via-[#043325] to-[#021812] text-white p-5 flex flex-col justify-between shadow-2xl h-full overflow-y-auto animate-in slide-in-from-left duration-200">
              <div>
                {/* Header Drawer Mobile: Logo Pondok Besar */}
                <div className="flex items-center justify-between pb-5 border-b border-emerald-800/80">
                  <div className="flex items-center gap-3">
                    <PondokLogoEmblem size="lg" />
                    <div>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300">Pondok &amp; Madrasah</span>
                      <p className="text-sm font-black text-white">Daruttauhid</p>
                    </div>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <nav className="mt-6 space-y-2">
                  {menuItems.map(item => {
                    const isActive = location.pathname === item.path;
                    const hasBadge = (item.badge || 0) > 0;
                    return (
                      <Link 
                        key={item.path} 
                        to={item.path} 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        className={`flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all ${
                          isActive 
                            ? 'bg-amber-400 text-emerald-950 shadow-md font-black' 
                            : 'text-emerald-100 hover:bg-emerald-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </div>
                        {hasBadge ? (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-6 border-t border-emerald-800/60 space-y-3">
                <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-800">
                  <p className="text-xs font-bold text-white truncate">{userProfile?.nama_lengkap}</p>
                  <p className="text-[10px] text-amber-300 font-bold uppercase mt-0.5">{userProfile?.master_role?.nama_role || 'Staff'}</p>
                </div>
                <div className="flex justify-center">
                  <IconButton 
                    onClick={() => supabase.auth.signOut()} 
                    icon={<LogOut className="w-4 h-4"/>}
                    label="Keluar Akun"
                    variant="rose"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        {/* ========================================== */}
        {/* AREA KONTEN UTAMA (Lapang, Bersih & Modern) */}
        {/* Note: pb-24 pada layar HP mencegah tertutup bottom nav */}
        {/* ========================================== */}
        <main className="flex-1 overflow-y-auto pt-16 pb-24 md:pb-6 md:pt-0 p-3 sm:p-5 lg:p-6 bg-[#F8FAF9]">
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>

        {/* ========================================== */}
        {/* BOTTOM NAVIGATION BAR MOBILE (Mewah & Praktis) */}
        {/* Memudahkan Navigasi Satu Ibu Jari di Layar HP */}
        {/* ========================================== */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-t border-gray-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.07)] z-40 flex items-center justify-around px-2">
          {menuItems.map(item => {
            const isActive = location.pathname === item.path;
            const hasBadge = (item.badge || 0) > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all relative ${
                  isActive 
                    ? 'text-emerald-950 font-black' 
                    : 'text-gray-400 hover:text-gray-700 font-semibold'
                }`}
              >
                <div className="relative">
                  <div className={`p-1.5 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-amber-400 text-emerald-950 shadow-md shadow-amber-400/30 -translate-y-0.5' 
                      : 'text-gray-500'
                  }`}>
                    {item.icon}
                  </div>
                  {hasBadge ? (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white animate-pulse">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[68px] ${
                  isActive ? 'font-bold text-emerald-950' : 'font-medium'
                }`}>
                  {item.shortLabel || item.label}
                </span>
              </Link>
            );
          })}
        </nav>

      </div>
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
          {hasPerm('akses_induk') && <Route path="/" element={<SantriPage canEdit={hasPerm('edit_induk')} />} />}
          {hasPerm('validasi_pengajuan') && <Route path="/review" element={<AdminReview />} />}
          {hasPerm('akses_takziran') && <Route path="/takziran" element={<TakziranDashboard canInput={hasPerm('input_takziran')} currentUser={userProfile} />} />}
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
        <Route path="/s/:kode" element={<PortalSantri />} />
        <Route path="/*" element={renderProtectedRoutes()} />
      </Routes>
    </BrowserRouter>
  );
}