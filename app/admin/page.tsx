'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()

      if (data.success) {
        router.push('/admin/dashboard')
      } else {
        setError(data.error || 'ACCESS DENIED')
      }
    } catch {
      setError('CONNECTION FAILED')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,215,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />

      {/* Glowing orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-900/20 rounded-full blur-[120px]" />

      <div className="z-10 flex flex-col items-center gap-8 w-full max-w-md px-4">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl md:text-4xl text-red-500 font-pixel tracking-wider">
              PIT BOSS
            </h1>
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-400/60 text-xs font-pixel tracking-widest uppercase">
            Authorized Dealers Only
          </p>
          <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        </div>

        {/* Login Card */}
        <div className="w-full bg-[#12121a] border border-red-900/30 rounded-xl p-8 shadow-2xl shadow-red-900/10 relative overflow-hidden">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/40 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500/40 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500/40 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/40 rounded-br-xl" />

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-red-400/80 font-pixel">
                Dealer Access Code
              </label>
              <div className="relative">
                <input
                  type={showCode ? 'text' : 'password'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="off"
                  className="w-full bg-black/60 text-red-400 p-4 font-mono text-center text-lg tracking-[0.3em] uppercase
                    border border-red-900/40 rounded-lg
                    focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30
                    placeholder:text-red-900/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-red-900/60 hover:text-red-400 transition-colors"
                >
                  {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`relative py-4 px-6 font-pixel text-sm uppercase tracking-widest rounded-lg transition-all
                ${loading
                  ? 'bg-red-900/30 text-red-900 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 active:translate-y-0.5'
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  VERIFYING...
                </span>
              ) : (
                'ENTER THE PIT'
              )}
            </button>

            {error && (
              <div className="text-red-500 text-center text-xs font-pixel bg-red-900/20 p-3 rounded-lg border border-red-900/40 animate-pulse">
                ⚠ {error}
              </div>
            )}
          </form>
        </div>

        <p className="text-red-900/40 text-[10px] font-pixel tracking-widest">
          SECURITY LEVEL: MAXIMUM
        </p>
      </div>
    </div>
  )
}
