import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import SimulationRepository from '@/components/faculty/SimulationRepository'

export default async function RepositoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: scenarios } = await supabase
    .from('simulation_scenarios')
    .select('*, creator:profiles(first_name, last_name), patient:patients(mrn, first_name, last_name, admitting_diagnosis)')
    .eq('is_archived', false)
    .order('title')

  return (
    <AppShell profile={profile}>
      <SimulationRepository scenarios={scenarios ?? []} userId={user.id} userRole={profile?.role} />
    </AppShell>
  )
}
