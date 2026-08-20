import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabaseAdmin.from('system_settings').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Data:', data);
    }
}
test();
