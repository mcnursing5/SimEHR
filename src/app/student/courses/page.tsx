import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { BookOpen, Calendar, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function StudentCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      course:courses(
        *,
        semester:semesters(name, start_date, end_date, academic_year:academic_years(year_label)),
        faculty:profiles(first_name, last_name),
        course_simulations(count)
      )
    `)
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            My Courses
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {enrollments?.length ?? 0} active enrollment{enrollments?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {(!enrollments || enrollments.length === 0) && (
          <div className="ehr-card p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <div className="text-gray-400">You are not enrolled in any courses yet.</div>
            <div className="text-gray-400 text-sm mt-1">Your faculty will enroll you and send an invitation.</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrollments?.map(enrollment => {
            const course = enrollment.course
            if (!course) return null
            return (
              <div key={enrollment.id} className="ehr-card hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-emerald-700 text-lg">{course.course_code}</span>
                        <span className={`badge text-xs ${course.is_active ? 'badge-green' : 'badge-gray'}`}>
                          {course.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-800 mt-1">{course.title}</div>
                      {course.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {course.semester?.academic_year?.year_label} · {course.semester?.name} ·{' '}
                      {formatDate(course.semester?.start_date)} – {formatDate(course.semester?.end_date)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      Instructor: {course.faculty?.last_name}, {course.faculty?.first_name}
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      {course.course_simulations?.[0]?.count ?? 0} simulation{course.course_simulations?.[0]?.count !== 1 ? 's' : ''} assigned
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    Enrolled: {formatDate(enrollment.enrolled_at)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
