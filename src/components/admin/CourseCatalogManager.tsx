'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { BookOpen, Plus, Edit2, Trash2, X, Loader2, CheckCircle, Search } from 'lucide-react'

export default function CourseCatalogManager({ catalog: initial, userId }: { catalog: any[]; userId: string }) {
  const supabase = createClient()
  const [catalog, setCatalog] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    code: '', title: '', department: 'Nursing', credits: '3.0',
    description: '', prerequisites: '', learning_outcomes: '', is_active: true,
  })

  function openNew() {
    setEditing(null)
    setForm({ code: '', title: '', department: 'Nursing', credits: '3.0', description: '', prerequisites: '', learning_outcomes: '', is_active: true })
    setShowForm(true)
  }

  function openEdit(course: any) {
    setEditing(course)
    setForm({
      code: course.code,
      title: course.title,
      department: course.department ?? 'Nursing',
      credits: course.credits?.toString() ?? '3.0',
      description: course.description ?? '',
      prerequisites: course.prerequisites?.join(', ') ?? '',
      learning_outcomes: course.learning_outcomes?.join('\n') ?? '',
      is_active: course.is_active,
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      department: form.department.trim(),
      credits: parseFloat(form.credits),
      description: form.description.trim() || null,
      prerequisites: form.prerequisites ? form.prerequisites.split(',').map(s => s.trim()).filter(Boolean) : [],
      learning_outcomes: form.learning_outcomes ? form.learning_outcomes.split('\n').map(s => s.trim()).filter(Boolean) : [],
      is_active: form.is_active,
      created_by: userId,
    }

    if (editing) {
      const { data, error } = await supabase.from('course_catalog').update(payload).eq('id', editing.id).select().single()
      if (error) { toast.error(error.message) }
      else { setCatalog(c => c.map(cc => cc.id === editing.id ? data : cc)); toast.success('Course updated') }
    } else {
      const { data, error } = await supabase.from('course_catalog').insert(payload).select().single()
      if (error) { toast.error(error.message) }
      else { setCatalog(c => [...c, data].sort((a, b) => a.code.localeCompare(b.code))); toast.success(`${data.code} added to catalog`) }
    }
    setSaving(false)
    setShowForm(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('course_catalog').update({ is_active: !current }).eq('id', id)
    if (!error) { setCatalog(c => c.map(cc => cc.id === id ? { ...cc, is_active: !current } : cc)); toast.success(`Course ${!current ? 'activated' : 'deactivated'}`) }
  }

  async function deleteCourse(id: string, code: string) {
    if (!confirm(`Remove ${code} from catalog? This will not delete existing course instances.`)) return
    const { error } = await supabase.from('course_catalog').delete().eq('id', id)
    if (!error) { setCatalog(c => c.filter(cc => cc.id !== id)); toast.success(`${code} removed`) }
    else toast.error(error.message)
  }

  const filtered = catalog.filter(c =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
           Course Catalog
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {catalog.filter(c => c.is_active).length} active · {catalog.length} total course definitions
          </p>
        </div>
        <button onClick={openNew} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {/* Info box */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-700">
        <strong>Course Catalog</strong> defines the master list of courses offered by the department.
        Each semester, faculty are assigned to specific <em>instances</em> of these courses.
        Courses added here appear when creating new course offerings each semester.
      </div>

      {/* Form */}
      {showForm && (
        <div className="ehr-card border-l-4 border-emerald-500">
          <div className="ehr-card-header">
            <span className="font-semibold">{editing ? `Edit ${editing.code}` : 'Add New Course'}</span>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSave} className="ehr-card-body space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Course Code *</label>
                <input className="form-input font-mono" placeholder="NURS 240" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Department</label>
                <input className="form-input" value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Credits</label>
                <input className="form-input" type="number" step="0.5" min="0" max="12" value={form.credits}
                  onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
            <div>
              <label className="form-label">Course Title *</label>
              <input className="form-input" placeholder="Fundamentals of Nursing Practice" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Prerequisites <span className="text-xs text-gray-400">(comma separated course codes)</span></label>
                <input className="form-input font-mono" placeholder="NURS 101, NURS 113" value={form.prerequisites}
                  onChange={e => setForm(f => ({ ...f, prerequisites: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Learning Outcomes <span className="text-xs text-gray-400">(one per line)</span></label>
                <textarea className="form-textarea" rows={3} value={form.learning_outcomes}
                  onChange={e => setForm(f => ({ ...f, learning_outcomes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editing ? 'Update Course' : 'Add to Catalog'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="form-input pl-9" placeholder="Search by code or title..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="ehr-card overflow-x-auto">
        <table className="ehr-table">
          <thead>
            <tr><th>Code</th><th>Title</th><th>Dept</th><th>Credits</th><th>Prerequisites</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-8">No courses found</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id}>
                <td className="font-mono font-bold text-emerald-700">{c.code}</td>
                <td>
                  <div className="font-medium">{c.title}</div>
                  {c.description && <div className="text-xs text-gray-400 truncate max-w-[250px]">{c.description}</div>}
                </td>
                <td className="text-sm text-gray-500">{c.department}</td>
                <td className="text-sm font-mono">{c.credits}</td>
                <td className="text-xs text-gray-500">
                  {c.prerequisites?.length > 0 ? c.prerequisites.join(', ') : '—'}
                </td>
                <td>
                  <span className={`badge text-xs ${c.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)} className="btn btn-secondary btn-sm">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleActive(c.id, c.is_active)}
                      className={`btn btn-sm ${c.is_active ? 'btn-secondary' : 'btn-success'}`}>
                      {c.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteCourse(c.id, c.code)}
                      className="btn btn-secondary btn-sm text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
