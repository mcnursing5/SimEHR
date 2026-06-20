import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import CourseDetail from '@/components/faculty/CourseDetail'

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: course } = await supabase
    .from('courses')
    .select(`*, semester:semesters(*, academic_year:academic_years(*)), faculty:profiles(first_name, last_name, email)`)
    .eq('id', id)
    .single()

  if (!course) notFound()
  if (course.faculty_id !== user.id && profile?.role !== 'admin') redirect('/faculty/courses')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, student:profiles(id, first_name, last_name, email)')
    .eq('course_id', id)
    .order('enrolled_at', { ascending: false })

  const { data: courseSimulations } = await supabase
    .from('course_simulations')
    .select(`*, scenario:simulation_scenarios(id, title, category, difficulty, estimated_duration_minutes, patient:patients(mrn, first_name, last_name))`)
    .eq('course_id', id)
    .order('assigned_at', { ascending: false })

  const { data: publishedScenarios } = await supabase
    .from('simulation_scenarios')
    .select('id, title, category, difficulty, estimated_duration_minutes, tags')
    .eq('is_published', true)
    .eq('is_archived', false)
    .order('title')

  return (
    <AppShell profile={profile}>
      <CourseDetail
        course={course}
        enrollments={enrollments ?? []}
        courseSimulations={courseSimulations ?? []}
        availableScenarios={publishedScenarios ?? []}
        facultyId={user.id}
      />
    </AppShell>
  )
}
