'use client'

import { useState } from 'react'
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Update last_login
    await supabase
      .from('profiles')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id)

    // Get role and redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, first_name')
      .eq('id', data.user.id)
      .single()

    toast.success(`Welcome back, ${profile?.first_name ?? ''}!`)
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg">
            <Activity className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SimEHR</h1>
          <p className="text-emerald-300 mt-1 text-sm">Nursing Simulation Electronic Health Record</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="form-label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="form-input pl-10"
                  placeholder="you@university.edu"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 text-base"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Don't have an account? Contact your faculty administrator.<br />
              Students receive an invitation email to set up their login.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-emerald-400 mt-6">
          For simulation use only • Not a clinical system
        </p>
      </div>
    </div>
  )
}
