import { createClient } from '@supabase/supabase-js';

const SRC_SUPABASE_URL = 'https://mqhszwgdnezdaonwhopb.supabase.co';
const SRC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHN6d2dkbmV6ZGFvbndob3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTEzODMsImV4cCI6MjA4NDM2NzM4M30.PezVTA-hIaK88uCDdeWwp49C7Cg44crz3UpGToxtNeU';

const srcSupabase = createClient(SRC_SUPABASE_URL, SRC_SUPABASE_ANON_KEY);

async function inspect() {
  console.log('--- MANAGE USERS ---');
  const { data: users, error: errUsers } = await srcSupabase.from('manage_users').select('*');
  if (errUsers) console.error('Error manage_users:', errUsers);
  else console.log(JSON.stringify(users, null, 2));

  console.log('--- USERS PENDING ---');
  const { data: pending, error: errPending } = await srcSupabase.from('users_pending').select('*');
  if (errPending) console.error('Error users_pending:', errPending);
  else console.log(JSON.stringify(pending, null, 2));
}

inspect();
