'use client'

import { useState } from 'react'
import { getLabFlagColor, formatDateTime } from '@/lib/utils'
import { TestTube, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

export default function LabResultsPanel({ labResults }: { labResults: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(labResults[0]?.id ?? null)

  const criticalCount = labResults.reduce((acc, lr) =>
    acc + (lr.lab_components ?? []).filter((c: any) => c.is_critical).length, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0 flex items-center gap-2">
          Lab Results &amp; Diagnostics
        </h2>
        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {criticalCount} Critical Value{criticalCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {labResults.length === 0 && (
        <div className="ehr-card p-10 text-center">
          <TestTube className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <div className="text-gray-400 text-sm">No lab results in this simulation</div>
        </div>
      )}

      {labResults.map(lr => {
        const panelCriticals = (lr.lab_components ?? []).filter((c: any) => c.is_critical)
        const isOpen = expanded === lr.id
        return (
          <div key={lr.id} className="ehr-card">
            <button
              onClick={() => setExpanded(isOpen ? null : lr.id)}
              className="ehr-card-header w-full text-left hover:bg-gray-100 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <TestTube className="w-4 h-4 text-emerald-500" />
                <div>
                  <div className="font-semibold text-sm">{lr.panel_name}</div>
                  <div className="text-xs text-gray-500">
                    Collected: {lr.collected_at ? formatDateTime(lr.collected_at) : '—'} ·
                    Resulted: {lr.resulted_at ? formatDateTime(lr.resulted_at) : '—'}
                  </div>
                </div>
                {panelCriticals.length > 0 && (
                  <span className="badge badge-red text-xs ml-2">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {panelCriticals.length} Critical
                  </span>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {isOpen && (
              <div className="overflow-x-auto">
                <table className="ehr-table">
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Result</th>
                      <th>Units</th>
                      <th>Reference Range</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lr.lab_components ?? []).map((comp: any) => (
                      <tr key={comp.id} className={comp.is_critical ? 'bg-red-50' : ''}>
                        <td className="font-medium text-sm">
                          {comp.name}
                          {comp.is_critical && (
                            <span className="ml-2 text-xs font-bold text-red-600">⚠ CRITICAL</span>
                          )}
                        </td>
                        <td className={`font-mono font-semibold ${getLabFlagColor(comp.flag)}`}>
                          {comp.value}
                        </td>
                        <td className="text-gray-500 text-sm">{comp.unit ?? '—'}</td>
                        <td className="text-gray-500 text-sm font-mono">
                          {comp.reference_low && comp.reference_high
                            ? `${comp.reference_low} – ${comp.reference_high}`
                            : comp.reference_low
                            ? `> ${comp.reference_low}`
                            : comp.reference_high
                            ? `< ${comp.reference_high}`
                            : '—'}
                        </td>
                        <td>
                          {comp.flag ? (
                            <span className={`font-bold text-sm ${getLabFlagColor(comp.flag)}`}>
                              {comp.flag}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!lr.lab_components || lr.lab_components.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-400 py-4 text-sm">
                          No components for this panel
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
