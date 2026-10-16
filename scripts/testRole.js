import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRole() {
  const { data, error } = await supabase.from('master_role').insert([{
    nama_role: 'Test Role',
    permissions: ['akses_induk']
  }]).select();

  console.log('Role insert result:', { data, error });

  if (!error && data?.[0]?.id) {
    await supabase.from('master_role').delete().eq('id', data[0].id);
    console.log('Deleted test role');
  }
}

testRole();
