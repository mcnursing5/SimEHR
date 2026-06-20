import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Users, Activity, Database, Plus, ArrowRight, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default async function FacultyDashboard({ profile }: { profile: any }) {
  const supabase = await createClient()

  // Load summary stats
  const { data: courses } = await supabase
    .from('courses')
    .select('id, course_code, title, is_active, semester:semesters(name, academic_year:academic_years(year_label))')
    .eq('faculty_id', profile.id)
    .order('created_at', { ascending: false })

  const courseIds = courses?.map(c => c.id) ?? []

  const { count: studentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .in('course_id', courseIds)
    .eq('status', 'active')

  const { data: activeSims } = await supabase
    .from('course_simulations')
    .select('*, scenario:simulation_scenarios(title, category), course:courses(course_code)')
    .in('course_id', courseIds)
    .eq('is_active', true)
    .limit(5)

  const { data: recentSessions } = await supabase
    .from('student_sessions')
    .select(`
      *, 
      student:profiles(first_name, last_name),
      course_simulation:course_simulations(
        scenario:simulation_scenarios(title),
        course:courses(course_code)
      )
    `)
    .eq('status', 'in_progress')
    .order('last_active_at', { ascending: false })
    .limit(8)

  const { count: scenarioCount } = await supabase
    .from('simulation_scenarios')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  const stats = [
    { label: 'My Courses', value: courses?.length ?? 0, icon: BookOpen, color: 'bg-emerald-500', href: '/faculty/courses' },
    { label: 'Enrolled Students', value: studentCount ?? 0, icon: Users, color: 'bg-emerald-500', href: '/faculty/students' },
    { label: 'Active Simulations', value: activeSims?.length ?? 0, icon: Activity, color: 'bg-amber-500', href: '/faculty/courses' },
    { label: 'Sim Repository', value: scenarioCount ?? 0, icon: Database, color: 'bg-purple-500', href: '/faculty/repository' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Good morning, {profile.first_name}</h1>
          <p className="text-gray-500 text-sm mt-1">Faculty Dashboard — here's what's happening today</p>
        </div>
        <div className="flex gap-3">
          <Link href="/faculty/repository" className="btn btn-secondary btn-sm">
            <Database className="w-4 h-4" />
            Browse Repository
          </Link>
          <Link href="/faculty/scenarios/new" className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            New Scenario
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}
            className="ehr-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Courses */}
        <div className="ehr-card">
          <div className="ehr-card-header">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" /> My Courses
            </h2>
            <Link href="/faculty/courses" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {courses?.slice(0, 5).map(course => (
              <Link key={course.id} href={`/faculty/courses/${course.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-medium text-sm text-gray-900">{course.course_code}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[200px]">{course.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {(course.semester as any)?.academic_year?.year_label} · {(course.semester as any)?.name}
                  </div>
                </div>
                <span className={`badge ${course.is_active ? 'badge-green' : 'badge-gray'}`}>
                  {course.is_active ? 'Active' : 'Inactive'}
                </span>
              </Link>
            ))}
            {(!courses || courses.length === 0) && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No courses yet.
                <Link href="/faculty/courses/new" className="text-emerald-600 ml-1 hover:underline">Create one →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Live student sessions */}
        <div className="ehr-card">
          <div className="ehr-card-header">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              Live Student Sessions
              {recentSessions && recentSessions.length > 0 && (
                <span className="badge badge-green ml-1">{recentSessions.length} active</span>
              )}
            </h2>
            <Link href="/faculty/review" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Review all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentSessions?.map(session => (
              <Link key={session.id} href={`/faculty/review/${session.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-medium text-sm text-gray-900">
                    {session.student?.last_name}, {session.student?.first_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {session.course_simulation?.course?.course_code} · {session.course_simulation?.scenario?.title}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(session.last_active_at)}
                </div>
              </Link>
            ))}
            {(!recentSessions || recentSessions.length === 0) && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                No students are currently in a simulation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
