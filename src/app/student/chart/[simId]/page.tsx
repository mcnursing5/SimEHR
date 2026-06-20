import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ChartView from '@/components/ehr/ChartView'

export async function generateMetadata({ params }: { params: Promise<{ simId: string }> }) {
  const { simId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('course_simulations')
    .select('encounter_number, scenario:simulation_scenarios(title)')
    .eq('id', simId)
    .single()

  const title = data?.scenario ? `${(data.scenario as any).title} — ${data.encounter_number}` : 'Simulation Chart'
  return { title }
}

export default async function StudentChartPage({ params }: { params: Promise<{ simId: string }> }) {
  const { simId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <AppShell profile={profile}>
      <ChartView courseSimId={simId} studentId={user.id} />
    </AppShell>
  )
}
