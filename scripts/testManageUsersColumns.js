import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testManageUsersColumns() {
  const candidates = [
    'id', 'email', 'nickname', 'role', 'assignedTypes', 'assignedTags', 
    'createdAt', 'last_seen', 'last_action'
  ];

  for (const c of candidates) {
    const { error } = await supabase.from('manage_users').select(c).limit(1);
    console.log(`Column ${c}: ${error ? 'NOT FOUND (' + error.message + ')' : 'EXISTS'}`);
  }
}

testManageUsersColumns();
