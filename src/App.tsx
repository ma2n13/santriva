import SantriPage from './components/SantriPage';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-2 sm:px-4">
      {/* Header Aplikasi */}
      <header className="max-w-[100rem] mx-auto text-center sm:text-left mb-6">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          SantriVa <span className="text-emerald-600">ERP</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Sistem Informasi Manajemen Pesantren & Madrasah Terpadu
        </p>
      </header>

      {/* Main Content (Super Page) */}
      <main>
        <SantriPage />
      </main>
    </div>
  );
}