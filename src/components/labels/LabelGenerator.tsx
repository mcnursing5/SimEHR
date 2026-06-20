'use client'

import { useState } from 'react'
import { generatePatientLabel } from '@/lib/labelGenerator'
import { formatDate, calculateAge } from '@/lib/utils'
import { Printer, Download, QrCode, Barcode, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LabelFormat } from '@/types'

interface Props {
  patient: any
  encounterNumber: string
}

export default function LabelGenerator({ patient, encounterNumber }: Props) {
  const [generating, setGenerating] = useState<LabelFormat | null>(null)

  async function generate(format: LabelFormat) {
    setGenerating(format)
    try {
      await generatePatientLabel(patient, encounterNumber, format)
      toast.success(`${format.replace('_', ' ')} label downloaded`)
    } catch (err: any) {
      toast.error('Label generation failed: ' + err.message)
    }
    setGenerating(null)
  }

  const labels: { format: LabelFormat; label: string; desc: string; icon: React.ElementType }[] = [
    {
      format: 'wristband',
      label: 'Wristband Label',
      desc: '11" × 1.25" — Zebra/Dymo thermal wristband',
      icon: QrCode,
    },
    {
      format: 'bedside_card',
      label: 'Bedside Card',
      desc: '4" × 6" — Laminated card for simulation station',
      icon: FileText,
    },
    {
      format: 'chart_cover',
      label: 'Chart Cover Sheet',
      desc: 'Letter size — Full patient identification page',
      icon: Printer,
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800 mb-1">Generate Patient Labels</h3>
        <p className="text-sm text-gray-500">
          All labels include both a QR code and a Code 128 barcode — compatible with camera scanning and USB/Bluetooth scanners.
        </p>
      </div>

      {/* Patient preview */}
      <div className="bg-emerald-600 text-white rounded-lg p-4 font-mono text-sm space-y-1">
        <div className="text-xl font-bold">{patient.last_name}, {patient.first_name}</div>
        <div>MRN: {patient.mrn}</div>
        <div>DOB: {formatDate(patient.date_of_birth)} · Age: {calculateAge(patient.date_of_birth)} · {patient.sex}</div>
        <div>Encounter: {encounterNumber}</div>
        <div>Room: {patient.room_number}-{patient.bed_number}</div>
        {patient.allergies?.length > 0 && (
          <div className="bg-red-500 rounded px-2 py-1 mt-2 font-bold text-sm">
            ⚠ ALLERGIES: {patient.allergies.map((a: any) => a.substance).join(', ')}
          </div>
        )}
      </div>

      {/* Label options */}
      <div className="grid grid-cols-1 gap-3">
        {labels.map(({ format, label, desc, icon: Icon }) => (
          <div key={format} className="ehr-card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            </div>
            <button
              onClick={() => generate(format)}
              disabled={generating !== null}
              className="btn btn-primary btn-sm flex-shrink-0"
            >
              {generating === format
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                : <><Download className="w-3.5 h-3.5" /> Download PDF</>}
            </button>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 rounded p-3">
        <strong>Printing tips:</strong> Wristband labels print on standard Zebra ZD620 or Dymo LabelWriter. 
        For bedside cards, print on cardstock and laminate. All labels include both QR codes (camera-friendly) 
        and Code 128 barcodes (USB scanner-friendly) of the patient MRN.
      </div>
    </div>
  )
}
