'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { Calendar, Plus, Trash2, X, Loader2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'

export default function AcademicYearsManager({ years: initialYears, adminId }: { years: any[], adminId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [years, setYears] = useState(initialYears)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showYearForm, setShowYearForm] = useState(false)
  const [showSemForm, setShowSemForm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [yearForm, setYearForm] = useState({ year_label: '', start_date: '', end_date: '', is_active: false })
  const [semForm, setSemForm] = useState({ name: 'Fall', start_date: '', end_date: '', is_active: false })

  async function createYear(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('academic_years')
      .insert({ ...yearForm, created_by: adminId })
      .select('*, semesters(*)')
      .single()
    if (error) { toast.error(error.message) }
    else {
      setYears(y => [data, ...y])
      setShowYearForm(false)
      setYearForm({ year_label: '', start_date: '', end_date: '', is_active: false })
      toast.success('Academic year created')
    }
    setSaving(false)
  }

  async function createSemester(e: React.FormEvent, yearId: string) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('semesters')
      .insert({ academic_year_id: yearId, ...semForm })
      .select()
      .single()
    if (error) { toast.error(error.message) }
    else {
      setYears(y => y.map(yr => yr.id === yearId
        ? { ...yr, semesters: [...(yr.semesters ?? []), data] }
        : yr))
      setShowSemForm(null)
      setSemForm({ name: 'Fall', start_date: '', end_date: '', is_active: false })
      toast.success('Semester added')
    }
    setSaving(false)
  }

  async function toggleYearActive(yearId: string, current: boolean) {
    // Only one year can be active at a time
    if (!current) {
      await supabase.from('academic_years').update({ is_active: false }).neq('id', yearId)
    }
    const { error } = await supabase.from('academic_years').update({ is_active: !current }).eq('id', yearId)
    if (!error) {
      setYears(y => y.map(yr => ({ ...yr, is_active: yr.id === yearId ? !current : (!current ? false : yr.is_active) })))
      toast.success(!current ? 'Year set as active' : 'Year deactivated')
    }
  }

  async function toggleSemActive(semId: string, yearId: string, current: boolean) {
    const { error } = await supabase.from('semesters').update({ is_active: !current }).eq('id', semId)
    if (!error) {
      setYears(y => y.map(yr => yr.id === yearId
        ? { ...yr, semesters: yr.semesters.map((s: any) => s.id === semId ? { ...s, is_active: !current } : s) }
        : yr))
      toast.success(`Semester ${!current ? 'activated' : 'deactivated'}`)
    }
  }

  async function deleteYear(yearId: string) {
    if (!confirm('Delete this academic year and all its semesters? This will also delete all courses, enrollments, and simulations linked to these semesters.')) return
    const { error } = await supabase.from('academic_years').delete().eq('id', yearId)
    if (!error) { setYears(y => y.filter(yr => yr.id !== yearId)); toast.success('Academic year deleted') }
    else toast.error(error.message)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Academic Years & Semesters
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage the Year → Semester → Course hierarchy</p>
        </div>
        <button onClick={() => setShowYearForm(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> New Academic Year
        </button>
      </div>

      {/* New Year Form */}
      {showYearForm && (
        <div className="ehr-card border-l-4 border-emerald-500">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm">Create Academic Year</span>
            <button onClick={() => setShowYearForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={createYear} className="ehr-card-body space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Year Label *</label>
                <input className="form-input" placeholder="2024-2025" value={yearForm.year_label}
                  onChange={e => setYearForm(f => ({...f, year_label: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Start Date *</label>
                <input className="form-input" type="date" value={yearForm.start_date}
                  onChange={e => setYearForm(f => ({...f, start_date: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">End Date *</label>
                <input className="form-input" type="date" value={yearForm.end_date}
                  onChange={e => setYearForm(f => ({...f, end_date: e.target.value}))} required />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="year_active" checked={yearForm.is_active}
                onChange={e => setYearForm(f => ({...f, is_active: e.target.checked}))} className="w-4 h-4" />
              <label htmlFor="year_active" className="text-sm">Set as current active year</label>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Year
              </button>
              <button type="button" onClick={() => setShowYearForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Years list */}
      {years.length === 0 && (
        <div className="ehr-card p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <div className="text-gray-400">No academic years yet.</div>
        </div>
      )}

      {years.map(year => (
        <div key={year.id} className="ehr-card">
          {/* ✅ Changed from <button> to <div> to avoid nested <button> elements */}
          <div
            onClick={() => setExpanded(expanded === year.id ? null : year.id)}
            className="ehr-card-header w-full text-left hover:bg-gray-100 rounded-t-lg cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setExpanded(expanded === year.id ? null : year.id)
              }
            }}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="font-bold text-gray-900">{year.year_label}</div>
                <div className="text-xs text-gray-500">
                  {formatDate(year.start_date)} – {formatDate(year.end_date)} ·
                  {year.semesters?.length ?? 0} semester{year.semesters?.length !== 1 ? 's' : ''}
                </div>
              </div>
              {year.is_active && <span className="badge badge-green text-xs"><CheckCircle className="w-3 h-3 mr-1" />Active</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); toggleYearActive(year.id, year.is_active) }}
                className={`btn btn-sm ${year.is_active ? 'btn-secondary' : 'btn-success'}`}
              >
                {year.is_active ? 'Deactivate' : 'Set Active'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); deleteYear(year.id) }}
                className="btn btn-secondary btn-sm text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {expanded === year.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>

          {expanded === year.id && (
            <div className="ehr-card-body border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-700">Semesters</h3>
                <button onClick={() => setShowSemForm(year.id)} className="btn btn-secondary btn-sm">
                  <Plus className="w-3.5 h-3.5" /> Add Semester
                </button>
              </div>

              {showSemForm === year.id && (
                <form onSubmit={e => createSemester(e, year.id)} className="bg-emerald-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="form-label text-xs">Semester</label>
                      <select className="form-select" value={semForm.name}
                        onChange={e => setSemForm(f => ({...f, name: e.target.value}))}>
                        <option>Fall</option><option>Spring</option><option>Summer</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-xs">Start Date</label>
                      <input className="form-input" type="date" value={semForm.start_date}
                        onChange={e => setSemForm(f => ({...f, start_date: e.target.value}))} required />
                    </div>
                    <div>
                      <label className="form-label text-xs">End Date</label>
                      <input className="form-input" type="date" value={semForm.end_date}
                        onChange={e => setSemForm(f => ({...f, end_date: e.target.value}))} required />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={`sem_active_${year.id}`} checked={semForm.is_active}
                      onChange={e => setSemForm(f => ({...f, is_active: e.target.checked}))} className="w-4 h-4" />
                    <label htmlFor={`sem_active_${year.id}`} className="text-sm">Active semester</label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Add
                    </button>
                    <button type="button" onClick={() => setShowSemForm(null)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </form>
              )}

              {(!year.semesters || year.semesters.length === 0) && (
                <div className="text-sm text-gray-400 text-center py-4">No semesters yet</div>
              )}

              <div className="space-y-2">
                {year.semesters?.map((sem: any) => (
                  <div key={sem.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <span className="font-medium text-sm">{sem.name} {year.year_label}</span>
                      <span className="text-xs text-gray-500 ml-3">
                        {formatDate(sem.start_date)} – {formatDate(sem.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sem.is_active && <span className="badge badge-green text-xs">Active</span>}
                      <button
                        onClick={() => toggleSemActive(sem.id, year.id, sem.is_active)}
                        className={`btn btn-sm ${sem.is_active ? 'btn-secondary' : 'btn-success'}`}
                      >
                        {sem.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
