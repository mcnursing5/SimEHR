import { calculateAge, formatDate } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

export default function PatientBanner({ patient, encounterNumber }: { patient: any, encounterNumber?: string }) {
  if (!patient) return null

  const age = calculateAge(patient.date_of_birth)
  const criticalAllergies = patient.allergies?.filter((a: any) =>
    a.severity === 'Life-threatening' || a.severity === 'Severe'
  )

  return (
    <div className="patient-banner flex-shrink-0">
      {/* Patient name & MRN */}
      <div>
        <div className="patient-banner-name">
          {patient.last_name}, {patient.first_name}
        </div>
        <div className="patient-banner-detail">MRN: {patient.mrn}</div>
      </div>

      <div className="w-px h-8 bg-emerald-400 opacity-50" />

      {/* Demographics */}
      <div>
        <div className="patient-banner-detail">DOB: {formatDate(patient.date_of_birth)}</div>
        <div className="patient-banner-detail">Age: {age}y · {patient.sex}</div>
      </div>

      <div className="w-px h-8 bg-emerald-400 opacity-50" />

      {/* Admission */}
      <div>
        <div className="patient-banner-detail">Room: {patient.room_number}-{patient.bed_number}</div>
        <div className="patient-banner-detail">Admitted: {formatDate(patient.admission_date)}</div>
      </div>

      <div className="w-px h-8 bg-emerald-400 opacity-50" />

      {/* Encounter */}
      <div>
        <div className="patient-banner-detail">Enc: {encounterNumber ?? '—'}</div>
        <div className="patient-banner-detail">{patient.attending_provider}</div>
      </div>

      <div className="w-px h-8 bg-emerald-400 opacity-50" />

      {/* Code status */}
      <div>
        <div className={`text-xs font-bold px-2 py-0.5 rounded ${
          patient.code_status === 'Full Code' ? 'bg-emerald-700 text-white' :
          patient.code_status.includes('DNR') ? 'bg-red-600 text-white' :
          'bg-amber-500 text-white'
        }`}>
          {patient.code_status}
        </div>
      </div>

      {/* Allergies alert */}
      {patient.allergies?.length > 0 && (
        <div className="ml-auto flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-lg">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold">ALLERGIES</div>
            <div className="text-xs">
              {patient.allergies.map((a: any) => a.substance).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Sim badge */}
      <div className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
        SIM ONLY
      </div>
    </div>
  )
}
