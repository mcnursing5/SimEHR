import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import CoursesManager from '@/components/faculty/CoursesManager'

export default async function FacultyCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Get academic years for semester selection
  const { data: years } = await supabase
    .from('academic_years')
    .select('*, semesters(*)')
    .order('start_date', { ascending: false })

  // Get catalog for course code dropdown
  const { data: catalog } = await supabase
    .from('course_catalog')
    .select('id, code, title, credits, description')
    .eq('is_active', true)
    .order('code')

  // Get courses this faculty is assigned to
  const { data: assignments } = await supabase
    .from('faculty_course_assignments')
    .select(`
      role,
      course:courses(
        *,
        semester:semesters(*, academic_year:academic_years(*)),
        catalog:course_catalog(code, title),
        enrollments(count),
        course_simulations(count)
      )
    `)
    .eq('faculty_id', user.id)

  const courses = assignments?.map(a => ({ ...a.course, assignment_role: a.role })) ?? []

  return (
    <AppShell profile={profile}>
      <CoursesManager
        facultyId={user.id}
        courses={courses}
        academicYears={years ?? []}
        catalog={catalog ?? []}
      />
    </AppShell>
  )
}
