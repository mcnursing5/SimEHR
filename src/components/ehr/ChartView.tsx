'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import PatientBanner from '@/components/ehr/PatientBanner'
import VitalSignsPanel from '@/components/ehr/VitalSignsPanel'
import MARPanel from '@/components/ehr/MARPanel'
import ProgressNotesPanel from '@/components/ehr/ProgressNotesPanel'
import OrdersPanel from '@/components/ehr/OrdersPanel'
import LabResultsPanel from '@/components/ehr/LabResultsPanel'
import PatientInfoPanel from '@/components/ehr/PatientInfoPanel'
import BarcodeScanner from '@/components/scanning/BarcodeScanner'
import toast from 'react-hot-toast'
import { Activity, Pill, FileText, ClipboardList, TestTube, User, Scan, CheckCircle, Loader2 } from 'lucide-react'

type ChartTab = 'info' | 'vitals' | 'mar' | 'orders' | 'labs' | 'notes'

export default function ChartView({ courseSimId, studentId }: { courseSimId: string; studentId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ChartTab>('info')
  const [session, setSession] = useState<any>(null)
  const [scenario, setScenario] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [courseSim, setCourseSim] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [patientVerified, setPatientVerified] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => { loadData() }, [courseSimId])

  async function loadData() {
    setLoading(true)
    const { data: cs, error } = await supabase
      .from('course_simulations')
      .select(`*, scenario:simulation_scenarios(*, patient:patients(*), medications(*), lab_results(*, lab_components(*)), orders(*)), course:courses(course_code, title)`)
      .eq('id', courseSimId).single()
    if (error || !cs) { toast.error('Simulation not found'); router.push('/dashboard'); return }
    setCourseSim(cs); setScenario(cs.scenario); setPatient(cs.scenario?.patient)
    let { data: existing } = await supabase.from('student_sessions').select('*').eq('student_id', studentId).eq('course_simulation_id', courseSimId).single()
    if (!existing) {
      const { data: newS } = await supabase.from('student_sessions').insert({ student_id: studentId, course_simulation_id: courseSimId, status: 'in_progress' }).select().single()
      existing = newS
    } else if (existing.status === 'not_started') {
      await supabase.from('student_sessions').update({ status: 'in_progress' }).eq('id', existing.id)
    }
    setSession(existing); setLoading(false)
  }

  function handlePatientScan(value: string) {
    if (!patient) return
    const matchMRN = value === patient.mrn
    let matchQR = false
    try { matchQR = JSON.parse(value).mrn === patient.mrn } catch {}
    if (matchMRN || matchQR) { setPatientVerified(true); setShowScanner(false); toast.success('✓ Patient verified') }
    else toast.error(`Scan mismatch. Expected MRN: ${patient.mrn}`)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>

  const tabs: { id: ChartTab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Patient Info', icon: User },
    { id: 'vitals', label: 'Vital Signs', icon: Activity },
    { id: 'mar', label: 'MAR', icon: Pill },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'labs', label: 'Labs', icon: TestTube },
    { id: 'notes', label: 'Notes', icon: FileText },
  ]

  return (
    <div className="flex flex-col h-full -m-6">
      <PatientBanner patient={patient} encounterNumber={courseSim?.encounter_number} />
      {!patientVerified && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 text-sm"><Scan className="w-4 h-4" /><span className="font-medium">Scan patient wristband to verify identity before charting</span></div>
          <div className="flex gap-2">
            <button onClick={() => setShowScanner(true)} className="btn btn-primary btn-sm"><Scan className="w-3 h-3" />Scan Wristband</button>
            <button onClick={() => { setPatientVerified(true); toast('⚠ Proceeding without scan', { icon: '⚠️' }) }} className="btn btn-secondary btn-sm text-amber-700">Skip</button>
          </div>
        </div>
      )}
      {patientVerified && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center gap-2 text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4" /><span>Patient identity verified</span>
        </div>
      )}
      <div className="ehr-tabs bg-white border-b border-gray-200">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('ehr-tab flex items-center gap-1.5', activeTab === tab.id && 'ehr-tab-active text-emerald-600 border-emerald-600')}>
              <Icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'info' && <PatientInfoPanel patient={patient} />}
        {activeTab === 'vitals' && session && <VitalSignsPanel sessionId={session.id} patientVerified={patientVerified} />}
        {activeTab === 'mar' && session && (
          <MARPanel sessionId={session.id} medications={scenario?.medications ?? []} patientVerified={patientVerified}
            patientMRN={patient?.mrn} patientName={patient ? `${patient.last_name}, ${patient.first_name}` : ''} />
        )}
        {activeTab === 'orders' && session && <OrdersPanel sessionId={session.id} orders={scenario?.orders ?? []} />}
        {activeTab === 'labs' && <LabResultsPanel labResults={scenario?.lab_results ?? []} />}
        {activeTab === 'notes' && session && <ProgressNotesPanel sessionId={session.id} />}
      </div>
      {showScanner && <BarcodeScanner title="Scan Patient Wristband" instruction="Point at wristband QR or barcode, or use USB scanner" onScan={handlePatientScan} onClose={() => setShowScanner(false)} expectedValue={patient?.mrn} />}
    </div>
  )
}
