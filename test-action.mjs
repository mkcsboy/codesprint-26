import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testStart() {
    const gameId = 'slots';
    const now = new Date().toISOString()

    // 1. Fetch current
    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('*')
        .eq('id', 1)
        .single();

    console.log("Original state:", currentEvent);

    const currentTimers = (currentEvent && currentEvent.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...currentEvent.table_timers }
        : {}

    currentTimers[gameId] = now;

    console.log("Attempting to update passing:", currentTimers);

    const { data, error } = await supabaseAdmin
        .from('event_control')
        .update({ table_timers: currentTimers, round_duration_mins: 15 })
        .eq('id', 1)
        .select();

    console.log("Update Error:", error);
    console.log("Update Data:", data);
}

testStart();
