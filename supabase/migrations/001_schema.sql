-- ============================================================
-- MEDICAL SIMULATION EHR - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & PROFILES
-- ============================================================

-- Extend auth.users with profile data
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'faculty', 'student')),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.faculty_details (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  faculty_id TEXT UNIQUE NOT NULL DEFAULT ('FAC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8))),
  department TEXT,
  title TEXT
);

CREATE TABLE public.student_details (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL DEFAULT ('STU-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)))
);

-- ============================================================
-- ACADEMIC HIERARCHY
-- ============================================================

CREATE TABLE public.academic_years (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  year_label TEXT NOT NULL UNIQUE,   -- "2024-2025"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.semesters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (name IN ('Fall', 'Spring', 'Summer')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  UNIQUE(academic_year_id, name)
);

CREATE TABLE public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  semester_id UUID REFERENCES public.semesters(id) ON DELETE CASCADE NOT NULL,
  course_code TEXT NOT NULL,          -- "NURS 240"
  title TEXT NOT NULL,
  description TEXT,
  faculty_id UUID REFERENCES public.profiles(id) NOT NULL,
  max_students INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  UNIQUE(student_id, course_id)
);

-- ============================================================
-- SIMULATION REPOSITORY
-- ============================================================

CREATE TABLE public.simulation_scenarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'cardiac','respiratory','neurological','obstetric','pediatric',
    'trauma','sepsis','diabetes','renal','psychiatric','postoperative','general'
  )),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner','intermediate','advanced')),
  learning_objectives JSONB DEFAULT '[]',
  estimated_duration_minutes INTEGER DEFAULT 60,
  created_by UUID REFERENCES public.profiles(id),
  is_published BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATIENTS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS mrn_seq START 100001;

CREATE TABLE public.patients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scenario_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE UNIQUE NOT NULL,
  mrn TEXT UNIQUE NOT NULL DEFAULT ('SIM-' || NEXTVAL('mrn_seq')::TEXT),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  blood_type TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,1),
  room_number TEXT,
  bed_number TEXT,
  admission_date DATE,
  attending_provider TEXT,
  admitting_diagnosis TEXT,
  code_status TEXT DEFAULT 'Full Code' CHECK (code_status IN (
    'Full Code','DNR','DNI','DNR/DNI','Comfort Care'
  )),
  allergies JSONB DEFAULT '[]',
  insurance TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEDICATIONS (per scenario)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS ndc_seq START 50000100;

CREATE TABLE public.medications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scenario_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE NOT NULL,
  generic_name TEXT NOT NULL,
  brand_name TEXT,
  drug_class TEXT,
  ndc_code TEXT UNIQUE NOT NULL DEFAULT (
    LPAD((NEXTVAL('ndc_seq') % 99999)::TEXT, 5, '0') || '-' ||
    LPAD((FLOOR(RANDOM()*9999))::TEXT, 4, '0') || '-' ||
    LPAD((FLOOR(RANDOM()*99))::TEXT, 2, '0')
  ),
  dose TEXT NOT NULL,
  route TEXT NOT NULL,
  frequency TEXT NOT NULL,
  indication TEXT,
  special_instructions TEXT,
  is_prn BOOLEAN DEFAULT false,
  barcode_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LAB RESULTS (per scenario - faculty defined)
-- ============================================================

CREATE TABLE public.lab_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scenario_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE NOT NULL,
  panel_name TEXT NOT NULL,
  collected_at TIMESTAMPTZ,
  resulted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lab_components (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lab_result_id UUID REFERENCES public.lab_results(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  reference_low TEXT,
  reference_high TEXT,
  is_critical BOOLEAN DEFAULT false,
  flag TEXT CHECK (flag IN ('H','L','HH','LL','A'))
);

-- ============================================================
-- ORDERS (per scenario - faculty defined)
-- ============================================================

CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scenario_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN (
    'medication','lab','imaging','nursing','diet','activity','consult','iv_fluid'
  )),
  description TEXT NOT NULL,
  details TEXT,
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  ordered_by TEXT NOT NULL,
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  frequency TEXT,
  duration TEXT,
  special_instructions TEXT
);

-- ============================================================
-- COURSE <-> SIMULATION ASSIGNMENTS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS encounter_seq START 200001;

CREATE TABLE public.course_simulations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  scenario_id UUID REFERENCES public.simulation_scenarios(id) NOT NULL,
  encounter_number TEXT NOT NULL DEFAULT ('ENC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || NEXTVAL('encounter_seq')::TEXT),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  active_from TIMESTAMPTZ,
  active_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  instructions TEXT,
  UNIQUE(course_id, scenario_id)
);

-- ============================================================
-- STUDENT SESSIONS
-- ============================================================

CREATE TABLE public.student_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) NOT NULL,
  course_simulation_id UUID REFERENCES public.course_simulations(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'not_started' CHECK (status IN (
    'not_started','in_progress','completed','submitted'
  )),
  UNIQUE(student_id, course_simulation_id)
);

-- ============================================================
-- VITAL SIGNS (student charted)
-- ============================================================

CREATE TABLE public.vital_signs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.student_sessions(id) ON DELETE CASCADE NOT NULL,
  recorded_by UUID REFERENCES public.profiles(id) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  temperature_c NUMERIC(4,1),
  spo2 INTEGER,
  pain_scale INTEGER CHECK (pain_scale BETWEEN 0 AND 10),
  weight_kg NUMERIC(5,2),
  blood_glucose INTEGER,
  notes TEXT
);

-- ============================================================
-- MAR - MEDICATION ADMINISTRATION RECORDS (student charted)
-- ============================================================

CREATE TABLE public.mar_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.student_sessions(id) ON DELETE CASCADE NOT NULL,
  medication_id UUID REFERENCES public.medications(id) NOT NULL,
  administered_by UUID REFERENCES public.profiles(id) NOT NULL,
  administered_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_time TIMESTAMPTZ,
  dose_given TEXT NOT NULL,
  route_used TEXT NOT NULL,
  site TEXT,
  patient_scanned BOOLEAN DEFAULT false,
  medication_scanned BOOLEAN DEFAULT false,
  scan_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('given','held','refused','not_available','see_note')),
  hold_reason TEXT,
  notes TEXT
);

-- ============================================================
-- STUDENT ORDERS (student acknowledgement)
-- ============================================================

CREATE TABLE public.student_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.student_sessions(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','acknowledged','in_progress','completed','cancelled','on_hold'
  )),
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, order_id)
);

-- ============================================================
-- PROGRESS NOTES (student charted)
-- ============================================================

CREATE TABLE public.progress_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.student_sessions(id) ON DELETE CASCADE NOT NULL,
  written_by UUID REFERENCES public.profiles(id) NOT NULL,
  written_at TIMESTAMPTZ DEFAULT NOW(),
  note_type TEXT NOT NULL CHECK (note_type IN (
    'SBAR','SOAP','shift_assessment','handoff','event_note','procedure_note'
  )),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_notes ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin or faculty
CREATE OR REPLACE FUNCTION public.is_faculty_or_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin','faculty') FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: users see their own; faculty/admin see all
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_faculty_or_admin());

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ACADEMIC YEARS / SEMESTERS: everyone can read; only faculty/admin can write
CREATE POLICY "academic_years_read" ON public.academic_years FOR SELECT USING (true);
CREATE POLICY "academic_years_write" ON public.academic_years FOR ALL
  USING (public.is_faculty_or_admin());

CREATE POLICY "semesters_read" ON public.semesters FOR SELECT USING (true);
CREATE POLICY "semesters_write" ON public.semesters FOR ALL
  USING (public.is_faculty_or_admin());

-- COURSES: faculty see their courses; students see enrolled courses
CREATE POLICY "courses_faculty_all" ON public.courses FOR ALL
  USING (faculty_id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "courses_student_select" ON public.courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = id AND e.student_id = auth.uid() AND e.status = 'active'
    )
  );

-- ENROLLMENTS
CREATE POLICY "enrollments_faculty" ON public.enrollments FOR ALL
  USING (
    public.is_faculty_or_admin() OR student_id = auth.uid()
  );

-- SIMULATION SCENARIOS: published ones visible to all; unpublished only to creator/admin
CREATE POLICY "scenarios_published_read" ON public.simulation_scenarios FOR SELECT
  USING (is_published = true OR created_by = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "scenarios_write" ON public.simulation_scenarios FOR ALL
  USING (created_by = auth.uid() OR public.get_user_role() = 'admin');

-- PATIENTS, MEDS, LABS, ORDERS: accessible if user can access the scenario
CREATE POLICY "patients_read" ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.simulation_scenarios s
      WHERE s.id = scenario_id AND (s.is_published = true OR s.created_by = auth.uid())
    )
  );
CREATE POLICY "patients_write" ON public.patients FOR ALL
  USING (public.is_faculty_or_admin());

CREATE POLICY "medications_read" ON public.medications FOR SELECT USING (true);
CREATE POLICY "medications_write" ON public.medications FOR ALL USING (public.is_faculty_or_admin());

CREATE POLICY "lab_results_read" ON public.lab_results FOR SELECT USING (true);
CREATE POLICY "lab_results_write" ON public.lab_results FOR ALL USING (public.is_faculty_or_admin());

CREATE POLICY "lab_components_read" ON public.lab_components FOR SELECT USING (true);
CREATE POLICY "lab_components_write" ON public.lab_components FOR ALL USING (public.is_faculty_or_admin());

CREATE POLICY "orders_read" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_write" ON public.orders FOR ALL USING (public.is_faculty_or_admin());

-- COURSE SIMULATIONS
CREATE POLICY "course_sims_faculty" ON public.course_simulations FOR ALL
  USING (public.is_faculty_or_admin());

CREATE POLICY "course_sims_student_select" ON public.course_simulations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.courses c ON c.id = e.course_id
      WHERE c.id = course_id AND e.student_id = auth.uid() AND e.status = 'active'
    )
  );

-- STUDENT SESSIONS
CREATE POLICY "sessions_own" ON public.student_sessions FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "sessions_faculty_read" ON public.student_sessions FOR SELECT
  USING (public.is_faculty_or_admin());

-- CLINICAL DATA (vital signs, MAR, orders, notes)
CREATE POLICY "vitals_own" ON public.vital_signs FOR ALL
  USING (
    recorded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.student_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()) OR
    public.is_faculty_or_admin()
  );

CREATE POLICY "mar_own" ON public.mar_entries FOR ALL
  USING (
    administered_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.student_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()) OR
    public.is_faculty_or_admin()
  );

CREATE POLICY "student_orders_own" ON public.student_orders FOR ALL
  USING (
    acknowledged_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.student_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()) OR
    public.is_faculty_or_admin()
  );

CREATE POLICY "notes_own" ON public.progress_notes FOR ALL
  USING (
    written_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.student_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()) OR
    public.is_faculty_or_admin()
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_scenarios_updated_at BEFORE UPDATE ON public.simulation_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-initialize student orders when a session starts
CREATE OR REPLACE FUNCTION public.initialize_student_orders()
RETURNS TRIGGER AS $$
DECLARE
  v_scenario_id UUID;
BEGIN
  -- Get the scenario_id for this course simulation
  SELECT cs.scenario_id INTO v_scenario_id
  FROM public.course_simulations cs
  WHERE cs.id = NEW.course_simulation_id;

  -- Insert a student_order row for every order in the scenario
  INSERT INTO public.student_orders (session_id, order_id, status)
  SELECT NEW.id, o.id, 'pending'
  FROM public.orders o
  WHERE o.scenario_id = v_scenario_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_created
  AFTER INSERT ON public.student_sessions
  FOR EACH ROW EXECUTE FUNCTION public.initialize_student_orders();
