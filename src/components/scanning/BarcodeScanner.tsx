'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Scan, X, Camera, Keyboard, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  instruction: string
  onScan: (value: string) => void
  onClose: () => void
  expectedValue?: string
}

export default function BarcodeScanner({ title, instruction, onScan, onClose, expectedValue }: Props) {
  const [mode, setMode] = useState<'usb' | 'camera' | 'manual'>('usb')
  const [manualInput, setManualInput] = useState('')
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // USB scanner buffer
  const usbBuffer = useRef('')
  const usbLastKey = useRef(0)

  // Focus the hidden input for USB scanner capture
  useEffect(() => {
    if (mode === 'usb' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mode])

  // USB keyboard wedge listener
  useEffect(() => {
    if (mode !== 'usb') return

    function handleKey(e: KeyboardEvent) {
      const now = Date.now()
      if (now - usbLastKey.current > 200) usbBuffer.current = ''
      usbLastKey.current = now

      if (e.key === 'Enter') {
        const val = usbBuffer.current.trim()
        if (val.length >= 3) {
          setLastScan(val)
          onScan(val)
        }
        usbBuffer.current = ''
      } else if (e.key.length === 1) {
        usbBuffer.current += e.key
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode, onScan])

  // Camera setup
  const startCamera = useCallback(async () => {
    setCameraLoading(true)
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraLoading(false)
      startDecoding()
    } catch (err: any) {
      setCameraError('Camera access denied. Allow camera or switch to USB/Manual mode.')
      setCameraLoading(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startDecoding = useCallback(async () => {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current) return
        try {
          const result = await reader.decodeFromVideoElement(videoRef.current)
          if (result) {
            const val = result.getText()
            setLastScan(val)
            onScan(val)
            stopCamera()
          }
        } catch { /* no barcode in frame */ }
      }, 400)
    } catch {
      setCameraError('Barcode library unavailable. Use USB scanner or manual entry.')
    }
  }, [onScan, stopCamera])

  useEffect(() => {
    if (mode === 'camera') startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [mode])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualInput.trim()) return
    setLastScan(manualInput.trim())
    onScan(manualInput.trim())
    setManualInput('')
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            <div>
              <div className="font-semibold">{title}</div>
              <div className="text-emerald-100 text-xs mt-0.5">{instruction}</div>
            </div>
          </div>
          <button onClick={handleClose} className="text-emerald-200 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'usb', label: 'USB Scanner', icon: Scan },
            { id: 'camera', label: 'Camera', icon: Camera },
            { id: 'manual', label: 'Manual', icon: Keyboard },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors',
                mode === m.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* USB Mode */}
          {mode === 'usb' && (
            <div className="space-y-4">
              <div className="scan-prompt">
                <Scan className="w-12 h-12 text-emerald-400" />
                <div className="text-gray-700 font-medium">Ready for USB/Bluetooth Scanner</div>
                <div className="text-gray-500 text-sm">
                  Point your scanner at the barcode. The scan will be captured automatically.
                </div>
                <div className="text-xs text-gray-400 bg-gray-100 rounded px-3 py-2 w-full text-center">
                  Scanner must be connected via USB or Bluetooth to this device
                </div>
              </div>
              {/* Hidden input to capture focus for USB scanner */}
              <input
                ref={inputRef}
                className="opacity-0 h-0 w-0 absolute"
                readOnly
                tabIndex={0}
              />
            </div>
          )}

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {cameraLoading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  <div className="text-sm text-gray-500">Starting camera...</div>
                </div>
              )}
              {cameraError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {cameraError}
                </div>
              )}
              {!cameraLoading && !cameraError && (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-emerald-400 w-48 h-32 rounded-lg opacity-70" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">
                    Center barcode or QR code in the frame
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="form-label">Enter barcode / ID manually</label>
                <input
                  className="form-input text-lg font-mono"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  placeholder={expectedValue ? `Expected: ${expectedValue}` : 'Scan value or patient ID...'}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary w-full justify-center">
                <CheckCircle className="w-4 h-4" /> Submit
              </button>
            </form>
          )}

          {/* Last scan result */}
          {lastScan && (
            <div className="scan-success mt-4">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-800 text-sm">Scanned</div>
                <div className="font-mono text-sm text-green-700">{lastScan}</div>
              </div>
            </div>
          )}

          {/* Expected value hint */}
          {expectedValue && (
            <div className="mt-3 text-xs text-gray-400 text-center">
              Expected value: <span className="font-mono">{expectedValue}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={handleClose} className="btn btn-secondary w-full justify-center">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
