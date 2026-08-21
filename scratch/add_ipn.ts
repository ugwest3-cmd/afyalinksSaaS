import dotenv from 'dotenv';
dotenv.config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE payment_accounts ADD COLUMN IF NOT EXISTS ipn_id TEXT;' });
  console.log('Result:', error || 'Success');
}

run();
