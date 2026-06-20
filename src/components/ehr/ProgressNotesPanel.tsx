'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { FileText, Plus, CheckCircle, Loader2, ChevronDown, ChevronUp, Edit3, Lock } from 'lucide-react'

const NOTE_TYPES = [
  { value: 'SBAR',             label: 'SBAR Note',          color: 'bg-emerald-100 text-emerald-700' },
  { value: 'SOAP',             label: 'SOAP Note',          color: 'bg-purple-100 text-purple-700' },
  { value: 'shift_assessment', label: 'Shift Assessment',   color: 'bg-emerald-100 text-emerald-700' },
  { value: 'handoff',          label: 'Handoff / SBAR-R',   color: 'bg-amber-100 text-amber-700' },
  { value: 'event_note',       label: 'Event Note',         color: 'bg-red-100 text-red-700' },
  { value: 'procedure_note',   label: 'Procedure Note',     color: 'bg-gray-100 text-gray-700' },
]

const SBAR_FIELDS = [
  { key: 'situation',      label: 'S — Situation',      placeholder: "What is happening right now? Patient's current condition and chief complaint.", color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'background',     label: 'B — Background',     placeholder: 'Relevant history, diagnosis, current medications, recent lab results, trends.', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'assessment',     label: 'A — Assessment',     placeholder: "Your nursing assessment. What do you think is happening? Clinical impression.", color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'recommendation', label: 'R — Recommendation', placeholder: 'What action are you requesting? What do you need from the physician/team?', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
]

const SOAP_FIELDS = [
  { key: 'subjective',  label: 'S — Subjective', placeholder: "Patient's own words: chief complaint, symptoms, pain (location, quality, severity 0-10, timing).", color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { key: 'objective',   label: 'O — Objective',  placeholder: 'Measurable findings: vital signs, physical assessment findings, lab values, I&O, wound appearance.', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { key: 'assessment',  label: 'A — Assessment', placeholder: 'Nursing diagnosis and clinical impression based on S and O data.', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { key: 'plan',        label: 'P — Plan',        placeholder: 'Nursing interventions, patient education, referrals, follow-up, goals for this shift.', color: 'text-purple-700 bg-purple-50 border-purple-200' },
]

const SHIFT_FIELDS = [
  { key: 'neuro',        label: 'Neurological',    placeholder: 'LOC, orientation, GCS, pupils, motor/sensory...' },
  { key: 'cardio',       label: 'Cardiovascular',  placeholder: 'Heart sounds, rhythm, peripheral pulses, edema, capillary refill...' },
  { key: 'respiratory',  label: 'Respiratory',     placeholder: 'Breath sounds, respiratory effort, O2 therapy, SpO2...' },
  { key: 'gi_gu',        label: 'GI / GU',         placeholder: 'Bowel sounds, abdomen, last BM, urine output, characteristics...' },
  { key: 'skin',         label: 'Skin / Wound',    placeholder: 'Skin integrity, color, temperature, turgor, wounds, lines/drains...' },
  { key: 'pain',         label: 'Pain',            placeholder: 'Pain score, location, quality, interventions, response...' },
  { key: 'safety',       label: 'Safety / Falls',  placeholder: 'Fall risk score, bed alarm, call light, restraints, side rails...' },
  { key: 'plan',         label: 'Shift Plan',      placeholder: 'Priority nursing diagnoses, goals for shift, pending tasks...' },
]

export default function ProgressNotesPanel({ sessionId }: { sessionId: string }) {
  const supabase = createClient()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [noteType, setNoteType] = useState('SBAR')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<Record<string, string>>({})

  useEffect(() => { loadNotes() }, [sessionId])

  async function loadNotes() {
    const { data } = await supabase
      .from('progress_notes')
      .select('*, author:profiles(first_name, last_name)')
      .eq('session_id', sessionId)
      .order('written_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
    // Auto-select the most recent note
    if (data && data.length > 0 && !selectedNote) setSelectedNote(data[0])
  }

  async function handleSave(sign: boolean) {
    if (!title.trim()) { toast.error('Please enter a note title'); return }
    const hasContent = Object.values(content).some(v => v.trim())
    if (!hasContent) { toast.error('Please write something in the note'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    const { data: saved, error } = await supabase
      .from('progress_notes')
      .insert({
        session_id: sessionId,
        written_by: user!.id,
        note_type: noteType,
        title: title.trim(),
        content,
        is_signed: sign,
        signed_at: sign ? now : null,
        written_at: now,
      })
      .select('*, author:profiles(first_name, last_name)')
      .single()

    if (error) {
      toast.error('Failed: ' + error.message)
    } else {
      toast.success(sign ? '✅ Note signed and saved' : 'Draft saved')
      setNotes(n => [saved, ...n])
      setSelectedNote(saved)
      setShowForm(false)
      setTitle('')
      setContent({})
      setNoteType('SBAR')
      await supabase.from('student_sessions').update({ last_active_at: now }).eq('id', sessionId)
    }
    setSaving(false)
  }

  async function signNote(noteId: string) {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('progress_notes')
      .update({ is_signed: true, signed_at: now })
      .eq('id', noteId)
    if (!error) {
      toast.success('Note signed')
      setNotes(n => n.map(note => note.id === noteId ? { ...note, is_signed: true, signed_at: now } : note))
      setSelectedNote((n: any) => n?.id === noteId ? { ...n, is_signed: true, signed_at: now } : n)
    }
  }

  function getFields() {
    if (noteType === 'SBAR') return SBAR_FIELDS
    if (noteType === 'SOAP') return SOAP_FIELDS
    if (noteType === 'shift_assessment') return SHIFT_FIELDS
    return null
  }

  const noteTypeInfo = NOTE_TYPES.find(t => t.value === noteType)
  const fields = getFields()

  return (
    <div className="flex gap-0 -mx-6 -mb-6" style={{ height: 'calc(100vh - 220px)' }}>

      {/* LEFT SIDEBAR — Note list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-700">Progress Notes</span>
          <button
            onClick={() => { setShowForm(true); setSelectedNote(null) }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-400" /></div>}
          {!loading && notes.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No notes yet.<br />Click "+ New" to write your first note.
            </div>
          )}
          {notes.map(note => {
            const typeInfo = NOTE_TYPES.find(t => t.value === note.note_type)
            const isSelected = selectedNote?.id === note.id
            return (
              <button
                key={note.id}
                onClick={() => { setSelectedNote(note); setShowForm(false) }}
                className={`w-full text-left px-3 py-3 border-b border-gray-200 hover:bg-white transition-colors ${isSelected ? 'bg-white border-l-2 border-l-emerald-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{note.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {note.author?.first_name} {note.author?.last_name}
                    </div>
                    <div className="text-xs text-gray-400">{formatDateTime(note.written_at)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
                      {note.note_type}
                    </span>
                    {note.is_signed
                      ? <span className="text-xs text-emerald-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" />Signed</span>
                      : <span className="text-xs text-amber-500 flex items-center gap-0.5"><Edit3 className="w-3 h-3" />Draft</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANE — Note editor or viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* NEW NOTE FORM */}
        {showForm && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 border-b border-gray-200 bg-white flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-500" /> New Progress Note
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Note type + title row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Note Type</label>
                  <select className="form-select" value={noteType}
                    onChange={e => { setNoteType(e.target.value); setContent({}) }}>
                    {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Note Title</label>
                  <input className="form-input" placeholder="e.g. 0800 Nursing Assessment"
                    value={title} onChange={e => setTitle(e.target.value)} />
                </div>
              </div>

              {/* Structured fields */}
              {fields ? (
                <div className="space-y-3">
                  {fields.map(f => (
                    <div key={f.key}>
                      <label className={`block text-xs font-bold px-2 py-1 rounded-t border ${(f as any).color ?? 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                        {f.label}
                      </label>
                      <textarea
                        className="form-textarea rounded-t-none border-t-0 min-h-[80px]"
                        placeholder={f.placeholder}
                        value={content[f.key] ?? ''}
                        onChange={e => setContent(c => ({ ...c, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="form-label">{noteTypeInfo?.label ?? 'Note'} Content</label>
                  <textarea
                    className="form-textarea min-h-[300px]"
                    placeholder="Write your note here..."
                    value={content.body ?? ''}
                    onChange={e => setContent({ body: e.target.value })}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <button onClick={() => handleSave(true)} disabled={saving}
                  className="btn btn-primary flex-1 justify-center">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Sign & Save Note
                </button>
                <button onClick={() => handleSave(false)} disabled={saving}
                  className="btn btn-secondary">
                  Save Draft
                </button>
                <button onClick={() => { setShowForm(false); setTitle(''); setContent({}) }}
                  className="btn btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTE VIEWER */}
        {!showForm && selectedNote && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{selectedNote.title}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-500">
                    <span>{NOTE_TYPES.find(t => t.value === selectedNote.note_type)?.label}</span>
                    <span>·</span>
                    <span>{selectedNote.author?.first_name} {selectedNote.author?.last_name}</span>
                    <span>·</span>
                    <span>{formatDateTime(selectedNote.written_at)}</span>
                    {selectedNote.is_signed
                      ? <span className="flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle className="w-4 h-4" />Signed {formatDateTime(selectedNote.signed_at)}</span>
                      : <span className="flex items-center gap-1 text-amber-500"><Edit3 className="w-4 h-4" />Draft — not yet signed</span>}
                  </div>
                </div>
                {!selectedNote.is_signed && (
                  <button onClick={() => signNote(selectedNote.id)} className="btn btn-success btn-sm flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" /> Sign Note
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {(() => {
                const c = selectedNote.content as Record<string, string>
                const entries = Object.entries(c).filter(([, v]) => v?.trim())
                const fieldDefs = selectedNote.note_type === 'SBAR' ? SBAR_FIELDS
                  : selectedNote.note_type === 'SOAP' ? SOAP_FIELDS
                  : selectedNote.note_type === 'shift_assessment' ? SHIFT_FIELDS
                  : null

                if (fieldDefs) {
                  return fieldDefs.filter(f => c[f.key]?.trim()).map(f => (
                    <div key={f.key} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className={`px-3 py-2 text-xs font-bold ${(f as any).color ?? 'bg-gray-50 text-gray-700'}`}>
                        {f.label}
                      </div>
                      <div className="px-3 py-3 text-sm text-gray-800 whitespace-pre-wrap bg-white">
                        {c[f.key]}
                      </div>
                    </div>
                  ))
                }

                return entries.map(([k, v]) => (
                  <div key={k} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 text-xs font-bold bg-gray-50 text-gray-700 capitalize">{k}</div>
                    <div className="px-3 py-3 text-sm text-gray-800 whitespace-pre-wrap">{v}</div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!showForm && !selectedNote && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="font-medium">No note selected</p>
              <p className="text-sm mt-1">Click "+ New" to write a note, or select one from the list</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
