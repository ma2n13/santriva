import { createClient } from '@supabase/supabase-js';

// Ambil URL dan Key dari environment variables (.env) dengan fallback aman
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

if (!supabaseUrl || !supabaseKey) {
  console.error('Peringatan: Konfigurasi Supabase URL atau Anon Key belum diset di file .env');
}

// Inisialisasi Supabase Client
export const supabase = createClient(supabaseUrl, supabaseKey);