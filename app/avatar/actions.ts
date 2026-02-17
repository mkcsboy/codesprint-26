'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function selectAvatarAction(formData: FormData) {
  const teamId = cookies().get('team_id')?.value
  if (!teamId) redirect('/')

  // CASE 1: CONFIRM ENTRY (User clicked "Enter Casino")
  if (formData.get('confirm_entry') === 'true') {
    redirect('/map')
  }

  // CASE 2: SELECTING AN AVATAR
  const avatarId = Number(formData.get('avatar_id'))

  // 1. Check if taken (Double check server-side)
  const { data } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('avatar_id', avatarId)
    .neq('id', teamId)
    .maybeSingle()

  // Explicit Cast to fix TypeScript error
  const existingOwner = data as { id: string } | null

  if (existingOwner) {
    // Already taken, refresh page to show lock
    revalidatePath('/avatar')
    return
  }

  // 2. Claim it
  const { error } = await supabaseAdmin
    .from('teams')
    .update({ avatar_id: avatarId })
    .eq('id', teamId)

  if (error) {
    console.error('Avatar Update Error:', error)
  }

  revalidatePath('/avatar')
}