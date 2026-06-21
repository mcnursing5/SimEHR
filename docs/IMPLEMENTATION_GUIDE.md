# SimEHR — Complete Implementation Guide
## Medical Simulation Electronic Health Record System

---

## Table of Contents
1. System Overview
2. Tech Stack
3. Prerequisites
4. Step-by-Step Setup
5. Supabase Configuration
6. Deploying to Vercel
7. First-Time Admin Setup
8. Faculty Workflow
9. Student Workflow
10. Barcode Scanning Guide
11. Patient Label Printing
12. Troubleshooting
13. File Structure Reference

---

## 1. System Overview

SimEHR is a full-featured Medical simulation EHR system built on:
- **Next.js 14** (React framework)
- **Supabase** (PostgreSQL database, authentication, row-level security)
- **Vercel** (hosting — free tier)
- **ZXing.js** (camera barcode/QR scanning)
- **jsPDF + QRCode.js + JsBarcode** (label PDF generation)

### Access Hierarchy
```
Admin
  └── Creates academic years and semesters
  └── Manages all users
Faculty
  └── Creates/manages courses (NURS 240, etc.)
  └── Imports student rosters
  └── Assigns simulations from the repository
  └── Reviews student charts
Student
  └── Sees only their enrolled courses
  └── Accesses only simulations assigned to those courses
  └── Charts vitals, MAR, notes, orders in EHR
```

### Data Hierarchy
```
Academic Year (2024-2025)
  └── Semester (Fall / Spring / Summer)
       └── Course (NURS 240 - Fundamentals)
            └── Simulation Assignment (from repository)
                 └── Student Session (individual charting)
                      ├── Vital Signs
                      ├── MAR (medication records)
                      ├── Progress Notes (SBAR / SOAP)
                      └── Order Completion
```

---

## 2. Tech Stack & Cost

| Service | Purpose | Free Tier Limit | Cost |
|---------|---------|-----------------|------|
| Supabase | Database + Auth | 50,000 MAU, 500MB DB | $0 |
| Vercel | Web hosting | Unlimited deployments | $0 |
| GitHub | Code storage | Unlimited public/private repos | $0 |

**Total monthly cost to start: $0**

Scale triggers:
- Supabase paid plan needed at ~5,000 concurrent monthly active users ($25/mo)
- Vercel paid plan if >100GB bandwidth/month ($20/mo)

---

## 3. Prerequisites

Install these on your computer before starting:

```bash
# Node.js (version 18 or higher)
# Download from: https://nodejs.org

# Verify installation
node --version   # should show v18.x or higher
npm --version    # should show 9.x or higher
```

You also need:
- A free **GitHub** account (github.com)
- A free **Supabase** account (supabase.com)
- A free **Vercel** account (vercel.com) — sign up with GitHub

---

## 4. Step-by-Step Setup

### Step 1 — Get the project files

If you received a zip file:
```bash
unzip nursing-sim-ehr.zip
cd nursing-ehr
```

Or initialize from scratch:
```bash
npx create-next-app@14 nursing-ehr --typescript --tailwind --app --src-dir
cd nursing-ehr
# Then copy all the provided files into place
```

### Step 2 — Install dependencies

```bash
npm install
```

This installs all packages listed in package.json (~2-3 minutes).

### Step 3 — Create your Supabase project

1. Go to **https://supabase.com** and sign in
2. Click **"New Project"**
3. Choose your organization
4. Set:
   - **Name**: `simehr` (or your school name)
   - **Database Password**: Generate a strong password and SAVE IT
   - **Region**: Choose closest to your school
5. Click **"Create new project"** — wait ~2 minutes for provisioning

### Step 4 — Get your Supabase keys

1. In your Supabase project, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)
   - **service_role secret** (another long string — keep this SECRET)

### Step 5 — Configure environment variables

```bash
# Copy the template
cp .env.example .env.local

# Edit the file with your values
nano .env.local   # or open in VS Code: code .env.local
```

Fill in:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6 — Run the database schema

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Open the file `supabase/migrations/001_schema.sql` from your project
4. Copy the ENTIRE contents and paste into the SQL editor
5. Click **"Run"** (green button)
6. You should see: `Success. No rows returned`

### Step 7 — Load seed data (optional but recommended)

1. In Supabase SQL Editor, create another new query
2. Open `supabase/seed/seed.sql`
3. Copy and paste the entire contents
4. Click **"Run"**

This creates:
- 2024-2025 academic year with Fall semester
- 3 published simulation scenarios:
  - Acute STEMI (cardiac, intermediate)
  - Septic Shock (sepsis, advanced)
  - Postpartum Hemorrhage (obstetric, advanced)

### Step 8 — Test locally

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

You should see the SimEHR login page.

---

## 5. Supabase Configuration

### Create Your First Admin User

1. In Supabase, go to **Authentication → Users**
2. Click **"Invite user"**
3. Enter YOUR email address
4. Click **"Send invite"**
5. Check your email and click the invitation link
6. Set your password on the SimEHR login page

Then promote yourself to admin:
1. In Supabase, go to **Table Editor → profiles**
2. Find your row
3. Click the **role** field and change it from `student` to `admin`
4. Click **Save**

Now log in at http://localhost:3000 — you'll have full admin access.

### Configure Email for Invitations

Supabase sends invitation emails automatically using its built-in email service.

For production, configure a custom SMTP:
1. Go to **Settings → Auth → SMTP Settings**
2. Enter your school's SMTP server details, OR
3. Use a free service like **Resend** (resend.com — 100 emails/day free):
   - Sign up at resend.com
   - Get your API key
   - In Supabase SMTP: host=`smtp.resend.com`, port=465, user=`resend`, password=your API key

### Configure Redirect URLs

1. In Supabase, go to **Authentication → URL Configuration**
2. Set **Site URL** to your production URL (e.g., `https://simehr.vercel.app`)
3. Add to **Redirect URLs**:
   - `http://localhost:3000/**` (for local dev)
   - `https://your-app.vercel.app/**` (for production)

---

## 6. Deploying to Vercel (Free Hosting)

### Step 1 — Push to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial SimEHR setup"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/simehr.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **"New Project"**
3. Import your `simehr` GitHub repository
4. In **Environment Variables**, add all three from your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL  ← set this to your Vercel URL after first deploy
   ```
5. Click **"Deploy"**
6. After deployment, copy your Vercel URL (e.g., `https://simehr-abc123.vercel.app`)
7. Update `NEXT_PUBLIC_APP_URL` in Vercel to that URL
8. Redeploy

### Step 3 — Update Supabase redirect URLs

1. In Supabase → Authentication → URL Configuration
2. Set Site URL to your Vercel URL
3. Add your Vercel URL with wildcard to Redirect URLs

---

## 7. First-Time Admin Setup

After deploying, do this before each semester:

### 1. Create Academic Year
- Go to Admin → Academic Years
- Click "New Academic Year"
- Enter: `2024-2025`, start: `2024-08-01`, end: `2025-07-31`
- Check "Set as active year"

### 2. Add Semesters
- Expand the year, click "Add Semester"
- Add: Fall (Aug 26 – Dec 15), Spring (Jan 13 – May 10)

### 3. Invite Faculty
- Go to Admin → Users → Invite User
- Enter faculty name, email, role = Faculty
- They receive an email to set their password

---

## 8. Faculty Workflow

### Creating a Course

1. Log in → My Courses → New Course
2. Select: Academic Year → Semester
3. Enter: Course Code (e.g., `NURS 240`), Title, Description
4. Click Create

### Importing Students (CSV Roster)

Prepare a CSV file with these columns:
```csv
email,first_name,last_name
jsmith@university.edu,Jane,Smith
mjones@university.edu,Mark,Jones
```

In the course detail page:
1. Click "Import CSV Roster"
2. Select your CSV file
3. Each student automatically receives an invitation email
4. Students set their own passwords via the emailed link

### Assigning Simulations

1. Open a course → Simulations tab
2. Click "Assign from Repository"
3. Select a scenario
4. Optionally set active dates (when students can access it)
5. Add any special instructions
6. Click "Assign to Course"

### Generating Patient Labels

1. In the Simulations tab of a course
2. Click "🏷 Labels" next to any simulation
3. Choose label format:
   - **Wristband** (11"×1.25") — for mannequin arms
   - **Bedside Card** (4"×6") — for simulation stations
   - **Chart Cover** (Letter) — for paper charts
4. Click "Download PDF" and print

### Reviewing Student Charts

- Go to Review → Student Chart Review
- See all live sessions (in-progress students)
- Click "View Chart" to see complete student documentation
- Reviews vitals, MAR scan compliance, notes, order completion

---

## 9. Student Workflow

### First Login

1. Check email for SimEHR invitation
2. Click the link in the email
3. Set your password on the set-password page
4. Your institutional email is your permanent username

### Starting a Simulation

1. Log in → Dashboard
2. Find available simulations under your courses
3. Click "Start" to begin
4. Scan patient wristband when prompted (or skip if no scanner available)
5. Navigate using the tabs: Patient Info, Vital Signs, MAR, Orders, Labs, Notes

### Charting Vitals

1. Go to Vital Signs tab
2. Click "Record Vitals"
3. Enter measured values
4. Click "Save Vital Signs"
5. Values appear in the flowsheet table with critical value highlighting

### Administering Medications (MAR)

1. Go to MAR tab
2. Find the medication to administer
3. Click "Administer"
4. Step 1: Scan patient wristband (camera or USB scanner)
5. Step 2: Scan medication barcode
6. Step 3: Document dose, route, any notes
7. Click "Document Administration"

If no scanner available: manual entry is always available as a fallback.

### Writing Notes

1. Go to Notes tab
2. Click "New Note"
3. Select note type: SBAR, SOAP, Shift Assessment, etc.
4. Fill in the structured fields
5. Click "Save & Sign" (or "Save Draft" to come back later)

---

## 10. Barcode Scanning Guide

SimEHR supports three scan input methods simultaneously:

### USB/Bluetooth Scanner (Recommended for Labs)
- Plug in any standard USB barcode scanner (HID device)
- Point at barcode/QR code and pull trigger
- Scanner types the value automatically — no extra setup needed
- Works with: Zebra, Honeywell, Socket Mobile, Motorola scanners
- Compatible with both 1D barcodes (Code 128) and 2D QR codes

### Camera Scanning (Phone/Tablet)
- Click "Camera" tab in the scan dialog
- Allow camera permissions when prompted
- Point camera at barcode or QR code
- Detection is automatic (~0.3 second polling)
- Best on devices with rear-facing cameras
- Works without any app install — pure browser

### Manual Entry (Always Available)
- Click "Manual" tab in any scan dialog
- Type the MRN or barcode value
- Press Enter or click Submit
- Use as fallback when scanner unavailable

### What to Print

**Patient Wristbands**
- Print the "Wristband" label (11"×1.25")
- Contains both QR code AND Code 128 barcode of patient MRN
- Attach to mannequin wrist with tape or wristband holder
- Recommended printer: Zebra ZD620 or Dymo LabelWriter 4XL

**Medication Labels**
- Print the barcode value shown on each medication in the MAR
- Each medication has a unique barcode_value (e.g., `MED-ASA-325`)
- Affix to medication cups, syringes, or IV bag labels
- Can be printed on standard Dymo labels (30252 address labels)

---

## 11. Patient Label Printing

### Label Types

| Format | Size | Use Case | Paper |
|--------|------|----------|-------|
| Wristband | 11"×1.25" | Mannequin wrist | Zebra/Dymo thermal |
| Bedside Card | 4"×6" | Simulation station | Cardstock + laminate |
| Chart Cover | 8.5"×11" | Paper chart folder | Regular printer paper |

### Printing Wristbands

**Zebra ZD620 (recommended):**
1. Download the PDF wristband label
2. Open in Adobe Reader
3. Print → select Zebra ZD620
4. Paper size: 11"×1.25" (or "Wristband")
5. Scale: "Actual size" (not fit to page)

**Standard printer (no label printer):**
1. Print Chart Cover instead
2. Cut out the patient info strip at top
3. Laminate or slide into a plastic badge holder

### Both Barcodes on Every Label

Every generated label contains:
1. **QR Code** — encodes JSON payload with MRN, encounter number, name, DOB
2. **Code 128 Barcode** — encodes the MRN (for USB scanner compatibility)

This ensures any scanner type works without students needing to select a mode.

---

## 12. Troubleshooting

### "Invalid login credentials"
- Verify email is exactly as entered in the roster
- Student may not have completed password setup from the invitation email
- Check spam/junk folder for the invitation email
- Resend invitation: Admin → Users → find user → actions

### "You don't have permission to access this"
- Check user's role in Admin → Users
- Ensure student is enrolled in the course (course detail → Students tab)
- Ensure simulation is marked "Active" and within date range

### Camera won't open for scanning
- Check browser permissions (click lock icon in URL bar → Camera → Allow)
- Use HTTPS (camera requires secure context — Vercel provides this automatically)
- Fall back to USB scanner or manual entry
- Mobile Safari requires iOS 14.3+ for camera barcode scanning

### Invitation email not received
- Check spam/junk folder
- Verify SMTP configuration in Supabase → Settings → Auth → SMTP
- For testing: in Supabase → Authentication → Users, find the user and manually confirm their email

### "relation does not exist" database error
- The schema migration hasn't been run yet
- Go to Supabase → SQL Editor and run `001_schema.sql` again

### Seed data scenarios missing
- Run `seed/seed.sql` in Supabase SQL Editor
- Scenarios should appear in the repository at Faculty → Sim Repository

### Build error on Vercel
- Check that all 3 environment variables are set in Vercel project settings
- Ensure `NEXT_PUBLIC_APP_URL` matches your actual Vercel domain exactly
- Check Vercel deployment logs for specific error messages

---

## 13. File Structure Reference

```
nursing-ehr/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout with toast provider
│   │   ├── globals.css               # Epic-inspired global styles
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # Login page
│   │   │   ├── forgot-password/      # Password reset request
│   │   │   └── set-password/         # New user password setup
│   │   ├── dashboard/page.tsx        # Role-aware dashboard router
│   │   ├── faculty/
│   │   │   ├── courses/              # Course management
│   │   │   │   ├── page.tsx          # Courses list
│   │   │   │   └── [id]/page.tsx     # Individual course (students + sims)
│   │   │   ├── repository/page.tsx   # Sim repository browser
│   │   │   ├── scenarios/
│   │   │   │   └── new/page.tsx      # Create scenario wizard
│   │   │   └── review/
│   │   │       ├── page.tsx          # Student sessions list
│   │   │       └── [sessionId]/      # Individual chart review
│   │   ├── student/
│   │   │   └── chart/[simId]/        # Student EHR charting view
│   │   ├── admin/
│   │   │   ├── users/page.tsx        # User management
│   │   │   └── years/page.tsx        # Academic years management
│   │   └── api/
│   │       └── users/invite/         # User invitation API endpoint
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # Sidebar + topbar navigation
│   │   │   ├── FacultyDashboard.tsx  # Faculty home dashboard
│   │   │   ├── StudentDashboard.tsx  # Student home dashboard
│   │   │   └── AdminDashboard.tsx    # Admin home dashboard
│   │   ├── ehr/
│   │   │   ├── ChartView.tsx         # Main EHR charting interface
│   │   │   ├── PatientBanner.tsx     # Blue patient header bar
│   │   │   ├── PatientInfoPanel.tsx  # Demographics tab
│   │   │   ├── VitalSignsPanel.tsx   # Vitals flowsheet + chart
│   │   │   ├── MARPanel.tsx          # Medication administration
│   │   │   ├── OrdersPanel.tsx       # Order management
│   │   │   ├── LabResultsPanel.tsx   # Lab results viewer
│   │   │   └── ProgressNotesPanel.tsx # SBAR/SOAP notes
│   │   ├── faculty/
│   │   │   ├── CoursesManager.tsx    # Course CRUD
│   │   │   ├── CourseDetail.tsx      # Students + sim assignment
│   │   │   ├── SimulationRepository.tsx # Repository browser
│   │   │   ├── ScenarioBuilder.tsx   # 6-step scenario wizard
│   │   │   └── StudentReviewList.tsx # Session review table
│   │   ├── admin/
│   │   │   ├── AdminUsersManager.tsx # User management table
│   │   │   └── AcademicYearsManager.tsx # Year/semester management
│   │   ├── scanning/
│   │   │   └── BarcodeScanner.tsx    # USB + Camera + Manual scanner
│   │   └── labels/
│   │       └── LabelGenerator.tsx    # PDF label UI
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   └── server.ts             # Server Supabase client
│   │   ├── utils.ts                  # Helper functions, vital interpretation
│   │   └── labelGenerator.ts         # PDF generation logic
│   ├── hooks/
│   │   └── useScanner.ts             # USB scanner keyboard hook
│   ├── types/
│   │   └── index.ts                  # All TypeScript interfaces
│   └── middleware.ts                  # Auth + role-based routing
├── supabase/
│   ├── migrations/001_schema.sql     # Full database schema + RLS
│   └── seed/seed.sql                 # Sample data (3 scenarios)
├── .env.example                      # Environment variable template
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Quick Reference: URLs

| URL | Description |
|-----|-------------|
| `/` | Redirects to `/auth/login` |
| `/auth/login` | Login page |
| `/auth/forgot-password` | Password reset |
| `/auth/set-password` | New user password setup (from invite link) |
| `/dashboard` | Role-aware home dashboard |
| `/faculty/courses` | Faculty course list |
| `/faculty/courses/[id]` | Course detail (students + simulations) |
| `/faculty/repository` | Simulation repository browser |
| `/faculty/scenarios/new` | Create new simulation scenario |
| `/faculty/review` | All student sessions |
| `/faculty/review/[sessionId]` | Individual student chart review |
| `/student/chart/[simId]` | Student EHR interface |
| `/admin/users` | User management |
| `/admin/years` | Academic years management |

---

## Support & Maintenance

### Adding More Scenarios
Faculty can create unlimited scenarios via Faculty → Create Scenario. Once published, scenarios appear in the repository for all faculty to use.

### Each Semester
1. Create new semester in Admin → Academic Years
2. Faculty create new courses for the semester
3. Import updated student rosters
4. Assign simulations from the repository
5. Previous semester data remains intact and viewable

### Backing Up Data
Supabase automatically backs up your database daily on the free tier. For manual export: Supabase → Settings → Database → Backups.

### Scaling Beyond 1,000 Users
The system is designed to scale. When you need to upgrade:
- Supabase Pro ($25/mo) — more storage, more connections
- Vercel Pro ($20/mo) — more bandwidth, team features
- No code changes needed to scale — just upgrade the plans
