import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PatientBanner from '@/components/ehr/PatientBanner'
import Link from 'next/link'
import { formatDateTime, getLabFlagColor } from '@/lib/utils'
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react'

export default async function FacultyReviewDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: session } = await supabase
    .from('student_sessions')
    .select(`*, student:profiles(first_name, last_name, email),
      course_simulation:course_simulations(encounter_number, course:courses(course_code, title),
        scenario:simulation_scenarios(*, patient:patients(*), medications(*), orders(*), lab_results(*, lab_components(*))))`)
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  const [vitals, marEntries, notes, studentOrders] = await Promise.all([
    supabase.from('vital_signs').select('*').eq('session_id', sessionId).order('recorded_at'),
    supabase.from('mar_entries').select('*, medication:medications(*)').eq('session_id', sessionId).order('administered_at', { ascending: false }),
    supabase.from('progress_notes').select('*, author:profiles(first_name, last_name)').eq('session_id', sessionId).order('written_at', { ascending: false }),
    supabase.from('student_orders').select('*, order:orders(*)').eq('session_id', sessionId),
  ])

  const cs = session.course_simulation
  const scenario = cs?.scenario
  const patient = scenario?.patient

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/faculty/review" className="btn btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="page-title">{session.student?.last_name}, {session.student?.first_name} — Chart Review</h1>
            <p className="text-gray-500 text-sm">{cs?.course?.course_code} · {scenario?.title}</p>
          </div>
          <span className={`badge ml-auto ${session.status === 'in_progress' ? 'badge-amber' : session.status === 'completed' ? 'badge-green' : 'badge-gray'}`}>
            {session.status?.replace('_', ' ')}
          </span>
        </div>

        {patient && <PatientBanner patient={patient} encounterNumber={cs?.encounter_number} />}

        <div className="grid grid-cols-3 gap-4">
          <div className="ehr-card p-4 text-center"><div className="text-lg font-bold text-emerald-600">{vitals.data?.length ?? 0}</div><div className="text-xs text-gray-500">Vital entries</div></div>
          <div className="ehr-card p-4 text-center"><div className="text-lg font-bold text-emerald-600">{marEntries.data?.length ?? 0}</div><div className="text-xs text-gray-500">MAR entries</div></div>
          <div className="ehr-card p-4 text-center"><div className="text-lg font-bold text-purple-600">{notes.data?.length ?? 0}</div><div className="text-xs text-gray-500">Progress notes</div></div>
        </div>

        <div className="ehr-card">
          <div className="ehr-card-header"><span className="font-semibold">Vital Signs</span></div>
          <div className="overflow-x-auto">
            <table className="ehr-table">
              <thead><tr><th>Time</th><th>BP</th><th>HR</th><th>RR</th><th>Temp °C</th><th>SpO₂</th><th>Pain</th><th>Notes</th></tr></thead>
              <tbody>
                {!vitals.data?.length && <tr><td colSpan={8} className="text-center text-gray-400 py-4">No vitals recorded</td></tr>}
                {vitals.data?.map((v: any) => (
                  <tr key={v.id}>
                    <td className="text-xs text-gray-500">{formatDateTime(v.recorded_at)}</td>
                    <td className="font-mono">{v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—'}</td>
                    <td className="font-mono">{v.heart_rate ?? '—'}</td>
                    <td className="font-mono">{v.respiratory_rate ?? '—'}</td>
                    <td className="font-mono">{v.temperature_c ?? '—'}</td>
                    <td className="font-mono">{v.spo2 ? `${v.spo2}%` : '—'}</td>
                    <td className="font-mono">{v.pain_scale ?? '—'}/10</td>
                    <td className="text-xs text-gray-500 max-w-[120px] truncate">{v.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>div className="flex
          </div>
        </div>

        <div className="ehr-card">
          <div className="ehr-card-header"><span className="font-semibold">Medication Administration</span></div>
          <div className="overflow-x-auto">
            <table className="ehr-table">
              <thead><tr><th>Time</th><th>Medication</th><th>Dose/Route</th><th>Status</th><th>Scan Verified</th><th>Notes</th></tr></thead>
              <tbody>
                {!marEntries.data?.length && <tr><td colSpan={6} className="text-center text-gray-400 py-4">No MAR entries</td></tr>}
                {marEntries.data?.map((e: any) => (
                  <tr key={e.id}>
                    <td className="text-xs text-gray-500">{formatDateTime(e.administered_at)}</td>
                    <td className="font-medium">{e.medication?.generic_name}</td>
                    <td className="font-mono text-sm">{e.dose_given} {e.route_used}</td>
                    <td><span className={`badge text-xs ${e.status === 'given' ? 'badge-green' : e.status === 'held' ? 'badge-amber' : 'badge-gray'}`}>{e.status}</span></td>
                    <td>{e.patient_scanned && e.medication_scanned ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                    <td className="text-xs text-gray-500">{e.notes ?? e.hold_reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ehr-card">
          <div className="ehr-card-header"><span className="font-semibold">Progress Notes</span></div>
          <div className="divide-y divide-gray-100">
            {!notes.data?.length && <div className="p-6 text-center text-gray-400 text-sm">No notes written</div>}
            {notes.data?.map((note: any) => (
              <div key={note.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm">{note.title}</span>
                    <span className="badge badge-gray text-xs ml-2">{note.note_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {note.is_signed ? <span className="badge badge-green text-xs"><CheckCircle className="w-3 h-3 mr-1" />Signed</span> : <span className="badge badge-amber text-xs">Draft</span>}
                    <span className="text-xs text-gray-400">{formatDateTime(note.written_at)}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  {Object.entries(note.content as Record<string, string>).map(([k, v]) => v && (
                    <div key={k}><strong className="capitalize">{k}:</strong> {v}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ehr-card">
          <div className="ehr-card-header"><span className="font-semibold">Order Completion</span></div>
          <div className="overflow-x-auto">
            <table className="ehr-table">
              <thead><tr><th>Order</th><th>Type</th><th>Priority</th><th>Status</th><th>Completed</th><th>Notes</th></tr></thead>
              <tbody>
                {!studentOrders.data?.length && <tr><td colSpan={6} className="text-center text-gray-400 py-4">No orders</td></tr>}
                {studentOrders.data?.map((so: any) => (
                  <tr key={so.id}>
                    <td className="font-medium text-sm">{so.order?.description}</td>
                    <td className="text-xs text-gray-500 capitalize">{so.order?.order_type}</td>
                    <td><span className={`badge text-xs ${so.order?.priority === 'stat' ? 'badge-red' : so.order?.priority === 'urgent' ? 'badge-amber' : 'badge-gray'}`}>{so.order?.priority}</span></td>
                    <td><span className={`badge text-xs ${so.status === 'completed' ? 'badge-green' : so.status === 'in_progress' ? 'badge-blue' : 'badge-gray'}`}>{so.status}</span></td>
                    <td className="text-xs text-gray-500">{so.completed_at ? formatDateTime(so.completed_at) : '—'}</td>
                    <td className="text-xs text-gray-500 max-w-[150px] truncate">{so.completion_notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
