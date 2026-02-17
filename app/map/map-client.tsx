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
  
  const lastUpdate = useRef(0)

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

  // --- MULTIPLAYER SYNC ---
  useEffect(() => {
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
    }
  }, [userData.id])

  // --- MOVEMENT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) e.preventDefault();

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1a24] select-none overflow-hidden">
      
      {/* HUD */}
      <div className="absolute top-4 left-4 z-50 bg-[#2a2b38] text-white p-3 rounded-lg border border-white/10 shadow-xl flex items-center gap-3">
        <img src={mySpriteUrl} className="w-8 h-8 rounded bg-blue-500/20" alt="Me" />
        <div>
          <div className="text-[10px] text-gray-400 font-bold uppercase">YOU</div>
          <div className="text-sm font-bold text-retro-gold">${userData.wallet_balance}</div>
        </div>
      </div>

      {/* GAME ROOM */}
      <div 
        className="relative bg-wood-floor shadow-2xl rounded-xl overflow-hidden border-8 border-[#2a2b38]"
        style={{ width: GRID_W * CELL, height: GRID_H * CELL }}
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
            <div className={`w-full h-full border-2 rounded-full scale-75 transition-colors ${
              nearTable === t.route ? 'border-green-400 bg-green-500/20' : 'border-white/10 bg-black/20'
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

      <div className="mt-4 text-xs text-gray-500 font-pixel">
        USE ARROW KEYS • ENTER TO PLAY
      </div>
    </div>
  )
}