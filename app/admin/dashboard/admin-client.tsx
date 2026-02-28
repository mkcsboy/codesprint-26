'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Shield, Pause, Play, Zap, Search, DollarSign, AlertTriangle, Ban,
    Award, Upload, RotateCcw, ToggleLeft, ToggleRight, Trophy, BarChart3,
    Megaphone, Eye, ChevronDown, RefreshCw, X, Check, Flame
} from 'lucide-react'
import {
    togglePause, setCurrentRound, getEventState,
    getAllTeams, adjustWallet, sendWarning, banTeam, unbanTeam, updateStamps,
    getAllQuestions, toggleQuestion, burnQuestion, reshuffleAllQuestions, bulkUploadQuestions,
    getLeaderboard, getAnalytics, broadcastMessage, forceWin, createTeam,
    startTableRound, setTableStatusState, awardWin, toggleRound2Portal
} from '../actions'
import { Json } from '@/lib/supabase/types'

type Tab = 'pit' | 'vault' | 'deck' | 'eye'

const GAME_TYPES = ['slots', 'roulette', 'blackjack', 'holdem', 'craps', 'final'] as const
const GAME_LABELS: Record<string, string> = {
    slots: '🎰 SLOTS (Debug)',
    roulette: '🎯 ROULETTE (Predict)',
    blackjack: '🃏 BLACKJACK (Constraints)',
    holdem: '♠️ HOLD\'EM (Optimize)',
    craps: '🎲 CRAPS (Logic)',
    final: '🏆 FINAL ROUND (All In)',
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('pit')

    const tabs: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
        { id: 'pit', label: 'THE PIT', icon: <Zap className="w-4 h-4" />, color: 'text-red-400 border-red-500' },
        { id: 'vault', label: 'THE VAULT', icon: <DollarSign className="w-4 h-4" />, color: 'text-yellow-400 border-yellow-500' },
        { id: 'deck', label: 'THE DECK', icon: <Flame className="w-4 h-4" />, color: 'text-blue-400 border-blue-500' },
        { id: 'eye', label: 'THE EYE', icon: <Eye className="w-4 h-4" />, color: 'text-purple-400 border-purple-500' },
    ]

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* TOP BAR */}
            <div className="bg-[#12121a] border-b border-red-900/30 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-red-500" />
                    <span className="font-pixel text-red-400 text-sm tracking-wider">PIT BOSS CONTROL</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-gray-500 font-mono">LIVE</span>
                </div>
            </div>

            {/* TAB BAR */}
            <div className="bg-[#0d0d14] border-b border-white/5 px-4 flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-xs font-pixel tracking-wider transition-all border-b-2 whitespace-nowrap
              ${activeTab === tab.id
                                ? `${tab.color} bg-white/5`
                                : 'text-gray-600 border-transparent hover:text-gray-400 hover:bg-white/[0.02]'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="p-6 max-w-[1600px] mx-auto">
                {activeTab === 'pit' && <ThePit />}
                {activeTab === 'vault' && <TheVault />}
                {activeTab === 'deck' && <TheDeck />}
                {activeTab === 'eye' && <TheEye />}
            </div>
        </div>
    )
}

// ========================================
// TAB A: "THE PIT" — Live Ops & Control
// ========================================
function ThePit() {
    const [isPaused, setIsPaused] = useState(false)
    const [isRound2Open, setIsRound2Open] = useState(false)
    const [currentRound, setCurrentRoundState] = useState('slots')
    const [liveFeed, setLiveFeed] = useState<any[]>([])
    const [broadcast, setBroadcast] = useState('')
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [tableTimers, setTableTimers] = useState<Record<string, string>>({})
    const [activeTeams, setActiveTeams] = useState<any[]>([])
    const [currentTime, setCurrentTime] = useState(Date.now())

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
        return () => clearInterval(interval)
    }, [])

    const refresh = useCallback(async () => {
        setLoading(true)
        const data = await getEventState()
        if (data && !data.error) {
            setIsPaused(data.control?.is_paused || false)
            setIsRound2Open(data.control?.round_2_open || false)
            setCurrentRoundState(data.control?.current_round || 'slots')
            setLiveFeed(data.recentTx || [])
            setTableTimers(data.control?.table_timers as Record<string, string> || {})
            setActiveTeams(data.activeTeams || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    useEffect(() => {
        const poll = setInterval(() => { refresh() }, 5000)
        return () => clearInterval(poll)
    }, [refresh])

    const handleTableStatusChange = async (gameId: string, newStatus: string) => {
        setActionLoading(`table-status-${gameId}`)
        await setTableStatusState(gameId, newStatus)
        await refresh()
        setActionLoading(null)
    }

    const handleKillSwitch = async () => {
        setActionLoading('kill')
        const newState = !isPaused
        await togglePause(newState)
        setIsPaused(newState)
        setActionLoading(null)
    }

    const handleRoundChange = async (round: string) => {
        setActionLoading('round')
        await setCurrentRound(round)
        setCurrentRoundState(round)
        setActionLoading(null)
    }

    const handleStartRound = async () => {
        if (!window.confirm(`Are you sure? This will AUTO-BURN active questions for ${GAME_LABELS[currentRound]} and start an isolated 15-minute sync timer just for THIS table.`)) return;
        setActionLoading('start-round')
        await startTableRound(currentRound, 15)
        alert(`15-Minute timer started for ${GAME_LABELS[currentRound]}!`)
        refresh()
        setActionLoading(null)
    }

    const handleAwardWin = async (teamId: string, teamName: string, gameId: string) => {
        const confirmMsg = `Are you sure you want to PASS [${teamName}] for ${gameId.toUpperCase()}?\n\nThis will trigger the SUCCESS screen on their laptop and unlock them from the table.\n\n⚠️ DON'T FORGET to award their credits manually via the VAULT!`
        if (!window.confirm(confirmMsg)) return;

        setActionLoading(`award-${teamId}`)
        const res = await awardWin(teamId, gameId)
        if (res.error) alert(`Error: ${res.error}`)
        else alert(`✅ SUCCESS: ${teamName} has been unlocked from the table!`)
        await refresh()
        setActionLoading(null)
    }

    const handleBroadcast = async () => {
        if (!broadcast.trim()) return
        setActionLoading('broadcast')
        await broadcastMessage(broadcast)
        setBroadcast('')
        setActionLoading(null)
    }

    return (
        <div className="space-y-6">
            {/* Kill Switch + Round Manager Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KILL SWITCH */}
                <div className="bg-[#12121a] rounded-xl border border-red-900/30 p-6 flex flex-col items-center gap-4">
                    <h3 className="text-xs font-pixel text-red-400/80 tracking-widest uppercase">Global Kill Switch</h3>
                    <button
                        onClick={handleKillSwitch}
                        disabled={actionLoading === 'kill'}
                        className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl
              ${isPaused
                                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/40 ring-4 ring-red-500/20 animate-pulse'
                                : 'bg-green-600 hover:bg-green-500 shadow-green-600/40 ring-4 ring-green-500/20'
                            }`}
                    >
                        {isPaused
                            ? <Play className="w-12 h-12 text-white" />
                            : <Pause className="w-12 h-12 text-white" />
                        }
                    </button>
                    <span className={`text-sm font-pixel ${isPaused ? 'text-red-400' : 'text-green-400'}`}>
                        {isPaused ? 'EVENT PAUSED' : 'EVENT LIVE'}
                    </span>
                </div>

                {/* ROUND MANAGER */}
                <div className="bg-[#12121a] rounded-xl border border-white/10 p-6 col-span-1 lg:col-span-2">
                    <h3 className="text-xs font-pixel text-gray-400 tracking-widest uppercase mb-4">Round Manager</h3>

                    {/* Current Round Selector */}
                    <div className="mb-4">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Active Round</label>
                        <div className="relative">
                            <select
                                value={currentRound}
                                onChange={(e) => handleRoundChange(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm font-mono text-white appearance-none cursor-pointer focus:border-red-500 focus:outline-none"
                            >
                                {GAME_TYPES.map(g => (
                                    <option key={g} value={g}>{GAME_LABELS[g]}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Table Controls */}
                    <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <button
                                onClick={handleStartRound}
                                disabled={actionLoading === 'start-round'}
                                className="w-full h-full flex items-center justify-center gap-2 p-4 bg-red-900/40 hover:bg-red-900/60 border-2 border-red-500 rounded-xl text-red-100 font-pixel text-lg shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Play className="w-5 h-5" />
                                START {currentRound.toUpperCase()}
                            </button>
                            <p className="text-center text-[10px] text-gray-500 mt-2 font-mono uppercase">
                                Warning: Auto-burns questions.
                            </p>
                        </div>
                        <div>
                            <button
                                onClick={async () => {
                                    if (!window.confirm(!isRound2Open ? 'Are you sure you want to OPEN the Round 2 Portal? All players will see it.' : 'Are you sure you want to CLOSE the Round 2 Portal?')) return;
                                    setActionLoading('round-2')
                                    const res = await toggleRound2Portal(!isRound2Open)
                                    if (res.error) {
                                        alert(res.error)
                                    } else {
                                        setIsRound2Open(!isRound2Open)
                                    }
                                    setActionLoading(null)
                                }}
                                disabled={actionLoading === 'round-2'}
                                className={`w-full flex items-center justify-center gap-2 p-4 border-2 rounded-xl font-pixel text-lg transition-all hover:scale-[1.02] disabled:opacity-50
                                    ${isRound2Open
                                        ? 'bg-yellow-900/60 border-yellow-500 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse'
                                        : 'bg-yellow-900/20 border-yellow-900 text-yellow-500/50 hover:border-yellow-500 hover:text-yellow-400'
                                    }`}
                            >
                                {isRound2Open ? 'CLOSE PORTAL' : 'OPEN ROUND 2 PORTAL'}
                            </button>
                            <p className="text-center text-[10px] text-gray-500 mt-2 font-mono uppercase text-yellow-500/50">
                                {isRound2Open ? 'PORTAL IS LIVE!' : 'Portal is currently closed.'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-4">
                        <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Live Table Timers</h4>
                        <div className="space-y-2">
                            {GAME_TYPES.map(g => {
                                const playingTeams = activeTeams.filter(t => t.current_locked_table === g)
                                const startTime = tableTimers[g]
                                const gameStatus = tableTimers[`${g}_status`] || 'ACTIVE'
                                let status = "WAITING"
                                let color = "text-gray-500"

                                if (isPaused || gameStatus === 'PAUSED') {
                                    status = "PAUSED"
                                    color = "text-yellow-400 font-bold animate-pulse"
                                } else if (gameStatus === 'KILLED') {
                                    status = "KILLED"
                                    color = "text-red-500 font-bold"
                                } else if (startTime) {
                                    const diff = new Date(startTime).getTime() + (16 * 60000) - currentTime
                                    if (diff > 0) {
                                        const m = Math.floor(diff / 60000)
                                        const s = Math.floor((diff % 60000) / 1000)
                                        status = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                                        color = "text-green-400 font-bold"
                                    } else {
                                        status = "00:00 (ENDED)"
                                        color = "text-red-400"
                                    }
                                }
                                return (
                                    <div key={g} className="flex flex-col gap-2 bg-black/40 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between items-center text-xs font-mono mb-2">
                                            <span className="text-gray-400 uppercase w-32">{g}</span>
                                            <div className="flex items-center gap-2">
                                                {tableTimers[`${g}_pin`] && <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-0.5 rounded font-bold tracking-widest">{tableTimers[`${g}_pin`]}</span>}
                                                <span className={color}>{status}</span>
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleTableStatusChange(g, gameStatus === 'PAUSED' ? 'ACTIVE' : 'PAUSED')}
                                                disabled={actionLoading === `table-status-${g}`}
                                                className={`flex-1 py-1 rounded text-[10px] font-pixel border transition-colors ${gameStatus === 'PAUSED' ? 'bg-green-900/30 text-green-400 border-green-500/50 hover:bg-green-600/30' : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50 hover:bg-yellow-600/30'}`}>
                                                {gameStatus === 'PAUSED' ? 'RESUME' : 'PAUSE'}
                                            </button>
                                            <button
                                                onClick={() => { if (window.confirm('Kill this table? Time will stop and players lose.')) handleTableStatusChange(g, 'KILLED') }}
                                                disabled={actionLoading === `table-status-${g}` || gameStatus === 'KILLED'}
                                                className="flex-1 py-1 rounded text-[10px] bg-red-900/30 text-red-500 border border-red-500/50 hover:bg-red-600/30 font-pixel transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                KILL
                                            </button>
                                        </div>
                                        {/* Show Teams */}
                                        {playingTeams.length > 0 && (
                                            <div className="flex flex-col gap-2 mt-2 border-t border-white/10 pt-2">
                                                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Active Players ({playingTeams.length})</span>
                                                <div className="flex flex-col gap-2">
                                                    {playingTeams.map(t => (
                                                        <div key={t.id} className="flex items-center justify-between bg-[#1a1a24] p-2 rounded border border-white/5 shadow-inner shadow-black">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-bold text-white uppercase">{t.team_name}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">Code: {t.access_code}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleAwardWin(t.id, t.team_name, g)}
                                                                disabled={actionLoading === `award-${t.id}`}
                                                                className="px-3 py-1 bg-green-900/40 hover:bg-green-600/60 border border-green-500/50 text-green-400 font-pixel text-[10px] rounded transition-all disabled:opacity-50"
                                                            >
                                                                ✅ PASS
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* BROADCAST SYSTEM */}
            <div className="bg-[#12121a] rounded-xl border border-yellow-900/30 p-6">
                <h3 className="text-xs font-pixel text-yellow-400/80 tracking-widest uppercase mb-4 flex items-center gap-2">
                    <Megaphone className="w-4 h-4" /> Broadcast System
                </h3>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={broadcast}
                        onChange={(e) => setBroadcast(e.target.value)}
                        placeholder="Type a message to broadcast to all players..."
                        onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                        className="flex-grow bg-black/40 border border-yellow-900/30 rounded-lg p-3 text-sm font-mono text-yellow-200
              placeholder:text-yellow-900/40 focus:border-yellow-500 focus:outline-none"
                    />
                    <button
                        onClick={handleBroadcast}
                        disabled={actionLoading === 'broadcast' || !broadcast.trim()}
                        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-xs rounded-lg transition-all
              disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                        SEND
                    </button>
                </div>
            </div>

            {/* LIVE FEED */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-pixel text-gray-400 tracking-widest uppercase">Live Transaction Feed</h3>
                    <button onClick={refresh} className="text-gray-600 hover:text-white transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                    {liveFeed.length === 0 && (
                        <div className="text-center text-gray-600 text-sm py-6 font-mono">No transactions yet</div>
                    )}
                    {liveFeed.map((tx: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2 bg-black/20 rounded-lg border border-white/5 text-xs font-mono">
                            <span className="text-gray-400">{tx.teams?.access_code || tx.team_id?.slice(0, 8)}</span>
                            <span className="text-gray-500">{tx.description}</span>
                            <span className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {tx.amount >= 0 ? '+' : ''}{tx.amount}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ========================================
// TAB B: "THE VAULT" — Team Management
// ========================================
function TheVault() {
    const [teams, setTeams] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [selectedTeam, setSelectedTeam] = useState<any>(null)
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [forceWinGame, setForceWinGame] = useState('slots')
    const [forceWinAmount, setForceWinAmount] = useState('300')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // Manual Registration State
    const [showRegister, setShowRegister] = useState(false)
    const [newTeamCode, setNewTeamCode] = useState('')
    const [newTeamBalance, setNewTeamBalance] = useState('100')

    const refresh = useCallback(async () => {
        setLoading(true)
        const data = await getAllTeams()
        if (data && !data.error) {
            setTeams(data.teams || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    const filteredTeams = teams.filter(t =>
        t.access_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleAdjust = async () => {
        if (!selectedTeam || !adjustAmount) return
        setActionLoading('adjust')
        await adjustWallet(selectedTeam.id, parseFloat(adjustAmount), adjustReason || 'Admin Adjustment')
        setAdjustAmount('')
        setAdjustReason('')
        await refresh()
        setActionLoading(null)
    }

    const handleWarning = async (teamId: string) => {
        setActionLoading(`warn-${teamId}`)
        await sendWarning(teamId)
        setActionLoading(null)
    }

    const handleBan = async (teamId: string) => {
        setActionLoading(`ban-${teamId}`)
        await banTeam(teamId)
        await refresh()
        setActionLoading(null)
    }

    const handleUnban = async (teamId: string) => {
        setActionLoading(`unban-${teamId}`)
        await unbanTeam(teamId)
        await refresh()
        setActionLoading(null)
    }

    const handleForceWin = async () => {
        if (!selectedTeam) return
        setActionLoading('forcewin')
        await forceWin(selectedTeam.id, forceWinGame, parseFloat(forceWinAmount))
        await refresh()
        setActionLoading(null)
    }

    const handleStampToggle = async (teamId: string, currentStamps: any, game: string) => {
        const stamps = { ...(currentStamps || {}) }
        stamps[game] = !stamps[game]
        setActionLoading(`stamp-${teamId}-${game}`)
        await updateStamps(teamId, stamps as unknown as Json)
        await refresh()
        setActionLoading(null)
    }

    const handleRegister = async () => {
        if (!newTeamCode.trim()) return
        setActionLoading('register')
        const result = await createTeam(newTeamCode, parseInt(newTeamBalance) || 100)

        if (result && !result.error) {
            setNewTeamCode('')
            setNewTeamBalance('100')
            setShowRegister(false)
            await refresh()
        } else {
            alert('Registration Failed: ' + result?.error)
        }
        setActionLoading(null)
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex gap-4">
                <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search teams by code or ID..."
                        className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-mono text-white
                placeholder:text-gray-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                </div>
                <button
                    onClick={() => setShowRegister(!showRegister)}
                    className="px-4 bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
                >
                    {showRegister ? <X className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    {showRegister ? 'CANCEL' : 'REGISTER TEAM'}
                </button>
            </div>

            {/* Registration Form */}
            {showRegister && (
                <div className="bg-[#12121a] rounded-xl border border-yellow-500/30 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Access Code</label>
                        <input
                            type="text"
                            value={newTeamCode}
                            onChange={(e) => setNewTeamCode(e.target.value.toUpperCase())}
                            placeholder="CODE-123"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white uppercase focus:border-yellow-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Initial Balance</label>
                        <input
                            type="number"
                            value={newTeamBalance}
                            onChange={(e) => setNewTeamBalance(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white focus:border-yellow-500 focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={handleRegister}
                        disabled={actionLoading === 'register' || !newTeamCode.trim()}
                        className="h-[38px] bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-xs rounded-lg transition-all disabled:opacity-50"
                    >
                        CONFIRM REGISTRATION
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* TEAM LIST */}
                <div className="lg:col-span-2 bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 bg-black/30 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-pixel text-gray-400 tracking-widest">TEAMS ({filteredTeams.length})</span>
                        <button onClick={refresh} className="text-gray-600 hover:text-white transition-colors">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {filteredTeams.map(team => {
                            const isBanned = team.current_locked_table === 'BANNED'
                            const stamps = team.stamps as Record<string, boolean> || {}

                            return (
                                <div
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team)}
                                    className={`flex items-center justify-between px-4 py-3 border-b border-white/5 cursor-pointer transition-all text-sm
                    ${selectedTeam?.id === team.id ? 'bg-yellow-900/20 border-l-2 border-l-yellow-500' : 'hover:bg-white/[0.02]'}
                    ${isBanned ? 'opacity-40' : ''}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isBanned ? 'bg-red-500' : 'bg-green-500'}`} />
                                        <div className="min-w-0">
                                            <div className="font-mono text-xs text-white truncate">{team.access_code}</div>
                                            <div className="text-[10px] text-gray-600 truncate">{team.id.slice(0, 12)}...</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        {/* Stamps */}
                                        <div className="hidden sm:flex gap-1">
                                            {GAME_TYPES.map(g => (
                                                <span key={g} className={`w-4 h-4 text-[8px] flex items-center justify-center rounded
                          ${stamps[g] ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-700'}`}
                                                    title={g}>
                                                    {stamps[g] ? '★' : '○'}
                                                </span>
                                            ))}
                                        </div>
                                        <span className={`font-mono text-sm font-bold ${team.wallet_balance >= 500 ? 'text-green-400' : team.wallet_balance <= 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                            ${team.wallet_balance}
                                        </span>
                                        {/* Quick Actions */}
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleWarning(team.id) }}
                                                disabled={actionLoading === `warn-${team.id}`}
                                                className="p-1.5 rounded hover:bg-yellow-900/30 text-yellow-500/50 hover:text-yellow-400 transition-colors"
                                                title="Send Warning"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                            </button>
                                            {isBanned ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnban(team.id) }}
                                                    disabled={actionLoading === `unban-${team.id}`}
                                                    className="p-1.5 rounded hover:bg-green-900/30 text-green-500/50 hover:text-green-400 transition-colors"
                                                    title="Unban Team"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleBan(team.id) }}
                                                    disabled={actionLoading === `ban-${team.id}`}
                                                    className="p-1.5 rounded hover:bg-red-900/30 text-red-500/50 hover:text-red-400 transition-colors"
                                                    title="Ban Team"
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const { logoutAction } = await import('@/app/actions')
                                                    await logoutAction(team.id)
                                                }}
                                                className="p-1.5 rounded hover:bg-blue-900/30 text-blue-500/50 hover:text-blue-400 transition-colors"
                                                title="Force Disconnect Session"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* SELECTED TEAM PANEL */}
                <div className="bg-[#12121a] rounded-xl border border-white/10 p-6 space-y-6">
                    {selectedTeam ? (
                        <>
                            <div>
                                <h3 className="text-xs font-pixel text-yellow-400 tracking-widest uppercase mb-1">Selected Team</h3>
                                <p className="font-mono text-lg text-white">{selectedTeam.access_code}</p>
                                <p className="text-[10px] text-gray-600 font-mono">{selectedTeam.id}</p>
                            </div>

                            <div className="border-t border-white/5 pt-4">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Current Balance</p>
                                <p className="text-3xl font-mono font-bold text-yellow-400">${selectedTeam.wallet_balance}</p>
                            </div>

                            {/* Adjust Wallet */}
                            <div className="border-t border-white/5 pt-4 space-y-3">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> Adjust Credits
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        placeholder="+100 or -50"
                                        className="flex-grow bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white
                      placeholder:text-gray-600 focus:border-yellow-500 focus:outline-none"
                                    />
                                </div>
                                <input
                                    type="text"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Reason (optional)"
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm font-mono text-white
                    placeholder:text-gray-600 focus:border-yellow-500/50 focus:outline-none"
                                />
                                <button
                                    onClick={handleAdjust}
                                    disabled={actionLoading === 'adjust' || !adjustAmount}
                                    className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-pixel text-xs rounded-lg
                    transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    APPLY
                                </button>
                            </div>

                            {/* Badge Inspector */}
                            <div className="border-t border-white/5 pt-4 space-y-3">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                    <Award className="w-3 h-3" /> Badge Inspector
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    {GAME_TYPES.map(g => {
                                        const stamps = (selectedTeam.stamps as Record<string, boolean>) || {}
                                        const has = !!stamps[g]
                                        return (
                                            <button
                                                key={g}
                                                onClick={() => handleStampToggle(selectedTeam.id, selectedTeam.stamps, g)}
                                                disabled={!!actionLoading?.startsWith('stamp')}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono transition-all
                          ${has
                                                        ? 'bg-yellow-900/30 border-yellow-600 text-yellow-400'
                                                        : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                                    }`}
                                            >
                                                <span>{GAME_LABELS[g]}</span>
                                                <span>{has ? '★' : '○'}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Force Win */}
                            <div className="border-t border-white/5 pt-4 space-y-3">
                                <p className="text-[10px] text-red-400 uppercase tracking-widest flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Emergency Override (Force Win)
                                </p>
                                <select
                                    value={forceWinGame}
                                    onChange={(e) => setForceWinGame(e.target.value)}
                                    className="w-full bg-black/40 border border-red-900/30 rounded-lg p-2 text-sm font-mono text-white appearance-none focus:border-red-500 focus:outline-none"
                                >
                                    {GAME_TYPES.map(g => (
                                        <option key={g} value={g}>{GAME_LABELS[g]}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    value={forceWinAmount}
                                    onChange={(e) => setForceWinAmount(e.target.value)}
                                    placeholder="Credit amount"
                                    className="w-full bg-black/40 border border-red-900/30 rounded-lg p-2 text-sm font-mono text-white
                    placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleForceWin}
                                    disabled={actionLoading === 'forcewin'}
                                    className="w-full py-2 bg-red-700 hover:bg-red-600 text-white font-pixel text-xs rounded-lg transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    ⚡ FORCE WIN
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                            <Search className="w-8 h-8 mb-3 opacity-30" />
                            <p className="text-xs font-pixel">Select a team</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ========================================
// TAB C: "THE DECK" — Question Manager
// ========================================
function TheDeck() {
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [bulkJson, setBulkJson] = useState('')
    const [showUpload, setShowUpload] = useState(false)
    const [filter, setFilter] = useState<string>('all')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        setLoading(true)
        const data = await getAllQuestions()
        if (data && !data.error) {
            setQuestions(data.questions || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    const freshQuestions = questions.filter(q => !q.is_used)
    const burnedQuestions = questions.filter(q => q.is_used)
    const filteredQuestions = filter === 'all' ? questions : questions.filter(q => q.game_type === filter.toUpperCase())

    const handleToggle = async (id: string, current: boolean) => {
        setActionLoading(`toggle-${id}`)
        await toggleQuestion(id, !current)
        await refresh()
        setActionLoading(null)
    }

    const handleBurn = async (id: string) => {
        setActionLoading(`burn-${id}`)
        await burnQuestion(id)
        await refresh()
        setActionLoading(null)
    }

    const handleReshuffle = async () => {
        setActionLoading('reshuffle')
        await reshuffleAllQuestions()
        await refresh()
        setActionLoading(null)
    }

    const handleBulkUpload = async () => {
        if (!bulkJson.trim()) return
        setActionLoading('upload')
        const result = await bulkUploadQuestions(bulkJson)
        if (result && !result.error) {
            setBulkJson('')
            setShowUpload(false)
            await refresh()
        }
        setActionLoading(null)
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#12121a] rounded-xl border border-green-900/30 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-green-400">{freshQuestions.length}</p>
                    <p className="text-[10px] font-pixel text-green-400/60 mt-1">FRESH DECK</p>
                </div>
                <div className="bg-[#12121a] rounded-xl border border-red-900/30 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-red-400">{burnedQuestions.length}</p>
                    <p className="text-[10px] font-pixel text-red-400/60 mt-1">BURNED</p>
                </div>
                <div className="bg-[#12121a] rounded-xl border border-white/10 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-white">{questions.length}</p>
                    <p className="text-[10px] font-pixel text-gray-500 mt-1">TOTAL</p>
                </div>
                <div className="bg-[#12121a] rounded-xl border border-blue-900/30 p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-blue-400">{questions.filter(q => q.is_active).length}</p>
                    <p className="text-[10px] font-pixel text-blue-400/60 mt-1">ACTIVE</p>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleReshuffle}
                    disabled={actionLoading === 'reshuffle'}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-pixel rounded-lg transition-all disabled:opacity-40"
                >
                    <RotateCcw className="w-3.5 h-3.5" /> RESHUFFLE ALL
                </button>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-pixel rounded-lg transition-all"
                >
                    <Upload className="w-3.5 h-3.5" /> BULK UPLOAD
                </button>
                <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-pixel rounded-lg transition-all">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> REFRESH
                </button>
            </div>

            {/* Bulk Upload Panel */}
            {showUpload && (
                <div className="bg-[#12121a] rounded-xl border border-blue-900/30 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-pixel text-blue-400 tracking-widest">BULK UPLOAD (JSON)</h4>
                        <button onClick={() => setShowUpload(false)} className="text-gray-600 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        value={bulkJson}
                        onChange={(e) => setBulkJson(e.target.value)}
                        placeholder={`[
  {
    "game_type": "SLOTS",
    "difficulty": "STANDARD",
    "title": "Fix the loop",
    "problem_statement": "The loop runs infinitely...",
    "starter_code": "def solve(): ...",
    "test_cases": [{"input": "5", "expected": "10"}],
    "is_used": false,
    "is_active": true
  }
]`}
                        className="w-full h-48 bg-black/40 border border-blue-900/30 rounded-lg p-4 text-sm font-mono text-blue-200
              placeholder:text-blue-900/40 focus:border-blue-500 focus:outline-none resize-none"
                    />
                    <button
                        onClick={handleBulkUpload}
                        disabled={actionLoading === 'upload' || !bulkJson.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-pixel rounded-lg transition-all disabled:opacity-40"
                    >
                        UPLOAD
                    </button>
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-pixel rounded-lg transition-all
            ${filter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                >
                    ALL
                </button>
                {GAME_TYPES.map(g => (
                    <button
                        key={g}
                        onClick={() => setFilter(g)}
                        className={`px-3 py-1.5 text-[10px] font-pixel rounded-lg transition-all
              ${filter === g ? 'bg-white text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                    >
                        {g.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Question List */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                    {filteredQuestions.map(q => (
                        <div key={q.id} className={`flex items-center justify-between px-4 py-3 border-b border-white/5 text-sm
              ${q.is_used ? 'opacity-40' : ''}`}
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-grow">
                                <span className={`text-[9px] font-pixel px-2 py-0.5 rounded shrink-0
                  ${q.game_type === 'SLOTS' ? 'bg-yellow-900/30 text-yellow-400' :
                                        q.game_type === 'ROULETTE' ? 'bg-red-900/30 text-red-400' :
                                            q.game_type === 'BLACKJACK' ? 'bg-blue-900/30 text-blue-400' :
                                                q.game_type === 'HOLDEM' ? 'bg-green-900/30 text-green-400' :
                                                    'bg-purple-900/30 text-purple-400'}`}>
                                    {q.game_type}
                                </span>
                                <span className={`text-[9px] font-pixel px-2 py-0.5 rounded shrink-0
                  ${q.difficulty === 'HIGH' ? 'bg-red-600/20 text-red-300' : 'bg-green-900/20 text-green-300'}`}>
                                    {q.difficulty}
                                </span>
                                <div className="flex flex-col flex-grow ml-2 min-w-0">
                                    <span className="font-mono text-xs text-white break-words">{q.title}</span>
                                    {q.problem_statement && (
                                        <div className="font-sans text-[10px] text-gray-400 mt-1 whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                                            {q.problem_statement}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                {q.is_used && (
                                    <span className="text-[8px] font-pixel text-red-400 bg-red-900/20 px-2 py-0.5 rounded flex-shrink-0">BURNED</span>
                                )}
                                <button
                                    onClick={() => handleToggle(q.id, q.is_active)}
                                    disabled={!!actionLoading?.startsWith('toggle')}
                                    className="p-1.5 rounded hover:bg-white/10 transition-colors"
                                    title={q.is_active ? 'Deactivate' : 'Activate'}
                                >
                                    {q.is_active
                                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                                        : <ToggleLeft className="w-5 h-5 text-gray-600" />
                                    }
                                </button>
                                <button
                                    onClick={() => handleBurn(q.id)}
                                    disabled={q.is_used || !!actionLoading?.startsWith('burn')}
                                    className="p-1.5 rounded hover:bg-red-900/20 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-20"
                                    title="Burn Card"
                                >
                                    <Flame className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredQuestions.length === 0 && (
                        <div className="text-center text-gray-600 text-sm py-10 font-mono">
                            No questions found
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ========================================
// TAB D: "THE EYE" — Leaderboard & Analytics
// ========================================
function TheEye() {
    const [leaderboard, setLeaderboard] = useState<any[]>([])
    const [analytics, setAnalytics] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        setLoading(true)
        const [lb, an] = await Promise.all([getLeaderboard(), getAnalytics()])
        if (lb && !lb.error) setLeaderboard(lb.leaderboard || [])
        if (an && !an.error) setAnalytics(an)
        setLoading(false)
    }, [])

    useEffect(() => { refresh() }, [refresh])

    const maxBalance = leaderboard[0]?.wallet_balance || 1

    return (
        <div className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                    { label: 'TOTAL ECONOMY', value: `$${analytics?.totalEconomy || 0}`, color: 'text-yellow-400', border: 'border-yellow-900/30' },
                    { label: 'AVG BALANCE', value: `$${analytics?.avgBalance || 0}`, color: 'text-blue-400', border: 'border-blue-900/30' },
                    { label: 'HIGHEST', value: `$${analytics?.maxBalance || 0}`, color: 'text-green-400', border: 'border-green-900/30' },
                    { label: 'LOWEST', value: `$${analytics?.minBalance || 0}`, color: 'text-red-400', border: 'border-red-900/30' },
                    { label: 'TEAMS', value: analytics?.teamCount || 0, color: 'text-purple-400', border: 'border-purple-900/30' },
                ].map((stat, i) => (
                    <div key={i} className={`bg-[#12121a] rounded-xl border ${stat.border} p-4 text-center`}>
                        <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-[10px] font-pixel text-gray-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Wallet Distribution (Bar Graph) */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-pixel text-gray-400 tracking-widest uppercase flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Wallet Distribution
                    </h3>
                    <button onClick={refresh} className="text-gray-600 hover:text-white transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {leaderboard.map((team, i) => {
                        const pct = maxBalance > 0 ? (team.wallet_balance / maxBalance) * 100 : 0
                        return (
                            <div key={team.id} className="flex items-center gap-3">
                                <span className={`w-6 text-right text-xs font-mono shrink-0
                  ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                                </span>
                                <span className="w-24 text-xs font-mono text-gray-400 truncate shrink-0">{team.access_code}</span>
                                <div className="flex-grow bg-black/30 rounded-full h-5 overflow-hidden relative">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                                            i === 1 ? 'bg-gradient-to-r from-gray-500 to-gray-300' :
                                                i === 2 ? 'bg-gradient-to-r from-orange-700 to-orange-400' :
                                                    'bg-gradient-to-r from-blue-900 to-blue-600'
                                            }`}
                                        style={{ width: `${Math.max(pct, 2)}%` }}
                                    />
                                </div>
                                <span className="w-16 text-right text-xs font-mono text-white shrink-0 font-bold">${team.wallet_balance}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-[#12121a] rounded-xl border border-white/10 overflow-hidden">
                <div className="px-4 py-3 bg-black/30 border-b border-white/5 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-pixel text-gray-400 tracking-widest">FULL LEADERBOARD</span>
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                    {leaderboard.map((team, i) => {
                        const stamps = (team.stamps as Record<string, boolean>) || {}
                        const stampCount = Object.values(stamps).filter(Boolean).length

                        return (
                            <div key={team.id} className={`flex items-center justify-between px-4 py-3 border-b border-white/5
                ${i < 3 ? 'bg-yellow-900/5' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-mono w-8 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'
                                        }`}>
                                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                                    </span>
                                    <span className="font-mono text-sm text-white">{team.access_code}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1">
                                        {GAME_TYPES.map(g => (
                                            <span key={g} className={`w-4 h-4 text-[8px] flex items-center justify-center rounded
                        ${stamps[g] ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-700'}`}>
                                                {stamps[g] ? '★' : '○'}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-500 font-mono">{stampCount}/5</span>
                                    <span className="font-mono text-sm font-bold text-yellow-400 w-20 text-right">${team.wallet_balance}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
