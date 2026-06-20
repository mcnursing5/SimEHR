'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime, initials } from '@/lib/utils'
import {
  Users, Search, Plus, ShieldCheck, GraduationCap,
  BookOpen, X, Loader2, Mail, UserCheck, UserX,
  Filter, Download, Layers
} from 'lucide-react'
import Link from 'next/link'

const ROLES = [
  { value: 'student',         label: 'Student',          badge: 'badge-blue' },
  { value: 'faculty',         label: 'Faculty',           badge: 'badge-green' },
  { value: 'sim_coordinator', label: 'Sim Coordinator',   badge: 'badge-indigo' },
  { value: 'admin',           label: 'Admin',             badge: 'badge-purple' },
]

export default function AdminUsersManager({ users: initialUsers, currentUserId }: { users: any[], currentUserId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [invite, setInvite] = useState({ email: '', first_name: '', last_name: '', role: 'student' })

  const filtered = users.filter(u => {
    const name = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchRole = !filterRole || u.role === filterRole
    const matchActive = filterActive === '' ? true : filterActive === 'active' ? u.is_active : !u.is_active
    return matchSearch && matchRole && matchActive
  })

  const counts = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    sim_coordinator: users.filter(u => u.role === 'sim_coordinator').length,
    faculty: users.filter(u => u.role === 'faculty').length,
    student: users.filter(u => u.role === 'student').length,
    active: users.filter(u => u.is_active).length,
  }

  async function toggleActive(userId: string, current: boolean) {
    if (userId === currentUserId) { toast.error("You can't deactivate yourself"); return }
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', userId)
    if (!error) {
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, is_active: !current } : usr))
      toast.success(`User ${!current ? 'activated' : 'deactivated'}`)
    }
  }

  async function changeRole(userId: string, newRole: string) {
    if (userId === currentUserId) { toast.error("You can't change your own role"); return }
    try {
      const res = await fetch('/api/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers(u => u.map(usr => usr.id === userId ? { ...usr, role: newRole } : usr))
      toast.success('Role updated')
    } catch (err: any) {
      toast.error('Failed to update role: ' + err.message)
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Invitation sent to ${invite.email}`)
      setShowInvite(false)
      setInvite({ email: '', first_name: '', last_name: '', role: 'student' })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    }
    setInviteLoading(false)
  }

  function exportCSV() {
    const rows = [
      ['Last Name', 'First Name', 'Email', 'Role', 'Status', 'Created'],
      ...filtered.map(u => [u.last_name, u.first_name, u.email, u.role, u.is_active ? 'Active' : 'Inactive', formatDate(u.created_at)])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'simehr_users.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Users exported')
  }

  const roleIcon = (role: string) => {
    if (role === 'admin') return <ShieldCheck className="w-3.5 h-3.5" />
    if (role === 'sim_coordinator') return <Layers className="w-3.5 h-3.5" />
    if (role === 'faculty') return <BookOpen className="w-3.5 h-3.5" />
    return <GraduationCap className="w-3.5 h-3.5" />
  }

  const roleBadge = (role: string) => {
    return ROLES.find(r => r.value === role)?.badge ?? 'badge-gray'
  }

  const roleLabel = (role: string) => {
    return ROLES.find(r => r.value === role)?.label ?? role
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
           User Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {counts.total} total · {counts.admin} admin · {counts.sim_coordinator} sim coordinator{counts.sim_coordinator !== 1 ? 's' : ''} · {counts.faculty} faculty · {counts.student} students
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn btn-secondary btn-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowInvite(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: counts.total, color: 'text-gray-700' },
          { label: 'Admins', value: counts.admin, color: 'text-purple-600' },
          { label: 'Sim Coordinators', value: counts.sim_coordinator, color: 'text-indigo-600' },
          { label: 'Faculty', value: counts.faculty, color: 'text-emerald-600' },
          { label: 'Students', value: counts.student, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="ehr-card p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="ehr-card border-l-4 border-emerald-500">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm">Invite New User</span>
            <button onClick={() => setShowInvite(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={sendInvite} className="ehr-card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">First Name *</label>
                <input className="form-input" value={invite.first_name} onChange={e => setInvite(i => ({...i, first_name: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Last Name *</label>
                <input className="form-input" value={invite.last_name} onChange={e => setInvite(i => ({...i, last_name: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={invite.email} onChange={e => setInvite(i => ({...i, email: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Role *</label>
                <select className="form-select" value={invite.role} onChange={e => setInvite(i => ({...i, role: e.target.value}))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={inviteLoading} className="btn btn-primary">
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Send Invitation
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="ehr-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="form-input pl-9" placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select className="form-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
        {filtered.length !== users.length && (
          <div className="text-xs text-gray-500 mt-2">{filtered.length} of {users.length} users shown</div>
        )}
      </div>

      {/* Users table */}
      <div className="ehr-card overflow-x-auto">
        <table className="ehr-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>ID</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-8">No users found</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      u.role === 'admin' ? 'bg-purple-500'
                      : u.role === 'sim_coordinator' ? 'bg-indigo-500'
                      : u.role === 'faculty' ? 'bg-emerald-500'
                      : 'bg-emerald-500'
                    }`}>
                      {initials(u.first_name, u.last_name)}
                    </div>
                    <span className="font-medium text-sm">{u.last_name}, {u.first_name}</span>
                  </div>
                </td>
                <td className="text-gray-500 text-sm">{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={e => changeRole(u.id, e.target.value)}
                    disabled={u.id === currentUserId}
                    className={`badge ${roleBadge(u.role)} border-0 cursor-pointer text-xs`}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label.toLowerCase()}</option>)}
                  </select>
                </td>
                <td className="font-mono text-xs text-gray-400">
                  {u.student_details?.student_id ?? u.faculty_details?.faculty_id ?? '—'}
                </td>
                <td>
                  <span className={`badge text-xs ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-xs text-gray-400">{u.last_login ? formatDateTime(u.last_login) : 'Never'}</td>
                <td className="text-xs text-gray-400">{formatDate(u.created_at)}</td>
                <td>
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    disabled={u.id === currentUserId}
                    className={`btn btn-sm ${u.is_active ? 'btn-secondary text-red-500' : 'btn-success'}`}
                    title={u.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {u.is_active
                      ? <UserX className="w-3.5 h-3.5" />
                      : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
