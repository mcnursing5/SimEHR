import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'

export const metadata = { title: 'Analytics — Streakk EHR' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'student') redirect('/dashboard')

  // ── Sessions ──────────────────────────────────────────────
  const { data: sessions } = await supabase
    .from('student_sessions')
    .select(`
      id, status, started_at, completed_at, last_active_at, student_id,
      course_simulation:course_simulations(
        id, encounter_number, course_id,
        course:courses(id, course_code, title),
        scenario:simulation_scenarios(id, title, category, difficulty, estimated_duration_minutes)
      )
    `)

  // ── Vitals per session ────────────────────────────────────
  const { data: vitals } = await supabase
    .from('vital_signs')
    .select('id, session_id, recorded_at')

  // ── MAR entries ───────────────────────────────────────────
  const { data: marEntries } = await supabase
    .from('mar_entries')
    .select('id, session_id, scan_method, administered_at, status')

  // ── Progress notes ────────────────────────────────────────
  const { data: notes } = await supabase
    .from('progress_notes')
    .select('id, session_id, created_at')

  // ── Enrollments ───────────────────────────────────────────
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, student_id, course_id, status')
    .eq('status', 'active')

  // ── Courses (scoped to faculty if not admin/coord) ────────
  let coursesQuery = supabase
    .from('courses')
    .select('id, course_code, title, is_active, semester:semesters(name, academic_year:academic_years(year_label))')
    .eq('is_active', true)

  if (profile.role === 'faculty') {
    const { data: assigned } = await supabase
      .from('faculty_course_assignments')
      .select('course_id')
      .eq('faculty_id', user.id)
    const ids = (assigned ?? []).map((a: any) => a.course_id)
    if (ids.length > 0) coursesQuery = coursesQuery.in('id', ids)
  }

  const { data: courses } = await coursesQuery

  return (
    <AppShell profile={profile}>
      <AnalyticsDashboard
        sessions={sessions ?? []}
        vitals={vitals ?? []}
        marEntries={marEntries ?? []}
        notes={notes ?? []}
        enrollments={enrollments ?? []}
        courses={courses ?? []}
        role={profile.role}
      />
    </AppShell>
  )
}
