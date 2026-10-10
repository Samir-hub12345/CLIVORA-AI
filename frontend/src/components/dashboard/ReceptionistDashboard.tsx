"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  CalendarCheck,
  CalendarX,
  Search,
  UserPlus,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ChevronRight,
  Filter,
  Check,
  Building,
  Phone,
  FileText,
  RotateCcw,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useClinova } from "@/lib/referenceContext";
import { TodayScheduleWidget, AppointmentItem } from "./TodayScheduleWidget";
import { submitPatientIntake, createPatient as apiCreatePatient } from "@/lib/api";
import { RoleGuard } from "@/components/common/RoleGuard";

export interface SyntheticReceptionRecord {
  id: string;
  synthetic_token: string;
  name: string;
  age_bracket: string;
  sex: string;
  phone: string;
  pathway: "OPD_GENERAL" | "EMERGENCY";
  consent: boolean;
  status: "Queue" | "Waiting" | "Engaged" | "Done";
  registered_at: string;
  chief_complaint: string;
}

const INITIAL_QUEUE_RECORDS: SyntheticReceptionRecord[] = [
  {
    id: "REC-PT-001",
    synthetic_token: "PT-SYN-0014",
    name: "Priya Das",
    age_bracket: "25-35 YRS",
    sex: "FEMALE",
    phone: "+91 98765 43210",
    pathway: "OPD_GENERAL",
    consent: true,
    status: "Waiting",
    registered_at: "Today, 08:30 AM",
    chief_complaint: "Mild persistent cough and sore throat for 3 days",
  },
  {
    id: "REC-PT-002",
    synthetic_token: "PT-SYN-0842",
    name: "Rajesh Kumar",
    age_bracket: "50-65 YRS",
    sex: "MALE",
    phone: "+91 94321 09876",
    pathway: "EMERGENCY",
    consent: true,
    status: "Engaged",
    registered_at: "Today, 08:45 AM",
    chief_complaint: "Acute crushing retrosternal chest pain radiating to left arm",
  },
  {
    id: "REC-PT-003",
    synthetic_token: "PT-SYN-0319",
    name: "Sunita Rao",
    age_bracket: "35-50 YRS",
    sex: "FEMALE",
    phone: "+91 91234 56789",
    pathway: "OPD_GENERAL",
    consent: true,
    status: "Queue",
    registered_at: "Today, 09:10 AM",
    chief_complaint: "High febrile illness with body chills and persistent headache",
  },
  {
    id: "REC-PT-004",
    synthetic_token: "CLN-10482",
    name: "Ada Okafor",
    age_bracket: "35-50 YRS",
    sex: "FEMALE",
    phone: "+234 803 555 0142",
    pathway: "OPD_GENERAL",
    consent: true,
    status: "Queue",
    registered_at: "Today, 09:25 AM",
    chief_complaint: "Routine chronic care review and prescription renewal",
  },
  {
    id: "REC-PT-005",
    synthetic_token: "PT-SYN-0099",
    name: "Elena Kostov",
    age_bracket: "65+ YRS",
    sex: "FEMALE",
    phone: "+91 95551 23456",
    pathway: "EMERGENCY",
    consent: true,
    status: "Waiting",
    registered_at: "Today, 09:40 AM",
    chief_complaint: "Oxygen saturation 89% and severe dyspnea on minimal exertion",
  },
];

export const ReceptionistDashboard: React.FC = () => {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const { user, toast, addPatient, addAppointment, cancelAppointment, addTriageCase } = useClinova();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "register" | "appointments" | "checkin" | "queue" | "lookup" | "notifications"
  >("dashboard");

  // Synchronize tab parameter with active view
  React.useEffect(() => {
    if (!tabParam) return;
    const tabMap: Record<string, any> = {
      schedule: "appointments",
      appointments: "appointments",
      register: "register",
      checkin: "checkin",
      queue: "queue",
      lookup: "lookup",
      notifications: "notifications",
    };
    if (tabMap[tabParam]) {
      setActiveTab(tabMap[tabParam]);
    }
  }, [tabParam]);

  const [records, setRecords] = useState<SyntheticReceptionRecord[]>(INITIAL_QUEUE_RECORDS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<SyntheticReceptionRecord | null>(null);

  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regAgeBracket, setRegAgeBracket] = useState("25-35 YRS");
  const [regSex, setRegSex] = useState("FEMALE");
  const [regPhone, setRegPhone] = useState("");
  const [regPathway, setRegPathway] = useState<"OPD_GENERAL" | "EMERGENCY">("OPD_GENERAL");
  const [regComplaint, setRegComplaint] = useState("");
  const [regConsent, setRegConsent] = useState(true);

  // Modals
  const [isBookApptModalOpen, setIsBookApptModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [targetPatientForAction, setTargetPatientForAction] = useState<SyntheticReceptionRecord | null>(null);

  // New appointment form
  const [apptPatient, setApptPatient] = useState("Ada Okafor");
  const [apptClinician, setApptClinician] = useState("Dr. Joshua Ajose");
  const [apptTime, setApptTime] = useState("11:30");
  const [apptRoom, setApptRoom] = useState("Room 2");

  // Check existing patient duplicate check
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const checkDuplicate = (phoneOrName: string) => {
    if (!phoneOrName.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const clean = phoneOrName.trim().toLowerCase();
    const existing = records.find(
      (r) => r.phone.replace(/\s+/g, "").includes(clean) || r.name.toLowerCase().includes(clean)
    );
    if (existing) {
      setDuplicateWarning(`Potential duplicate: ${existing.name} (${existing.synthetic_token}) already exists`);
    } else {
      setDuplicateWarning(null);
    }
  };

  // Register Patient Action
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      toast("Incomplete registration", "Name and phone are required", "warning");
      return;
    }

    const nextId = "PT-SYN-" + Math.floor(1000 + Math.random() * 9000);
    const newRecord: SyntheticReceptionRecord = {
      id: "REC-PT-" + String(records.length + 1).padStart(3, "0"),
      synthetic_token: nextId,
      name: regName.trim(),
      age_bracket: regAgeBracket,
      sex: regSex,
      phone: regPhone.trim(),
      pathway: regPathway,
      consent: regConsent,
      status: "Queue",
      registered_at: "Just now",
      chief_complaint: regComplaint.trim() || "General clinical intake",
    };

    setRecords((prev) => [newRecord, ...prev]);

    // Background sync with API
    addPatient({
      name: newRecord.name,
      phone: newRecord.phone,
      sex: newRecord.sex,
    });
    addTriageCase({
      id: newRecord.synthetic_token,
      caseId: "CASE-SYNTH-" + Math.floor(100 + Math.random() * 900),
      name: newRecord.name,
      ward: newRecord.pathway === "EMERGENCY" ? "EMERGENCY / ER-01" : "OPD / OPD-01",
      vitalsNote: `Registered at front desk: ${newRecord.chief_complaint}`,
      score: newRecord.pathway === "EMERGENCY" ? 95 : 10,
      acuity: newRecord.pathway === "EMERGENCY" ? "HIGH" : "LOW",
      hr: 78,
      bp: "120/80",
      spo2: 98,
      temp: 37.0,
      rr: 16,
      symptoms: [newRecord.chief_complaint],
      missingInfo: ["Vital Signs Acquisition"],
    });
    apiCreatePatient({
      synthetic_id: newRecord.synthetic_token,
      age_bracket: newRecord.age_bracket,
      biological_sex: newRecord.sex,
      is_synthetic: true,
    }).catch(() => {});

    toast("Patient registered", `${newRecord.name} issued token ${newRecord.synthetic_token}`, "success");
    setRegName("");
    setRegPhone("");
    setRegComplaint("");
    setDuplicateWarning(null);
    setActiveTab("queue");
  };

  // Check In action
  const handleCheckIn = (tokenOrId: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.synthetic_token === tokenOrId || r.id === tokenOrId ? { ...r, status: "Waiting" } : r))
    );
    toast("Check-in confirmed", `Patient marked as Waiting for nurse triage`, "success");
  };

  // Route to intake action
  const handleRouteToIntake = (recordId: string, pathway: "OPD_GENERAL" | "EMERGENCY") => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, pathway, status: "Waiting" } : r))
    );
    toast("Patient routed", `Assigned to ${pathway === "EMERGENCY" ? "Emergency Resuscitation" : "General OPD"} triage queue`, "info");
  };

  // Cancel / Reschedule action
  const handleCancelAppt = (recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    setReceptionAppointments((prev) => prev.filter((a) => a.id !== recordId && a.patientId !== recordId));
    cancelAppointment(recordId);
    toast("Appointment cancelled", "Patient removed from active daily schedule", "info");
    setIsRescheduleModalOpen(false);
  };

  // Metric counts
  const queueCount = records.filter((r) => r.status === "Queue").length;
  const waitingCount = records.filter((r) => r.status === "Waiting").length;
  const engagedCount = records.filter((r) => r.status === "Engaged").length;
  const doneCount = records.filter((r) => r.status === "Done").length;

  const [receptionAppointments, setReceptionAppointments] = useState<AppointmentItem[]>([
    { id: "apt-1", time: "09:00 AM", patient: "Ada Okafor", patientId: "P-101", type: "Follow-up", clinician: "Dr. Joshua Ajose", status: "In progress", mine: true, avatar: "AO" },
    { id: "apt-2", time: "09:30 AM", patient: "Priya Das", patientId: "P-102", type: "Consultation", clinician: "Dr. Michael Smith", status: "In progress", mine: false, avatar: "PD" },
    { id: "apt-3", time: "10:15 AM", patient: "Rajesh Kumar", patientId: "P-103", type: "Urgent", clinician: "Dr. Joshua Ajose", status: "In progress", mine: true, avatar: "RK" },
    { id: "apt-4", time: "11:00 AM", patient: "Sunita Rao", patientId: "P-104", type: "New Visit", clinician: "Dr. Emily Davis", status: "Scheduled", mine: false, avatar: "SR" },
    { id: "apt-5", time: "11:45 AM", patient: "Elena Kostov", patientId: "P-105", type: "Evaluation", clinician: "Dr. Michael Smith", status: "Scheduled", mine: true, avatar: "EK" },
  ]);

  return (
    <RoleGuard
      allowedRoles={["RECEPTIONIST", "SYSTEM_ADMIN", "CLINICIAN", "FACILITY_ADMIN"]}
      title="Receptionist Access Restricted"
      message="Only authorized front desk personnel and administrators may access the patient registration and check-in desk."
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 48px" }}>
        {/* Top Header matching Reference Image 3: HTN Receptionist */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--navy-900)" }}>Receptionist</h1>
              <span className="badge badge-teal">Front Desk Operations</span>
            </div>
            <p style={{ color: "var(--text-3)", fontSize: "0.9375rem", marginTop: 4 }}>
              Today’s patient arrivals, registration check-in, and pathway intake routing
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="input-group hide-mobile" style={{ width: 280 }}>
              <Search style={{ width: 16, height: 16, color: "var(--text-4)" }} />
              <input
                type="search"
                className="input"
                placeholder="Search here..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab("register")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <UserPlus style={{ width: 16, height: 16 }} />
              <span>Register Patient</span>
            </button>
          </div>
        </header>

        {/* Navigation Tabs matching Section 5 */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "register", label: "Patient Registration" },
            { id: "appointments", label: "Appointments" },
            { id: "checkin", label: "Check-in" },
            { id: "queue", label: "Patient Queue" },
            { id: "lookup", label: "Patient Lookup" },
            { id: "notifications", label: "Notifications" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
              {activeTab === tab.id && <span className="tab-indicator" />}
            </button>
          ))}
        </div>

        {/* Subview 1: Main Dashboard (Exact Visual Reference 3) */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Four Pastel Stat Cards (Matching Reference Image 3) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {/* Pink Card: 39 Patients */}
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 124,
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Users style={{ width: 20, height: 20 }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--navy-900)", lineHeight: 1 }}>
                    39
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                    PATIENTS
                  </div>
                </div>
              </div>

              {/* Cream/Orange Card: 7 Appointments */}
              <div
                style={{
                  backgroundColor: "#fef3c7",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 124,
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#f59e0b",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Calendar style={{ width: 20, height: 20 }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--navy-900)", lineHeight: 1 }}>
                    7
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                    APPOINTMENTS
                  </div>
                </div>
              </div>

              {/* Light Green Card: 5 Today Patients */}
              <div
                style={{
                  backgroundColor: "#dcfce7",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 124,
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CalendarCheck style={{ width: 20, height: 20 }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--navy-900)", lineHeight: 1 }}>
                    5
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                    TODAY PATIENTS
                  </div>
                </div>
              </div>

              {/* Light Purple Card: 8 Cancelled Appointments */}
              <div
                style={{
                  backgroundColor: "#f3e8ff",
                  borderRadius: 16,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 124,
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#a855f7",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CalendarX style={{ width: 20, height: 20 }} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--navy-900)", lineHeight: 1 }}>
                    8
                  </div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7e22ce", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
                    CANCELLED APPOINTMENTS
                  </div>
                </div>
              </div>
            </div>

            {/* Queue Status Pipeline Card (Matching Reference Image 3) */}
            <div className="card" style={{ padding: "24px 28px", borderRadius: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 24,
                }}
              >
                {/* Column 1: Queue */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: "#0284c7", fontSize: "0.9375rem" }}>Queue</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--navy-900)" }}>{queueCount}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: 10 }}>Appointments</div>
                  <div style={{ width: "100%", height: 8, backgroundColor: "#e0f2fe", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "45%", height: "100%", backgroundColor: "#0284c7", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 6 }}>
                    <span>Queue</span>
                    <span className="badge badge-info" style={{ height: 18, fontSize: "0.6875rem" }}>45%</span>
                  </div>
                </div>

                {/* Column 2: Waiting */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: "#10b981", fontSize: "0.9375rem" }}>Waiting</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--navy-900)" }}>{waitingCount}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: 10 }}>Appointments</div>
                  <div style={{ width: "100%", height: 8, backgroundColor: "#d1fae5", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "20%", height: "100%", backgroundColor: "#10b981", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 6 }}>
                    <span>Waiting</span>
                    <span className="badge badge-success" style={{ height: 18, fontSize: "0.6875rem" }}>20%</span>
                  </div>
                </div>

                {/* Column 3: Engaged */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: "#8b5cf6", fontSize: "0.9375rem" }}>Engaged</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--navy-900)" }}>{engagedCount}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: 10 }}>Appointments</div>
                  <div style={{ width: "100%", height: 8, backgroundColor: "#ede9fe", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "15%", height: "100%", backgroundColor: "#8b5cf6", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 6 }}>
                    <span>Engaged</span>
                    <span className="badge badge-purple" style={{ height: 18, fontSize: "0.6875rem" }}>15%</span>
                  </div>
                </div>

                {/* Column 4: Done */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: "0.9375rem" }}>Done</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--navy-900)" }}>{doneCount}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginBottom: 10 }}>Appointments</div>
                  <div style={{ width: "100%", height: 8, backgroundColor: "#fef3c7", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: "20%", height: "100%", backgroundColor: "#f59e0b", borderRadius: 4 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-3)", marginTop: 6 }}>
                    <span>Done</span>
                    <span className="badge badge-warning" style={{ height: 18, fontSize: "0.6875rem" }}>20%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Recent Activities & Average Wait Time (Matching Reference Image 3) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Left: Recent Activities */}
              <div className="card" style={{ padding: "20px 24px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Recent Activities</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("notifications")}>
                    View all
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.8125rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-2)" }}>Patient Check-In (Ada Okafor)</span>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>03:30 PM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-2)" }}>Doctor Going on Break</span>
                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>02:45 PM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-2)" }}>Doctor Not Available</span>
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>01:00 PM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-2)" }}>Appointment Canceled</span>
                    <span style={{ color: "#0284c7", fontWeight: 600 }}>11:37 AM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-2)" }}>Doctor Signing In</span>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>10:05 AM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-2)" }}>New Patient Registration (Priya Das)</span>
                    <span style={{ color: "#0284c7", fontWeight: 600 }}>11:37 AM</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-2)" }}>Appointment Rescheduled</span>
                    <span style={{ color: "#8b5cf6", fontWeight: 600 }}>10:25 AM</span>
                  </div>
                </div>
              </div>

              {/* Right: Average Patient Wait Time Chart */}
              <div className="card" style={{ padding: "20px 24px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Average Patient Wait Time</h3>
                  <span className="badge badge-teal">Avg: 22 mins</span>
                </div>

                {/* SVG Bar Chart matching Reference Image 3 */}
                <div style={{ width: "100%", height: 160, position: "relative" }}>
                  <svg viewBox="0 0 320 140" style={{ width: "100%", height: "100%" }}>
                    {/* Y Grid Lines */}
                    <line x1="30" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="30" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="30" y1="100" x2="300" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="30" y1="120" x2="300" y2="120" stroke="#e2e8f0" strokeWidth="1" />

                    {/* Bars (Jan: 28m, Feb: 22m, Mar: 18m, Apr: 25m, May: 21m) */}
                    <rect x="50" y="44" width="24" height="76" rx="4" fill="#2563eb" />
                    <rect x="105" y="60" width="24" height="60" rx="4" fill="#2563eb" />
                    <rect x="160" y="76" width="24" height="44" rx="4" fill="#2563eb" />
                    <rect x="215" y="52" width="24" height="68" rx="4" fill="#2563eb" />
                    <rect x="270" y="64" width="24" height="56" rx="4" fill="#2563eb" />

                    {/* Labels */}
                    <text x="62" y="134" fontSize="10" fill="#64748b" textAnchor="middle">Jan</text>
                    <text x="117" y="134" fontSize="10" fill="#64748b" textAnchor="middle">Feb</text>
                    <text x="172" y="134" fontSize="10" fill="#64748b" textAnchor="middle">Mar</text>
                    <text x="227" y="134" fontSize="10" fill="#64748b" textAnchor="middle">Apr</text>
                    <text x="282" y="134" fontSize="10" fill="#64748b" textAnchor="middle">May</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subview 2: Patient Registration Form */}
        {activeTab === "register" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 8px" }}>
              New Patient Registration Desk
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "0 0 20px" }}>
              Validate required patient identifiers, digital consent, and clinical intake pathway
            </p>

            {duplicateWarning && (
              <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                <AlertTriangle style={{ width: 16, height: 16 }} />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleRegisterPatient} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="grid grid-2 gap-4">
                <div className="field">
                  <label className="label">
                    Full Legal Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      checkDuplicate(e.target.value);
                    }}
                    placeholder="e.g. Ananya Patel"
                    required
                  />
                </div>

                <div className="field">
                  <label className="label">
                    Contact Phone Number <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    className="input"
                    value={regPhone}
                    onChange={(e) => {
                      setRegPhone(e.target.value);
                      checkDuplicate(e.target.value);
                    }}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-3 gap-4">
                <div className="field">
                  <label className="label">Age Bracket</label>
                  <select
                    className="select"
                    value={regAgeBracket}
                    onChange={(e) => setRegAgeBracket(e.target.value)}
                  >
                    <option value="0-12 YRS">Pediatric (0-12 yrs)</option>
                    <option value="13-24 YRS">Youth (13-24 yrs)</option>
                    <option value="25-35 YRS">Adult (25-35 yrs)</option>
                    <option value="36-50 YRS">Adult (36-50 yrs)</option>
                    <option value="50-65 YRS">Mature (50-65 yrs)</option>
                    <option value="65+ YRS">Geriatric (65+ yrs)</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Biological Sex</label>
                  <select className="select" value={regSex} onChange={(e) => setRegSex(e.target.value)}>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Authorized Pathway</label>
                  <select
                    className="select"
                    value={regPathway}
                    onChange={(e) => setRegPathway(e.target.value as any)}
                  >
                    <option value="OPD_GENERAL">General OPD</option>
                    <option value="EMERGENCY">Emergency Resuscitation</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="label">Presenting Complaint</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={regComplaint}
                  onChange={(e) => setRegComplaint(e.target.value)}
                  placeholder="Reason for visit, onset duration, and chief complaints..."
                />
              </div>

              <div className="checkbox" style={{ margin: "4px 0" }}>
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={regConsent}
                  onChange={(e) => setRegConsent(e.target.checked)}
                />
                <label htmlFor="consentCheck" style={{ fontSize: "0.875rem" }}>
                  DPDP Act 2023 Digital Consent signed & clinical triage authorization on file
                </label>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => checkDuplicate(regName || regPhone)}
                >
                  <Search style={{ width: 15, height: 15 }} />
                  <span>Check Existing Patient</span>
                </button>
                <button type="submit" className="btn btn-primary">
                  <UserPlus style={{ width: 15, height: 15 }} />
                  <span>Register Patient</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subview 3: Appointments (embeds TodayScheduleWidget with appointments={receptionAppointments}) */}
        {activeTab === "appointments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card" style={{ padding: 20, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Front Desk Appointments</h2>
                  <p style={{ color: "var(--text-3)", fontSize: "0.8125rem", margin: 0 }}>
                    Schedule, check-in, or reschedule upcoming appointments
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsBookApptModalOpen(true)}>
                  Book Appointment
                </button>
              </div>
              <TodayScheduleWidget appointments={receptionAppointments} />
            </div>
          </div>
        )}

        {/* Subview 4: Check-in Desk */}
        {activeTab === "checkin" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 12px" }}>
              Patient Attendance Check-In
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "0 0 20px" }}>
              Scan or enter patient token to confirm attendance and move to nurse triage queue
            </p>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient Name</th>
                    <th>Pathway</th>
                    <th>Registered At</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.synthetic_token}</td>
                      <td>{r.name}</td>
                      <td>
                        <span className={`badge ${r.pathway === "EMERGENCY" ? "badge-error" : "badge-teal"}`}>
                          {r.pathway}
                        </span>
                      </td>
                      <td className="subtle">{r.registered_at}</td>
                      <td>
                        <span className="badge badge-info">{r.status}</span>
                      </td>
                      <td>
                        {r.status === "Queue" ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleCheckIn(r.synthetic_token)}
                          >
                            Check In
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>
                            Checked In
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subview 5: Patient Queue */}
        {activeTab === "queue" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Active Patient Queue</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: 0 }}>
                  Real-time facility arrival queue with triage assignment
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => toast("Queue refreshed", "Live patient queue fetched", "info")}
              >
                <RotateCcw style={{ width: 14, height: 14 }} />
                <span>View Queue</span>
              </button>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient</th>
                    <th>Age / Sex</th>
                    <th>Complaint</th>
                    <th>Pathway</th>
                    <th>Status</th>
                    <th>Routing Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.synthetic_token}</td>
                      <td>{r.name}</td>
                      <td className="subtle">{r.age_bracket} · {r.sex}</td>
                      <td style={{ maxWidth: 200 }} className="ellipsis">{r.chief_complaint}</td>
                      <td>
                        <span className={`badge ${r.pathway === "EMERGENCY" ? "badge-error" : "badge-teal"}`}>
                          {r.pathway}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">{r.status}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedRecord(r)}
                          >
                            Open Patient
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRouteToIntake(r.id, r.pathway === "OPD_GENERAL" ? "EMERGENCY" : "OPD_GENERAL")}
                          >
                            Assign/Route
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subview 6: Patient Lookup */}
        {activeTab === "lookup" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 12px" }}>
              Patient Lookup & Identity Verification
            </h2>
            <div className="input-group" style={{ maxWidth: 440, marginBottom: 20 }}>
              <Search style={{ width: 16, height: 16 }} />
              <input
                type="search"
                className="input"
                placeholder="Search by name, phone, or token (e.g. PT-SYN-0014)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Sex</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter((r) =>
                      !searchQuery ||
                      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.synthetic_token.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.phone.includes(searchQuery)
                    )
                    .map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.synthetic_token}</td>
                        <td>{r.name}</td>
                        <td className="subtle">{r.phone}</td>
                        <td>{r.sex}</td>
                        <td><span className="badge badge-teal">{r.status}</span></td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedRecord(r)}
                          >
                            Open Patient
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subview 7: Notifications */}
        {activeTab === "notifications" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 16px" }}>
              Front Desk Alerts & Activity Log
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 8, backgroundColor: "var(--surface-subtle)" }}>
                <div style={{ fontWeight: 600 }}>New Patient Checked In: Ada Okafor</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 2 }}>
                  Today at 09:25 AM · Routed to OPD Triage
                </div>
              </div>
              <div style={{ padding: 14, borderRadius: 8, backgroundColor: "var(--surface-subtle)" }}>
                <div style={{ fontWeight: 600 }}>Emergency Triage Alert: Rajesh Kumar</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 2 }}>
                  Today at 08:45 AM · Acute chest pain routed to Resuscitation Bay
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Open Patient Details (Receptionist permitted view) */}
        {selectedRecord && (
          <div className="overlay" onClick={() => setSelectedRecord(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>{selectedRecord.name}</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Token: {selectedRecord.synthetic_token} · {selectedRecord.age_bracket} · {selectedRecord.sex}
                  </p>
                </div>
              </div>
              <div className="modal-body stack gap-3" style={{ fontSize: "0.875rem" }}>
                <div>
                  <strong>Phone:</strong> {selectedRecord.phone}
                </div>
                <div>
                  <strong>Presenting Pathway:</strong>{" "}
                  <span className={`badge ${selectedRecord.pathway === "EMERGENCY" ? "badge-error" : "badge-teal"}`}>
                    {selectedRecord.pathway}
                  </span>
                </div>
                <div>
                  <strong>Queue Status:</strong> {selectedRecord.status}
                </div>
                <div>
                  <strong>Registration Time:</strong> {selectedRecord.registered_at}
                </div>
                <div style={{ padding: 10, borderRadius: 6, backgroundColor: "var(--surface-subtle)" }}>
                  <strong>Chief Complaint:</strong>
                  <div style={{ marginTop: 4 }}>{selectedRecord.chief_complaint}</div>
                </div>
                <p className="xs subtle" style={{ margin: 0 }}>
                  Note: Sensitive medical diagnosis and clinician notes are restricted from receptionist access.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setTargetPatientForAction(selectedRecord);
                    setIsRescheduleModalOpen(true);
                  }}
                >
                  Cancel / Reschedule
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleCheckIn(selectedRecord.synthetic_token);
                    setSelectedRecord(null);
                  }}
                >
                  Check In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Book Appointment */}
        {isBookApptModalOpen && (
          <div className="overlay" onClick={() => setIsBookApptModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Book Front Desk Appointment</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Schedule patient with doctor and assign room
                  </p>
                </div>
              </div>
              <div className="modal-body stack gap-3">
                <div className="field">
                  <label className="label">Patient Name</label>
                  <input
                    type="text"
                    className="input"
                    value={apptPatient}
                    onChange={(e) => setApptPatient(e.target.value)}
                    placeholder="Enter patient full name..."
                  />
                </div>
                <div className="field">
                  <label className="label">Clinician</label>
                  <select
                    className="select"
                    value={apptClinician}
                    onChange={(e) => setApptClinician(e.target.value)}
                  >
                    <option value="Dr. Joshua Ajose">Dr. Joshua Ajose</option>
                    <option value="Dr. Michael Smith">Dr. Michael Smith</option>
                    <option value="Dr. Emily Davis">Dr. Emily Davis</option>
                  </select>
                </div>
                <div className="grid grid-2 gap-2">
                  <div className="field">
                    <label className="label">Time Slot</label>
                    <input
                      type="time"
                      className="input"
                      value={apptTime}
                      onChange={(e) => setApptTime(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="label">Consultation Room</label>
                    <input
                      type="text"
                      className="input"
                      value={apptRoom}
                      onChange={(e) => setApptRoom(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBookApptModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const formattedTime = apptTime.includes(":")
                      ? parseInt(apptTime.split(":")[0]) >= 12
                        ? `${parseInt(apptTime.split(":")[0]) === 12 ? 12 : parseInt(apptTime.split(":")[0]) - 12}:${apptTime.split(":")[1]} PM`
                        : `${apptTime} AM`
                      : apptTime;
                    const newApt: AppointmentItem = {
                      id: "apt-" + (receptionAppointments.length + 1),
                      time: formattedTime,
                      patient: apptPatient || "Walk-in Patient",
                      patientId: "PT-" + Math.floor(100 + Math.random() * 900),
                      type: "Consultation",
                      clinician: apptClinician,
                      status: "Scheduled",
                      mine: true,
                      avatar: (apptPatient || "WP").slice(0, 2).toUpperCase(),
                    };
                    setReceptionAppointments((prev) => [newApt, ...prev]);
                    addAppointment({
                      patientId: newApt.patientId,
                      time: newApt.time,
                      type: newApt.type,
                      clinician: apptClinician,
                      room: apptRoom,
                      status: "Scheduled",
                    });
                    toast("Appointment scheduled", `Booked ${newApt.patient} with ${apptClinician} at ${formattedTime} (${apptRoom})`, "success");
                    setIsBookApptModalOpen(false);
                  }}
                >
                  Save Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Cancel / Reschedule */}
        {isRescheduleModalOpen && targetPatientForAction && (
          <div className="overlay" onClick={() => setIsRescheduleModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Manage Appointment</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    {targetPatientForAction.name} ({targetPatientForAction.synthetic_token})
                  </p>
                </div>
              </div>
              <div className="modal-body stack gap-3">
                <p style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>
                  Choose to cancel this patient visit or update the scheduled consultation time.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleCancelAppt(targetPatientForAction.id)}
                >
                  Cancel Appointment
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    toast("Rescheduled", `Updated booking for ${targetPatientForAction.name}`, "success");
                    setIsRescheduleModalOpen(false);
                    setSelectedRecord(null);
                  }}
                >
                  Reschedule Time
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};
