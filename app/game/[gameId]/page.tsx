'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CodeEditor from '@/components/CodeEditor'

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
    title: 'TEXAS HOLD\'EM: OPTIMIZER', 
    color: 'text-green-400', 
    bg: 'bg-green-900/20',
    description: "Shortest code wins the pot.",
    rules: ["Solve correctly.", "Standard: < 30 Lines.", "High Roller: < 10 Lines."],
    starter: `def optimize_me(arr):
    # Write the shortest solution
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
  const [phase, setPhase] = useState<'RULES' | 'BETTING' | 'GAME'>('RULES')
  const [difficulty, setDifficulty] = useState<'STANDARD' | 'HIGH' | null>(null)
  
  // Editor State
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [pyodideReady, setPyodideReady] = useState(false)

  // Roulette State
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [textInput, setTextInput] = useState("")

  // --- INIT PYODIDE (THE ENGINE) ---
  useEffect(() => {
    async function initPython() {
      if (!window.loadPyodide) return
      try {
        // Only load if not already loaded
        if (!window.pyodide) {
           window.pyodide = await window.loadPyodide()
        }
        setPyodideReady(true)
        console.log("🐍 PYTHON ENGINE READY")
      } catch (e) {
        console.error("Failed to load Python", e)
      }
    }
    // Small delay to ensure script tag loaded
    setTimeout(initPython, 1000)
  }, [])

  // Update starter code when game loads
  useEffect(() => {
    if (config) setCode(config.starter)
  }, [config])


  // --- SUBMIT HANDLER (LOCAL PYTHON) ---
  const handleSubmit = async () => {
    setIsRunning(true)
    setOutput("Executing...")

    // --- LOGIC A: ROULETTE (NO CODE) ---
    if (gameId === 'roulette') {
      setTimeout(() => {
        const answer = difficulty === 'STANDARD' ? selectedOption : textInput
        if (answer === '9 14' || answer === 'A') {
            setOutput("✅ CORRECT! [STICKER AWARDED]")
        } else {
            setOutput("❌ WRONG ANSWER. [CREDITS LOST]")
        }
        setIsRunning(false)
      }, 500)
      return
    }

    // --- LOGIC B: PYTHON EXECUTION (BROWSER) ---
    if (!pyodideReady || !window.pyodide) {
      setOutput("⚠️ Python Engine loading... please wait 5s and try again.")
      setIsRunning(false)
      return
    }

    try {
      // 1. Capture stdout (print statements)
      window.pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
      `)

      // 2. Run User Code
      await window.pyodide.runPythonAsync(code)

      // 3. Get stdout
      const stdout = window.pyodide.runPython("sys.stdout.getvalue()")
      
      setOutput(`> OUTPUT:\n${stdout}`)

      // TODO: Here we will inject "Hidden Tests" using window.pyodide.runPython() 
      // Example: window.pyodide.runPython(`assert solve(10) == 20`)

    } catch (err: any) {
      setOutput(`❌ ERROR:\n${err.message}`)
    }

    setIsRunning(false)
  }

  if (!config) return <div className="text-white p-10">INVALID GAME ID</div>

  // --- PHASE 3: THE GAME ---
  if (phase === 'GAME') {
    return (
      <div className="min-h-screen bg-[#1a1a24] text-white p-4 flex flex-col items-center">
        {/* HEADER */}
        <div className="w-full max-w-6xl flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h1 className={`text-2xl font-bold font-pixel ${config.color}`}>{config.title}</h1>
          <div className="flex gap-4 font-mono text-sm">
            <div className={`px-3 py-1 rounded border ${difficulty === 'HIGH' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-green-900/50 border-green-500 text-green-400'}`}>
              RISK: {difficulty}
            </div>
            <div className={`px-3 py-1 rounded border ${pyodideReady ? 'border-green-500 text-green-500' : 'border-yellow-500 text-yellow-500'}`}>
              ENGINE: {pyodideReady ? 'READY' : 'LOADING...'}
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-6xl gap-4 h-[75vh]">
          {/* LEFT PANEL */}
          <div className="w-1/3 flex flex-col gap-4">
            <div className="bg-[#2a2b38] rounded-lg p-6 border border-white/10 flex-grow overflow-y-auto shadow-lg">
              <h2 className="text-xl font-bold mb-4 text-retro-gold">The Challenge</h2>
              <p className="text-gray-300 font-sans leading-relaxed text-sm">
                {gameId === 'roulette' ? "Predict the output." : "Write a Python script to solve the problem."}
              </p>
              {gameId === 'roulette' && (
                <div className="bg-black p-4 mt-4 rounded border border-gray-600 font-mono text-xs">
                  x = 3<br/>y = 5<br/>for i in range(1, 4):...
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
            {gameId === 'roulette' && difficulty === 'STANDARD' ? (
              <div className="flex-grow flex flex-col items-center justify-center p-10 gap-6 relative z-10">
                <h3 className="text-xl font-pixel text-gray-400">CHOOSE THE OUTPUT</h3>
                <div className="grid grid-cols-2 gap-4 w-full">
                  {ROULETTE_OPTIONS.map((opt) => (
                    <button key={opt.id} onClick={() => setSelectedOption(opt.id)} className={`p-6 border-2 rounded-xl text-xl font-bold transition-all ${selectedOption === opt.id ? 'bg-yellow-600 border-yellow-400 text-black scale-105' : 'bg-[#2a2b38] border-gray-600 hover:border-white'}`}>
                      <span className="text-gray-500 mr-2">{opt.id}.</span> {opt.value}
                    </button>
                  ))}
                </div>
              </div>
            ) : gameId === 'roulette' && difficulty === 'HIGH' ? (
              <div className="flex-grow flex flex-col items-center justify-center p-10 gap-6 relative z-10">
                <h3 className="text-xl font-pixel text-red-500">EXACT MATCH REQUIRED</h3>
                <input type="text" placeholder="Type output..." className="w-full max-w-md bg-black border-2 border-red-900 text-white text-3xl p-4 text-center rounded focus:border-red-500 outline-none font-mono" onChange={(e) => setTextInput(e.target.value)}/>
              </div>
            ) : (
              <div className="flex-grow relative z-10"> 
                 <CodeEditor starterCode={code} onChange={(newCode) => setCode(newCode)} />
              </div>
            )}

            <div className="h-20 bg-[#1a1a24] border-t border-white/10 flex items-center justify-between px-6 gap-4 z-20">
               <button onClick={() => setPhase('RULES')} className="px-6 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 font-bold rounded uppercase text-sm">Give Up</button>
               <button onClick={handleSubmit} disabled={isRunning} className={`px-8 py-3 font-bold rounded uppercase text-lg shadow-lg transition-all ${isRunning ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-green-600 hover:bg-green-500 hover:scale-105 text-black shadow-green-500/40'}`}>
                 {isRunning ? 'RUNNING...' : 'SUBMIT ➤'}
               </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // (BETTING and RULES phases hidden for brevity - KEEP THEM from previous version)
  // ... Paste Phase 1 & 2 here ...
  if (phase === 'BETTING') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d12] p-4 relative overflow-hidden">
          <div className={`absolute inset-0 opacity-10 ${config.bg} bg-[url('/noise.png')]`}></div>
          <div className="z-10 text-center space-y-8 max-w-4xl w-full">
            <h1 className={`text-4xl md:text-5xl font-pixel mb-2 ${config.color}`}>PLACE YOUR BET</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              <div onClick={() => { setDifficulty('STANDARD'); setPhase('GAME'); }} className="group cursor-pointer bg-[#1a1a24] border-4 border-gray-700 hover:border-green-500 p-8 rounded-xl transition-all hover:-translate-y-2 relative">
                <h3 className="text-2xl text-white font-bold mb-2">STANDARD</h3>
                <div className="text-4xl font-mono text-green-400 mb-4">$100</div>
                <p className="text-gray-400 text-sm">{gameId === 'roulette' ? 'Multiple Choice' : 'Normal Difficulty'}</p>
              </div>
              <div onClick={() => { setDifficulty('HIGH'); setPhase('GAME'); }} className="group cursor-pointer bg-[#2a1a1a] border-4 border-red-900 hover:border-red-500 p-8 rounded-xl transition-all hover:-translate-y-2 relative">
                <div className="absolute -top-3 right-4 bg-red-600 text-xs px-2 py-1 text-white font-bold">LEGENDARY</div>
                <h3 className="text-2xl text-white font-bold mb-2">HIGH ROLLER</h3>
                <div className="text-4xl font-mono text-red-500 mb-4">$300</div>
                <p className="text-gray-400 text-sm">{gameId === 'roulette' ? 'Exact Match Input' : 'Extreme Difficulty'}</p>
              </div>
            </div>
            <button onClick={() => setPhase('RULES')} className="mt-8 text-gray-500 hover:text-white underline text-sm">← BACK TO RULES</button>
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
                {config.rules.map((rule, i) => <li key={i} className="flex items-start gap-3 text-gray-300 font-mono text-sm"><span className={`${config.color} font-bold`}>[0{i+1}]</span>{rule}</li>)}
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