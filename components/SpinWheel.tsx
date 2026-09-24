'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { spinWheel } from '@/app/actions'

const MULTIPLIERS = [1, 1.25, 1.5, 1, 1.75, 1, 2, 1] // Added 1x as the 8th to complete 8 slices
const SLICE_ANGLE = 360 / MULTIPLIERS.length

interface SpinWheelProps {
  teamId: string
  gameId: string
  onSpinStart?: () => void
  onSpinComplete: (multiplier: number, newBalance: number) => void
  disabled?: boolean
}

export default function SpinWheel({ teamId, gameId, onSpinStart, onSpinComplete, disabled = false }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [hasSpun, setHasSpun] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [spinError, setSpinError] = useState<string | null>(null)
  
  const handleSpinClick = async () => {
    if (isSpinning || hasSpun || disabled) return
    setSpinError(null)
    setIsSpinning(true)
    onSpinStart?.()

    // Call server to deduct 150 coins and enter game
    const res = await spinWheel(teamId, gameId)
    if (res.error) {
      alert(res.error)
      setSpinError(res.error)
      setIsSpinning(false)
      return
    }

    // Determine winning slice
    const winIndex = Math.floor(Math.random() * MULTIPLIERS.length)
    const winningMultiplier = MULTIPLIERS[winIndex]

    // Calculate rotation (target the center of the slice)
    const baseRotations = 5 * 360
    const targetRotation = baseRotations + (360 - (winIndex * SLICE_ANGLE + SLICE_ANGLE / 2))
    
    const randomOffset = (Math.random() - 0.5) * (SLICE_ANGLE * 0.8)
    const finalRotation = rotation + targetRotation + randomOffset

    setRotation(finalRotation)

    // Wait for animation to finish
    setTimeout(() => {
      setIsSpinning(false)
      setHasSpun(true)
      onSpinComplete(winningMultiplier, res.newBalance)
    }, 4000)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#1a2318] border-[3px] border-retro-brass p-3 md:p-4 rounded-2xl relative shadow-[0_0_20px_rgba(34,197,94,0.1)]">
      <h3 className="text-sm md:text-base font-pixel text-retro-gold mb-2 text-center tracking-widest leading-loose">BONUS WHEEL</h3>
      
      {/* Pointer */}
      <div className="relative z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-red-500 mb-[-10px]" />
      
      {/* Wheel */}
      <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-retro-brass overflow-hidden shadow-xl bg-black">
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full h-full rounded-full relative"
          style={{ transformOrigin: 'center center' }}
        >
          {MULTIPLIERS.map((mult, index) => {
            const angle = index * SLICE_ANGLE
            const color = index % 2 === 0 ? '#000000' : '#8b0000'
            const textColor = index % 2 === 0 ? 'text-white' : 'text-black'
            return (
              <div
                key={index}
                className="absolute top-0 left-0 w-full h-full flex items-start justify-center"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: '50% 50%',
                }}
              >
                {/* SVG Slice */}
                <svg viewBox="0 0 100 100" className="absolute top-0 left-0 w-full h-full">
                  <path d="M 50 50 L 50 0 A 50 50 0 0 1 85.3553 14.6447 Z" fill={color} />
                </svg>
                <div 
                  className={`absolute inset-0 flex items-start justify-center pt-2 ${textColor}`}
                  style={{ transform: `rotate(22.5deg)` }}
                >
                  <span className="font-hud font-bold text-xs md:text-sm text-shadow-sm">
                    {mult}x
                  </span>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>

      <div className="mt-4 text-center w-full">
        {hasSpun ? (
          <div className="text-lg font-hud font-bold text-neon-green animate-pulse">WHEEL APPLIED!</div>
        ) : (
          <button 
            onClick={handleSpinClick}
            disabled={isSpinning || disabled}
            className="w-full max-w-[200px] bg-retro-gold hover:bg-yellow-400 text-black font-pixel py-2 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-retro hover:-translate-y-1"
          >
            {isSpinning ? (
              <span className="block font-bold mt-1">SPINNING...</span>
            ) : (
              <>
                <span className="block font-bold">SPIN</span>
                <span className="block text-[8px] opacity-70 tracking-tight leading-none mt-1">(50 Coins)</span>
              </>
            )}
          </button>
        )}
        {spinError && (
          <div className="text-red-400 text-xs font-mono mt-3">{spinError}</div>
        )}
      </div>
    </div>
  )
}
