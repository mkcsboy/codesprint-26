'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'

// Define the shape manually to bypass the inference error
type TeamRow = {
  id: string;
  access_code: string;
}

export async function loginAction(prevState: any, formData: FormData) {
  const code = formData.get('access_code') as string

  if (!code) return { error: "Please enter a code." }

  // 1. Fetch data
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('access_code', code)
    .maybeSingle()

  if (error) {
    console.error("Database Error:", error)
    return { error: "System Error." }
  }

  // 2. Cast data to our manual type (The Fix)
  const team = data as TeamRow | null

  if (!team) {
    return { error: "INVALID CODE" }
  }

  // 3. Set Session
  cookies().set('team_id', team.id, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 
  })

  // 4. Redirect
  redirect('/avatar')
}

// --- EXISTING CODE ABOVE (Login, etc.) ---

// --- NEW: CODE EXECUTION ENGINE ---
export async function executeCode(code: string) {
  try {
    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "python",
        version: "3.10.0",
        files: [
          {
            content: code,
          },
        ],
      }),
    });

    const data = await response.json();

    // Check if Piston failed to run entirely
    if (data.message) {
      return { error: data.message };
    }

    // Return the actual output (stdout) or error (stderr)
    return { 
      output: data.run.stdout, 
      error: data.run.stderr 
    };

  } catch (err) {
    return { error: "Failed to connect to compiler." };
  }
}