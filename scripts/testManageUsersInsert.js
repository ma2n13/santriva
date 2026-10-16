import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testManageUsersInsert() {
  const { data, error } = await supabase.from('manage_users').insert([{
    email: 'dummy@test.com',
    nickname: 'Dummy',
    role: 'petugas_absen'
  }]).select();

  console.log('Result:', { data, error });

  if (!error && data?.[0]?.id) {
    await supabase.from('manage_users').delete().eq('id', data[0].id);
    console.log('Cleaned up dummy');
  }
}

testManageUsersInsert();
