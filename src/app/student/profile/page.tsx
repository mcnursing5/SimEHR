import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import StudentProfile from '@/components/student/StudentProfile'

export default async function StudentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, student_details(*)')
    .eq('id', user.id)
    .single()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, course:courses(course_code, title, semester:semesters(name, academic_year:academic_years(year_label)))')
    .eq('student_id', user.id)
    .order('enrolled_at', { ascending: false })

  const { data: sessions } = await supabase
    .from('student_sessions')
    .select('*, course_simulation:course_simulations(scenario:simulation_scenarios(title, category))')
    .eq('student_id', user.id)
    .order('started_at', { ascending: false })

  return (
    <AppShell profile={profile}>
      <StudentProfile
        profile={profile}
        enrollments={enrollments ?? []}
        sessions={sessions ?? []}
      />
    </AppShell>
  )
}
