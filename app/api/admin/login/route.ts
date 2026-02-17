import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Dealer access codes - In production, store these in Supabase admin_users table
const DEALER_CODES = [
    'PITBOSS-ALPHA',
    'PITBOSS-OMEGA',
]

export async function POST(request: Request) {
    try {
        const { code } = await request.json()

        if (!code) {
            return NextResponse.json({ success: false, error: 'CODE REQUIRED' })
        }

        const isValid = DEALER_CODES.includes(code.toUpperCase())

        if (!isValid) {
            return NextResponse.json({ success: false, error: 'ACCESS DENIED' })
        }

        // Set admin session cookie
        cookies().set('admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 12, // 12 hours
            path: '/',
        })

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ success: false, error: 'SYSTEM ERROR' })
    }
}
