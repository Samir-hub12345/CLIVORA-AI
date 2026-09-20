# CLINOVA AI — Clinical Rules & Decision Support Specification

**Document Type:** Central Clinical Rules Specification  
**Version:** 1.0.0  
**Effective Date:** September 18, 2026  
**Applicability:** Public Health Outreach Camps, Primary Health Centers (PHCs), Community Health Centers (CHCs), Sub-Divisional & District Hospitals, Campus Health Clinics  
**Problem Scope:** Multimodal Healthcare Triage Specification (PS03)

---

> [!WARNING]
> ### 🔒 MANDATORY CLINICAL SAFETY & NON-DIAGNOSTIC MANDATE
> 1. **NON-DIAGNOSTIC DESIGNATION:** CLINOVA AI is an educational prototype and clinical triage-support assistant. **The AI system MUST NOT make independent medical diagnoses, prescribe therapeutic regimens, or order unverified clinical interventions.**
> 2. **QUALIFIED HUMAN VALIDATION REQUIRED:** All clinical thresholds, triage classifications, urgency recommendations, and AI-synthesized summaries **strictly require confirmation, editing, or override by a qualified medical professional** before clinical or administrative action.
> 3. **NON-AUTONOMOUS WORKFLOW:** Under no operational circumstance may a patient be triaged, redirected, or discharged without explicit physical or electronic sign-off by licensed healthcare personnel.

---

## Table of Contents

1. [Core Safety Principles & Non-Diagnostic Mandate](#1-core-safety-principles--non-diagnostic-mandate)
2. [Rules Framework & System Architecture](#2-rules-framework--system-architecture)
3. [Patient Information Inputs & Ingestion Rules](#3-patient-information-inputs--ingestion-rules)
4. [Reliability, Data Quality & Provenance Attribution](#4-reliability-data-quality--provenance-attribution)
5. [Deterministic Urgency Triage Rules (TRIAGE-R01 to R06)](#5-deterministic-urgency-triage-rules-triage-r01-to-r06)
6. [Handling Missing, Ambiguous, and Conflicting Information](#6-handling-missing-ambiguous-and-conflicting-information)
7. [Medical Report OCR Extraction Rules](#7-medical-report-ocr-extraction-rules)
8. [Speech Transcription & Translation Normalization Rules](#8-speech-transcription--translation-normalization-rules)
9. [AI Triage Output Specification](#9-ai-triage-output-specification)
10. [Human-in-the-Loop Decision Rules & Reviewer Gate](#10-human-in-the-loop-decision-rules--reviewer-gate)
11. [Clinical Referral Support Document Rules](#11-clinical-referral-support-document-rules)
12. [Privacy, Data Retention & Medicolegal Audit Rules](#12-privacy-data-retention--medicolegal-audit-rules)

---

## 1. Core Safety Principles & Non-Diagnostic Mandate

### 1.1 Fundamental Purpose
CLINOVA AI is designed to address clinical bottlenecks in high-volume, resource-constrained Indian public healthcare settings (district hospital outpatient departments, rural PHCs, tribal mobile camps, and institutional clinics). It assists healthcare workers and medical officers by organizing multimodal, multilingual patient intake data into structured, explainable clinical notes.

### 1.2 The Three Non-Negotiable Safety Pillars

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    THE THREE CLINICAL SAFETY PILLARS                    │
├───────────────────────┬─────────────────────────┬───────────────────────┤
│ 1. NON-DIAGNOSTIC     │ 2. DETERMINISTIC        │ 3. MANDATORY HUMAN    │
│    ASSISTANCE         │    OVERRIDE             │    REVIEW GATE        │
│                       │                         │                       │
│ AI synthesizes and    │ Hardcoded clinical      │ No note is final, no  │
│ organizes observations│ rules (TRIAGE-R01-R06)  │ patient is triaged,   │
│ without naming a      │ strictly override any   │ and no referral is    │
│ definitive disease.   │ generative AI score.    │ issued without doctor │
│                       │                         │ sign-off.             │
└───────────────────────┴─────────────────────────┴───────────────────────┘
```

### 1.3 Persistent Safety Disclaimer Requirement
The following warning text must remain permanently visible on all user interfaces (patient intake wizard, reviewer queue, case review gate, and printable referral summaries):

> *"Educational prototype and triage-support purposes only. This system does not diagnose, prescribe treatment, or replace a qualified healthcare professional. All AI-generated information requires human review before clinical action."*

- **UI Implementation:** Rendered via `<ClinicalDisclaimer />` (`frontend/src/components/clinical/disclaimer.tsx`).
- **Dismissibility:** The disclaimer cannot be dismissed, minimized, or disabled via user preferences.
- **Export Integrity:** The disclaimer must be hardcoded in the header and footer of all exported referral notes, PDFs, and printed slips.

---

## 2. Rules Framework & System Architecture

### 2.1 Hybrid Neuro-Symbolic Architecture
CLINOVA AI enforces a **neuro-symbolic design pattern**:
- **Generative AI Layer (LLM):** Handles non-deterministic natural language processing—cleaning conversational disfluencies, structuring symptom timelines, normalizing regional idioms, and drafting narrative summaries.
- **Deterministic Rule Engine (Symbolic):** Implements immutable, auditable, hardcoded clinical safety logic (`backend/app/services/risk_engine.py`). 

```text
Patient Multimodal Inputs (Voice, Text, OCR, Vitals)
                       │
                       ▼
         [ PII Scrubbing & Anonymization ]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌────────────────────────┐
│  GENERATIVE AI   │       │  DETERMINISTIC RULES   │
│  - Timeline Gen  │       │  - TRIAGE-R01 to R06   │
│  - Translation   │       │  - Red Flag Triggers   │
│  - SOAP Draft    │       │  - Physiological Bounds│
└────────┬─────────┘       └───────────┬────────────┘
         │                             │
         └─────────────┬───────────────┘
                       ▼
          [ DETERMINISTIC PRIORITY OVERRIDE ]
                       │
                       ▼
         [ STRUCTURED REVIEWER NOTE ]
                       │
                       ▼
          [ HUMAN REVIEW GATE (DOCTOR) ]
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   [ CONFIRM ]     [ EDIT ]      [ ESCALATE ]
```

### 2.2 Precedence Hierarchy
When evaluating clinical priority, the engine follows this strict hierarchy of authority:
1. **Physical Reviewer Assessment:** Attending clinician judgment always supersedes all automated outputs.
2. **Deterministic Emergency Rule Matches (`TRIAGE-R01` to `TRIAGE-R04`):** If an acute emergency signal is detected, the case is locked to `URGENT REVIEW`.
3. **Objective Vital Sign Deviations:** Severe physiological abnormalities (e.g., $\text{SpO}_2 < 90\%$, $\text{Systolic BP} > 190 \text{ mmHg}$) automatically force an emergency elevation.
4. **Deterministic Priority Rule Matches (`TRIAGE-R05`, `TRIAGE-R06`):** Elevates case to `PRIORITY`.
5. **Generative AI Syndromic Grouping:** Used solely to inform the clinical narrative and suggest bedside differentials, never to lower acuity.

---

## 3. Patient Information Inputs & Ingestion Rules

### 3.1 Input Channel Specification

| Input Modality | Ingestion Source | Validation & Processing Rule |
| :--- | :--- | :--- |
| **Demographic Context** | Patient or Kiosk Operator | Age ($0 - 125$), biological gender, presenting facility type, visit category, and preferred language. |
| **Affirmative Consent** | Direct User Checkbox | Explicit checkbox acknowledging educational prototype triage scope before proceeding. |
| **Symptom Narrative** | Typed Text Area | Minimum 5 characters; passes through immediate regex PII anonymization before storage. |
| **Voice Audio** | Microphone (`.wav`, `.webm`) | 6-state capture machine (`idle`, `requesting`, `recording`, `processing`, `success`, `error`); max duration 120s. |
| **Laboratory Reports** | Uploaded Image / PDF (`.png`, `.jpg`, `.pdf`) | Complete Blood Count (CBC) panel extracted with per-field bounding boxes and confidence metrics. |
| **Physiological Vitals** | Clinical Triage Nurse Entry | Systolic/Diastolic BP ($\text{mmHg}$), Heart Rate ($\text{BPM}$), $\text{SpO}_2$ ($\%$), Resp Rate, Temp ($^\circ\text{C}$). |

### 3.2 Facility & Encounter Context Taxonomy
Every incoming intake session must be contextualized by facility tier:
1. **Outreach / Health Camp:** High-volume walk-in triage; screening for infectious clusters, acute dehydration, and agrarian injuries.
2. **Primary Health Center (PHC):** First-contact institutional triage; identifying secondary transfer candidates.
3. **Community Health Center (CHC) / Sub-Divisional Hospital:** Intermediate facility evaluating admission vs. referral.
4. **District Hospital Outpatient Department (OPD):** Specialty clinic sorting; high-acuity queueing.
5. **Campus / Occupational Health Clinic:** Rapid viral fever outbreak detection and maintenance medication renewals.

---

## 4. Reliability, Data Quality & Provenance Attribution

### 4.1 Provenance Categorization
To eliminate "hallucination hazards," every item in the structured reviewer note must carry a verified provenance tag via `<ProvenanceBadge />` (`frontend/src/components/clinical/provenance-badge.tsx`):

| Source Type | Provenance Tag | Visual Token | Meaning |
| :--- | :--- | :--- | :--- |
| `voice` | **Voice Input (STT)** | Purple (`bg-purple-50`) | Direct transcription from patient speech recording. |
| `ocr` | **Report OCR** | Sky Blue (`bg-sky-50`) | Extracted directly from uploaded laboratory report. |
| `rule` | **Deterministic Rule** | Amber (`bg-amber-50`) | Generated by keyword or threshold rule (`TRIAGE-R01` to `R06`). |
| `human` | **Reviewer Confirmed** | Emerald (`bg-emerald-50`) | Inspected, edited, or validated by attending medical officer. |
| `ai` | **AI Organization** | Slate (`bg-slate-100`) | Synthesized grouping or timeline generated by LLM. |

### 4.2 Confidence Metric Thresholds
- **High Confidence ($\ge 0.90$):** Field displayed in standard clinical font.
- **Moderate Confidence ($0.75 - 0.89$):** Field displayed with an amber verification hint.
- **Low Confidence ($< 0.75$):** Field flagged with a warning icon and requires mandatory manual review before approval.

---

## 5. Deterministic Urgency Triage Rules (TRIAGE-R01 to R06)

The deterministic risk engine (`backend/app/services/risk_engine.py`) continuously evaluates normalized patient text and reported symptoms against audited keyword triggers across English, Hindi, and Odia:

```text
   INPUT TEXT / TRANSCRIPT
              │
              ▼
   ┌──────────────────────┐
   │ Check TRIAGE-R01-R04 │──[ Match Found ]──► URGENT REVIEW (Red/Rose Badge)
   └──────────┬───────────┘
              │ No Match
              ▼
   ┌──────────────────────┐
   │ Check TRIAGE-R05-R06 │──[ Match Found ]──► PRIORITY (Amber Badge)
   └──────────┬───────────┘
              │ No Match
              ▼
   ROUTINE OUTPATIENT QUEUE (Teal/Slate Badge)
```

### Rule Specification Catalog

#### `TRIAGE-R01`: Acute Respiratory Distress
- **Clinical Description:** Impending respiratory failure, severe airway obstruction, or critical gas exchange compromise.
- **Severity Classification:** `URGENT REVIEW`
- **Keyword Triggers:**
  - *English:* `shortness of breath`, `difficulty breathing`, `breathless`, `cannot breathe`, `wheezing`, `gasping`, `dyspnea`, `breathing problem`
  - *Hindi:* `saans lene mein takleef`, `dam phoolna`
  - *Odia:* `shwas`, `dam phula`, `nishwas nebari kasta`
- **Mandatory Bedside Recommendations:**
  - Measure continuous pulse oximetry ($\text{SpO}_2$).
  - Elevate head of bed to 45 degrees.
  - Prepare supplemental oxygen delivery (nasal cannula / face mask).
  - Auscultate bilateral lung fields for wheezing or stridor.

#### `TRIAGE-R02`: Severe Hemorrhage & Active Bleeding
- **Clinical Description:** Acute internal or external blood loss threatening hemodynamic stability.
- **Severity Classification:** `URGENT REVIEW`
- **Keyword Triggers:**
  - *English:* `severe bleeding`, `coughing blood`, `vomiting blood`, `blood in stool`, `hemoptysis`, `active hemorrhage`
  - *Hindi:* `khun nikalna`, `khoon ki ulti`, `khoon aana`
  - *Odia:* `rakta srava`, `rakta banti`
- **Mandatory Bedside Recommendations:**
  - Apply direct pressure on external wound sites.
  - Establish immediate large-bore intravenous (IV) access.
  - Check blood pressure and heart rate for hypovolemic shock signs.
  - Order immediate STAT Hemoglobin and Blood Grouping/Cross-match.

#### `TRIAGE-R03`: Altered Consciousness & Neurological Urgency
- **Clinical Description:** Acute change in mental status, syncope, or ongoing convulsive activity.
- **Severity Classification:** `URGENT REVIEW`
- **Keyword Triggers:**
  - *English:* `unconscious`, `passed out`, `fainted`, `syncope`, `unresponsive`, `seizure`, `convulsion`, `sudden confusion`
  - *Hindi:* `behoshi`, `daura padna`, `aankhen band hona`
  - *Odia:* `chetana hariba`, `agyan heba`, `bheta mariba`
- **Mandatory Bedside Recommendations:**
  - Assess Glasgow Coma Scale (GCS) or AVPU score.
  - Perform point-of-care capillary blood glucose test (rule out hypoglycemia).
  - Maintain lateral recovery position; protect airway.
  - Screen for focal neurological signs (FAST protocol: Face, Arms, Speech).

#### `TRIAGE-R04`: Acute Chest Pain & Cardiovascular Urgency
- **Clinical Description:** Suspected Acute Coronary Syndrome (ACS), acute myocardial infarction, or aortic dissection.
- **Severity Classification:** `URGENT REVIEW`
- **Keyword Triggers:**
  - *English:* `chest pain`, `crushing chest pressure`, `radiating to left arm`, `chest tightness with sweating`
  - *Hindi:* `seene mein dard`, `chhati mein bhari pan`, `paseene ke saath dard`
  - *Odia:* `chhati re jantrana`, `chhati bika`, `chhati bhyari lagiba`
- **Mandatory Bedside Recommendations:**
  - Obtain 12-lead Electrocardiogram (ECG) within 10 minutes of arrival.
  - Administer chewed Aspirin 325 mg unless contraindicated.
  - Continuous cardiac telemetry monitoring.
  - Draw blood for high-sensitivity cardiac troponin testing.

#### `TRIAGE-R05`: High Sustained Fever & Infectious Outbreak Signal
- **Clinical Description:** Protracted febrile illness raising suspicion of dengue, malaria, typhoid, sepsis, or institutional epidemic spread.
- **Severity Classification:** `PRIORITY`
- **Keyword Triggers:**
  - *English:* `high fever`, `fever for 3 days`, `fever for 4 days`, `fever for 5 days`, `chills`, `shivering`
  - *Hindi:* `tez bukhar`, `teen din se bukhar`, `thand lagkar bukhar`
  - *Odia:* `prabal jwara`, `tini dina heba jwara`, `kampana deiki jwara`
- **Mandatory Bedside Recommendations:**
  - Check core body temperature and hydration status.
  - Administer antipyretic therapy (Paracetamol 650 mg) if temp $> 38.5^\circ\text{C}$.
  - Order Complete Blood Count (CBC), malaria rapid diagnostic test (RDT), and dengue NS1/IgM serology.
  - Isolate patient if rash or aerosol transmission is suspected.

#### `TRIAGE-R06`: Severe Acute Abdominal Pain
- **Clinical Description:** Acute surgical abdomen (e.g., appendicitis, perforated viscus, ectopic pregnancy, intestinal obstruction).
- **Severity Classification:** `PRIORITY`
- **Keyword Triggers:**
  - *English:* `severe abdominal pain`, `acute stomach pain`, `intense belly cramps`
  - *Hindi:* `pet mein tez dard`, `pet mein marod`
  - *Odia:* `peta re asahya jantrana`, `peta bika`
- **Mandatory Bedside Recommendations:**
  - Palpate abdomen for guarding, rigidity, and rebound tenderness.
  - Keep patient nil per os (NPO) until evaluated by a surgeon.
  - Establish intravenous hydration.
  - Obtain focused abdominal ultrasound (USG) or upright abdominal radiograph.

---

## 6. Handling Missing, Ambiguous, and Conflicting Information

### 6.1 Missing Information Detection Logic
The AI intake synthesizer actively identifies clinical gaps in the reported history and surfaces standardized follow-up probes (`backend/app/services/ai/gemini_service.py`):

| Clinical Domain | Detection Heuristic | Triggered Follow-Up Question |
| :--- | :--- | :--- |
| **Onset & Duration** | Absence of temporal markers (`day`, `week`, `month`, `hour`, `since`) | *"When exactly did these symptoms first begin?"* |
| **Symptom Severity** | Absence of qualitative/quantitative scale descriptors (`mild`, `severe`, `sharp`, etc.) | *"On a scale of 1 to 10, how severe is the primary discomfort right now?"* |
| **Active Medications** | Omission of drug history in patient narrative | *"Is the patient currently taking any daily prescription medicines, OTC drugs, or home remedies?"* |
| **Diagnostic History** | Absence of lab or imaging documents | *"Are there any previous blood test reports, discharge cards, or clinic prescriptions available?"* |

### 6.2 Conflicting Information Resolution Rules

```text
CONFLICT MATRIX
├── 1. Rule Engine vs. LLM Assessment
│      Rule Engine ALWAYS takes precedence. A deterministic rule trigger locks the category.
│
├── 2. Patient Subjective Narrative vs. Objective Vital Signs
│      Objective Vitals ALWAYS take precedence. If a patient reports "feeling fine" but
│      SpO2 is 88%, the case is escalated to URGENT REVIEW.
│
└── 3. Lab Test Value vs. Current Symptom Presentation
       Both must be surfaced side-by-side. Severe lab derangements (e.g., Platelets < 20,000)
       force an immediate priority flag even if current bleeding symptoms are absent.
```

- **Ambiguous Speech Transcripts:** If acoustic confidence is below $0.75$, the raw transcript is presented alongside a visual warning: `[Transcription uncertain — clinician verification required]`.
- **Dialect Discrepancies:** The original regional transcript is preserved untouched alongside the English clinical translation so attending staff can re-read the exact vernacular words spoken by the patient.

---

## 7. Medical Report OCR Extraction Rules

### 7.1 Targeted Laboratory Panels
The OCR extraction pipeline focuses on Complete Blood Count (CBC) panels, which represent the most common laboratory baseline in Indian public health facilities (`backend/app/services/ocr_service.py`).

### 7.2 Parameter Reference Bounds & Critical Thresholds

| Parameter Name | Standard Unit | Normal Reference Range | Critical Abnormal Threshold | Clinical Signal |
| :--- | :--- | :--- | :--- | :--- |
| **Hemoglobin (Hb)** | $\text{g/dL}$ | $12.0 - 16.0$ | $< 7.0 \text{ g/dL}$ | Severe Anemia / Transfusion Need |
| **Total Leukocyte Count (WBC)** | $\times 10^3/\mu\text{L}$ | $4.0 - 11.0$ | $> 15.0 \text{ or } < 2.5 \times 10^3/\mu\text{L}$ | Severe Leukocytosis (Sepsis) / Leukopenia |
| **Platelet Count** | $\times 10^3/\mu\text{L}$ | $150 - 450$ | $< 50 \text{ or } < 20 \times 10^3/\mu\text{L}$ | Thrombocytopenia (Dengue Hemorrhagic Risk) |
| **Red Blood Cell Count (RBC)** | $\times 10^6/\mu\text{L}$ | $4.0 - 5.5$ | $< 2.5 \times 10^6/\mu\text{L}$ | Marrow Suppression / Erythropoietic Failure |

### 7.3 OCR Extraction Verification Workflow
1. **Coordinate Bounding Box:** Each extracted parameter must provide coordinate references `[ymin, xmin, ymax, xmax]` linking the value to its location on the original report.
2. **Confidence Score:** Average OCR confidence must be computed and displayed as a percentage.
3. **Interactive Verification State:** Each field begins in `verification_status: "pending"`. The medical reviewer must verify or edit values in `<ReportUploader />` (`frontend/src/components/clinical/report-uploader.tsx`) before finalizing the case note.

---

## 8. Speech Transcription & Translation Normalization Rules

### 8.1 Multi-Language Intake Support
CLINOVA AI natively accommodates three language streams:
- **Odia (`or`):** Primary state language of Odisha.
- **Hindi (`hi`):** National lingua franca in central and northern India.
- **English (`en`):** Standard administrative and clinical documentation language.

### 8.2 Transcription Integrity Guidelines (`speech_service.py`)
- **Phonetic Normalization:** Vernacular phonetic spellings of disease names (e.g., Odia: `ଜ୍ୱର` / `Jwara`, Hindi: `बुखार` / `Bukhar`) are normalized to standard medical terminology (`fever / pyrexia`).
- **Verbatim Retention:** The verbatim vernacular audio transcript is immutably stored in `case.raw_symptoms` and `case.speech_transcript`. It is **never replaced or deleted** by translation algorithms.

### 8.3 Translation & Clinical Normalization Rules (`translation_service.py`)
- **Dual Representation:** The user interface always displays the **Original Vernacular Speech** alongside the **Clinician English Summary**.
- **Disfluency Stripping:** Hesitations, repeated syllables, and filler words (`umm`, `arre`, `mane`) are removed during English synthesis without altering the clinical chronology or symptom severity.

---

## 9. AI Triage Output Specification

Every synthesized triage case output must adhere strictly to the `CaseResponse` schema (`backend/app/schemas/case.py`):

```json
{
  "case_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "synthetic_case_id": "CLV-DEMO-001",
  "chief_concern": "High sustained fever with acute shortness of breath",
  "symptom_summary": "21yo male presenting for Campus Fever Triage at Campus Health Center. Reported symptoms: high fever for 3 days, severe headache, and progressive dyspnea upon exertion. Voice transcript captured in Odia. Organized for qualified medical officer evaluation.",
  "timeline": [
    {
      "day": "Day 1",
      "description": "Patient notes onset of high fever and severe frontal headache.",
      "source": "Patient history"
    },
    {
      "day": "Day 2",
      "description": "Fever persists; patient experiences generalized myalgia and onset of breathing difficulty.",
      "source": "Patient history"
    },
    {
      "day": "Day 3 (Today)",
      "description": "Presents to Campus Health Center with acute shortness of breath upon walking.",
      "source": "Current intake"
    }
  ],
  "reported_symptoms": [
    "High fever",
    "Severe headache",
    "Shortness of breath",
    "Generalized weakness"
  ],
  "relevant_history": [
    "Requires confirmation by reviewing clinician during clinical encounter"
  ],
  "extracted_report_data": [
    {
      "field_name": "Hemoglobin (Hb)",
      "value": "12.4",
      "unit": "g/dL",
      "confidence": 0.94,
      "verification_status": "pending"
    }
  ],
  "missing_information": [
    "Subjective symptom severity score (1-10)",
    "Current daily prescription or over-the-counter medications"
  ],
  "follow_up_questions": [
    "On a scale of 1 to 10, how severe is the primary discomfort right now?",
    "Is the patient currently taking any daily medicines or home remedies?"
  ],
  "risk_signals": [
    {
      "rule_id": "TRIAGE-R01",
      "signal": "Potential breathing-related urgency signal detected",
      "severity": "URGENT REVIEW",
      "source_text": "shortness of breath",
      "timestamp": "19:40:12",
      "reviewer_confirmation_required": true,
      "status": "pending_confirmation"
    }
  ],
  "queue_category": "urgent_review",
  "queue_reason": "TRIAGE-R01: Potential breathing-related urgency signal detected",
  "sources": [
    "Patient direct input",
    "Voice intake (speech-to-text)",
    "Deterministic risk rules (TRIAGE-R01 - R06)"
  ],
  "ai_generated": true,
  "requires_human_review": true,
  "is_diagnostic": false,
  "disclaimer": "Educational prototype and triage-support purposes only. This system does not diagnose, prescribe treatment, or replace a qualified healthcare professional. All AI-generated information requires human review."
}
```

---

## 10. Human-in-the-Loop Decision Rules & Reviewer Gate

### 10.1 Role-Based Review Permissions
Only authenticated users with the role of `doctor` or `nurse` may execute review actions against triage cases (`backend/app/api/v1/endpoints/review.py`).

### 10.2 Review Action States

```text
             TRIAGE CASE (status: awaiting_review)
                            │
            ┌───────────────┼───────────────┬───────────────┐
            ▼               ▼               ▼               ▼
      [ APPROVE ]       [ EDIT ]        [ REJECT ]     [ ESCALATE ]
            │               │               │               │
            ▼               ▼               ▼               ▼
     status: approved  status: in_review  status: rejected status: referred
     Doctor signature  Summary modified  Re-intake needed Referral note
     stamped           Queue updated     Audit flagged    generated
```

1. **APPROVE (`action: "approve"`):**
   - Clinician confirms that the AI summary accurately reflects the patient's presentation.
   - Status updates to `approved`.
   - Attending clinician's name, role, and UTC timestamp are immutably stamped.
2. **EDIT (`action: "edit"`):**
   - Clinician modifies the synthesized summary (`edited_summary`), overrides the queue urgency (`confirmed_queue_category`), or adds clinical notes.
   - Status updates to `in_review`.
   - Edits are logged in the audit trail with pre- and post-modification diffs.
3. **REJECT (`action: "reject"`):**
   - Clinician determines the intake data is inaccurate, fraudulent, or unusable.
   - Status updates to `rejected`.
   - Mandatory explanation recorded in `reviewer_notes` (e.g., *"Audio corrupted; patient requires immediate direct examination"*).
4. **ESCALATE (`action: "escalate"`):**
   - Clinician identifies that the patient exceeds local facility capability (e.g., PHC $\rightarrow$ District Hospital).
   - Status updates to `referred`.
   - Automatically generates a standardized **Referral Support Document**.

---

## 11. Clinical Referral Support Document Rules

### 11.1 Purpose
Standardizes communication between primary outreach facilities and secondary/tertiary referral centers (`/review/case/[caseId]/referral`).

### 11.2 Mandatory Referral Content
1. **Facility Identification:** Originating health facility name and referring clinician name/designation.
2. **Synthetic Identifier:** Case ID (e.g., `CLV-DEMO-001`) avoiding direct exposure of patient phone or government IDs on paper slips.
3. **Chronological Symptom Trajectory:** Structured timeline events (Day 1, Day 2, Day 3).
4. **Extracted Lab Data:** Baseline CBC parameters with verification badges.
5. **Outstanding Clinical Questions:** List of unanswered diagnostic queries to prompt the receiving emergency team.
6. **Triggered Urgency Signals:** Clear listing of all triggered deterministic rules (e.g., `TRIAGE-R01: Acute dyspnea`).
7. **Official Referral Disclaimer:** Printed in bold footer text:
   > *"AI-assisted organization of information. Not a diagnosis or treatment recommendation. Final referral decision is made by qualified healthcare staff."*

---

## 12. Privacy, Data Retention & Medicolegal Audit Rules

### 12.1 Automated PII Scrubbing Rules (`anonymizer.py`)
All incoming text is scrubbed before database persistence and before transmission to any generative AI inference engine:
- **Phone Numbers:** Regex matching 10-digit Indian mobile patterns $\rightarrow$ replaced with `[PHONE_REMOVED]`.
- **Email Addresses:** Regex matching email format $\rightarrow$ replaced with `[EMAIL_REDACTED]`.
- **National Government IDs (Aadhaar):** Regex matching 12-digit Indian Aadhaar sequences (e.g., `xxxx-xxxx-xxxx` or 12 digits) $\rightarrow$ replaced with `[GOVT_ID_REDACTED]`.
- **Synthetic Identifiers:** Random synthetic case codes (`CLV-DEMO-xxx`) are assigned for tracking.

### 12.2 Data Retention & Purge Rules
- **Temporary Buffer Policy:** Audio files and raw report scan binaries are stored in short-term memory buffers with a default retention policy of 24 hours (`RETENTION_HOURS = 24`).
- **One-Click Retention Purge:** Clinicians can trigger immediate deletion of raw audio and temporary buffers via the Case Review interface (`DELETE /api/v1/cases/{case_id}`).

### 12.3 Immutable Audit Trail Rules (`backend/app/services/audit.py`)
Every triage action generates an immutable `AuditLog` entry in PostgreSQL containing:
- `timestamp`: UTC ISO 8601 timestamp.
- `user_id` / `user_email`: Electronic identity of acting user (or `ANONYMOUS_INTAKE`).
- `action`: Specific standardized event code (`CASE_INTAKE_SUBMITTED`, `VOICE_TRANSCRIBED`, `OCR_EXTRACTED`, `REVIEW_ACTION_APPROVE`, `REVIEW_ACTION_EDIT`, `REVIEW_ACTION_ESCALATE`, `CASE_DATA_PURGED`).
- `resource_type`: Target entity (`TRIAGE_CASE`, `PATIENT_RECORD`, `CONSULTATION`).
- `resource_id`: Target synthetic case ID.
- `ip_address` & `user_agent`: Client network provenance.
- `details`: Cryptographic audit description detailing exact modifications made.

---

### Document Approval & Governance
- **Clinical Lead:** Dr. Sarah Chen, MD (Clinical Advisory Board)
- **Technical Lead:** CLINOVA AI Engineering Team
- **Governance Alignment:** ABDM/DISHA Health Data Privacy Architecture Guidelines  
- **Review Cycle:** Bi-monthly or upon updating deterministic triage rule thresholds.
