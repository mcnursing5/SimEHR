import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import CourseCatalogManager from '@/components/admin/CourseCatalogManager'

export default async function AdminCatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!['admin', 'sim_coordinator'].includes(profile?.role)) redirect('/dashboard')

  const { data: catalog } = await supabase
    .from('course_catalog')
    .select('*')
    .order('code')

  return (
    <AppShell profile={profile}>
      <CourseCatalogManager catalog={catalog ?? []} userId={user.id} />
    </AppShell>
  )
}
