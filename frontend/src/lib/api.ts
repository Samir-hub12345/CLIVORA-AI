import {
  User,
  Patient,
  Consultation,
  TriageResponse,
  SOAPGenerateResponse,
  AuditLog,
  VitalsInput,
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
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
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
  } catch (error: any) {
    return {
      error: error?.message || "Network error. Please ensure Clinova AI services are running.",
      status: 500,
    };
  }
}

// API Service Callers
export const api = {
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
};
