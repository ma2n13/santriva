import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const redirectUrl = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl }
    });
    if (error) {
      alert('Gagal Login: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#031d16] via-[#053326] to-[#021812] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Dekorasi Background Cahaya & Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[30rem] h-[30rem] bg-amber-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] bg-emerald-500/25 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
      </div>

      <div className="bg-white/95 backdrop-blur-xl max-w-md w-full rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-emerald-500/20 p-8 sm:p-10 relative z-10 flex flex-col items-center text-center">
        
        {/* Logo Institusi dengan Gold Glow Ring */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-500 p-1 shadow-xl shadow-amber-500/25 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <img 
              src="/logo.jpg" 
              alt="Logo Daruttauhid" 
              className="w-full h-full rounded-[20px] object-cover bg-white"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }} 
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-800 text-amber-300 p-2 rounded-full border-2 border-white shadow-md">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        
        {/* Model Tulisan Elegan, Cantik & Hemat Tempat */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300/60 shadow-xs mb-2">
            Manajemen Pondok &amp; Madrasah
          </span>
          <h1 className="text-2xl sm:text-[1.7rem] font-black text-gray-900 tracking-tight leading-snug font-display">
            Daruttauhid Al-'Alawiyyah
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            <span className="text-xs font-bold text-amber-800 tracking-widest uppercase">
              Jepara, Jawa Tengah
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          </div>
        </div>
        
        <p className="text-gray-500 text-xs sm:text-sm mt-5 mb-8 leading-relaxed max-w-xs">
          Portal sistem administrasi terpadu untuk pengurus dan staf pondok pesantren serta madrasah.
        </p>

        <div className="flex justify-center">
          <button 
            onClick={handleGoogleLogin} 
            disabled={loading}
            title="Masuk dengan Akun Google"
            className="group inline-flex items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 text-white font-bold transition-all duration-300 shadow-lg shadow-emerald-900/30 hover:shadow-xl hover:shadow-emerald-900/40 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1 shadow-sm shrink-0">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-full h-full" />
            </div>
            <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap transition-all duration-300 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-3 group-focus:max-w-xs group-focus:opacity-100 group-focus:ml-3 group-active:max-w-xs group-active:opacity-100 group-active:ml-3 text-sm font-semibold tracking-wide">
              {loading ? 'Menghubungkan ke Akun...' : 'Masuk dengan Akun Google'}
            </span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 w-full flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Otorisasi & Keamanan Terenkripsi
        </div>
      </div>
    </div>
  );
}