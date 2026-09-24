/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { AVATAR_LIST, getAvatarUrl } from '@/lib/avatars'
import LogoutButton from '@/components/LogoutButton'

// --- CONFIGURATION ---
const LOBBY_W = 20
const LOBBY_H = 20
const WING_W = 34
const WING_H = 34

const VIP_W = 28
const VIP_H = 28

export type Scene = 'LOBBY' | 'WING_1' | 'WING_2' | 'VIP_ROOM'

// --- ASSETS ---
const DEALER_AVATAR = `https://api.dicebear.com/9.x/pixel-art/svg?seed=DEALER&backgroundColor=ffdfbf`

// --- TABLE CONFIG (per-game emoji & warm colors) ---
const TABLE_EMOJI: Record<string, string> = {
  slots: '🎰', roulette: '🎯', blackjack: '🃏', craps: '🎲', poker: '🕵️',
  baccarat: '🏦', dice: '🎲', highcard: '🃏', coinflip: '🪙', vault: '🔐', final: '🏆',
}
const TABLE_COLOR: Record<string, string> = {
  slots: '#B5A642', roulette: '#722F37', blackjack: '#1B5E3B', craps: '#6B4E1E', poker: '#4A7C59',
  baccarat: '#3A2E39', dice: '#5C3A21', highcard: '#1F3C4D', coinflip: '#8C6C3F', vault: '#2A303C', final: '#B5A642',
}

// Helper to generate room walls with doors
function generatePerimeter(doorLeft: boolean, doorRight: boolean, doorTop: boolean, doorBottom: boolean, w: number, h: number): { x: number, y: number, className?: string }[] {
  const walls: { x: number, y: number, className?: string }[] = []
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const isTop = y === 0
      const isBottom = y === h - 1
      const isLeft = x === 0
      const isRight = x === w - 1
      if (!isTop && !isBottom && !isLeft && !isRight) continue

      let isDoor = false
      const midX = Math.floor(w / 2)
      const midY = Math.floor(h / 2)
      if (doorTop && isTop && x >= midX - 2 && x <= midX + 1) isDoor = true
      if (doorBottom && isBottom && x >= midX - 2 && x <= midX + 1) isDoor = true
      if (doorLeft && isLeft && y >= midY - 2 && y <= midY + 1) isDoor = true
      if (doorRight && isRight && y >= midY - 2 && y <= midY + 1) isDoor = true

      if (!isDoor) walls.push({ x, y })
    }
  }
  return walls
}

// Generate walls for cabins
function generateCabins(tables: any[]): { x: number, y: number, className?: string }[] {
  const walls: { x: number, y: number, className?: string }[] = []
  for (const t of tables) {
    const cx = t.x - 3
    const cy = t.y - 3
    for (let x = cx; x <= cx + 8; x++) {
      for (let y = cy; y <= cy + 8; y++) {
        let isWall = false
        
        // Top and Bottom flat edges
        if ((y === cy || y === cy + 8) && x >= cx + 2 && x <= cx + 6) isWall = true
        
        // Left and Right flat edges
        if ((x === cx || x === cx + 8) && y >= cy + 2 && y <= cy + 6) isWall = true
        
        // Diagonals (Zigzag)
        if ((x === cx + 1 || x === cx + 7) && (y === cy + 1 || y === cy + 7)) isWall = true
        
        if (!isWall) continue
        
        // Doorway on the bottom wall
        if (y === cy + 8 && x >= t.x && x <= t.x + 2) continue

        walls.push({ x, y })
      }
    }
  }
  return walls
}

const WING_1_TABLES = [
  { id: 'T1', label: 'SLOTS', sublabel: 'Bug Bounty', route: 'slots', x: 6, y: 6, chairs: [{ id: 'c1', x: 5, y: 7 }, { id: 'c2', x: 9, y: 7 }, { id: 'c3', x: 7, y: 8 }], dealers: [{ x: 7, y: 5 }, { x: 8, y: 5 }] },
  { id: 'T2', label: 'ROULETTE', sublabel: 'Output Oracle', route: 'roulette', x: 24, y: 6, chairs: [{ id: 'c1', x: 23, y: 7 }, { id: 'c2', x: 27, y: 7 }, { id: 'c3', x: 25, y: 8 }], dealers: [{ x: 25, y: 5 }, { x: 26, y: 5 }] },
  { id: 'T3', label: 'BLACKJACK', sublabel: 'Code Relay', route: 'blackjack', x: 15, y: 15, chairs: [{ id: 'c1', x: 14, y: 16 }, { id: 'c2', x: 18, y: 16 }, { id: 'c3', x: 16, y: 17 }], dealers: [{ x: 16, y: 14 }, { x: 17, y: 14 }] },
  { id: 'T4', label: 'CRAPS', sublabel: 'Debug Detective', route: 'craps', x: 6, y: 24, chairs: [{ id: 'c1', x: 5, y: 25 }, { id: 'c2', x: 9, y: 25 }, { id: 'c3', x: 7, y: 26 }], dealers: [{ x: 7, y: 23 }, { x: 8, y: 23 }] },
  { id: 'T5', label: 'POKER', sublabel: 'Cipher Crack', route: 'poker', x: 24, y: 24, chairs: [{ id: 'c1', x: 23, y: 25 }, { id: 'c2', x: 27, y: 25 }, { id: 'c3', x: 25, y: 26 }], dealers: [{ x: 25, y: 23 }, { x: 26, y: 23 }] },
]

const WING_2_TABLES = [
  { id: 'T6', label: 'BACCARAT', sublabel: 'SQL Heist', route: 'baccarat', x: 6, y: 6, chairs: [{ id: 'c1', x: 5, y: 7 }, { id: 'c2', x: 9, y: 7 }, { id: 'c3', x: 7, y: 8 }], dealers: [{ x: 7, y: 5 }, { x: 8, y: 5 }] },
  { id: 'T7', label: 'DICE', sublabel: 'Stack Attack', route: 'dice', x: 24, y: 6, chairs: [{ id: 'c1', x: 23, y: 7 }, { id: 'c2', x: 27, y: 7 }, { id: 'c3', x: 25, y: 8 }], dealers: [{ x: 25, y: 5 }, { x: 26, y: 5 }] },
  { id: 'T8', label: 'HIGH CARD', sublabel: 'Complexity Clash', route: 'highcard', x: 15, y: 15, chairs: [{ id: 'c1', x: 14, y: 16 }, { id: 'c2', x: 18, y: 16 }, { id: 'c3', x: 16, y: 17 }], dealers: [{ x: 16, y: 14 }, { x: 17, y: 14 }] },
  { id: 'T9', label: 'COIN FLIP', sublabel: 'Algorithm Auction', route: 'coinflip', x: 6, y: 24, chairs: [{ id: 'c1', x: 5, y: 25 }, { id: 'c2', x: 9, y: 25 }, { id: 'c3', x: 7, y: 26 }], dealers: [{ x: 7, y: 23 }, { x: 8, y: 23 }] },
  { id: 'T10', label: 'THE VAULT', sublabel: 'DSA Challenge', route: 'vault', x: 24, y: 24, chairs: [{ id: 'c1', x: 23, y: 25 }, { id: 'c2', x: 27, y: 25 }, { id: 'c3', x: 25, y: 26 }], dealers: [{ x: 25, y: 23 }, { x: 26, y: 23 }] },
]

const LOBBY_WALLS = generatePerimeter(true, true, true, true, LOBBY_W, LOBBY_H)
const WING_1_WALLS = [...generatePerimeter(false, true, false, false, WING_W, WING_H), ...generateCabins(WING_1_TABLES)]
const WING_2_WALLS = [...generatePerimeter(true, false, false, false, WING_W, WING_H), ...generateCabins(WING_2_TABLES)]
const VIP_WALLS = generatePerimeter(false, false, false, true, VIP_W, VIP_H)

const LOBBY_ROOM = [{ id: 'lobby', x: 1, y: 1, w: LOBBY_W-2, h: LOBBY_H-2, floor: 'floor-playing-cards', label: 'THE GRAND LOBBY', wallType: 'wall-walnut' }]
const WING_1_ROOM = [{ id: 'w1', x: 1, y: 1, w: WING_W-2, h: WING_H-2, floor: 'floor-felt', label: '♦ WING 1', wallType: 'wall-wood' }]
const WING_2_ROOM = [{ id: 'w2', x: 1, y: 1, w: WING_W-2, h: WING_H-2, floor: 'floor-felt', label: '♣ WING 2', wallType: 'wall-wood' }]
const VIP_ROOM = [{ id: 'vip', x: 1, y: 1, w: VIP_W-2, h: VIP_H-2, floor: 'floor-royal', label: '🏆 VIP PENTHOUSE', wallType: 'wall-walnut' }]



const VIP_TABLES = [
  { id: 'FINAL', label: 'FINAL SHOWDOWN', sublabel: 'All In', route: 'final', x: 12, y: 12, chairs: [{ id: 'c1', x: 11, y: 12 }, { id: 'c2', x: 11, y: 13 }, { id: 'c3', x: 12, y: 14 }, { id: 'c4', x: 13, y: 14 }, { id: 'c5', x: 14, y: 14 }, { id: 'c6', x: 15, y: 12 }, { id: 'c7', x: 15, y: 13 }], dealers: [{ x: 13, y: 11 }, { x: 14, y: 11 }] }
]

const LOBBY_DECORATIONS: any[] = []

const LOBBY_BOUNCERS = [
  { x: 7, y: 1, label: 'BOUNCER' },
  { x: 12, y: 1, label: 'BOUNCER' }
]

interface MapClientProps {
  userData: {
    id: string
    access_code: string
    wallet_balance: number
    avatar_id: number
    in_round_2?: boolean
  }
}

type Player = {
  id: string
  x: number
  y: number
  avatar_id: number
  scene: Scene
}

export default function MapClient({ userData }: MapClientProps) {
  const router = useRouter()
  const [CELL, setCELL] = useState(40)
  const [scene, setScene] = useState<Scene>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('cs_map_scene') as Scene) || 'LOBBY'
    return 'LOBBY'
  })
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cs_map_pos')
      if (saved) {
        let p = JSON.parse(saved)
        const scene = localStorage.getItem('cs_map_scene') || 'LOBBY'
        const w = scene === 'LOBBY' ? LOBBY_W : scene === 'VIP_ROOM' ? VIP_W : WING_W
        const h = scene === 'LOBBY' ? LOBBY_H : scene === 'VIP_ROOM' ? VIP_H : WING_H
        if (p.x < 1 || p.x >= w - 1 || p.y < 1 || p.y >= h - 1) {
          return { x: Math.floor(w/2), y: Math.floor(h/2) }
        }
        return p
      }
    }
    return { x: 9, y: 9 }
  })
  const [direction, setDirection] = useState<'left' | 'right'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('cs_map_dir') as 'left'|'right') || 'right'
    return 'right'
  })
  const [otherPlayers, setOtherPlayers] = useState<Record<string, Player>>({})
  const [nearTable, setNearTable] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  // Persist map state
  useEffect(() => {
    localStorage.setItem('cs_map_scene', scene)
    localStorage.setItem('cs_map_pos', JSON.stringify(position))
    localStorage.setItem('cs_map_dir', direction)
  }, [scene, position, direction])

  const [isMoving, setIsMoving] = useState(false)
  // --- ROUND 2 STATE ---
  const [inRound2, setInRound2] = useState<boolean>(userData.in_round_2 || false)
  const [isRound2Open, setIsRound2Open] = useState<boolean>(false)
  const [showBetModal, setShowBetModal] = useState<boolean>(false)
  const [betAmount, setBetAmount] = useState<number | ''>(() => Math.min(500, userData.wallet_balance))
  const [isBetting, setIsBetting] = useState<boolean>(false)

  // --- HUD STATE ---
  const [walletBalance, setWalletBalance] = useState<number>(userData.wallet_balance)
  const [stamps, setStamps] = useState<Record<string, boolean>>({})
  const [history, setHistory] = useState<any[]>([])
  const [isWarning, setIsWarning] = useState<boolean>(false)
  const [showHistory, setShowHistory] = useState(false)

  // --- BROADCAST STATE ---
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null)

  // --- BOUNCER STATE ---
  const [bouncerMsg, setBouncerMsg] = useState<{ left: string | null, right: string | null }>({ left: null, right: null })
  const bouncerTimeout = useRef<NodeJS.Timeout | null>(null)

  const triggerBouncerMsg = (left: string | null, right: string | null) => {
    setBouncerMsg({ left, right })
    if (bouncerTimeout.current) clearTimeout(bouncerTimeout.current)
    bouncerTimeout.current = setTimeout(() => {
      setBouncerMsg({ left: null, right: null })
    }, 4000)
  }

  // --- STATE REFS FOR EVENT LISTENERS ---
  const sceneRef = useRef(scene)
  const posRef = useRef(position)
  const dirRef = useRef(direction)
  const lastBroadcastId = useRef(0)
  const nearTableRef = useRef(nearTable)
  const inRound2Ref = useRef(inRound2)
  const isRound2OpenRef = useRef(isRound2Open)
  const stampsRef = useRef(stamps)

  useEffect(() => { sceneRef.current = scene }, [scene])
  useEffect(() => { stampsRef.current = stamps }, [stamps])

  useEffect(() => { posRef.current = position }, [position])
  useEffect(() => { dirRef.current = direction }, [direction])
  useEffect(() => { nearTableRef.current = nearTable }, [nearTable])
  useEffect(() => { inRound2Ref.current = inRound2 }, [inRound2])
  useEffect(() => { isRound2OpenRef.current = isRound2Open }, [isRound2Open])

  const lastUpdate = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const moveTimeout = useRef<NodeJS.Timeout | null>(null)

  // --- RESPONSIVE CELL SIZING ---
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== 'undefined') {
        const vw = window.innerWidth
        const currentGridW = scene === 'LOBBY' ? LOBBY_W : scene === 'VIP_ROOM' ? VIP_W : WING_W
        setCELL(vw / currentGridW)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [scene])

  // --- CAMERA FOLLOW ---
  useEffect(() => {
    if (scrollRef.current) {
      const playerPixelX = position.x * CELL + (CELL / 2)
      const playerPixelY = position.y * CELL + (CELL / 2)
      const vw = scrollRef.current.clientWidth
      const vh = scrollRef.current.clientHeight
      scrollRef.current.scrollTo({
        left: playerPixelX - vw / 2 + 32,
        top: playerPixelY - vh / 2 + 32,
        behavior: 'smooth'
      })
    }
  }, [position, CELL])

  // --- GET MY AVATAR URL ---
  const mySeed = AVATAR_LIST.find(a => a.id === userData.avatar_id)?.seed || 'Felix'
  const mySpriteUrl = getAvatarUrl(mySeed)

  // --- COLLISION LOGIC (uses refs for always-fresh state) ---
  const isBlocked = (x: number, y: number) => {
    const gridW = sceneRef.current === 'LOBBY' ? LOBBY_W : sceneRef.current === 'VIP_ROOM' ? VIP_W : WING_W
    const gridH = sceneRef.current === 'LOBBY' ? LOBBY_H : sceneRef.current === 'VIP_ROOM' ? VIP_H : WING_H

    if (x < 0 || x >= gridW || y < 0 || y >= gridH) return true

    const activeWalls = sceneRef.current === 'LOBBY' ? LOBBY_WALLS : sceneRef.current === 'WING_1' ? WING_1_WALLS : sceneRef.current === 'WING_2' ? WING_2_WALLS : VIP_WALLS
    const wallSet = new Set(activeWalls.map(w => `${w.x},${w.y}`))
    if (wallSet.has(`${x},${y}`)) return true

    const activeTables = sceneRef.current === 'WING_1' ? WING_1_TABLES : sceneRef.current === 'WING_2' ? WING_2_TABLES : sceneRef.current === 'VIP_ROOM' ? VIP_TABLES : []
    for (const t of activeTables) {
      if (x >= t.x && x <= t.x + 2 && y >= t.y && y <= t.y + 1) return true
    }
    for (const t of activeTables) {
      for (const d of t.dealers) {
        if (x === d.x && y === d.y) return true
      }
    }

    const activeDecos = sceneRef.current === 'LOBBY' ? LOBBY_DECORATIONS : []
    for (const d of activeDecos) {
      if (x >= d.x && x < d.x + (d.w || 1) && y >= d.y && y < d.y + (d.h || 1)) return true
    }

    if (sceneRef.current === 'LOBBY') {
      for (const b of LOBBY_BOUNCERS) {
        if (x === b.x && y === b.y) return true
      }
    }

    return false
  }

  const handleTeleportToRound2 = async () => {
    setScene('VIP_ROOM')
    setInRound2(true)
    setPosition({ x: Math.floor(VIP_W / 2), y: VIP_H - 2 })
    const { updateRound2Status } = await import('@/app/actions')
    await updateRound2Status(userData.id, true)
  }

  const handleTeleportToRound1 = async () => {
    setScene('LOBBY')
    setInRound2(false)
    setPosition({ x: 9, y: 2 })
    const { updateRound2Status } = await import('@/app/actions')
    await updateRound2Status(userData.id, false)
  }

  // --- MULTIPLAYER P2P SYNC ---
  useEffect(() => {
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

    const txChannel = supabase.channel('map_tx_hud')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `team_id=eq.${userData.id}` }, (payload) => {
        setHistory(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    const channel = supabase.channel('room_1')
      .on('broadcast', { event: 'pos' }, (payload) => {
        if (payload.payload.id !== userData.id) {
          setOtherPlayers(prev => ({ ...prev, [payload.payload.id]: payload.payload }))
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
  useEffect(() => {
    if (broadcastMessage && broadcastMessage.trim() !== '') {
      const timer = setTimeout(() => setBroadcastMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [broadcastMessage])

  useEffect(() => {
    const handleBroadcast = (currentRound: string) => {
      if (currentRound && currentRound.startsWith('BROADCAST:')) {
        const parts = currentRound.split(':')
        if (parts.length >= 3) {
          const timestamp = parseInt(parts[1])
          const msg = parts.slice(2).join(':')
          if (timestamp > lastBroadcastId.current && Date.now() - timestamp < 30000) {
            lastBroadcastId.current = timestamp
            setBroadcastMessage(`ADMIN|${msg}`)
          }
        }
      }
    }

    const eventChannel = supabase.channel('map_event_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_control', filter: 'id=eq.1' }, (payload) => {
        const newRecord = payload.new as any
        handleBroadcast(newRecord.current_round)
      })
      .subscribe()

    const gameStateChannel = supabase.channel('map_gamestate_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: "game_id=eq.final" }, (payload) => {
        const newRecord = payload.new as any
        const portalNowClosed = !newRecord || newRecord.is_active !== true
        setIsRound2Open(!portalNowClosed)
        if (inRound2 && portalNowClosed) handleTeleportToRound1()
      })
      .subscribe()

    const fetchInitialEventData = async () => {
      const eventData = await supabase.from('event_control').select('current_round').eq('id', 1).maybeSingle().then(res => res.data as any)
      if (eventData) {
        handleBroadcast(eventData.current_round)
      }
      
      const gameData = await supabase.from('game_state').select('is_active').eq('game_id', 'final').maybeSingle().then(res => res.data as any)
      const portalNowClosed = !gameData || gameData.is_active !== true
      setIsRound2Open(!portalNowClosed)
      if (inRound2 && portalNowClosed) handleTeleportToRound1()
    }
    
    fetchInitialEventData() // Fetch immediately on mount

    const pollInterval = setInterval(fetchInitialEventData, 5000)

    return () => {
      supabase.removeChannel(eventChannel)
      supabase.removeChannel(gameStateChannel)
      clearInterval(pollInterval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRound2])

  // --- MOVEMENT ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const movementKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]
      if (movementKeys.includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }

      const currentPos = posRef.current
      const currentDir = dirRef.current
      const currentScene = sceneRef.current
      const r2open = isRound2OpenRef.current
      const newPos = { ...currentPos }
      let newDir = currentDir

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') newPos.y -= 1
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') newPos.y += 1
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { newPos.x -= 1; newDir = 'left' }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { newPos.x += 1; newDir = 'right' }

      if (newPos.x === currentPos.x && newPos.y === currentPos.y && newDir === currentDir && e.key !== 'Enter') return

      // --- PORTAL LOGIC (Checked BEFORE walls so you can walk off the screen) ---
      if (currentScene === 'LOBBY') {
        if (newPos.x <= 0 && newPos.y >= 8 && newPos.y <= 11) { setScene('WING_1'); setPosition({ x: WING_W - 2, y: 16 }); return }
        if (newPos.x >= LOBBY_W - 1 && newPos.y >= 8 && newPos.y <= 11) { setScene('WING_2'); setPosition({ x: 1, y: 16 }); return }
        if (newPos.y <= 0 && newPos.x >= 8 && newPos.x <= 11) { 
          if (r2open) {
            const REQUIRED_GAMES = ['slots', 'roulette', 'blackjack', 'craps', 'poker', 'baccarat', 'dice', 'highcard', 'coinflip', 'vault']
            const bCount = REQUIRED_GAMES.filter(g => stampsRef.current[g]).length
            
            if (bCount < 10) {
              triggerBouncerMsg("Need 10 badges buddy!", "Skill issue man.")
              setPosition({ x: newPos.x, y: 1 })
              return
            }
            handleTeleportToRound2()
          } else {
            triggerBouncerMsg("The VIP Room is closed.", "Wait for the Pit Boss.")
            setPosition({ x: newPos.x, y: 1 })
          }
          return 
        }
      } else if (currentScene === 'WING_1') {
        if (newPos.x >= WING_W - 1 && newPos.y >= 14 && newPos.y <= 17) { setScene('LOBBY'); setPosition({ x: 1, y: 9 }); return }
      } else if (currentScene === 'WING_2') {
        if (newPos.x <= 0 && newPos.y >= 14 && newPos.y <= 17) { setScene('LOBBY'); setPosition({ x: LOBBY_W - 2, y: 9 }); return }
      } else if (currentScene === 'VIP_ROOM') {
        if (newPos.y >= VIP_H - 1 && newPos.x >= 12 && newPos.x <= 15) { handleTeleportToRound1(); return }
      }

      if (isBlocked(newPos.x, newPos.y)) {
        if (newDir !== currentDir) setDirection(newDir)
        return
      }

      // Valid move -> Commit state updates
      setPosition(newPos)
      setDirection(newDir)
      setIsMoving(true)
      if (moveTimeout.current) clearTimeout(moveTimeout.current)
      moveTimeout.current = setTimeout(() => setIsMoving(false), 200)

      // Check for Chair "Snapping" or Interaction zones
      let foundTableRoute = null
      let foundInteract = null
      const activeTables = currentScene === 'WING_1' ? WING_1_TABLES : currentScene === 'WING_2' ? WING_2_TABLES : currentScene === 'VIP_ROOM' ? VIP_TABLES : []
      for (const t of activeTables) {
        if (t.chairs.some(c => c.x === newPos.x && c.y === newPos.y)) {
          foundTableRoute = t.route
        }
      }
      
      const activeDecos = currentScene === 'LOBBY' ? LOBBY_DECORATIONS : []
      for (const d of activeDecos) {
        if (d.interact) {
          // Check if player is adjacent to interactable deco
          if (newPos.x >= d.x - 1 && newPos.x <= d.x + (d.w || 1) && newPos.y >= d.y - 1 && newPos.y <= d.y + (d.h || 1)) {
            foundInteract = d.interact
          }
        }
      }

      setNearTable(foundTableRoute || foundInteract)

      setNearTable(foundTableRoute || foundInteract)

      // Broadcast Position
      const now = Date.now()
      if (now - lastUpdate.current > 50) {
        supabase.channel('room_1').send({
          type: 'broadcast', event: 'pos',
          payload: { id: userData.id, x: newPos.x, y: newPos.y, avatar_id: userData.avatar_id, scene: currentScene }
        })
        lastUpdate.current = now
      }

      if (e.key === 'Enter') {
        const routeOrAction = foundTableRoute || foundInteract
        if (routeOrAction) {
          if (routeOrAction === 'final') {
            setShowBetModal(true)
          } else {
            // Check if game is live before routing
            supabase.from('game_state').select('entry_pin').eq('game_id', routeOrAction).eq('is_active', true).maybeSingle().then(({ data }) => {
              if (data?.entry_pin) {
                router.push(`/game/${routeOrAction}`)
              } else {
                setBroadcastMessage("DEALER|DEALER: This table is currently closed. Wait for the admin to open it.")
              }
            })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // Only re-register if these rarely-changing values change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.id, userData.avatar_id, router])

  // Badge count
  const badgeCount = Object.values(stamps).filter(Boolean).length

  // Active data
  const gridW = scene === 'LOBBY' ? LOBBY_W : scene === 'VIP_ROOM' ? VIP_W : WING_W
  const gridH = scene === 'LOBBY' ? LOBBY_H : scene === 'VIP_ROOM' ? VIP_H : WING_H
  const activeRooms = scene === 'LOBBY' ? LOBBY_ROOM : scene === 'WING_1' ? WING_1_ROOM : scene === 'WING_2' ? WING_2_ROOM : VIP_ROOM
  const activeWalls = scene === 'LOBBY' ? LOBBY_WALLS : scene === 'WING_1' ? WING_1_WALLS : scene === 'WING_2' ? WING_2_WALLS : VIP_WALLS
  const activeTables = scene === 'WING_1' ? WING_1_TABLES : scene === 'WING_2' ? WING_2_TABLES : scene === 'VIP_ROOM' ? VIP_TABLES : []
  const activeDecos = scene === 'LOBBY' ? LOBBY_DECORATIONS : []

  // Collect all Y-sortable entities for depth rendering
  const allEntities: { type: string, y: number, key: string, data: any }[] = []

  // Tables
  activeTables.forEach(t => {
    allEntities.push({ type: 'table', y: t.y + 1, key: `table-${t.id}`, data: t })
  })
  // Dealers
  activeTables.forEach(t => {
    t.dealers.forEach((d, i) => {
      allEntities.push({ type: 'dealer', y: d.y, key: `dealer-${t.id}-${i}`, data: { ...d, tableId: t.id } })
    })
  })
  // Chairs
  activeTables.forEach(t => {
    t.chairs.forEach((c, i) => {
      allEntities.push({ type: 'chair', y: c.y, key: `chair-${t.id}-${i}`, data: { ...c, tableRoute: t.route } })
    })
  })
  // Decorations
  activeDecos.forEach((d, i) => {
    allEntities.push({ type: 'deco', y: d.y, key: `deco-${i}`, data: d })
  })
  // Other players
  Object.values(otherPlayers).forEach(p => {
    if (p.scene === scene) {
      allEntities.push({ type: 'other-player', y: p.y, key: `player-${p.id}`, data: p })
    }
  })
  // Bouncers
  if (scene === 'LOBBY') {
    LOBBY_BOUNCERS.forEach((b, i) => {
      allEntities.push({ type: 'dealer', y: b.y, key: `bouncer-${i}`, data: b })
    })
  }
  // My player
  allEntities.push({ type: 'my-player', y: position.y, key: 'me', data: position })

  // Sort by Y for depth
  allEntities.sort((a, b) => a.y - b.y)

  // Near table info for tooltip
  const nearTableData = nearTable ? activeTables.find(t => t.route === nearTable) : null

  if (!isMounted) return null

  return (
    <div className="flex w-full h-screen bg-[#3a3028] select-none overflow-hidden relative">

      {/* WARNING OVERLAY */}
      <AnimatePresence>
        {isWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/70 backdrop-blur flex items-center justify-center pointer-events-auto">
            <div className="bg-retro-burgundy p-10 rounded-2xl border-4 border-red-400 shadow-retro-lg text-center">
              <h1 className="text-3xl md:text-5xl font-pixel text-retro-cream">⚠️ WARNING ⚠️</h1>
              <p className="text-retro-cream/80 font-mono mt-4">The Pit Boss is watching you!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BETTING MODAL FOR FINAL ROUND */}
      <AnimatePresence>
        {showBetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-retro-walnut border-2 border-retro-brass rounded-xl p-8 max-w-md w-full space-y-6 shadow-retro-lg">
              <h2 className="text-2xl font-pixel text-retro-gold text-center tracking-widest">🏆 FINAL WAGER</h2>
              <div className="space-y-4">
                <p className="font-mono text-sm text-retro-cream/80 text-center leading-relaxed">
                  Minimum Bet: <b className="text-retro-gold">500 Credits</b><br />
                  Your Balance: <b className="text-retro-green font-hud">${walletBalance}</b>
                </p>
                <div className="bg-black/30 p-6 rounded-lg border border-retro-brass/30">
                  <input type="number" min="500" max={walletBalance}
                    value={betAmount === '' ? '' : betAmount}
                    onChange={(e) => { const val = e.target.value; if (val === '') setBetAmount(''); else setBetAmount(Number(val)) }}
                    className="w-full bg-transparent border-b-2 border-retro-brass/50 font-hud text-center text-4xl py-2 text-retro-gold focus:outline-none focus:border-retro-gold transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowBetModal(false)} disabled={isBetting}
                  className="flex-1 py-3 bg-retro-slate/50 border border-retro-cream/20 text-retro-cream font-pixel text-xs rounded-lg transition-colors hover:bg-retro-slate">BACK OUT</button>
                <button onClick={async () => {
                  const finalBet = Number(betAmount)
                  if (isNaN(finalBet) || finalBet < 500) { alert('Minimum bet is 500 credits.'); return }
                  if (finalBet > walletBalance) { alert('Insufficient funds.'); return }
                  setIsBetting(true)
                  const { submitFinalBet } = await import('@/app/actions')
                  await submitFinalBet(userData.id, finalBet)
                  router.push('/game/final')
                }} disabled={isBetting}
                  className="flex-1 py-3 bg-retro-gold text-black hover:bg-yellow-400 font-pixel text-xs rounded-lg transition-colors shadow-retro uppercase tracking-widest">
                  {isBetting ? 'LOADING...' : 'ALL IN'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* BROADCAST TOAST */}
      <div className="fixed top-4 left-0 w-full flex justify-center z-[9999] pointer-events-none">
        <AnimatePresence>
          {broadcastMessage && broadcastMessage.trim() !== '' && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`w-auto max-w-[90vw] md:max-w-2xl p-6 rounded-xl border-4 shadow-retro-lg backdrop-blur pointer-events-auto break-words ${
                broadcastMessage.startsWith('ADMIN|') 
                  ? 'bg-retro-burgundy border-retro-gold text-retro-cream' 
                  : 'bg-[#2a221c]/95 border-red-400/40 text-retro-cream'
              }`}>
              <div className="flex items-center gap-3 mb-2 justify-center border-b-2 border-white/20 pb-2">
                <span className={broadcastMessage.startsWith('ADMIN|') ? 'text-2xl' : ''}>📢</span>
                <h3 className={`font-bold font-pixel uppercase tracking-widest ${broadcastMessage.startsWith('ADMIN|') ? 'text-lg text-retro-gold' : 'text-[10px] text-retro-gold'}`}>
                  {broadcastMessage.startsWith('ADMIN|') ? 'ADMIN BROADCAST' : 'Pit Boss'}
                </h3>
              </div>
              <p className={`font-pixel leading-relaxed break-words ${broadcastMessage.startsWith('ADMIN|') ? 'text-xl uppercase text-center mt-4 text-white drop-shadow-md' : 'text-xs font-mono'}`}>
                {broadcastMessage.replace('ADMIN|', '').replace('DEALER|', '')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================
          THE MAP VIEWPORT
          ======================================== */}
      <div ref={scrollRef} className="flex-1 overflow-hidden relative pb-[76px] hide-scrollbar">
        <div
          className="relative floor-wood mx-auto shadow-2xl"
          style={{ 
            width: gridW * CELL, 
            height: gridH * CELL, 
            minWidth: gridW * CELL, 
            minHeight: gridH * CELL,
            backgroundSize: `${CELL}px ${CELL}px`
          }}
        >
          {/* ROOM FLOOR ZONES */}
          {activeRooms.map(room => (
            <div key={room.id} className={`absolute ${room.floor} rounded-sm`}
              style={{
                left: (room.x + 1) * CELL, top: (room.y + 1) * CELL,
                width: (room.w - 2) * CELL, height: (room.h - 2) * CELL
              }}
            />
          ))}

          {/* ROOM SIGNS — floating above each room */}
          {activeRooms.map(room => (
            <div key={`sign-${room.id}`}
              className="absolute z-[45] pointer-events-none flex justify-center"
              style={{ left: room.x * CELL, top: (room.y - 1) * CELL, width: room.w * CELL }}
            >
              <div className="room-sign font-pixel">{room.label}</div>
            </div>
          ))}

          {/* WALL TILES */}
          {activeWalls.map((w, i) => (
            <div key={`wall-${i}`}
              className={`absolute ${activeRooms.find(r =>
                w.x >= r.x && w.x < r.x + r.w && w.y >= r.y && w.y < r.y + r.h
              )?.wallType || 'wall-wood'} ${w.className || ''}`}
              style={{
                left: w.x * CELL, top: w.y * CELL,
                width: CELL, height: CELL,
                zIndex: w.y * 10 + 1
              }}
            />
          ))}

          {/* LOBBY PORTALS */}
          {scene === 'LOBBY' && (
            <>
              {/* VIP Door */}
              <div className={`absolute z-[40] transition-all overflow-hidden rounded ${isRound2Open ? 'stairs-up cursor-pointer' : 'stairs-up opacity-70'}`} style={{ left: (LOBBY_W/2 - 2) * CELL, top: 0, width: CELL * 4, height: CELL }}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {!isRound2Open ? <span className="text-xl">🔒</span> : <div className="font-pixel text-[6px] bg-black/60 px-1 py-0.5 rounded text-retro-gold animate-pulse">VIP ENTRY</div>}
                </div>
              </div>
              {/* WING 1 Door */}
              <div className="absolute z-[40] stairs-up" style={{ left: 0, top: (LOBBY_H/2 - 2) * CELL, width: CELL, height: CELL * 4 }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="-rotate-90 font-pixel text-[6px] bg-black/60 px-1 py-0.5 rounded text-retro-cream whitespace-nowrap">WING 1</div>
                </div>
              </div>
              {/* WING 2 Door */}
              <div className="absolute z-[40] stairs-up" style={{ left: (LOBBY_W - 1) * CELL, top: (LOBBY_H/2 - 2) * CELL, width: CELL, height: CELL * 4 }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="rotate-90 font-pixel text-[6px] bg-black/60 px-1 py-0.5 rounded text-retro-cream whitespace-nowrap">WING 2</div>
                </div>
              </div>
            </>
          )}

          {/* EXIT PORTAL */}
          {scene === 'WING_1' && (
            <div className="absolute z-[40] stairs-up cursor-pointer" style={{ left: (WING_W - 1) * CELL, top: (WING_H/2 - 2) * CELL, width: CELL, height: CELL * 4 }}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="font-pixel text-[6px] bg-black/60 px-2 py-0.5 rounded text-retro-gold font-bold -rotate-90 whitespace-nowrap">LOBBY</div>
              </div>
            </div>
          )}
          {scene === 'WING_2' && (
            <div className="absolute z-[40] stairs-up cursor-pointer" style={{ left: 0, top: (WING_H/2 - 2) * CELL, width: CELL, height: CELL * 4 }}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="font-pixel text-[6px] bg-black/60 px-2 py-0.5 rounded text-retro-gold font-bold rotate-90 whitespace-nowrap">LOBBY</div>
              </div>
            </div>
          )}
          {scene === 'VIP_ROOM' && (
            <div className="absolute z-[40] stairs-up cursor-pointer" style={{ left: (VIP_W / 2 - 2) * CELL, top: (VIP_H - 1) * CELL, width: CELL * 4, height: CELL }}>
              <div className="w-full h-full flex items-center justify-center">
                <div className="font-pixel text-[6px] bg-black/60 px-2 py-0.5 rounded text-retro-gold font-bold">LOBBY</div>
              </div>
            </div>
          )}

          {/* Y-SORTED ENTITIES */}
          {allEntities.map(entity => {
            const zIndex = entity.y * 10 + 5

            // --- TABLE ---
            if (entity.type === 'table') {
              const t = entity.data
              const isVip = t.route === 'final' || t.route === 'blackjack'
              return (
                <div key={entity.key} className="absolute"
                  style={{ left: t.x * CELL, top: t.y * CELL, width: 3 * CELL, height: 2 * CELL, zIndex }}>
                  <div className={`w-full h-full ${isVip ? 'retro-table-vip' : 'retro-table'} relative`}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full pointer-events-none">
                      <span className="text-lg mb-0.5">{TABLE_EMOJI[t.route]}</span>
                      <span className="text-[6px] font-pixel text-retro-cream/80 font-bold">{t.label}</span>
                    </div>
                  </div>
                </div>
              )
            }

            // --- DEALER ---
            if (entity.type === 'dealer') {
              const d = entity.data
              
              // Speech bubble logic for bouncers
              const isLeftBouncer = d.label === 'BOUNCER' && d.x === 7
              const isRightBouncer = d.label === 'BOUNCER' && d.x === 12
              
              let msg = null
              if (isLeftBouncer) msg = bouncerMsg.left
              if (isRightBouncer) msg = bouncerMsg.right

              return (
                <div key={entity.key} className="absolute avatar-shadow"
                  style={{ left: d.x * CELL, top: d.y * CELL, width: CELL, height: CELL, zIndex }}>
                  
                  {msg && isLeftBouncer && (
                    <div className="absolute top-0 right-full mr-2 bg-white text-black font-pixel text-[8px] sm:text-[10px] px-3 py-2 rounded-lg shadow-xl border-2 border-black whitespace-nowrap z-50 animate-bounce">
                      {msg}
                      <div className="absolute top-1/2 -translate-y-1/2 -right-[6px] border-solid border-l-white border-l-[6px] border-y-transparent border-y-[5px] border-r-0" />
                    </div>
                  )}

                  {msg && !isLeftBouncer && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black font-pixel text-[8px] sm:text-[10px] px-3 py-2 rounded-lg shadow-xl border-2 border-black whitespace-nowrap z-50 animate-bounce">
                      {msg}
                      <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 border-solid border-t-white border-t-[6px] border-x-transparent border-x-[5px] border-b-0" />
                    </div>
                  )}

                  <img src={DEALER_AVATAR} className="w-full h-full scale-90 animate-avatar-bob" alt="Dealer" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 name-tag-dealer font-pixel">{d.label || 'DEALER'}</div>
                </div>
              )
            }

            // --- CHAIR ---
            if (entity.type === 'chair') {
              const c = entity.data
              return (
                <div key={entity.key} className="absolute"
                  style={{ left: c.x * CELL, top: c.y * CELL, width: CELL, height: CELL, zIndex }}>
                  <div className={`w-[28px] h-[28px] mx-auto mt-[6px] ${nearTable === c.tableRoute ? 'retro-chair-active' : 'retro-chair'}`}>
                    <div className={`w-full h-[35%] rounded-t-sm ${nearTable === c.tableRoute ? 'bg-retro-gold/30' : 'bg-white/10'}`} />
                  </div>
                </div>
              )
            }

            // --- DECORATION ---
            if (entity.type === 'deco') {
              const d = entity.data
              return (
                <div key={entity.key} className="absolute flex items-end justify-center pointer-events-none"
                  style={{ left: d.x * CELL, top: d.y * CELL, width: (d.w || 1) * CELL, height: (d.h || 1) * CELL, zIndex }}>
                  {d.image ? (
                    <img src={d.image} className="w-full h-full object-contain drop-shadow-xl" alt={d.label || 'deco'} />
                  ) : (
                    <span className="deco-sprite" style={{ transform: `scale(${d.scale || 1})` }}>{d.emoji}</span>
                  )}
                  {d.label && <div className="absolute -top-4 left-1/2 -translate-x-1/2 name-tag font-pixel whitespace-nowrap bg-black/80 text-retro-gold border-retro-brass">{d.label}</div>}
                </div>
              )
            }

            // --- OTHER PLAYER ---
            if (entity.type === 'other-player') {
              const p = entity.data
              const otherSeed = AVATAR_LIST.find(a => a.id === p.avatar_id)?.seed || 'Felix'
              const otherSpriteUrl = getAvatarUrl(otherSeed)
              return (
                <div key={entity.key} className="absolute transition-all duration-200 ease-linear avatar-shadow"
                  style={{ left: p.x * CELL, top: p.y * CELL, width: CELL, height: CELL, zIndex }}>
                  <img src={otherSpriteUrl} className="w-full h-full drop-shadow-md opacity-70 animate-avatar-bob" alt="Player" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 name-tag font-pixel">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />PLAYER
                  </div>
                </div>
              )
            }

            // --- MY PLAYER ---
            if (entity.type === 'my-player') {
              return (
                <div key={entity.key}
                  className={`absolute transition-all duration-100 ease-linear avatar-shadow ${isMoving ? 'animate-avatar-walk' : 'animate-avatar-bob'}`}
                  style={{ left: position.x * CELL, top: position.y * CELL, width: CELL, height: CELL, zIndex: zIndex + 2 }}>
                  {/* Interaction Tooltip */}
                  <AnimatePresence>
                    {nearTableData && (
                      <motion.div initial={{ opacity: 0, y: 5, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.8 }}
                        className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap z-50">
                        <div className="interact-tooltip text-center">
                          <div className="text-[9px] font-bold font-pixel text-gray-700">{TABLE_EMOJI[nearTableData.route]} {nearTableData.label}</div>
                          <div className="text-[8px] text-gray-500 mt-0.5">Press ENTER</div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className={`w-full h-full transform transition-transform duration-200 ${direction === 'left' ? '-scale-x-100' : 'scale-x-100'}`}>
                    <img src={mySpriteUrl}
                      className={`w-full h-full drop-shadow-lg object-contain ${isMoving ? 'animate-walk-wobble' : 'animate-avatar-bob'}`}
                      alt="Me" />
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 name-tag-you font-pixel">YOU</div>
                </div>
              )
            }

            return null
          })}

          {/* MAP WATERMARK */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none opacity-10 z-[1]">
            <h1 className="text-[32px] font-pixel text-retro-walnut whitespace-nowrap tracking-[0.2em]">
              {inRound2 ? 'ROUND 2' : 'CODESPRINT \'26'}
            </h1>
          </div>

        </div>
      </div>

      {/* ========================================
          FULL WIDTH BOTTOM HUD BAR
          ======================================== */}
      <div className="fixed bottom-0 left-0 w-full z-[1000] hud-bar-full flex items-center justify-between px-8 py-3 border-t-2 border-retro-brass/50">
        
        {/* LEFT: Team Details */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={mySpriteUrl} className="w-12 h-12 rounded bg-retro-oak/50 border border-retro-brass/50 shadow-inner" alt="Me" />
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-black ${inRound2 ? 'bg-retro-burgundy animate-pulse' : 'bg-green-500'}`} />
          </div>
          <div>
            <div className="text-[10px] font-pixel text-retro-gold uppercase tracking-wider mb-0.5">Team Name</div>
            <div className="text-lg font-mono text-retro-cream font-bold">{userData.access_code}</div>
          </div>
        </div>

        {/* CENTER: Core Stats */}
        <div className="flex items-center gap-12 bg-black/40 px-8 py-2 rounded-xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-md">💰</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-pixel text-retro-gold uppercase tracking-wider">Total Score / Credits</span>
              <span className="text-2xl font-hud text-retro-gold font-bold leading-none">${walletBalance}</span>
            </div>
          </div>
          
          <div className="w-px h-8 bg-white/10" />

          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-md">🏅</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-pixel text-retro-gold uppercase tracking-wider">Challenge Badges</span>
              <span className="text-2xl font-hud text-retro-cream font-bold leading-none">{badgeCount}<span className="text-sm text-retro-cream/50">/10</span></span>
            </div>
          </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 bg-retro-slate/30 hover:bg-retro-slate/60 border border-white/10 px-4 py-3 rounded-lg transition-colors shadow-sm">
            <span className="text-lg">📜</span>
            <span className="text-[10px] font-pixel text-retro-cream tracking-widest">VIEW LOG</span>
          </button>
          
          <LogoutButton teamId={userData.id}
            className="px-6 py-3 bg-retro-burgundy border border-red-400/40 text-retro-cream font-pixel text-[10px] rounded-lg hover:bg-retro-mahogany transition-colors shadow-retro uppercase tracking-widest" />
        </div>
      </div>

      {/* HISTORY POPOVER */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-8 z-[1010] bg-[#2a221c] border-2 border-retro-brass/40 rounded-xl shadow-2xl w-96 max-h-80 flex flex-col p-4">
            <h3 className="text-xs font-pixel text-retro-gold mb-3 border-b border-retro-brass/20 pb-2 shrink-0">CREDIT HISTORY</h3>
            {history.length === 0 ? (
              <div className="text-xs text-retro-cream/40 font-mono text-center py-4">No transactions yet.</div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {history.map((tx: any, i: number) => (
                  <div key={i} className={`p-2 rounded-lg border-l-2 flex justify-between items-start gap-2
                    ${tx.amount >= 0 ? 'border-l-green-500/50 bg-green-900/10' : 'border-l-red-500/50 bg-red-900/10'}`}>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-retro-cream/80 break-words">{tx.description}</div>
                      <div className="text-[8px] text-retro-cream/40 font-mono mt-0.5">{new Date(tx.created_at).toLocaleTimeString()}</div>
                    </div>
                    <div className={`font-hud text-xs font-bold shrink-0 ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
