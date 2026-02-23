import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDb() {
    const { data, error } = await supabaseAdmin.from('event_control').select('*');
    console.log("Error:", error);
    console.log("Data:", JSON.stringify(data, null, 2));
}

checkDb();
