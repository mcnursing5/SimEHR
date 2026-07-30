import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MedicationLabels from '@/components/faculty/MedicationLabels'

export const metadata = { title: 'Print Medication Labels — SimEHR' }

export default async function LabelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!profile || profile.role === 'student') redirect('/dashboard')

  const { data: scenario } = await supabase
    .from('simulation_scenarios')
    .select('id, title, medications(*)')
    .eq('id', id)
    .single()

  if (!scenario) redirect('/faculty/repository')

  return (
    <MedicationLabels
      scenarioTitle={scenario.title}
      medications={scenario.medications ?? []}
    />
  )
}
