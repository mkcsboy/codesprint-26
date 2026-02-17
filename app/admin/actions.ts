'use server'
import { cookies } from 'next/headers'
import { supabaseAdminRaw as supabaseAdmin } from '@/lib/supabase/server'
import { Json } from '@/lib/supabase/types'

// --- AUTH CHECK ---
function isAdminAuthenticated(): boolean {
    const cookieStore = cookies()
    return cookieStore.get('admin_session')?.value === 'authenticated'
}

// =============================================
// TAB A: "THE PIT" - Live Ops
// =============================================

export async function togglePause(isPaused: boolean) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('event_control')
        .update({ is_paused: isPaused })
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true, isPaused }
}

export async function setCurrentRound(roundName: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('event_control')
        .update({ current_round: roundName })
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true }
}

export async function setTableStatus(roundNumber: number, status: 'LOCKED' | 'ACTIVE' | 'COMPLETED') {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('game_rounds')
        .update({ status })
        .eq('round_number', roundNumber)

    if (error) return { error: error.message }
    return { success: true }
}

export async function getEventState() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: control } = await supabaseAdmin
        .from('event_control')
        .select('*')
        .eq('id', 1)
        .single()

    const { data: rounds } = await supabaseAdmin
        .from('game_rounds')
        .select('*')
        .order('round_number')

    const { data: recentTx } = await supabaseAdmin
        .from('transactions')
        .select('*, teams(access_code)')
        .order('created_at', { ascending: false })
        .limit(20)

    return { control, rounds, recentTx }
}

// =============================================
// TAB B: "THE VAULT" - Team Management
// =============================================

export async function getAllTeams() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data, error } = await supabaseAdmin
        .from('teams')
        .select('*')
        .order('wallet_balance', { ascending: false })

    if (error) return { error: error.message }
    return { teams: data }
}

export async function adjustWallet(teamId: string, amount: number, reason: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // Get current balance
    const { data: team } = await supabaseAdmin
        .from('teams')
        .select('wallet_balance')
        .eq('id', teamId)
        .single()

    if (!team) return { error: 'TEAM NOT FOUND' }

    const newBalance = team.wallet_balance + amount

    // Update wallet
    const { error: updateErr } = await supabaseAdmin
        .from('teams')
        .update({ wallet_balance: newBalance })
        .eq('id', teamId)

    if (updateErr) return { error: updateErr.message }

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
        team_id: teamId,
        amount,
        description: `[ADMIN] ${reason}`,
    })

    return { success: true, newBalance }
}

export async function sendWarning(teamId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // We broadcast the warning via Supabase Realtime
    // The client will listen for this on the 'admin_alerts' channel
    const { error } = await supabaseAdmin
        .from('teams')
        .update({ current_locked_table: 'WARNING' })
        .eq('id', teamId)

    if (error) return { error: error.message }

    // Reset warning after storing it (the client reads it via realtime)
    setTimeout(async () => {
        await supabaseAdmin
            .from('teams')
            .update({ current_locked_table: null })
            .eq('id', teamId)
    }, 100)

    return { success: true }
}

export async function banTeam(teamId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('teams')
        .update({
            current_locked_table: 'BANNED',
            wallet_balance: 0
        })
        .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function unbanTeam(teamId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('teams')
        .update({ current_locked_table: null })
        .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function updateStamps(teamId: string, stamps: Json) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('teams')
        .update({ stamps })
        .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function createTeam(accessCode: string, initialBalance = 100) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // Check if code exists
    const { data: existing } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('access_code', accessCode)
        .maybeSingle()

    if (existing) return { error: 'CODE ALREADY EXISTS' }

    const { data, error } = await supabaseAdmin
        .from('teams')
        .insert({
            access_code: accessCode,
            wallet_balance: initialBalance,
            stamps: {},
            avatar_id: Math.floor(Math.random() * 25) + 1 // Assign random avatar initially
        })
        .select()
        .single()

    if (error) return { error: error.message }
    return { success: true, team: data }
}

// =============================================
// TAB C: "THE DECK" - Question Management
// =============================================

export async function getAllQuestions() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data, error } = await supabaseAdmin
        .from('question_bank')
        .select('*')
        .order('game_type')

    if (error) return { error: error.message }
    return { questions: data }
}

export async function toggleQuestion(questionId: string, isActive: boolean) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_active: isActive })
        .eq('id', questionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function burnQuestion(questionId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_used: true })
        .eq('id', questionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function reshuffleAllQuestions() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_used: false })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows

    if (error) return { error: error.message }
    return { success: true }
}

export async function bulkUploadQuestions(questionsJson: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    try {
        const questions = JSON.parse(questionsJson)
        if (!Array.isArray(questions)) return { error: 'JSON must be an array' }

        const { error } = await supabaseAdmin
            .from('question_bank')
            .insert(questions)

        if (error) return { error: error.message }
        return { success: true, count: questions.length }
    } catch {
        return { error: 'INVALID JSON FORMAT' }
    }
}

// =============================================
// TAB D: "THE EYE" - Analytics
// =============================================

export async function getLeaderboard() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data, error } = await supabaseAdmin
        .from('teams')
        .select('id, access_code, wallet_balance, stamps, avatar_id')
        .order('wallet_balance', { ascending: false })
        .limit(50)

    if (error) return { error: error.message }
    return { leaderboard: data }
}

export async function getAnalytics() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('wallet_balance')

    const totalEconomy = teams?.reduce((sum: number, t: any) => sum + t.wallet_balance, 0) || 0
    const avgBalance = teams?.length ? totalEconomy / teams.length : 0
    const maxBalance = teams?.reduce((max: number, t: any) => Math.max(max, t.wallet_balance), 0) || 0
    const minBalance = teams?.reduce((min: number, t: any) => Math.min(min, t.wallet_balance), Infinity) || 0

    return {
        totalEconomy,
        avgBalance: Math.round(avgBalance),
        maxBalance,
        minBalance: minBalance === Infinity ? 0 : minBalance,
        teamCount: teams?.length || 0,
    }
}

// =============================================
// SUGGESTIONS: Broadcast & Difficulty
// =============================================

export async function broadcastMessage(message: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // We use the event_control table to store the broadcast message
    // The client-side will subscribe to changes on this table
    const { error } = await supabaseAdmin
        .from('event_control')
        .update({ current_round: `BROADCAST:${message}` })
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true }
}

export async function forceWin(teamId: string, gameType: string, amount: number) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // Add credits
    const { data: team } = await supabaseAdmin
        .from('teams')
        .select('wallet_balance, stamps')
        .eq('id', teamId)
        .single()

    if (!team) return { error: 'TEAM NOT FOUND' }

    const newBalance = team.wallet_balance + amount
    const stamps = (team.stamps as Record<string, boolean>) || {}
    stamps[gameType] = true

    const { error } = await supabaseAdmin
        .from('teams')
        .update({
            wallet_balance: newBalance,
            stamps: stamps as unknown as Json,
        })
        .eq('id', teamId)

    if (error) return { error: error.message }

    // Log it
    await supabaseAdmin.from('transactions').insert({
        team_id: teamId,
        amount,
        description: `[ADMIN FORCE WIN] ${gameType}`,
    })

    return { success: true, newBalance }
}
