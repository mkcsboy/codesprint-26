const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fhhscnxzhtgkyzfpklvw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoaHNjbnh6aHRna3l6ZnBrbHZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTkzNDkwNSwiZXhwIjoyMDg1NTEwOTA1fQ.-r_8-ycmYYRw7USWx8WmRPC3ii7jS2s1RAreQjVn4D8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadQuestions() {
    console.log("Loading questions_final.json (80 questions)...");
    const rawData = fs.readFileSync('questions_final.json', 'utf8');
    const questions = JSON.parse(rawData);

    console.log("Loading question_round2_final.json (1 question)...");
    const rawFinal = fs.readFileSync('question_round2_final.json', 'utf8');
    const finalQuestion = JSON.parse(rawFinal);

    questions.push(finalQuestion[0]);

    console.log(`Found ${questions.length} total questions.`);

    console.log("Emptying the question_bank table...");
    // We can't TRUNCATE via PostgREST easily, instead we DELETE where id is not null
    const { error: deleteError } = await supabase.from('question_bank').delete().not('id', 'is', null);

    if (deleteError) {
        console.error("Error wiping old questions:", deleteError);
        return;
    }
    console.log("Old questions wiped successfully.");

    console.log("Inserting new questions...");
    const { error: insertError } = await supabase.from('question_bank').insert(questions);

    if (insertError) {
        console.error("Error inserting questions:", insertError);
        return;
    }
    console.log("Successfully uploaded 80 questions to Supabase!");
}

uploadQuestions();
