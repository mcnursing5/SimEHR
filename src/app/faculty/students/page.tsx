import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import FacultyStudents from '@/components/faculty/FacultyStudents'

export default async function FacultyStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Get all courses this faculty owns
  const { data: courses } = await supabase
    .from('courses')
    .select('id, course_code, title')
    .eq('faculty_id', user.id)

  const courseIds = courses?.map(c => c.id) ?? []

  // Get all enrollments across those courses
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      *,
      student:profiles(id, first_name, last_name, email, last_login),
      course:courses(course_code, title)
    `)
    .in('course_id', courseIds.length > 0 ? courseIds : ['none'])
    .order('enrolled_at', { ascending: false })

  return (
    <AppShell profile={profile}>
      <FacultyStudents
        enrollments={enrollments ?? []}
        courses={courses ?? []}
      />
    </AppShell>
  )
}
