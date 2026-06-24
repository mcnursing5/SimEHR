'use client'
import React from 'react'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import BarcodeScanner from '@/components/scanning/BarcodeScanner'
import { formatDateTime, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import {
  Pill, Scan, CheckCircle, XCircle, AlertTriangle,
  Clock, Plus, Loader2, User, Shield, RotateCcw, Info
} from 'lucide-react'

interface Props {
  sessionId: string
  medications: any[]
  patientVerified: boolean
  patientMRN: string
  patientName?: string
  isReadOnly?: boolean
}

const FIVE_RIGHTS = [
  { id: 'right_patient',       label: 'Right Patient',        desc: 'Verify patient identity matches the order. Check name and MRN against wristband.' },
  { id: 'right_medication',    label: 'Right Medication',     desc: 'Confirm the drug name matches exactly. Check for look-alike/sound-alike names.' },
  { id: 'right_dose',          label: 'Right Dose',           desc: 'Verify the dose is correct for this patient. Check weight-based dosing if applicable.' },
  { id: 'right_route',         label: 'Right Route',          desc: 'Confirm the route (PO, IV, IM, SQ, etc.) matches the medication order.' },
  { id: 'right_time',          label: 'Right Time',           desc: 'Verify this is the correct time. Check last dose time and ordered frequency.' },
  { id: 'right_reason',        label: 'Right Reason',         desc: 'Confirm the indication and that this medication is appropriate for this patient now.' },
  { id: 'right_documentation', label: 'Right Documentation',  desc: 'You are about to permanently document this in the MAR. Ensure all data is accurate.' },
]

const THREE_CHECKS = [
  { id: 'check1', label: 'Check 1 — When retrieving from storage', desc: 'Read the medication label when you first pick it up from the drawer or cabinet.' },
  { id: 'check2', label: 'Check 2 — Before preparing the dose',   desc: 'Read the label again before drawing up, crushing, or otherwise preparing the dose.' },
  { id: 'check3', label: 'Check 3 — At bedside before giving',    desc: 'Read the label one final time before handing to or administering to the patient.' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  given:         { label: 'Given',         color: 'badge-green' },
  held:          { label: 'Held',          color: 'badge-amber' },
  refused:       { label: 'Refused',       color: 'badge-red' },
  not_available: { label: 'Not Available', color: 'badge-gray' },
  see_note:      { label: 'See Note',      color: 'badge-purple' },
}

type WorkflowStep = 'rights' | 'checks' | 'scan_patient' | 'scan_med' | 'document'

const WORKFLOW_STEPS: { id: WorkflowStep; label: string }[] = [
  { id: 'rights',       label: '7 Rights' },
  { id: 'checks',       label: '3 Checks' },
  { id: 'scan_patient', label: 'Verify Patient' },
  { id: 'scan_med',     label: 'Verify Med' },
  { id: 'document',     label: 'Document' },
]

export default function MARPanel({ sessionId, medications, patientVerified, patientMRN, patientName, isReadOnly = false }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMed, setActiveMed] = useState<any>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanTarget, setScanTarget] = useState<'patient' | 'med'>('patient')
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('rights')
  const [rightsChecked, setRightsChecked] = useState<Record<string, boolean>>({})
  const [checksChecked, setChecksChecked] = useState<Record<string, boolean>>({})
  const [patientScanned, setPatientScanned] = useState(false)
  const [medScanned, setMedScanned] = useState(false)
  const [expandedMed, setExpandedMed] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adminForm, setAdminForm] = useState({
    dose_given: '', route_used: '', site: '', status: 'given',
    hold_reason: '', prn_reason: '', notes: '',
  })

  useEffect(() => { loadEntries() }, [sessionId])

  async function loadEntries() {
    const { data } = await supabase
      .from('mar_entries')
      .select('*, medication:medications(*), administered_by_profile:profiles(first_name, last_name)')
      .eq('session_id', sessionId)
      .order('administered_at', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }

  function startAdminister(med: any) {
    if (isReadOnly) return
    if (!patientVerified) {
      toast.error('Scan patient wristband first on the Patient Info tab')
      return
    }
    setActiveMed(med)
    setAdminForm({ dose_given: med.dose, route_used: med.route, site: '', status: 'given', hold_reason: '', prn_reason: '', notes: '' })
    setRightsChecked({})
    setChecksChecked({})
    setPatientScanned(patientVerified)
    setMedScanned(false)
    setWorkflowStep('rights')
  }

  function handleScan(value: string) {
    if (scanTarget === 'patient') {
      const ok = value === patientMRN || (() => { try { return JSON.parse(value).mrn === patientMRN } catch { return false } })()
      if (ok) { setPatientScanned(true); setShowScanner(false); toast.success('✓ Patient identity confirmed'); setWorkflowStep('scan_med') }
      else toast.error('⚠ Patient scan mismatch — wrong patient?')
    } else {
      const ok = value === activeMed?.barcode_value || value === activeMed?.ndc_code
      if (ok) { setMedScanned(true); setShowScanner(false); toast.success(`✓ ${activeMed.generic_name} verified`); setWorkflowStep('document') }
      else toast.error(`⚠ Medication mismatch. Expected: ${activeMed?.generic_name}`)
    }
  }

  async function handleAdminister(e: React.FormEvent) {
    e.preventDefault()
    if (!activeMed) return
    if (activeMed.is_prn && !adminForm.prn_reason.trim()) {
      toast.error('PRN reason is required')
      return
    }
    if (adminForm.status !== 'given' && !adminForm.hold_reason.trim()) {
      toast.error(`Reason required when status is "${adminForm.status}"`)
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()
    const { error } = await supabase.from('mar_entries').insert({
      session_id: sessionId,
      medication_id: activeMed.id,
      administered_by: user!.id,
      administered_at: now,
      dose_given: adminForm.dose_given,
      route_used: adminForm.route_used,
      site: adminForm.site || null,
      patient_scanned: patientScanned,
      medication_scanned: medScanned,
      scan_verified_at: (patientScanned && medScanned) ? now : null,
      status: adminForm.status,
      hold_reason: adminForm.hold_reason || adminForm.prn_reason || null,
      notes: adminForm.notes || null,
    })
    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      const r = Object.values(rightsChecked).filter(Boolean).length
      const c = Object.values(checksChecked).filter(Boolean).length
      toast.success(`✅ MAR recorded — ${activeMed.generic_name} ${adminForm.status} · ${r}/7 rights · ${c}/3 checks`)
      setActiveMed(null)
      loadEntries()
      await supabase.from('student_sessions').update({ last_active_at: now }).eq('id', sessionId)
    }
    setSaving(false)
  }

  async function resetMAR() {
    if (!confirm('Reset ALL MAR entries for this session? This prepares the simulation for the next student group. This cannot be undone.')) return
    setResetting(true)
    const { error } = await supabase.from('mar_entries').delete().eq('session_id', sessionId)
    if (!error) { setEntries([]); toast.success('MAR reset — ready for next group') }
    else toast.error('Reset failed: ' + error.message)
    setResetting(false)
  }

  const allRightsChecked = FIVE_RIGHTS.every(r => rightsChecked[r.id])
  const allChecksChecked = THREE_CHECKS.every(c => checksChecked[c.id])
  const scheduledMeds = medications.filter(m => !m.is_prn)
  const prnMeds = medications.filter(m => m.is_prn)
  const getLastEntry = (medId: string) => entries.find(e => e.medication_id === medId)
  const getEntryCount = (medId: string) => entries.filter(e => e.medication_id === medId && e.status === 'given').length
  const getMedEntries = (medId: string) => entries.filter(e => e.medication_id === medId)
  const currentStepIdx = WORKFLOW_STEPS.findIndex(s => s.id === workflowStep)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title mb-0 flex items-center gap-2">
          Medication Administration Record
        </h2>
        {!isReadOnly && (
          <button onClick={resetMAR} disabled={resetting || entries.length === 0}
            className="btn btn-secondary btn-sm text-amber-600 hover:bg-amber-50">
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset for Next Group
          </button>
        )}
      </div>

      {/* ── WORKFLOW MODAL ── */}
      {activeMed && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="bg-emerald-700 text-white px-6 py-4 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-xl">{activeMed.generic_name}</div>
                  {activeMed.brand_name && <div className="text-emerald-200 text-sm">{activeMed.brand_name}</div>}
                  <div className="text-emerald-100 text-sm mt-1 flex gap-4 flex-wrap">
                    <span>Ordered: {activeMed.dose}</span>
                    <span>Route: {activeMed.route}</span>
                    <span>Freq: {activeMed.frequency}</span>
                    {activeMed.is_prn && <span className="bg-amber-400 text-amber-900 px-2 rounded font-bold text-xs">PRN</span>}
                  </div>
                  <div className="text-emerald-200 text-xs mt-0.5">Indication: {activeMed.indication}</div>
                </div>
                <button onClick={() => setActiveMed(null)} className="text-emerald-200 hover:text-white text-3xl leading-none ml-4">×</button>
              </div>
              {/* Step progress */}
              <div className="flex gap-2 mt-4">
                {WORKFLOW_STEPS.map((s, i) => (
                  <div key={s.id} className="flex-1 text-center">
                    <div className={cn('h-1.5 rounded-full', i <= currentStepIdx ? 'bg-white' : 'bg-emerald-500')} />
                    <div className={cn('text-xs mt-1 truncate', i === currentStepIdx ? 'text-white font-bold' : 'text-emerald-300')}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6">

              {/* STEP 1 — 7 RIGHTS */}
              {workflowStep === 'rights' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-500" /> Step 1 — Verify the 7 Rights of Medication Administration
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Check each right before proceeding. Do not proceed until all are confirmed.</p>
                  </div>
                  <div className="space-y-2">
                    {FIVE_RIGHTS.map((right, i) => (
                      <label key={right.id} className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        rightsChecked[right.id] ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-emerald-300'
                      )}>
                        <input type="checkbox" className="w-5 h-5 mt-0.5 flex-shrink-0 accent-green-500"
                          checked={rightsChecked[right.id] ?? false}
                          onChange={e => setRightsChecked(r => ({ ...r, [right.id]: e.target.checked }))} />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{i + 1}. {right.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{right.desc}</div>
                        </div>
                        {rightsChecked[right.id] && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                      </label>
                    ))}
                  </div>
                  {activeMed.special_instructions && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700"><strong>Special instructions:</strong> {activeMed.special_instructions}</p>
                    </div>
                  )}
                  <button onClick={() => setWorkflowStep('checks')} disabled={!allRightsChecked}
                    className="btn btn-primary w-full justify-center py-3 text-base">
                    {allRightsChecked
                      ? <><CheckCircle className="w-5 h-5" /> All 7 Rights Confirmed — Next: 3 Checks</>
                      : `Confirm all 7 rights (${Object.values(rightsChecked).filter(Boolean).length}/7 done)`}
                  </button>
                </div>
              )}

              {/* STEP 2 — 3 CHECKS */}
              {workflowStep === 'checks' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" /> Step 2 — The 3 Checks
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Confirm you read the medication label at each checkpoint.</p>
                  </div>
                  <div className="space-y-3">
                    {THREE_CHECKS.map((check, i) => (
                      <label key={check.id} className={cn(
                        'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                        checksChecked[check.id] ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-emerald-300'
                      )}>
                        <input type="checkbox" className="w-5 h-5 mt-0.5 flex-shrink-0 accent-green-500"
                          checked={checksChecked[check.id] ?? false}
                          onChange={e => setChecksChecked(c => ({ ...c, [check.id]: e.target.checked }))} />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{check.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{check.desc}</div>
                        </div>
                        {checksChecked[check.id] && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setWorkflowStep('rights')} className="btn btn-secondary flex-1 justify-center">← Back</button>
                    <button type="button" onClick={() => setWorkflowStep(patientScanned ? 'scan_med' : 'scan_patient')}
                      disabled={!allChecksChecked} className="btn btn-primary flex-1 justify-center py-3">
                      {allChecksChecked
                        ? <><CheckCircle className="w-5 h-5" /> 3 Checks Done — Next: Verify Patient</>
                        : `Complete all 3 checks (${Object.values(checksChecked).filter(Boolean).length}/3)`}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — SCAN PATIENT */}
              {workflowStep === 'scan_patient' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-500" /> Step 3 — Verify Patient Identity
                  </h3>
                  <p className="text-sm text-gray-500">Scan the patient wristband to confirm right patient before administering.</p>
                  {patientScanned ? (
                    <div className="flex items-center gap-3 bg-green-50 border-2 border-green-300 rounded-xl p-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="font-bold text-green-800">Patient identity verified ✓</div>
                        <div className="text-sm text-green-600">MRN: {patientMRN} · {patientName ?? ''}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="scan-prompt">
                      <Scan className="w-12 h-12 text-emerald-400" />
                      <div className="font-medium text-gray-700">Scan patient wristband</div>
                      <div className="text-xs text-gray-400">USB scanner, camera, or manual entry</div>
                      <button onClick={() => { setScanTarget('patient'); setShowScanner(true) }} className="btn btn-primary">
                        <Scan className="w-4 h-4" /> Open Scanner
                      </button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setWorkflowStep('checks')} className="btn btn-secondary flex-1 justify-center">← Back</button>
                    <button type="button" onClick={() => { if (!patientScanned) { setPatientScanned(true); toast('⚠ Proceeding without patient scan', { icon: '⚠️' }) } setWorkflowStep('scan_med') }}
                      className="btn btn-primary flex-1 justify-center">
                      {patientScanned ? 'Continue →' : 'Skip (not recommended)'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — SCAN MED */}
              {workflowStep === 'scan_med' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <Pill className="w-5 h-5 text-emerald-500" /> Step 4 — Verify Medication
                  </h3>
                  <p className="text-sm text-gray-500">Scan the medication barcode to confirm right medication and dose.</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 font-mono">
                    <div><span className="text-gray-500 font-sans">Drug:</span> {activeMed.generic_name}</div>
                    <div><span className="text-gray-500 font-sans">Dose:</span> {activeMed.dose}</div>
                    <div><span className="text-gray-500 font-sans">Barcode:</span> {activeMed.barcode_value}</div>
                  </div>
                  {medScanned ? (
                    <div className="flex items-center gap-3 bg-green-50 border-2 border-green-300 rounded-xl p-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                      <div>
                        <div className="font-bold text-green-800">Medication verified ✓</div>
                        <div className="text-sm text-green-600">{activeMed.generic_name} — barcode matched</div>
                      </div>
                    </div>
                  ) : (
                    <div className="scan-prompt">
                      <Pill className="w-12 h-12 text-emerald-400" />
                      <div className="font-medium text-gray-700">Scan medication barcode or QR code</div>
                      <button onClick={() => { setScanTarget('med'); setShowScanner(true) }} className="btn btn-primary">
                        <Scan className="w-4 h-4" /> Open Scanner
                      </button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setWorkflowStep('scan_patient')} className="btn btn-secondary flex-1 justify-center">← Back</button>
                    <button type="button" onClick={() => { if (!medScanned) { setMedScanned(true); toast('⚠ Proceeding without medication scan', { icon: '⚠️' }) } setWorkflowStep('document') }}
                      className="btn btn-primary flex-1 justify-center">
                      {medScanned ? 'Continue →' : 'Skip (not recommended)'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5 — DOCUMENT */}
              {workflowStep === 'document' && (
                <form onSubmit={handleAdminister} className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" /> Step 5 — Document Administration
                    </h3>
                    {/* Safety summary scorecard */}
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[
                        { label: '7 Rights', count: Object.values(rightsChecked).filter(Boolean).length, total: 7 },
                        { label: '3 Checks', count: Object.values(checksChecked).filter(Boolean).length, total: 3 },
                        { label: 'Pt Scan',  count: patientScanned ? 1 : 0, total: 1 },
                        { label: 'Med Scan', count: medScanned ? 1 : 0, total: 1 },
                      ].map(s => (
                        <div key={s.label} className={cn(
                          'text-center p-2 rounded-lg text-xs border',
                          s.count === s.total ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {s.count === s.total
                            ? <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                            : <AlertTriangle className="w-4 h-4 mx-auto mb-1" />}
                          <div className="font-bold">{s.count}/{s.total}</div>
                          <div>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Dose Given *</label>
                      <input className="form-input" value={adminForm.dose_given}
                        onChange={e => setAdminForm(f => ({ ...f, dose_given: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="form-label">Route *</label>
                      <select className="form-select" value={adminForm.route_used}
                        onChange={e => setAdminForm(f => ({ ...f, route_used: e.target.value }))}>
                        {['PO','IV','IM','SQ','SL','TOP','INH','PR','NG','GT'].map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Administration Site</label>
                      <input className="form-input" placeholder="e.g. L deltoid, R antecubital"
                        value={adminForm.site} onChange={e => setAdminForm(f => ({ ...f, site: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Status *</label>
                      <select className="form-select" value={adminForm.status}
                        onChange={e => setAdminForm(f => ({ ...f, status: e.target.value }))}>
                        {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                    </div>
                  </div>

                  {activeMed.is_prn && (
                    <div>
                      <label className="form-label font-semibold text-amber-700">
                        PRN Indication * <span className="text-xs font-normal text-gray-500">(required for all PRN medications)</span>
                      </label>
                      <textarea className="form-textarea border-amber-300" rows={2}
                        placeholder="Document the clinical reason for giving this PRN medication (e.g. patient reports pain 7/10, requesting relief; SpO2 92% on room air)..."
                        value={adminForm.prn_reason}
                        onChange={e => setAdminForm(f => ({ ...f, prn_reason: e.target.value }))}
                        required />
                    </div>
                  )}

                  {adminForm.status !== 'given' && (
                    <div>
                      <label className="form-label font-semibold text-red-700">
                        Reason for {adminForm.status} *
                      </label>
                      <input className="form-input border-red-300" placeholder="Document reason..."
                        value={adminForm.hold_reason}
                        onChange={e => setAdminForm(f => ({ ...f, hold_reason: e.target.value }))}
                        required />
                    </div>
                  )}

                  <div>
                    <label className="form-label">Additional Notes</label>
                    <textarea className="form-textarea" rows={2}
                      placeholder="Patient response, pain reassessment after analgesic, observations..."
                      value={adminForm.notes} onChange={e => setAdminForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setWorkflowStep('scan_med')} className="btn btn-secondary">← Back</button>
                    <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center py-3 text-base">
                      {saving
                        ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                        : <><CheckCircle className="w-5 h-5" /> Sign & Record in MAR</>}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULED MEDS ── */}
      <div className="ehr-card">
        <div className="ehr-card-header">
          <span className="font-semibold text-sm">Scheduled Medications</span>
          <span className="badge badge-blue">{scheduledMeds.length}</span>
        </div>
        <table className="ehr-table">
          <thead>
            <tr><th>Medication</th><th>Ordered Dose / Route</th><th>Frequency</th><th>Last Given</th><th>Given By</th><th>Times Given</th><th>Action</th></tr>
          </thead>
          <tbody>
            {scheduledMeds.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-6">No scheduled medications</td></tr>}
            {scheduledMeds.map(med => {
              const last = getLastEntry(med.id)
              const count = getEntryCount(med.id)
              const medEntries = getMedEntries(med.id)
              const isExpanded = expandedMed === med.id
              return (
                <React.Fragment key={med.id}>
                  <tr className={last?.status === 'given' ? 'bg-green-50/40' : ''}>
                    <td>
                      <button onClick={() => setExpandedMed(isExpanded ? null : med.id)}
                        className="text-left hover:text-emerald-600 w-full">
                        <div className="font-medium">{med.generic_name}</div>
                        {med.brand_name && <div className="text-xs text-gray-400">{med.brand_name}</div>}
                        {medEntries.length > 0 && (
                          <div className="text-xs text-emerald-500 mt-0.5">{isExpanded ? '▲ hide history' : `▼ show ${medEntries.length} entries`}</div>
                        )}
                      </button>
                    </td>
                    <td className="font-mono text-sm">{med.dose} · {med.route}</td>
                    <td className="text-sm">{med.frequency}</td>
                    <td>
                      {last ? (
                        <div>
                          <span className={`badge text-xs ${STATUS_LABELS[last.status]?.color ?? 'badge-gray'}`}>{STATUS_LABELS[last.status]?.label}</span>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(last.administered_at)}</div>
                        </div>
                      ) : <span className="text-gray-400 text-xs">Not given yet</span>}
                    </td>
                    <td>
                      {last ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <User className="w-3 h-3" />{last.administered_by_profile?.first_name} {last.administered_by_profile?.last_name}
                        </div>
                      ) : '—'}
                    </td>
                    <td><span className={`badge text-xs ${count > 0 ? 'badge-green' : 'badge-gray'}`}>{count}×</span></td>
                    <td>
                      {!isReadOnly && (
                        <button onClick={() => startAdminister(med)} className="btn btn-primary btn-sm">
                          <Pill className="w-3 h-3" /> Administer
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && medEntries.map((entry: any) => (
                    <tr key={`h-${entry.id}`} className="bg-gray-50 text-xs border-l-2 border-emerald-200">
                      <td className="pl-6 text-gray-400 italic">↳ {formatDateTime(entry.administered_at)}</td>
                      <td className="font-mono text-gray-500">{entry.dose_given} · {entry.route_used}{entry.site ? ` (${entry.site})` : ''}</td>
                      <td><span className={`badge text-xs ${STATUS_LABELS[entry.status]?.color ?? 'badge-gray'}`}>{STATUS_LABELS[entry.status]?.label}</span></td>
                      <td className="text-gray-500">{entry.hold_reason ?? ''}</td>
                      <td className="text-gray-500">{entry.administered_by_profile?.first_name} {entry.administered_by_profile?.last_name}</td>
                      <td>{entry.patient_scanned && entry.medication_scanned ? <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Scanned</span> : <span className="text-gray-400">No scan</span>}</td>
                      <td className="text-gray-400 italic max-w-[150px] truncate">{entry.notes ?? ''}</td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── PRN MEDS ── */}
      <div className="ehr-card">
        <div className="ehr-card-header">
          <span className="font-semibold text-sm">PRN Medications</span>
          <div className="flex items-center gap-2">
            <span className="badge badge-amber">{prnMeds.length} PRN</span>
            <span className="flex items-center gap-1 text-xs text-gray-500"><Info className="w-3.5 h-3.5" />PRN indication required</span>
          </div>
        </div>
        <table className="ehr-table">
          <thead>
            <tr><th>Medication</th><th>Dose / Route</th><th>Frequency</th><th>Indication</th><th>Last Given</th><th>Given By</th><th>Times Given</th><th>Action</th></tr>
          </thead>
          <tbody>
            {prnMeds.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-6">No PRN medications</td></tr>}
            {prnMeds.map(med => {
              const last = getLastEntry(med.id)
              const count = getEntryCount(med.id)
              return (
                <tr key={med.id}>
                  <td className="font-medium">{med.generic_name}{med.brand_name && <div className="text-xs text-gray-400">{med.brand_name}</div>}</td>
                  <td className="font-mono text-sm">{med.dose} · {med.route}</td>
                  <td className="text-sm">{med.frequency}</td>
                  <td className="text-xs text-gray-500">{med.indication}</td>
                  <td>
                    {last ? (
                      <div>
                        <span className={`badge text-xs ${STATUS_LABELS[last.status]?.color ?? 'badge-gray'}`}>{STATUS_LABELS[last.status]?.label}</span>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDateTime(last.administered_at)}</div>
                        {last.hold_reason && <div className="text-xs text-emerald-600 mt-0.5 italic">"{last.hold_reason}"</div>}
                      </div>
                    ) : <span className="text-gray-400 text-xs">Not given</span>}
                  </td>
                  <td>
                    {last ? <div className="flex items-center gap-1 text-xs text-gray-600"><User className="w-3 h-3" />{last.administered_by_profile?.first_name} {last.administered_by_profile?.last_name}</div> : '—'}
                  </td>
                  <td><span className={`badge text-xs ${count > 0 ? 'badge-green' : 'badge-gray'}`}>{count}×</span></td>
                  <td>
                    {!isReadOnly && (
                      <button onClick={() => startAdminister(med)} className="btn btn-secondary btn-sm">
                        <Plus className="w-3 h-3" /> Give PRN
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showScanner && (
        <BarcodeScanner
          title={scanTarget === 'patient' ? 'Scan Patient Wristband' : `Scan Medication: ${activeMed?.generic_name}`}
          instruction={scanTarget === 'patient' ? 'Scan wristband QR or barcode' : `Scan barcode on ${activeMed?.generic_name} packaging`}
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          expectedValue={scanTarget === 'patient' ? patientMRN : activeMed?.barcode_value}
        />
      )}
    </div>
  )
}
