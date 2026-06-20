import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ScenarioDetail from '@/components/faculty/ScenarioDetail'

export default async function ScenarioViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: scenario } = await supabase
    .from('simulation_scenarios')
    .select(`*, creator:profiles(first_name, last_name), patient:patients(*), medications(*), lab_results(*, lab_components(*)), orders(*)`)
    .eq('id', id)
    .single()

  if (!scenario) notFound()

  const { data: assignments } = await supabase
    .from('course_simulations')
    .select('*, course:courses(id, course_code, title, semester:semesters(name, academic_year:academic_years(year_label)))')
    .eq('scenario_id', id)

  return (
    <AppShell profile={profile}>
      <ScenarioDetail scenario={scenario} assignments={assignments ?? []} userId={user.id} userRole={profile?.role} />
    </AppShell>
  )
}
