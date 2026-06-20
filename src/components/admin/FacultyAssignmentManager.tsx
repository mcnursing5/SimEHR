'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Users, Plus, Trash2, X, Loader2, BookOpen, Search, GraduationCap } from 'lucide-react'

export default function FacultyAssignmentManager({ faculty, courses, assignments: initial }: {
  faculty: any[]; courses: any[]; assignments: any[]
}) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterFaculty, setFilterFaculty] = useState('')
  const [form, setForm] = useState({ faculty_id: '', course_id: '', role: 'instructor' })

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!form.faculty_id || !form.course_id) { toast.error('Select faculty and course'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('faculty_course_assignments')
      .insert({ ...form, assigned_by: user!.id })
      .select(`*, faculty:profiles!faculty_course_assignments_faculty_id_fkey(first_name, last_name, email), course:courses(course_code, title, semester:semesters(name))`)
      .single()

    if (error) {
      toast.error(error.code === '23505' ? 'This faculty member is already assigned to this course' : error.message)
    } else {
      setAssignments(a => [data, ...a])
      toast.success(`${data.faculty?.last_name} assigned to ${data.course?.course_code}`)
      setForm({ faculty_id: '', course_id: '', role: 'instructor' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function removeAssignment(id: string, facultyName: string, courseCode: string) {
    if (!confirm(`Remove ${facultyName} from ${courseCode}?`)) return
    const { error } = await supabase.from('faculty_course_assignments').delete().eq('id', id)
    if (!error) {
      setAssignments(a => a.filter(as => as.id !== id))
      toast.success('Assignment removed')
    }
  }

  const filtered = assignments.filter(a => {
    const name = `${a.faculty?.first_name} ${a.faculty?.last_name} ${a.course?.course_code}`.toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchFaculty = !filterFaculty || a.faculty_id === filterFaculty
    return matchSearch && matchFaculty
  })

  // Group by faculty
  const byFaculty = filtered.reduce((acc, a) => {
    const key = a.faculty_id
    if (!acc[key]) acc[key] = { faculty: a.faculty, items: [] }
    acc[key].items.push(a)
    return acc
  }, {} as Record<string, any>)

  const unassignedFaculty = faculty.filter(f =>
    !assignments.some(a => a.faculty_id === f.id)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Faculty Course Assignments
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {assignments.length} assignments · {faculty.length} faculty members
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Assign Faculty to Course
        </button>
      </div>

      {unassignedFaculty.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {unassignedFaculty.length} faculty member{unassignedFaculty.length !== 1 ? 's' : ''} not yet assigned to any course:
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedFaculty.map(f => (
              <span key={f.id} className="badge badge-amber text-xs">
                {f.last_name}, {f.first_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Assignment Form */}
      {showForm && (
        <div className="ehr-card border-l-4 border-emerald-500">
          <div className="ehr-card-header">
            <span className="font-semibold">Assign Faculty to Course</span>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleAssign} className="ehr-card-body space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Faculty Member *</label>
                <select className="form-select" value={form.faculty_id}
                  onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))} required>
                  <option value="">Select faculty...</option>
                  {faculty.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.last_name}, {f.first_name} ({f.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Course *</label>
                <select className="form-select" value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))} required>
                  <option value="">Select course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} — {c.semester?.academic_year?.year_label} {c.semester?.name}
                      {c.section && c.section !== '001' ? ` §${c.section}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="instructor">Primary Instructor</option>
                  <option value="co_instructor">Co-Instructor</option>
                  <option value="lab_instructor">Lab Instructor</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Assign
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="ehr-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="form-input pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" value={filterFaculty} onChange={e => setFilterFaculty(e.target.value)}>
            <option value="">All faculty</option>
            {faculty.map(f => <option key={f.id} value={f.id}>{f.last_name}, {f.first_name}</option>)}
          </select>
        </div>
      </div>

      {/* Assignments grouped by faculty */}
      {Object.keys(byFaculty).length === 0 && (
        <div className="ehr-card p-10 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <div className="text-gray-400">No assignments yet. Use the button above to assign faculty to courses.</div>
        </div>
      )}

      {Object.values(byFaculty).map((group: any) => (
        <div key={group.faculty?.id ?? 'unknown'} className="ehr-card">
          <div className="ehr-card-header bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {group.faculty?.first_name?.[0]}{group.faculty?.last_name?.[0]}
              </div>
              <div>
                <div className="font-semibold">{group.faculty?.last_name}, {group.faculty?.first_name}</div>
                <div className="text-xs text-gray-500">{group.faculty?.email}</div>
              </div>
            </div>
            <span className="badge badge-blue text-xs">{group.items.length} course{group.items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {group.items.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-mono font-bold text-emerald-700">{a.course?.course_code}</span>
                    <span className="text-sm text-gray-700 ml-2">{a.course?.title}</span>
                    <div className="text-xs text-gray-400">{a.course?.semester?.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge badge-gray text-xs capitalize">{a.role.replace('_', ' ')}</span>
                  <button
                    onClick={() => removeAssignment(a.id, `${a.faculty?.first_name} ${a.faculty?.last_name}`, a.course?.course_code)}
                    className="btn btn-secondary btn-sm text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
