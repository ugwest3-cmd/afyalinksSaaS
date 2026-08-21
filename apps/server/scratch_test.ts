import dotenv from 'dotenv';
dotenv.config();

import { supabaseAdmin } from './src/config/supabase.js';

async function test() {
  const { data: all } = await supabaseAdmin.from('pharmacies').select('*').limit(1);
  if (!all || all.length === 0) return console.log('No pharmacies');
  
  const id = all[0].id;
  console.log('Testing ID:', id);
  
  const { data, error } = await supabaseAdmin
    .from('pharmacies')
    .select(`
      *,
      whatsapp_accounts ( id, status, phone_number ),
      payment_accounts ( id, status ),
      orders:orders(count)
    `)
    .eq('id', id)
    .single();
    
  console.log('Error:', error);
  console.log('Data:', data);
}

test();
