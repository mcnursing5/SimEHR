import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AcademicYearsManager from '@/components/admin/AcademicYearsManager'

export default async function AdminYearsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: years } = await supabase
    .from('academic_years')
    .select('*, semesters(*), created_by_profile:profiles(first_name, last_name)')
    .order('start_date', { ascending: false })

  return (
    <AppShell profile={profile}>
      <AcademicYearsManager years={years ?? []} adminId={user.id} />
    </AppShell>
  )
}
