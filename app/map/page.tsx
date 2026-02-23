import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import MapClient from './map-client'

export default async function MapPage() {
  // 1. Check for the Login Cookie
  const cookieStore = cookies()
  const teamId = cookieStore.get('team_id')?.value

  if (!teamId) {
    redirect('/') // Send back to login if no cookie
  }

  // 2. Fetch the Team Data from DB
  const { data: team, error } = await supabaseAdmin
    .from('teams')
    .select('id, wallet_balance, avatar_id')
    .eq('id', teamId)
    .single()

  if (error || !team) {
    console.error("Error fetching team:", error)
    redirect('/')
  }

  // 3. Render the Client Map with the fetched data
  return <MapClient userData={team} />
}