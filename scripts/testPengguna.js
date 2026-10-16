import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const testId = '00000000-0000-0000-0000-000000000001';
  const { data, error } = await supabase.from('pengguna').insert([{
    id: testId,
    email: 'test@example.com',
    nama_lengkap: 'Test User',
    status_akun: 'Menunggu'
  }]).select();

  console.log('Insert result:', { data, error });

  if (!error) {
    await supabase.from('pengguna').delete().eq('id', testId);
    console.log('Cleaned up test user');
  }
}

testInsert();
