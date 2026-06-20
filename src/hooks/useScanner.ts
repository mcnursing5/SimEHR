'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
// Minimal local shape for the zxing decode result/error passed into the
// continuous-scan callback. Avoids depending on named type exports from
// '@zxing/library' resolving identically across bundlers/環境 - only the
// methods actually used here are declared.
interface ZXingResult {
  getText(): string
  getBarcodeFormat(): { toString(): string }
}
interface ZXingReader {
  decodeFromVideoDevice(
    deviceId: string | null,
    videoSource: string | HTMLVideoElement | null,
    callbackFn: (result?: ZXingResult, error?: unknown) => void
  ): Promise<void>
  reset(): void
}

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
// Uses the browser's camera via getUserMedia + ZXing WASM.
//
// Verified against @zxing/library 0.23.0 type definitions:
//   decodeFromVideoDevice(deviceId: string | null, videoSource: string | HTMLVideoElement | null,
//     callbackFn: (result: Result, error?: Exception) => any): Promise<void>
//   reset(): void   <- stops the continuous decode loop and releases the camera

export function useCameraScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const readerRef = useRef<ZXingReader | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)

  const stopCamera = useCallback(() => {
    try {
      readerRef.current?.reset()
    } catch {
      // reset() can throw if already stopped - safe to ignore
    }
    readerRef.current = null
    setIsScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)

      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const codeReader = new BrowserMultiFormatReader() as unknown as ZXingReader
      readerRef.current = codeReader

      if (!videoRef.current) return

      setIsScanning(true)

      // deviceId = null lets the browser pick the default camera.
      // The callback fires repeatedly (once per attempted frame); `result`
      // is only populated when a barcode was actually decoded, otherwise
      // `error` fires (a routine NotFoundException) and should be ignored.
      await codeReader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (decodeResult?: ZXingResult, decodeError?: unknown) => {
          if (decodeResult) {
            setResult({
              value: decodeResult.getText(),
              format: decodeResult.getBarcodeFormat().toString(),
              timestamp: new Date(),
            })
            stopCamera()
          }
          // decodeError fires continuously for "no barcode in this frame" - ignore it
        }
      )
    } catch (err) {
      setError('Camera access denied. Please allow camera access or use a USB scanner.')
      setIsScanning(false)
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
