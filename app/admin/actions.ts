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

export async function setTableStatusState(gameId: string, status: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers')
        .eq('id', 1)
        .single()

    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...(currentEvent.table_timers as Record<string, string>) }
        : {}

    const previousStatus = currentTimers[`${gameId}_status`]

    // Record when the specific table was paused
    if (status === 'PAUSED' && previousStatus !== 'PAUSED') {
        currentTimers[`${gameId}_paused_at`] = new Date().toISOString()
    }
    // If we're resuming, calculate how long we were paused and shift the start time
    else if (status === 'ACTIVE' && previousStatus === 'PAUSED') {
        const pausedAtStr = currentTimers[`${gameId}_paused_at`]
        if (pausedAtStr) {
            const pausedAt = new Date(pausedAtStr).getTime()
            const now = Date.now()
            const diff = now - pausedAt

            const currentStartStr = currentTimers[gameId]
            if (currentStartStr) {
                const currentStart = new Date(currentStartStr).getTime()
                currentTimers[gameId] = new Date(currentStart + diff).toISOString()
            }
            delete currentTimers[`${gameId}_paused_at`]
        }
    }

    currentTimers[`${gameId}_status`] = status

    const { error: eventErr } = await supabaseAdmin
        .from('event_control')
        .update({ table_timers: currentTimers } as any)
        .eq('id', 1)

    if (eventErr) return { error: eventErr.message }

    // If the Pit Boss explicitly KILLS the table, forcefully eject everyone and close it
    if (status === 'KILLED') {
        // 1. Mark table offline so no one else can join
        await supabaseAdmin
            .from('game_state')
            .update({ is_active: false } as any)
            .eq('game_id', gameId)

        // 2. Clear locked table state for all trapped players to eject them instantly
        await supabaseAdmin
            .from('teams')
            .update({ current_locked_table: null } as any)
            .eq('current_locked_table', gameId)
    }

    return { success: true }
}

export async function togglePause(isPaused: boolean) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers, is_paused')
        .eq('id', 1)
        .single()

    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...(currentEvent.table_timers as Record<string, string>) }
        : {}

    if (isPaused && !currentEvent?.is_paused) {
        currentTimers['global_paused_at'] = new Date().toISOString()
    } else if (!isPaused && currentEvent?.is_paused) {
        const pausedAtStr = currentTimers['global_paused_at']
        if (pausedAtStr) {
            const pausedAt = new Date(pausedAtStr).getTime()
            const now = Date.now()
            const diff = now - pausedAt

            // Shift all game start times forward
            for (const key of Object.keys(currentTimers)) {
                // If the key is a gameId (doesn't contain an underscore)
                if (!key.includes('_')) {
                    const currentStartStr = currentTimers[key]
                    if (currentStartStr) {
                        const currentStart = new Date(currentStartStr).getTime()
                        currentTimers[key] = new Date(currentStart + diff).toISOString()
                    }
                }
            }
            delete currentTimers['global_paused_at']
        }
    }

    const { error } = await supabaseAdmin
        .from('event_control')
        .update({ is_paused: isPaused, table_timers: currentTimers } as any)
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true, isPaused }
}

export async function setCurrentRound(roundName: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('event_control')
        .update({ current_round: roundName } as any)
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true }
}

export async function startTableRound(gameId: string, durationMins: number = 16) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const now = new Date().toISOString()
    const pin = Math.floor(1000 + Math.random() * 9000).toString()

    // 1. Fetch current table timers to preserve other active games
    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers')
        .eq('id', 1)
        .single()

    // Fallback if missing or not an object
    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...(currentEvent.table_timers as Record<string, string>) }
        : {}

    // Inject the new timer for this specific table (storing start time string, status, and pin)
    currentTimers[gameId] = now
    currentTimers[`${gameId}_status`] = 'ACTIVE'
    currentTimers[`${gameId}_pin`] = pin

    // Update the event_control table with the merged timers
    const { error: eventErr } = await supabaseAdmin
        .from('event_control')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ table_timers: currentTimers } as any)
        .eq('id', 1)

    if (eventErr) return { error: eventErr.message }

    // Update the game_state table with the actual PIN text Native SQL storage
    await supabaseAdmin
        .from('game_state')
        .upsert({ game_id: gameId, entry_pin: pin, is_active: true } as any)

    // 2. Shut down previously active questions for THIS game table
    await supabaseAdmin
        .from('question_bank')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ is_active: false } as any)
        .eq('is_active', true)
        .ilike('game_type', gameId)

    // 3. Select exactly 1 STANDARD and 1 HIGH unused question for THIS game table
    const difficulties = ['STANDARD', 'HIGH']
    const selectedIds: string[] = []

    for (const diff of difficulties) {
        const { data: qList } = await supabaseAdmin
            .from('question_bank')
            .select('id')
            .ilike('game_type', gameId)
            .ilike('difficulty', diff)
            .eq('is_used', false)

        if (qList && qList.length > 0) {
            const randomQ = qList[Math.floor(Math.random() * qList.length)]
            selectedIds.push(randomQ.id)
        }
    }

    // 4. Activate the newly drawn 2 questions AND mark them USED permanently
    if (selectedIds.length > 0) {
        await supabaseAdmin
            .from('question_bank')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ is_active: true, is_used: true } as any)
            .in('id', selectedIds)
    }

    return { success: true }
}
// --- NEW: PIT BOSS MANUAL WIN VALIDATION ---
export async function awardWin(teamId: string, gameId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    try {
        const winState = `WIN_${gameId.toUpperCase()}`

        // Perform the State Flag update to trigger the Success Modal on the client
        const { error: updateError } = await supabaseAdmin
            .from('teams')
            .update({
                current_locked_table: winState
            } as any)
            .eq('id', teamId)

        if (updateError) throw updateError

        return { success: true }
    } catch (err: any) {
        return { error: err.message || "Failed to award win." }
    }
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

    const { data: activeTeams } = await supabaseAdmin
        .from('teams')
        .select('id, access_code, current_locked_table')
        .not('current_locked_table', 'is', null)

    const { data: gameStates } = await supabaseAdmin
        .from('game_state')
        .select('game_id, entry_pin')

    if (control && control.table_timers && gameStates) {
        let clonedTimers = { ...control.table_timers }
        gameStates.forEach((gs: any) => {
            if (gs.game_id && gs.entry_pin) {
                clonedTimers[`${gs.game_id}_pin`] = gs.entry_pin
            }
        })
        control.table_timers = clonedTimers
    }

    return { control, rounds, recentTx, activeTeams }
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
        .update({ wallet_balance: newBalance } as any)
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
        .update({ current_locked_table: 'WARNING' } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }

    // Reset warning after storing it (the client reads it via realtime)
    setTimeout(async () => {
        await supabaseAdmin
            .from('teams')
            .update({ current_locked_table: null } as any)
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
        } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function unbanTeam(teamId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('teams')
        .update({ current_locked_table: null } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function updateStamps(teamId: string, stamps: Json) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('teams')
        .update({ stamps } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }

    // Log transaction for badge
    await supabaseAdmin.from('transactions').insert({
        team_id: teamId,
        amount: 0,
        description: `[ADMIN] Updated Badges`,
    } as any)

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
        .update({ is_active: isActive } as any)
        .eq('id', questionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function burnQuestion(questionId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_used: true } as any)
        .eq('id', questionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function reshuffleAllQuestions() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_used: false } as any)
        .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows

    if (error) return { error: error.message }
    return { success: true }
}

export async function bulkUploadQuestions(questionsJson: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    try {
        let questions = JSON.parse(questionsJson)

        // Auto-wrap single objects in an array seamlessly!
        if (!Array.isArray(questions)) {
            if (typeof questions === 'object' && questions !== null) {
                questions = [questions]
            } else {
                return { error: 'JSON must be an object or an array' }
            }
        }

        // Strip any manual states so they don't immediately crash the table draw logic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        questions = questions.map((q: any) => ({
            ...q,
            is_active: false,
            is_used: false
        }))

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
        .update({ current_round: `BROADCAST:${message}` } as any)
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
        } as any)
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

