'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation' // <--- Added Router
import { supabase } from '@/lib/supabase/client'
import { AVATAR_LIST, getAvatarUrl } from '@/lib/avatars'

// --- CONFIGURATION ---
const CELL = 40 // px
const GRID_W = 24
const GRID_H = 18

// --- ASSETS ---
const DEALER_AVATAR = `https://api.dicebear.com/9.x/pixel-art/svg?seed=DEALER&backgroundColor=ffdfbf`

// --- 5 TABLES (CASINO THEME CONFIGURATION) ---
const TABLES = [
  // --- TOP ROW ---
  {
    id: 'T1', label: 'SLOTS (DEBUG)',
    route: 'slots', // <--- Destination URL
    x: 4, y: 4,
    chairs: [
      { id: 'c1', x: 3, y: 4 }, { id: 'c2', x: 3, y: 5 },
      { id: 'c3', x: 7, y: 4 }, { id: 'c4', x: 7, y: 5 },
      { id: 'c5', x: 5, y: 6 },
    ],
    dealers: [{ x: 5, y: 3 }, { x: 6, y: 3 }]
  },
  {
    id: 'T2', label: 'ROULETTE (PREDICT)',
    route: 'roulette',
    x: 16, y: 4,
    chairs: [
      { id: 'c1', x: 15, y: 4 }, { id: 'c2', x: 15, y: 5 },
      { id: 'c3', x: 19, y: 4 }, { id: 'c4', x: 19, y: 5 },
      { id: 'c5', x: 17, y: 6 },
    ],
    dealers: [{ x: 17, y: 3 }, { x: 18, y: 3 }]
  },

  // --- CENTER VIP ---
  {
    id: 'T3', label: 'BLACKJACK (VIP)',
    route: 'blackjack',
    x: 10, y: 9,
    chairs: [
      { id: 'c1', x: 9, y: 9 }, { id: 'c2', x: 9, y: 10 },
      { id: 'c3', x: 13, y: 9 }, { id: 'c4', x: 13, y: 10 },
      { id: 'c5', x: 11, y: 11 },
    ],
    dealers: [{ x: 11, y: 8 }, { x: 12, y: 8 }]
  },

  // --- BOTTOM ROW ---
  {
    id: 'T4', label: 'HOLDEM (OPTIMIZE)',
    route: 'holdem',
    x: 4, y: 14,
    chairs: [
      { id: 'c1', x: 3, y: 14 }, { id: 'c2', x: 3, y: 15 },
      { id: 'c3', x: 7, y: 14 }, { id: 'c4', x: 7, y: 15 },
      { id: 'c5', x: 5, y: 16 },
    ],
    dealers: [{ x: 5, y: 13 }, { x: 6, y: 13 }]
  },
  {
    id: 'T5', label: 'CRAPS (LOGIC)',
    route: 'craps',
    x: 16, y: 14,
    chairs: [
      { id: 'c1', x: 15, y: 14 }, { id: 'c2', x: 15, y: 15 },
      { id: 'c3', x: 19, y: 14 }, { id: 'c4', x: 19, y: 15 },
      { id: 'c5', x: 17, y: 16 },
    ],
    dealers: [{ x: 17, y: 13 }, { x: 18, y: 13 }]
  }
]

interface MapClientProps {
  userData: {
    id: string
    wallet_balance: number
    avatar_id: number
  }
}

type Player = {
  id: string
  x: number
  y: number
  avatar_id: number
}

export default function MapClient({ userData }: MapClientProps) {
  const router = useRouter() // <--- Hook for navigation
  const [position, setPosition] = useState({ x: 12, y: 1 })
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [otherPlayers, setOtherPlayers] = useState<Record<string, Player>>({})
  const [nearTable, setNearTable] = useState<string | null>(null) // Stores 'slots', 'poker', etc.

  // --- HUD STATE ---
  const [walletBalance, setWalletBalance] = useState<number>(userData.wallet_balance)
  const [stamps, setStamps] = useState<Record<string, boolean>>({})
  const [history, setHistory] = useState<any[]>([])
  const [isWarning, setIsWarning] = useState<boolean>(false)

  // --- BROADCAST STATE ---
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null)

  const lastUpdate = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // --- CAMERA FOLLOW ---
  useEffect(() => {
    if (scrollRef.current) {
      const playerPixelX = position.x * CELL + (CELL / 2)
      const playerPixelY = position.y * CELL + (CELL / 2)

      const vw = scrollRef.current.clientWidth
      const vh = scrollRef.current.clientHeight

      // The container has 32px (p-8) padding to consider
      scrollRef.current.scrollTo({
        left: playerPixelX - vw / 2 + 32,
        top: playerPixelY - vh / 2 + 32,
        behavior: 'smooth'
      })
    }
  }, [position])

  // --- GET MY AVATAR URL ---
  const mySeed = AVATAR_LIST.find(a => a.id === userData.avatar_id)?.seed || 'Felix'
  const mySpriteUrl = getAvatarUrl(mySeed)

  // --- COLLISION LOGIC ---
  const isBlocked = (x: number, y: number) => {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return true
    for (const t of TABLES) {
      if (x >= t.x && x <= t.x + 2 && y >= t.y && y <= t.y + 1) return true
    }
    for (const t of TABLES) {
      for (const d of t.dealers) {
        if (x === d.x && y === d.y) return true
      }
    }
    return false
  }

  // --- MULTIPLAYER P2P SYNC ---
  useEffect(() => {
    // 1. Fetch Initial HUD Data and unlock player from any previous game
    async function fetchHud() {
      const { fetchTeamHistory, unlockPlayer } = await import('@/app/actions')
      await unlockPlayer(userData.id)

      const teamData = await supabase.from('teams').select('stamps, wallet_balance').eq('id', userData.id).maybeSingle().then(res => res.data as any)
      if (teamData) {
        if (teamData.stamps) setStamps(teamData.stamps as Record<string, boolean>)
        setWalletBalance(teamData.wallet_balance)
      }

      const txData = await fetchTeamHistory(userData.id)
      if (txData.history) setHistory(txData.history)
    }
    fetchHud()

    // 2. Realtime Subscriptions (Wallet, Badges, Bans)
    const teamChannel = supabase.channel('map_team_hud')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${userData.id}` }, (payload) => {
        const newRecord = payload.new as any
        setWalletBalance(newRecord.wallet_balance)
        if (newRecord.stamps) setStamps(newRecord.stamps as Record<string, boolean>)

        if (newRecord.current_locked_table === 'WARNING') {
          setIsWarning(true)
          setTimeout(() => setIsWarning(false), 3000)
        } else if (newRecord.current_locked_table === 'BANNED') {
          alert("YOU ARE BANNED FROM THE CASINO.")
          window.location.href = '/'
        }
      })
      .subscribe()

    // 3. Realtime Transactions
    const txChannel = supabase.channel('map_tx_hud')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `team_id=eq.${userData.id}` }, (payload) => {
        setHistory(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    // 4. Movement P2P
    const channel = supabase.channel('room_1')
      .on('broadcast', { event: 'pos' }, (payload) => {
        if (payload.payload.id !== userData.id) {
          setOtherPlayers(prev => ({
            ...prev,
            [payload.payload.id]: payload.payload
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(teamChannel)
      supabase.removeChannel(txChannel)
    }
  }, [userData.id])

  // --- GLOBAL BROADCAST RECEIVER ---
  // Auto-dismiss broadcast after 1 minute (60000 ms)
  useEffect(() => {
    if (broadcastMessage && broadcastMessage.trim() !== '') {
      const timer = setTimeout(() => {
        setBroadcastMessage(null)
      }, 60000)
      return () => clearTimeout(timer)
    }
  }, [broadcastMessage])

  // Realtime Subscriptions & Polling Fallback for Event Broadcasts
  useEffect(() => {
    // WebSockets
    const eventChannel = supabase.channel('map_event_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_control', filter: 'id=eq.1' }, (payload) => {
        const newRecord = payload.new as any
        if (newRecord.current_round && newRecord.current_round.startsWith('BROADCAST:')) {
          setBroadcastMessage(newRecord.current_round.replace('BROADCAST:', ''))
        } else {
          setBroadcastMessage(null)
        }
      })
      .subscribe()

    // 5-Second Polling Fallback (Failsafe)
    const pollInterval = setInterval(async () => {
      const eventData = await supabase.from('event_control').select('current_round').eq('id', 1).maybeSingle().then(res => res.data as any)
      if (eventData) {
        if (eventData.current_round && eventData.current_round.startsWith('BROADCAST:')) {
          setBroadcastMessage(eventData.current_round.replace('BROADCAST:', ''))
        } else {
          setBroadcastMessage(null)
        }
      }
    }, 5000)

    return () => {
      supabase.removeChannel(eventChannel)
      clearInterval(pollInterval)
    }
  }, [])

  // --- MOVEMENT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) e.preventDefault();

      setPosition((prev) => {
        let newPos = { ...prev }
        let newDir = direction

        if (e.key === 'ArrowUp') newPos.y -= 1
        if (e.key === 'ArrowDown') newPos.y += 1
        if (e.key === 'ArrowLeft') { newPos.x -= 1; newDir = 'left' }
        if (e.key === 'ArrowRight') { newPos.x += 1; newDir = 'right' }

        if (isBlocked(newPos.x, newPos.y)) return prev

        setDirection(newDir)

        // Check for Chair "Snapping"
        let foundTableRoute = null
        for (const t of TABLES) {
          if (t.chairs.some(c => c.x === newPos.x && c.y === newPos.y)) {
            foundTableRoute = t.route // <--- Capture the route (e.g., 'slots')
          }
        }
        setNearTable(foundTableRoute)

        // Broadcast Position
        const now = Date.now()
        if (now - lastUpdate.current > 50) {
          supabase.channel('room_1').send({
            type: 'broadcast',
            event: 'pos',
            payload: {
              id: userData.id,
              x: newPos.x,
              y: newPos.y,
              avatar_id: userData.avatar_id
            }
          })
          lastUpdate.current = now
        }

        return newPos
      })

      // --- NAVIGATION TRIGGER ---
      if (e.key === 'Enter' && nearTable) {
        // Redirect to the Game Page
        router.push(`/game/${nearTable}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nearTable, direction, userData.id, userData.avatar_id, router]) // Added router to dependency

  return (
    <div className="flex w-full h-screen bg-[#1a1a24] select-none overflow-hidden relative">

      {/* WARNING OVERLAY */}
      {isWarning && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur flex items-center justify-center pointer-events-auto border-[16px] border-red-600 animate-pulse">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-pixel text-red-500 bg-red-900/40 p-10 rounded-2xl border-4 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.6)]">
              ⚠️ WARNING FROM PIT BOSS ⚠️
            </h1>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR: PROFILE & BADGES */}
      <div className="w-80 h-full bg-[#12121a] border-r border-white/10 p-5 overflow-y-auto hidden xl:flex flex-col gap-6 shadow-2xl z-40 text-white shrink-0">
        <div className="flex items-center gap-4 border-b border-white/10 pb-4">
          <img src={mySpriteUrl} className="w-16 h-16 rounded bg-blue-500/20" alt="Me" />
          <div>
            <div className="text-xs text-retro-gold font-pixel uppercase">TEAM PROFILE</div>
            <div className="text-2xl font-mono font-bold">{userData.id.substring(0, 8)}</div>
          </div>
        </div>

        <div className="bg-[#1a1a24] p-4 rounded-lg border border-retro-gold/30 shadow-inner">
          <div className="text-[10px] text-gray-400 font-pixel mb-1">LIVE BALANCE</div>
          <div className="text-4xl font-mono font-bold text-retro-gold">${walletBalance}</div>
        </div>

        <div>
          <div className="text-xs font-pixel text-white mb-3">BADGES EARNED</div>
          <div className="grid grid-cols-2 gap-3">
            {TABLES.map(t => (
              <div key={t.id} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${stamps[t.route] ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/40 border-white/5 text-gray-600 grayscale opacity-50'}`}>
                <span className="text-2xl mb-1">{t.id.includes('SLOTS') ? '🎰' : t.id.includes('ROULETTE') ? '🎯' : t.id.includes('BLACK') ? '🃏' : t.id.includes('HOLD') ? '♠️' : '🎲'}</span>
                <span className="text-[8px] font-pixel text-center leading-tight">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CENTER: GAME ROOM */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto relative p-8 scrollbar-thin scrollbar-thumb-white/20 hide-scrollbar-mobile"
      >
        <div
          className="relative bg-wood-floor shadow-2xl rounded-xl overflow-hidden border-8 border-[#2a2b38] mx-auto"
          style={{ width: GRID_W * CELL, height: GRID_H * CELL, minWidth: GRID_W * CELL, minHeight: GRID_H * CELL }}
        >

          {/* 1. RENDER TABLES */}
          {TABLES.map(t => (
            <div key={t.id} className="absolute z-10"
              style={{
                left: t.x * CELL, top: t.y * CELL,
                width: 3 * CELL, height: 2 * CELL
              }}
            >
              <div className="w-full h-full bg-[#064e3b] border-4 border-[#3f2e18] rounded-lg shadow-lg relative group">
                <div className="absolute inset-2 border-2 border-white/10 rounded-full opacity-50"></div>
                {/* Table Label */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-full">
                  <span className="text-[6px] text-retro-gold font-bold bg-black/50 px-1 rounded mb-1">{t.id}</span>
                  <span className="text-[5px] text-white/70 font-bold text-center leading-tight px-1">{t.label}</span>
                </div>
              </div>
            </div>
          ))}

          {/* 2. RENDER DEALERS */}
          {TABLES.map(t => t.dealers.map((d, i) => (
            <div key={`d-${t.id}-${i}`} className="absolute z-10"
              style={{ left: d.x * CELL, top: d.y * CELL, width: CELL, height: CELL }}
            >
              <img src={DEALER_AVATAR} className="w-full h-full scale-90" alt="Dealer" />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-red-500 text-[6px] px-1 rounded">DEALER</div>
            </div>
          )))}

          {/* 3. RENDER CHAIRS */}
          {TABLES.map(t => t.chairs.map((c, i) => (
            <div key={`c-${t.id}-${i}`} className="absolute"
              style={{ left: c.x * CELL, top: c.y * CELL, width: CELL, height: CELL }}
            >
              <div className={`w-full h-full border-2 rounded-full scale-75 transition-colors ${nearTable === t.route ? 'border-green-400 bg-green-500/20' : 'border-white/10 bg-black/20'
                }`}></div>
            </div>
          )))}

          {/* 4. OTHER PLAYERS */}
          {Object.values(otherPlayers).map(p => {
            const otherSeed = AVATAR_LIST.find(a => a.id === p.avatar_id)?.seed || 'Felix'
            const otherSpriteUrl = getAvatarUrl(otherSeed)

            return (
              <div key={p.id} className="absolute z-20 transition-all duration-200 ease-linear"
                style={{ left: p.x * CELL, top: p.y * CELL, width: CELL, height: CELL }}
              >
                <img src={otherSpriteUrl} className="w-full h-full drop-shadow-md opacity-70 grayscale-[0.3]" alt="Other" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white/50 text-[8px]">PLAYER</div>
              </div>
            )
          })}

          {/* 5. MY PLAYER */}
          <div className="absolute z-30 transition-all duration-100 ease-linear"
            style={{ left: position.x * CELL, top: position.y * CELL, width: CELL, height: CELL }}
          >
            {nearTable && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 interact-bubble whitespace-nowrap z-50">
                <div className="bg-retro-green text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg border-2 border-black animate-bounce">
                  PRESS ENTER
                </div>
              </div>
            )}

            <img
              src={mySpriteUrl}
              className={`w-full h-full drop-shadow-xl transform ${direction === 'left' ? 'scale-x-[-1]' : ''}`}
              alt="Me"
            />
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-retro-gold text-black text-[8px] px-1 rounded font-bold">YOU</div>
          </div>

        </div>
        <div className="mt-4 text-xs text-gray-500 font-pixel text-center">
          USE ARROW KEYS • ENTER TO PLAY
        </div>
      </div>

      {/* RIGHT SIDEBAR: BROADCASTS & TRANSACTION HISTORY */}
      <div className="w-80 h-full bg-[#12121a] border-l border-white/10 p-5 hidden xl:flex flex-col shadow-2xl z-40 text-white shrink-0">

        {/* INLINE BROADCAST PANEL */}
        {broadcastMessage && broadcastMessage.trim() !== '' && (
          <div className="mb-6 bg-red-900/10 border border-red-500/30 rounded-lg p-4 shrink-0">
            <div className="flex items-center gap-2 mb-2 pb-2">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-red-500 font-pixel uppercase text-xs">Pit Boss</h3>
            </div>
            <p className="font-mono text-xs leading-relaxed text-red-300 break-words">{broadcastMessage}</p>
          </div>
        )}
        <h2 className="text-sm font-pixel text-retro-gold mb-4 border-b border-white/10 pb-4 shrink-0">CREDIT HISTORY</h2>
        <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {history.length === 0 ? (
            <div className="text-xs text-gray-500 font-mono text-center mt-10">No transactions yet.</div>
          ) : (
            history.map((tx: any, i: number) => (
              <div key={i} className="bg-[#1a1a24] p-3 rounded-lg border border-white/5 flex justify-between items-start gap-2 max-w-full">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-gray-300 break-words">{tx.description}</div>
                  <div className="text-[9px] text-gray-600 font-mono mt-1">{new Date(tx.created_at).toLocaleTimeString()}</div>
                </div>
                <div className={`font-mono text-sm font-bold shrink-0 ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
