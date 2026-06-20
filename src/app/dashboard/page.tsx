import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AdminDashboard from '@/components/layout/AdminDashboard'
import FacultyDashboard from '@/components/layout/FacultyDashboard'
import StudentDashboard from '@/components/layout/StudentDashboard'
import SimCoordinatorDashboard from '@/components/layout/SimCoordinatorDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  return (
    <AppShell profile={profile}>
      {profile.role === 'admin' && <AdminDashboard profile={profile} />}
      {profile.role === 'sim_coordinator' && <SimCoordinatorDashboard profile={profile} />}
      {profile.role === 'faculty' && <FacultyDashboard profile={profile} />}
      {profile.role === 'student' && <StudentDashboard profile={profile} />}
    </AppShell>
  )
}
