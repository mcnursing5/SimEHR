'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Settings, User, Lock, Loader2, CheckCircle } from 'lucide-react'

export default function AdminSettings({ profile }: { profile: any }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [currentPassword, setCurrentPassword] = useState('')
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
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast.error(error.message)
    else {
      toast.success('Password updated')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="page-title flex items-center gap-2">
        Settings
      </h1>

      {/* Profile */}
      <div className="ehr-card">
        <div className="ehr-card-header">
          <span className="font-semibold flex items-center gap-2"><User className="w-4 h-4 text-emerald-500" /> Profile</span>
        </div>
        <form onSubmit={saveProfile} className="ehr-card-body space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name</label>
              <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input bg-gray-50" value={profile.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
          </div>
          <div>
            <label className="form-label">Role</label>
            <input className="form-input bg-gray-50 capitalize" value={profile.role} disabled />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Save Profile
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="ehr-card">
        <div className="ehr-card-header">
          <span className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-500" /> Change Password</span>
        </div>
        <form onSubmit={changePassword} className="ehr-card-body space-y-4">
          <div>
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
