'use client'

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'

interface Medication {
  id: string
  generic_name: string
  brand_name?: string
  dose: string
  route: string
  barcode_value: string
  ndc_code?: string
}

interface Props {
  scenarioTitle: string
  medications: Medication[]
}

function useBarcodeImage(value: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!value) return
    QRCode.toDataURL(value, {
      width: 120,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setDataUrl).catch(() => setDataUrl(null))
  }, [value])
  return dataUrl
}

function MedLabel({ med, index }: { med: Medication; index: number }) {
  const qr = useBarcodeImage(med.barcode_value)

  return (
    <div style={{
      width: '2.5in',
      height: '1.5in',
      border: '1px solid #333',
      borderRadius: '4px',
      padding: '6px 8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: '#fff',
      boxSizing: 'border-box',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
    }}>
      {/* Drug name + dose */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#000',
          lineHeight: 1.2,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
        }}>
          {med.generic_name}
        </div>
        {med.brand_name && (
          <div style={{ fontSize: '8px', color: '#555', marginTop: '1px' }}>
            ({med.brand_name})
          </div>
        )}
        <div style={{
          fontSize: '13px',
          fontWeight: 'bold',
          color: '#000',
          marginTop: '3px',
        }}>
          {med.dose} · {med.route}
        </div>
      </div>

      {/* QR code + barcode text */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '7px', color: '#666', maxWidth: '1.5in' }}>
          <div style={{ marginBottom: '1px', fontSize: '6px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Simulation Only — Not for Clinical Use
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '7px', color: '#333', wordBreak: 'break-all' }}>
            {med.barcode_value}
          </div>
        </div>
        {qr && (
          <img
            src={qr}
            alt={`QR: ${med.barcode_value}`}
            style={{ width: '52px', height: '52px', flexShrink: 0 }}
          />
        )}
      </div>
    </div>
  )
}

export default function MedicationLabels({ scenarioTitle, medications }: Props) {
  const [copies, setCopies] = useState(1)
  const [ready, setReady] = useState(false)

  // Wait for QR codes to generate before allowing print
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const labelsToRender = Array.from({ length: copies }, () => medications).flat()

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="no-print" style={{
        background: '#1b2b22',
        color: 'white',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
            Medication Labels — {scenarioTitle}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
            {medications.length} medication{medications.length !== 1 ? 's' : ''} · 2.5" × 1.5" labels
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Copies per med:
            <select
              value={copies}
              onChange={e => { setCopies(Number(e.target.value)); setReady(false); setTimeout(() => setReady(true), 600) }}
              style={{ background: '#2d3748', color: 'white', border: '1px solid #4a5568', borderRadius: '4px', padding: '4px 8px', fontSize: '13px' }}
            >
              {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button
            onClick={() => window.print()}
            disabled={!ready}
            style={{
              background: ready ? '#059669' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: ready ? 'pointer' : 'not-allowed',
            }}
          >
            {ready ? '🖨️ Print Labels' : 'Generating QR codes...'}
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid #4a5568',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Label sheet */}
      <div style={{
        background: '#f9fafb',
        minHeight: '100vh',
        padding: '24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 2.5in)',
          gap: '0.25in',
          justifyContent: 'start',
        }}>
          {labelsToRender.map((med, i) => (
            <MedLabel key={`${med.id}-${i}`} med={med} index={i} />
          ))}
        </div>

        {medications.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>
            No medications in this scenario.
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          @page { margin: 0.5in; size: letter; }
        }
      `}</style>
    </>
  )
}
