'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type ScannerMode = 'camera' | 'usb' | 'manual'

export interface ScanResult {
  value: string
  format: string
  timestamp: Date
}

// ── USB / Bluetooth Scanner Hook ───────────────────────────
// USB scanners act as HID keyboard devices - they type the barcode
// value into whatever input is focused, followed by Enter.
// This hook listens globally for rapid keystrokes ending in Enter.

export function useUSBScanner(onScan: (result: ScanResult) => void) {
  const buffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)
  const SCAN_SPEED_THRESHOLD = 50 // ms between keystrokes - scanners type very fast

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now()
      const timeSinceLast = now - lastKeyTime.current
      lastKeyTime.current = now

      // If too slow, it's a human typing - reset buffer
      if (timeSinceLast > 200 && buffer.current.length > 0) {
        buffer.current = ''
      }

      if (e.key === 'Enter') {
        const scanned = buffer.current.trim()
        if (scanned.length >= 4) {
          onScan({ value: scanned, format: 'KEYBOARD_WEDGE', timestamp: new Date() })
        }
        buffer.current = ''
      } else if (e.key.length === 1) {
        // Only accumulate printable characters
        buffer.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onScan])
}

// ── Camera Scanner Hook ────────────────────────────────────
// Uses the browser's camera via getUserMedia + ZXing WASM

export function useCameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsScanning(true)
      startDecoding()
    } catch (err) {
      setError('Camera access denied. Please allow camera access or use a USB scanner.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }, [])

  const startDecoding = useCallback(async () => {
    // Dynamically import ZXing to keep bundle size small
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const codeReader = new BrowserMultiFormatReader()

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const decoded = await codeReader.decodeFromImageElement(videoRef.current)
          if (decoded) {
            setResult({ value: decoded.getText(), format: decoded.getBarcodeFormat().toString(), timestamp: new Date() })
            stopCamera()
          }
        } catch {
          // No barcode found in this frame - continue
        }
      }, 300)
    } catch {
      setError('Barcode library failed to load. Please use manual entry or USB scanner.')
    }
  }, [stopCamera])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return { videoRef, canvasRef, isScanning, error, result, startCamera, stopCamera, setResult }
}

// ── Combined Scanner Hook ──────────────────────────────────
// Combines USB and manual input into one unified interface

export function useScanner(onScan: (result: ScanResult) => void) {
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [mode, setMode] = useState<ScannerMode>('usb')

  const handleScan = useCallback((result: ScanResult) => {
    setLastScan(result)
    onScan(result)
  }, [onScan])

  useUSBScanner(handleScan)

  const manualScan = useCallback((value: string) => {
    if (!value.trim()) return
    handleScan({ value: value.trim(), format: 'MANUAL', timestamp: new Date() })
  }, [handleScan])

  return { lastScan, mode, setMode, manualScan }
}
