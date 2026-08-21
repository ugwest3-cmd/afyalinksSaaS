import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './apps/server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching all pharmacies...');
  const { data: allPharmacies, error: allErr } = await supabase.from('pharmacies').select('*').limit(1);
  
  if (allErr) {
    console.log('Error fetching all:', allErr);
    return;
  }
  
  if (!allPharmacies || allPharmacies.length === 0) {
    console.log('No pharmacies found in db');
    return;
  }
  
  const id = allPharmacies[0].id;
  console.log(`Found pharmacy with id: ${id}. Testing detailed fetch...`);
  
  const { data, error } = await supabase
    .from('pharmacies')
    .select(`
      *,
      whatsapp_accounts ( id, status, phone_number ),
      payment_accounts ( id, status ),
      orders:orders(count)
    `)
    .eq('id', id)
    .single();
    
  if (error) {
    console.log('Error fetching single:', error);
  } else {
    console.log('Success:', data);
  }
}

test();
