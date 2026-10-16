import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpcs() {
  const rpcsToTry = [
    'approve_santri_submission',
    'exec_sql',
    'execute_sql',
    'run_sql',
    'sync_legacy_users'
  ];

  for (const rpc of rpcsToTry) {
    const { data, error } = await supabase.rpc(rpc, {});
    console.log(`RPC ${rpc}:`, error ? error.message : data);
  }
}

checkRpcs();
