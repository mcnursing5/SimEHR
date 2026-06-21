'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Activity, Eye, EyeOff, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)

  useEffect(() => {
    // Supabase confirmation/invite links land here as:
    // /auth/login?error=link_expired#access_token=...&type=invite|signup|recovery
    // The ?error is a red herring - the real token is in the # hash
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const type = params.get('type')

      if (type === 'signup' || type === 'magiclink' || type === 'email_change') {
        // User already has a password (self-registered) - just establish the
        // session from the hash and go straight to the dashboard.
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token') ?? ''
        supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken }).then(({ error }) => {
          if (error) {
            toast.error('This confirmation link has expired. Please sign in.')
            setCheckingToken(false)
            return
          }
          toast.success('Email confirmed! Welcome to SimEHR.')
          window.location.href = '/dashboard'
        })
        return
      }

      // Invite / recovery links need to go to set-password to create a password
      window.location.href = '/auth/set-password' + hash
      return
    }
    setCheckingToken(false)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', data.user.id)
      .single()

    toast.success(`Welcome back, ${profile?.first_name ?? ''}!`)
    window.location.href = '/dashboard'
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 px-2">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 flex-wrap">
            <img src="/logo.png" alt="Streakk" className="h-7 sm:h-10 w-auto flex-shrink-0" />
            <h1 className="text-sm sm:text-lg text-blue-200 leading-tight">
              Medical Simulation <span className="text-lg sm:text-2xl font-bold text-white">EHR</span>
            </h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="form-label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="form-input pl-10" placeholder="you@university.edu"
                  required autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10" placeholder="••••••••"
                  required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 text-base">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</>
                : 'Sign In'}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Faculty: <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-medium">Create an account</Link>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Students receive an invitation email from their instructor to set up their login.
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-blue-400 mt-6">For simulation use only · Not a clinical system</p>
      </div>
    </div>
  )
}
