import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import StudentReviewList from '@/components/faculty/StudentReviewList'

export default async function SimCoordReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!['admin','sim_coordinator'].includes(profile?.role)) redirect('/dashboard')

  // Sim coordinator sees ALL sessions across all courses
  const { data: courses } = await supabase.from('courses').select('id, course_code, title')
  const { data: sessions } = await supabase
    .from('student_sessions')
    .select(`*, student:profiles(id, first_name, last_name, email),
      course_simulation:course_simulations(encounter_number, is_active,
        course:courses(course_code, title),
        scenario:simulation_scenarios(title, category, difficulty))`)
    .order('last_active_at', { ascending: false })

  return (
    <AppShell profile={profile}>
      <StudentReviewList sessions={sessions ?? []} courses={courses ?? []} />
    </AppShell>
  )
}
