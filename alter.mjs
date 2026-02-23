import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function alterDb() {
    const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql_string: `
      ALTER TABLE event_control ADD COLUMN IF NOT EXISTS table_timers JSONB DEFAULT '{}'::jsonb;
    `
    });

    if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
            console.log("No RPC found, trying a raw insert loop update as fallback, or you might need to run this manually in the Supabase Dashboard SQL editor: ALTER TABLE event_control ADD COLUMN IF NOT EXISTS table_timers JSONB DEFAULT '{}'::jsonb;");
        } else {
            console.error('Error altering table:', error);
        }
    } else {
        console.log('Successfully altered event_control table!');
    }
}

alterDb();
