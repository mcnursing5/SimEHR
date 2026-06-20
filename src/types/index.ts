// ============================================================
// CORE USER TYPES
// ============================================================

export type UserRole = 'admin' | 'faculty' | 'student'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
  last_login?: string
  avatar_url?: string
}

export interface StudentProfile extends User {
  student_id: string
  enrollments: Enrollment[]
}

export interface FacultyProfile extends User {
  faculty_id: string
  department?: string
  title?: string
}

// ============================================================
// ACADEMIC HIERARCHY
// ============================================================

export interface AcademicYear {
  id: string
  year_label: string       // e.g. "2024-2025"
  start_date: string
  end_date: string
  is_active: boolean
  created_by: string
  created_at: string
}

export interface Semester {
  id: string
  academic_year_id: string
  name: string             // "Fall" | "Spring" | "Summer"
  start_date: string
  end_date: string
  is_active: boolean
  academic_year?: AcademicYear
}

export interface Course {
  id: string
  semester_id: string
  course_code: string      // e.g. "NURS 240"
  title: string            // e.g. "Fundamentals of Nursing Practice"
  description: string
  faculty_id: string
  max_students?: number
  is_active: boolean
  created_at: string
  semester?: Semester
  faculty?: FacultyProfile
  enrollment_count?: number
  simulation_count?: number
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  status: 'active' | 'dropped' | 'completed'
  course?: Course
  student?: StudentProfile
}

// ============================================================
// SIMULATION REPOSITORY
// ============================================================

export type SimulationCategory =
  | 'cardiac'
  | 'respiratory'
  | 'neurological'
  | 'obstetric'
  | 'pediatric'
  | 'trauma'
  | 'sepsis'
  | 'diabetes'
  | 'renal'
  | 'psychiatric'
  | 'postoperative'
  | 'general'

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface SimulationScenario {
  id: string
  title: string
  description: string
  category: SimulationCategory
  difficulty: DifficultyLevel
  learning_objectives: string[]
  estimated_duration_minutes: number
  created_by: string
  is_published: boolean
  is_archived: boolean
  tags: string[]
  created_at: string
  updated_at: string
  patient?: Patient
  creator?: FacultyProfile
}

// ============================================================
// PATIENT
// ============================================================

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type Sex = 'Male' | 'Female' | 'Other'
export type CodeStatus = 'Full Code' | 'DNR' | 'DNI' | 'DNR/DNI' | 'Comfort Care'

export interface Allergy {
  id: string
  substance: string
  reaction: string
  severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening'
}

export interface Patient {
  id: string
  scenario_id: string
  mrn: string              // Auto-generated
  first_name: string
  last_name: string
  date_of_birth: string
  sex: Sex
  blood_type: BloodType
  weight_kg: number
  height_cm: number
  room_number: string
  bed_number: string
  admission_date: string
  attending_provider: string
  admitting_diagnosis: string
  code_status: CodeStatus
  allergies: Allergy[]
  insurance?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  created_at: string
}

// ============================================================
// COURSE SIMULATION ASSIGNMENT
// ============================================================

export interface CourseSimulation {
  id: string
  course_id: string
  scenario_id: string
  encounter_number: string   // Auto-generated per assignment
  assigned_by: string
  assigned_at: string
  active_from?: string
  active_until?: string
  is_active: boolean
  instructions?: string
  course?: Course
  scenario?: SimulationScenario
}

// ============================================================
// STUDENT SIMULATION SESSION
// ============================================================

export interface StudentSession {
  id: string
  student_id: string
  course_simulation_id: string
  started_at: string
  last_active_at: string
  completed_at?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted'
  course_simulation?: CourseSimulation
}

// ============================================================
// EHR CLINICAL DATA
// ============================================================

// Vital Signs
export interface VitalSign {
  id: string
  session_id: string
  recorded_by: string
  recorded_at: string
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  respiratory_rate?: number
  temperature_c?: number
  spo2?: number
  pain_scale?: number        // 0-10
  weight_kg?: number
  blood_glucose?: number
  notes?: string
}

// Medication (from scenario)
export interface Medication {
  id: string
  scenario_id: string
  generic_name: string
  brand_name?: string
  drug_class: string
  ndc_code: string           // National Drug Code - used for barcode
  dose: string
  route: string              // PO, IV, IM, SQ, etc.
  frequency: string          // Q4H, BID, PRN, etc.
  indication: string
  special_instructions?: string
  is_prn: boolean
  barcode_value: string      // what the barcode encodes
}

// MAR Entry
export interface MAREntry {
  id: string
  session_id: string
  medication_id: string
  administered_by: string
  administered_at: string
  scheduled_time?: string
  dose_given: string
  route_used: string
  site?: string
  patient_scanned: boolean
  medication_scanned: boolean
  scan_verified_at?: string
  status: 'given' | 'held' | 'refused' | 'not_available' | 'see_note'
  hold_reason?: string
  notes?: string
  medication?: Medication
}

// Lab Result
export interface LabResult {
  id: string
  scenario_id: string
  panel_name: string         // "CBC", "BMP", "ABG", etc.
  collected_at: string
  resulted_at: string
  components: LabComponent[]
}

export interface LabComponent {
  id: string
  lab_result_id: string
  name: string               // "WBC", "Hemoglobin", etc.
  value: string
  unit: string
  reference_low?: string
  reference_high?: string
  is_critical: boolean
  flag?: 'H' | 'L' | 'HH' | 'LL' | 'A'  // High, Low, Critical High, Critical Low, Abnormal
}

// Orders
export type OrderStatus = 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type OrderType = 'medication' | 'lab' | 'imaging' | 'nursing' | 'diet' | 'activity' | 'consult' | 'iv_fluid'

export interface Order {
  id: string
  scenario_id: string
  order_type: OrderType
  description: string
  details: string
  priority: 'routine' | 'urgent' | 'stat'
  ordered_by: string
  ordered_at: string
  frequency?: string
  duration?: string
  special_instructions?: string
}

export interface StudentOrder {
  id: string
  session_id: string
  order_id: string
  acknowledged_by?: string
  acknowledged_at?: string
  status: OrderStatus
  completion_notes?: string
  completed_at?: string
  order?: Order
}

// Progress Notes
export type NoteType = 'SBAR' | 'SOAP' | 'shift_assessment' | 'handoff' | 'event_note' | 'procedure_note'

export interface ProgressNote {
  id: string
  session_id: string
  written_by: string
  written_at: string
  note_type: NoteType
  title: string
  content: NoteContent
  is_signed: boolean
  signed_at?: string
}

export interface NoteContent {
  // SBAR
  situation?: string
  background?: string
  assessment?: string
  recommendation?: string
  // SOAP
  subjective?: string
  objective?: string
  plan?: string
  // Free text for other types
  body?: string
}

// ============================================================
// LABEL GENERATION
// ============================================================

export interface PatientLabel {
  patient: Patient
  encounter_number: string
  barcode_mrn: string        // Code 128 value
  qr_data: string            // QR code JSON payload
  generated_at: string
}

export type LabelFormat = 'wristband' | 'bedside_card' | 'chart_cover'

// ============================================================
// DASHBOARD SUMMARY TYPES
// ============================================================

export interface FacultyDashboard {
  total_courses: number
  active_courses: number
  total_students: number
  active_simulations: number
  recent_sessions: StudentSession[]
}

export interface StudentDashboard {
  enrolled_courses: Course[]
  active_simulations: CourseSimulation[]
  recent_sessions: StudentSession[]
  completed_simulations: number
}
