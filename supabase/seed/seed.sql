-- ============================================================
-- SEED DATA - Run AFTER 001_schema.sql
-- Creates sample academic structure + simulation scenarios
-- ============================================================

-- You must first create an admin user via Supabase Auth dashboard
-- then update this UUID with the actual admin user's ID
-- Replace 'YOUR-ADMIN-UUID' below after creating your first admin

DO $$
DECLARE
  admin_id UUID;
  year_id UUID;
  fall_id UUID;
  spring_id UUID;
  scenario1_id UUID;
  scenario2_id UUID;
  scenario3_id UUID;
  patient1_id UUID;
  patient2_id UUID;
  patient3_id UUID;
BEGIN

-- ============================================================
-- ACADEMIC YEAR & SEMESTERS
-- ============================================================

INSERT INTO public.academic_years (year_label, start_date, end_date, is_active)
VALUES ('2024-2025', '2024-08-01', '2025-07-31', true)
RETURNING id INTO year_id;

INSERT INTO public.semesters (academic_year_id, name, start_date, end_date, is_active)
VALUES (year_id, 'Fall', '2024-08-26', '2024-12-15', true)
RETURNING id INTO fall_id;

INSERT INTO public.semesters (academic_year_id, name, start_date, end_date, is_active)
VALUES (year_id, 'Spring', '2025-01-13', '2025-05-10', false);

-- ============================================================
-- SIMULATION SCENARIOS
-- ============================================================

-- Scenario 1: Chest Pain / STEMI
INSERT INTO public.simulation_scenarios (
  title, description, category, difficulty,
  learning_objectives, estimated_duration_minutes,
  is_published, tags
)
VALUES (
  'Acute STEMI - John Martinez',
  'A 58-year-old male presents to the ED with crushing chest pain radiating to his left arm. ECG shows ST-elevation in leads II, III, aVF. Student must perform rapid assessment, administer ordered medications, and communicate using SBAR.',
  'cardiac', 'intermediate',
  '["Perform rapid cardiovascular assessment", "Identify STEMI on 12-lead ECG", "Administer cardiac medications safely", "Communicate effectively using SBAR", "Prioritize interventions for ACS"]',
  90, true, '["chest pain", "STEMI", "cardiac", "ACS", "ED"]'
)
RETURNING id INTO scenario1_id;

-- Patient for Scenario 1
INSERT INTO public.patients (
  scenario_id, first_name, last_name, date_of_birth, sex,
  blood_type, weight_kg, height_cm, room_number, bed_number,
  admission_date, attending_provider, admitting_diagnosis,
  code_status, allergies, insurance, emergency_contact_name, emergency_contact_phone
)
VALUES (
  scenario1_id, 'John', 'Martinez', '1966-04-12', 'Male',
  'O+', 88.5, 178.0, '3B', '302-A',
  CURRENT_DATE, 'Dr. Sarah Chen, MD', 'Acute ST-Elevation Myocardial Infarction (STEMI)',
  'Full Code',
  '[{"id":"a1","substance":"Penicillin","reaction":"Hives, urticaria","severity":"Moderate"},{"id":"a2","substance":"Ibuprofen","reaction":"GI upset","severity":"Mild"}]',
  'BlueCross BlueShield', 'Maria Martinez', '555-867-5309'
);

-- Medications for Scenario 1
INSERT INTO public.medications (scenario_id, generic_name, brand_name, drug_class, dose, route, frequency, indication, is_prn, barcode_value)
VALUES
  (scenario1_id, 'Aspirin', 'Bayer', 'Antiplatelet', '325 mg', 'PO', 'Once (loading)', 'Antiplatelet for ACS', false, 'MED-ASA-325'),
  (scenario1_id, 'Nitroglycerin', 'Nitrostat', 'Nitrate/Vasodilator', '0.4 mg SL', 'SL', 'Q5min x3 PRN', 'Chest pain relief', true, 'MED-NTG-004'),
  (scenario1_id, 'Heparin', 'Heparin Sodium', 'Anticoagulant', '60 units/kg IV bolus, max 4000 units', 'IV', 'Once then infusion', 'ACS anticoagulation', false, 'MED-HEP-60U'),
  (scenario1_id, 'Morphine', 'MS Contin', 'Opioid Analgesic', '2-4 mg IV', 'IV', 'Q4-6H PRN', 'Pain management', true, 'MED-MOR-4MG'),
  (scenario1_id, 'Metoprolol', 'Lopressor', 'Beta Blocker', '25 mg', 'PO', 'BID', 'Rate control, cardioprotection', false, 'MED-MET-25MG');

-- Labs for Scenario 1
INSERT INTO public.lab_results (scenario_id, panel_name, collected_at, resulted_at)
VALUES
  (scenario1_id, 'Troponin I (High Sensitivity)', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
  (scenario1_id, 'Basic Metabolic Panel', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
  (scenario1_id, 'CBC', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
  (scenario1_id, 'Coagulation Panel (PT/INR/PTT)', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour');

-- Lab components (Troponin)
WITH lr AS (SELECT id FROM public.lab_results WHERE scenario_id = scenario1_id AND panel_name = 'Troponin I (High Sensitivity)' LIMIT 1)
INSERT INTO public.lab_components (lab_result_id, name, value, unit, reference_low, reference_high, is_critical, flag)
SELECT lr.id, 'Troponin I', '4.82', 'ng/mL', '0.00', '0.04', true, 'HH' FROM lr;

-- Orders for Scenario 1
INSERT INTO public.orders (scenario_id, order_type, description, details, priority, ordered_by, frequency)
VALUES
  (scenario1_id, 'nursing', '12-Lead ECG', 'Obtain stat 12-lead ECG and transmit to cardiology', 'stat', 'Dr. Sarah Chen', 'Once, then Q1H x3'),
  (scenario1_id, 'nursing', 'IV Access x2', 'Establish two large-bore peripheral IVs (18g or larger)', 'stat', 'Dr. Sarah Chen', 'Once'),
  (scenario1_id, 'nursing', 'Continuous Cardiac Monitor', 'Apply telemetry leads, monitor for arrhythmias', 'stat', 'Dr. Sarah Chen', 'Continuous'),
  (scenario1_id, 'nursing', 'Oxygen Administration', 'O2 2L/NC, titrate to SpO2 > 94%', 'urgent', 'Dr. Sarah Chen', 'Continuous'),
  (scenario1_id, 'nursing', 'Vital Signs', 'VS Q15min until stable, then Q1H', 'stat', 'Dr. Sarah Chen', 'Q15min'),
  (scenario1_id, 'lab', 'Serial Troponins', 'Troponin I at 0, 3, and 6 hours', 'stat', 'Dr. Sarah Chen', 'Q3H x3'),
  (scenario1_id, 'imaging', 'Portable Chest X-Ray', 'AP portable CXR - assess for pulmonary edema', 'urgent', 'Dr. Sarah Chen', 'Once'),
  (scenario1_id, 'consult', 'Cardiology Consult', 'Urgent cath lab activation for STEMI', 'stat', 'Dr. Sarah Chen', 'Once');

-- ============================================================
-- Scenario 2: Sepsis
-- ============================================================

INSERT INTO public.simulation_scenarios (
  title, description, category, difficulty,
  learning_objectives, estimated_duration_minutes,
  is_published, tags
)
VALUES (
  'Septic Shock - Eleanor Thompson',
  'A 72-year-old female admitted from a nursing home with altered mental status, fever, and hypotension. Urine culture pending. Student must recognize sepsis criteria, initiate the Sepsis Bundle, and reassess response to treatment.',
  'sepsis', 'advanced',
  '["Identify systemic inflammatory response criteria (SIRS)", "Apply the SEP-1 Sepsis Bundle", "Manage fluid resuscitation", "Interpret lactate and culture results", "Reassess hemodynamic response"]',
  75, true, '["sepsis", "septic shock", "fluid resuscitation", "bundle", "elderly"]'
)
RETURNING id INTO scenario2_id;

INSERT INTO public.patients (
  scenario_id, first_name, last_name, date_of_birth, sex,
  blood_type, weight_kg, height_cm, room_number, bed_number,
  admission_date, attending_provider, admitting_diagnosis,
  code_status, allergies
)
VALUES (
  scenario2_id, 'Eleanor', 'Thompson', '1952-09-03', 'Female',
  'A+', 62.0, 162.0, '5C', '510-B',
  CURRENT_DATE, 'Dr. James Okafor, MD', 'Septic Shock, Suspected Urosepsis',
  'DNR',
  '[{"id":"a1","substance":"Sulfa drugs","reaction":"Anaphylaxis","severity":"Life-threatening"},{"id":"a2","substance":"Latex","reaction":"Contact dermatitis","severity":"Mild"}]'
);

INSERT INTO public.medications (scenario_id, generic_name, brand_name, drug_class, dose, route, frequency, indication, is_prn, barcode_value)
VALUES
  (scenario2_id, 'Normal Saline 0.9%', 'NS', 'IV Fluid', '30 mL/kg IV bolus (1860 mL)', 'IV', 'Over 3 hours, then reassess', 'Fluid resuscitation for septic shock', false, 'MED-NS-30MLK'),
  (scenario2_id, 'Vancomycin', 'Vancocin', 'Glycopeptide Antibiotic', '15-20 mg/kg IV (1250 mg)', 'IV', 'Q12H', 'Broad spectrum antibiotic coverage', false, 'MED-VAN-1250'),
  (scenario2_id, 'Piperacillin-Tazobactam', 'Zosyn', 'Beta-lactam/Beta-lactamase inhibitor', '4.5 g IV', 'IV', 'Q6H', 'Gram-negative coverage', false, 'MED-PTZ-4500'),
  (scenario2_id, 'Norepinephrine', 'Levophed', 'Vasopressor', '0.1-0.3 mcg/kg/min', 'IV', 'Continuous infusion, titrate to MAP > 65', 'Vasopressor for refractory hypotension', false, 'MED-NOR-0P1'),
  (scenario2_id, 'Acetaminophen', 'Tylenol', 'Antipyretic/Analgesic', '650 mg', 'PO/PR', 'Q6H PRN', 'Fever and pain management', true, 'MED-APAP-650');

-- ============================================================
-- Scenario 3: Postpartum Hemorrhage (OB)
-- ============================================================

INSERT INTO public.simulation_scenarios (
  title, description, category, difficulty,
  learning_objectives, estimated_duration_minutes,
  is_published, tags
)
VALUES (
  'Postpartum Hemorrhage - Aisha Williams',
  'A 28-year-old G2P2 female, 2 hours post vaginal delivery with uterine atony and 900 mL estimated blood loss. Student must identify PPH, perform fundal massage, administer uterotonics, and escalate appropriately.',
  'obstetric', 'advanced',
  '["Identify risk factors and signs of PPH", "Perform uterine fundal assessment and massage", "Administer uterotonic medications correctly", "Communicate obstetric emergency using SBAR", "Recognize hemodynamic instability and escalate"]',
  60, true, '["postpartum", "hemorrhage", "OB", "uterotonic", "atony"]'
)
RETURNING id INTO scenario3_id;

INSERT INTO public.patients (
  scenario_id, first_name, last_name, date_of_birth, sex,
  blood_type, weight_kg, height_cm, room_number, bed_number,
  admission_date, attending_provider, admitting_diagnosis,
  code_status, allergies
)
VALUES (
  scenario3_id, 'Aisha', 'Williams', '1996-02-14', 'Female',
  'B+', 71.5, 165.0, '2-OB', '204-A',
  CURRENT_DATE, 'Dr. Priya Sharma, MD/OB', 'Postpartum Hemorrhage - Uterine Atony',
  'Full Code',
  '[{"id":"a1","substance":"Codeine","reaction":"Nausea, vomiting","severity":"Mild"}]'
);

INSERT INTO public.medications (scenario_id, generic_name, brand_name, drug_class, dose, route, frequency, indication, is_prn, barcode_value)
VALUES
  (scenario3_id, 'Oxytocin', 'Pitocin', 'Uterotonic', '40 units in 1L NS', 'IV', 'Continuous at 125 mL/hr', 'Uterine atony, postpartum hemorrhage', false, 'MED-OXY-40U'),
  (scenario3_id, 'Methylergonovine', 'Methergine', 'Ergot alkaloid/Uterotonic', '0.2 mg IM', 'IM', 'Q2-4H PRN x5 doses', 'Refractory uterine atony', true, 'MED-METH-02'),
  (scenario3_id, 'Carboprost Tromethamine', 'Hemabate', 'Prostaglandin/Uterotonic', '250 mcg IM', 'IM', 'Q15-90min PRN (max 8 doses)', 'Refractory PPH', true, 'MED-CARB-250'),
  (scenario3_id, 'Tranexamic Acid', 'Cyklokapron', 'Antifibrinolytic', '1 g IV over 10 min', 'IV', 'Once (within 3 hrs of delivery)', 'Hemorrhage reduction', false, 'MED-TXA-1G'),
  (scenario3_id, 'Lactated Ringers', 'LR', 'IV Fluid/Crystalloid', '1000 mL', 'IV', 'Bolus over 15 min, repeat x2 PRN', 'Volume resuscitation', true, 'MED-LR-1000');

END $$;
