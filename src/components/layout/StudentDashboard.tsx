import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Activity, BookOpen, CheckCircle, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import { getCategoryColor, getDifficultyColor } from '@/lib/utils'

interface ScenarioInfo {
  id: string
  title: string
  category: string
  difficulty: string
  estimated_duration_minutes: number
  description: string | null
}

interface CourseInfo {
  course_code: string
  title: string
}

interface CourseSimulation {
  id: string
  encounter_number: string
  is_active: boolean
  instructions: string | null
  course: CourseInfo | null
  scenario: ScenarioInfo | null
}

interface StudentSession {
  id: string
  status: string
  started_at: string | null
  last_active_at: string | null
  course_simulation_id: string
}

export default async function StudentDashboard({ profile }: { profile: any }) {
  const supabase = await createClient()

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, course:courses(id, course_code, title)')
    .eq('student_id', profile.id)
    .eq('status', 'active')

  const courseIds = (enrollments ?? []).map((e: any) => e.course_id).filter(Boolean)

  if (courseIds.length === 0) {
    return (
      <div className="space-y-6">
        <div><h1 className="page-title">Welcome, {profile.first_name}</h1></div>
        <div className="ehr-card p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <div className="text-gray-500 font-medium">Not enrolled in any courses yet</div>
          <div className="text-gray-400 text-sm mt-2">Your faculty will enroll you and activate simulations when ready.</div>
        </div>
      </div>
    )
  }

  const { data: allSimsRaw } = await supabase
    .from('course_simulations')
    .select(`
      id, encounter_number, is_active, instructions,
      course:courses(course_code, title),
      scenario:simulation_scenarios(
        id, title, category, difficulty, estimated_duration_minutes, description
      )
    `)
    .in('course_id', courseIds)
    .eq('is_active', true)

  // Supabase's generated types can infer nested single-row relations as
  // arrays in some query shapes; normalize explicitly here.
  const allSims: CourseSimulation[] = (allSimsRaw ?? []).map((s: any) => ({
    id: s.id,
    encounter_number: s.encounter_number,
    is_active: s.is_active,
    instructions: s.instructions,
    course: Array.isArray(s.course) ? (s.course[0] ?? null) : (s.course ?? null),
    scenario: Array.isArray(s.scenario) ? (s.scenario[0] ?? null) : (s.scenario ?? null),
  }))

  const simIds = allSims.map(s => s.id)

  const { data: mySessionsRaw } = simIds.length > 0
    ? await supabase
        .from('student_sessions')
        .select('id, status, started_at, last_active_at, course_simulation_id')
        .eq('student_id', profile.id)
        .in('course_simulation_id', simIds)
    : { data: [] as StudentSession[] }

  const mySessions: StudentSession[] = mySessionsRaw ?? []

  const sessionMap: Record<string, StudentSession> = {}
  mySessions.forEach(s => { sessionMap[s.course_simulation_id] = s })

  const simsWithStatus = allSims.map(s => ({
    ...s,
    mySession: sessionMap[s.id] ?? null,
  }))

  const notStarted = simsWithStatus.filter(s => !s.mySession || s.mySession.status === 'not_started')
  const inProgress  = simsWithStatus.filter(s => s.mySession?.status === 'in_progress')
  const completed   = simsWithStatus.filter(s => s.mySession && ['completed', 'submitted'].includes(s.mySession.status))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {profile.first_name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {enrollments?.length ?? 0} course{enrollments?.length !== 1 ? 's' : ''} · {simsWithStatus.length} simulation{simsWithStatus.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="ehr-card p-4 text-center"><div className="text-2xl font-bold text-blue-600">{notStarted.length}</div><div className="text-xs text-gray-500 mt-1">Available</div></div>
        <div className="ehr-card p-4 text-center"><div className="text-2xl font-bold text-amber-600">{inProgress.length}</div><div className="text-xs text-gray-500 mt-1">In Progress</div></div>
        <div className="ehr-card p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{completed.length}</div><div className="text-xs text-gray-500 mt-1">Completed</div></div>
      </div>

      {inProgress.length > 0 && (
        <div className="ehr-card border-l-4 border-amber-400">
          <div className="ehr-card-header">
            <h2 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" />Continue In Progress</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {inProgress.map(s => (
              <Link key={s.id} href={`/student/chart/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-amber-50">
                <div>
                  <div className="font-semibold text-sm">{s.scenario?.title}</div>
                  <div className="text-xs text-gray-500">{s.course?.course_code} · {s.course?.title}</div>
                  <div className="text-xs text-blue-500 font-mono mt-0.5">Encounter: {s.encounter_number}</div>
                  <div className="flex gap-2 mt-1">
                    <span className={`badge text-xs ${getCategoryColor(s.scenario?.category ?? '')}`}>{s.scenario?.category}</span>
                    <span className={`badge text-xs ${getDifficultyColor(s.scenario?.difficulty ?? '')}`}>{s.scenario?.difficulty}</span>
                  </div>
                </div>
                <div className="btn btn-primary btn-sm">Resume <ArrowRight className="w-3 h-3" /></div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="ehr-card">
        <div className="ehr-card-header">
          <h2 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" />Available Simulations</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {notStarted.length === 0 && inProgress.length === 0 && (
            <div className="px-4 py-10 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <div className="text-gray-400 text-sm">No simulations available right now.</div>
              <div className="text-gray-400 text-xs mt-1">Your faculty will activate simulations when ready.</div>
            </div>
          )}
          {notStarted.map(s => (
            <Link key={s.id} href={`/student/chart/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-blue-50">
              <div>
                <div className="font-medium text-sm">{s.scenario?.title}</div>
                <div className="text-xs text-gray-500">{s.course?.course_code} · {s.course?.title}</div>
                <div className="text-xs text-blue-500 font-mono mt-0.5">Encounter: {s.encounter_number}</div>
                {s.instructions && <div className="text-xs text-blue-600 italic mt-0.5">"{s.instructions}"</div>}
                <div className="flex gap-2 mt-1.5">
                  <span className={`badge text-xs ${getCategoryColor(s.scenario?.category ?? '')}`}>{s.scenario?.category}</span>
                  <span className={`badge text-xs ${getDifficultyColor(s.scenario?.difficulty ?? '')}`}>{s.scenario?.difficulty}</span>
                  <span className="badge badge-gray text-xs"><Clock className="w-2.5 h-2.5 mr-1" />{s.scenario?.estimated_duration_minutes} min</span>
                </div>
              </div>
              <div className="btn btn-secondary btn-sm">Start <ArrowRight className="w-3 h-3" /></div>
            </Link>
          ))}
        </div>
      </div>

      {completed.length > 0 && (
        <div className="ehr-card">
          <div className="ehr-card-header">
            <h2 className="font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" />Completed</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {completed.map(s => (
              <Link key={s.id} href={`/student/chart/${s.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <div className="font-medium text-sm text-gray-500">{s.scenario?.title}</div>
                  <div className="text-xs text-gray-400">{s.course?.course_code} · Enc: {s.encounter_number}</div>
                </div>
                <span className="badge badge-green text-xs">Completed</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
