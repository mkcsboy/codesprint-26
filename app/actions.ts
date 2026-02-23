'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'

// Define the shape manually to bypass the inference error
type TeamRow = {
  id: string;
  access_code: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loginAction(prevState: any, formData: FormData) {
  const code = formData.get('access_code') as string

  if (!code) return { error: "Please enter a code." }

  // 1. Fetch data
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('access_code', code)
    .maybeSingle()

  if (error) {
    console.error("Database Error:", error)
    return { error: "System Error." }
  }

  // 2. Cast data to our manual type (The Fix)
  const team = data as TeamRow | null

  if (!team) {
    return { error: "INVALID CODE" }
  }

  // 3. Set Session
  cookies().set('team_id', team.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24
  })

  // 4. Redirect
  redirect('/avatar')
}

export async function getTeamId() {
  return cookies().get('team_id')?.value
}

// --- EXISTING CODE ABOVE (Login, etc.) ---

// --- NEW: DYNAMIC QUESTION FETCHING ---
export async function fetchQuestionData(gameId: string, difficultyStr: string = 'STANDARD') {
  console.log(`DEBUG: fetchQuestionData called with gameId='${gameId}', difficultyStr='${difficultyStr}'`);
  try {
    const { data, error } = await supabaseAdmin
      .from('question_bank')
      .select('*')
      .ilike('game_type', gameId)
      .ilike('difficulty', difficultyStr)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    console.log(`DEBUG: fetchQuestionData result: data=`, data, `error=`, error);

    if (error) {
      console.error("Supabase Error fetching question:", error);
      return { error: "Failed to load question from database." };
    }

    if (!data) {
      return { error: "No active question found for this game type." };
    }

    // Cast data to avoid 'never' type inference issues on the client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionData = data as any;

    // We no longer build the asserts here because the user might rename the function in the editor.
    // Instead, we pass the raw test_cases down to the client to compile at runtime.
    let legacyHiddenTests = "";
    if (!questionData.test_cases && questionData.hidden_tests) {
      legacyHiddenTests = questionData.hidden_tests;
    }

    return {
      success: true,
      question: {
        id: questionData.id,
        content: questionData.problem_statement || questionData.content, // Support both schemas
        starter_code: questionData.starter_code,
        constraints: questionData.constraints, // This could be a string of banned words/symbols separated by commas
        expected_output: questionData.test_cases && questionData.test_cases.length > 0 ? questionData.test_cases[0].expected : null
      }
    };
  } catch {
    return { error: "System error fetching question." };
  }
}

// --- NEW: PLACE BET ---
export async function placeBet(teamId: string, amount: number, gameId: string) {
  try {
    // 1. Get current balance
    const { data: teamData, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('wallet_balance')
      .eq('id', teamId)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(res => ({ data: res.data as any, error: res.error })); // Keep error separate

    if (fetchError || !teamData) {
      return { error: "Failed to read wallet." }
    }

    if (teamData.wallet_balance < amount) {
      return { error: "Insufficient funds. You need $" + amount }
    }

    // 2. Deduct amount and lock them to the table waiting room
    const newBalance = teamData.wallet_balance - amount
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      // @ts-expect-error: Next.js/Supabase inference bug
      .update({ wallet_balance: newBalance, current_locked_table: gameId })
      .eq('id', teamId)

    if (updateError) {
      return { error: "Failed to deduct bet." }
    }

    // 3. Log transaction
    await supabaseAdmin.from('transactions').insert({
      team_id: teamId,
      amount: -amount,
      description: `Game Entry Fee`,
    } as any)

    return { success: true, newBalance }
  } catch {
    return { error: "System error placing bet." }
  }
}

// --- NEW: UNLOCK PLAYER ---
export async function unlockPlayer(teamId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('teams')
      // @ts-expect-error: Next.js/Supabase inference bug
      .update({ current_locked_table: null })
      .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
  } catch {
    return { error: "System error unlocking player." }
  }
}

// --- NEW: FETCH TEAM HISTORY (Bypass RLS for Sidebar) ---
export async function fetchTeamHistory(teamId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return { error: error.message };
    return { history: data };
  } catch {
    return { error: "System error fetching history." };
  }
}