import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
  const candidates = [
    'id', 'email', 'nama_lengkap', 'role_id', 'status_akun', 'usulan_role', 
    'created_at', 'nickname', 'assigned_types', 'assigned_tags', 
    'assignedTypes', 'assignedTags'
  ];

  for (const c of candidates) {
    const { error } = await supabase.from('pengguna').select(c).limit(1);
    console.log(`Column ${c}: ${error ? 'NOT FOUND (' + error.message + ')' : 'EXISTS'}`);
  }
}

testColumns();
