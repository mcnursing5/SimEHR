import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInYears } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date/Time ──────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MM/dd/yyyy')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MM/dd/yyyy HH:mm')
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function calculateAge(dob: string): number {
  return differenceInYears(new Date(), new Date(dob))
}

// ── ID Generation ──────────────────────────────────────────
export function generateMRN(): string {
  const num = Math.floor(100000 + Math.random() * 900000)
  return `SIM-${num}`
}

export function generateEncounterNumber(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const seq = Math.floor(1000 + Math.random() * 9000)
  return `ENC-${date}-${seq}`
}

export function generateNDC(): string {
  const labeler = String(Math.floor(10000 + Math.random() * 89999))
  const product = String(Math.floor(1000 + Math.random() * 8999))
  const pkg = String(Math.floor(10 + Math.random() * 89))
  return `${labeler}-${product}-${pkg}`
}

// ── Vital Sign Interpretation ──────────────────────────────
export type VitalStatus = 'normal' | 'warning' | 'critical'

export interface VitalRange {
  status: VitalStatus
  label: string
}

export function interpretSystolicBP(val: number): VitalRange {
  if (val < 90) return { status: 'critical', label: 'Hypotensive' }
  if (val < 100) return { status: 'warning', label: 'Low-Normal' }
  if (val <= 139) return { status: 'normal', label: 'Normal' }
  if (val <= 159) return { status: 'warning', label: 'Elevated' }
  return { status: 'critical', label: 'Hypertensive Crisis' }
}

export function interpretHeartRate(val: number): VitalRange {
  if (val < 40) return { status: 'critical', label: 'Critical Bradycardia' }
  if (val < 60) return { status: 'warning', label: 'Bradycardia' }
  if (val <= 100) return { status: 'normal', label: 'Normal' }
  if (val <= 120) return { status: 'warning', label: 'Tachycardia' }
  return { status: 'critical', label: 'Severe Tachycardia' }
}

export function interpretSpO2(val: number): VitalRange {
  if (val < 88) return { status: 'critical', label: 'Critical Hypoxia' }
  if (val < 94) return { status: 'warning', label: 'Low' }
  return { status: 'normal', label: 'Normal' }
}

export function interpretTemperature(val: number): VitalRange {
  if (val < 35.0) return { status: 'critical', label: 'Hypothermia' }
  if (val < 36.0) return { status: 'warning', label: 'Low' }
  if (val <= 37.5) return { status: 'normal', label: 'Normal' }
  if (val <= 38.5) return { status: 'warning', label: 'Low-grade Fever' }
  if (val <= 40.0) return { status: 'warning', label: 'Fever' }
  return { status: 'critical', label: 'Hyperpyrexia' }
}

export function interpretRR(val: number): VitalRange {
  if (val < 8) return { status: 'critical', label: 'Bradypnea' }
  if (val < 12) return { status: 'warning', label: 'Low' }
  if (val <= 20) return { status: 'normal', label: 'Normal' }
  if (val <= 25) return { status: 'warning', label: 'Tachypnea' }
  return { status: 'critical', label: 'Severe Tachypnea' }
}

// ── Temperature Conversion ─────────────────────────────────
export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9/5 + 32) * 10) / 10
}

export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5/9) * 10) / 10
}

// ── Lab Flag Colors ────────────────────────────────────────
export function getLabFlagColor(flag?: string): string {
  switch (flag) {
    case 'HH': case 'LL': return 'text-red-600 font-bold'
    case 'H': case 'L': return 'text-amber-600 font-semibold'
    case 'A': return 'text-orange-600 font-semibold'
    default: return 'text-gray-900'
  }
}

// ── String Helpers ─────────────────────────────────────────
export function fullName(first: string, last: string): string {
  return `${last}, ${first}`
}

export function initials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function titleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Category Colors ────────────────────────────────────────
export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    cardiac: 'bg-red-100 text-red-700',
    respiratory: 'bg-emerald-100 text-emerald-700',
    neurological: 'bg-purple-100 text-purple-700',
    obstetric: 'bg-pink-100 text-pink-700',
    pediatric: 'bg-yellow-100 text-yellow-700',
    trauma: 'bg-orange-100 text-orange-700',
    sepsis: 'bg-red-100 text-red-800',
    diabetes: 'bg-teal-100 text-teal-700',
    renal: 'bg-cyan-100 text-cyan-700',
    psychiatric: 'bg-violet-100 text-violet-700',
    postoperative: 'bg-slate-100 text-slate-700',
    general: 'bg-gray-100 text-gray-700',
  }
  return map[category] ?? 'bg-gray-100 text-gray-700'
}

export function getDifficultyColor(difficulty: string): string {
  const map: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-red-100 text-red-700',
  }
  return map[difficulty] ?? 'bg-gray-100 text-gray-700'
}
