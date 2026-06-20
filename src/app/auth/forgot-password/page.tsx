'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Activity, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/set-password`,
    })
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4">
            <Activity className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SimEHR</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!sent ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email address and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="form-input pl-10" placeholder="you@university.edu" required />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <Mail className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-800">Check your email</h2>
              <p className="text-sm text-gray-500">We sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.</p>
            </div>
          )}
          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-emerald-600 hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
