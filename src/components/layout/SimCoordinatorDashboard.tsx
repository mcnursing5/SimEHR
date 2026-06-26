import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

export default async function SimCoordinatorDashboard({ profile }: { profile: any }) {
  const supabase = await createClient()

  const [
    { count: courseCount },
    { count: facultyCount },
    { count: studentCount },
    { count: scenarioCount },
    { count: liveCount },
    { data: recentSessions },
    { data: unassignedFaculty },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'faculty'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('simulation_scenarios').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('student_sessions').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('student_sessions')
      .select('*, student:profiles(first_name, last_name), course_simulation:course_simulations(scenario:simulation_scenarios(title), course:courses(course_code))')
      .eq('status', 'in_progress')
      .order('last_active_at', { ascending: false })
      .limit(8),
    supabase.from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'faculty')
      .not('id', 'in', `(SELECT faculty_id FROM faculty_course_assignments)`)
      .limit(10),
  ])

  const stats = [
    { label: 'Active Courses', value: courseCount ?? 0, href: '/admin/courses' },
    { label: 'Faculty Members', value: facultyCount ?? 0, href: '/admin/faculty' },
    { label: 'Students', value: studentCount ?? 0, href: '/admin/users' },
    { label: 'Live Sessions', value: liveCount ?? 0, href: '/sim-coordinator/review' },
  ]

  const quickActions = [
    {
      label: 'Manage Course Catalog',
      desc: 'Add/edit NURS course definitions',
      href: '/admin/catalog',
    },
    {
      label: 'Assign Faculty to Courses',
      desc: 'Control which faculty teach which courses',
      href: '/admin/faculty',
    },
    {
      label: 'Browse Sim Repository',
      desc: `${scenarioCount} published scenarios available`,
      href: '/admin/repository',
    },
    {
      label: 'Review All Student Charts',
      desc: 'Monitor student documentation quality',
      href: '/sim-coordinator/review',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Welcome, {profile.first_name}</h1>
          <p className="text-gray-500 text-sm mt-1">Simulation Coordinator Dashboard</p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/catalog" className="btn btn-secondary btn-sm">
            Course Catalog
          </Link>
          <Link href="/faculty/scenarios/new" className="btn btn-primary btn-sm">
            New Scenario
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="ehr-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Unassigned faculty warning */}
      {unassignedFaculty && unassignedFaculty.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-700 mb-1">
                {unassignedFaculty.length} faculty member{unassignedFaculty.length !== 1 ? 's' : ''} not assigned to any course
              </div>
              <div className="text-xs text-amber-600">
                {unassignedFaculty.map((f: any) => `${f.last_name}, ${f.first_name}`).join(' · ')}
              </div>
            </div>
            <Link href="/admin/faculty" className="btn btn-secondary btn-sm flex-shrink-0">
              Assign Now
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live sessions */}
        <div className="ehr-card">
          <div className="ehr-card-header">
            <h2 className="font-semibold">
              Live Sessions
              {liveCount ? <span className="badge badge-amber ml-1">{liveCount}</span> : null}
            </h2>

            <Link href="/sim-coordinator/review" className="text-xs text-emerald-600 hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {(!recentSessions || recentSessions.length === 0) && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No active sessions right now.
              </div>
            )}

            {recentSessions?.map(s => (
              <Link key={s.id} href={`/faculty/review/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <div className="font-medium text-sm">
                    {s.student?.last_name}, {s.student?.first_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.course_simulation?.course?.course_code} · {s.course_simulation?.scenario?.title}
                  </div>
                </div>

                <div className="text-xs text-gray-400">
                  {formatDateTime(s.last_active_at)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="ehr-card">
          <div className="ehr-card-header">
            <h2 className="font-semibold">Quick Actions</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {quickActions.map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-400">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}