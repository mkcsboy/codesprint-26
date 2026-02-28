import { supabaseAdmin } from '@/lib/supabase/server'
import { AVATAR_LIST, getAvatarUrl } from '@/lib/avatars'
import { selectAvatarAction } from './actions'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Check, Lock } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

// FIX: Define the shape of the data we expect from the DB
type TeamData = {
  id: string;
  access_code: string;
  avatar_id: number;
}

export default async function AvatarSelectionPage() {
  const cookieStore = cookies()
  const myTeamId = cookieStore.get('team_id')?.value

  if (!myTeamId) redirect('/')

  // 1. Fetch ALL teams
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id, access_code, avatar_id')

  if (error) {
    console.error("Error fetching teams:", error)
    return <div className="text-white">System Error loading avatars.</div>
  }

  // FIX: Explicitly cast the data so TypeScript stops complaining
  const allTeams = data as TeamData[] | null

  // 2. Map taken avatars
  const takenAvatars: Record<number, string> = {}
  let myCurrentAvatar = 0

  if (allTeams) {
    allTeams.forEach((team) => {
      if (team.avatar_id) {
        takenAvatars[team.avatar_id] = team.access_code
      }
      if (team.id === myTeamId) {
        myCurrentAvatar = team.avatar_id
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#1a1a24] text-white p-8 font-pixel animate-fade-in">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between mb-12 gap-6 relative">
        <div className="flex-1"></div>
        <div className="text-center space-y-4 flex-1">
          <h1 className="text-3xl md:text-5xl text-retro-gold drop-shadow-[4px_4px_0_#000] whitespace-nowrap">
            CHOOSE YOUR IDENTITY
          </h1>
          <p className="text-gray-400 text-xs md:text-sm tracking-widest uppercase">
            Each avatar can only be claimed by one team. Choose wisely.
          </p>
        </div>
        <div className="flex-1 flex justify-end items-center h-full">
          <LogoutButton teamId={myTeamId} />
        </div>
      </div>

      {/* AVATAR GRID */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
        {AVATAR_LIST.map((avatar) => {

          const isTaken = takenAvatars[avatar.id] !== undefined
          const takenByMe = myCurrentAvatar === avatar.id
          const takenByName = takenAvatars[avatar.id]

          const isDisabled = isTaken && !takenByMe

          return (
            <form key={avatar.id} action={selectAvatarAction} className="relative group">
              <input type="hidden" name="avatar_id" value={avatar.id} />

              <button
                type="submit"
                disabled={isDisabled}
                className={`
                  w-full relative p-4 border-4 transition-all duration-200 flex flex-col items-center gap-4
                  ${isDisabled
                    ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed grayscale'
                    : takenByMe
                      ? 'border-retro-green bg-retro-green/10 scale-105 shadow-[0_0_20px_#39ff14]'
                      : 'border-white/20 bg-[#2a2b38] hover:border-retro-gold hover:-translate-y-2 hover:shadow-pixel'
                  }
                `}
              >
                {/* AVATAR IMAGE */}
                <div className="relative w-20 h-20">
                  <img
                    src={getAvatarUrl(avatar.seed)}
                    alt={avatar.name}
                    className="w-full h-full rounded-md"
                  />

                  {/* LOCK ICON */}
                  {isDisabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-md">
                      <Lock className="w-8 h-8 text-red-500" />
                    </div>
                  )}

                  {/* CHECK ICON */}
                  {takenByMe && (
                    <div className="absolute -top-3 -right-3 bg-retro-green text-black p-1 rounded-full border-2 border-black">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* INFO TEXT */}
                <div className="text-center w-full">
                  <div className="text-[10px] uppercase font-bold tracking-widest mb-1 truncate">
                    {avatar.name}
                  </div>

                  {isDisabled ? (
                    <div className="text-[8px] bg-red-900/50 text-red-300 py-1 px-2 rounded border border-red-500/30 truncate">
                      ACQUIRED BY: {takenByName}
                    </div>
                  ) : takenByMe ? (
                    <div className="text-[8px] bg-retro-green/20 text-retro-green py-1 px-2 rounded border border-retro-green/30">
                      SELECTED
                    </div>
                  ) : (
                    <div className="text-[8px] text-gray-500 group-hover:text-retro-gold">
                      AVAILABLE
                    </div>
                  )}
                </div>
              </button>
            </form>
          )
        })}
      </div>

      {/* FOOTER */}
      <div className="text-center mt-12">
        {myCurrentAvatar > 0 && (
          <form action={selectAvatarAction}>
            <input type="hidden" name="confirm_entry" value="true" />
            <button className="bg-retro-green text-black text-xl px-12 py-4 font-bold shadow-pixel hover:scale-105 active:scale-95 transition-transform uppercase">
              ENTER THE CASINO &rarr;
            </button>
          </form>
        )}
      </div>

    </div>
  )
}