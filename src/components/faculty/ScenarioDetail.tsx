'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { getCategoryColor, getDifficultyColor, formatDate, getLabFlagColor } from '@/lib/utils'
import LabelGenerator from '@/components/labels/LabelGenerator'
import {
  ChevronLeft, Edit2, CheckCircle, Archive, Clock, BookOpen,
  Pill, TestTube, ClipboardList, User, Tag, Target, Printer, X, AlertTriangle
} from 'lucide-react'

export default function ScenarioDetail({ scenario, assignments, userId, userRole }: {
  scenario: any, assignments: any[], userId: string, userRole: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [isPublished, setIsPublished] = useState(scenario.is_published)
  const [showLabelGen, setShowLabelGen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview'|'patient'|'meds'|'labs'|'orders'|'assignments'>('overview')
  const [toggling, setToggling] = useState(false)

  const canEdit = scenario.created_by === userId || userRole === 'admin'

  async function togglePublish() {
    setToggling(true)
    const { error } = await supabase
      .from('simulation_scenarios')
      .update({ is_published: !isPublished })
      .eq('id', scenario.id)
    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      setIsPublished((p: boolean) => !p)
      toast.success(!isPublished ? 'Scenario published — visible in repository' : 'Scenario unpublished')
    }
    setToggling(false)
  }

  async function archiveScenario() {
    if (!confirm('Archive this scenario? It will be hidden from the repository.')) return
    const { error } = await supabase.from('simulation_scenarios').update({ is_archived: true }).eq('id', scenario.id)
    if (!error) { toast.success('Archived'); router.push('/faculty/repository') }
  }

  const tabs = [
    { id: 'overview',     label: 'Overview' },
    { id: 'patient',      label: 'Patient' },
    { id: 'meds',         label: `Medications (${scenario.medications?.length ?? 0})` },
    { id: 'labs',         label: `Labs (${scenario.lab_results?.length ?? 0})` },
    { id: 'orders',       label: `Orders (${scenario.orders?.length ?? 0})` },
    { id: 'assignments',  label: `Assignments (${assignments.length})` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/faculty/repository" className="text-sm text-emerald-600 hover:underline flex items-center gap-1 mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Repository
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title">{scenario.title}</h1>
              <span className={`badge ${isPublished ? 'badge-green' : 'badge-amber'}`}>{isPublished ? 'Published' : 'Draft'}</span>
              <span className={`badge text-xs ${getCategoryColor(scenario.category)}`}>{scenario.category}</span>
              <span className={`badge text-xs ${getDifficultyColor(scenario.difficulty)}`}>{scenario.difficulty}</span>
            </div>
            <p className="text-gray-500 text-sm mt-2 max-w-2xl">{scenario.description}</p>
            <p className="text-gray-400 text-xs mt-1">
              By {scenario.creator?.first_name} {scenario.creator?.last_name} · <Clock className="w-3 h-3 inline mx-1" />{scenario.estimated_duration_minutes} min
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {scenario.patient && (
              <button onClick={() => setShowLabelGen(true)} className="btn btn-secondary">
                <Printer className="w-4 h-4" /> Print Labels
              </button>
            )}
            {canEdit && (
              <>
                <button onClick={togglePublish} disabled={toggling}
                  className={`btn ${isPublished ? 'btn-secondary' : 'btn-success'}`}>
                  <CheckCircle className="w-4 h-4" />
                  {toggling ? 'Saving...' : isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <Link href={`/faculty/scenarios/${scenario.id}/edit`} className="btn btn-primary">
                  <Edit2 className="w-4 h-4" /> Edit
                </Link>
                <button onClick={archiveScenario} className="btn btn-secondary text-red-500">
                  <Archive className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ehr-tabs">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`ehr-tab ${activeTab === tab.id ? 'ehr-tab-active text-emerald-600 border-emerald-600' : ''}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ehr-card">
            <div className="ehr-card-header"><span className="font-semibold text-sm flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" /> Learning Objectives</span></div>
            <div className="ehr-card-body">
              {(!scenario.learning_objectives?.length) && <p className="text-gray-400 text-sm">No objectives defined</p>}
              <ol className="list-decimal list-inside space-y-2">
                {scenario.learning_objectives?.map((obj: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700">{obj}</li>
                ))}
              </ol>
            </div>
          </div>
          <div className="ehr-card">
            <div className="ehr-card-header"><span className="font-semibold text-sm flex items-center gap-2"><Tag className="w-4 h-4 text-emerald-500" /> Details</span></div>
            <div className="ehr-card-body space-y-3">
              <div className="flex flex-wrap gap-2">
                {scenario.tags?.map((tag: string) => <span key={tag} className="badge badge-blue text-xs">{tag}</span>)}
              </div>
              <div className="text-sm space-y-1 text-gray-600">
                {[
                  ['Category', scenario.category],
                  ['Difficulty', scenario.difficulty],
                  ['Duration', `${scenario.estimated_duration_minutes} minutes`],
                  ['Medications', scenario.medications?.length ?? 0],
                  ['Lab Panels', scenario.lab_results?.length ?? 0],
                  ['Orders', scenario.orders?.length ?? 0],
                  ['Course Assignments', assignments.length],
                ].map(([k, v]) => <div key={k}><strong>{k}:</strong> {v}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PATIENT */}
      {activeTab === 'patient' && (
        <div className="ehr-card">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm flex items-center gap-2"><User className="w-4 h-4 text-emerald-500" /> Patient Details</span>
            {scenario.patient && (
              <button onClick={() => setShowLabelGen(true)} className="btn btn-secondary btn-sm">
                <Printer className="w-3.5 h-3.5" /> Print Labels
              </button>
            )}
          </div>
          {!scenario.patient
            ? <div className="ehr-card-body text-gray-400 text-sm">No patient defined</div>
            : (
              <div className="divide-y divide-gray-100">
                {[
                  ['MRN (Auto-generated)', scenario.patient.mrn],
                  ['Name', `${scenario.patient.last_name}, ${scenario.patient.first_name}`],
                  ['Date of Birth', formatDate(scenario.patient.date_of_birth)],
                  ['Sex', scenario.patient.sex],
                  ['Blood Type', scenario.patient.blood_type],
                  ['Weight', scenario.patient.weight_kg ? `${scenario.patient.weight_kg} kg` : '—'],
                  ['Height', scenario.patient.height_cm ? `${scenario.patient.height_cm} cm` : '—'],
                  ['Room / Bed', `${scenario.patient.room_number} / ${scenario.patient.bed_number}`],
                  ['Attending', scenario.patient.attending_provider],
                  ['Admitting Diagnosis', scenario.patient.admitting_diagnosis],
                  ['Code Status', scenario.patient.code_status],
                ].map(([label, value]) => (
                  <div key={label} className="flex px-4 py-2.5 gap-4">
                    <div className="w-44 text-xs font-medium text-gray-500 flex-shrink-0">{label}</div>
                    <div className="text-sm text-gray-900">{value || '—'}</div>
                  </div>
                ))}
                {scenario.patient.allergies?.length > 0 && (
                  <div className="px-4 py-3">
                    <div className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Allergies
                    </div>
                    {scenario.patient.allergies.map((a: any) => (
                      <div key={a.id} className="text-sm text-red-700 mb-1">
                        <strong>{a.substance}</strong> — {a.reaction} [{a.severity}]
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>
      )}

      {/* MEDICATIONS */}
      {activeTab === 'meds' && (
        <div className="ehr-card overflow-x-auto">
          <div className="ehr-card-header"><span className="font-semibold text-sm flex items-center gap-2"><Pill className="w-4 h-4 text-emerald-500" /> Medications</span></div>
          <table className="ehr-table">
            <thead><tr><th>Generic Name</th><th>Brand</th><th>Class</th><th>Dose / Route</th><th>Frequency</th><th>Indication</th><th>PRN</th><th>Barcode</th></tr></thead>
            <tbody>
              {!scenario.medications?.length && <tr><td colSpan={8} className="text-center text-gray-400 py-6">No medications</td></tr>}
              {scenario.medications?.map((med: any) => (
                <tr key={med.id}>
                  <td className="font-medium">{med.generic_name}</td>
                  <td className="text-gray-500 text-sm">{med.brand_name || '—'}</td>
                  <td className="text-gray-500 text-sm">{med.drug_class || '—'}</td>
                  <td className="font-mono text-sm">{med.dose} · {med.route}</td>
                  <td className="text-sm">{med.frequency}</td>
                  <td className="text-xs text-gray-500 max-w-[150px]">{med.indication}</td>
                  <td>{med.is_prn ? <span className="badge badge-amber text-xs">PRN</span> : '—'}</td>
                  <td className="font-mono text-xs text-gray-500">{med.barcode_value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LABS */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          {!scenario.lab_results?.length && <div className="ehr-card p-8 text-center text-gray-400">No lab results defined</div>}
          {scenario.lab_results?.map((lr: any) => (
            <div key={lr.id} className="ehr-card overflow-x-auto">
              <div className="ehr-card-header"><span className="font-semibold text-sm flex items-center gap-2"><TestTube className="w-4 h-4 text-emerald-500" />{lr.panel_name}</span></div>
              <table className="ehr-table">
                <thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th><th>Critical</th></tr></thead>
                <tbody>
                  {lr.lab_components?.map((comp: any) => (
                    <tr key={comp.id} className={comp.is_critical ? 'bg-red-50' : ''}>
                      <td className="font-medium text-sm">{comp.name}</td>
                      <td className={`font-mono font-semibold ${getLabFlagColor(comp.flag)}`}>{comp.value}</td>
                      <td className="text-gray-500 text-sm">{comp.unit || '—'}</td>
                      <td className="font-mono text-sm text-gray-500">{comp.reference_low && comp.reference_high ? `${comp.reference_low} – ${comp.reference_high}` : '—'}</td>
                      <td className={`font-bold text-sm ${getLabFlagColor(comp.flag)}`}>{comp.flag || '—'}</td>
                      <td>{comp.is_critical ? <span className="badge badge-red text-xs">Critical</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ORDERS */}
      {activeTab === 'orders' && (
        <div className="ehr-card overflow-x-auto">
          <div className="ehr-card-header"><span className="font-semibold text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-emerald-500" /> Orders</span></div>
          <table className="ehr-table">
            <thead><tr><th>Type</th><th>Description</th><th>Details</th><th>Priority</th><th>Ordered By</th><th>Frequency</th></tr></thead>
            <tbody>
              {!scenario.orders?.length && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No orders</td></tr>}
              {scenario.orders?.map((ord: any) => (
                <tr key={ord.id}>
                  <td><span className="badge badge-gray text-xs capitalize">{ord.order_type?.replace('_', ' ')}</span></td>
                  <td className="font-medium text-sm">{ord.description}</td>
                  <td className="text-xs text-gray-500 max-w-[200px]">{ord.details || '—'}</td>
                  <td><span className={`badge text-xs ${ord.priority === 'stat' ? 'badge-red' : ord.priority === 'urgent' ? 'badge-amber' : 'badge-gray'}`}>{ord.priority}</span></td>
                  <td className="text-sm text-gray-500">{ord.ordered_by}</td>
                  <td className="text-sm">{ord.frequency || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="ehr-card">
            <div className="ehr-card-header">
              <span className="font-semibold text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-emerald-500" /> Assigned to Courses</span>
            </div>
            {assignments.length === 0
              ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Not assigned to any course yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {assignments.map(a => (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-emerald-700">{a.course?.course_code}</span>
                        <span className="text-sm text-gray-700 ml-2">{a.course?.title}</span>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {a.course?.semester?.academic_year?.year_label} · {a.course?.semester?.name} · Enc: {a.encounter_number}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${a.is_active ? 'badge-green' : 'badge-gray'}`}>{a.is_active ? 'Active' : 'Inactive'}</span>
                        <Link href={`/faculty/courses/${a.course?.id}`} className="btn btn-secondary btn-sm">Go to Course</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-700">
            <strong>To assign to a course:</strong> My Courses → open course → Simulations tab → "Assign from Repository"
          </div>
        </div>
      )}

      {/* Label Modal */}
      {showLabelGen && scenario.patient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold">Print Labels — {scenario.title}</h3>
              <button onClick={() => setShowLabelGen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5">
              <LabelGenerator
                patient={scenario.patient}
                encounterNumber={assignments[0]?.encounter_number ?? `ENC-${scenario.patient.mrn}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
