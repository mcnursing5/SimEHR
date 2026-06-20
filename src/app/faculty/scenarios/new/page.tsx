import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import ScenarioBuilder from '@/components/faculty/ScenarioBuilder'

export default async function NewScenarioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <AppShell profile={profile}>
      <ScenarioBuilder facultyId={user.id} />
    </AppShell>
  )
}
