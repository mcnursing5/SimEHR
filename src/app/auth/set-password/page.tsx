'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Activity, Lock, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [checking, setChecking] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    async function handleInviteToken() {
      const fullUrl = window.location.href
      const hash = window.location.hash
      const search = window.location.search

      console.log('[set-password] full URL:', fullUrl)
      console.log('[set-password] hash:', hash)
      console.log('[set-password] search:', search)
      setDebugInfo(`hash: ${hash || 'none'} | search: ${search || 'none'}`)

      // Case 1: Token is in hash fragment (#access_token=...&type=invite)
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token') ?? ''
        const type = params.get('type')

        console.log('[set-password] found token in hash, type:', type)

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken!,
          refresh_token: refreshToken,
        })

        if (error) {
          console.error('[set-password] setSession error:', error.message)
          setDebugInfo(`setSession error: ${error.message}`)
          setChecking(false)
          return
        }

        if (data.user) {
          console.log('[set-password] session set for:', data.user.email)
          const meta = data.user.user_metadata
          setName(`${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim())
          setSessionReady(true)
          window.history.replaceState(null, '', '/auth/set-password')
          setChecking(false)
          return
        }
      }

      // Case 2: Token is in query params (?token_hash=...&type=invite)
      if (search && search.includes('token_hash')) {
        const params = new URLSearchParams(search)
        const tokenHash = params.get('token_hash')
        const type = params.get('type')

        console.log('[set-password] found token_hash in query, type:', type)

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash!,
          type: type as any,
        })

        if (error) {
          console.error('[set-password] verifyOtp error:', error.message)
          setDebugInfo(`verifyOtp error: ${error.message}`)
          setChecking(false)
          return
        }

        if (data.user) {
          const meta = data.user.user_metadata
          setName(`${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim())
          setSessionReady(true)
          window.history.replaceState(null, '', '/auth/set-password')
          setChecking(false)
          return
        }
      }

      // Case 3: Already have a valid session (came via callback route)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('[set-password] existing session found:', session.user.email)
        const meta = session.user.user_metadata
        setName(`${meta?.first_name ?? ''} ${meta?.last_name ?? ''}`.trim())
        setSessionReady(true)
        setChecking(false)
        return
      }

      console.log('[set-password] no token or session found')
      setChecking(false)
    }

    handleInviteToken()
  }, [])

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Passwords match', met: password === confirm && confirm.length > 0 },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 8) { toast.error('Min 8 characters'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { toast.error(error.message) }
    else { toast.success('Password set! Welcome to SimEHR.'); router.push('/dashboard') }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-blue-300">Verifying your invitation...</p>
          {debugInfo && <p className="text-blue-400 text-xs mt-2 font-mono">{debugInfo}</p>}
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invitation Link Expired</h2>
          <p className="text-gray-500 text-sm mb-4">
            This link may have expired or already been used.
          </p>
          {debugInfo && (
            <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded p-2 mb-4 break-all">
              {debugInfo}
            </p>
          )}
          <button onClick={() => router.push('/auth/login')} className="btn btn-primary w-full justify-center">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo.png" alt="Streakk" className="h-10 w-auto" />
            <h1 className="text-lg text-blue-200 whitespace-nowrap">Nursing Simulation <span className="text-2xl font-bold text-white">EHR</span></h1>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {name && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-700">Welcome, <strong>{name}</strong>!</p>
              <p className="text-xs text-blue-500 mt-1">Create a secure password to access SimEHR</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10" placeholder="Create a strong password" required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="form-input pl-10" placeholder="Repeat your password" required />
              </div>
            </div>
            <div className="space-y-1.5">
              {requirements.map(req => (
                <div key={req.label} className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`w-4 h-4 ${req.met ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={req.met ? 'text-green-700' : 'text-gray-400'}>{req.label}</span>
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading || !requirements.every(r => r.met)}
              className="btn btn-primary w-full justify-center py-2.5 text-base">
              {loading ? 'Setting password...' : 'Set Password & Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
