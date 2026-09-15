export type UserRole = "admin" | "doctor" | "nurse" | "patient";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group?: string;
  phone?: string;
  email?: string;
  emergency_contact?: string;
  allergies?: string;
  current_medications?: string;
  medical_history?: string;
  created_at: string;
  updated_at: string;
  consultations?: Consultation[];
}

export type ConsultationStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type TriageLevel = "critical" | "urgent" | "routine" | "low" | "unassigned";

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  status: ConsultationStatus;
  triage_level: TriageLevel;
  chief_complaint: string;
  vitals_data?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  ai_generated_summary?: string;
  ai_differential_diagnosis?: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: User;
}

export interface VitalsInput {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  temperature?: number;
  pain_score?: number;
}

export interface DifferentialDiagnosisItem {
  condition: string;
  probability: string; // High, Moderate, Low
  rationale: string;
  recommended_workup: string[];
}

export interface TriageResponse {
  urgency_level: "CRITICAL" | "URGENT" | "ROUTINE" | "LOW" | string;
  urgency_color: string;
  emergency_red_flags: string[];
  differential_diagnoses: DifferentialDiagnosisItem[];
  immediate_actions: string[];
  clinical_reasoning: string;
  suggested_monitoring: string[];
  disclaimer: string;
  source: string;
}

export interface SOAPGenerateResponse {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  patient_friendly_summary: string;
  disclaimer: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  timestamp: string;
}
