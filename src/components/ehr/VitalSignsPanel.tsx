'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  interpretSystolicBP, interpretHeartRate, interpretSpO2,
  interpretTemperature, interpretRR, formatDateTime, celsiusToFahrenheit, cn
} from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import toast from 'react-hot-toast'
import { Plus, TrendingUp, TableIcon, Loader2 } from 'lucide-react'

interface VitalEntryForm {
  systolic_bp: string
  diastolic_bp: string
  heart_rate: string
  respiratory_rate: string
  temperature_c: string
  spo2: string
  pain_scale: string
  blood_glucose: string
  notes: string
}

export default function VitalSignsPanel({ sessionId, patientVerified }: { sessionId: string, patientVerified: boolean }) {
  const supabase = createClient()
  const [vitals, setVitals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [form, setForm] = useState<VitalEntryForm>({
    systolic_bp: '', diastolic_bp: '', heart_rate: '', respiratory_rate: '',
    temperature_c: '', spo2: '', pain_scale: '', blood_glucose: '', notes: ''
  })

  useEffect(() => { loadVitals() }, [sessionId])

  async function loadVitals() {
    const { data } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: true })
    setVitals(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = { session_id: sessionId, recorded_by: user!.id }

    if (form.systolic_bp) payload.systolic_bp = parseInt(form.systolic_bp)
    if (form.diastolic_bp) payload.diastolic_bp = parseInt(form.diastolic_bp)
    if (form.heart_rate) payload.heart_rate = parseInt(form.heart_rate)
    if (form.respiratory_rate) payload.respiratory_rate = parseInt(form.respiratory_rate)
    if (form.temperature_c) payload.temperature_c = parseFloat(form.temperature_c)
    if (form.spo2) payload.spo2 = parseInt(form.spo2)
    if (form.pain_scale) payload.pain_scale = parseInt(form.pain_scale)
    if (form.blood_glucose) payload.blood_glucose = parseInt(form.blood_glucose)
    if (form.notes) payload.notes = form.notes

    const { error } = await supabase.from('vital_signs').insert(payload)

    if (error) {
      toast.error('Failed to save vitals: ' + error.message)
    } else {
      toast.success('Vital signs recorded')
      setShowForm(false)
      setForm({ systolic_bp:'',diastolic_bp:'',heart_rate:'',respiratory_rate:'',temperature_c:'',spo2:'',pain_scale:'',blood_glucose:'',notes:'' })
      loadVitals()

      // Update session last_active
      await supabase.from('student_sessions').update({ last_active_at: new Date().toISOString() }).eq('id', sessionId)
    }
    setSaving(false)
  }

  const vitalCellClass = (status: string) => {
    if (status === 'critical') return 'vital-critical'
    if (status === 'warning') return 'vital-warning'
    return 'vital-normal'
  }

  const chartData = vitals.map(v => ({
    time: formatDateTime(v.recorded_at),
    'BP Sys': v.systolic_bp,
    'HR': v.heart_rate,
    'RR': v.respiratory_rate,
    'SpO2': v.spo2,
    'Temp (°F)': v.temperature_c ? celsiusToFahrenheit(v.temperature_c) : null,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Vital Signs Flowsheet</h2>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button onClick={() => setViewMode('table')}
              className={cn('btn btn-sm rounded-none', viewMode === 'table' ? 'btn-primary' : 'btn-secondary')}>
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('chart')}
              className={cn('btn btn-sm rounded-none', viewMode === 'chart' ? 'btn-primary' : 'btn-secondary')}>
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" /> Record Vitals
          </button>
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="ehr-card border-l-4 border-emerald-500">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm">Record New Vital Signs</span>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
          </div>
          <form onSubmit={handleSubmit} className="ehr-card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Systolic BP (mmHg)</label>
                <input className="form-input" type="number" placeholder="120" min="40" max="300"
                  value={form.systolic_bp} onChange={e => setForm(f => ({...f, systolic_bp: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Diastolic BP (mmHg)</label>
                <input className="form-input" type="number" placeholder="80" min="20" max="200"
                  value={form.diastolic_bp} onChange={e => setForm(f => ({...f, diastolic_bp: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Heart Rate (bpm)</label>
                <input className="form-input" type="number" placeholder="72" min="20" max="300"
                  value={form.heart_rate} onChange={e => setForm(f => ({...f, heart_rate: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Resp Rate (/min)</label>
                <input className="form-input" type="number" placeholder="16" min="0" max="60"
                  value={form.respiratory_rate} onChange={e => setForm(f => ({...f, respiratory_rate: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Temp (°C)</label>
                <input className="form-input" type="number" step="0.1" placeholder="37.0" min="30" max="45"
                  value={form.temperature_c} onChange={e => setForm(f => ({...f, temperature_c: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">SpO₂ (%)</label>
                <input className="form-input" type="number" placeholder="98" min="50" max="100"
                  value={form.spo2} onChange={e => setForm(f => ({...f, spo2: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Pain Scale (0-10)</label>
                <input className="form-input" type="number" placeholder="0" min="0" max="10"
                  value={form.pain_scale} onChange={e => setForm(f => ({...f, pain_scale: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Blood Glucose (mg/dL)</label>
                <input className="form-input" type="number" placeholder="—" min="0" max="800"
                  value={form.blood_glucose} onChange={e => setForm(f => ({...f, blood_glucose: e.target.value}))} />
              </div>
            </div>
            <div className="mt-3">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" placeholder="Observations, context..."
                value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Vital Signs'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>}

      {/* Chart view */}
      {!loading && viewMode === 'chart' && vitals.length > 0 && (
        <div className="ehr-card p-4">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="BP Sys" stroke="#ef4444" strokeWidth={2} dot={true} />
              <Line type="monotone" dataKey="HR" stroke="#f97316" strokeWidth={2} dot={true} />
              <Line type="monotone" dataKey="SpO2" stroke="#3b82f6" strokeWidth={2} dot={true} />
              <Line type="monotone" dataKey="RR" stroke="#8b5cf6" strokeWidth={2} dot={true} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table view */}
      {!loading && viewMode === 'table' && (
        <div className="ehr-card overflow-x-auto">
          <table className="ehr-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>BP</th>
                <th>HR</th>
                <th>RR</th>
                <th>Temp</th>
                <th>SpO₂</th>
                <th>Pain</th>
                <th>Glucose</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {vitals.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray-400 py-8">No vitals recorded yet</td></tr>
              )}
              {vitals.map(v => {
                const bpStatus = v.systolic_bp ? interpretSystolicBP(v.systolic_bp).status : 'normal'
                const hrStatus = v.heart_rate ? interpretHeartRate(v.heart_rate).status : 'normal'
                const rr = v.respiratory_rate ? interpretRR(v.respiratory_rate).status : 'normal'
                const spo2 = v.spo2 ? interpretSpO2(v.spo2).status : 'normal'
                const temp = v.temperature_c ? interpretTemperature(v.temperature_c).status : 'normal'
                return (
                  <tr key={v.id}>
                    <td className="whitespace-nowrap text-xs text-gray-500">{formatDateTime(v.recorded_at)}</td>
                    <td className={cn('font-mono', vitalCellClass(bpStatus))}>
                      {v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—'}
                    </td>
                    <td className={cn('font-mono', vitalCellClass(hrStatus))}>{v.heart_rate ?? '—'}</td>
                    <td className={cn('font-mono', vitalCellClass(rr))}>{v.respiratory_rate ?? '—'}</td>
                    <td className={cn('font-mono', vitalCellClass(temp))}>
                      {v.temperature_c ? `${v.temperature_c}°C (${celsiusToFahrenheit(v.temperature_c)}°F)` : '—'}
                    </td>
                    <td className={cn('font-mono', vitalCellClass(spo2))}>{v.spo2 ? `${v.spo2}%` : '—'}</td>
                    <td className="font-mono">{v.pain_scale ?? '—'}/10</td>
                    <td className="font-mono">{v.blood_glucose ?? '—'}</td>
                    <td className="text-xs text-gray-500 max-w-[150px] truncate">{v.notes ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
