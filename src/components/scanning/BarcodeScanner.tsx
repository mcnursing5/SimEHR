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

export default function BarcodeScanner({
  title,
  instruction,
  onScan,
  onClose,
  expectedValue
}: Props) {

  const [mode, setMode] = useState<'usb' | 'camera' | 'manual'>('usb')
  const [manualInput, setManualInput] = useState('')
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const usbBuffer = useRef('')
  const usbLastKey = useRef(0)


  // -------------------------
  // USB Scanner
  // -------------------------
  useEffect(() => {
    if (mode === 'usb' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mode])


  useEffect(() => {
    if (mode !== 'usb') return

    function handleKey(e: KeyboardEvent) {

      const now = Date.now()

      if (now - usbLastKey.current > 200) {
        usbBuffer.current = ''
      }

      usbLastKey.current = now


      if (e.key === 'Enter') {

        const value = usbBuffer.current.trim()

        if (value.length >= 3) {
          setLastScan(value)
          onScan(value)
        }

        usbBuffer.current = ''

      } else if (e.key.length === 1) {

        usbBuffer.current += e.key

      }
    }


    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
    }

  }, [mode, onScan])



  // -------------------------
  // Camera
  // -------------------------
  const stopCamera = useCallback(() => {

    readerRef.current?.reset()
    readerRef.current = null

    streamRef.current
      ?.getTracks()
      .forEach(track => track.stop())

    streamRef.current = null

  }, [])



  const startCamera = useCallback(async () => {

    setCameraLoading(true)
    setCameraError(null)


    try {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: 'environment'
            },
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          },
          audio: false
        })


      streamRef.current = stream


      // wait until video element exists
      if (!videoRef.current) {
        throw new Error('Video element missing')
      }


      videoRef.current.srcObject = stream

      await videoRef.current.play()


      setCameraLoading(false)


      startDecoding()


    } catch (err) {

      console.error(err)

      setCameraError(
        'Camera access denied or unavailable. Allow camera permission or use USB/manual mode.'
      )

      setCameraLoading(false)
    }


  }, [])



  const startDecoding = useCallback(async () => {

    try {

      const {
        BrowserMultiFormatReader
      } = await import('@zxing/library')


      const reader = new BrowserMultiFormatReader()

      readerRef.current = reader


      reader.decodeFromVideoElement(
        videoRef.current!,
        result => {

          if (result) {

            const value = result.getText()

            setLastScan(value)

            onScan(value)

            stopCamera()
          }

        }
      )


    } catch (err) {

      console.error(err)

      setCameraError(
        'Barcode scanner unavailable. Use USB/manual mode.'
      )
    }

  }, [onScan, stopCamera])



  useEffect(() => {

    if (mode === 'camera') {

      startCamera()

    } else {

      stopCamera()

    }


    return () => {
      stopCamera()
    }

  }, [mode, startCamera, stopCamera])




  function handleManualSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault()

    const value = manualInput.trim()

    if (!value) return


    setLastScan(value)

    onScan(value)

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

              <div className="font-semibold">
                {title}
              </div>

              <div className="text-emerald-100 text-xs mt-0.5">
                {instruction}
              </div>

            </div>

          </div>


          <button onClick={handleClose}>
            <X className="w-5 h-5" />
          </button>

        </div>



        {/* Tabs */}

        <div className="flex border-b">

          {[
            { id:'usb', label:'USB Scanner', icon:Scan },
            { id:'camera', label:'Camera', icon:Camera },
            { id:'manual', label:'Manual', icon:Keyboard }

          ].map(tab => (

            <button
              key={tab.id}
              onClick={() =>
                setMode(tab.id as any)
              }
              className={cn(
                'flex-1 flex justify-center gap-2 py-3 border-b-2',
                mode === tab.id
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500'
              )}
            >

              <tab.icon className="w-4 h-4"/>

              {tab.label}

            </button>

          ))}

        </div>




        <div className="p-5">


          {/* CAMERA */}

          {mode === 'camera' && (

            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">


              <video

                ref={videoRef}

                autoPlay

                muted

                playsInline

                className="w-full h-full object-cover"

              />


              {cameraLoading && (

                <div className="absolute inset-0 flex items-center justify-center">

                  <Loader2 className="animate-spin text-emerald-400"/>

                </div>

              )}



              <div className="absolute inset-0 flex items-center justify-center">

                <div className="border-2 border-emerald-400 w-48 h-32 rounded-lg"/>

              </div>



              <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs">

                Center barcode or QR code in frame

              </div>


              {cameraError && (

                <div className="absolute bottom-0 bg-red-600 text-white text-xs p-2 w-full">

                  {cameraError}

                </div>

              )}


            </div>

          )}






          {/* USB */}

          {mode === 'usb' && (

            <div className="text-center space-y-3">

              <Scan className="mx-auto w-12 h-12 text-emerald-400"/>

              <div className="font-medium">
                Ready for USB/Bluetooth Scanner
              </div>


              <input
                ref={inputRef}
                className="absolute opacity-0"
                readOnly
              />

            </div>

          )}






          {/* MANUAL */}

          {mode === 'manual' && (

            <form onSubmit={handleManualSubmit}>

              <input

                className="form-input w-full"

                value={manualInput}

                onChange={e =>
                  setManualInput(e.target.value)
                }

                placeholder="Enter barcode"

              />


              <button className="btn btn-primary w-full mt-3">

                Submit

              </button>

            </form>

          )}





          {lastScan && (

            <div className="mt-4 flex gap-2 text-green-700">

              <CheckCircle/>

              <span>{lastScan}</span>

            </div>

          )}


        </div>



        <div className="p-5">

          <button
            onClick={handleClose}
            className="btn btn-secondary w-full"
          >
            Cancel
          </button>

        </div>


      </div>

    </div>

  )
}
