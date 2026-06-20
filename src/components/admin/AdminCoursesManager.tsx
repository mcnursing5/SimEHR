'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { BookOpen, Plus, Users, Activity, ChevronRight, Trash2, X, Loader2, GraduationCap, Info, Copy } from 'lucide-react'

export default function AdminCoursesManager({ courses: initial, academicYears, catalog, faculty, userId }: {
  courses: any[]; academicYears: any[]; catalog: any[]; faculty: any[]; userId: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [courses, setCourses] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copySource, setCopySource] = useState('')
  const [copyTarget, setCopyTarget] = useState('')
  const [copying, setCopying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedYear, setSelectedYear] = useState('')
  const [form, setForm] = useState({
    catalog_id: '', semester_id: '', section: '001',
    faculty_id: '', description: '', max_students: '', is_active: true,
  })

  const allSemesters = academicYears.flatMap(y =>
    (y.semesters ?? []).map((s: any) => ({ ...s, year_label: y.year_label, display: `${y.year_label} — ${s.name}` }))
  )
  const filteredSemesters = selectedYear ? allSemesters.filter(s => s.academic_year_id === selectedYear) : allSemesters
  const selectedCatalog = catalog.find(c => c.id === form.catalog_id)


  async function handleCopySemester() {
    if (!copySource || !copyTarget) { toast.error('Select both source and target semesters'); return }
    if (copySource === copyTarget) { toast.error('Source and target must be different'); return }
    setCopying(true)

    // Get all courses in source semester with their assignments
    const { data: sourceCourses, error: fetchErr } = await supabase
      .from('courses')
      .select('*, faculty_course_assignments(faculty_id, role)')
      .eq('semester_id', copySource)

    if (fetchErr || !sourceCourses || sourceCourses.length === 0) {
      toast.error(fetchErr?.message ?? 'No courses found in source semester')
      setCopying(false)
      return
    }

    let created = 0
    let assigned = 0

    for (const src of sourceCourses) {
      const { data: newCourse, error: courseErr } = await supabase
        .from('courses')
        .insert({
          catalog_id: src.catalog_id,
          semester_id: copyTarget,
          course_code: src.course_code,
          title: src.title,
          section: src.section,
          description: src.description,
          max_students: src.max_students,
          is_active: false, // new copies start inactive until faculty confirms
        })
        .select('id')
        .single()

      if (courseErr || !newCourse) continue
      created++

      // Copy faculty assignments
      const assignments = (src.faculty_course_assignments ?? []).map((fca: any) => ({
        faculty_id: fca.faculty_id,
        course_id: newCourse.id,
        role: fca.role,
        assigned_by: userId,
      }))

      if (assignments.length > 0) {
        const { error: assignErr } = await supabase.from('faculty_course_assignments').insert(assignments)
        if (!assignErr) assigned += assignments.length
      }
    }

    toast.success(`Created ${created} course${created !== 1 ? 's' : ''} with ${assigned} faculty assignment${assigned !== 1 ? 's' : ''}. New courses are inactive — activate when ready.`)
    setShowCopyModal(false)
    setCopySource('')
    setCopyTarget('')
    setCopying(false)
    router.refresh()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.catalog_id) { toast.error('Select a course from the catalog'); return }
    if (!form.semester_id) { toast.error('Select a semester'); return }
    setSaving(true)

    const catalogEntry = catalog.find(c => c.id === form.catalog_id)

    const { data: newCourse, error: courseErr } = await supabase
      .from('courses')
      .insert({
        catalog_id: form.catalog_id,
        semester_id: form.semester_id,
        course_code: catalogEntry?.code ?? '',
        title: catalogEntry?.title ?? '',
        section: form.section,
        description: form.description.trim() || catalogEntry?.description || null,
        faculty_id: form.faculty_id || null,
        max_students: form.max_students ? parseInt(form.max_students) : null,
        is_active: form.is_active,
      })
      .select('*, semester:semesters(name, academic_year:academic_years(year_label)), catalog:course_catalog(code, title)')
      .single()

    if (courseErr) { toast.error(courseErr.message); setSaving(false); return }

    // Assign faculty if selected
    if (form.faculty_id) {
      await supabase.from('faculty_course_assignments').insert({
        faculty_id: form.faculty_id,
        course_id: newCourse.id,
        role: 'instructor',
        assigned_by: userId,
      })
    }

    toast.success(`${newCourse.course_code} §${form.section} created${form.faculty_id ? ' and assigned' : ''}!`)
    setCourses(c => [{ ...newCourse, enrollments: [{ count: 0 }], course_simulations: [{ count: 0 }], faculty_course_assignments: [] }, ...c])
    setShowForm(false)
    setForm({ catalog_id: '', semester_id: '', section: '001', faculty_id: '', description: '', max_students: '', is_active: true })
    router.refresh()
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('courses').update({ is_active: !current }).eq('id', id)
    if (!error) {
      setCourses(c => c.map(co => co.id === id ? { ...co, is_active: !current } : co))
      toast.success(`Course ${!current ? 'activated' : 'deactivated'}`)
    }
  }

  async function deleteCourse(id: string, code: string) {
    if (!confirm(`Delete ${code}? This removes all simulations and student data.`)) return
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (!error) { setCourses(c => c.filter(co => co.id !== id)); toast.success(`${code} deleted`) }
    else toast.error(error.message)
  }

  const grouped = courses.reduce((acc, c) => {
    const key = `${c.semester?.academic_year?.year_label ?? 'Unknown'} — ${c.semester?.name ?? ''}`
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            All Courses
          </h1>
          <p className="text-gray-500 text-sm mt-1">{courses.length} course offering{courses.length !== 1 ? 's' : ''} across all faculty</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCopyModal(true)} className="btn btn-secondary">
            <Copy className="w-4 h-4" /> Copy from Previous Semester
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> New Course Offering
          </button>
        </div>
      </div>


      {/* Copy from Previous Semester modal */}
      {showCopyModal && (
        <div className="ehr-card border-l-4 border-purple-500">
          <div className="ehr-card-header">
            <span className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4 text-purple-500" />Copy Courses from Previous Semester</span>
            <button onClick={() => setShowCopyModal(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="ehr-card-body space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
              This copies all course offerings AND faculty assignments from the source semester into the target semester.
              New courses are created as <strong>inactive</strong> so you can review before activating.
              Student enrollments and simulations are NOT copied.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Copy From (source semester) *</label>
                <select className="form-select" value={copySource} onChange={e => setCopySource(e.target.value)}>
                  <option value="">Select semester...</option>
                  {allSemesters.map(s => <option key={s.id} value={s.id}>{s.display}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Copy To (target semester) *</label>
                <select className="form-select" value={copyTarget} onChange={e => setCopyTarget(e.target.value)}>
                  <option value="">Select semester...</option>
                  {allSemesters.map(s => <option key={s.id} value={s.id}>{s.display}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopySemester} disabled={copying} className="btn btn-primary">
                {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Copy Courses & Assignments
              </button>
              <button onClick={() => setShowCopyModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="ehr-card border-l-4 border-emerald-500">
          <div className="ehr-card-header">
            <span className="font-semibold">Create New Course Offering</span>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleCreate} className="ehr-card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Course (from catalog) *</label>
                <select className="form-select" value={form.catalog_id}
                  onChange={e => setForm(f => ({ ...f, catalog_id: e.target.value }))} required>
                  <option value="">Select course...</option>
                  {catalog.map(c => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
                </select>
                {selectedCatalog && <p className="text-xs text-gray-500 mt-1">{selectedCatalog.credits} credits · {selectedCatalog.description}</p>}
                {catalog.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No courses in catalog. <Link href="/admin/catalog" className="underline">Add courses to the catalog first</Link>.
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">Section</label>
                <input className="form-input" placeholder="001" value={form.section}
                  onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Academic Year</label>
                <select className="form-select" value={selectedYear}
                  onChange={e => { setSelectedYear(e.target.value); setForm(f => ({ ...f, semester_id: '' })) }}>
                  <option value="">All years</option>
                  {academicYears.map(y => <option key={y.id} value={y.id}>{y.year_label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Semester *</label>
                <select className="form-select" value={form.semester_id}
                  onChange={e => setForm(f => ({ ...f, semester_id: e.target.value }))} required>
                  <option value="">Select semester...</option>
                  {filteredSemesters.map(s => <option key={s.id} value={s.id}>{s.display}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Assign Faculty <span className="text-xs text-gray-400">(optional — can do later)</span></label>
                <select className="form-select" value={form.faculty_id}
                  onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {faculty.map(f => <option key={f.id} value={f.id}>{f.last_name}, {f.first_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Max Students</label>
                <input className="form-input" type="number" placeholder="No limit" value={form.max_students}
                  onChange={e => setForm(f => ({ ...f, max_students: e.target.value }))} />
              </div>
              <div className="flex items-end pb-1 col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="text-sm">Make course active immediately</span>
                </label>
              </div>
            </div>
            <div>
              <label className="form-label">Additional Notes <span className="text-xs text-gray-400">(optional — overrides catalog description)</span></label>
              <textarea className="form-textarea" rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Course
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <div className="ehr-card p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <div className="text-gray-400">No courses yet.</div>
        </div>
      )}

      {Object.entries(grouped).map(([group, groupCourses]: [string, any]) => (
        <div key={group}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{group}</h2>
          <div className="space-y-3">
            {groupCourses.map((c: any) => {
              const facultyNames = c.faculty_course_assignments?.map((a: any) => `${a.faculty?.first_name} ${a.faculty?.last_name}`).filter(Boolean) ?? []
              return (
                <div key={c.id} className="ehr-card hover:shadow-md transition-shadow">
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-emerald-700 font-mono">{c.course_code}</span>
                        {c.section && c.section !== '001' && <span className="badge badge-gray text-xs">§{c.section}</span>}
                        <span className="font-semibold">{c.title}</span>
                        <span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      {c.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{c.description}</p>}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.enrollments?.[0]?.count ?? 0} students</span>
                        <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{c.course_simulations?.[0]?.count ?? 0} sims</span>
                        {facultyNames.length > 0 ? (
                          <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{facultyNames.join(', ')}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-500">
                            <Info className="w-3.5 h-3.5" />Unassigned —
                            <Link href="/admin/faculty" className="underline">assign faculty</Link>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(c.id, c.is_active)} className={`btn btn-sm ${c.is_active ? 'btn-secondary' : 'btn-success'}`}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <Link href={`/faculty/courses/${c.id}`} className="btn btn-primary btn-sm">
                        Manage <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => deleteCourse(c.id, c.course_code)} className="btn btn-secondary btn-sm text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
