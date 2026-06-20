import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ScenarioBuilder from '@/components/faculty/ScenarioBuilder'

export default async function ScenarioEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: scenario } = await supabase
    .from('simulation_scenarios')
    .select(`*, patient:patients(*), medications(*), lab_results(*, lab_components(*)), orders(*)`)
    .eq('id', id)
    .single()

  if (!scenario) notFound()
  if (scenario.created_by !== user.id && profile?.role !== 'admin') redirect('/faculty/repository')

  return (
    <AppShell profile={profile}>
      <ScenarioBuilder facultyId={user.id} existingScenario={scenario} />
    </AppShell>
  )
}
