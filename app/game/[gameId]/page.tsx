'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels'
import CodeEditor from '@/components/CodeEditor'
import SpinWheel from '@/components/SpinWheel'
import { supabase } from '@/lib/supabase/client'
import LogoutButton from '@/components/LogoutButton'
import { claimAutomatedReward } from '@/app/actions'

// --- CONFIGURATION ---
const GAME_CONFIG: Record<string, any> = {
  slots: {
    title: 'SLOTS: BUG BOUNTY',
    color: 'text-yellow-400',
    neonClass: 'neon-text-gold',
    bg: 'bg-yellow-900/20',
    glowShadow: 'shadow-neon-gold',
    borderColor: 'border-neon-gold/50',
    description: "A rapid debugging game where teams receive intentionally broken programs and must identify and fix as many bugs as possible.",
    rules: ["Identify the bug.", "Submit fix against test cases.", "Clear as many as possible in 10 mins."],
    starter: `def find_max(arr):\n    # Buggy code: fix the condition\n    m = arr[0]\n    for num in arr:\n        if num < m:\n            m = num\n    return m\n\nprint(find_max([1, 5, 3, 9, 2]))`
  },
  roulette: {
    title: 'ROULETTE: OUTPUT ORACLE',
    color: 'text-red-500',
    neonClass: 'neon-text-red',
    bg: 'bg-red-900/20',
    glowShadow: 'shadow-neon-red',
    borderColor: 'border-neon-red/50',
    description: "Predict the exact output of the given code without running it.",
    rules: ["Trace the code manually.", "Submit the exact output.", "Incorrect attempts induce a penalty."],
    starter: ""
  },
  blackjack: {
    title: 'BLACKJACK: CODE RELAY',
    color: 'text-blue-400',
    neonClass: 'neon-text-blue',
    bg: 'bg-blue-900/20',
    glowShadow: 'shadow-neon-blue',
    borderColor: 'border-neon-blue/50',
    description: "A collaborative coding challenge where the keyboard moves between teammates.",
    rules: ["Player 1 starts.", "Keyboard passes at signal.", "Final player submits."],
    starter: `def word_frequency(text):\n    # Player 1: Handle input\n    pass`
  },
  craps: {
    title: 'CRAPS: DEBUG DETECTIVE',
    color: 'text-purple-400',
    neonClass: 'neon-text-purple',
    bg: 'bg-purple-900/20',
    glowShadow: 'shadow-neon-purple',
    borderColor: 'border-neon-purple/50',
    description: "Investigate one mysterious failure using program output and clues.",
    rules: ["Investigate the case file.", "Identify underlying defect.", "Fix and submit."],
    starter: `def count_vowels(s):\n    # Fails for uppercase input\n    return sum(1 for c in s if c in 'aeiou')`
  },
  poker: {
    title: 'POKER: CIPHER CRACK',
    color: 'text-green-400',
    neonClass: 'neon-text-green',
    bg: 'bg-green-900/20',
    glowShadow: 'shadow-neon-green',
    borderColor: 'border-neon-green/50',
    description: "Decode messages to uncover the final code.",
    rules: ["Identify the transformation.", "Solve one stage to reveal the next.", "Recover the final message."],
    starter: `def decode(message):\n    # Implement the decoding logic\n    pass`
  },
  baccarat: {
    title: 'BACCARAT: SQL HEIST',
    color: 'text-red-400',
    neonClass: 'neon-text-red',
    bg: 'bg-red-900/20',
    glowShadow: 'shadow-neon-red',
    borderColor: 'border-neon-red/50',
    description: "Query a small casino database to uncover information and retrieve a secret.",
    rules: ["Write SQL queries.", "Unlock successive clues.", "Reveal the final secret."],
    starter: `-- Example: Find player with highest winnings\nSELECT * FROM players LIMIT 1;`
  },
  dice: {
    title: 'DICE: STACK ATTACK',
    color: 'text-yellow-400',
    neonClass: 'neon-text-gold',
    bg: 'bg-yellow-900/20',
    glowShadow: 'shadow-neon-gold',
    borderColor: 'border-neon-gold/50',
    description: "A focused stack challenge combining coding and rapid problem solving.",
    rules: ["Use stack operations.", "Test against hidden cases.", "Pass required tests to win."],
    starter: `def is_balanced(expression):\n    # Use a stack to validate brackets\n    stack = []\n    return True`
  },
  highcard: {
    title: 'HIGH CARD: COMPLEXITY CLASH',
    color: 'text-blue-400',
    neonClass: 'neon-text-blue',
    bg: 'bg-blue-900/20',
    glowShadow: 'shadow-neon-blue',
    borderColor: 'border-neon-blue/50',
    description: "Identify or generate the correct programming pattern using code.",
    rules: ["Study the expected pattern.", "Write code to generate it.", "Clear test cases."],
    starter: `def generate_pattern(n):\n    # Generate a reverse pyramid pattern\n    pass`
  },
  coinflip: {
    title: 'COIN FLIP: ALGORITHM AUCTION',
    color: 'text-yellow-500',
    neonClass: 'neon-text-gold',
    bg: 'bg-yellow-900/20',
    glowShadow: 'shadow-neon-gold',
    borderColor: 'border-neon-gold/50',
    description: "Decide how much assistance you want before solving the problem. Hints cost credits!",
    rules: ["Choose assistance level.", "Hints reduce reward.", "Solve and submit."],
    starter: `def solve_auction(arr):\n    # Consider a two-pointer approach\n    pass`
  },
  vault: {
    title: 'THE VAULT: DSA',
    color: 'text-purple-400',
    neonClass: 'neon-text-purple',
    bg: 'bg-purple-900/20',
    glowShadow: 'shadow-neon-purple',
    borderColor: 'border-neon-purple/50',
    description: "A clean technical challenge focusing on core programming and algorithm skills.",
    rules: ["Analyze constraints.", "Implement optimal solution.", "Pass all test cases."],
    starter: `def two_sum(nums, target):\n    # Implement an O(n) solution\n    pass`
  },
  final: {
    title: 'FINAL ROUND: ALL IN',
    color: 'text-retro-gold',
    neonClass: 'neon-text-gold',
    bg: 'bg-[#1a1b26]/80',
    glowShadow: 'shadow-neon-gold-intense',
    borderColor: 'border-retro-gold/50',
    description: "The ultimate algorithm challenge. Optimize or perish.",
    rules: ["O(N log N) required.", "Brute force will TLE."],
    starter: `import sys\n\ndef solve():\n    pass\n\nif __name__ == '__main__':\n    solve()`
  }
}



// Define global Pyodide type
declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

// --- COIN RAIN COMPONENT ---
function CoinRain() {
  const coins = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 1.5,
      emoji: ['🪙', '💰', '🎰', '⭐'][Math.floor(Math.random() * 4)],
    }))
  }, [])

  return (
    <div className="fixed inset-0 z-[140] pointer-events-none overflow-hidden">
      {coins.map(coin => (
        <span
          key={coin.id}
          className="coin-particle"
          style={{
            left: `${coin.left}%`,
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
          }}
        >
          {coin.emoji}
        </span>
      ))}
    </div>
  )
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  const config = GAME_CONFIG[gameId as keyof typeof GAME_CONFIG]

  // --- STATE ---
  const [phase, setPhase] = useState<'RULES' | 'BETTING' | 'WAITING' | 'GAME'>('RULES')
  const [difficulty, setDifficulty] = useState<'STANDARD' | 'HIGH' | null>(null)
  const [selectedBet, setSelectedBet] = useState<'STANDARD' | 'HIGH' | null>(null)
  const [showAdminWaitModal, setShowAdminWaitModal] = useState(false)


  // Editor State
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Roulette State

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

  const [roundDuration, setRoundDuration] = useState<number>(15)
  const [timeLeft, setTimeLeft] = useState<string>("--:--")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showBustEffect, setShowBustEffect] = useState(false)
  const [actualPin, setActualPin] = useState<string | null>(null)
  const [enteredPin, setEnteredPin] = useState<string>('')
  const [isUnlockedLocally, setIsUnlockedLocally] = useState<boolean>(false)
  const [panelLayout, setPanelLayout] = useState([25, 55, 20])
  const [language, setLanguage] = useState<string>('python')
  const [wheelMultiplier, setWheelMultiplier] = useState<number>(0)
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(false)
  const [isSpinningWheel, setIsSpinningWheel] = useState<boolean>(false)

  // Dynamic Content State
  const [dynamicConfig, setDynamicConfig] = useState<{
    description: string,
    starter: string,
    expected_output?: string,
    test_cases?: any[],
    options?: string[]
  } | null>(null)
  const [selectedMcqOption, setSelectedMcqOption] = useState<string>('')

  // Timer urgency
  const isTimerUrgent = timeLeft !== '--:--' && (() => {
    const parts = timeLeft.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0])
      return mins < 2
    }
    return false
  })()

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

        const timers = eventData?.table_timers || {}
        
        // Bind PIN regardless of eventData succeeding, fallback to table_timers if game_state row is missing
        const rPin = gameStateData?.entry_pin || timers[`${gameId.toLowerCase()}_pin`] || null
        setActualPin(rPin)

        if (eventData) {
          setIsPaused(eventData.is_paused)
          const rTime = timers[gameId.toLowerCase() as string] || null
          setRoundStartTime(rTime)
          
          if (eventData.current_round?.startsWith('BROADCAST:')) {
            setBroadcastMessage(eventData.current_round.replace('BROADCAST:', ''))
          }




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
                // setJoinedRoundTime(Date.now().toString())
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
        
        // Also update PIN from table_timers if present (fallback for Vault)
        const tablePin = timers[`${gameId.toLowerCase()}_pin`]
        if (tablePin) {
          setActualPin(tablePin)
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
      } else if (eventData?.table_timers) {
        const tablePin = eventData.table_timers[`${gameId.toLowerCase()}_pin`]
        if (tablePin) setActualPin(tablePin)
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

  // ============================================================
  // AUTOMATED REWARD CLAIM EFFECT
  // ============================================================
  useEffect(() => {
    if (showSuccessModal && !rewardClaimed && teamId) {
      setRewardClaimed(true)
      
      const payout = Math.floor(difficulty === 'HIGH' ? 400 : (150 * (wheelMultiplier > 0 ? wheelMultiplier : 1)))
      
      const claim = async () => {
        try {
          const res = await claimAutomatedReward(teamId, payout, gameId)
          if (res.error) {
            console.error("Reward Error:", res.error)
          } else if (res.success && res.newBalance !== undefined) {
            setWalletBalance(res.newBalance)
          }
        } catch (e) {
          console.error("System Error claiming reward:", e)
        }
      }
      claim()
    }
  }, [showSuccessModal, rewardClaimed, teamId, difficulty, wheelMultiplier, gameId])

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
        let diff = difficulty || localStorage.getItem(`cs_diff_${gameId}`) || 'STANDARD'
        if (gameId === 'final') diff = 'STANDARD' // Bypass betting phase lack of state

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
  }, [phase, roundStartTime, roundDuration, isPaused, tableStatus, router, teamId])

  // --- BET HANDLER ---
  const [isBetting, setIsBetting] = useState(false)

  const handleBet = async () => {
    if (!selectedBet) return
    if (tableStatus !== 'ACTIVE') {
      setShowAdminWaitModal(true)
      return
    }
    if (!teamId) return alert("System Error: Team ID not found")
    setIsBetting(true)
    const betAmount = selectedBet === 'STANDARD' ? 100 : 200

    const { placeBet } = await import('@/app/actions')
    const res = await placeBet(teamId, betAmount, gameId)

    if (res.error) {
      alert(res.error)
      setIsBetting(false)
      return
    }

    if (res.success && typeof res.newBalance === 'number') {
      setWalletBalance(res.newBalance)
      setDifficulty(selectedBet)
      localStorage.setItem(`cs_diff_${gameId}`, selectedBet)

      setPhase('WAITING')
    }
    setIsBetting(false)
  }

  // --- SUBMIT HANDLER (WEB WORKER ENGINE) ---
  const handleSubmit = async (isSubmit: boolean = true) => {
    setIsRunning(true)
    setHasError(false)
    setOutput("Executing...")

    // --- LOGIC A: ROULETTE (NO CODE) ---
    if (gameId === 'roulette') {
      setTimeout(() => {
        if (!dynamicConfig?.expected_output) {
          setOutput("❌ ERROR: No answer key found for this question.")
          setHasError(true)
          setIsRunning(false)
          return
        }

        if (textInput.trim() === dynamicConfig.expected_output.trim()) {
          setShowSuccessModal(true)
        } else {
          setOutput("❌ WRONG ANSWER. Please try again.")
          setHasError(true)
          setShowBustEffect(true)
          setTimeout(() => setShowBustEffect(false), 500)
        }
        setIsRunning(false)
      }, 500)
      return
    }

    // --- LOGIC A2: BACCARAT (MCQ) ---
    if (gameId === 'baccarat') {
      setTimeout(() => {
        if (!dynamicConfig?.expected_output) {
          setOutput("❌ ERROR: No answer key found for this question.")
          setHasError(true)
          setIsRunning(false)
          return
        }

        if (selectedMcqOption.trim() === dynamicConfig.expected_output.trim()) {
          setShowSuccessModal(true)
        } else {
          setOutput("❌ WRONG ANSWER. Please try again.")
          setHasError(true)
          setShowBustEffect(true)
          setTimeout(() => setShowBustEffect(false), 500)
        }
        setIsRunning(false)
      }, 500)
      return
    }

    // --- LOGIC B: LOCAL PYTHON WEB WORKER EXECUTION ---
    try {
      // 1. Fetch constraints and hidden tests from Supabase Action
      const { fetchQuestionData } = await import('@/app/actions')
      let diff = difficulty || localStorage.getItem(`cs_diff_${gameId}`) || 'STANDARD'
      if (gameId === 'final') diff = 'STANDARD'

      const questionRes = await fetchQuestionData(gameId, diff as string)

      if (questionRes.error || !questionRes.question) {
        setOutput(`❌ ERROR:\n${questionRes.error || 'Failed to fetch question data'}`)
        setHasError(true)
        setIsRunning(false)
        return
      }

      // Check Constraints first
      const bannedWords = questionRes.question.constraints ? questionRes.question.constraints.split(',') : []
      for (const word of bannedWords) {
        if (word.trim() && code.includes(word.trim())) {
          setOutput(`❌ CONSTRAINT FAILED:\nThe character/word '${word.trim()}' is banned.\n\n[CREDITS LOST]`)
          setHasError(true)
          setShowBustEffect(true)
          setTimeout(() => setShowBustEffect(false), 500)
          // TODO: Deduct points
          setIsRunning(false)
          return
        }
      }

      // 2. Prepare Code and Payload
      const finalCode = code
      const sandboxUrl = process.env.NEXT_PUBLIC_SANDBOX_URL || 'http://localhost:9000'
      
      const payload = {
        language: language,
        code: finalCode,
        stdin: ''
      }

      // 3. Execute via Custom Sandbox Server
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2m timeout

      let result: { stdout?: string, stderr?: string, error?: string } = {}
      try {
        const res = await fetch(`${sandboxUrl}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          const errorText = await res.text()
          result = { error: `Server Error (${res.status}): ${errorText}` }
        } else {
          const data = await res.json()
          if (!data.success) {
             result = { error: data.error || 'Execution failed' }
          } else {
             result = { stdout: data.stdout, stderr: data.stderr }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          result = { error: "Execution Timed Out (2m).\nDid you write an infinite loop?" }
        } else {
          result = { error: `Network Error: ${err.message}` }
        }
      }

      // 6. Handle Result
      if (result.error) {
        setOutput(`❌ ERROR:\n${result.error}`)
        setHasError(true)
        setShowBustEffect(true)
        setTimeout(() => setShowBustEffect(false), 500)
      } else {
        const stderr = result.stderr ? `\n[STDERR]:\n${result.stderr}` : ''
        const stdout = result.stdout || ''

        let displayOutput = `> OUTPUT:\n${stdout}${stderr}`

        if (isSubmit) {
          displayOutput += "\n\n⚠️ Submission Complete. Please show this output to the Dealer/Pit Boss to verify your answer."
        } else {
          displayOutput += "\n\n✅ Run Complete. Check your output."
        }

        setOutput(displayOutput)
        setHasError(false)
      }

    } catch (err: any) {
      setOutput(`❌ SYSTEM ERROR:\n${err.message || 'Worker Failed'}`)
      setHasError(true)
      setShowBustEffect(true)
      setTimeout(() => setShowBustEffect(false), 500)
    }

    setIsRunning(false)
  }

  if (!config) return <div className="text-white p-10">INVALID GAME ID</div>

  // ============================================================
  // PHASE 3: THE GAME (AND WAITING ROOM)
  // ============================================================
  if (phase === 'GAME' || phase === 'WAITING') {
    return (
      <div className={`min-h-screen bg-casino-void text-white p-4 flex flex-col items-center ${isWarning ? 'animate-bust-shake' : ''}`}>

        {/* EVENT OVERLAYS */}
        <AnimatePresence>
          {(isPaused || tableStatus === 'PAUSED') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto"
            >
              <h1 className="text-6xl font-pixel text-red-500 mb-4 animate-bounce neon-text-red">
                {tableStatus === 'PAUSED' ? 'TABLE PAUSED' : 'EVENT PAUSED'}
              </h1>
              <p className="text-xl text-gray-300 font-mono text-center max-w-lg">
                {tableStatus === 'PAUSED' ? 'The Pit Boss has temporarily halted this specific table.' : 'The Pit Boss has halted all play. Please wait for announcements.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] bg-black/80 backdrop-blur flex items-center justify-center pointer-events-auto border-[16px] border-red-600 animate-pulse"
            >
              <div className="text-center space-y-4">
                <h1 className="text-5xl md:text-7xl font-pixel text-red-500 neon-text-red bg-red-900/40 p-10 rounded-2xl border-4 border-red-500 shadow-neon-red">
                  ⚠️ WARNING FROM PIT BOSS ⚠️
                </h1>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* JACKPOT SUCCESS MODAL */}
        <AnimatePresence>
          {showSuccessModal && (
            <>
              <CoinRain />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center pointer-events-auto animate-jackpot-flash"
              >
                {/* Auto Redirect after 10s */}
                {(() => {
                  setTimeout(() => router.push('/map'), 10000)
                  return null
                })()}
                <motion.div
                  initial={{ scale: 0.5, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="text-center space-y-6 bg-casino-panel-light p-12 rounded-3xl border-4 border-retro-gold shadow-neon-gold-intense max-w-2xl crt-screen"
                >
                  <h1 className="text-4xl md:text-5xl font-pixel text-retro-gold animate-bounce neon-text-gold">
                    🎰 JACKPOT! 🎰
                  </h1>
                  <p className="text-xl text-gray-300 font-mono mt-4">
                    The Pit Boss has validated your script! Please claim your chips from the Vault.
                  </p>
                  
                  <div className="bg-black/50 p-6 rounded-2xl border-2 border-retro-brass shadow-inner my-6">
                    <p className="text-gray-400 font-mono text-sm mb-2 uppercase tracking-widest">Expected Payout</p>
                    <p className="text-4xl font-hud text-neon-green">
                      ${Math.floor(difficulty === 'HIGH' ? 400 : (150 * (wheelMultiplier > 0 ? wheelMultiplier : 1)))}
                    </p>
                    {difficulty === 'STANDARD' && wheelMultiplier > 0 && wheelMultiplier !== 1 && (
                      <p className="text-retro-gold font-pixel text-[10px] mt-3 uppercase tracking-widest animate-pulse">
                        WHEEL BONUS APPLIED ({wheelMultiplier}x)
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 font-mono italic">
                    Returning to map in 10 seconds...
                  </p>
                  <button onClick={() => router.push('/map')} className="mt-8 px-8 py-4 bg-yellow-600 text-black font-pixel text-xl rounded-xl hover:bg-yellow-500 hover:scale-105 transition-all outline-none shadow-neon-gold">
                    RETURN TO CASINO FLOOR
                  </button>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* IN-GAME MINI BROADCAST (NON-INTRUSIVE) */}
        <AnimatePresence>
          {broadcastMessage && broadcastMessage.trim() !== '' && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed bottom-4 right-4 z-[99] max-w-[280px] bg-casino-panel/90 backdrop-blur text-white p-3 rounded-lg border-l-4 border-yellow-500 shadow-lg pointer-events-none"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">⚠️</span>
                <h3 className="font-bold text-yellow-500 font-pixel uppercase text-[10px] neon-text-gold">Pit Boss</h3>
              </div>
              <p className="font-mono text-xs leading-relaxed text-gray-200">{broadcastMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============ ARCADE HUD HEADER ============ */}
        <div className="w-full max-w-6xl flex justify-between items-center mb-4 border-b border-white/10 pb-3">
          <h1 className={`text-xl font-bold font-pixel ${config.color} ${config.neonClass}`}>{config.title}</h1>
          <div className="flex gap-3 font-mono text-sm items-center">
            {walletBalance !== null && (
              <div className="px-3 py-1.5 bg-casino-surface rounded-lg border border-retro-gold/30 text-retro-gold flex items-center gap-2">
                <span>🪙</span> <span className="font-hud font-bold">${walletBalance}</span>
              </div>
            )}
            <div className={`px-3 py-1.5 rounded-lg border font-pixel text-[10px] tracking-wider
              ${difficulty === 'HIGH'
                ? 'bg-red-900/40 border-neon-red/50 text-neon-red shadow-neon-red animate-neon-pulse'
                : 'bg-green-900/40 border-neon-green/50 text-neon-green shadow-neon-green'
              }`}>
              RISK: {difficulty}
            </div>
            <div className={`px-4 py-1.5 rounded-lg border font-hud font-bold tracking-wider transition-all
              ${isTimerUrgent
                ? 'border-neon-red text-neon-red bg-red-900/30 shadow-neon-red animate-neon-pulse text-lg'
                : 'border-neon-blue/50 text-neon-blue bg-blue-900/20'
              }`}>
              ⏳ {timeLeft}
            </div>
            {teamId && (
              <LogoutButton teamId={teamId} />
            )}
          </div>
        </div>

        {/* ============ MAIN GAME AREA ============ */}
        <div className="flex w-full max-w-6xl h-[75vh] relative">

              {/* LEFT PANEL — Challenge + Output */}
              <div className="w-1/3 flex flex-col gap-4 relative overflow-hidden rounded-xl">
                {/* LOCKED OVERLAY */}
                <AnimatePresence>
                  {!isUnlockedLocally && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-xl backdrop-blur-md pointer-events-auto"
                    >
                      <span className="text-4xl mb-4">🔒</span>
                      <h2 className="text-xl font-pixel text-yellow-500 text-center animate-pulse tracking-widest leading-loose neon-text-gold">TABLE LOCKED</h2>
                      <p className="text-gray-400 font-mono text-center text-xs px-4 mt-2">Waiting for Pit Boss...</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CHALLENGE PANEL */}
                <div className="bg-casino-surface rounded-xl p-6 border border-white/10 flex-grow overflow-y-auto shadow-lg flex flex-col gap-4 noise-overlay">
                  <div className="relative z-10">
                    <h2 className="text-lg font-bold mb-4 text-retro-gold neon-text-gold">The Challenge</h2>
                    <p className={`font-sans leading-relaxed text-sm whitespace-pre-wrap ${gameId === 'roulette' ? 'text-green-400' : 'text-gray-300'}`}>
                      {dynamicConfig ? dynamicConfig.description : (gameId === 'roulette' ? "Predict the output." : "Write a Python script to solve the problem.")}
                    </p>
                    {gameId === 'roulette' && (
                      <div className="bg-black p-4 mt-4 rounded-lg border border-gray-600 font-mono text-xs whitespace-pre-wrap crt-screen text-green-400">
                        {dynamicConfig ? dynamicConfig.starter : "x = 3\ny = 5\nfor i in range(1, 4):..."}
                      </div>
                    )}
                  </div>

                  {/* TEST CASES VISUALIZER */}
                  {dynamicConfig?.test_cases && dynamicConfig.test_cases.length > 0 && gameId !== 'roulette' && (
                    <div className="mt-4 border-t border-white/10 pt-4 relative z-10">
                      <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider font-pixel text-[10px]">Test Cases</h3>
                      <div className="space-y-3">
                        {dynamicConfig.test_cases.map((tc: any, i: number) => (
                          <div key={i} className="bg-black/50 border border-gray-700 rounded-lg p-3 font-mono text-[10px] md:text-xs">
                            {tc.input && (
                              <div className="mb-2">
                                <span className="text-blue-400 font-bold block mb-1">Input:</span>
                                <div className="text-gray-300 whitespace-pre-wrap bg-black/40 p-2 rounded border border-gray-800">{tc.input}</div>
                              </div>
                            )}
                            <div>
                              <span className="text-green-400 font-bold block mb-1">Expected:</span>
                              <div className="text-gray-300 whitespace-pre-wrap bg-black/40 p-2 rounded border border-gray-800">{tc.expected}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* TERMINAL OUTPUT PANEL */}
                <div className={`bg-black rounded-xl p-4 border h-1/3 overflow-y-auto font-mono text-xs shadow-inner relative
                  ${showBustEffect ? 'animate-bust-shake border-neon-red/50' : 'border-gray-700'}
                  ${hasError ? 'border-neon-red/30' : ''}
                `}>
                  <div className="text-gray-500 mb-2 uppercase font-bold font-pixel text-[10px] tracking-wider">Terminal Output:</div>
                  <pre className={`whitespace-pre-wrap ${output?.startsWith('❌') ? 'text-neon-red' : 'text-neon-green'}`}>
                    {output}
                  </pre>
                  {/* BUST watermark on error */}
                  {showBustEffect && <div className="bust-watermark font-pixel">BUST</div>}
                </div>
              </div>

              {/* RIGHT PANEL (EDITOR) */}
              <div className={`w-2/3 rounded-xl flex flex-col relative overflow-hidden shadow-2xl
                ${showBustEffect ? 'animate-bust-shake' : ''}`}
              >
                {/* PIN LOCK OVERLAY */}
                <AnimatePresence>
                  {!isUnlockedLocally && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-6 border-2 border-dashed border-yellow-700 rounded-xl backdrop-blur-xl pointer-events-auto"
                    >
                      <h2 className="text-3xl font-pixel text-yellow-500 text-center uppercase tracking-[0.2em] leading-loose mb-2 neon-text-gold">ENTER PIN TO UNLOCK</h2>
                      <p className="font-mono text-gray-400 mb-6 text-center">Listen for the Pit Boss to announce the start PIN.</p>
                      <div className="flex flex-col gap-4 w-full max-w-sm">
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="****"
                          className="w-full bg-black border-2 border-gray-700 focus:border-yellow-500 text-yellow-400 text-4xl p-6 tracking-[0.5em] text-center rounded-xl outline-none font-hud shadow-inner placeholder:text-gray-700 placeholder:text-2xl placeholder:tracking-widest"
                          value={enteredPin}
                          onChange={(e) => setEnteredPin(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (enteredPin.trim() === actualPin?.trim()) {
                                setIsUnlockedLocally(true)
                                localStorage.setItem(`cs_unlocked_${gameId}`, actualPin!)
                              } else {
                                alert(`Incorrect PIN.\nExpected: [${actualPin}]\nYou Typed: [${enteredPin}]`)
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
                              alert(`Incorrect PIN.\nExpected: [${actualPin}]\nYou Typed: [${enteredPin}]`)
                              setEnteredPin('')
                            }
                          }}
                          className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xl py-4 rounded-xl active:scale-95 transition-all shadow-neon-gold font-pixel">
                          UNLOCK IDE
                        </button>
                        <p className="text-gray-500 text-xs text-center font-mono mt-2 flex justify-center gap-2">
                          DEBUG: <span className="text-red-500">{actualPin || "WAITING FOR DATABASE..."}</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* EDITOR OR ROULETTE INPUT OR BACCARAT MCQ */}
                {gameId === 'roulette' ? (
                  <div className="flex-grow flex flex-col items-center justify-center p-10 gap-6 relative z-10 bg-black machine-bezel crt-screen">
                    <h3 className="text-3xl font-pixel text-yellow-500 mb-2 tracking-widest neon-text-gold">SUBMIT OUTPUT</h3>
                    <p className="text-gray-400 font-mono mb-6 text-center text-sm">Analyze the code challenge on the left and enter the exact output below.</p>
                    <input
                      type="text"
                      placeholder="Type exact match..."
                      className="w-full max-w-md bg-[#000080] border-2 border-blue-900 focus:border-yellow-500 text-white text-3xl p-6 text-center rounded-xl outline-none font-hud transition-colors shadow-inner"
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                  </div>
                ) : gameId === 'baccarat' ? (
                  <div className="flex-grow flex flex-col items-center justify-center p-10 gap-6 relative z-10 bg-black machine-bezel crt-screen">
                    <h3 className="text-3xl font-pixel text-retro-gold mb-2 tracking-widest neon-text-gold">SELECT OPTION</h3>
                    <div className="w-full max-w-lg space-y-4">
                      {(dynamicConfig?.options || ['Option A', 'Option B', 'Option C', 'Option D']).map((opt: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setSelectedMcqOption(opt)}
                          className={`w-full text-left p-4 rounded-xl border-2 font-mono transition-all
                            ${selectedMcqOption === opt 
                              ? 'bg-retro-gold/20 border-retro-gold text-retro-gold shadow-neon-gold' 
                              : 'bg-black border-gray-700 text-gray-300 hover:border-gray-500'}`}
                        >
                          <span className="font-bold mr-4">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow relative z-10">
                    <CodeEditor starterCode={code} onChange={(newCode) => setCode(newCode)} isRunning={isRunning} hasError={hasError} language={language} onLanguageChange={setLanguage} onRun={() => handleSubmit(false)} />
                  </div>
                )}

                {/* BOTTOM ACTION BAR */}
                <div className="h-20 bg-casino-panel border-t border-white/10 flex items-center justify-between px-6 gap-4 z-20">
                  <button onClick={() => {
                    if (window.confirm("Are you sure you want to Give Up? You will instantly LOSE your bet and return to the map.")) {
                      router.back()
                    }
                  }} className="px-6 py-2 border border-red-900/50 text-red-500 hover:bg-red-900/20 font-bold rounded-lg uppercase text-sm transition-all hover:shadow-neon-red font-pixel text-[10px] tracking-wider">Give Up</button>
                  <button onClick={handleSubmit} disabled={isRunning} className={`px-8 py-3 font-bold rounded-lg uppercase text-lg shadow-lg transition-all font-pixel
                    ${isRunning
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-green-700 text-white hover:bg-green-500 hover:scale-105 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)]'
                    }`}>
                    {isRunning ? 'RUNNING...' : 'SUBMIT ➤'}
                  </button>
                </div>
              </div>

        </div>
      </div>
    )
  }


  // ============================================================
  // PHASE 2: BETTING — High-Stakes Dramatic Screen
  // ============================================================
  if (phase === 'BETTING') {
    return (
      <>
        {/* ADMIN WAIT MODAL */}
        <AnimatePresence>
          {showAdminWaitModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-casino-panel-light border-2 border-red-500/50 max-w-md w-full rounded-2xl shadow-neon-red p-8 text-center"
              >
                <div className="text-5xl mb-4">🛑</div>
                <h2 className="text-2xl font-pixel text-red-400 mb-4 tracking-widest uppercase">Table Not Active</h2>
                <p className="font-mono text-gray-300 text-sm mb-8">
                  Please wait for the Pit Boss to officially open this table before entering.
                </p>
                <button 
                  onClick={() => setShowAdminWaitModal(false)}
                  className="w-full py-3 bg-red-900/50 hover:bg-red-800 text-white font-bold font-pixel text-xs rounded-xl border border-red-500 transition-colors"
                >
                  ACKNOWLEDGE
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="z-10 text-center space-y-4 max-w-4xl w-full max-h-[95vh] overflow-y-auto bg-[#5C4520] border-[3px] border-retro-brass/40 p-6 md:p-8 rounded-3xl shadow-2xl custom-scrollbar"
          >
            <h1 className={`text-3xl md:text-5xl font-pixel mb-1 ${config.color} ${config.neonClass} crt-text`}>PLACE YOUR BET</h1>
            <p className="text-retro-cream/70 font-mono text-xs md:text-sm">Choose your risk. Choose your destiny.</p>

            {isBetting ? (
              <div className="mt-10 text-2xl font-mono text-retro-gold animate-pulse neon-text-gold">PROCESSING BET...</div>
            ) : gameId === 'final' ? (
              <div className="mt-10 text-2xl font-mono text-retro-gold animate-pulse neon-text-gold">LOADING FINAL ROUND...</div>
            ) : (
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`grid grid-cols-1 ${selectedBet === 'STANDARD' ? 'md:grid-cols-2' : 'md:grid-cols-2'} gap-6 md:gap-8 mt-8 w-full`}
                >
                  {/* STANDARD BET CARD */}
                  <motion.div
                    whileHover={{ scale: selectedBet === 'STANDARD' ? 1 : 1.03, y: selectedBet === 'STANDARD' ? 0 : -4 }}
                    whileTap={{ scale: selectedBet === 'STANDARD' ? 1 : 0.98 }}
                    onClick={() => setSelectedBet('STANDARD')}
                    className={`group cursor-pointer border-[3px] p-6 md:p-8 rounded-2xl transition-all relative overflow-hidden flex flex-col justify-center h-full min-h-[300px]
                      ${selectedBet === 'STANDARD' ? 'bg-[#1e4d2b] border-white shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-[#143a21] border-green-500/60 hover:border-green-400/80'}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-green-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <h3 className="text-2xl text-white font-bold mb-1 font-pixel">STANDARD</h3>
                      <div className="text-4xl font-hud font-bold text-neon-green mb-2 neon-text-green">$100</div>
                      <div className="text-base font-hud font-bold text-green-300 mb-3">Returns $150</div>
                      <p className="text-gray-400 text-sm font-mono">{gameId === 'roulette' ? 'Multiple Choice' : 'Normal Difficulty'}</p>
                      <div className="mt-3 text-[9px] font-pixel text-green-600/60 uppercase tracking-widest">SAFE BET</div>
                    </div>
                  </motion.div>

                  {/* HIGH ROLLER CARD OR SPIN WHEEL */}
                  {selectedBet === 'STANDARD' ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="h-full"
                    >
                      <SpinWheel 
                        teamId={teamId || ''} 
                        gameId={gameId}
                        onSpinStart={() => setIsSpinningWheel(true)}
                        onSpinComplete={(multiplier, newBalance) => {
                          setIsSpinningWheel(false)
                          setIsBetting(true)
                          setWheelMultiplier(multiplier)
                          setWalletBalance(newBalance)
                          setDifficulty('STANDARD')
                          localStorage.setItem(`cs_diff_${gameId}`, 'STANDARD')
                          setTimeout(() => {
                            setPhase('WAITING')
                            setIsBetting(false)
                          }, 2000)
                        }}
                        disabled={isBetting || isSpinningWheel} 
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedBet('HIGH')}
                      className={`group cursor-pointer border-[3px] p-6 md:p-8 rounded-2xl transition-all relative overflow-hidden flex flex-col justify-center h-full min-h-[300px]
                        ${selectedBet === 'HIGH' ? 'bg-[#2a0a0a] border-neon-red shadow-neon-red' : 'bg-[#1a0a0a] border-red-900/60 hover:border-neon-red/80'}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <h3 className="text-2xl text-white font-bold mb-1 font-pixel">HIGH ROLLER</h3>
                        <div className="text-4xl font-hud font-bold text-neon-red mb-2 neon-text-red">$200</div>
                        <div className="text-base font-hud font-bold text-red-300 mb-3">Returns $400</div>
                        <p className="text-gray-400 text-sm font-mono">{gameId === 'roulette' ? 'Exact Match Input' : 'Extreme Difficulty'}</p>
                        <div className="mt-3 text-[9px] font-pixel text-red-600/60 uppercase tracking-widest">HIGH RISK • HIGH REWARD</div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="mt-4 w-full flex flex-col items-center gap-3">
                  {selectedBet === 'STANDARD' && wheelMultiplier === 0 && (
                    <button onClick={() => setSelectedBet(null)} className="text-gray-400 hover:text-white text-[10px] font-pixel tracking-widest uppercase mb-1 transition-colors">
                      ← CANCEL AND CHANGE BET TYPE
                    </button>
                  )}
                  <button 
                    onClick={handleBet}
                    disabled={!selectedBet || isBetting || isSpinningWheel}
                    className={`px-6 py-3 font-bold rounded-xl uppercase text-sm shadow-lg transition-all font-pixel w-full max-w-md
                      ${selectedBet && !isBetting && !isSpinningWheel
                        ? 'bg-retro-gold text-black hover:bg-yellow-400 hover:scale-105 shadow-neon-gold cursor-pointer' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      }`}
                  >
                    {isSpinningWheel ? 'SPINNING WHEEL...' : isBetting ? 'ENTERING CASINO...' : 'CONFIRM CHOICES & ENTER'}
                  </button>
                  <button onClick={() => router.back()} className="text-gray-500 hover:text-white text-[9px] disabled:opacity-0 font-pixel tracking-widest uppercase transition-colors" disabled={isBetting}>
                    ← BACK TO MAP
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </>
    )
  }

  // ============================================================
  // PHASE 1: RULES — Game Entry Modal
  // ============================================================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-casino-panel-light border-2 border-white/20 max-w-2xl w-full rounded-2xl shadow-2xl relative overflow-hidden"
      >
        {/* Color accent bar */}
        <div className={`h-2 w-full ${config.bg.replace('/20', '')}`} />
        <div className="p-8">
          <h1 className={`text-3xl font-pixel mb-2 ${config.color} ${config.neonClass}`}>{config.title}</h1>
          <p className="text-lg text-white/80 mb-6 italic border-b border-gray-700/50 pb-4 font-mono">&quot;{config.description}&quot;</p>
          <div className="space-y-4 mb-8">
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-[10px] font-pixel">HOW TO PLAY:</h3>
            <ul className="space-y-3">
              {config.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300 font-mono text-sm">
                  <span className={`${config.color} font-bold font-pixel text-xs`}>[0{i + 1}]</span>{rule}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.back()} className="flex-1 px-4 py-3 border border-gray-600/50 text-gray-400 hover:bg-gray-800 font-bold rounded-xl uppercase text-sm font-pixel text-[10px] transition-colors">Cancel</button>
            <button onClick={() => {
              if (gameId === 'final') {
                setDifficulty('STANDARD')
                localStorage.setItem(`cs_diff_${gameId}`, 'STANDARD')
                setPhase('WAITING')
              } else {
                setPhase('BETTING')
              }
            }} className={`flex-1 px-4 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl uppercase text-sm font-pixel text-[10px] border-b-4 border-gray-400 active:border-b-0 active:translate-y-1 transition-all`}>I Understand →</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}