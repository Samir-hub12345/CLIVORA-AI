"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Persona } from "@/types";
import {
  getStoredUser,
  getCurrentUser,
  login,
  logout,
  switchPersona,
  getPersonas,
  FALLBACK_PERSONAS,
  submitClinicianDecision,
  createPatient as apiCreatePatient,
  downloadCaseReportPdf,
} from "./api";
import {
  Patient,
  Appointment,
  Consultation,
  ReviewItem,
  LabResult,
  FollowUpItem,
  AuditEntry,
  SEED_PATIENTS,
  SEED_APPOINTMENTS,
  SEED_CONSULTATIONS,
  SEED_REVIEWS,
  SEED_LABS,
  SEED_FOLLOWUPS,
  SEED_AUDIT,
} from "./referenceData";

export interface ToastItem {
  id: string;
  title: string;
  desc?: string;
  tone?: "success" | "warning" | "error" | "info";
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  at: string;
  to: string;
  read: boolean;
}

export interface ClinovaContextType {
  user: Persona | null;
  personas: Persona[];
  patients: Patient[];
  appointments: Appointment[];
  consultations: Record<string, Consultation>;
  reviews: ReviewItem[];
  labs: LabResult[];
  followUps: FollowUpItem[];
  audit: AuditEntry[];
  notifications: NotificationItem[];
  toasts: ToastItem[];
  me: {
    id: string;
    name: string;
    role: string;
    facility: string;
  };
  can: (permission: string) => boolean;
  toast: (title: string, desc?: string, tone?: "success" | "warning" | "error" | "info") => void;
  removeToast: (id: string) => void;
  dismissNotification: (id: string) => void;
  signIn: (roleOrUsername: string, password?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchRole: (roleId: string) => Promise<void>;
  addPatient: (patient: Partial<Patient>) => string;
  startConsult: (patientId: string) => string;
  updateConsult: (id: string, updater: (prev: Consultation) => Partial<Consultation>, logReason?: string) => void;
  setReviewStatus: (
    id: string,
    status: "approved" | "rejected" | "clarification",
    details?: { resolvedBy?: string; resolvedAt?: string; note?: string }
  ) => void;
  ackLab: (reportId: string) => void;
  addFollowUp: (item: Partial<FollowUpItem>) => void;
  updateFollowUp: (id: string, updater: (prev: FollowUpItem) => Partial<FollowUpItem>) => void;
  log: (entry: Partial<AuditEntry>) => void;
  exportPdfReport: (caseOrEncounterId: string) => Promise<void>;
}

const PERMISSIONS_MAP: Record<string, string[]> = {
  clinician: [
    "view_clinical",
    "edit_notes",
    "approve_notes",
    "sign_notes",
    "ack_labs",
    "approve_messages",
    "send_messages",
    "view_audit",
    "manage_followups",
    "register",
    "manage_settings",
  ],
  doctor: [
    "view_clinical",
    "edit_notes",
    "approve_notes",
    "sign_notes",
    "ack_labs",
    "approve_messages",
    "send_messages",
    "view_audit",
    "manage_followups",
    "register",
    "manage_settings",
  ],
  nurse: [
    "view_clinical",
    "edit_notes",
    "ack_labs",
    "approve_messages",
    "send_messages",
    "manage_followups",
    "register",
  ],
  receptionist: ["register", "manage_followups"],
  facility_admin: [
    "view_audit",
    "manage_settings",
    "manage_followups",
    "register",
    "send_messages",
  ],
  admin: [
    "view_audit",
    "manage_settings",
    "manage_followups",
    "register",
    "send_messages",
  ],
  system_admin: [
    "view_audit",
    "manage_settings",
    "manage_followups",
    "register",
    "send_messages",
  ],
  patient: ["view_patient_portal"],
};

const ClinovaContext = createContext<ClinovaContextType | null>(null);

export const ClinovaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Persona | null>(() => getStoredUser());
  const [personas, setPersonas] = useState<Persona[]>(FALLBACK_PERSONAS);
  const [patients, setPatients] = useState<Patient[]>(SEED_PATIENTS);
  const [appointments, setAppointments] = useState<Appointment[]>(SEED_APPOINTMENTS);
  const [consultations, setConsultations] = useState<Record<string, Consultation>>(SEED_CONSULTATIONS);
  const [reviews, setReviews] = useState<ReviewItem[]>(SEED_REVIEWS);
  const [labs, setLabs] = useState<LabResult[]>(SEED_LABS);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>(SEED_FOLLOWUPS);
  const [audit, setAudit] = useState<AuditEntry[]>(SEED_AUDIT);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n1",
      title: "Lab summary ready for review",
      body: "Ibrahim Danladi · Full blood count",
      at: "08:05",
      to: "/review?tab=lab",
      read: false,
    },
    {
      id: "n2",
      title: "Ada Okafor checked in",
      body: "10:30 consultation · Room 1",
      at: "10:24",
      to: "/patients/CLN-10482",
      read: false,
    },
    {
      id: "n3",
      title: "Clarification requested",
      body: "Conflicting medication dose · Oluwaseun Bakare",
      at: "09:50",
      to: "/review?tab=clarification",
      read: false,
    },
  ]);

  // Sync user state with session storage and custom auth events
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const custom = e as CustomEvent<{ user: Persona | null }>;
      if (custom.detail && custom.detail.user !== undefined) {
        setUser(custom.detail.user);
      } else {
        const u = getStoredUser();
        setUser(u);
      }
    };

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener("clinova_auth_changed", handleAuthChange);
    window.addEventListener("clinova_session_expired", handleExpired);

    // Initial check
    async function initAuth() {
      try {
        const u = await getCurrentUser();
        if (u) setUser(u);
        const plist = await getPersonas();
        if (plist && plist.length > 0) setPersonas(plist);
      } catch {
        // fallback active
      }
    }
    initAuth();

    return () => {
      window.removeEventListener("clinova_auth_changed", handleAuthChange);
      window.removeEventListener("clinova_session_expired", handleExpired);
    };
  }, []);

  const toast = useCallback(
    (title: string, desc?: string, tone: "success" | "warning" | "error" | "info" = "success") => {
      const id = "t_" + Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, title, desc, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      const roleKey = user.role.toLowerCase();
      const perms = PERMISSIONS_MAP[roleKey] || [];
      return perms.includes(permission);
    },
    [user]
  );

  const me = useMemo(() => {
    return {
      id: user?.id || "usr-clinician-01",
      name: user?.full_name || "Dr. Joshua Ajose",
      role: user?.role || "CLINICIAN",
      facility: user?.facility_name || "Lekki Family Health Clinic",
    };
  }, [user]);

  const log = useCallback(
    (entry: Partial<AuditEntry>) => {
      const newEntry: AuditEntry = {
        id: "au_" + Math.random().toString(36).slice(2, 8),
        ts: "Just now",
        actor: entry.actor || me.name,
        action: entry.action || "Action performed",
        category: entry.category || "Record access",
        record: entry.record || "—",
        outcome: entry.outcome || "Success",
        detail: entry.detail || "",
      };
      setAudit((prev) => [newEntry, ...prev]);
    },
    [me.name]
  );

  const signIn = useCallback(
    async (roleOrUsername: string, password = "ClinovaDemo2026!") => {
      try {
        const res = await login(roleOrUsername, password);
        setUser(res.user);
        toast("Signed in successfully", `Welcome, ${res.user.full_name}`, "success");
        return true;
      } catch (err: any) {
        toast("Sign in failed", err?.message || "Invalid credentials", "error");
        return false;
      }
    },
    [toast]
  );

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
    toast("Signed out", "Session closed securely", "info");
  }, [toast]);

  const switchRole = useCallback(
    async (roleId: string) => {
      try {
        const u = await switchPersona(roleId);
        setUser(u);
        log({
          action: `Switched demo role to ${u.role}`,
          category: "Permission change",
          actor: "Demo Switcher",
        });
        toast("Switched role", `Now viewing as ${u.role} (${u.full_name})`, "info");
      } catch (e: any) {
        toast("Role switch error", e?.message, "error");
      }
    },
    [log, toast]
  );

  const addPatient = useCallback(
    (data: Partial<Patient>): string => {
      const nextNum = Math.max(...patients.map((p) => Number(p.id.split("-")[1]) || 10400)) + 1;
      const id = `CLN-${nextNum}`;
      const newPatient: Patient = {
        id,
        name: data.name || "New Patient",
        dob: data.dob || "1990-01-01",
        sex: data.sex || "Female",
        phone: data.phone || "+234 800 000 0000",
        email: data.email,
        address: data.address,
        lastVisit: "Today",
        clinician: data.clinician || "joshua",
        recordStatus: data.recordStatus || "Complete",
        emergency: data.emergency,
        consent: data.consent || "On file — signed today",
        accessibility: data.accessibility || "None recorded",
        contactPref: data.contactPref || "SMS",
        language: data.language || "English",
      };
      setPatients((prev) => [newPatient, ...prev]);
      log({
        action: "Registered patient",
        category: "Record access",
        record: id,
        detail: `New patient record created for ${newPatient.name}`,
      });
      toast("Patient registered", `${newPatient.name} (${id}) added to clinic registry`, "success");

      // Background sync with API
      apiCreatePatient({
        synthetic_id: id,
        age_bracket: "Adult",
        biological_sex: newPatient.sex || "Unknown",
        is_synthetic: true,
      }).catch(() => {});

      return id;
    },
    [patients, log, toast]
  );

  const startConsult = useCallback(
    (patientId: string): string => {
      const p = patients.find((pat) => pat.id === patientId);
      const nextId = "ENC-" + (5900 + Object.keys(consultations).length + 1);
      const newConsult: Consultation = {
        id: nextId,
        patientId,
        clinician: "joshua",
        type: "Consultation",
        startedAt: "Just now",
        status: "In progress",
        rawNotes: "",
        sections: {
          chief: { text: "", origin: "empty" },
          hpi: { text: "", origin: "empty" },
          pmh: { text: p?.synthetic ? "Known history on file" : "", origin: "empty" },
          medsAllergies: { text: "", origin: "empty" },
          exam: { text: "", origin: "empty" },
          assessment: { text: "", origin: "empty" },
          plan: { text: "", origin: "empty" },
          followup: { text: "", origin: "empty" },
        },
        allergyConfirmed: false,
        medsReconciled: false,
      };

      setConsultations((prev) => ({ ...prev, [nextId]: newConsult }));
      log({
        action: "Consultation started",
        category: "Record access",
        record: `${patientId} · ${nextId}`,
        detail: `Encounter opened for ${p?.name || patientId}`,
      });
      return nextId;
    },
    [patients, consultations, log]
  );

  const updateConsult = useCallback(
    (id: string, updater: (prev: Consultation) => Partial<Consultation>, logReason?: string) => {
      setConsultations((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        const updated = { ...cur, ...updater(cur) };
        return { ...prev, [id]: updated };
      });
      if (logReason) {
        log({
          action: logReason,
          category: "Clinical review",
          record: id,
        });
      }
    },
    [log]
  );

  const setReviewStatus = useCallback(
    (
      id: string,
      status: "approved" | "rejected" | "clarification",
      details?: { resolvedBy?: string; resolvedAt?: string; note?: string }
    ) => {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                resolvedBy: details?.resolvedBy || me.name,
                resolvedAt: details?.resolvedAt || new Date().toISOString(),
                note: details?.note,
              }
            : r
        )
      );

      // Also call real API decision endpoint if documentation review
      submitClinicianDecision({
        case_id: "CASE-SYNTH-003",
        action: status === "approved" ? "VERIFY" : status === "rejected" ? "REJECT" : "REQUEST_INFO",
        clinician_id: me.id || "dr-joshua",
        notes: details?.note || `Attending clinician review ${status}`,
      }).catch(() => {});

      log({
        action: `Review ${status}`,
        category: "Approval",
        record: id,
        detail: details?.note || `Review status set to ${status}`,
      });
    },
    [me.name, log]
  );

  const ackLab = useCallback(
    (reportId: string) => {
      log({
        action: "Lab report acknowledged",
        category: "Approval",
        record: reportId,
        detail: "Clinician verified laboratory findings",
      });
      toast("Lab report acknowledged", `${reportId} marked as reviewed`, "success");
    },
    [log, toast]
  );

  const addFollowUp = useCallback(
    (data: Partial<FollowUpItem>) => {
      const nextId = "fu_" + Math.random().toString(36).slice(2, 7);
      const item: FollowUpItem = {
        id: nextId,
        patientId: data.patientId || "CLN-10482",
        reason: data.reason || "Post-consultation follow-up",
        due: data.due || "Tomorrow",
        owner: data.owner || "joshua",
        pref: data.pref || "Phone call",
        status: data.status || "Due today",
        attempts: [],
      };
      setFollowUps((prev) => [item, ...prev]);
      log({
        action: "Created follow-up",
        category: "Clinical review",
        record: item.patientId,
        detail: item.reason,
      });
      toast("Follow-up scheduled", item.reason, "success");
    },
    [log, toast]
  );

  const updateFollowUp = useCallback(
    (id: string, updater: (prev: FollowUpItem) => Partial<FollowUpItem>) => {
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updater(f) } : f))
      );
    },
    []
  );

  const exportPdfReport = useCallback(
    async (caseOrEncounterId: string) => {
      toast("Generating PDF", "Retrieving tamper-evident clinical report…", "info");
      try {
        const blob = await downloadCaseReportPdf(caseOrEncounterId || "CASE-SYNTH-003");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CLINOVA-${caseOrEncounterId}-report.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast("Report downloaded", "PDF report downloaded successfully", "success");
      } catch (e: any) {
        toast("Download failed", e?.message, "error");
      }
    },
    [toast]
  );

  const value: ClinovaContextType = {
    user,
    personas,
    patients,
    appointments,
    consultations,
    reviews,
    labs,
    followUps,
    audit,
    notifications,
    toasts,
    me,
    can,
    toast,
    removeToast,
    dismissNotification,
    signIn,
    signOut,
    switchRole,
    addPatient,
    startConsult,
    updateConsult,
    setReviewStatus,
    ackLab,
    addFollowUp,
    updateFollowUp,
    log,
    exportPdfReport,
  };

  return <ClinovaContext.Provider value={value}>{children}</ClinovaContext.Provider>;
};

export const useClinova = (): ClinovaContextType => {
  const ctx = useContext(ClinovaContext);
  if (!ctx) {
    throw new Error("useClinova must be used within a ClinovaProvider");
  }
  return ctx;
};
