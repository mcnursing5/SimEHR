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
import { Loader2 } from 'lucide-react'

type ChartTab = 'info' | 'vitals' | 'mar' | 'orders' | 'labs' | 'notes'

export default function ChartView({
  courseSimId,
  studentId,
}: {
  courseSimId: string
  studentId: string
}) {
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
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [courseSimId])

  async function loadData() {
    setLoading(true)

    const { data: cs, error } = await supabase
      .from('course_simulations')
      .select(`
        *,
        scenario:simulation_scenarios(
          *,
          patient:patients(*),
          medications(*),
          lab_results(*, lab_components(*)),
          orders(*)
        ),
        course:courses(course_code, title)
      `)
      .eq('id', courseSimId)
      .single()

    if (error || !cs) {
      toast.error('Simulation not found')
      router.push('/dashboard')
      return
    }

    setCourseSim(cs)
    setScenario(cs.scenario)
    setPatient(cs.scenario?.patient)

    let { data: existing } = await supabase
      .from('student_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_simulation_id', courseSimId)
      .single()

    if (!existing) {
      const { data: newS } = await supabase
        .from('student_sessions')
        .insert({
          student_id: studentId,
          course_simulation_id: courseSimId,
          status: 'in_progress',
        })
        .select()
        .single()

      existing = newS
    } else if (existing.status === 'not_started') {
      await supabase
        .from('student_sessions')
        .update({ status: 'in_progress' })
        .eq('id', existing.id)
    }

    setSession(existing)
    setLoading(false)
  }

  function handlePatientScan(value: string) {
    if (!patient) return

    const matchMRN = value === patient.mrn
    let matchQR = false

    try {
      matchQR = JSON.parse(value).mrn === patient.mrn
    } catch {}

    if (matchMRN || matchQR) {
      setPatientVerified(true)
      setShowScanner(false)
      toast.success('Patient verified')
    } else {
      toast.error(`Scan mismatch. Expected MRN: ${patient.mrn}`)
    }
  }

  async function handleSubmit() {
    if (!session) return

    setSubmitting(true)

    const { error } = await supabase
      .from('student_sessions')
      .update({
        status: 'submitted',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (error) {
      toast.error('Failed to submit. Please try again.')
      setSubmitting(false)
      return
    }

    toast.success('Simulation submitted successfully!')
    setShowSubmitModal(false)
    router.push('/dashboard')
  }

  const isCompleted =
    session?.status === 'submitted' ||
    session?.status === 'completed'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const tabs: { id: ChartTab; label: string }[] = [
    { id: 'info', label: 'Patient Info' },
    { id: 'vitals', label: 'Vital Signs' },
    { id: 'mar', label: 'MAR' },
    { id: 'orders', label: 'Orders' },
    { id: 'labs', label: 'Labs' },
    { id: 'notes', label: 'Notes' },
  ]

  return (
    <div className="flex flex-col h-full -m-6">
      <PatientBanner
        patient={patient}
        encounterNumber={courseSim?.encounter_number}
      />

      {!patientVerified && !isCompleted && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
          <div className="text-amber-700 text-sm">
            <span className="font-medium">
              Scan patient wristband to verify identity before charting
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowScanner(true)}
              className="btn btn-primary btn-sm"
            >
              Scan Wristband
            </button>

            <button
              onClick={() => {
                setPatientVerified(true)
                toast('Proceeding without scan')
              }}
              className="btn btn-secondary btn-sm text-amber-700"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {patientVerified && !isCompleted && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center justify-between">
          <div className="text-emerald-700 text-sm">
            Patient identity verified
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn btn-sm btn-primary"
          >
            Submit Simulation
          </button>
        </div>
      )}

      {!patientVerified && !isCompleted && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex justify-end">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn btn-sm btn-primary"
          >
            Submit Simulation
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="bg-emerald-600 px-4 py-2 flex items-center justify-between">
          <div className="text-white text-sm">
            <span className="font-medium">
              Simulation submitted — read only
            </span>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-sm bg-white text-emerald-700 hover:bg-emerald-50"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      <div className="ehr-tabs bg-white border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'ehr-tab',
              activeTab === tab.id &&
                'ehr-tab-active text-emerald-600 border-emerald-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'info' && (
          <PatientInfoPanel patient={patient} />
        )}

        {activeTab === 'vitals' && session && (
          <VitalSignsPanel
            sessionId={session.id}
            patientVerified={patientVerified}
          />
        )}

        {activeTab === 'mar' && session && (
          <MARPanel
            sessionId={session.id}
            medications={scenario?.medications ?? []}
            patientVerified={patientVerified}
            patientMRN={patient?.mrn}
            patientName={
              patient
                ? `${patient.last_name}, ${patient.first_name}`
                : ''
            }
          />
        )}

        {activeTab === 'orders' && session && (
          <OrdersPanel
            sessionId={session.id}
            orders={scenario?.orders ?? []}
          />
        )}

        {activeTab === 'labs' && (
          <LabResultsPanel
            labResults={scenario?.lab_results ?? []}
          />
        )}

        {activeTab === 'notes' && session && (
          <ProgressNotesPanel sessionId={session.id} />
        )}
      </div>

      {showScanner && (
        <BarcodeScanner
          title="Scan Patient Wristband"
          instruction="Point at wristband QR or barcode, or use USB scanner"
          onScan={handlePatientScan}
          onClose={() => setShowScanner(false)}
          expectedValue={patient?.mrn}
        />
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-emerald-600 px-5 py-4 flex items-center justify-between">
              <span className="font-semibold text-white">
                Submit Simulation
              </span>

              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="text-emerald-200 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 text-sm">
                Are you sure you want to submit this simulation?
                Once submitted:
              </p>

              <ul className="text-sm text-gray-600 space-y-1.5">
                <li>
                  • You will not be able to make further changes
                </li>
                <li>
                  • Your chart will be available for faculty
                  review
                </li>
                <li>
                  • You will be returned to the dashboard
                </li>
              </ul>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                Make sure you have documented all vitals,
                medications, and notes before submitting.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn btn-primary flex-1 justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Yes, Submit'
                  )}
                </button>

                <button
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                  className="btn btn-secondary flex-1 justify-center"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}