'use client'

import { useFormState } from "react-dom"
import { loginAction } from "./actions"
import { Gamepad2 } from "lucide-react"

const initialState = {
  error: null as string | null,
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full gap-8 animate-fade-in">

      {/* HEADER */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl text-retro-gold drop-shadow-[4px_4px_0_#000] font-pixel">
          CODESPRINT&apos;26
        </h1>
        <p className="text-retro-green text-sm md:text-base tracking-widest font-pixel">
          INSERT COIN TO START
        </p>
      </div>

      {/* LOGIN CARD */}
      <div className="bg-retro-purple border-4 border-retro-gold shadow-pixel p-8 w-full max-w-md relative">

        {/* Decorative corner pixels */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-retro-purple border-t-4 border-l-4 border-retro-gold" />
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-retro-purple border-t-4 border-r-4 border-retro-gold" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-retro-purple border-b-4 border-l-4 border-retro-gold" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-retro-purple border-b-4 border-r-4 border-retro-gold" />

        <form action={formAction} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="access_code" className="text-xs uppercase tracking-widest text-retro-gold font-pixel">
              Access Code
            </label>
            <input
              id="access_code"
              name="access_code"
              type="text"
              placeholder="ENTER-CODE"
              autoComplete="off"
              className="bg-black text-white p-4 font-pixel text-center uppercase focus:outline-none focus:ring-4 focus:ring-retro-green border-2 border-white/20 placeholder:text-white/30"
            />
          </div>

          <button
            type="submit"
            className="group relative bg-retro-green text-black py-4 px-6 font-bold hover:bg-white transition-colors shadow-pixel active:translate-y-1 active:shadow-none"
          >
            <span className="flex items-center justify-center gap-3 font-pixel">
              START GAME <Gamepad2 className="w-5 h-5" />
            </span>
          </button>

          {/* Error Message */}
          {state?.error && (
            <div className="text-red-500 text-center text-xs bg-black/50 p-2 border border-red-500 font-pixel animate-bounce">
              ERROR: {state.error}
            </div>
          )}
        </form>
      </div>

      <div className="text-xs text-white/50 mt-8 font-pixel">
        PRESS ENTER TO SUBMIT
      </div>
    </div>
  )
}