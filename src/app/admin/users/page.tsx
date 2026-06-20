import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AdminUsersManager from '@/components/admin/AdminUsersManager'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
  const { data: users } = await supabase
    .from('profiles')
    .select('*, faculty_details(*), student_details(*)')
    .order('created_at', { ascending: false })
  return (
    <AppShell profile={profile}>
      <AdminUsersManager users={users ?? []} currentUserId={user.id} />
    </AppShell>
  )
}
