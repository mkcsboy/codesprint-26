import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
    console.log("Adding round_2_open to event_control...");
    let { error: err1 } = await supabase.rpc('run_sql', {
        sql_query: "ALTER TABLE event_control ADD COLUMN IF NOT EXISTS round_2_open BOOLEAN DEFAULT false;"
    }).catch(() => ({ error: { message: "RPC failed, might not exist" } }));
    if (err1) console.log(err1);

    console.log("Adding in_round_2 and round_2_bet to teams...");
    let { error: err2 } = await supabase.rpc('run_sql', {
        sql_query: "ALTER TABLE teams ADD COLUMN IF NOT EXISTS in_round_2 BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS round_2_bet INT DEFAULT 0;"
    }).catch(() => ({ error: { message: "RPC failed" } }));
    if (err2) console.log(err2);

    console.log("Done.");
}

addColumns();
