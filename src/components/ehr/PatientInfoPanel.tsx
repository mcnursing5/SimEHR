import { formatDate, calculateAge } from '@/lib/utils'


export default function PatientInfoPanel({ patient }: { patient: any }) {
  if (!patient) return (
    <div className="ehr-card p-10 text-center text-gray-400">No patient data</div>
  )

  const age = calculateAge(patient.date_of_birth)

  const rows = [
    ['First Name', patient.first_name],
    ['Last Name', patient.last_name],
    ['Date of Birth', `${formatDate(patient.date_of_birth)} (Age ${age})`],
    ['Sex', patient.sex],
    ['Blood Type', patient.blood_type ?? 'Unknown'],
    ['Weight', patient.weight_kg ? `${patient.weight_kg} kg (${(patient.weight_kg * 2.205).toFixed(1)} lbs)` : '—'],
    ['Height', patient.height_cm ? `${patient.height_cm} cm (${Math.floor(patient.height_cm / 30.48)}' ${Math.round((patient.height_cm % 30.48) / 2.54)}")` : '—'],
    ['MRN', patient.mrn],
    ['Room / Bed', `${patient.room_number} / ${patient.bed_number}`],
    ['Admission Date', formatDate(patient.admission_date)],
    ['Attending Provider', patient.attending_provider],
    ['Admitting Diagnosis', patient.admitting_diagnosis],
    ['Code Status', patient.code_status],
    ['Insurance', patient.insurance ?? 'N/A'],
  ]

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2">
        Patient Information
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Demographics */}
        <div className="ehr-card">
          <div className="ehr-card-header">
            <span className="font-semibold text-sm">Demographics &amp; Admission</span>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map(([label, value]) => (
              <div key={label} className="flex px-4 py-2 gap-4">
                <div className="w-40 text-xs font-medium text-gray-500 flex-shrink-0 pt-0.5">{label}</div>
                <div className={`text-sm text-gray-900 flex-1 ${label === 'Code Status' && patient.code_status !== 'Full Code' ? 'font-bold text-red-600' : ''}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Allergies */}
          <div className="ehr-card border-l-4 border-red-400">
            <div className="ehr-card-header bg-red-50">
              <span className="font-semibold text-sm text-red-700 flex items-center gap-2">
                 Allergies &amp; Adverse Reactions
              </span>
              <span className="badge badge-red">{patient.allergies?.length ?? 0}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {(!patient.allergies || patient.allergies.length === 0) && (
                <div className="px-4 py-3 text-sm text-gray-400">NKDA — No Known Drug Allergies</div>
              )}
              {patient.allergies?.map((a: any) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-red-700">{a.substance}</span>
                    <span className={`badge text-xs ${
                      a.severity === 'Life-threatening' ? 'badge-red' :
                      a.severity === 'Severe' ? 'badge-red' :
                      a.severity === 'Moderate' ? 'badge-amber' : 'badge-gray'
                    }`}>{a.severity}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Reaction: {a.reaction}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contact */}
          {patient.emergency_contact_name && (
            <div className="ehr-card">
              <div className="ehr-card-header">
                <span className="font-semibold text-sm flex items-center gap-2">
                  Emergency Contact
                </span>
              </div>
              <div className="px-4 py-3 space-y-1">
                <div className="text-sm font-medium">{patient.emergency_contact_name}</div>
                <div className="text-sm text-gray-500">{patient.emergency_contact_phone}</div>
              </div>
            </div>
          )}

          {/* Simulation Note */}
          <div className="bg-emerald-100 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
              Simulation Patient
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              This is a simulated patient for educational purposes. All data is fictional.
              Do not use for clinical decision-making.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
