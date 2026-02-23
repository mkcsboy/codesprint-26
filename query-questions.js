const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhhscnxzhtgkyzfpklvw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoaHNjbnh6aHRna3l6ZnBrbHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MzQ5MDUsImV4cCI6MjA4NTUxMDkwNX0.R6jhXtjD_NqXxgineRDr4Odz3yz4dNa_0VXKobmkWSE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectQuestions() {
    console.log("INSPECTING QUESTION BANK DATA TYPES...");

    // First, check what questions are physically marked Active right now regardless of game
    const { data: activeQ, error: err1 } = await supabase.from('question_bank').select('id, title, game_type, difficulty, is_active, is_used').eq('is_active', true);
    console.log("--- CURRENT ACTIVE QUESTIONS ---");
    console.log(activeQ);

    // Second, dump a random set of questions to see their explicit formatting strings
    const { data: sampleQ, error: err2 } = await supabase.from('question_bank').select('id, title, game_type, difficulty').limit(5);
    console.log("\n--- RAW SEED SAMPLES ---");
    console.log(sampleQ);
}

inspectQuestions();
