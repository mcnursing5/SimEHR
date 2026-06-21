'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Activity, Eye, EyeOff, Lock, Mail, User, CheckCircle, Loader2 } from 'lucide-react'

// Configure your institution's email domain(s) here.
// Multiple domains can be added, e.g. ['montgomerycollege.edu', 'mcblogin.com']
const ALLOWED_DOMAINS = ['montgomerycollege.edu']

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const emailDomain = email.split('@')[1]?.toLowerCase() ?? ''
  const domainValid = ALLOWED_DOMAINS.length === 0 || ALLOWED_DOMAINS.includes(emailDomain)

  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Passwords match', met: password === confirm && confirm.length > 0 },
    { label: `Valid ${ALLOWED_DOMAINS[0] ?? 'institutional'} email`, met: domainValid && email.includes('@') },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!requirements.every(r => r.met)) {
      toast.error('Please fix the highlighted requirements')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Please enter your full name')
      return
    }

    setLoading(true)

    const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: 'faculty',
        },
        emailRedirectTo: `${appUrl}/auth/login`,
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
        toast.error('An account with this email already exists. Try signing in instead.')
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    // If Supabase returns a session immediately, email confirmation is OFF in project settings
    if (data.session) {
      toast.success('Account created!')
      router.push('/dashboard')
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to verify your account, then sign in.
          </p>
          <Link href="/auth/login" className="btn btn-primary w-full justify-center">
            Go to Login
          </Link>
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
            <h1 className="text-lg text-blue-200 whitespace-nowrap">Medical Simulation <span className="text-2xl font-bold text-white">EHR</span></h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Create your faculty account</h2>
          <p className="text-sm text-gray-500 mb-6">
            After registering, your Sim Coordinator or Administrator will assign you to course offerings.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="form-input pl-10" placeholder="Jane" required />
                </div>
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  className="form-input" placeholder="Smith" required />
              </div>
            </div>

            <div>
              <label className="form-label">Institutional Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="form-input pl-10" placeholder={`you@${ALLOWED_DOMAINS[0] ?? 'university.edu'}`} required />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10" placeholder="Create a strong password" required />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already have an account? <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Students: you'll receive an invitation email from your instructor — no need to register here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
