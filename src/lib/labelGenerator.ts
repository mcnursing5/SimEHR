'use client'

import type { Patient, LabelFormat } from '@/types'
import { formatDate, calculateAge } from '@/lib/utils'
import { format } from 'date-fns'

// QR payload for patient scanning
export interface PatientQRPayload {
  type: 'patient'
  mrn: string
  encounter: string
  name: string
  dob: string
}

export function buildPatientQRData(patient: Patient, encounterNumber: string): string {
  const payload: PatientQRPayload = {
    type: 'patient',
    mrn: patient.mrn,
    encounter: encounterNumber,
    name: `${patient.last_name}, ${patient.first_name}`,
    dob: patient.date_of_birth,
  }
  return JSON.stringify(payload)
}

export function buildMedBarcodeData(barcode_value: string): string {
  return barcode_value
}

// ── Generate Patient Label PDF ─────────────────────────────
export async function generatePatientLabel(
  patient: Patient,
  encounterNumber: string,
  format_type: LabelFormat = 'wristband'
): Promise<void> {
  const [jsPDF, QRCode, JsBarcode] = await Promise.all([
    import('jspdf').then(m => m.jsPDF),
    import('qrcode'),
    import('jsbarcode'),
  ])

  const qrData = buildPatientQRData(patient, encounterNumber)
  const age = calculateAge(patient.date_of_birth)

  if (format_type === 'wristband') {
    await generateWristband(jsPDF, QRCode, JsBarcode, patient, encounterNumber, qrData, age)
  } else if (format_type === 'bedside_card') {
    await generateBedsideCard(jsPDF, QRCode, JsBarcode, patient, encounterNumber, qrData, age)
  } else {
    await generateChartCover(jsPDF, QRCode, JsBarcode, patient, encounterNumber, qrData, age)
  }
}

async function generateWristband(
  jsPDF: any, QRCode: any, JsBarcode: any,
  patient: Patient, encounterNumber: string, qrData: string, age: number
): Promise<void> {
  // Wristband: 11" x 1" landscape (standard Zebra/Dymo wristband)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'in', format: [11, 1.25] })

  const pageW = 11
  const pageH = 1.25

  // Background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Left accent bar (Epic-style blue)
  doc.setFillColor(0, 84, 166)
  doc.rect(0, 0, 0.12, pageH, 'F')

  // Patient name - large
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(`${patient.last_name}, ${patient.first_name}`, 0.25, 0.35)

  // DOB and Age
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`DOB: ${formatDate(patient.date_of_birth)}  Age: ${age}  ${patient.sex}`, 0.25, 0.55)

  // MRN
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`MRN: ${patient.mrn}`, 0.25, 0.72)

  // Encounter
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Enc: ${encounterNumber}`, 0.25, 0.87)

  // Room
  doc.setFontSize(8)
  doc.text(`Room: ${patient.room_number}-${patient.bed_number}`, 0.25, 1.02)

  // Allergies (red alert)
  if (patient.allergies && patient.allergies.length > 0) {
    doc.setFillColor(220, 38, 38)
    doc.rect(3.0, 0.55, 2.5, 0.28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const allergyText = patient.allergies.map((a: any) => a.substance).join(', ')
    doc.text(`⚠ ALLERGIES: ${allergyText}`.substring(0, 38), 3.05, 0.73)
    doc.setTextColor(0, 0, 0)
  }

  // Attending
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(`Attending: ${patient.attending_provider}`, 3.0, 1.05)

  // Separator
  doc.setDrawColor(200, 200, 200)
  doc.line(5.8, 0.1, 5.8, pageH - 0.1)

  // Generate QR Code
  const qrCanvas = document.createElement('canvas')
  await QRCode.default.toCanvas(qrCanvas, qrData, { width: 80, margin: 1 })
  const qrImg = qrCanvas.toDataURL('image/png')
  doc.addImage(qrImg, 'PNG', 5.9, 0.1, 1.0, 1.0)

  // QR label
  doc.setFontSize(6)
  doc.setTextColor(100, 100, 100)
  doc.text('Scan to verify', 6.0, 1.18)

  // Generate Code 128 barcode
  const barcodeCanvas = document.createElement('canvas')
  JsBarcode.default(barcodeCanvas, patient.mrn, {
    format: 'CODE128', width: 1.5, height: 40,
    displayValue: true, fontSize: 10, margin: 2
  })
  const barcodeImg = barcodeCanvas.toDataURL('image/png')
  doc.addImage(barcodeImg, 'PNG', 7.2, 0.1, 3.6, 0.9)

  // Footer
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  doc.text(`SimEHR • Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm')} • SIMULATION ONLY - NOT FOR CLINICAL USE`, 0.25, 1.21)

  doc.save(`wristband_${patient.mrn}.pdf`)
}

async function generateBedsideCard(
  jsPDF: any, QRCode: any, JsBarcode: any,
  patient: Patient, encounterNumber: string, qrData: string, age: number
): Promise<void> {
  // Bedside card: 4" x 6" portrait
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: [4, 6] })

  // Header bar
  doc.setFillColor(0, 84, 166)
  doc.rect(0, 0, 4, 0.7, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PATIENT IDENTIFICATION', 0.15, 0.3)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('SIMULATION — NOT FOR CLINICAL USE', 0.15, 0.52)

  // Patient name
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`${patient.last_name}, ${patient.first_name}`, 0.15, 1.05)

  // Demographics box
  doc.setFillColor(243, 244, 246)
  doc.rect(0.1, 1.15, 3.8, 1.2, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)

  const demog = [
    [`MRN:`, patient.mrn],
    [`DOB:`, `${formatDate(patient.date_of_birth)} (Age: ${age})`],
    [`Sex:`, patient.sex],
    [`Blood Type:`, patient.blood_type ?? 'Unknown'],
    [`Code Status:`, patient.code_status],
    [`Room/Bed:`, `${patient.room_number} / ${patient.bed_number}`],
  ]

  demog.forEach(([label, value], i) => {
    const y = 1.35 + i * 0.17
    doc.setFont('helvetica', 'bold')
    doc.text(label, 0.2, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, 1.2, y)
  })

  // Allergies
  if (patient.allergies && patient.allergies.length > 0) {
    doc.setFillColor(254, 226, 226)
    doc.setDrawColor(220, 38, 38)
    doc.rect(0.1, 2.45, 3.8, 0.45, 'FD')
    doc.setTextColor(185, 28, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('⚠ ALLERGIES', 0.2, 2.62)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const allergyList = patient.allergies.map((a: any) => `${a.substance} (${a.reaction})`).join(' • ')
    doc.text(allergyList.substring(0, 58), 0.2, 0.78)
  }

  // Attending & Diagnosis
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Attending:', 0.15, 3.05)
  doc.setFont('helvetica', 'normal')
  doc.text(patient.attending_provider, 1.0, 3.05)
  doc.setFont('helvetica', 'bold')
  doc.text('Diagnosis:', 0.15, 3.22)
  doc.setFont('helvetica', 'normal')
  const diagLines = doc.splitTextToSize(patient.admitting_diagnosis ?? '', 2.8)
  doc.text(diagLines, 1.0, 3.22)

  // Encounter number
  doc.setFont('helvetica', 'bold')
  doc.text('Encounter:', 0.15, 3.5)
  doc.setFont('helvetica', 'normal')
  doc.text(encounterNumber, 1.0, 3.5)

  // QR Code
  const qrCanvas = document.createElement('canvas')
  await QRCode.default.toCanvas(qrCanvas, qrData, { width: 100, margin: 1 })
  const qrImg = qrCanvas.toDataURL('image/png')
  doc.addImage(qrImg, 'PNG', 0.15, 3.65, 1.2, 1.2)

  // Barcode
  const barcodeCanvas = document.createElement('canvas')
  JsBarcode.default(barcodeCanvas, patient.mrn, {
    format: 'CODE128', width: 1.5, height: 45,
    displayValue: true, fontSize: 10
  })
  const barcodeImg = barcodeCanvas.toDataURL('image/png')
  doc.addImage(barcodeImg, 'PNG', 1.5, 3.65, 2.35, 1.1)

  // Footer
  doc.setFontSize(6)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm')}`, 0.15, 5.92)

  doc.save(`bedside_card_${patient.mrn}.pdf`)
}

async function generateChartCover(
  jsPDF: any, QRCode: any, JsBarcode: any,
  patient: Patient, encounterNumber: string, qrData: string, age: number
): Promise<void> {
  // Chart cover: Letter size (8.5" x 11")
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' })

  // Header
  doc.setFillColor(0, 84, 166)
  doc.rect(0, 0, 8.5, 1.2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('SimEHR', 0.4, 0.5)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Nursing Simulation Electronic Health Record', 0.4, 0.78)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('SIMULATION PATIENT — NOT FOR CLINICAL USE', 0.4, 1.05)

  // Patient name large
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(`${patient.last_name}, ${patient.first_name}`, 0.4, 1.8)

  // MRN prominent
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`MRN: ${patient.mrn}`, 0.4, 2.15)

  // Details table
  const rows = [
    ['Date of Birth', formatDate(patient.date_of_birth), 'Age', `${age} years`],
    ['Sex', patient.sex, 'Blood Type', patient.blood_type ?? 'Unknown'],
    ['Admission Date', formatDate(patient.admission_date), 'Code Status', patient.code_status],
    ['Room / Bed', `${patient.room_number} / ${patient.bed_number}`, 'Encounter #', encounterNumber],
    ['Attending', patient.attending_provider, 'Insurance', patient.insurance ?? 'N/A'],
  ]

  let y = 2.45
  rows.forEach(([l1, v1, l2, v2]) => {
    doc.setFillColor(247, 248, 250)
    doc.rect(0.3, y, 7.9, 0.32, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text(l1, 0.4, y + 0.22)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(v1, 1.8, y + 0.22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 80)
    doc.text(l2, 4.5, y + 0.22)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(v2, 6.0, y + 0.22)
    y += 0.38
  })

  // Diagnosis
  y += 0.2
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Admitting Diagnosis:', 0.4, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const diagLines = doc.splitTextToSize(patient.admitting_diagnosis ?? '', 6.8)
  doc.text(diagLines, 0.4, y + 0.25)
  y += 0.25 + diagLines.length * 0.18

  // Allergies
  if (patient.allergies && patient.allergies.length > 0) {
    y += 0.2
    doc.setFillColor(254, 226, 226)
    doc.setDrawColor(220, 38, 38)
    doc.rect(0.3, y, 7.9, 0.5 + patient.allergies.length * 0.2, 'FD')
    doc.setTextColor(185, 28, 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('⚠ KNOWN ALLERGIES', 0.45, y + 0.3)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    patient.allergies.forEach((a: any, i: number) => {
      doc.text(`• ${a.substance}: ${a.reaction} [${a.severity}]`, 0.5, y + 0.5 + i * 0.22)
    })
    y += 0.6 + patient.allergies.length * 0.22
  }

  // Barcodes at bottom
  y = 8.5
  const qrCanvas = document.createElement('canvas')
  await QRCode.default.toCanvas(qrCanvas, qrData, { width: 120, margin: 1 })
  doc.addImage(qrCanvas.toDataURL('image/png'), 'PNG', 0.4, y, 1.5, 1.5)
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text('Scan QR to open chart', 0.4, y + 1.62)

  const barcodeCanvas = document.createElement('canvas')
  JsBarcode.default(barcodeCanvas, patient.mrn, { format: 'CODE128', width: 2, height: 60, displayValue: true, fontSize: 12 })
  doc.addImage(barcodeCanvas.toDataURL('image/png'), 'PNG', 2.2, y, 4.0, 1.5)

  // Emergency contact
  if (patient.emergency_contact_name) {
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(`Emergency Contact: ${patient.emergency_contact_name} — ${patient.emergency_contact_phone ?? ''}`, 0.4, 10.3)
  }

  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`SimEHR Nursing Simulation • Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm')} • FOR SIMULATION USE ONLY`, 0.4, 10.65)

  doc.save(`chart_cover_${patient.mrn}.pdf`)
}
