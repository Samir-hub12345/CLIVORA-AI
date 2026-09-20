import {
  User,
  Patient,
  Consultation,
  TriageResponse,
  SOAPGenerateResponse,
  AuditLog,
  VitalsInput,
  TriageCase,
  ReportOCRResult,
  SpeechTranscribeResult,
  TranslationResult,
  ReferralNote,
  OCRField,
  PatientCase, PatientConsultation, CaseReceipt, PortalProfileInput, AdminOverview,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("clinova_token");
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("clinova_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("clinova_token");
    localStorage.removeItem("clinova_user");
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("clinova_user");
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem("clinova_user", JSON.stringify(user));
  }
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && token && token === getToken() && !endpoint.startsWith("/api/v1/auth/login")) {
        clearToken();
        window.dispatchEvent(new Event("clinova:session-expired"));
      }
      if (response.status === 403 && !endpoint.startsWith("/api/v1/auth/")) {
        window.dispatchEvent(new Event("clinova:access-denied"));
      }
      let errorMsg = response.statusText;
      if (data?.detail) {
        errorMsg = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
      return {
        error: errorMsg,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : "Network error. Please ensure Clinova AI services are running.",
      status: 500,
    };
  }
}

// API Service Callers
export const api = {
  getMyProfile: () => fetchApi<Patient | null>("/api/v1/portal/profile"),
  saveMyProfile: (payload: PortalProfileInput) => fetchApi<Patient>("/api/v1/portal/profile", { method: "PUT", body: JSON.stringify(payload) }),
  getMyCases: () => fetchApi<PatientCase[]>("/api/v1/portal/cases"),
  getMyConsultations: () => fetchApi<PatientConsultation[]>("/api/v1/portal/consultations"),
  getAdminOverview: () => fetchApi<AdminOverview>("/api/v1/admin/overview"),
  getAdminUsers: () => fetchApi<User[]>("/api/v1/admin/users"),
  // Auth
  async login(email: string, password: string) {
    const res = await fetchApi<{ access_token: string; user: User }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.data) {
      setToken(res.data.access_token);
      setStoredUser(res.data.user);
    }
    return res;
  },

  async register(payload: { email: string; password: string; full_name: string; role: string }) {
    return fetchApi<User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMe() {
    return fetchApi<User>("/api/v1/auth/me");
  },

  // Patients
  async getPatients(search?: string) {
    const query = search ? `?q=${encodeURIComponent(search)}` : "";
    return fetchApi<{ total: number; items: Patient[] }>(`/api/v1/patients${query}`);
  },

  async getPatient(id: string) {
    return fetchApi<Patient>(`/api/v1/patients/${id}`);
  },

  async createPatient(payload: Partial<Patient>) {
    return fetchApi<Patient>("/api/v1/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updatePatient(id: string, payload: Partial<Patient>) {
    return fetchApi<Patient>(`/api/v1/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // Consultations
  async getConsultations(filters?: { patientId?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.patientId) params.append("patient_id", filters.patientId);
    if (filters?.status) params.append("status", filters.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<{ total: number; items: Consultation[] }>(`/api/v1/consultations${qs}`);
  },

  async getConsultation(id: string) {
    return fetchApi<Consultation>(`/api/v1/consultations/${id}`);
  },

  async createConsultation(payload: {
    patient_id: string;
    chief_complaint: string;
    vitals_data?: string;
    triage_level?: string;
  }) {
    return fetchApi<Consultation>("/api/v1/consultations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateSoapNotes(
    id: string,
    soap: { subjective: string; objective: string; assessment: string; plan: string }
  ) {
    return fetchApi<Consultation>(`/api/v1/consultations/${id}/soap`, {
      method: "PUT",
      body: JSON.stringify(soap),
    });
  },

  // AI Decision Support
  async runTriage(payload: {
    chief_complaint: string;
    symptoms: string[];
    symptom_duration?: string;
    vitals?: VitalsInput;
    relevant_medical_history?: string;
    patient_id?: string;
  }) {
    return fetchApi<TriageResponse>("/api/v1/ai/triage", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async generateSoapNotes(payload: {
    patient_name?: string;
    chief_complaint: string;
    encounter_notes: string;
    vitals?: VitalsInput;
    medical_history?: string;
  }) {
    return fetchApi<SOAPGenerateResponse>("/api/v1/ai/soap-summary", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Audit Logs
  async getAuditLogs(limit: number = 50) {
    return fetchApi<{ total: number; items: AuditLog[] }>(`/api/v1/audit-logs?limit=${limit}`);
  },

  // -------------------------------------------------------------------------
  // PS03 Triage Assistant & Multimodal Endpoints
  // -------------------------------------------------------------------------
  async getCases(queueCategory?: string, statusFilter?: string) {
    const params = new URLSearchParams();
    if (queueCategory) params.append("queue_category", queueCategory);
    if (statusFilter) params.append("status_filter", statusFilter);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return fetchApi<TriageCase[]>(`/api/v1/cases${qs}`);
  },

  async getCase(caseId: string) {
    return fetchApi<TriageCase>(`/api/v1/cases/${caseId}`);
  },

  async createCase(payload: {
    preferred_language?: string;
    facility_type?: string;
    visit_type?: string;
    approximate_age?: number;
    gender?: string;
    context_notes?: string;
    raw_symptoms: string;
    speech_transcript?: string;
    detected_language?: string;
    report_filename?: string;
    report_ocr_data?: OCRField[];
    image_reference?: string;
    consent_acknowledged?: boolean;
  }) {
    return fetchApi<CaseReceipt>("/api/v1/cases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteCaseData(caseId: string) {
    return fetchApi<{ status: string; message: string }>(`/api/v1/cases/${caseId}`, {
      method: "DELETE",
    });
  },

  async transcribeSpeech(formData: FormData) {
    return fetchApi<SpeechTranscribeResult>("/api/v1/intake/speech", { method: "POST", body: formData });
  },

  async translateText(text: string, source_language: string = "or") {
    return fetchApi<TranslationResult>("/api/v1/intake/translate", {
      method: "POST",
      body: JSON.stringify({ text, source_language }),
    });
  },

  async processReportOCR(formData: FormData) {
    return fetchApi<ReportOCRResult>("/api/v1/intake/ocr", { method: "POST", body: formData });
  },

  async performReviewAction(
    caseId: string,
    payload: {
      action: "approve" | "edit" | "reject" | "escalate";
      reviewer_notes?: string;
      edited_summary?: string;
      confirmed_queue_category?: string;
      verified_ocr_fields?: OCRField[];
    }
  ) {
    return fetchApi<TriageCase>(`/api/v1/review/${caseId}/action`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getReferralNote(caseId: string) {
    return fetchApi<ReferralNote>(`/api/v1/review/${caseId}/referral`);
  },
};
