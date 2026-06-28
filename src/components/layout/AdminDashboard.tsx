import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function AdminDashboard({ profile }: { profile: any }) {
  const supabase = await createClient()

  const [
    { count: userCount },
    { count: courseCount },
    { count: scenarioCount },
    { count: activeSessionCount },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('simulation_scenarios').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('student_sessions').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('profiles').select('id, first_name, last_name, email, role, created_at')
      .order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Users',         value: userCount ?? 0,         href: '/admin/users' },
    { label: 'Total Courses',        value: courseCount ?? 0,        href: '/admin/courses' },
    { label: 'Published Scenarios',  value: scenarioCount ?? 0,      href: '/admin/repository' },
    { label: 'Live Sessions',        value: activeSessionCount ?? 0, href: '/admin/sessions' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">System overview — SimEHR</p>
        </div>
        <Link href="/admin/users" className="btn btn-primary btn-sm">
          <Plus className="w-4 h-4" /> Invite User
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className="ehr-card p-5 hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="ehr-card">
        <div className="ehr-card-header">
          <h2 className="font-semibold text-gray-800">Recently Added Users</h2>
          <Link href="/admin/users" className="text-xs text-emerald-600 hover:underline">View all</Link>
        </div>
        <table className="ehr-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers?.map(u => (
              <tr key={u.id}>
                <td className="font-medium">{u.last_name}, {u.first_name}</td>
                <td className="text-gray-500">{u.email}</td>
                <td>
                  <span className={`badge ${
                    u.role === 'admin' ? 'badge-purple' :
                    u.role === 'sim_coordinator' ? 'badge-indigo' :
                    u.role === 'faculty' ? 'badge-green' : 'badge-blue'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
