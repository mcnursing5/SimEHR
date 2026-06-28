import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LiveSessionsView from '@/components/admin/LiveSessionsView'

export const metadata = { title: 'Live Sessions — SimEHR' }

export default async function AdminSessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile || !['admin', 'sim_coordinator'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: sessionsRaw } = await supabase
    .from('student_sessions')
    .select(`
      id, started_at, last_active_at, status,
      student:profiles!student_sessions_student_id_fkey(
        first_name, last_name, email
      ),
      course_simulation:course_simulations(
        encounter_number,
        course:courses(course_code, title),
        scenario:simulation_scenarios(title, category, estimated_duration_minutes)
      )
    `)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })

  return (
    <AppShell profile={profile}>
      <LiveSessionsView sessions={(sessionsRaw ?? []) as any[]} />
    </AppShell>
  )
}
