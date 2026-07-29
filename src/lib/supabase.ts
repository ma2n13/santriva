import { createClient } from '@supabase/supabase-js';

// Kredensial Supabase Anda (Berdasarkan data yang Anda berikan)
const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

// Membuat "jembatan" penghubung antara React dan Database
export const supabase = createClient(supabaseUrl, supabaseKey);