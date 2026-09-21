# CLINOVA AI — Clinical Validation Protocol & Safety Framework

**Document Reference:** CLN-VAL-CLIN-005  
**Version:** 1.0.0  
**Clinical Oversight Committee:** Clinical Informatics & Emergency Medicine Review Board  
**Target Architecture:** Rules Engine, OCR Processing, AI Triage & Clinical Decision Support (CDS)  

---

## 1. Clinical Scope & Non-Diagnostic Framing

### 1.1 Non-Diagnostic Legal & Regulatory Framing
CLINOVA AI is engineered and certified as a **Clinical Decision Support (CDS) System**, not an autonomous diagnostic medical device. Under FDA CDS Guidance and EU MDR Class IIa classifications:
- The platform provides structured information synthesis, symptom normalization, and guideline-based triage classification.
- The platform **DOES NOT** provide definitive medical diagnoses, dispense prescriptions, or initiate autonomous clinical orders.
- Every clinical report, referral packet, and triage assessment must display the mandatory clinical disclaimer:
  > *"AI-assisted organization of information. Not a diagnosis or treatment recommendation. Final triage and clinical decisions must be confirmed by a qualified healthcare professional."*

### 1.2 Mandatory Human-in-the-Loop (HITL) Gate
- No triage escalation, referral letter generation, or discharge summary is committed to a permanent patient chart without an explicit digital signature/confirmation by an authenticated medical practitioner (`DOCTOR` or `REVIEWER` role).

---

## 2. Deterministic Clinical Safety Rules Engine (Rules R01 — R06)

Prior to any generative LLM inference, clinical symptom strings pass through the deterministic risk rules engine (`app/services/risk_engine.py`). These hardcoded rules guarantee zero false-negatives on life-threatening conditions:

```
                  ┌─────────────────────────────────────┐
                  │    Patient Symptoms & Intake Data   │
                  └──────────────────┬──────────────────┘
                                     │
                     ┌───────────────▼───────────────┐
                     │ Deterministic Safety Rules    │
                     │ Engine (Rules R01 - R06)      │
                     └───────┬───────────────┬───────┘
            Rule Match       │               │ No Emergency Rule
      ┌──────────────────────┘               └──────────────────────┐
      ▼                                                             ▼
┌───────────────────────────────┐                  ┌────────────────────────────────┐
│ Immediate Urgent/Red Flag     │                  │ Standard Multi-Tier AI Triage  │
│ Telemetry & Escalation Notice │                  │ & SOAP Note Synthesis          │
└───────────────────────────────┘                  └────────────────────────────────┘
```

| Rule ID | Clinical Condition | Trigger Keywords / Thresholds | Safety Escalation Action |
|---|---|---|---|
| **TRIAGE-R01** | **Severe Respiratory Arrest / Distress** | Strider, cyanosis, gasping, SpO2 < 90%, respiratory rate > 30 | Immediate Emergency Department (ED) escalation; priority red alert. |
| **TRIAGE-R02** | **Pediatric Acute Decompensation** | Age < 5 years AND (grunting, chest indrawing, lethargy, persistent vomiting) | Priority Pediatrician evaluation within 15 minutes. |
| **TRIAGE-R03** | **Obstetric / Third-Trimester Urgency** | Pregnancy AND (vaginal bleeding, severe epigastric pain, severe headache, reduced fetal movement) | Immediate Labor & Delivery / Obstetric emergency referral. |
| **TRIAGE-R04** | **Acute Coronary Syndrome / Ischemia** | Crushing central chest pain, radiation to left arm/jaw, diaphoresis, dyspnea | Immediate ECG, 100% O2, ACLS-equipped transport readiness. |
| **TRIAGE-R05** | **Acute Neurological Deficit (Stroke)** | Sudden facial drooping, arm weakness, slurred speech (FAST criteria), acute confusion | Acute Stroke Pathway activation; primary CT window protocol. |
| **TRIAGE-R06** | **Severe Sepsis / Septic Shock** | qSOFA criteria (altered mental status, systolic BP ≤ 100 mmHg, respiratory rate ≥ 22) | Immediate intravenous fluid access, blood cultures, broad-spectrum antibiotics review. |

---

## 3. Clinical Validation & Algorithmic Performance Thresholds

All updates to the AI triage pipeline, OCR engine, or synthesis prompts must undergo retrospective benchmark evaluation against verified clinical test datasets:

| Metric | Minimum Acceptable Threshold | Clinical Rationale |
|---|---|---|
| **Red Flag Sensitivity (Emergency Cases)** | **$\ge 99.5\%$** | Zero tolerance for missed acute life-threatening emergencies. |
| **Routine / Priority Specificity** | **$\ge 92.0\%$** | Minimizes alert fatigue in primary health centers and district casualty units. |
| **Medical Entity Extraction Recall** | **$\ge 95.0\%$** | Ensures vital signs, medications, and laboratory values are accurately captured from narrative notes. |
| **PHI De-Identification Precision** | **$\ge 99.8\%$** | Prevents accidental transmission of patient direct identifiers to downstream processing models. |

---

## 4. Multilingual Clinical Translation Validation

CLINOVA AI supports multilingual intake across low-resource dialects (e.g. Odia, Hindi, Telugu, Tamil, Bengali).
- Translation pipelines must preserve critical clinical severity words (e.g., distinguishing "mild discomfort" from "crushing pain").
- Original untranslated patient speech/transcripts are immutably preserved in `raw_symptoms` alongside translated `normalized_symptoms` to prevent medical translation drift.
- Clinicians can toggle between original source text and normalized English translations at any point during review.
