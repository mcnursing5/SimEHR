import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AdminCoursesManager from '@/components/admin/AdminCoursesManager'

export default async function AdminCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!['admin', 'sim_coordinator'].includes(profile?.role)) redirect('/dashboard')

  const [{ data: courses }, { data: years }, { data: catalog }, { data: faculty }] = await Promise.all([
    supabase.from('courses').select(`
      *,
      semester:semesters(name, academic_year:academic_years(year_label)),
      catalog:course_catalog(code, title),
      enrollments(count),
      course_simulations(count),
      faculty_course_assignments(faculty:profiles!faculty_course_assignments_faculty_id_fkey(first_name, last_name))
    `).order('created_at', { ascending: false }),
    supabase.from('academic_years').select('*, semesters(*)').order('start_date', { ascending: false }),
    supabase.from('course_catalog').select('id, code, title, credits, description').eq('is_active', true).order('code'),
    supabase.from('profiles').select('id, first_name, last_name, email').in('role', ['faculty', 'sim_coordinator']).order('last_name'),
  ])

  return (
    <AppShell profile={profile}>
      <AdminCoursesManager
        courses={courses ?? []}
        academicYears={years ?? []}
        catalog={catalog ?? []}
        faculty={faculty ?? []}
        userId={user.id}
      />
    </AppShell>
  )
}
