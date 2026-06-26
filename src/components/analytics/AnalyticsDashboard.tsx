'use client'

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Download } from 'lucide-react'

interface Props {
  sessions: any[]
  vitals: any[]
  marEntries: any[]
  notes: any[]
  enrollments: any[]
  courses: any[]
  role: string
}

const EMERALD = '#059669'
const EMERALD_LIGHT = '#34d399'
const AMBER = '#f59e0b'
const RED = '#ef4444'
const BLUE = '#3b82f6'
const GRAY = '#9ca3af'

const PIE_COLORS = [EMERALD, EMERALD_LIGHT, AMBER, BLUE, GRAY]

function StatCard({ label, value, sub, color = 'text-emerald-600' }: any) {
  return (
    <div className="ehr-card p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AnalyticsDashboard({ sessions, vitals, marEntries, notes, enrollments, courses, role }: Props) {
  const [courseFilter, setCourseFilter] = useState('all')

  // ── Helpers ───────────────────────────────────────────────
  function durationMins(s: any) {
    if (!s.started_at || !s.completed_at) return null
    return Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)
  }

  // ── Filter sessions by course ─────────────────────────────
  const filteredSessions = useMemo(() => {
    if (courseFilter === 'all') return sessions
    return sessions.filter((s: any) => s.course_simulation?.course_id === courseFilter)
  }, [sessions, courseFilter])

  // ── Top-level stats ───────────────────────────────────────
  const totalSessions    = filteredSessions.length
  const completed        = filteredSessions.filter((s: any) => ['submitted', 'completed'].includes(s.status))
  const inProgress       = filteredSessions.filter((s: any) => s.status === 'in_progress')
  const notStarted       = filteredSessions.filter((s: any) => s.status === 'not_started')
  const completionRate   = totalSessions > 0 ? Math.round((completed.length / totalSessions) * 100) : 0

  // Cap at 480 min (8 hrs) to exclude sessions left open accidentally
  const durations        = completed.map(durationMins).filter((d: any) => d !== null && d > 0 && d <= 90) as number[]
  const avgDuration      = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  const sessionIds       = new Set(filteredSessions.map((s: any) => s.id))
  const sessionVitals    = vitals.filter((v: any) => sessionIds.has(v.session_id))
  const sessionMAR       = marEntries.filter((m: any) => sessionIds.has(m.session_id))
  const sessionNotes     = notes.filter((n: any) => sessionIds.has(n.session_id))

  const scanCompliance   = sessionMAR.length > 0
    ? Math.round((sessionMAR.filter((m: any) => m.scan_method !== 'manual').length / sessionMAR.length) * 100)
    : 0

  // ── At-risk students (started but not submitted) ──────────
  const atRiskStudents = useMemo(() => {
    const seen = new Set<string>()
    return filteredSessions
      .filter((s: any) => s.status === 'in_progress')
      .filter((s: any) => {
        if (seen.has(s.student_id)) return false
        seen.add(s.student_id)
        return true
      })
  }, [filteredSessions])

  // ── Completion status pie ─────────────────────────────────
  const statusPie = [
    { name: 'Completed', value: completed.length },
    { name: 'In Progress', value: inProgress.length },
    { name: 'Not Started', value: notStarted.length },
  ].filter(d => d.value > 0)

  // ── Completions by week (last 8 weeks) ────────────────────
  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {}
    for (let i = 7; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i * 7)
      const key = `W${d.getMonth() + 1}/${d.getDate()}`
      weeks[key] = 0
    }
    completed.forEach((s: any) => {
      if (!s.completed_at) return
      const d = new Date(s.completed_at)
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay())
      const key = `W${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      if (key in weeks) weeks[key]++
    })
    return Object.entries(weeks).map(([week, count]) => ({ week, count }))
  }, [completed])

  // ── Per-course breakdown ──────────────────────────────────
  const courseBreakdown = useMemo(() => {
    return courses.map((c: any) => {
      const cs = sessions.filter((s: any) => s.course_simulation?.course_id === c.id)
      const done = cs.filter((s: any) => ['submitted', 'completed'].includes(s.status))
      const enrolled = enrollments.filter((e: any) => e.course_id === c.id).length
      return {
        course: c.course_code,
        title: c.title,
        total: cs.length,
        completed: done.length,
        rate: cs.length > 0 ? Math.round((done.length / cs.length) * 100) : 0,
        enrolled,
      }
    }).sort((a, b) => b.total - a.total)
  }, [courses, sessions, enrollments])

  // ── Scenario difficulty breakdown ─────────────────────────
  const difficultyData = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {}
    filteredSessions.forEach((s: any) => {
      const d = s.course_simulation?.scenario?.difficulty ?? 'unknown'
      if (!map[d]) map[d] = { total: 0, completed: 0 }
      map[d].total++
      if (['submitted', 'completed'].includes(s.status)) map[d].completed++
    })
    // deduplicate by key (prevents React 'same key' warning)
    const seen = new Set<string>()
    return Object.entries(map).filter(([k]) => { if (seen.has(k)) return false; seen.add(k); return true }).map(([difficulty, v]) => ({
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      total: v.total,
      completed: v.completed,
      rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    }))
  }, [filteredSessions])

  // ── MAR scan method breakdown ─────────────────────────────
  const marMethodData = useMemo(() => {
    const scan = sessionMAR.filter((m: any) => m.scan_method === 'camera' || m.scan_method === 'usb').length
    const manual = sessionMAR.filter((m: any) => m.scan_method === 'manual').length
    return [
      { name: 'Scanner', value: scan },
      { name: 'Manual', value: manual },
    ].filter(d => d.value > 0)
  }, [sessionMAR])

  // ── Documentation quality per completed session ───────────
  const docQuality = useMemo(() => {
    const zeroVitals = completed.filter((s: any) => !vitals.some((v: any) => v.session_id === s.id)).length
    const zeroNotes  = completed.filter((s: any) => !notes.some((n: any) => n.session_id === s.id)).length
    return { zeroVitals, zeroNotes, total: completed.length }
  }, [completed, vitals, notes])

  function exportCSV() {
    const rows = [
      ['Student ID', 'Course', 'Scenario', 'Status', 'Started', 'Completed', 'Duration (min)'],
      ...filteredSessions.map((s: any) => [
        s.student_id,
        s.course_simulation?.course?.course_code ?? '',
        s.course_simulation?.scenario?.title ?? '',
        s.status,
        s.started_at ? new Date(s.started_at).toLocaleDateString() : '',
        s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '',
        durationMins(s) ?? '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'simehr_analytics.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">Simulation activity and student performance</p>
        </div>
        <div className="flex gap-2">
          <select className="form-select w-48" value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
            <option value="all">All Courses</option>
            {courses.map((c: any) => <option key={c.id} value={c.id}>{c.course_code} — {c.title}</option>)}
          </select>
          <button onClick={exportCSV} className="btn btn-secondary btn-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sessions" value={totalSessions} sub={`${enrollments.length} enrolled`} />
        <StatCard label="Complete" value={`${completionRate}%`} color="text-emerald-600" sub={`${completed.length} submitted`} />
        <StatCard label="In Progress" value={inProgress.length} color="text-amber-500" sub="started, not submitted" />
        <StatCard label="Avg Time"
          value={avgDuration ? (avgDuration >= 60 ? `${Math.floor(avgDuration/60)}h ${avgDuration%60}m` : `${avgDuration}m`) : '—'}
          color="text-blue-500" sub="completed sessions (outliers excluded)" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Scan %" value={`${scanCompliance}%`} color="text-emerald-600" sub="MAR scans vs manual" />
        <StatCard label="Vitals" value={sessionVitals.length} color="text-blue-500" sub={`across ${totalSessions} sessions`} />
        <StatCard label="Notes" value={sessionNotes.length} color="text-indigo-500" sub="progress notes" />
        <StatCard label="At Risk" value={atRiskStudents.length} color={atRiskStudents.length > 0 ? 'text-amber-500' : 'text-emerald-600'} sub="in progress, not submitted" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Completion status pie */}
        <div className="ehr-card p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-4">Session Status</h3>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                  {statusPie.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data yet</div>}
        </div>

        {/* Weekly completions line */}
        <div className="ehr-card p-4 md:col-span-2">
          <h3 className="font-semibold text-sm text-gray-700 mb-4">Completions — Last 8 Weeks</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke={EMERALD} strokeWidth={2} dot={{ fill: EMERALD, r: 4 }} name="Completions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* MAR scan method */}
        <div className="ehr-card p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-1">MAR — Scan vs Manual</h3>
          <p className="text-xs text-gray-400 mb-4">How students administered medications</p>
          {marMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={marMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {marMethodData.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? EMERALD : AMBER} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No MAR data yet</div>}
        </div>

        {/* Difficulty completion bar */}
        <div className="ehr-card p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-1">Completion by Difficulty</h3>
          <p className="text-xs text-gray-400 mb-4">Total vs completed per difficulty level</p>
          {difficultyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="difficulty" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" fill={GRAY} name="Total" radius={[3,3,0,0]} />
                <Bar dataKey="completed" fill={EMERALD} name="Completed" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data yet</div>}
        </div>
      </div>

      {/* Documentation quality */}
      {completed.length > 0 && (
        <div className="ehr-card p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Documentation Quality — Completed Sessions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{docQuality.total - docQuality.zeroVitals}</div>
              <div className="text-xs text-gray-500">Sessions with vitals</div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${docQuality.total > 0 ? ((docQuality.total - docQuality.zeroVitals) / docQuality.total) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{docQuality.zeroVitals}</div>
              <div className="text-xs text-gray-500">Missing vitals</div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${docQuality.total > 0 ? (docQuality.zeroVitals / docQuality.total) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{docQuality.total - docQuality.zeroNotes}</div>
              <div className="text-xs text-gray-500">Sessions with notes</div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${docQuality.total > 0 ? ((docQuality.total - docQuality.zeroNotes) / docQuality.total) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{docQuality.zeroNotes}</div>
              <div className="text-xs text-gray-500">Missing notes</div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${docQuality.total > 0 ? (docQuality.zeroNotes / docQuality.total) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-course table */}
      <div className="ehr-card">
        <div className="ehr-card-header">
          <h3 className="font-semibold text-sm flex items-center gap-2">Course Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="ehr-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Enrolled</th>
                <th>Sessions</th>
                <th>Completed</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              {courseBreakdown.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-6">No course data available</td></tr>
              )}
              {courseBreakdown.map((c: any) => (
                <tr key={c.course}>
                  <td>
                    <div className="font-medium text-sm">{c.course}</div>
                    <div className="text-xs text-gray-400">{c.title}</div>
                  </td>
                  <td className="text-sm">{c.enrolled}</td>
                  <td className="text-sm">{c.total}</td>
                  <td className="text-sm">{c.completed}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-16">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${c.rate}%` }} />
                      </div>
                      <span className={`text-xs font-medium ${c.rate >= 80 ? 'text-emerald-600' : c.rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{c.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* At-risk students table */}
      {atRiskStudents.length > 0 && (
        <div className="ehr-card border-l-4 border-amber-400">
          <div className="ehr-card-header">
            <h3 className="font-semibold text-sm flex items-center gap-2">At-Risk Students — In Progress, Not Submitted</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="ehr-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Course</th>
                  <th>Scenario</th>
                  <th>Started</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {atRiskStudents.map((s: any) => {
                  const daysSince = s.last_active_at
                    ? Math.floor((Date.now() - new Date(s.last_active_at).getTime()) / 86400000)
                    : null
                  return (
                    <tr key={s.id}>
                      <td className="font-mono text-xs text-gray-500">{s.student_id.substring(0, 8)}…</td>
                      <td className="text-sm">{s.course_simulation?.course?.course_code ?? '—'}</td>
                      <td className="text-sm">{s.course_simulation?.scenario?.title ?? '—'}</td>
                      <td className="text-xs text-gray-500">{s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`badge text-xs ${daysSince !== null && daysSince > 3 ? 'badge-amber' : 'badge-gray'}`}>
                          {daysSince !== null ? `${daysSince}d ago` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
