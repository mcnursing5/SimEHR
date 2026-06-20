import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DebugPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, course:courses(id, course_code, title, is_active)')
    .eq('student_id', user.id)

  const courseIds = enrollments?.map(e => e.course_id) ?? []

  const { data: allCourseSims } = courseIds.length > 0
    ? await supabase
        .from('course_simulations')
        .select('id, is_active, course_id, scenario:simulation_scenarios(title)')
        .in('course_id', courseIds)
    : { data: [] }

  return (
    <div className="p-8 font-mono text-sm space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Debug — {user.email}</h1>
      <p><strong>User ID:</strong> {user.id}</p>

      <div>
        <p className="font-bold text-emerald-600">Enrollments: {enrollments?.length ?? 0}</p>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mt-1">
          {JSON.stringify(enrollments?.map(e => ({
            id: e.id,
            status: e.status,
            course_id: e.course_id,
            course_code: e.course?.course_code,
            course_is_active: e.course?.is_active,
          })), null, 2)}
        </pre>
      </div>

      <div>
        <p className="font-bold text-emerald-600">Course IDs: {JSON.stringify(courseIds)}</p>
      </div>

      <div>
        <p className="font-bold text-emerald-600">Course Simulations: {allCourseSims?.length ?? 0}</p>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mt-1">
          {JSON.stringify(allCourseSims?.map(s => ({
            id: s.id,
            is_active: s.is_active,
            course_id: s.course_id,
            scenario_title: (s.scenario as any)?.title,
          })), null, 2)}
        </pre>
      </div>
    </div>
  )
}
