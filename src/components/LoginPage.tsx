import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      alert('Gagal Login: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dekorasi Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white max-w-md w-full rounded-[2rem] shadow-2xl border border-emerald-50 p-8 sm:p-10 relative z-10 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-[#064e3b] to-emerald-800 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-900/20 border-4 border-amber-100">
          <ShieldCheck className="w-12 h-12 text-amber-400" />
        </div>
        
        <h1 className="text-3xl font-black text-emerald-950 tracking-tight">SIM Santri</h1>
        <p className="text-emerald-700 font-medium text-sm mt-2 mb-8 uppercase tracking-widest">Daruttauhid Al-'Alawiyyah</p>
        
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Silakan masuk menggunakan akun Google Anda untuk mengakses sistem manajemen pesantren.
        </p>

        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="w-full bg-white border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-950 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          {loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
        </button>

        <div className="mt-8 text-xs font-semibold text-gray-400">
          Hanya untuk pengurus dan staf yang memiliki otorisasi.
        </div>
      </div>
    </div>
  );
}