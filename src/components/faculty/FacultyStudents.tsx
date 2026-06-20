'use client'

import { useState } from 'react'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Users, Search, BookOpen, Mail } from 'lucide-react'

export default function FacultyStudents({ enrollments, courses }: {
  enrollments: any[], courses: any[]
}) {
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterStatus, setFilterStatus] = useState('active')

  const filtered = enrollments.filter(en => {
    const name = `${en.student?.first_name} ${en.student?.last_name} ${en.student?.email}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchCourse = !filterCourse || en.course?.course_code === filterCourse
    const matchStatus = !filterStatus || en.status === filterStatus
    return matchSearch && matchCourse && matchStatus
  })

  // Unique students
  const uniqueStudents = new Set(enrollments.filter(e => e.status === 'active').map(e => e.student_id)).size

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
         My Students
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {uniqueStudents} unique student{uniqueStudents !== 1 ? 's' : ''} across {courses.length} course{courses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="ehr-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="form-input pl-9" placeholder="Search students..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All courses</option>
            {courses.map(c => <option key={c.id} value={c.course_code}>{c.course_code} — {c.title}</option>)}
          </select>
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="dropped">Dropped</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {filtered.length !== enrollments.length && (
          <div className="text-xs text-gray-400 mt-2">{filtered.length} of {enrollments.length} enrollments</div>
        )}
      </div>

      {/* Table */}
      <div className="ehr-card overflow-x-auto">
        <table className="ehr-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Email</th>
              <th>Course</th>
              <th>Enrolled</th>
              <th>Last Login</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-10">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  {courses.length === 0
                    ? 'Create a course first, then import students.'
                    : 'No students match your filters.'}
                </td>
              </tr>
            )}
            {filtered.map(en => (
              <tr key={en.id}>
                <td className="font-medium">
                  {en.student?.last_name}, {en.student?.first_name}
                </td>
                <td>
                  <a href={`mailto:${en.student?.email}`}
                    className="flex items-center gap-1 text-emerald-600 hover:underline text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    {en.student?.email}
                  </a>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-sm font-medium text-emerald-700">{en.course?.course_code}</span>
                    <span className="text-xs text-gray-500 truncate max-w-[120px]">{en.course?.title}</span>
                  </div>
                </td>
                <td className="text-xs text-gray-500">{formatDate(en.enrolled_at)}</td>
                <td className="text-xs text-gray-500">
                  {en.student?.last_login ? formatDateTime(en.student.last_login) : 'Never logged in'}
                </td>
                <td>
                  <span className={`badge text-xs ${
                    en.status === 'active' ? 'badge-green' :
                    en.status === 'dropped' ? 'badge-red' : 'badge-gray'
                  }`}>
                    {en.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
