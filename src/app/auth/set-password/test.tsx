'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Activity, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    // Get user info from the session established by the invite link
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata) {
        setName(`${user.user_metadata.first_name ?? ''} ${user.user_metadata.last_name ?? ''}`.trim())
      }
    })
  }, [])

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Passwords match', met: password === confirm && confirm.length > 0 },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password set! Welcome to SimEHR.')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg">
            <Activity className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">SimEHR</h1>
          <p className="text-emerald-300 mt-1 text-sm">Set Your Password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {name && (
            <div className="mb-6 p-3 bg-emerald-50 rounded-lg text-center">
              <p className="text-sm text-emerald-700">Welcome, <strong>{name}</strong>!</p>
              <p className="text-xs text-emerald-500 mt-1">Create a secure password to access SimEHR</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10"
                  placeholder="Create a strong password"
                  required
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="form-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Repeat your password"
                  required
                />
              </div>
            </div>

            {/* Password requirements */}
            <div className="space-y-1.5">
              {requirements.map(req => (
                <div key={req.label} className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`w-4 h-4 ${req.met ? 'text-green-500' : 'text-gray-300'}`} />
                  <span className={req.met ? 'text-green-700' : 'text-gray-400'}>{req.label}</span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !requirements.every(r => r.met)}
              className="btn btn-primary w-full justify-center py-2.5 text-base"
            >
              {loading ? 'Setting password...' : 'Set Password & Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
