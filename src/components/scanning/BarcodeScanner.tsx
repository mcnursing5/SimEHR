'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Scan,
  X,
  Camera,
  Keyboard,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'

import { cn } from '@/lib/utils'


interface Props {
  title: string
  instruction: string
  onScan: (value: string) => void
  onClose: () => void
  expectedValue?: string
}


interface ZXingResult {
  getText(): string
}


interface ZXingReader {
  reset(): void
}


export default function BarcodeScanner({
  title,
  instruction,
  onScan,
  onClose,
  expectedValue
}: Props) {


  const [mode, setMode] =
    useState<'usb' | 'camera' | 'manual'>('usb')

  const [manualInput, setManualInput] =
    useState('')

  const [cameraLoading, setCameraLoading] =
    useState(false)

  const [cameraError, setCameraError] =
    useState<string | null>(null)

  const [lastScan, setLastScan] =
    useState<string | null>(null)


  const videoRef =
    useRef<HTMLVideoElement>(null)

  const readerRef =
    useRef<ZXingReader | null>(null)

  const inputRef =
    useRef<HTMLInputElement>(null)

  const scanLocked =
    useRef(false)


  const usbBuffer =
    useRef('')

  const usbLastKey =
    useRef(0)



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

        const value =
          usbBuffer.current.trim()


        if (value.length >= 3) {

          setLastScan(value)
          onScan(value)

        }


        usbBuffer.current = ''

      } else if (e.key.length === 1) {

        usbBuffer.current += e.key
      }
    }


    window.addEventListener(
      'keydown',
      handleKey
    )


    return () =>
      window.removeEventListener(
        'keydown',
        handleKey
      )

  }, [mode, onScan])



  const stopCamera = useCallback(() => {

    try {
      readerRef.current?.reset()
    } catch {}


    readerRef.current = null


    const video =
      videoRef.current


    if (video?.srcObject) {

      const stream =
        video.srcObject as MediaStream


      stream.getTracks().forEach(track => {
        track.stop()
      })


      video.srcObject = null
    }


  }, [])



  const startCamera = useCallback(async () => {

    setCameraLoading(true)
    setCameraError(null)

    scanLocked.current = false


    stopCamera()


    if (!navigator.mediaDevices?.getUserMedia) {

      setCameraError(
        'Camera not supported on this browser.'
      )

      setCameraLoading(false)
      return
    }



    try {

      const {
        BrowserMultiFormatReader,
        BarcodeFormat,
        DecodeHintType
      } =
        await import('@zxing/library')



      const hints =
        new Map()


      hints.set(
        DecodeHintType.POSSIBLE_FORMATS,
        [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.UPC_A
        ]
      )



      const reader =
        new BrowserMultiFormatReader(hints)



      readerRef.current =
        reader as unknown as ZXingReader



      if (!videoRef.current) {

        setCameraError(
          'Video element not ready.'
        )

        setCameraLoading(false)
        return
      }



      await reader.decodeFromConstraints(

        {
          video: {

            facingMode: {
              ideal: 'environment'
            },

            width: {
              ideal: 1920
            },

            height: {
              ideal: 1080
            }

          }
        },


        videoRef.current,


        (result?: ZXingResult) => {


          if (!result ||
              scanLocked.current) {
            return
          }



          scanLocked.current = true


          const value =
            result.getText()



          console.log(
            'Camera scan:',
            value
          )


          setLastScan(value)


          onScan(value)



          setTimeout(() => {

            stopCamera()

          }, 500)

        }

      )


      setCameraLoading(false)



    } catch (err: any) {

      console.error(
        'Camera error:',
        err
      )


      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError'
      ) {

        setCameraError(
          'Camera permission denied. Allow camera access.'
        )

      } else if (
        err?.name === 'NotFoundError'
      ) {

        setCameraError(
          'No camera found.'
        )

      } else {

        setCameraError(
          'Could not start camera.'
        )
      }


      setCameraLoading(false)
    }


  }, [onScan, stopCamera])



  useEffect(() => {

    if (mode === 'camera') {

      startCamera()

    } else {

      stopCamera()

    }


    return () =>
      stopCamera()


  }, [mode])




  function handleManualSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault()


    if (!manualInput.trim()) return


    setLastScan(
      manualInput.trim()
    )


    onScan(
      manualInput.trim()
    )


    setManualInput('')
  }




  function handleClose() {

    stopCamera()
    onClose()

  }



  return (

    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">


      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">


        <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">


          <div className="flex items-center gap-2">

            <Scan className="w-5 h-5" />

            <div>

              <div className="font-semibold">
                {title}
              </div>

              <div className="text-emerald-100 text-xs">
                {instruction}
              </div>

            </div>

          </div>



          <button
            onClick={handleClose}
            className="p-1"
          >
            <X />
          </button>

        </div>




        <div className="flex border-b">


          {[
            { id:'usb', label:'USB Scanner', icon:Scan },
            { id:'camera', label:'Camera', icon:Camera },
            { id:'manual', label:'Manual', icon:Keyboard }

          ].map(m => (

            <button

              key={m.id}

              onClick={() =>
                setMode(
                  m.id as any
                )
              }

              className={cn(
                'flex-1 py-3 flex justify-center gap-1 text-sm',
                mode === m.id
                  ? 'text-emerald-600 border-b-2 border-emerald-600'
                  : 'text-gray-500'
              )}

            >

              <m.icon className="w-4 h-4" />

              {m.label}

            </button>

          ))}

        </div>





        <div className="p-5">


          {mode === 'camera' && (

            <div>


              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">


                <video

                  ref={videoRef}

                  className="w-full h-full object-cover"

                  muted

                  playsInline

                  autoPlay

                  onCanPlay={() =>
                    videoRef.current?.play()
                  }

                />


                {cameraLoading && (

                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">


                    <Loader2 className="animate-spin text-white" />


                  </div>

                )}



                {!cameraLoading &&
                 !cameraError && (

                  <div className="absolute inset-0 flex items-center justify-center">

                    <div className="border-2 border-emerald-400 w-64 h-48 rounded-lg" />

                  </div>

                )}


              </div>




              {cameraError && (

                <div className="mt-3 text-red-600">

                  {cameraError}

                  <button
                    onClick={startCamera}
                    className="block mt-2 underline"
                  >
                    Retry
                  </button>

                </div>

              )}


            </div>

          )}




          {mode === 'usb' && (

            <>

              <div>
                Ready for USB scanner
              </div>


              <input

                ref={inputRef}

                className="absolute opacity-0"

                readOnly

              />

            </>

          )}




          {mode === 'manual' && (

            <form onSubmit={handleManualSubmit}>


              <input

                className="form-input w-full"

                value={manualInput}

                onChange={
                  e => setManualInput(e.target.value)
                }

              />


            </form>

          )}





          {lastScan && (

            <div className="mt-4 text-green-700">

              <CheckCircle className="inline mr-2" />

              {lastScan}

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
