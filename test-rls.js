const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhhscnxzhtgkyzfpklvw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoaHNjbnh6aHRna3l6ZnBrbHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MzQ5MDUsImV4cCI6MjA4NTUxMDkwNX0.R6jhXtjD_NqXxgineRDr4Odz3yz4dNa_0VXKobmkWSE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
    console.log("TESTING GAME_STATE WITH ANON KEY...");
    const { data, error } = await supabase.from('game_state').select('*');
    if (error) {
        console.error("ERROR:", error.message);
    } else {
        console.log("DATA RECEIVED:", data);
        if (data.length === 0) {
            console.log("WARNING: Zero rows returned. (Is there no data, or is RLS blocking?)");
        }
    }
}

testRLS();
