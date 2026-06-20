import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Log what we received for debugging
  console.log('[callback] params:', { code: !!code, token_hash: !!token_hash, type, error, error_description })

  // Supabase sometimes sends error in the URL
  if (error) {
    console.error('[callback] error from Supabase:', error, error_description)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error_description ?? error)}`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )

  // PKCE flow (code exchange)
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    console.log('[callback] exchangeCodeForSession:', { user: data?.user?.email, error: exchangeError?.message })
    if (!exchangeError && data.user) {
      return NextResponse.redirect(`${origin}/auth/set-password`)
    }
    console.error('[callback] code exchange failed:', exchangeError)
  }

  // OTP / magic link / invite flow (token_hash)
  if (token_hash && type) {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ 
      token_hash, 
      type: type as any 
    })
    console.log('[callback] verifyOtp:', { user: data?.user?.email, error: verifyError?.message })
    if (!verifyError && data.user) {
      return NextResponse.redirect(`${origin}/auth/set-password`)
    }
    console.error('[callback] OTP verify failed:', verifyError)
  }

  // Nothing worked - redirect to login
  return NextResponse.redirect(`${origin}/auth/login?error=link_expired`)
}
