'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime, getCategoryColor, getDifficultyColor } from '@/lib/utils'
import {
  Users, Activity, Plus, Upload, Trash2, X, Loader2, BookOpen,
  ChevronLeft, Mail, Calendar, Clock, Database, Eye, ToggleLeft,
  ToggleRight, AlertCircle, CheckCircle, Info
} from 'lucide-react'
import LabelGenerator from '@/components/labels/LabelGenerator'

interface Props {
  course: any
  enrollments: any[]
  courseSimulations: any[]
  availableScenarios: any[]
  facultyId: string
}

export default function CourseDetail({ course, enrollments: initEnrollments, courseSimulations: initSims, availableScenarios, facultyId }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<'students' | 'simulations'>('students')
  const [enrollments, setEnrollments] = useState(initEnrollments)
  const [sims, setSims] = useState(initSims)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [showSimPicker, setShowSimPicker] = useState(false)
  const [showLabelGen, setShowLabelGen] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirst, setInviteFirst] = useState('')
  const [inviteLast, setInviteLast] = useState('')
  const [csvLoading, setCsvLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [simForm, setSimForm] = useState({ scenario_id: '', active_from: '', active_until: '', instructions: '', is_active: false })
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ── Invite student ──────────────────────────────────────
  async function inviteStudent(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          first_name: inviteFirst.trim(),
          last_name: inviteLast.trim(),
          role: 'student',
          course_id: course.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Invitation sent to ${inviteEmail}`)
      setShowInviteForm(false)
      setInviteEmail(''); setInviteFirst(''); setInviteLast('')
      router.refresh()
    } catch (err: any) { toast.error(err.message) }
    setInviteLoading(false)
  }

  // ── CSV import ──────────────────────────────────────────
  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvLoading(true)
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[]
        let success = 0, failed = 0
        for (const row of rows) {
          const email = (row.email ?? row.Email ?? '').trim().toLowerCase()
          const first = (row.first_name ?? row.FirstName ?? row['First Name'] ?? '').trim()
          const last  = (row.last_name  ?? row.LastName  ?? row['Last Name']  ?? '').trim()
          if (!email || !first || !last) { failed++; continue }
          try {
            const res = await fetch('/api/users/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, first_name: first, last_name: last, role: 'student', course_id: course.id }),
            })
            if (res.ok) success++; else failed++
          } catch { failed++ }
        }
        toast.success(`Roster imported: ${success} invited${failed > 0 ? `, ${failed} failed` : ''}`)
        setCsvLoading(false)
        router.refresh()
      },
      error: () => { toast.error('CSV parse error'); setCsvLoading(false) }
    })
    e.target.value = ''
  }

  // ── Assign simulation ───────────────────────────────────
  async function assignSimulation(e: React.FormEvent) {
    e.preventDefault()
    if (!simForm.scenario_id) { toast.error('Select a scenario'); return }
    setAssigningId(simForm.scenario_id)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('course_simulations')
      .insert({
        course_id: course.id,
        scenario_id: simForm.scenario_id,
        assigned_by: user!.id,
        active_from: simForm.active_from || null,
        active_until: simForm.active_until || null,
        instructions: simForm.instructions || null,
        is_active: simForm.is_active,
      })
      .select(`*, scenario:simulation_scenarios(id, title, category, difficulty, estimated_duration_minutes, patient:patients(mrn, first_name, last_name))`)
      .single()

    if (error) {
      toast.error('Assign failed: ' + error.message)
    } else {
      toast.success('Simulation assigned!')
      setSims(s => [data, ...s])
      setShowSimPicker(false)
      setSimForm({ scenario_id: '', active_from: '', active_until: '', instructions: '', is_active: false })
    }
    setAssigningId(null)
  }

  // ── Toggle simulation active/inactive ──────────────────
  async function toggleSimActive(simId: string, current: boolean) {
    setTogglingId(simId)
    const { error } = await supabase
      .from('course_simulations')
      .update({ is_active: !current })
      .eq('id', simId)
    if (!error) {
      setSims(s => s.map(sim => sim.id === simId ? { ...sim, is_active: !current } : sim))
      toast.success(`Simulation ${!current ? '✅ activated — students can now access it' : '⏸ deactivated — students can no longer access it'}`)
    } else {
      toast.error('Toggle failed: ' + error.message)
    }
    setTogglingId(null)
  }

  // ── Update sim date window ──────────────────────────────
  async function updateSimDates(simId: string, active_from: string, active_until: string) {
    const { error } = await supabase
      .from('course_simulations')
      .update({
        active_from: active_from || null,
        active_until: active_until || null,
      })
      .eq('id', simId)
    if (!error) {
      setSims(s => s.map(sim => sim.id === simId ? { ...sim, active_from, active_until } : sim))
      toast.success('Date window updated')
    }
  }

  async function removeSimulation(simId: string) {
    if (!confirm('Remove this simulation? Student charting data will be lost.')) return
    const { error } = await supabase.from('course_simulations').delete().eq('id', simId)
    if (!error) { setSims(s => s.filter(sim => sim.id !== simId)); toast.success('Simulation removed') }
  }

  async function removeStudent(enrollmentId: string, name: string) {
    if (!confirm(`Remove ${name} from this course?`)) return
    const { error } = await supabase.from('enrollments').update({ status: 'dropped' }).eq('id', enrollmentId)
    if (!error) {
      setEnrollments(e => e.map(en => en.id === enrollmentId ? { ...en, status: 'dropped' } : en))
      toast.success(`${name} removed`)
    }
  }

  const activeEnrollments = enrollments.filter(e => e.status === 'active')
  const assignedScenarioIds = sims.map(s => s.scenario_id)
  const unassignedScenarios = availableScenarios.filter(s => !assignedScenarioIds.includes(s.id))
  const activeSims = sims.filter(s => s.is_active)
  const inactiveSims = sims.filter(s => !s.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/faculty/courses" className="text-sm text-emerald-600 hover:underline flex items-center gap-1 mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to My Courses
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title font-mono text-emerald-700">{course.course_code}</h1>
              <span className={`badge ${course.is_active ? 'badge-green' : 'badge-gray'}`}>{course.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <h2 className="text-xl text-gray-700 mt-0.5">{course.title}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {course.semester?.academic_year?.year_label} · {course.semester?.name} ·{' '}
              {formatDate(course.semester?.start_date)} – {formatDate(course.semester?.end_date)}
            </p>
            {course.description && <p className="text-gray-500 text-sm mt-2 max-w-2xl">{course.description}</p>}
          </div>
          <div className="flex gap-3">
            <div className="ehr-card px-4 py-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{activeEnrollments.length}</div>
              <div className="text-xs text-gray-500">Students</div>
            </div>
            <div className="ehr-card px-4 py-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{activeSims.length}</div>
              <div className="text-xs text-gray-500">Active Sims</div>
            </div>
            <div className="ehr-card px-4 py-3 text-center">
              <div className="text-xl font-bold text-gray-400">{inactiveSims.length}</div>
              <div className="text-xs text-gray-500">Inactive</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ehr-tabs">
        <button onClick={() => setTab('students')}
          className={`ehr-tab flex items-center gap-1.5 ${tab === 'students' ? 'ehr-tab-active text-emerald-600 border-emerald-600' : ''}`}>
          <Users className="w-4 h-4" /> Students ({activeEnrollments.length})
        </button>
        <button onClick={() => setTab('simulations')}
          className={`ehr-tab flex items-center gap-1.5 ${tab === 'simulations' ? 'ehr-tab-active text-emerald-600 border-emerald-600' : ''}`}>
          <Activity className="w-4 h-4" /> Simulations ({sims.length})
        </button>
      </div>

      {/* ── STUDENTS TAB ── */}
      {tab === 'students' && (
        <div className="space-y-4">
          {/* How enrollment works info box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-700">
                <strong>How student enrollment works:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-emerald-600">
                  <li>Invite students individually below, or upload a CSV roster (email, first_name, last_name)</li>
                  <li>Each student receives an invitation email to set their own password</li>
                  <li>Their institutional email becomes their permanent login username</li>
                  <li>Students enrolled in multiple courses see all their courses and simulations on their dashboard</li>
                  <li>Students only see simulations you have marked <strong>Active</strong> in the Simulations tab</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setShowInviteForm(!showInviteForm)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Invite Student
            </button>
            <label className={`btn btn-secondary cursor-pointer ${csvLoading ? 'opacity-60 pointer-events-none' : ''}`}>
              {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import CSV Roster
              <input type="file" accept=".csv" className="hidden" onChange={handleCSV} disabled={csvLoading} />
            </label>
            <div className="text-xs text-gray-400 self-center">
              CSV columns: <code className="bg-gray-100 px-1 rounded">email, first_name, last_name</code>
            </div>
          </div>

          {showInviteForm && (
            <div className="ehr-card border-l-4 border-emerald-500">
              <div className="ehr-card-header">
                <span className="font-semibold text-sm">Invite Student to {course.course_code}</span>
                <button onClick={() => setShowInviteForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <form onSubmit={inviteStudent} className="ehr-card-body">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">First Name *</label>
                    <input className="form-input" value={inviteFirst} onChange={e => setInviteFirst(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Last Name *</label>
                    <input className="form-input" value={inviteLast} onChange={e => setInviteLast(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label">Institutional Email *</label>
                    <input className="form-input" type="email" placeholder="student@university.edu"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={inviteLoading} className="btn btn-primary">
                    {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send Invitation Email
                  </button>
                  <button type="button" onClick={() => setShowInviteForm(false)} className="btn btn-secondary">Cancel</button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  The student will receive an email with a link to set their password. Their email becomes their username.
                </p>
              </form>
            </div>
          )}

          <div className="ehr-card overflow-x-auto">
            <table className="ehr-table">
              <thead>
                <tr><th>Student</th><th>Email</th><th>Enrolled</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {enrollments.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <div className="text-gray-400 text-sm">No students enrolled yet</div>
                    <div className="text-gray-400 text-xs mt-1">Use "Invite Student" or "Import CSV Roster" above</div>
                  </td></tr>
                )}
                {enrollments.map(en => (
                  <tr key={en.id}>
                    <td className="font-medium">{en.student?.last_name}, {en.student?.first_name}</td>
                    <td className="text-gray-500">{en.student?.email}</td>
                    <td className="text-gray-500 text-xs">{formatDate(en.enrolled_at)}</td>
                    <td>
                      <span className={`badge text-xs ${en.status === 'active' ? 'badge-green' : en.status === 'dropped' ? 'badge-red' : 'badge-gray'}`}>
                        {en.status}
                      </span>
                    </td>
                    <td>
                      {en.status === 'active' && (
                        <button onClick={() => removeStudent(en.id, `${en.student?.first_name} ${en.student?.last_name}`)}
                          className="btn btn-secondary btn-sm text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SIMULATIONS TAB ── */}
      {tab === 'simulations' && (
        <div className="space-y-4">

          {/* Activation explainer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <strong>Simulation activation controls:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-amber-600">
                  <li>Simulations are <strong>inactive by default</strong> when assigned — students cannot see them yet</li>
                  <li>Click the <strong>Activate</strong> toggle when you are ready for students to access a simulation</li>
                  <li>Click <strong>Deactivate</strong> at any time to hide it from students (e.g. between class sessions)</li>
                  <li>You can also set optional <strong>date windows</strong> — the simulation auto-activates/deactivates on those dates</li>
                  <li>Students enrolled in multiple courses only see simulations from their enrolled courses that are active</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowSimPicker(!showSimPicker)} className="btn btn-primary">
              <Database className="w-4 h-4" /> Assign from Repository
            </button>
            <Link href="/faculty/repository" className="btn btn-secondary">
              <Eye className="w-4 h-4" /> Browse Repository
            </Link>
          </div>

          {showSimPicker && (
            <div className="ehr-card border-l-4 border-emerald-500">
              <div className="ehr-card-header">
                <span className="font-semibold text-sm">Assign Simulation to {course.course_code}</span>
                <button onClick={() => setShowSimPicker(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <form onSubmit={assignSimulation} className="ehr-card-body space-y-4">
                <div>
                  <label className="form-label">Select Scenario *</label>
                  <select className="form-select" value={simForm.scenario_id}
                    onChange={e => setSimForm(f => ({ ...f, scenario_id: e.target.value }))} required>
                    <option value="">Choose from repository...</option>
                    {unassignedScenarios.map(s => (
                      <option key={s.id} value={s.id}>{s.title} [{s.difficulty}] — {s.category}</option>
                    ))}
                  </select>
                  {unassignedScenarios.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">All published scenarios are already assigned to this course.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Auto-activate date (optional)</label>
                    <input type="datetime-local" className="form-input" value={simForm.active_from}
                      onChange={e => setSimForm(f => ({ ...f, active_from: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Simulation becomes accessible to students on this date</p>
                  </div>
                  <div>
                    <label className="form-label">Auto-deactivate date (optional)</label>
                    <input type="datetime-local" className="form-input" value={simForm.active_until}
                      onChange={e => setSimForm(f => ({ ...f, active_until: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Simulation closes to students after this date</p>
                  </div>
                </div>
                <div>
                  <label className="form-label">Student Instructions</label>
                  <textarea className="form-textarea" placeholder="Instructions shown to students before starting..."
                    value={simForm.instructions} onChange={e => setSimForm(f => ({ ...f, instructions: e.target.value }))} />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <input type="checkbox" id="sim_active" checked={simForm.is_active}
                    onChange={e => setSimForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4" />
                  <div>
                    <label htmlFor="sim_active" className="text-sm font-medium text-gray-700">Activate immediately</label>
                    <p className="text-xs text-gray-400">If unchecked, students won't see this until you manually activate it</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={!!assigningId} className="btn btn-primary">
                    {assigningId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Assign to Course
                  </button>
                  <button type="button" onClick={() => setShowSimPicker(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Active simulations */}
          {activeSims.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" /> Active — Students Can Access ({activeSims.length})
              </h3>
              <div className="space-y-3">
                {activeSims.map(sim => (
                  <SimCard key={sim.id} sim={sim} onToggle={toggleSimActive} onRemove={removeSimulation}
                    onLabelGen={setShowLabelGen} onUpdateDates={updateSimDates} toggling={togglingId === sim.id} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive simulations */}
          {inactiveSims.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2 mb-2">
                <ToggleLeft className="w-4 h-4" /> Inactive — Hidden from Students ({inactiveSims.length})
              </h3>
              <div className="space-y-3">
                {inactiveSims.map(sim => (
                  <SimCard key={sim.id} sim={sim} onToggle={toggleSimActive} onRemove={removeSimulation}
                    onLabelGen={setShowLabelGen} onUpdateDates={updateSimDates} toggling={togglingId === sim.id} />
                ))}
              </div>
            </div>
          )}

          {sims.length === 0 && (
            <div className="ehr-card p-10 text-center">
              <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <div className="text-gray-400 text-sm">No simulations assigned yet.</div>
              <div className="text-gray-400 text-xs mt-1">Click "Assign from Repository" to add one.</div>
            </div>
          )}
        </div>
      )}

      {/* Label Modal */}
      {showLabelGen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Patient Labels</h3>
              <button onClick={() => setShowLabelGen(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <LabelGenerator patient={showLabelGen.scenario?.patient} encounterNumber={showLabelGen.encounter_number} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SimCard sub-component ────────────────────────────────
function SimCard({ sim, onToggle, onRemove, onLabelGen, onUpdateDates, toggling }: {
  sim: any
  onToggle: (id: string, current: boolean) => void
  onRemove: (id: string) => void
  onLabelGen: (sim: any) => void
  onUpdateDates: (id: string, from: string, until: string) => void
  toggling: boolean
}) {
  const [showDates, setShowDates] = useState(false)
  const [activeFrom, setActiveFrom] = useState(sim.active_from?.substring(0, 16) ?? '')
  const [activeUntil, setActiveUntil] = useState(sim.active_until?.substring(0, 16) ?? '')

  return (
    <div className={`ehr-card border-l-4 ${sim.is_active ? 'border-emerald-400' : 'border-gray-300'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{sim.scenario?.title}</span>
              <span className={`badge text-xs ${getCategoryColor(sim.scenario?.category)}`}>{sim.scenario?.category}</span>
              <span className={`badge text-xs ${getDifficultyColor(sim.scenario?.difficulty)}`}>{sim.scenario?.difficulty}</span>
            </div>

            {sim.scenario?.patient && (
              <div className="text-xs text-gray-500 mt-1">
                Patient: <strong>{sim.scenario.patient.last_name}, {sim.scenario.patient.first_name}</strong> · MRN: {sim.scenario.patient.mrn}
              </div>
            )}

            <div className="flex gap-3 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{sim.scenario?.estimated_duration_minutes} min</span>
              <span>Enc: {sim.encounter_number}</span>
              {sim.active_from && <span className="flex items-center gap-1 text-emerald-600"><Calendar className="w-3.5 h-3.5" />Opens: {formatDateTime(sim.active_from)}</span>}
              {sim.active_until && <span className="flex items-center gap-1 text-red-500"><Calendar className="w-3.5 h-3.5" />Closes: {formatDateTime(sim.active_until)}</span>}
            </div>

            {sim.instructions && (
              <div className="text-xs text-emerald-600 mt-1.5 bg-emerald-50 rounded px-2 py-1">{sim.instructions}</div>
            )}

            {showDates && (
              <div className="mt-3 grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
                <div>
                  <label className="form-label text-xs">Auto-activate date</label>
                  <input type="datetime-local" className="form-input text-xs" value={activeFrom} onChange={e => setActiveFrom(e.target.value)} />
                </div>
                <div>
                  <label className="form-label text-xs">Auto-deactivate date</label>
                  <input type="datetime-local" className="form-input text-xs" value={activeUntil} onChange={e => setActiveUntil(e.target.value)} />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => { onUpdateDates(sim.id, activeFrom, activeUntil); setShowDates(false) }}
                    className="btn btn-primary btn-sm">Save Dates</button>
                  <button onClick={() => setShowDates(false)} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {/* Big toggle button */}
            <button
              onClick={() => onToggle(sim.id, sim.is_active)}
              disabled={toggling}
              className={`btn ${sim.is_active ? 'btn-secondary text-red-600 hover:bg-red-50' : 'btn-success'} flex items-center gap-2`}
            >
              {toggling
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : sim.is_active
                  ? <ToggleRight className="w-5 h-5" />
                  : <ToggleLeft className="w-5 h-5" />}
              {sim.is_active ? 'Deactivate' : 'Activate'}
            </button>

            <button onClick={() => setShowDates(!showDates)} className="btn btn-secondary btn-sm">
              <Calendar className="w-3.5 h-3.5" /> Set Dates
            </button>

            {sim.scenario?.patient && (
              <button onClick={() => onLabelGen(sim)} className="btn btn-secondary btn-sm">
                🏷 Labels
              </button>
            )}

            <button onClick={() => onRemove(sim.id)} className="btn btn-secondary btn-sm text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
