'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDateTime, getCategoryColor, getDifficultyColor } from '@/lib/utils'
import { ClipboardList, Search, Filter, Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  not_started: { label: 'Not Started', badge: 'badge-gray', icon: AlertCircle },
  in_progress:  { label: 'In Progress', badge: 'badge-amber', icon: Clock },
  completed:    { label: 'Completed',   badge: 'badge-green', icon: CheckCircle },
  submitted:    { label: 'Submitted',   badge: 'badge-blue',  icon: CheckCircle },
}

export default function StudentReviewList({ sessions, courses }: { sessions: any[], courses: any[] }) {
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = sessions.filter(s => {
    const name = `${s.student?.first_name} ${s.student?.last_name} ${s.student?.email}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) ||
      s.course_simulation?.scenario?.title?.toLowerCase().includes(search.toLowerCase())
    const matchCourse = !filterCourse || s.course_simulation?.course?.course_code === filterCourse
    const matchStatus = !filterStatus || s.status === filterStatus
    return matchSearch && matchCourse && matchStatus
  })

  const liveSessions = sessions.filter(s => s.status === 'in_progress')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          Student Chart Review
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {sessions.length} total sessions · 
          <span className="text-amber-600 font-medium ml-1">{liveSessions.length} live</span>
        </p>
      </div>

      {/* Live sessions alert */}
      {liveSessions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Activity className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <span className="font-semibold text-amber-800">{liveSessions.length} student{liveSessions.length !== 1 ? 's' : ''} currently in a simulation</span>
            <div className="text-sm text-amber-600 mt-0.5">
              {liveSessions.slice(0, 3).map((s: any) => `${s.student?.first_name} ${s.student?.last_name}`).join(', ')}
              {liveSessions.length > 3 && ` +${liveSessions.length - 3} more`}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="ehr-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="form-input pl-9" placeholder="Search student or scenario..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All courses</option>
            {courses.map(c => <option key={c.id} value={c.course_code}>{c.course_code} — {c.title}</option>)}
          </select>
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Sessions table */}
      <div className="ehr-card overflow-x-auto">
        <table className="ehr-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Simulation</th>
              <th>Status</th>
              <th>Started</th>
              <th>Last Active</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">No sessions found</td></tr>
            )}
            {filtered.map(session => {
              const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.not_started
              const Icon = config.icon
              return (
                <tr key={session.id}>
                  <td>
                    <div className="font-medium text-sm">{session.student?.last_name}, {session.student?.first_name}</div>
                    <div className="text-xs text-gray-400">{session.student?.email}</div>
                  </td>
                  <td>
                    <div className="font-mono text-sm font-medium">{session.course_simulation?.course?.course_code}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[120px]">{session.course_simulation?.course?.title}</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium truncate max-w-[180px]">{session.course_simulation?.scenario?.title}</div>
                    <div className="flex gap-1 mt-1">
                      <span className={`badge text-xs ${getCategoryColor(session.course_simulation?.scenario?.category)}`}>
                        {session.course_simulation?.scenario?.category}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge text-xs ${config.badge} flex items-center gap-1 w-fit`}>
                      <Icon className="w-3 h-3" />{config.label}
                    </span>
                  </td>
                  <td className="text-xs text-gray-500">{session.started_at ? formatDateTime(session.started_at) : '—'}</td>
                  <td className="text-xs text-gray-500">{session.last_active_at ? formatDateTime(session.last_active_at) : '—'}</td>
                  <td>
                    <Link href={`/faculty/review/${session.id}`} className="btn btn-primary btn-sm">
                      View Chart
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
