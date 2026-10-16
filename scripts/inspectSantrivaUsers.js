import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSantrivaAuth() {
  console.log('--- SANTRIVA MASTER_ROLE ---');
  const { data: roles, error: errRoles } = await supabase.from('master_role').select('*');
  if (errRoles) console.error(errRoles);
  else console.log(JSON.stringify(roles, null, 2));

  console.log('--- SANTRIVA PENGGUNA ---');
  const { data: users, error: errUsers } = await supabase.from('pengguna').select('*');
  if (errUsers) console.error(errUsers);
  else console.log(JSON.stringify(users, null, 2));
}

checkSantrivaAuth();
