import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import FacultyAssignmentManager from '@/components/admin/FacultyAssignmentManager'

export default async function AdminFacultyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!['admin', 'sim_coordinator'].includes(profile?.role)) redirect('/dashboard')

  const [{ data: faculty }, { data: courses }, { data: assignments }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, email, role')
      .in('role', ['faculty', 'sim_coordinator']).order('last_name'),
    supabase.from('courses').select(`
      id, course_code, title, is_active, section,
      semester:semesters(name, academic_year:academic_years(year_label)),
      catalog:course_catalog(code, title)
    `).order('course_code'),
    supabase.from('faculty_course_assignments').select(`
      *, faculty:profiles!faculty_course_assignments_faculty_id_fkey(first_name, last_name, email),
      course:courses(course_code, title, semester:semesters(name))
    `),
  ])

  return (
    <AppShell profile={profile}>
      <FacultyAssignmentManager
        faculty={faculty ?? []}
        courses={courses ?? []}
        assignments={assignments ?? []}
      />
    </AppShell>
  )
}
