'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime, cn, titleCase } from '@/lib/utils'
import toast from 'react-hot-toast'
import { ClipboardList, CheckCircle, Clock, Loader2, AlertTriangle } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  stat: 'badge-red',
  urgent: 'badge-amber',
  routine: 'badge-gray',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-amber',
  acknowledged: 'badge-blue',
  in_progress: 'badge-purple',
  completed: 'badge-green',
  cancelled: 'badge-gray',
  on_hold: 'badge-gray',
}

const ORDER_TYPE_ICONS: Record<string, string> = {
  medication: '💊',
  lab: '🧪',
  imaging: '🩻',
  nursing: '🩺',
  diet: '🍽️',
  activity: '🚶',
  consult: '👨‍⚕️',
  iv_fluid: '💉',
}

export default function OrdersPanel({ sessionId, orders }: { sessionId: string; orders: any[] }) {
  const supabase = createClient()
  const [studentOrders, setStudentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({})
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  useEffect(() => { loadOrders() }, [sessionId])

  async function loadOrders() {
    const { data } = await supabase
      .from('student_orders')
      .select('*, order:orders(*)')
      .eq('session_id', sessionId)
      .order('order(priority)', { ascending: true })
    setStudentOrders(data ?? [])
    setLoading(false)
  }

  async function updateStatus(studentOrderId: string, newStatus: string) {
    setUpdating(studentOrderId)
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    const update: any = { status: newStatus }
    if (newStatus === 'acknowledged') {
      update.acknowledged_by = user!.id
      update.acknowledged_at = now
    }
    if (newStatus === 'completed') {
      update.completed_at = now
      update.completion_notes = completionNotes[studentOrderId] ?? null
    }

    const { error } = await supabase
      .from('student_orders')
      .update(update)
      .eq('id', studentOrderId)

    if (error) {
      toast.error('Update failed: ' + error.message)
    } else {
      toast.success(`Order ${newStatus}`)
      loadOrders()
      await supabase.from('student_sessions').update({ last_active_at: now }).eq('id', sessionId)
    }
    setUpdating(null)
  }

  const statOrders = studentOrders.filter(o => o.order?.priority === 'stat')
  const urgentOrders = studentOrders.filter(o => o.order?.priority === 'urgent')
  const routineOrders = studentOrders.filter(o => o.order?.priority === 'routine')

  const groups = [
    { label: 'STAT Orders', orders: statOrders, borderColor: 'border-red-400' },
    { label: 'Urgent Orders', orders: urgentOrders, borderColor: 'border-amber-400' },
    { label: 'Routine Orders', orders: routineOrders, borderColor: 'border-gray-300' },
  ]

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0 flex items-center gap-2">
           Order Entry / Management
        </h2>
        <div className="flex gap-2 text-xs">
          <span className="badge badge-red">{statOrders.filter(o => o.status !== 'completed').length} STAT</span>
          <span className="badge badge-amber">{urgentOrders.filter(o => o.status !== 'completed').length} Urgent</span>
          <span className="badge badge-gray">{routineOrders.filter(o => o.status !== 'completed').length} Routine</span>
        </div>
      </div>

      {studentOrders.length === 0 && (
        <div className="ehr-card p-10 text-center">
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <div className="text-gray-400 text-sm">No orders in this simulation</div>
        </div>
      )}

      {groups.map(group => group.orders.length > 0 && (
        <div key={group.label} className={`ehr-card border-l-4 ${group.borderColor}`}>
          <div className="ehr-card-header">
            <span className="font-semibold text-sm">{group.label}</span>
            <span className="text-xs text-gray-500">{group.orders.length} order{group.orders.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {group.orders.map(so => {
              const order = so.order
              if (!order) return null
              const isCompleted = so.status === 'completed' || so.status === 'cancelled'
              return (
                <div key={so.id} className={cn('p-4', isCompleted && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg leading-none">{ORDER_TYPE_ICONS[order.order_type] ?? '📋'}</span>
                        <span className="font-semibold text-sm text-gray-900">{order.description}</span>
                        <span className={`badge text-xs ${PRIORITY_COLORS[order.priority]}`}>
                          {order.priority.toUpperCase()}
                        </span>
                        <span className={`badge text-xs ${STATUS_COLORS[so.status]}`}>
                          {titleCase(so.status)}
                        </span>
                      </div>

                      {order.details && (
                        <p className="text-sm text-gray-600 mt-1.5">{order.details}</p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        <span>Type: {titleCase(order.order_type)}</span>
                        {order.frequency && <span>Freq: {order.frequency}</span>}
                        {order.duration && <span>Duration: {order.duration}</span>}
                        <span>Ordered by: {order.ordered_by}</span>
                        <span>Ordered: {formatDateTime(order.ordered_at)}</span>
                      </div>

                      {order.special_instructions && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-700 bg-amber-50 rounded p-2">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span>{order.special_instructions}</span>
                        </div>
                      )}

                      {so.status === 'completed' && so.completion_notes && (
                        <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                          <strong>Completion note:</strong> {so.completion_notes}
                        </div>
                      )}

                      {so.status === 'acknowledged' && so.acknowledged_at && (
                        <div className="text-xs text-emerald-500 mt-1">
                          Acknowledged: {formatDateTime(so.acknowledged_at)}
                        </div>
                      )}

                      {/* Completion note input */}
                      {expandedNote === so.id && (
                        <div className="mt-3">
                          <textarea
                            className="form-textarea text-sm"
                            rows={2}
                            placeholder="Optional completion notes (e.g. patient tolerated procedure well)..."
                            value={completionNotes[so.id] ?? ''}
                            onChange={e => setCompletionNotes(n => ({ ...n, [so.id]: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {!isCompleted && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {so.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(so.id, 'acknowledged')}
                            disabled={updating === so.id}
                            className="btn btn-primary btn-sm"
                          >
                            {updating === so.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Acknowledge
                          </button>
                        )}
                        {so.status === 'acknowledged' && (
                          <button
                            onClick={() => updateStatus(so.id, 'in_progress')}
                            disabled={updating === so.id}
                            className="btn btn-secondary btn-sm"
                          >
                            <Clock className="w-3.5 h-3.5" /> In Progress
                          </button>
                        )}
                        {(so.status === 'acknowledged' || so.status === 'in_progress') && (
                          <>
                            {expandedNote !== so.id && (
                              <button
                                onClick={() => setExpandedNote(so.id)}
                                className="btn btn-success btn-sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Complete
                              </button>
                            )}
                            {expandedNote === so.id && (
                              <button
                                onClick={() => { updateStatus(so.id, 'completed'); setExpandedNote(null) }}
                                disabled={updating === so.id}
                                className="btn btn-success btn-sm"
                              >
                                {updating === so.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Confirm
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => updateStatus(so.id, 'on_hold')}
                          disabled={updating === so.id || so.status === 'on_hold'}
                          className="btn btn-secondary btn-sm text-xs"
                        >
                          Hold
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
