'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime, getCategoryColor, initials } from '@/lib/utils'
import { User, Lock, BookOpen, Activity, CheckCircle, Clock, Loader2 } from 'lucide-react'

export default function StudentProfile({ profile, enrollments, sessions }: {
  profile: any, enrollments: any[], sessions: any[]
}) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', profile.id)
    if (error) toast.error(error.message)
    else toast.success('Profile updated')
    setSaving(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Min 8 characters'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast.error(error.message)
    else { toast.success('Password updated'); setNewPassword(''); setConfirmPassword('') }
    setSaving(false)
  }

  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'submitted')
  const inProgressSessions = sessions.filter(s => s.status === 'in_progress')

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold">
          {initials(profile.first_name, profile.last_name)}
        </div>
        <div>
          <h1 className="page-title">{profile.first_name} {profile.last_name}</h1>
          <p className="text-gray-500 text-sm">{profile.email}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            Student ID: {profile.student_details?.student_id ?? '—'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="ehr-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{enrollments.length}</div>
          <div className="text-xs text-gray-500 mt-1">Enrolled Courses</div>
        </div>
        <div className="ehr-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{inProgressSessions.length}</div>
          <div className="text-xs text-gray-500 mt-1">In Progress</div>
        </div>
        <div className="ehr-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{completedSessions.length}</div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Profile */}
        <div className="ehr-card">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" /> Edit Profile
            </span>
          </div>
          <form onSubmit={saveProfile} className="ehr-card-body space-y-3">
            <div>
              <label className="form-label">First Name</label>
              <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input bg-gray-50" value={profile.email} disabled />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Save
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="ehr-card">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" /> Change Password
            </span>
          </div>
          <form onSubmit={changePassword} className="ehr-card-body space-y-3">
            <div>
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Enrollments */}
      <div className="ehr-card">
        <div className="ehr-card-header">
          <span className="font-semibold text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500" /> My Enrollments
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {enrollments.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">No enrollments yet</div>
          )}
          {enrollments.map(en => (
            <div key={en.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-emerald-700 text-sm">{en.course?.course_code}</span>
                <span className="text-sm text-gray-700 ml-2">{en.course?.title}</span>
                <div className="text-xs text-gray-400 mt-0.5">
                  {en.course?.semester?.academic_year?.year_label} · {en.course?.semester?.name}
                </div>
              </div>
              <span className={`badge text-xs ${en.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                {en.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="ehr-card">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Simulation History
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {sessions.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{s.course_simulation?.scenario?.title}</div>
                  <div className="flex gap-2 mt-1">
                    <span className={`badge text-xs ${getCategoryColor(s.course_simulation?.scenario?.category)}`}>
                      {s.course_simulation?.scenario?.category}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge text-xs ${s.status === 'completed' ? 'badge-green' : s.status === 'in_progress' ? 'badge-amber' : 'badge-gray'}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(s.started_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
