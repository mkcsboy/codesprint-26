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
  const team = data as (TeamRow & { is_logged_in?: boolean }) | null

  if (!team) {
    return { error: "INVALID CODE" }
  }

  if (team.is_logged_in) {
    return { error: "TEAM IS ALREADY LOGGED IN ON ANOTHER DEVICE." }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { is_logged_in: true };
  await supabaseAdmin
    .from('teams')
    .update(payload)
    .eq('id', team.id)

  // 3. Set Session
  cookies().set('team_id', team.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24
  })

  // 4. Redirect
  redirect('/avatar')
}

export async function logoutAction(teamId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = { is_logged_in: false };
  await supabaseAdmin
    .from('teams')
    .update(payload)
    .eq('id', teamId)

  cookies().delete('team_id')
  redirect('/')
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


    // Fallback logic for single obj vs array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qData = data as any;
    const questionData = qData && Array.isArray(qData) && qData.length > 0 ? qData[0] : (qData || null);

    console.log(`DEBUG: fetchQuestionData result: data=`, questionData, `error=`, error);

    if (error || !questionData) {
      console.error("Supabase Error fetching question:", error);
      return { error: "No active questions found for this table/difficulty." };
    }

    return {
      success: true,
      question: {
        id: questionData.id,
        content: questionData.problem_statement || questionData.content, // Support both schemas
        starter_code: questionData.starter_code,
        constraints: questionData.constraints, // This could be a string of banned words/symbols separated by commas
        expected_output: questionData.test_cases && questionData.test_cases.length > 0 ? questionData.test_cases[0].expected : null,
        test_cases: questionData.test_cases || [] // Raw payload for the UI
      }
    };
  } catch {
    return { error: "System error fetching question." };
  }
}

// --- NEW: PLACE BET ---
export async function placeBet(teamId: string, amount: number, gameId: string) {
  try {
    // 0. Verify Table Status & Expiration
    const [eventRes, gameStateRes] = await Promise.all([
      supabaseAdmin.from('event_control').select('table_timers, is_paused').eq('id', 1).single(),
      supabaseAdmin.from('game_state').select('is_active').eq('game_id', gameId).single()
    ])

    const eventData = eventRes.data as any
    const gameStateData = gameStateRes.data as any

    const isGlobalPaused = eventData?.is_paused
    if (isGlobalPaused) return { error: "The entire casino is currently PAUSED." }

    const timers = (eventData?.table_timers || {}) as Record<string, string>
    const status = timers[`${gameId}_status`]
    const startTimeStr = timers[gameId]
    const isStateActive = gameStateData?.is_active

    if (status === 'KILLED' || isStateActive === false) {
      return { error: "This table is currently CLOSED by the Pit Boss." }
    }

    if (startTimeStr) {
      const startMs = new Date(startTimeStr).getTime()
      if (Date.now() > startMs + (16 * 60000)) {
        return { error: "The round for this table has already ended! You cannot join." }
      }
    }

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

// --- NEW: ROUND 2 PORTAL & BETTING LOGIC ---
export async function updateRound2Status(teamId: string, inRound2: boolean = true) {
  const payload: any = { in_round_2: inRound2 }
  // @ts-ignore
  await supabaseAdmin.from('teams').update(payload).eq('id', teamId)
}

export async function submitFinalBet(teamId: string, amount: number) {
  // 1. Deduct from wallet_balance
  // 2. Add round_2_bet
  // @ts-ignore
  const { data: team } = await supabaseAdmin.from('teams').select('wallet_balance').eq('id', teamId).single()
  if (!team) return { error: 'Team not found' }
  const newBalance = (team.wallet_balance || 0) - amount
  if (newBalance < 0) return { error: 'Insufficient funds' }

  const payload: any = { wallet_balance: newBalance, round_2_bet: amount }
  // @ts-ignore
  await supabaseAdmin.from('teams').update(payload).eq('id', teamId)

  // Log transaction
  const txPayload: any = {
    team_id: teamId,
    amount: -Math.abs(amount),
    description: `Placed Final Round Wager: ALL IN`
  }
  // @ts-ignore
  await supabaseAdmin.from('transactions').insert(txPayload)
}