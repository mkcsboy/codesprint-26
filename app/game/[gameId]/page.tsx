'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CodeEditor from '@/components/CodeEditor'
import { supabase } from '@/lib/supabase/client'

// --- CONFIGURATION ---
const GAME_CONFIG = {
  slots: {
    title: 'SLOTS: THE DEBUGGER',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    description: "The machine is broken! Fix the code to hit the jackpot.",
    rules: ["Fix the BUG in the code.", "Must pass hidden test cases.", "Time: 15 Mins."],
    starter: `def solve(n):
    # Buggy code: It should return n * 2
    return n + 2
    
# Do not delete this!
print(solve(10))`
  },
  roulette: {
    title: 'ROULETTE: PREDICTION',
    color: 'text-red-500',
    bg: 'bg-red-900/20',
    description: "Predict the output. No running code allowed!",
    rules: ["Analyze the code.", "Standard: Choose Option.", "High Roller: Type Answer."],
    starter: ""
  },
  blackjack: {
    title: 'BLACKJACK: CONSTRAINTS',
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    description: "Beat the dealer without using forbidden words.",
    rules: ["Solve the problem.", "Avoid BANNED words.", "Time: 15 Mins."],
    starter: `def blackjack_sum(a, b):
    # Constraint: Do not use the '+' symbol
    return 0`
  },
  holdem: {
    title: 'TEXAS HOLD\'EM: DSA',
    color: 'text-green-400',
    bg: 'bg-green-900/20',
    description: "Master Data Structures and Algorithms to win the pot.",
    rules: ["Implement the optimal algorithm.", "Use standard Python data structures.", "Time: 15 Mins."],
    starter: `def solve_dsa(data):
    # Implement your algorithm here
    pass`
  },
  craps: {
    title: 'CRAPS: EDGE CASES',
    color: 'text-purple-400',
    bg: 'bg-purple-900/20',
    description: "Pass the hidden edge cases.",
    rules: ["Handle weird inputs.", "Pass all 5 hidden tests."],
    starter: `def roll_dice(val):
    return val`
  },
}

const ROULETTE_OPTIONS = [
  { id: 'A', value: '9 14' }, { id: 'B', value: '10 15' },
  { id: 'C', value: 'Error' }, { id: 'D', value: '8 12' },
]

// Define global Pyodide type
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  const config = GAME_CONFIG[gameId as keyof typeof GAME_CONFIG]

  // --- STATE ---
  const [phase, setPhase] = useState<'RULES' | 'BETTING' | 'WAITING' | 'GAME'>('RULES')
  const [difficulty, setDifficulty] = useState<'STANDARD' | 'HIGH' | null>(null)
  const [joinedAt, setJoinedAt] = useState<number | null>(null)

  // Editor State
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)

  // Roulette State
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [textInput, setTextInput] = useState("")

  // Admin Event State
  const [isPaused, setIsPaused] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [isWarning, setIsWarning] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)

  // Timer & Overhaul State
  const [roundStartTime, setRoundStartTime] = useState<string | null>(null)
  const [tableStatus, setTableStatus] = useState<string>('WAITING')
  const [joinedRoundTime, setJoinedRoundTime] = useState<string | null>(null)
  const [roundDuration, setRoundDuration] = useState<number>(15)
  const [timeLeft, setTimeLeft] = useState<string>("--:--")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [actualPin, setActualPin] = useState<string | null>(null)
  const [enteredPin, setEnteredPin] = useState<string>('')
  const [isUnlockedLocally, setIsUnlockedLocally] = useState<boolean>(false)

  // Dynamic Content State
  const [dynamicConfig, setDynamicConfig] = useState<{
    description: string,
    starter: string,
    expected_output?: string,
    test_cases?: any[]
  } | null>(null)

  // 1. Initial Data Fetch
  useEffect(() => {
    async function init() {
      // Fetch Team ID
      const { getTeamId } = await import('@/app/actions')
      const tid = await getTeamId()
      if (tid) setTeamId(tid)

      // Only load fallback layout baseline here.
      if (config) setCode(config.starter)

      // Fetch initial event and wallet state
      if (tid) {
        const [teamRes, eventRes, gameStateRes] = await Promise.all([
          supabase.from('teams').select('wallet_balance, current_locked_table').eq('id', tid).maybeSingle(),
          supabase.from('event_control').select('is_paused, current_round, table_timers').eq('id', 1).maybeSingle(),
          supabase.from('game_state').select('*').eq('game_id', gameId.toLowerCase()).maybeSingle()
        ])

        const teamData = teamRes.data as any
        const eventData = eventRes.data as any
        const gameStateData = gameStateRes.data as any

        // Bind PIN regardless of eventData succeeding
        const rPin = gameStateData?.entry_pin || null
        setActualPin(rPin)

        if (eventData) {
          setIsPaused(eventData.is_paused)
          const timers = eventData.table_timers || {}
          const rTime = timers[gameId.toLowerCase() as string] || null
          setRoundStartTime(rTime)
          // setTableStatus is now driven by game_state below if available, fallback to WAITING
          setRoundDuration(16)
          if (eventData.current_round?.startsWith('BROADCAST:')) {
            setBroadcastMessage(eventData.current_round.replace('BROADCAST:', ''))
          }

          const startMs = rTime ? new Date(rTime).getTime() : 0
          const isLive = rTime && (startMs + (16 * 60000) > Date.now())

          if (teamData) {
            setWalletBalance(teamData.wallet_balance)
            if (teamData.current_locked_table === 'BANNED') {
              alert("YOU ARE BANNED.")
              window.location.href = '/'
            } else if (teamData.current_locked_table === `WIN_${gameId.toUpperCase()}`) {
              setShowSuccessModal(true)
            } else if (teamData.current_locked_table === gameId) {
              const savedDiff = localStorage.getItem(`cs_diff_${gameId}`) as 'STANDARD' | 'HIGH' | null
              if (savedDiff) setDifficulty(savedDiff)

              // If they were already playing and no reset happened locally, put them back
              const savedJoinTime = localStorage.getItem(`cs_join_${gameId}`)
              const eventTableStatus = timers[`${gameId.toLowerCase()}_status`]
              const currentStatus = eventTableStatus || (gameStateData?.is_active ? 'ACTIVE' : 'WAITING')
              setTableStatus(currentStatus)

              if (rPin && localStorage.getItem(`cs_unlocked_${gameId}`) === rPin) {
                setIsUnlockedLocally(true)
              }

              // A table is Live if the Admin flagged it ACTIVE
              if (savedJoinTime && currentStatus === 'ACTIVE') {
                setPhase('GAME')
              } else if (currentStatus === 'ACTIVE' && !savedJoinTime) {
                // Failsafe for missing localstorage
                setPhase('GAME')
              } else {
                setJoinedRoundTime(Date.now().toString())
                setPhase('WAITING')
              }
            } else {
              localStorage.removeItem(`cs_diff_${gameId}`)
              localStorage.removeItem(`cs_join_${gameId}`)
            }
          }
        }
      }
    }
    init()
  }, [gameId, config])

  // Auto-dismiss broadcast after 1 minute (60000 ms)
  useEffect(() => {
    if (broadcastMessage && broadcastMessage.trim() !== '') {
      const timer = setTimeout(() => {
        setBroadcastMessage(null)
      }, 60000)
      return () => clearTimeout(timer)
    }
  }, [broadcastMessage])

  // 2. Realtime Subscriptions & Polling Fallback
  useEffect(() => {
    if (!teamId) return

    // WebSockets (If Enabled in DB)
    const eventChannel = supabase.channel('event_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_control', filter: 'id=eq.1' }, (payload) => {
        const newRecord = payload.new as any
        setIsPaused(newRecord.is_paused)
        const timers = newRecord.table_timers || {}
        setRoundStartTime(timers[gameId.toLowerCase() as string] || null)
        setRoundDuration(16)

        const individualStatus = timers[`${gameId.toLowerCase()}_status`]
        if (individualStatus) {
          setTableStatus(individualStatus)
        }

        if (newRecord.current_round && newRecord.current_round.startsWith('BROADCAST:')) {
          setBroadcastMessage(newRecord.current_round.replace('BROADCAST:', ''))
        } else {
          setBroadcastMessage(null)
        }
      })
      .subscribe()

    const gameStateChannel = supabase.channel('game_state_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `game_id=eq.${gameId.toLowerCase()}` }, (payload) => {
        const newRecord = payload.new as any
        if (newRecord && newRecord.entry_pin !== undefined) {
          setActualPin(newRecord.entry_pin)
        }
        if (newRecord && newRecord.is_active !== undefined) {
          setTableStatus(newRecord.is_active ? 'ACTIVE' : 'WAITING')
        }
      })
      .subscribe()

    const teamChannel = supabase.channel('team_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, (payload) => {
        const newRecord = payload.new as any
        setWalletBalance(newRecord.wallet_balance)

        if (newRecord.current_locked_table === 'WARNING') {
          setIsWarning(true)
          setTimeout(() => setIsWarning(false), 2000)
        } else if (newRecord.current_locked_table === `WIN_${gameId.toUpperCase()}`) {
          setShowSuccessModal(true)
        } else if (newRecord.current_locked_table === 'BANNED') {
          alert("YOU ARE BANNED FROM THE CASINO.")
          window.location.href = '/'
        }
      })
      .subscribe()

    // 5-Second Polling Fallback (Failsafe)
    const pollInterval = setInterval(async () => {
      const [eventRes, gameStateRes] = await Promise.all([
        supabase.from('event_control').select('is_paused, current_round, table_timers').eq('id', 1).maybeSingle(),
        supabase.from('game_state').select('*').eq('game_id', gameId.toLowerCase()).maybeSingle()
      ])

      const eventData = eventRes.data as any
      const gameStateData = gameStateRes.data as any

      if (gameStateData && gameStateData.entry_pin !== undefined) {
        setActualPin(gameStateData.entry_pin)
      }

      if (eventData) {
        setIsPaused(eventData.is_paused)
        const timers = eventData.table_timers || {}
        const rTime = timers[gameId.toLowerCase() as string] || null
        setRoundStartTime(rTime)
        setRoundDuration(16)

        const tableStatusStr = timers[`${gameId.toLowerCase()}_status`] || (gameStateData?.is_active ? 'ACTIVE' : 'WAITING')
        setTableStatus(tableStatusStr)

        if (eventData.current_round && eventData.current_round.startsWith('BROADCAST:')) {
          setBroadcastMessage(eventData.current_round.replace('BROADCAST:', ''))
        } else {
          setBroadcastMessage(null)
        }
      }

      const teamData = await supabase.from('teams').select('wallet_balance, current_locked_table').eq('id', teamId).maybeSingle().then(res => res.data as any)
      if (teamData) {
        setWalletBalance(teamData.wallet_balance)
        if (teamData.current_locked_table === 'WARNING') {
          setIsWarning(true)
          setTimeout(() => setIsWarning(false), 2000)
        } else if (teamData.current_locked_table === `WIN_${gameId.toUpperCase()}`) {
          setShowSuccessModal(true)
        } else if (teamData.current_locked_table === 'BANNED') {
          alert("YOU ARE BANNED FROM THE CASINO.")
          window.location.href = '/'
        }
      }
    }, 5000)

    return () => {
      supabase.removeChannel(eventChannel)
      supabase.removeChannel(gameStateChannel)
      supabase.removeChannel(teamChannel)
      clearInterval(pollInterval)
    }
  }, [teamId, gameId])

  // --- WAITING ROOM SYNCHRONIZATION ---
  useEffect(() => {
    // 2. Safe deterministic transition based purely on Admin's database status flag
    if (phase === 'WAITING' && tableStatus === 'ACTIVE' && roundStartTime) {
      setPhase('GAME')
    }
  }, [phase, tableStatus, roundStartTime])

  // --- DYNAMIC QUESTION LOADER ---
  useEffect(() => {
    if (phase === 'GAME' && !dynamicConfig) {
      const loadQuestion = async () => {
        const { fetchQuestionData } = await import('@/app/actions')
        const diff = difficulty || localStorage.getItem(`cs_diff_${gameId}`) || 'STANDARD'
        const res = await fetchQuestionData(gameId, diff as string)
        if (res.success && res.question) {
          setDynamicConfig({
            description: res.question.content || (config ? config.description : ""),
            starter: res.question.starter_code || (config ? config.starter : ""),
            expected_output: res.question.expected_output,
            test_cases: res.question.test_cases
          })
          setCode(res.question.starter_code || (config ? config.starter : ""))
        } else {
          setDynamicConfig({
            description: "⚠️ CONFIGURATION ERROR: Could not find '" + diff + "' question in the database. Ask the Pit Boss.",
            starter: "# Error 404: Question missing."
          })
        }
      }
      loadQuestion()
    }
  }, [phase, dynamicConfig, gameId, difficulty, config])

  // --- INDIVIDUAL TABLE TERMINATION WATCHER ---
  useEffect(() => {
    if (tableStatus === 'KILLED' && phase === 'GAME') {
      alert("⚠️ The Pit Boss has forcefully terminated this table's gameplay. All progress is lost.")
      router.push('/map')
    }
  }, [tableStatus, phase, router])

  // --- GLOBAL TIMER COUNTDOWN HOOK ---
  useEffect(() => {
    if (phase !== 'GAME' || !roundStartTime || isPaused || tableStatus === 'PAUSED') return;

    const interval = setInterval(() => {
      const start = new Date(roundStartTime).getTime()
      const end = start + (roundDuration * 60000)
      const now = Date.now()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft("00:00")
        clearInterval(interval)
        alert(`⏰ TIME OUT! The 15 minutes have expired. Your team lost this game.`)
        if (teamId) {
          import('@/app/actions').then(({ unlockPlayer }) => unlockPlayer(teamId))
        }
        router.push('/map')
      } else {
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, roundStartTime, roundDuration, isPaused, tableStatus, router])

  // --- BET HANDLER ---
  const [isBetting, setIsBetting] = useState(false)

  const handleBet = async (selectedDiff: 'STANDARD' | 'HIGH') => {
    if (!teamId) return alert("System Error: Team ID not found")
    setIsBetting(true)
    const betAmount = selectedDiff === 'STANDARD' ? 100 : 300

    const { placeBet } = await import('@/app/actions')
    const res = await placeBet(teamId, betAmount, gameId)

    if (res.error) {
      alert(res.error)
      setIsBetting(false)
      return
    }

    if (res.success && typeof res.newBalance === 'number') {
      setWalletBalance(res.newBalance)
      setDifficulty(selectedDiff)
      localStorage.setItem(`cs_diff_${gameId}`, selectedDiff)

      setJoinedRoundTime(roundStartTime)
      setJoinedAt(Date.now())
      setPhase('WAITING')
    }
    setIsBetting(false)
  }

  // --- SUBMIT HANDLER (WEB WORKER ENGINE) ---
  const handleSubmit = async () => {
    setIsRunning(true)
    setOutput("Executing...")

    // --- LOGIC A: ROULETTE (NO CODE) ---
    if (gameId === 'roulette') {
      setTimeout(() => {
        if (!dynamicConfig?.expected_output) {
          setOutput("❌ ERROR: No answer key found for this question.")
          setIsRunning(false)
          return
        }

        if (textInput.trim() === dynamicConfig.expected_output.trim()) {
          setShowSuccessModal(true)
        } else {
          setOutput("❌ WRONG ANSWER. Please try again.")
        }
        setIsRunning(false)
      }, 500)
      return
    }

    // --- LOGIC B: LOCAL PYTHON WEB WORKER EXECUTION ---
    try {
      // 1. Fetch constraints and hidden tests from Supabase Action
      const { fetchQuestionData } = await import('@/app/actions')
      const diff = difficulty || localStorage.getItem(`cs_diff_${gameId}`) || 'STANDARD'
      const questionRes = await fetchQuestionData(gameId, diff as string)

      if (questionRes.error || !questionRes.question) {
        setOutput(`❌ ERROR:\n${questionRes.error || 'Failed to fetch question data'}`)
        setIsRunning(false)
        return
      }

      // Check Constraints first
      const bannedWords = questionRes.question.constraints ? questionRes.question.constraints.split(',') : []
      for (const word of bannedWords) {
        if (word.trim() && code.includes(word.trim())) {
          setOutput(`❌ CONSTRAINT FAILED:\nThe character/word '${word.trim()}' is banned.\n\n[CREDITS LOST]`)
          // TODO: Deduct points
          setIsRunning(false)
          return
        }
      }

      // 2. Prepare Code (User Code ONLY)
      const finalCode = code

      // 3. Start Web Worker
      const worker = new Worker('/pythonWorker.js')

      // 4. Create Timeout Promise (2 Minutes)
      const timeoutPromise = new Promise<{ error: string }>((resolve) => {
        setTimeout(() => {
          resolve({ error: "Execution Timed Out (2m).\nDid you write an infinite loop?" })
        }, 120000)
      })

      // 5. Create Worker Execution Promise
      const executionPromise = new Promise<{ stdout?: string, stderr?: string, error?: string }>((resolve) => {
        worker.onmessage = (e) => resolve(e.data)
        worker.onerror = (e) => resolve({ error: e.message })
      })

      // Send to Worker
      worker.postMessage({ code: finalCode })

      // RACE! First one to finish wins
      const result = await Promise.race([executionPromise, timeoutPromise]) as { stdout?: string, stderr?: string, error?: string }

      // Always terminate worker immediately after race finishes to free memory immediately
      worker.terminate()

      // 6. Handle Result
      if (result.error) {
        setOutput(`❌ ERROR:\n${result.error}`)
      } else {
        const stderr = result.stderr ? `\n[STDERR]:\n${result.stderr}` : ''
        const stdout = result.stdout || ''

        let displayOutput = `> OUTPUT:\n${stdout}${stderr}`

        displayOutput += "\n\n⚠️ Execution Complete. Please show this output to the Dealer/Pit Boss to verify your answer."

        setOutput(displayOutput)
      }

    } catch (err: any) {
      setOutput(`❌ SYSTEM ERROR:\n${err.message || 'Worker Failed'}`)
    }

    setIsRunning(false)
  }

  if (!config) return <div className="text-white p-10">INVALID GAME ID</div>

  // --- PHASE 3: THE GAME (AND BLIND FOLD WAITING) ---
  if (phase === 'GAME' || phase === 'WAITING') {
    return (
      <div className={`min-h-screen bg-[#1a1a24] text-white p-4 flex flex-col items-center ${isWarning ? 'animate-pulse bg-red-900/50' : ''}`}>

        {/* EVENT OVERLAYS */}
        {(isPaused || tableStatus === 'PAUSED') && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto">
            <h1 className="text-6xl font-pixel text-red-500 mb-4 animate-bounce">
              {tableStatus === 'PAUSED' ? 'TABLE PAUSED' : 'EVENT PAUSED'}
            </h1>
            <p className="text-xl text-gray-300 font-mono text-center max-w-lg">
              {tableStatus === 'PAUSED' ? 'The Pit Boss has temporarily halted this specific table.' : 'The Pit Boss has halted all play. Please wait for announcements.'}
            </p>
          </div>
        )}

        {isWarning && (
          <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur flex items-center justify-center pointer-events-auto border-[16px] border-red-600 animate-pulse">
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-7xl font-pixel text-red-500 bg-red-900/40 p-10 rounded-2xl border-4 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.6)]">
                ⚠️ WARNING FROM PIT BOSS ⚠️
              </h1>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center pointer-events-auto">
            {/* Auto Redirect after 10s */}
            {(() => {
              setTimeout(() => router.push('/map'), 10000)
              return null
            })()}
            <div className="text-center space-y-6 bg-[#1a1a24] p-12 rounded-3xl border-4 border-retro-gold shadow-[0_0_100px_rgba(234,179,8,0.3)] max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-pixel text-retro-gold animate-bounce">
                🎉 YOU PASSED!
              </h1>
              <p className="text-xl text-gray-300 font-mono mt-4">
                The Pit Boss has validated your script! Please claim your chips from the Vault.
              </p>
              <p className="text-sm text-gray-500 font-mono italic">
                Returning to map in 10 seconds...
              </p>
              <button onClick={() => router.push('/map')} className="mt-8 px-8 py-4 bg-yellow-600 text-black font-pixel text-xl rounded-xl hover:bg-yellow-500 hover:scale-105 transition-all outline-none">
                RETURN TO CASINO FLOOR
              </button>
            </div>
          </div>
        )}

        {/* IN-GAME MINI BROADCAST (NON-INTRUSIVE) */}
        {broadcastMessage && broadcastMessage.trim() !== '' && (
          <div className="fixed bottom-4 right-4 z-[99] max-w-[280px] bg-[#1a1a24]/90 backdrop-blur text-white p-3 rounded-md border-l-4 border-yellow-500 shadow-lg pointer-events-none transition-all duration-300">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">⚠️</span>
              <h3 className="font-bold text-yellow-500 font-pixel uppercase text-[10px]">Pit Boss</h3>
            </div>
            <p className="font-mono text-xs leading-relaxed text-gray-200">{broadcastMessage}</p>
          </div>
        )}

        {/* HEADER */}
        <div className="w-full max-w-6xl flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h1 className={`text-2xl font-bold font-pixel ${config.color}`}>{config.title}</h1>
          <div className="flex gap-4 font-mono text-sm items-center">
            {walletBalance !== null && (
              <div className="px-3 py-1 bg-[#2a2b38] rounded border border-retro-gold text-retro-gold flex items-center gap-2">
                <span>🪙</span> <span>${walletBalance}</span>
              </div>
            )}
            <div className={`px-3 py-1 rounded border ${difficulty === 'HIGH' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-green-900/50 border-green-500 text-green-400'}`}>
              RISK: {difficulty}
            </div>
            <div className={`px-4 py-1 rounded border border-blue-500 text-blue-400 font-bold bg-blue-900/20 tracking-wider`}>
              ⏳ {timeLeft}
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-6xl gap-4 h-[75vh]">
          {/* LEFT PANEL */}
          <div className="w-1/3 flex flex-col gap-4 relative overflow-hidden rounded-lg">
            {!isUnlockedLocally && (
              <div className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-6 border-4 border-dashed border-gray-600 rounded-lg backdrop-blur-md pointer-events-auto">
                <span className="text-4xl mb-4">🔒</span>
                <h2 className="text-xl font-pixel text-yellow-500 text-center animate-pulse tracking-widest leading-loose">TABLE LOCKED</h2>
                <p className="text-gray-400 font-mono text-center text-xs px-4 mt-2">Waiting for Pit Boss...</p>
              </div>
            )}
            <div className="bg-[#2a2b38] rounded-lg p-6 border border-white/10 flex-grow overflow-y-auto shadow-lg flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold mb-4 text-retro-gold">The Challenge</h2>
                <p className="text-gray-300 font-sans leading-relaxed text-sm whitespace-pre-wrap">
                  {dynamicConfig ? dynamicConfig.description : (gameId === 'roulette' ? "Predict the output." : "Write a Python script to solve the problem.")}
                </p>
                {gameId === 'roulette' && (
                  <div className="bg-black p-4 mt-4 rounded border border-gray-600 font-mono text-xs">
                    x = 3<br />y = 5<br />for i in range(1, 4):...
                  </div>
                )}
              </div>

              {/* TEST CASES VISUALIZER */}
              {dynamicConfig?.test_cases && dynamicConfig.test_cases.length > 0 && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Test Cases</h3>
                  <div className="space-y-3">
                    {dynamicConfig.test_cases.map((tc: any, i: number) => (
                      <div key={i} className="bg-black/50 border border-gray-700 rounded p-3 font-mono text-[10px] md:text-xs">
                        {tc.input && (
                          <div className="mb-1">
                            <span className="text-blue-400">Input: </span>
                            <span className="text-gray-300">{tc.input}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-green-400">Expected: </span>
                          <span className="text-gray-300">{tc.expected}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-black rounded-lg p-4 border border-gray-700 h-1/3 overflow-y-auto font-mono text-xs shadow-inner">
              <div className="text-gray-500 mb-2 uppercase font-bold">Terminal Output:</div>
              <pre className={`whitespace-pre-wrap ${output.startsWith('❌') ? 'text-red-400' : 'text-green-400'}`}>
                {output}
              </pre>
            </div>
          </div>

          {/* RIGHT PANEL (EDITOR) */}
          <div className="w-2/3 bg-[#1e1e1e] rounded-lg border border-white/10 flex flex-col relative overflow-hidden shadow-2xl">
            {!isUnlockedLocally && (
              <div className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-6 border-4 border-dashed border-yellow-700 rounded-lg backdrop-blur-xl pointer-events-auto">
                <h2 className="text-3xl font-pixel text-yellow-500 text-center uppercase tracking-[0.2em] leading-loose mb-2">ENTER PIN TO UNLOCK</h2>
                <p className="font-mono text-gray-400 mb-6 text-center">Listen for the Pit Boss to announce the start PIN.</p>
                <div className="flex flex-col gap-4 w-full max-w-sm">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="ENTER PIN"
                    className="w-full bg-black border-2 border-gray-700 focus:border-yellow-500 text-yellow-400 text-4xl p-6 tracking-[0.5em] text-center rounded-xl outline-none font-mono"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (enteredPin.trim() === actualPin?.trim()) {
                          setIsUnlockedLocally(true)
                          localStorage.setItem(`cs_unlocked_${gameId}`, actualPin!)
                        } else {
                          alert(`Incorrect PIN.\\nExpected: [${actualPin}]\\nYou Typed: [${enteredPin}]`)
                          setEnteredPin('')
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (enteredPin.trim() === actualPin?.trim()) {
                        setIsUnlockedLocally(true)
                        localStorage.setItem(`cs_unlocked_${gameId}`, actualPin!)
                      } else {
                        alert(`Incorrect PIN.\\nExpected: [${actualPin}]\\nYou Typed: [${enteredPin}]`)
                        setEnteredPin('')
                      }
                    }}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xl py-4 rounded-xl active:scale-95 transition-all shadow-[0_0_15px_rgba(202,138,4,0.3)]">
                    UNLOCK IDE
                  </button>
                  <p className="text-gray-500 text-xs text-center font-mono mt-2 flex justify-center gap-2">
                    DEBUG: <span className="text-red-500">{actualPin || "WAITING FOR DATABASE..."}</span>
                  </p>
                </div>
              </div>
            )}
            {gameId === 'roulette' ? (
              <div className="flex-grow flex flex-col items-center justify-center p-10 gap-6 relative z-10 bg-[#12121a]">
                <h3 className="text-3xl font-pixel text-yellow-500 mb-2 tracking-widest">SUBMIT OUTPUT</h3>
                <p className="text-gray-400 font-mono mb-6 text-center text-sm">Analyze the code challenge on the left and enter the exact output below.</p>
                <input
                  type="text"
                  placeholder="Type exact match..."
                  className="w-full max-w-md bg-black border-2 border-gray-700 focus:border-yellow-500 text-yellow-400 text-3xl p-6 text-center rounded-xl outline-none font-mono transition-colors shadow-inner"
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            ) : (
              <div className="flex-grow relative z-10">
                <CodeEditor starterCode={code} onChange={(newCode) => setCode(newCode)} />
              </div>
            )}

            <div className="h-20 bg-[#1a1a24] border-t border-white/10 flex items-center justify-between px-6 gap-4 z-20">
              <button onClick={() => {
                if (window.confirm("Are you sure you want to Give Up? You will instantly LOSE your bet and return to the map.")) {
                  router.back()
                }
              }} className="px-6 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 font-bold rounded uppercase text-sm transition-colors">Give Up</button>
              <button onClick={handleSubmit} disabled={isRunning} className={`px-8 py-3 font-bold rounded uppercase text-lg shadow-lg transition-all ${isRunning ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-500 hover:scale-105 text-black shadow-green-500/40'}`}>
                {isRunning ? 'RUNNING...' : 'SUBMIT ➤'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // --- PHASE 2: BETTING ---
  if (phase === 'BETTING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d12] p-4 relative overflow-hidden">
        <div className={`absolute inset-0 opacity-10 ${config.bg} bg-[url('/noise.png')]`}></div>
        <div className="z-10 text-center space-y-8 max-w-4xl w-full">
          <h1 className={`text-4xl md:text-5xl font-pixel mb-2 ${config.color}`}>PLACE YOUR BET</h1>

          {isBetting ? (
            <div className="mt-12 text-2xl font-mono text-retro-gold animate-pulse">PROCESSING BET...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              <div onClick={() => handleBet('STANDARD')} className="group cursor-pointer bg-[#1a1a24] border-4 border-gray-700 hover:border-green-500 p-8 rounded-xl transition-all hover:-translate-y-2 relative">
                <h3 className="text-2xl text-white font-bold mb-2">STANDARD</h3>
                <div className="text-4xl font-mono text-green-400 mb-4">$100</div>
                <p className="text-gray-400 text-sm">{gameId === 'roulette' ? 'Multiple Choice' : 'Normal Difficulty'}</p>
              </div>
              <div onClick={() => handleBet('HIGH')} className="group cursor-pointer bg-[#2a1a1a] border-4 border-red-900 hover:border-red-500 p-8 rounded-xl transition-all hover:-translate-y-2 relative">
                <div className="absolute -top-3 right-4 bg-red-600 text-xs px-2 py-1 text-white font-bold">LEGENDARY</div>
                <h3 className="text-2xl text-white font-bold mb-2">HIGH ROLLER</h3>
                <div className="text-4xl font-mono text-red-500 mb-4">$300</div>
                <p className="text-gray-400 text-sm">{gameId === 'roulette' ? 'Exact Match Input' : 'Extreme Difficulty'}</p>
              </div>
            </div>
          )}
          <button onClick={() => router.back()} className="mt-8 text-gray-500 hover:text-white underline text-sm disabled:opacity-0" disabled={isBetting}>← BACK TO MAP</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e24] border-4 border-white max-w-2xl w-full rounded-lg shadow-2xl relative overflow-hidden">
        <div className={`h-4 w-full ${config.bg.replace('/20', '')}`}></div>
        <div className="p-8">
          <h1 className={`text-3xl font-pixel mb-2 ${config.color}`}>{config.title}</h1>
          <p className="text-lg text-white mb-6 italic border-b border-gray-700 pb-4">"{config.description}"</p>
          <div className="space-y-4 mb-8">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm">HOW TO PLAY:</h3>
            <ul className="space-y-3">
              {config.rules.map((rule, i) => <li key={i} className="flex items-start gap-3 text-gray-300 font-mono text-sm"><span className={`${config.color} font-bold`}>[0{i + 1}]</span>{rule}</li>)}
            </ul>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.back()} className="flex-1 px-4 py-3 border-2 border-gray-600 text-gray-400 hover:bg-gray-800 font-bold rounded uppercase text-sm">Cancel</button>
            <button onClick={() => setPhase('BETTING')} className={`flex-1 px-4 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded uppercase text-sm border-b-4 border-gray-400 active:border-b-0 active:translate-y-1`}>I Understand →</button>
          </div>
        </div>
      </div>
    </div>
  )
}