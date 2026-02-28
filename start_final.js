const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhhscnxzhtgkyzfpklvw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoaHNjbnh6aHRna3l6ZnBrbHZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTkzNDkwNSwiZXhwIjoyMDg1NTEwOTA1fQ.-r_8-ycmYYRw7USWx8WmRPC3ii7jS2s1RAreQjVn4D8';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function forceStartFinal() {
    const gameId = 'final';
    const now = new Date().toISOString();
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    console.log("Fetching event control...");
    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers')
        .eq('id', 1)
        .single();

    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...currentEvent.table_timers }
        : {};

    currentTimers[gameId] = now;
    currentTimers[`${gameId}_status`] = 'ACTIVE';
    currentTimers[`${gameId}_pin`] = pin;

    console.log("Updating event_control...");
    await supabaseAdmin
        .from('event_control')
        .update({ table_timers: currentTimers })
        .eq('id', 1);

    console.log("Upserting game_state...");
    await supabaseAdmin
        .from('game_state')
        .upsert({ game_id: gameId, entry_pin: pin, is_active: true });

    // Since we only have 1 final question, make sure it's strictly active
    console.log("Activating the Final question...");
    await supabaseAdmin
        .from('question_bank')
        .update({ is_active: true, is_used: true })
        .ilike('game_type', 'FINAL');

    console.log("Final round LIVE!");
}

forceStartFinal();
