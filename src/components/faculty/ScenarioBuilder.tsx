'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { generateNDC } from '@/lib/utils'
import {
  Plus, Trash2, Save, ChevronLeft, ChevronRight,
  User, Pill, TestTube, ClipboardList, BookOpen, Loader2, X
} from 'lucide-react'

const STEPS = ['Scenario Info', 'Patient Details', 'Medications', 'Lab Results', 'Orders', 'Review']
const CATEGORIES = ['cardiac','respiratory','neurological','obstetric','pediatric','trauma','sepsis','diabetes','renal','psychiatric','postoperative','general']
const ROUTES = ['PO','IV','IM','SQ','SL','TOP','INH','PR','NG','GT']
const ORDER_TYPES = ['medication','lab','imaging','nursing','diet','activity','consult','iv_fluid']
const PRIORITIES = ['routine','urgent','stat']
const LAB_PANELS = ['CBC','BMP','CMP','ABG','Troponin I','Troponin T','BNP','Lactate','Coagulation Panel (PT/INR/PTT)','Urinalysis','Blood Culture','Lipid Panel','LFTs','Thyroid Panel']

export default function ScenarioBuilder({ facultyId, existingScenario }: { facultyId: string, existingScenario?: any }) {
  const supabase = createClient()
  const router = useRouter()
  const isEditing = !!existingScenario
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [info, setInfo] = useState({
    title: existingScenario?.title ?? '',
    description: existingScenario?.description ?? '',
    category: existingScenario?.category ?? 'cardiac',
    difficulty: existingScenario?.difficulty ?? 'intermediate',
    estimated_duration_minutes: existingScenario?.estimated_duration_minutes ?? 60,
    learning_objectives: existingScenario?.learning_objectives?.length ? existingScenario.learning_objectives : [''],
    tags: existingScenario?.tags?.join(', ') ?? '',
    is_published: existingScenario?.is_published ?? false,
  })

  const ep = existingScenario?.patient
  const [patient, setPatient] = useState({
    first_name: ep?.first_name ?? '', last_name: ep?.last_name ?? '',
    date_of_birth: ep?.date_of_birth ?? '', sex: ep?.sex ?? 'Male',
    blood_type: ep?.blood_type ?? 'O+', weight_kg: ep?.weight_kg?.toString() ?? '',
    height_cm: ep?.height_cm?.toString() ?? '', room_number: ep?.room_number ?? '',
    bed_number: ep?.bed_number ?? '',
    admission_date: ep?.admission_date ?? new Date().toISOString().split('T')[0],
    attending_provider: ep?.attending_provider ?? '', admitting_diagnosis: ep?.admitting_diagnosis ?? '',
    code_status: ep?.code_status ?? 'Full Code', insurance: ep?.insurance ?? '',
    emergency_contact_name: ep?.emergency_contact_name ?? '',
    emergency_contact_phone: ep?.emergency_contact_phone ?? '',
    allergies: ep?.allergies ?? [] as { substance: string; reaction: string; severity: string }[],
  })

  const [medications, setMedications] = useState<any[]>(existingScenario?.medications ?? [])
  const [labResults, setLabResults] = useState<any[]>(
    existingScenario?.lab_results?.map((lr: any) => ({ ...lr, components: lr.lab_components ?? [] })) ?? []
  )
  const [orders, setOrders] = useState<any[]>(existingScenario?.orders ?? [])

  function addObjective() { setInfo(i => ({ ...i, learning_objectives: [...i.learning_objectives, ''] })) }
  function updateObjective(idx: number, val: string) {
    setInfo(i => ({ ...i, learning_objectives: i.learning_objectives.map((o, j) => j === idx ? val : o) }))
  }
  function removeObjective(idx: number) {
    setInfo(i => ({ ...i, learning_objectives: i.learning_objectives.filter((_, j) => j !== idx) }))
  }

  function addAllergy() {
    setPatient(p => ({ ...p, allergies: [...p.allergies, { substance: '', reaction: '', severity: 'Moderate' }] }))
  }
  function updateAllergy(idx: number, field: string, val: string) {
    setPatient(p => ({
      ...p,
      allergies: p.allergies.map((a, i) => i === idx ? { ...a, [field]: val } : a)
    }))
  }
  function removeAllergy(idx: number) {
    setPatient(p => ({ ...p, allergies: p.allergies.filter((_, i) => i !== idx) }))
  }

  function addMedication() {
    setMedications(m => [...m, {
      generic_name: '', brand_name: '', drug_class: '', dose: '', route: 'IV',
      frequency: '', indication: '', is_prn: false, special_instructions: '',
      barcode_value: `MED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      ndc_code: generateNDC(),
    }])
  }
  function updateMed(idx: number, field: string, val: any) {
    setMedications(m => m.map((med, i) => i === idx ? { ...med, [field]: val } : med))
  }
  function removeMed(idx: number) { setMedications(m => m.filter((_, i) => i !== idx)) }

  function addLabPanel() {
    setLabResults(l => [...l, {
      panel_name: '', collected_at: new Date().toISOString(), resulted_at: new Date().toISOString(),
      components: [{ name: '', value: '', unit: '', reference_low: '', reference_high: '', is_critical: false, flag: '' }]
    }])
  }
  function updateLab(idx: number, field: string, val: any) {
    setLabResults(l => l.map((lr, i) => i === idx ? { ...lr, [field]: val } : lr))
  }
  function addComponent(labIdx: number) {
    setLabResults(l => l.map((lr, i) => i === labIdx
      ? { ...lr, components: [...lr.components, { name: '', value: '', unit: '', reference_low: '', reference_high: '', is_critical: false, flag: '' }] }
      : lr))
  }
  function updateComponent(labIdx: number, compIdx: number, field: string, val: any) {
    setLabResults(l => l.map((lr, i) => i === labIdx
      ? { ...lr, components: lr.components.map((c: any, j: number) => j === compIdx ? { ...c, [field]: val } : c) }
      : lr))
  }
  function removeLab(idx: number) { setLabResults(l => l.filter((_, i) => i !== idx)) }

  function addOrder() {
    setOrders(o => [...o, {
      order_type: 'nursing', description: '', details: '', priority: 'routine',
      ordered_by: '', frequency: '', duration: '', special_instructions: '',
      ordered_at: new Date().toISOString(),
    }])
  }
  function updateOrder(idx: number, field: string, val: any) {
    setOrders(o => o.map((ord, i) => i === idx ? { ...ord, [field]: val } : ord))
  }
  function removeOrder(idx: number) { setOrders(o => o.filter((_, i) => i !== idx)) }

  async function handleSave(publish: boolean) {
    setSaving(true)
    try {
      const scenarioPayload = {
        title: info.title,
        description: info.description,
        category: info.category,
        difficulty: info.difficulty,
        estimated_duration_minutes: info.estimated_duration_minutes,
        learning_objectives: info.learning_objectives.filter(Boolean),
        tags: info.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        is_published: publish,
      }

      let scenarioId: string

      if (isEditing) {
        // UPDATE existing scenario
        const { error: sErr } = await supabase
          .from('simulation_scenarios')
          .update(scenarioPayload)
          .eq('id', existingScenario.id)
        if (sErr) throw new Error('Scenario: ' + sErr.message)
        scenarioId = existingScenario.id

        // Update patient (upsert)
        if (patient.first_name) {
          const patientData = {
            scenario_id: scenarioId,
            first_name: patient.first_name, last_name: patient.last_name,
            date_of_birth: patient.date_of_birth, sex: patient.sex,
            blood_type: patient.blood_type,
            weight_kg: patient.weight_kg ? parseFloat(patient.weight_kg) : null,
            height_cm: patient.height_cm ? parseFloat(patient.height_cm) : null,
            room_number: patient.room_number, bed_number: patient.bed_number,
            admission_date: patient.admission_date,
            attending_provider: patient.attending_provider,
            admitting_diagnosis: patient.admitting_diagnosis,
            code_status: patient.code_status,
            insurance: patient.insurance || null,
            emergency_contact_name: patient.emergency_contact_name || null,
            emergency_contact_phone: patient.emergency_contact_phone || null,
            allergies: patient.allergies.filter((a: any) => a.substance).map((a: any, i: number) => ({ ...a, id: `a${i+1}` })),
          }
          if (existingScenario.patient) {
            await supabase.from('patients').update(patientData).eq('scenario_id', scenarioId)
          } else {
            await supabase.from('patients').insert(patientData)
          }
        }

        // Replace medications: delete old, insert new
        await supabase.from('medications').delete().eq('scenario_id', scenarioId)
        for (const med of medications.filter((m: any) => m.generic_name)) {
          const { id, scenario_id, created_at, ...medData } = med
          await supabase.from('medications').insert({ scenario_id: scenarioId, ...medData })
        }

        // Replace labs
        await supabase.from('lab_results').delete().eq('scenario_id', scenarioId)
        for (const lr of labResults.filter((l: any) => l.panel_name)) {
          const { data: lrData } = await supabase
            .from('lab_results')
            .insert({ scenario_id: scenarioId, panel_name: lr.panel_name, collected_at: lr.collected_at, resulted_at: lr.resulted_at })
            .select().single()
          if (lrData) {
            for (const comp of (lr.components ?? []).filter((c: any) => c.name)) {
              const { id, lab_result_id, ...compData } = comp
              await supabase.from('lab_components').insert({ lab_result_id: lrData.id, ...compData })
            }
          }
        }

        // Replace orders
        await supabase.from('orders').delete().eq('scenario_id', scenarioId)
        for (const ord of orders.filter((o: any) => o.description)) {
          const { id, scenario_id, ...ordData } = ord
          await supabase.from('orders').insert({ scenario_id: scenarioId, ...ordData })
        }

        toast.success(`Scenario updated!`)
        router.push(`/faculty/scenarios/${scenarioId}`)

      } else {
        // CREATE new scenario
        const { data: scenario, error: sErr } = await supabase
          .from('simulation_scenarios')
          .insert({ ...scenarioPayload, created_by: facultyId })
          .select().single()
        if (sErr) throw new Error('Scenario: ' + sErr.message)
        scenarioId = scenario.id

        if (patient.first_name) {
          const { error: pErr } = await supabase.from('patients').insert({
            scenario_id: scenarioId,
            first_name: patient.first_name, last_name: patient.last_name,
            date_of_birth: patient.date_of_birth, sex: patient.sex,
            blood_type: patient.blood_type,
            weight_kg: patient.weight_kg ? parseFloat(patient.weight_kg) : null,
            height_cm: patient.height_cm ? parseFloat(patient.height_cm) : null,
            room_number: patient.room_number, bed_number: patient.bed_number,
            admission_date: patient.admission_date,
            attending_provider: patient.attending_provider,
            admitting_diagnosis: patient.admitting_diagnosis,
            code_status: patient.code_status,
            insurance: patient.insurance || null,
            emergency_contact_name: patient.emergency_contact_name || null,
            emergency_contact_phone: patient.emergency_contact_phone || null,
            allergies: patient.allergies.filter((a: any) => a.substance).map((a: any, i: number) => ({ ...a, id: `a${i+1}` })),
          })
          if (pErr) throw new Error('Patient: ' + pErr.message)
        }

        for (const med of medications.filter((m: any) => m.generic_name)) {
          await supabase.from('medications').insert({ scenario_id: scenarioId, ...med })
        }

        for (const lr of labResults.filter((l: any) => l.panel_name)) {
          const { data: lrData } = await supabase
            .from('lab_results')
            .insert({ scenario_id: scenarioId, panel_name: lr.panel_name, collected_at: lr.collected_at, resulted_at: lr.resulted_at })
            .select().single()
          if (lrData) {
            for (const comp of (lr.components ?? []).filter((c: any) => c.name)) {
              await supabase.from('lab_components').insert({ lab_result_id: lrData.id, ...comp })
            }
          }
        }

        for (const ord of orders.filter((o: any) => o.description)) {
          await supabase.from('orders').insert({ scenario_id: scenarioId, ...ord })
        }

        toast.success(`Scenario "${info.title}" ${publish ? 'published' : 'saved as draft'}!`)
        router.push('/faculty/repository')
      }
    } catch (err: any) {
      toast.error(err.message)
    }
    setSaving(false)
  }

  const canProceed = [
    info.title && info.category && info.difficulty,
    patient.first_name && patient.last_name && patient.date_of_birth,
    true, true, true, true
  ][step]

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="btn btn-secondary btn-sm">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="page-title">Create Simulation Scenario</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                i === step ? 'bg-emerald-600 text-white' :
                i < step ? 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200' :
                'bg-gray-100 text-gray-400 cursor-default'
              }`}
            >
              <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold
                border-current">{i + 1}</span>
              {s}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          </div>
        ))}
      </div>

      {/* STEP 0: Scenario Info */}
      {step === 0 && (
        <div className="ehr-card">
          <div className="ehr-card-header"><BookOpen className="w-4 h-4 text-emerald-500" /><span className="font-semibold ml-2">Scenario Information</span></div>
          <div className="ehr-card-body space-y-4">
            <div>
              <label className="form-label">Scenario Title *</label>
              <input className="form-input" placeholder="e.g. Acute STEMI - John Martinez"
                value={info.title} onChange={e => setInfo(i => ({...i, title: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" rows={3} placeholder="Brief overview of the simulation scenario..."
                value={info.description} onChange={e => setInfo(i => ({...i, description: e.target.value}))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Category *</label>
                <select className="form-select" value={info.category}
                  onChange={e => setInfo(i => ({...i, category: e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Difficulty *</label>
                <select className="form-select" value={info.difficulty}
                  onChange={e => setInfo(i => ({...i, difficulty: e.target.value}))}>
                  {['beginner','intermediate','advanced'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min="5" max="480"
                  value={info.estimated_duration_minutes}
                  onChange={e => setInfo(i => ({...i, estimated_duration_minutes: parseInt(e.target.value)}))} />
              </div>
            </div>
            <div>
              <label className="form-label">Learning Objectives</label>
              {info.learning_objectives.map((obj, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="form-input flex-1" placeholder={`Objective ${i+1}...`}
                    value={obj} onChange={e => updateObjective(i, e.target.value)} />
                  <button onClick={() => removeObjective(i)} className="btn btn-secondary btn-sm text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addObjective} className="btn btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" /> Add Objective
              </button>
            </div>
            <div>
              <label className="form-label">Tags (comma separated)</label>
              <input className="form-input" placeholder="sepsis, elderly, bundle, ICU"
                value={info.tags} onChange={e => setInfo(i => ({...i, tags: e.target.value}))} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Patient */}
      {step === 1 && (
        <div className="ehr-card">
          <div className="ehr-card-header"><User className="w-4 h-4 text-emerald-500" /><span className="font-semibold ml-2">Patient Details</span></div>
          <div className="ehr-card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">First Name *</label><input className="form-input" value={patient.first_name} onChange={e => setPatient(p => ({...p, first_name: e.target.value}))} /></div>
              <div><label className="form-label">Last Name *</label><input className="form-input" value={patient.last_name} onChange={e => setPatient(p => ({...p, last_name: e.target.value}))} /></div>
              <div><label className="form-label">Date of Birth *</label><input className="form-input" type="date" value={patient.date_of_birth} onChange={e => setPatient(p => ({...p, date_of_birth: e.target.value}))} /></div>
              <div><label className="form-label">Sex</label><select className="form-select" value={patient.sex} onChange={e => setPatient(p => ({...p, sex: e.target.value}))}>
                <option>Male</option><option>Female</option><option>Other</option></select></div>
              <div><label className="form-label">Blood Type</label><select className="form-select" value={patient.blood_type} onChange={e => setPatient(p => ({...p, blood_type: e.target.value}))}>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label className="form-label">Code Status</label><select className="form-select" value={patient.code_status} onChange={e => setPatient(p => ({...p, code_status: e.target.value}))}>
                {['Full Code','DNR','DNI','DNR/DNI','Comfort Care'].map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="form-label">Weight (kg)</label><input className="form-input" type="number" step="0.1" value={patient.weight_kg} onChange={e => setPatient(p => ({...p, weight_kg: e.target.value}))} /></div>
              <div><label className="form-label">Height (cm)</label><input className="form-input" type="number" step="0.1" value={patient.height_cm} onChange={e => setPatient(p => ({...p, height_cm: e.target.value}))} /></div>
              <div><label className="form-label">Room Number</label><input className="form-input" placeholder="3B" value={patient.room_number} onChange={e => setPatient(p => ({...p, room_number: e.target.value}))} /></div>
              <div><label className="form-label">Bed Number</label><input className="form-input" placeholder="302-A" value={patient.bed_number} onChange={e => setPatient(p => ({...p, bed_number: e.target.value}))} /></div>
              <div><label className="form-label">Admission Date</label><input className="form-input" type="date" value={patient.admission_date} onChange={e => setPatient(p => ({...p, admission_date: e.target.value}))} /></div>
              <div><label className="form-label">Attending Provider</label><input className="form-input" placeholder="Dr. Jane Smith, MD" value={patient.attending_provider} onChange={e => setPatient(p => ({...p, attending_provider: e.target.value}))} /></div>
            </div>
            <div><label className="form-label">Admitting Diagnosis</label><input className="form-input" value={patient.admitting_diagnosis} onChange={e => setPatient(p => ({...p, admitting_diagnosis: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="form-label">Emergency Contact Name</label><input className="form-input" value={patient.emergency_contact_name} onChange={e => setPatient(p => ({...p, emergency_contact_name: e.target.value}))} /></div>
              <div><label className="form-label">Emergency Contact Phone</label><input className="form-input" value={patient.emergency_contact_phone} onChange={e => setPatient(p => ({...p, emergency_contact_phone: e.target.value}))} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Allergies</label>
                <button onClick={addAllergy} className="btn btn-secondary btn-sm"><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
              {patient.allergies.map((a, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                  <input className="form-input" placeholder="Substance" value={a.substance} onChange={e => updateAllergy(i, 'substance', e.target.value)} />
                  <input className="form-input" placeholder="Reaction" value={a.reaction} onChange={e => updateAllergy(i, 'reaction', e.target.value)} />
                  <select className="form-select" value={a.severity} onChange={e => updateAllergy(i, 'severity', e.target.value)}>
                    {['Mild','Moderate','Severe','Life-threatening'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => removeAllergy(i)} className="btn btn-secondary btn-sm text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {patient.allergies.length === 0 && <div className="text-sm text-gray-400">No allergies added (NKDA)</div>}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Medications */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0 flex items-center gap-2"><Pill className="w-5 h-5 text-emerald-500" /> Medications</h2>
            <button onClick={addMedication} className="btn btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Medication</button>
          </div>
          {medications.length === 0 && (
            <div className="ehr-card p-8 text-center text-gray-400">No medications yet. Click "Add Medication" to add one.</div>
          )}
          {medications.map((med, i) => (
            <div key={i} className="ehr-card">
              <div className="ehr-card-header">
                <span className="font-medium text-sm">Medication {i+1}</span>
                <button onClick={() => removeMed(i)} className="btn btn-secondary btn-sm text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="ehr-card-body grid grid-cols-2 gap-3">
                <div><label className="form-label">Generic Name *</label><input className="form-input" value={med.generic_name} onChange={e => updateMed(i, 'generic_name', e.target.value)} /></div>
                <div><label className="form-label">Brand Name</label><input className="form-input" value={med.brand_name} onChange={e => updateMed(i, 'brand_name', e.target.value)} /></div>
                <div><label className="form-label">Drug Class</label><input className="form-input" value={med.drug_class} onChange={e => updateMed(i, 'drug_class', e.target.value)} /></div>
                <div><label className="form-label">Dose *</label><input className="form-input" placeholder="e.g. 25mg" value={med.dose} onChange={e => updateMed(i, 'dose', e.target.value)} /></div>
                <div><label className="form-label">Route</label><select className="form-select" value={med.route} onChange={e => updateMed(i, 'route', e.target.value)}>{ROUTES.map(r => <option key={r}>{r}</option>)}</select></div>
                <div><label className="form-label">Frequency</label><input className="form-input" placeholder="BID, Q4H, PRN..." value={med.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} /></div>
                <div><label className="form-label">Indication</label><input className="form-input" value={med.indication} onChange={e => updateMed(i, 'indication', e.target.value)} /></div>
                <div><label className="form-label">Barcode Value</label><input className="form-input font-mono text-sm" value={med.barcode_value} onChange={e => updateMed(i, 'barcode_value', e.target.value)} /></div>
                <div className="col-span-2"><label className="form-label">Special Instructions</label><input className="form-input" value={med.special_instructions} onChange={e => updateMed(i, 'special_instructions', e.target.value)} /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id={`prn_${i}`} checked={med.is_prn} onChange={e => updateMed(i, 'is_prn', e.target.checked)} className="w-4 h-4" />
                  <label htmlFor={`prn_${i}`} className="text-sm text-gray-700">PRN medication</label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: Lab Results */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0 flex items-center gap-2"><TestTube className="w-5 h-5 text-emerald-500" /> Lab Results</h2>
            <button onClick={addLabPanel} className="btn btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Lab Panel</button>
          </div>
          {labResults.length === 0 && (
            <div className="ehr-card p-8 text-center text-gray-400">No labs yet. Click "Add Lab Panel" to add one.</div>
          )}
          {labResults.map((lr, i) => (
            <div key={i} className="ehr-card">
              <div className="ehr-card-header">
                <span className="font-medium text-sm">Lab Panel {i+1}</span>
                <button onClick={() => removeLab(i)} className="btn btn-secondary btn-sm text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="ehr-card-body space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Panel Name</label>
                    <select className="form-select" value={lr.panel_name} onChange={e => updateLab(i, 'panel_name', e.target.value)}>
                      <option value="">Select or type...</option>
                      {LAB_PANELS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Collected At</label><input className="form-input" type="datetime-local" value={lr.collected_at?.substring(0,16)} onChange={e => updateLab(i, 'collected_at', e.target.value)} /></div>
                  <div><label className="form-label">Resulted At</label><input className="form-input" type="datetime-local" value={lr.resulted_at?.substring(0,16)} onChange={e => updateLab(i, 'resulted_at', e.target.value)} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0 text-xs font-semibold text-gray-600">Components</label>
                    <button onClick={() => addComponent(i)} className="btn btn-secondary btn-sm text-xs"><Plus className="w-3 h-3" /> Add Row</button>
                  </div>
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50">
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Value</th>
                      <th className="px-2 py-1 text-left">Unit</th>
                      <th className="px-2 py-1 text-left">Ref Low</th>
                      <th className="px-2 py-1 text-left">Ref High</th>
                      <th className="px-2 py-1 text-left">Flag</th>
                      <th className="px-2 py-1 text-left">Critical</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {lr.components.map((comp: any, j: number) => (
                        <tr key={j}>
                          <td className="px-1 py-1"><input className="form-input text-xs py-1" placeholder="WBC" value={comp.name} onChange={e => updateComponent(i, j, 'name', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="form-input text-xs py-1 font-mono" placeholder="4.8" value={comp.value} onChange={e => updateComponent(i, j, 'value', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="form-input text-xs py-1" placeholder="K/uL" value={comp.unit} onChange={e => updateComponent(i, j, 'unit', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="form-input text-xs py-1" placeholder="4.0" value={comp.reference_low} onChange={e => updateComponent(i, j, 'reference_low', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="form-input text-xs py-1" placeholder="11.0" value={comp.reference_high} onChange={e => updateComponent(i, j, 'reference_high', e.target.value)} /></td>
                          <td className="px-1 py-1">
                            <select className="form-select text-xs py-1" value={comp.flag} onChange={e => updateComponent(i, j, 'flag', e.target.value)}>
                              <option value="">—</option>
                              <option value="H">H</option>
                              <option value="L">L</option>
                              <option value="HH">HH</option>
                              <option value="LL">LL</option>
                              <option value="A">A</option>
                            </select>
                          </td>
                          <td className="px-2 py-1 text-center">
                            <input type="checkbox" checked={comp.is_critical} onChange={e => updateComponent(i, j, 'is_critical', e.target.checked)} />
                          </td>
                          <td className="px-1">
                            <button onClick={() => setLabResults(l => l.map((lr2, li) => li === i ? {...lr2, components: lr2.components.filter((_: any, ci: number) => ci !== j)} : lr2))} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 4: Orders */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-emerald-500" /> Orders</h2>
            <button onClick={addOrder} className="btn btn-primary btn-sm"><Plus className="w-4 h-4" /> Add Order</button>
          </div>
          {orders.length === 0 && (
            <div className="ehr-card p-8 text-center text-gray-400">No orders yet. Click "Add Order" to add one.</div>
          )}
          {orders.map((ord, i) => (
            <div key={i} className="ehr-card">
              <div className="ehr-card-header">
                <span className="font-medium text-sm">Order {i+1}</span>
                <button onClick={() => removeOrder(i)} className="btn btn-secondary btn-sm text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="ehr-card-body grid grid-cols-2 gap-3">
                <div><label className="form-label">Order Type</label><select className="form-select" value={ord.order_type} onChange={e => updateOrder(i, 'order_type', e.target.value)}>{ORDER_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="form-label">Priority</label><select className="form-select" value={ord.priority} onChange={e => updateOrder(i, 'priority', e.target.value)}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
                <div className="col-span-2"><label className="form-label">Description *</label><input className="form-input" placeholder="Order name" value={ord.description} onChange={e => updateOrder(i, 'description', e.target.value)} /></div>
                <div className="col-span-2"><label className="form-label">Details</label><textarea className="form-textarea" rows={2} placeholder="Specific instructions..." value={ord.details} onChange={e => updateOrder(i, 'details', e.target.value)} /></div>
                <div><label className="form-label">Ordered By</label><input className="form-input" placeholder="Dr. Name" value={ord.ordered_by} onChange={e => updateOrder(i, 'ordered_by', e.target.value)} /></div>
                <div><label className="form-label">Frequency</label><input className="form-input" placeholder="Q4H, Once, Continuous..." value={ord.frequency} onChange={e => updateOrder(i, 'frequency', e.target.value)} /></div>
                <div className="col-span-2"><label className="form-label">Special Instructions</label><input className="form-input" value={ord.special_instructions} onChange={e => updateOrder(i, 'special_instructions', e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 5: Review */}
      {step === 5 && (
        <div className="ehr-card">
          <div className="ehr-card-header"><span className="font-semibold">Review & Save</span></div>
          <div className="ehr-card-body space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Title:</span> <span className="font-medium">{info.title}</span></div>
              <div><span className="text-gray-500">Category:</span> <span className="font-medium capitalize">{info.category}</span></div>
              <div><span className="text-gray-500">Difficulty:</span> <span className="font-medium capitalize">{info.difficulty}</span></div>
              <div><span className="text-gray-500">Duration:</span> <span className="font-medium">{info.estimated_duration_minutes} min</span></div>
              <div><span className="text-gray-500">Patient:</span> <span className="font-medium">{patient.last_name}, {patient.first_name}</span></div>
              <div><span className="text-gray-500">Diagnosis:</span> <span className="font-medium">{patient.admitting_diagnosis}</span></div>
              <div><span className="text-gray-500">Medications:</span> <span className="font-medium">{medications.filter(m => m.generic_name).length}</span></div>
              <div><span className="text-gray-500">Lab Panels:</span> <span className="font-medium">{labResults.filter(l => l.panel_name).length}</span></div>
              <div><span className="text-gray-500">Orders:</span> <span className="font-medium">{orders.filter(o => o.description).length}</span></div>
              <div><span className="text-gray-500">Objectives:</span> <span className="font-medium">{info.learning_objectives.filter(Boolean).length}</span></div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => handleSave(true)} disabled={saving} className="btn btn-primary btn-lg">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isEditing ? 'Update & Publish' : 'Save & Publish'}
              </button>
              <button onClick={() => handleSave(false)} disabled={saving} className="btn btn-secondary btn-lg">
                {isEditing ? 'Update Draft' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="btn btn-secondary">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {step < STEPS.length - 1 && (
          <button onClick={() => setStep(s => s + 1)} className="btn btn-primary">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
