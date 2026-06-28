'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Session {
  id: string
  started_at: string
  last_active_at: string | null
  status: string
  student: { first_name: string; last_name: string; email: string } | null
  course_simulation: {
    encounter_number: string
    course: { course_code: string; title: string } | null
    scenario: { title: string; category: string; estimated_duration_minutes: number } | null
  } | null
}

function elapsed(startedAt: string) {
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function elapsedMins(startedAt: string) {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)
}

function lastActiveDiff(lastActive: string | null) {
  if (!lastActive) return null
  const mins = Math.floor((Date.now() - new Date(lastActive).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
}

const CATEGORY_COLORS: Record<string, string> = {
  cardiac: 'badge-red', respiratory: 'badge-blue', neurological: 'badge-purple',
  obstetric: 'badge-amber', pediatric: 'badge-indigo', trauma: 'badge-red',
  sepsis: 'badge-amber', diabetes: 'badge-green', renal: 'badge-blue',
  psychiatric: 'badge-purple', postoperative: 'badge-gray', general: 'badge-gray',
}

export default function LiveSessionsView({ sessions: initial }: { sessions: Session[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>(initial)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(0)

  const fetchSessions = useCallback(async () => {
    setRefreshing(true)
    const { data } = await supabase
      .from('student_sessions')
      .select(`
        id, started_at, last_active_at, status,
        student:profiles!student_sessions_student_id_fkey(
          first_name, last_name, email
        ),
        course_simulation:course_simulations(
          encounter_number,
          course:courses(course_code, title),
          scenario:simulation_scenarios(title, category, estimated_duration_minutes)
        )
      `)
      .eq('status', 'in_progress')
      .order('started_at', { ascending: false })

    if (data) {
      setSessions(data.map((s: any) => ({
        ...s,
        student: Array.isArray(s.student) ? s.student[0] ?? null : s.student,
        course_simulation: s.course_simulation ? {
          ...s.course_simulation,
          course: Array.isArray(s.course_simulation.course) ? s.course_simulation.course[0] ?? null : s.course_simulation.course,
          scenario: Array.isArray(s.course_simulation.scenario) ? s.course_simulation.scenario[0] ?? null : s.course_simulation.scenario,
        } : null,
      })))
    }
    setLastRefresh(new Date())
    setRefreshing(false)
  }, [supabase])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchSessions, 30000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  // Tick every 60s to update elapsed time display
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Live Sessions</h1>
          <p className="text-gray-500 text-sm mt-1">
            Students currently in an active simulation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Refreshed {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · auto-refreshes every 30s
          </span>
          <button
            onClick={fetchSessions}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
          >
            {refreshing ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-emerald-500 rounded-full animate-spin inline-block" />
            ) : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Live count badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${sessions.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-lg font-bold text-gray-800">{sessions.length}</span>
          <span className="text-gray-500 text-sm">
            {sessions.length === 1 ? 'student' : 'students'} active right now
          </span>
        </div>
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="ehr-card p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏥</span>
          </div>
          <div className="text-gray-500 font-medium">No active sessions right now</div>
          <div className="text-gray-400 text-sm mt-1">
            This page refreshes automatically every 30 seconds.
          </div>
        </div>
      )}

      {/* Session cards */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map(s => {
            const mins = elapsedMins(s.started_at)
            const estimated = s.course_simulation?.scenario?.estimated_duration_minutes ?? 30
            const overTime = mins > estimated
            const category = s.course_simulation?.scenario?.category ?? 'general'

            return (
              <div key={s.id} className={`ehr-card border-l-4 ${overTime ? 'border-amber-400' : 'border-emerald-400'}`}>
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* Student + scenario info */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.student?.first_name?.[0]}{s.student?.last_name?.[0]}
                      </div>
                      <span className="font-semibold text-gray-800">
                        {s.student?.last_name}, {s.student?.first_name}
                      </span>
                      <span className="text-xs text-gray-400">{s.student?.email}</span>
                    </div>

                    <div className="text-sm text-gray-700 ml-9">
                      {s.course_simulation?.scenario?.title ?? '—'}
                    </div>

                    <div className="flex items-center gap-2 ml-9 flex-wrap">
                      <span className="font-mono text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {s.course_simulation?.course?.course_code}
                      </span>
                      <span className="text-xs text-gray-400">
                        {s.course_simulation?.course?.title}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">
                        Enc: {s.course_simulation?.encounter_number}
                      </span>
                      <span className={`badge text-xs ${CATEGORY_COLORS[category] ?? 'badge-gray'}`}>
                        {category}
                      </span>
                    </div>
                  </div>

                  {/* Time info */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 flex-shrink-0">
                    <div className={`text-xl font-bold ${overTime ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {elapsed(s.started_at)}
                    </div>
                    <div className="text-xs text-gray-400">
                      / {estimated}m estimated
                    </div>
                    {overTime && (
                      <span className="badge badge-amber text-xs">Over time</span>
                    )}
                    {s.last_active_at && (
                      <div className="text-xs text-gray-400">
                        Active {lastActiveDiff(s.last_active_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary footer when sessions exist */}
      {sessions.length > 0 && (
        <div className="ehr-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="text-xl font-bold text-emerald-600">{sessions.length}</div>
              <div className="text-xs text-gray-500">Active now</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600">
                {new Set(sessions.map(s => s.course_simulation?.course?.course_code).filter(Boolean)).size}
              </div>
              <div className="text-xs text-gray-500">Courses running</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-500">
                {sessions.filter(s => elapsedMins(s.started_at) > (s.course_simulation?.scenario?.estimated_duration_minutes ?? 30)).length}
              </div>
              <div className="text-xs text-gray-500">Over estimated time</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-600">
                {sessions.length > 0
                  ? Math.round(sessions.reduce((acc, s) => acc + elapsedMins(s.started_at), 0) / sessions.length)
                  : 0}m
              </div>
              <div className="text-xs text-gray-500">Avg elapsed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
