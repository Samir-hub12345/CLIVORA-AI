/**
 * CLINOVA AI — Authentic Reference Platform Datasets & Definitions
 * Extracted directly from reference client bundle for exact UI/UX fidelity.
 */

export interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: string;
  phone: string;
  email?: string;
  address?: string;
  lastVisit?: string;
  nextAppt?: string;
  clinician: string;
  recordStatus: "Needs review" | "Complete" | "Incomplete";
  synthetic?: boolean;
  emergency?: {
    name: string;
    relation: string;
    phone: string;
  };
  consent: string;
  accessibility: string;
  contactPref: string;
  language?: string;
}

export interface Appointment {
  id: string;
  time: string;
  patientId: string;
  type: string;
  clinician: string;
  status: "Completed" | "In consultation" | "Waiting" | "Arrived" | "Scheduled" | "Cancelled";
  room?: string;
}

export interface ConsultSection {
  text: string;
  origin: "ai" | "ai-edited" | "clinician" | "empty" | "patient";
}

export interface Consultation {
  id: string;
  patientId: string;
  clinician: string;
  type: string;
  startedAt: string;
  status: "In progress" | "Draft saved" | "Approved" | "Signed";
  rawNotes: string;
  sections: {
    chief: ConsultSection;
    hpi: ConsultSection;
    pmh: ConsultSection;
    medsAllergies: ConsultSection;
    exam: ConsultSection;
    assessment: ConsultSection;
    plan: ConsultSection;
    followup: ConsultSection;
  };
  allergyConfirmed: boolean;
  medsReconciled: boolean;
  versions?: any[];
  undo?: any[];
  summary?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  signedBy?: string | null;
  signedAt?: string | null;
  carePlan?: {
    plan?: ConsultSection;
    followup?: ConsultSection;
  };
}

export interface ReviewItem {
  id: string;
  patientId: string;
  type: "documentation" | "lab" | "instructions" | "followup" | "clarification";
  title: string;
  createdBy: string;
  createdAt: string;
  aiStatus: string;
  missing?: number;
  sources: string[];
  status: "pending" | "approved" | "rejected" | "clarification";
  preview: string;
  resolvedBy?: string;
  resolvedAt?: string;
  note?: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  report: string;
  panel: string;
  test: string;
  result: string;
  unit: string;
  range: string;
  flag: "H" | "L" | "Critical" | null;
  collected: string;
  status: "Final" | "Preliminary";
  history: { date: string; value: string }[];
}

export interface FollowUpItem {
  id: string;
  patientId: string;
  reason: string;
  due: string;
  owner: string;
  pref: string;
  status: "Due today" | "Contact attempted" | "Scheduled" | "Completed" | "Escalated" | "Awaiting scheduling";
  attempts: { at: string; by: string; outcome: string }[];
}

export interface AuditEntry {
  id: string;
  ts: string;
  actor: string;
  action: string;
  category: "Sign-in" | "AI draft" | "Record access" | "Clinical review" | "Sync" | "Approval" | "Permission change";
  record: string;
  outcome: "Success" | "Failed";
  detail: string;
}

export const SEED_PATIENTS: Patient[] = [
  {
    id: "CLN-10482",
    name: "Ada Okafor",
    dob: "1988-04-14",
    sex: "Female",
    phone: "+234 803 555 0142",
    email: "ada.okafor@example.com",
    address: "14 Admiralty Way, Lekki Phase 1, Lagos",
    lastVisit: "42 days ago",
    nextAppt: "Today 10:30",
    clinician: "joshua",
    recordStatus: "Needs review",
    synthetic: true,
    emergency: { name: "Chinedu Okafor", relation: "Spouse", phone: "+234 803 555 0199" },
    consent: "On file — signed 12 Feb 2023",
    accessibility: "None recorded",
    contactPref: "SMS",
    language: "English"
  },
  {
    id: "CLN-10477",
    name: "Emeka Nwosu",
    dob: "1975-09-02",
    sex: "Male",
    phone: "+234 802 555 0110",
    email: "emeka.nwosu@example.com",
    address: "7 Victoria Island Crescent, Lagos",
    lastVisit: "9 days ago",
    nextAppt: "Today 09:00",
    clinician: "joshua",
    recordStatus: "Complete",
    emergency: { name: "Nkechi Nwosu", relation: "Sister", phone: "+234 802 555 0115" },
    consent: "On file — signed 18 Nov 2023",
    accessibility: "None recorded",
    contactPref: "Phone call",
    language: "English"
  },
  {
    id: "CLN-10469",
    name: "Halima Yusuf",
    dob: "1992-01-23",
    sex: "Female",
    phone: "+234 806 555 0187",
    email: "halima.yusuf@example.com",
    address: "22 Ikoyi Palms Avenue, Lagos",
    lastVisit: "30 days ago",
    nextAppt: "Today 09:20",
    clinician: "joshua",
    recordStatus: "Complete",
    emergency: { name: "Mustapha Yusuf", relation: "Father", phone: "+234 806 555 0190" },
    consent: "On file — signed 04 Jan 2024",
    accessibility: "None recorded",
    contactPref: "SMS",
    language: "Hausa"
  },
  {
    id: "CLN-10455",
    name: "Oluwaseun Bakare",
    dob: "1968-11-30",
    sex: "Male",
    phone: "+234 809 555 0123",
    email: "o.bakare@example.com",
    address: "3 Freedom Way, Lekki, Lagos",
    lastVisit: "3 days ago",
    nextAppt: "Today 09:45",
    clinician: "funmi",
    recordStatus: "Incomplete",
    emergency: { name: "Bose Bakare", relation: "Wife", phone: "+234 809 555 0128" },
    consent: "On file — signed 10 Oct 2023",
    accessibility: "Large print requested",
    contactPref: "Phone call",
    language: "Yoruba"
  },
  {
    id: "CLN-10451",
    name: "Ngozi Eze",
    dob: "2001-06-08",
    sex: "Female",
    phone: "+234 815 555 0164",
    email: "ngozi.eze@example.com",
    address: "18 Chevy View Estate, Chevron Drive, Lagos",
    lastVisit: "60 days ago",
    nextAppt: "Today 11:00",
    clinician: "joshua",
    recordStatus: "Complete",
    emergency: { name: "Amaka Eze", relation: "Mother", phone: "+234 815 555 0170" },
    consent: "On file — signed 15 Mar 2024",
    accessibility: "None recorded",
    contactPref: "WhatsApp",
    language: "English"
  },
  {
    id: "CLN-10448",
    name: "Ibrahim Danladi",
    dob: "1983-03-19",
    sex: "Male",
    phone: "+234 805 555 0137",
    email: "i.danladi@example.com",
    address: "5 Bisola Durosinmi Etti Drive, Lekki, Lagos",
    lastVisit: "12 days ago",
    nextAppt: "Tomorrow 09:00",
    clinician: "chidi",
    recordStatus: "Needs review",
    consent: "On file — signed 08 Aug 2023",
    accessibility: "None recorded",
    contactPref: "Phone call",
    language: "Hausa"
  },
  {
    id: "CLN-10436",
    name: "Folake Adebayo",
    dob: "1995-12-14",
    sex: "Female",
    phone: "+234 813 555 0192",
    email: "folake.adebayo@example.com",
    address: "9 Fola Osibo St, Lekki Phase 1, Lagos",
    lastVisit: "5 days ago",
    nextAppt: "Today 08:30",
    clinician: "chidi",
    recordStatus: "Complete",
    consent: "On file — signed 29 Jan 2024",
    accessibility: "None recorded",
    contactPref: "SMS",
    language: "English"
  }
];

export const SEED_APPOINTMENTS: Appointment[] = [
  { id: "ap1", time: "Today 08:30", patientId: "CLN-10436", type: "Wound review", clinician: "chidi", status: "Completed", room: "Room 3" },
  { id: "ap2", time: "Today 09:00", patientId: "CLN-10477", type: "Follow-up", clinician: "joshua", status: "Completed", room: "Room 1" },
  { id: "ap3", time: "Today 09:20", patientId: "CLN-10469", type: "Consultation", clinician: "joshua", status: "In consultation", room: "Room 1" },
  { id: "ap4", time: "Today 09:45", patientId: "CLN-10455", type: "Results review", clinician: "funmi", status: "Waiting", room: "Room 2" },
  { id: "ap5", time: "Today 10:30", patientId: "CLN-10482", type: "Consultation", clinician: "joshua", status: "Arrived", room: "Room 1" },
  { id: "ap6", time: "Today 11:00", patientId: "CLN-10451", type: "Follow-up", clinician: "joshua", status: "Scheduled", room: "Room 1" },
  { id: "ap7", time: "Tomorrow 09:00", patientId: "CLN-10448", type: "Chronic care review", clinician: "chidi", status: "Scheduled", room: "Room 3" }
];

export const SEED_CONSULTATIONS: Record<string, Consultation> = {
  "ENC-5902": {
    id: "ENC-5902",
    patientId: "CLN-10482",
    clinician: "joshua",
    type: "Consultation",
    startedAt: "Today 10:34",
    status: "In progress",
    rawNotes: "Patient reports intermittent headaches for three days. No examination findings entered yet.",
    sections: {
      chief: { text: "Intermittent headaches for three days", origin: "ai" },
      hpi: { text: "Patient reports throbbing frontal headaches worsening in the afternoon. Denies photophobia, nausea, or visual changes.", origin: "ai-edited" },
      pmh: { text: "Mild hypertension diagnosed 2021. Well-controlled.", origin: "ai" },
      medsAllergies: { text: "Amlodipine 5mg daily. NKDA.", origin: "patient" },
      exam: { text: "BP 132/84, HR 76 regular, SpO2 99%. Cranial nerves II-XII intact. Pupils equal and reactive.", origin: "clinician" },
      assessment: { text: "Tension headache with mild blood pressure elevation.", origin: "clinician" },
      plan: { text: "Hydration, sleep hygiene, Paracetamol 1g PO PRN. Recheck BP in 1 week.", origin: "clinician" },
      followup: { text: "Return in 7 days or sooner if severe persistent pain develops.", origin: "clinician" }
    },
    allergyConfirmed: false,
    medsReconciled: false,
    summary: null
  },
  "ENC-5833": {
    id: "ENC-5833",
    patientId: "CLN-10469",
    clinician: "joshua",
    type: "Consultation",
    startedAt: "Today 09:24",
    status: "Draft saved",
    rawNotes: "Lower back pain 2 weeks after lifting at work. No radicular symptoms.",
    sections: {
      chief: { text: "Lower back pain — 2 weeks", origin: "ai" },
      hpi: { text: "Patient reports lower back pain for two weeks after lifting at work. No radiation reported.", origin: "ai-edited" },
      pmh: { text: "No significant prior history.", origin: "empty" },
      medsAllergies: { text: "No regular medications. Penicillin allergy (rash).", origin: "patient" },
      exam: { text: "Tenderness over right paraspinal muscles. Straight leg raise negative bilaterally.", origin: "clinician" },
      assessment: { text: "Acute mechanical lumbar strain.", origin: "clinician" },
      plan: { text: "Physiotherapy referral, core exercises, Ibuprofen 400mg PO TID with food.", origin: "clinician" },
      followup: { text: "Review in 2 weeks if no improvement.", origin: "clinician" }
    },
    allergyConfirmed: true,
    medsReconciled: true,
    summary: null
  },
  "ENC-5834": {
    id: "ENC-5834",
    patientId: "CLN-10455",
    clinician: "funmi",
    type: "Results review",
    startedAt: "Today 09:48",
    status: "In progress",
    rawNotes: "Fasting blood sugar 7.8 mmol/L. HbA1c 7.1%.",
    sections: {
      chief: { text: "Routine diabetic monitoring and lab review", origin: "ai" },
      hpi: { text: "Patient feeling generally well, reports adherence to dietary advice and Metformin.", origin: "ai-edited" },
      pmh: { text: "Type 2 Diabetes Mellitus x 4 years.", origin: "ai" },
      medsAllergies: { text: "Metformin 850mg PO BID.", origin: "clinician" },
      exam: { text: "BP 128/80, BMI 27.2. Foot pulses palpable, monofilament sensation intact.", origin: "clinician" },
      assessment: { text: "Suboptimally controlled T2DM (HbA1c 7.1%).", origin: "clinician" },
      plan: { text: "Increase Metformin to 1000mg BID. Nutritional consultation booked.", origin: "clinician" },
      followup: { text: "Repeat HbA1c and review in 3 months.", origin: "clinician" }
    },
    allergyConfirmed: false,
    medsReconciled: true,
    summary: null
  }
};

export const SEED_REVIEWS: ReviewItem[] = [
  {
    id: "rv1",
    patientId: "CLN-10469",
    type: "documentation",
    title: "Consultation note draft",
    createdBy: "Clinova AI (draft) · Dr. Joshua Ajose",
    createdAt: "Today 09:41",
    aiStatus: "AI-assisted",
    missing: 1,
    sources: ["ENC-5833", "Intake form"],
    status: "pending",
    preview: "Chief complaint: Lower back pain, 2 weeks. HPI organised from clinician notes. Examination findings entered by clinician."
  },
  {
    id: "rv2",
    patientId: "CLN-10448",
    type: "lab",
    title: "Pathology summary: Full blood count & Ferritin",
    createdBy: "Clinova AI (draft)",
    createdAt: "Today 08:05",
    aiStatus: "AI-generated",
    sources: ["LAB-88540"],
    status: "pending",
    preview: "Mild microcytic hypochromic anaemia (Hb 10.4 g/dL, MCV 74 fL). Ferritin reduced at 12 µg/L. Iron deficiency picture."
  },
  {
    id: "rv3",
    patientId: "CLN-10477",
    type: "instructions",
    title: "Hypertension care instructions & home BP monitoring",
    createdBy: "Clinova AI (draft) · Nurse Chidinma Eze",
    createdAt: "Today 09:12",
    aiStatus: "AI-assisted",
    sources: ["ENC-5829"],
    status: "pending",
    preview: "Clear instructions in plain English and Pidgin. Target BP < 130/80 mmHg. Medication compliance and dietary sodium guidance."
  },
  {
    id: "rv4",
    patientId: "CLN-10455",
    type: "clarification",
    title: "Conflicting medication dosage in record",
    createdBy: "Clinova AI (flag)",
    createdAt: "Today 09:50",
    aiStatus: "AI-flagged",
    sources: ["ENC-5834", "Previous chart"],
    status: "pending",
    preview: "Patient reported Metformin 500mg BID on intake, but previous chart specifies 850mg BID. Verify active dose before signing."
  }
];

export const SEED_LABS: LabResult[] = [
  {
    id: "r1",
    patientId: "CLN-10482",
    report: "LAB-88213",
    panel: "Basic metabolic panel",
    test: "Sodium",
    result: "139",
    unit: "mmol/L",
    range: "135–145",
    flag: null,
    collected: "12 days ago",
    status: "Final",
    history: [{ date: "6 months ago", value: "140" }]
  },
  {
    id: "r2",
    patientId: "CLN-10482",
    report: "LAB-88213",
    panel: "Basic metabolic panel",
    test: "Potassium",
    result: "3.3",
    unit: "mmol/L",
    range: "3.5–5.1",
    flag: "L",
    collected: "12 days ago",
    status: "Final",
    history: [{ date: "6 months ago", value: "3.8" }]
  },
  {
    id: "r3",
    patientId: "CLN-10482",
    report: "LAB-88213",
    panel: "Basic metabolic panel",
    test: "Creatinine",
    result: "78",
    unit: "µmol/L",
    range: "45–90",
    flag: null,
    collected: "12 days ago",
    status: "Final",
    history: [{ date: "6 months ago", value: "74" }]
  },
  {
    id: "r4",
    patientId: "CLN-10482",
    report: "LAB-88213",
    panel: "Lipid panel",
    test: "Total cholesterol",
    result: "5.4",
    unit: "mmol/L",
    range: "< 5.2",
    flag: "H",
    collected: "12 days ago",
    status: "Final",
    history: [{ date: "6 months ago", value: "5.1" }]
  },
  {
    id: "r5",
    patientId: "CLN-10448",
    report: "LAB-88540",
    panel: "Full blood count",
    test: "Haemoglobin",
    result: "10.4",
    unit: "g/dL",
    range: "13.0–17.5",
    flag: "L",
    collected: "Yesterday",
    status: "Final",
    history: [{ date: "1 year ago", value: "13.2" }]
  },
  {
    id: "r6",
    patientId: "CLN-10448",
    report: "LAB-88540",
    panel: "Full blood count",
    test: "MCV",
    result: "74",
    unit: "fL",
    range: "80–100",
    flag: "L",
    collected: "Yesterday",
    status: "Final",
    history: [{ date: "1 year ago", value: "86" }]
  }
];

export const SEED_FOLLOWUPS: FollowUpItem[] = [
  {
    id: "fu1",
    patientId: "CLN-10477",
    reason: "Blood pressure recheck after dose adjustment",
    due: "Today",
    owner: "chidi",
    pref: "Phone call",
    status: "Due today",
    attempts: []
  },
  {
    id: "fu2",
    patientId: "CLN-10448",
    reason: "Discuss laboratory results (iron deficiency)",
    due: "Today",
    owner: "joshua",
    pref: "Phone call",
    status: "Contact attempted",
    attempts: [{ at: "Today 08:40", by: "Nurse Chidinma Eze", outcome: "No answer — voicemail left" }]
  },
  {
    id: "fu3",
    patientId: "CLN-10482",
    reason: "Headache response check & BP verification",
    due: "In 7 days",
    owner: "joshua",
    pref: "SMS",
    status: "Scheduled",
    attempts: []
  }
];

export const SEED_AUDIT: AuditEntry[] = [
  { id: "au1", ts: "Today 07:58", actor: "Dr. Joshua Ajose", action: "Signed in", category: "Sign-in", record: "—", outcome: "Success", detail: "SSO session verified" },
  { id: "au2", ts: "Today 08:05", actor: "Clinova AI", action: "Prepared lab summary draft", category: "AI draft", record: "CLN-10448 · LAB-88540", outcome: "Success", detail: "Awaiting clinician review" },
  { id: "au3", ts: "Today 08:12", actor: "Tunde Olawale", action: "Registered patient", category: "Record access", record: "CLN-10482", outcome: "Success", detail: "Identity and DPDP consent recorded" },
  { id: "au4", ts: "Today 09:20", actor: "Dr. Joshua Ajose", action: "Opened consultation", category: "Record access", record: "ENC-5833", outcome: "Success", detail: "Patient in room" },
  { id: "au5", ts: "Today 09:41", actor: "Dr. Joshua Ajose", action: "Draft saved", category: "Clinical review", record: "ENC-5833", outcome: "Success", detail: "AI sections verified" }
];
