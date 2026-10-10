"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  AlertTriangle,
  AlertOctagon,
  BarChart3,
  RotateCw,
  Eye,
  Activity,
  HeartPulse,
  Thermometer,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  CheckSquare,
  Square,
  Calendar,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";
import { RoleGuard } from "@/components/common/RoleGuard";

export interface TriagePatientItem {
  id: string;
  caseId: string;
  name: string;
  ward: string;
  vitalsNote: string;
  score: number;
  acuity: "HIGH" | "MODERATE" | "LOW" | "CRITICAL";
  hr: number;
  bp: string;
  spo2: number;
  temp: number;
  rr: number;
  symptoms: string[];
  missingInfo: string[];
}

const INITIAL_TRIAGE_PATIENTS: TriagePatientItem[] = [
  {
    id: "PT-SYN-001",
    caseId: "CASE-SYNTH-001",
    name: "Elena Kostov",
    ward: "ICU / R001",
    vitalsNote: "Oxygen Saturation elevated (89% on room air)",
    score: 100,
    acuity: "HIGH",
    hr: 118,
    bp: "88/54",
    spo2: 89,
    temp: 38.6,
    rr: 28,
    symptoms: ["Severe acute dyspnea", "Accessory muscle use", "Diaphoresis"],
    missingInfo: ["Arterial Blood Gas (ABG)", "Baseline ECG"],
  },
  {
    id: "PT-SYN-002",
    caseId: "CASE-SYNTH-002",
    name: "Robert Chen",
    ward: "WARD-B / R201",
    vitalsNote: "Heart Rate elevated (112 bpm)",
    score: 57,
    acuity: "MODERATE",
    hr: 112,
    bp: "135/86",
    spo2: 96,
    temp: 37.8,
    rr: 20,
    symptoms: ["Palpitations", "Lightheadedness upon standing"],
    missingInfo: ["Serum Electrolytes Panel"],
  },
  {
    id: "PT-SYN-003",
    caseId: "CASE-SYNTH-003",
    name: "Kevin Durant",
    ward: "WARD-C / R302",
    vitalsNote: "Oxygen Saturation stable (97%)",
    score: 10,
    acuity: "LOW",
    hr: 76,
    bp: "122/78",
    spo2: 97,
    temp: 36.8,
    rr: 16,
    symptoms: ["Mild productive cough", "Low-grade fatigue"],
    missingInfo: [],
  },
  {
    id: "PT-SYN-004",
    caseId: "CASE-SYNTH-004",
    name: "James Wilson",
    ward: "WARD-A / R101",
    vitalsNote: "Heart Rate stable (72 bpm)",
    score: 0,
    acuity: "LOW",
    hr: 72,
    bp: "120/80",
    spo2: 99,
    temp: 36.6,
    rr: 14,
    symptoms: ["Pre-operative routine checkup"],
    missingInfo: [],
  },
  {
    id: "PT-SYN-005",
    caseId: "CASE-SYNTH-005",
    name: "Sunita Rao",
    ward: "WARD-A / R102",
    vitalsNote: "Febrile illness (Temp 38.4°C)",
    score: 10,
    acuity: "LOW",
    hr: 88,
    bp: "118/74",
    spo2: 98,
    temp: 38.4,
    rr: 18,
    symptoms: ["Fever and chills for 48 hours", "Frontal headache"],
    missingInfo: ["Malaria & Dengue rapid antigen tests"],
  },
  {
    id: "PT-SYN-006",
    caseId: "CASE-SYNTH-006",
    name: "Rajesh Kumar",
    ward: "EMERGENCY / ER-01",
    vitalsNote: "Crushing retrosternal chest pain (Shock index 1.05)",
    score: 95,
    acuity: "HIGH",
    hr: 110,
    bp: "92/60",
    spo2: 93,
    temp: 37.1,
    rr: 24,
    symptoms: ["Crushing chest pain radiating to jaw and left shoulder", "Diaphoresis", "Nausea"],
    missingInfo: ["12-lead ECG strip", "Troponin-I Level"],
  },
  {
    id: "PT-SYN-007",
    caseId: "CASE-SYNTH-007",
    name: "Priya Das",
    ward: "OPD / OPD-03",
    vitalsNote: "Vital signs within normal limits",
    score: 5,
    acuity: "LOW",
    hr: 74,
    bp: "115/72",
    spo2: 99,
    temp: 36.7,
    rr: 16,
    symptoms: ["Dry cough for 3 days", "Mild pharyngitis"],
    missingInfo: [],
  },
  {
    id: "PT-SYN-008",
    caseId: "CASE-SYNTH-008",
    name: "Ada Okafor",
    ward: "OPD / OPD-01",
    vitalsNote: "Blood Pressure check (138/88 mmHg)",
    score: 5,
    acuity: "LOW",
    hr: 78,
    bp: "138/88",
    spo2: 98,
    temp: 36.9,
    rr: 16,
    symptoms: ["Routine chronic hypertension follow-up"],
    missingInfo: ["Medication reconciliation check"],
  },
];

export const NurseDashboard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const { triageQueue, updateTriageVitals, addReviewItem, toast } = useClinova();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "queue" | "intake" | "vitals" | "evidence" | "timeline" | "tasks" | "handover"
  >("dashboard");

  // Synchronize tab parameter with active view
  React.useEffect(() => {
    if (!tabParam) return;
    const tabMap: Record<string, any> = {
      dashboard: "dashboard",
      queue: "queue",
      intake: "intake",
      vitals: "vitals",
      evidence: "evidence",
      timeline: "timeline",
      tasks: "tasks",
      handover: "handover",
    };
    if (tabMap[tabParam]) {
      setActiveTab(tabMap[tabParam]);
    }
  }, [tabParam]);

  const [localPatients, setLocalPatients] = useState<TriagePatientItem[]>(INITIAL_TRIAGE_PATIENTS);
  const patients = triageQueue && triageQueue.length > 0 ? triageQueue : localPatients;
  const [selectedPatientId, setSelectedPatientId] = useState<string>("PT-SYN-001");
  const [lastUpdatedTime, setLastUpdatedTime] = useState("12:35:37 PM");

  // Vitals form
  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];
  const [vitalsHr, setVitalsHr] = useState(String(selectedPatient.hr));
  const [vitalsBp, setVitalsBp] = useState(selectedPatient.bp);
  const [vitalsSpo2, setVitalsSpo2] = useState(String(selectedPatient.spo2));
  const [vitalsTemp, setVitalsTemp] = useState(String(selectedPatient.temp));
  const [vitalsRr, setVitalsRr] = useState(String(selectedPatient.rr));

  // Intake & symptoms note
  const [symptomInput, setSymptomInput] = useState("");
  const [handoverNote, setHandoverNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedEvidence, setUploadedEvidence] = useState<string[]>(["12-lead ECG.pdf", "Rapid Blood Glucose.png"]);

  // Intake form detailed states
  const [intakePain, setIntakePain] = useState(4);
  const [intakeAllergies, setIntakeAllergies] = useState("None known");
  const [intakeAvpu, setIntakeAvpu] = useState("Alert");
  const [intakeNotes, setIntakeNotes] = useState("");

  // Shift Tasks checklist
  const [tasks, setTasks] = useState([
    { id: "tsk-1", title: "Acquire repeat SpO2 reading on Room Air", patient: "Elena Kostov", done: false, priority: "High" },
    { id: "tsk-2", title: "Complete 12-lead ECG acquisition and upload strip", patient: "Rajesh Kumar", done: false, priority: "Urgent" },
    { id: "tsk-3", title: "Verify digital informed consent & DPDP Act compliance", patient: "Ada Okafor", done: true, priority: "Routine" },
    { id: "tsk-4", title: "Administer 500ml normal saline IV bolus", patient: "Robert Chen", done: false, priority: "Medium" },
    { id: "tsk-5", title: "Conduct hourly neurological check & Glasgow Coma Scale", patient: "Sunita Rao", done: false, priority: "Medium" },
  ]);

  // Evidence files
  const [evidenceFiles, setEvidenceFiles] = useState([
    { id: "ev-1", name: "12-lead ECG.pdf", type: "Cardiology", hash: "a8f3b4c9e1207e15", ts: "Today 10:15 AM", status: "Verified" },
    { id: "ev-2", name: "Rapid Blood Glucose.png", type: "Point-of-Care", hash: "4c71ef629810b48a", ts: "Today 10:40 AM", status: "Verified" },
  ]);

  // Calculate NEWS2 & Shock Index
  const calculateNews2 = (hr: number, spo2: number, rr: number, temp: number) => {
    let score = 0;
    if (rr <= 8 || rr >= 25) score += 3;
    else if (rr >= 21) score += 2;
    else if (rr >= 12) score += 0;
    else score += 1;

    if (spo2 <= 91) score += 3;
    else if (spo2 <= 93) score += 2;
    else if (spo2 <= 95) score += 1;

    if (hr >= 131 || hr <= 40) score += 3;
    else if (hr >= 111 || hr <= 50) score += 2;
    else if (hr >= 91) score += 1;

    if (temp <= 35.0 || temp >= 39.1) score += 2;
    else if (temp >= 38.1 || temp <= 36.0) score += 1;

    return score;
  };

  const calculatedNews = calculateNews2(
    Number(vitalsHr) || selectedPatient.hr,
    Number(vitalsSpo2) || selectedPatient.spo2,
    Number(vitalsRr) || selectedPatient.rr,
    Number(vitalsTemp) || selectedPatient.temp
  );

  const [sbp] = vitalsBp.split("/").map(Number);
  const calculatedShockIndex = sbp && sbp > 0 ? (Number(vitalsHr) / sbp).toFixed(2) : "0.75";

  // Actions
  const handleSelectPatient = (p: TriagePatientItem) => {
    setSelectedPatientId(p.id);
    setVitalsHr(String(p.hr));
    setVitalsBp(p.bp);
    setVitalsSpo2(String(p.spo2));
    setVitalsTemp(String(p.temp));
    setVitalsRr(String(p.rr));
  };

  const handleRefresh = () => {
    const now = new Date().toLocaleTimeString("en-US", { hour12: true });
    setLastUpdatedTime(now);
    toast("Triage Queue Refreshed", "Updated patient acuity status and telemetry", "info");
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    const hrNum = Number(vitalsHr);
    const spo2Num = Number(vitalsSpo2);

    if (hrNum < 30 || hrNum > 240) {
      toast("Invalid Heart Rate", "Range must be between 30 and 240 bpm", "error");
      return;
    }
    if (spo2Num < 50 || spo2Num > 100) {
      toast("Invalid SpO2", "Range must be between 50 and 100%", "error");
      return;
    }

    const updatedData = {
      hr: hrNum,
      bp: vitalsBp,
      spo2: spo2Num,
      temp: Number(vitalsTemp),
      rr: Number(vitalsRr),
      vitalsNote: `Updated vitals (NEWS2: ${calculatedNews})`,
    };

    updateTriageVitals(selectedPatientId, updatedData);
    setLocalPatients((prev) =>
      prev.map((p) => (p.id === selectedPatientId ? { ...p, ...updatedData } : p))
    );
    toast("Vital Signs Saved", `Recorded for ${selectedPatient.name}. NEWS2 Score: ${calculatedNews}`, "success");
  };

  const handleAddSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomInput.trim()) return;
    const newSymptoms = [...selectedPatient.symptoms, symptomInput.trim()];
    updateTriageVitals(selectedPatientId, { symptoms: newSymptoms });
    setLocalPatients((prev) =>
      prev.map((p) => (p.id === selectedPatientId ? { ...p, symptoms: newSymptoms } : p))
    );
    toast("Symptom Added", symptomInput.trim(), "success");
    setSymptomInput("");
  };

  const handleUploadEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      setUploadedEvidence((prev) => [...prev, file.name]);
      setEvidenceFiles((prev) => [
        ...prev,
        {
          id: "ev-" + (prev.length + 1),
          name: file.name,
          type: "Clinical Attachment",
          hash: Math.random().toString(16).slice(2, 18),
          ts: "Just now",
          status: "Verified",
        },
      ]);
      setIsUploading(false);
      toast("Evidence Uploaded", `${file.name} attached with clinical provenance`, "success");
    }, 600);
  };

  const handleSubmitIntake = () => {
    addReviewItem({
      patientId: selectedPatient.id,
      type: "documentation",
      title: `Intake Assessment: ${selectedPatient.name}`,
      createdBy: "Nurse Station",
      createdAt: "Today, just now",
      aiStatus: `NEWS2: ${calculatedNews} | Shock Index: ${calculatedShockIndex}`,
      sources: ["Nurse Triage", "Bedside Telemetry", ...uploadedEvidence],
      status: "pending",
      preview: `${selectedPatient.ward} - ${selectedPatient.vitalsNote}. Presenting: ${selectedPatient.symptoms.join(", ") || "General clinical intake"}.`,
    });
    toast("Intake Submitted", `${selectedPatient.name} moved to Clinician Review queue`, "success");
    router.push("/staff/review");
  };

  const handleHandover = (e: React.FormEvent) => {
    e.preventDefault();
    addReviewItem({
      patientId: selectedPatient.id,
      type: "instructions",
      title: `SBAR Handover: ${selectedPatient.name}`,
      createdBy: "Nurse Station",
      createdAt: "Today, just now",
      aiStatus: `Handover Acuity: ${selectedPatient.acuity}`,
      sources: ["Nurse Handover Note", "Vitals Telemetry"],
      status: "pending",
      preview: handoverNote || `SBAR Handover for ${selectedPatient.name} transferred to attending physician.`,
    });
    toast("Handover Dispatched", `SBAR clinical handover for ${selectedPatient.name} dispatched to attending physician`, "success");
    setHandoverNote("");
    setActiveTab("dashboard");
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  };

  const highRiskCount = patients.filter((p) => p.acuity === "HIGH").length;
  const criticalCount = patients.filter((p) => p.score >= 100).length;

  return (
    <RoleGuard
      allowedRoles={["NURSE", "CLINICIAN", "DOCTOR", "SYSTEM_ADMIN"]}
      title="Nurse Triage Access Restricted"
      message="Only licensed nurses and clinical staff are authorized to view and triage patient queues."
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 48px" }}>
        {/* Top Header matching Reference Image 4: MediWatch Patient Triage */}
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
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--navy-900)" }}>Patient Triage</h1>
            <p style={{ color: "var(--text-3)", fontSize: "0.9375rem", marginTop: 4 }}>
              AI-powered risk assessment and prioritization. Powered by Wood Wide AI [CLINOVA AI].
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleRefresh}
              className="btn"
              style={{
                backgroundColor: "#f97316",
                color: "#ffffff",
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RotateCw style={{ width: 15, height: 15 }} />
              <span>Refresh</span>
            </button>
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                backgroundColor: "#f8fafc",
                border: "1px solid var(--border)",
                fontSize: "0.75rem",
                color: "var(--text-2)",
                fontWeight: 600,
              }}
            >
              LAST UPDATED {lastUpdatedTime}
            </div>
          </div>
        </header>

        {/* Navigation Tabs matching Section 6 */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "queue", label: "Assigned Queue" },
            { id: "intake", label: "Patient Intake" },
            { id: "vitals", label: "Vital Signs" },
            { id: "evidence", label: "Evidence Upload" },
            { id: "timeline", label: "Patient Timeline" },
            { id: "tasks", label: "Tasks" },
            { id: "handover", label: "Handover" },
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

        {/* Main Triage View (Matching Reference Image 4) */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Top Stat Cards (Matching Reference Image 4) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {/* Card 1: Total Patients */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  borderRadius: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ color: "var(--text-3)", marginBottom: 8 }}>
                  <Users style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy-900)" }}>
                    {patients.length}
                  </div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    TOTAL PATIENTS
                  </div>
                </div>
              </div>

              {/* Card 2: High Risk */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  borderRadius: 14,
                  backgroundColor: "#fffbeb",
                  borderColor: "#fde68a",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ color: "#d97706", marginBottom: 8 }}>
                  <AlertTriangle style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#b45309" }}>
                    {highRiskCount}
                  </div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    HIGH RISK
                  </div>
                </div>
              </div>

              {/* Card 3: Critical */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  borderRadius: 14,
                  backgroundColor: "#fef2f2",
                  borderColor: "#fecaca",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ color: "#dc2626", marginBottom: 8 }}>
                  <AlertOctagon style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#b91c1c" }}>
                    {criticalCount}
                  </div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    CRITICAL
                  </div>
                </div>
              </div>

              {/* Card 4: Avg Risk Score */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  borderRadius: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <BarChart3 style={{ width: 20, height: 20, color: "var(--text-3)" }} />
                  <span className="badge badge-success" style={{ fontWeight: 700 }}>21</span>
                </div>
                <div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy-900)" }}>
                    21
                  </div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    AVG RISK SCORE
                  </div>
                </div>
              </div>
            </div>

            {/* Split View: Left Priority Queue, Right Patient Detail Card (Matching Reference Image 4) */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr)", gap: 24 }}>
              {/* Left Column: Patient Priority Queue */}
              <div className="card" style={{ padding: "20px 24px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Patient Priority Queue</h2>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                      Updated {lastUpdatedTime}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-3)" }}>
                    {patients.length} PATIENTS
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {patients.map((p, idx) => {
                    const isSelected = p.id === selectedPatientId;
                    const badgeColor =
                      p.score >= 90
                        ? { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" }
                        : p.score >= 50
                        ? { bg: "#fef9c3", text: "#a16207", border: "#fef08a" }
                        : { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" };

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 12,
                          border: isSelected ? "2px solid #ef4444" : "1px solid var(--border)",
                          backgroundColor: isSelected ? "#fffbfb" : "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {/* Numbered Circle */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              backgroundColor: p.score >= 90 ? "#ef4444" : "#f1f5f9",
                              color: p.score >= 90 ? "#ffffff" : "var(--navy-900)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--navy-900)" }}>
                              {p.name}{" "}
                              <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 500 }}>
                                {p.ward}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: 2 }}>
                              {p.vitalsNote}
                            </div>
                          </div>
                        </div>

                        {/* Urgency Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              backgroundColor: badgeColor.bg,
                              color: badgeColor.text,
                              border: `1px solid ${badgeColor.border}`,
                            }}
                          >
                            {p.score} {p.acuity}
                          </span>
                          <ChevronDown style={{ width: 16, height: 16, color: "var(--text-4)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Patient Detail & Clinical Actions */}
              <div className="card" style={{ padding: "24px 28px", borderRadius: 16 }}>
                {selectedPatient ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                          {selectedPatient.name}
                        </h2>
                        <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: 2 }}>
                          {selectedPatient.ward} · Case ID: {selectedPatient.caseId}
                        </div>
                      </div>

                      <span
                        className={`badge ${selectedPatient.score >= 90 ? "badge-error" : selectedPatient.score >= 50 ? "badge-warning" : "badge-success"}`}
                        style={{ fontSize: "0.75rem", fontWeight: 700 }}
                      >
                        Acuity: {selectedPatient.acuity} ({selectedPatient.score})
                      </span>
                    </div>

                    {/* Active Alert Banner */}
                    {selectedPatient.score >= 90 && (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 8,
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#991b1b",
                          fontSize: "0.8125rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <AlertOctagon style={{ width: 18, height: 18, flexShrink: 0 }} />
                        <div>
                          <strong>Deterministic Emergency Gate Triggered</strong>
                          <div>Resuscitation bedside priority. Continuous monitoring active.</div>
                        </div>
                      </div>
                    )}

                    {/* Vitals Input Grid */}
                    <form onSubmit={handleSaveVitals} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <h3 style={{ fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", margin: 0 }}>
                        Vital Signs Entry & Physiological Scoring
                      </h3>

                      <div className="grid grid-3 gap-3">
                        <div className="field">
                          <label className="label" style={{ fontSize: "0.75rem" }}>Heart Rate (bpm)</label>
                          <input
                            type="number"
                            className="input"
                            value={vitalsHr}
                            onChange={(e) => setVitalsHr(e.target.value)}
                            required
                          />
                        </div>
                        <div className="field">
                          <label className="label" style={{ fontSize: "0.75rem" }}>Blood Press. (mmHg)</label>
                          <input
                            type="text"
                            className="input"
                            value={vitalsBp}
                            onChange={(e) => setVitalsBp(e.target.value)}
                            required
                          />
                        </div>
                        <div className="field">
                          <label className="label" style={{ fontSize: "0.75rem" }}>SpO2 (%)</label>
                          <input
                            type="number"
                            className="input"
                            value={vitalsSpo2}
                            onChange={(e) => setVitalsSpo2(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-2 gap-3">
                        <div className="field">
                          <label className="label" style={{ fontSize: "0.75rem" }}>Temp (°C)</label>
                          <input
                            type="number"
                            step="0.1"
                            className="input"
                            value={vitalsTemp}
                            onChange={(e) => setVitalsTemp(e.target.value)}
                            required
                          />
                        </div>
                        <div className="field">
                          <label className="label" style={{ fontSize: "0.75rem" }}>Resp. Rate (/min)</label>
                          <input
                            type="number"
                            className="input"
                            value={vitalsRr}
                            onChange={(e) => setVitalsRr(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 8,
                          backgroundColor: "#f8fafc",
                          border: "1px solid var(--border)",
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.8125rem",
                        }}
                      >
                        <span>Calculated NEWS2: <strong>{calculatedNews}</strong></span>
                        <span>Shock Index: <strong>{calculatedShockIndex}</strong></span>
                      </div>

                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toast("Draft Saved", `Intake draft persisted for ${selectedPatient.name}`, "info")}
                        >
                          Save Draft
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm">
                          Save Vital Signs
                        </button>
                      </div>
                    </form>

                    {/* Symptoms & Clinical Notes */}
                    <div>
                      <h3 style={{ fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", margin: "0 0 8px" }}>
                        Recorded Symptoms & Observations
                      </h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {selectedPatient.symptoms.map((s, sIdx) => (
                          <span key={sIdx} className="badge badge-navy">
                            {s}
                          </span>
                        ))}
                      </div>

                      <form onSubmit={handleAddSymptom} style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Add new symptom or note..."
                          value={symptomInput}
                          onChange={(e) => setSymptomInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-secondary btn-sm">
                          Add
                        </button>
                      </form>
                    </div>

                    {/* Evidence Upload */}
                    <div>
                      <h3 style={{ fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-3)", margin: "0 0 8px" }}>
                        Clinical Evidence & Documents
                      </h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {uploadedEvidence.map((ev, eIdx) => (
                          <span key={eIdx} className="badge badge-teal" style={{ gap: 4 }}>
                            <FileText style={{ width: 12, height: 12 }} />
                            {ev}
                          </span>
                        ))}
                      </div>

                      <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", display: "inline-flex" }}>
                        <Upload style={{ width: 14, height: 14 }} />
                        <span>{isUploading ? "Uploading..." : "Upload Evidence"}</span>
                        <input
                          type="file"
                          style={{ display: "none" }}
                          onChange={handleUploadEvidence}
                        />
                      </label>
                    </div>

                    {/* Missing Info Warning */}
                    {selectedPatient.missingInfo.length > 0 && (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          backgroundColor: "#fffbeb",
                          border: "1px solid #fde68a",
                          fontSize: "0.8125rem",
                          color: "#92400e",
                        }}
                      >
                        <strong>Missing Clinical Evidence:</strong>
                        <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                          {selectedPatient.missingInfo.map((m, mIdx) => (
                            <li key={mIdx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Workflow Buttons */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => router.push(`/staff/cases/${selectedPatient.caseId}`)}
                      >
                        Open Case
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => toast("Information requested", `Task sent to care team for ${selectedPatient.name}`, "info")}
                      >
                        Request More Info
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleSubmitIntake}
                        style={{ marginLeft: "auto" }}
                      >
                        Submit Intake & Handover
                        <ArrowRight style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      height: 400,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-3)",
                      textAlign: "center",
                    }}
                  >
                    <Eye style={{ width: 48, height: 48, strokeWidth: 1.5, marginBottom: 12 }} />
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--navy-900)" }}>
                      Select a patient to view details
                    </div>
                    <p style={{ fontSize: "0.875rem", margin: "4px 0 0" }}>
                      Click on any patient in the priority queue to record vitals or submit intake
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Assigned Queue */}
        {activeTab === "queue" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 12px" }}>
              Assigned Nurse Worklist
            </h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Patient</th>
                    <th>Ward / Room</th>
                    <th>Vitals Status</th>
                    <th>Acuity Tier</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.score}</td>
                      <td>{p.name}</td>
                      <td className="subtle">{p.ward}</td>
                      <td>{p.vitalsNote}</td>
                      <td>
                        <span className={`badge ${p.score >= 90 ? "badge-error" : p.score >= 50 ? "badge-warning" : "badge-success"}`}>
                          {p.acuity}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            handleSelectPatient(p);
                            setActiveTab("dashboard");
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Patient Intake */}
        {activeTab === "intake" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Clinical Intake Desk</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Triage assessment for {selectedPatient.name} ({selectedPatient.id})
                </p>
              </div>
              <span className={`badge ${selectedPatient.acuity === "HIGH" ? "badge-error" : selectedPatient.acuity === "MODERATE" ? "badge-warning" : "badge-teal"}`}>
                Acuity: {selectedPatient.acuity}
              </span>
            </div>

            <div className="grid grid-2 gap-4" style={{ marginBottom: 20 }}>
              <div className="field">
                <label className="label">Current Patient</label>
                <select
                  className="select"
                  value={selectedPatientId}
                  onChange={(e) => {
                    const p = patients.find((x) => x.id === e.target.value);
                    if (p) handleSelectPatient(p);
                  }}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.ward}) - Score: {p.score}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">Consciousness Level (AVPU)</label>
                <select
                  className="select"
                  value={intakeAvpu}
                  onChange={(e) => setIntakeAvpu(e.target.value)}
                >
                  <option value="Alert">Alert (Fully conscious & oriented)</option>
                  <option value="Voice">Voice (Responds only to verbal stimuli)</option>
                  <option value="Pain">Pain (Responds only to painful stimuli)</option>
                  <option value="Unresponsive">Unresponsive (GCS &lt; 8)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2 gap-4" style={{ marginBottom: 20 }}>
              <div className="field">
                <label className="label">Pain Severity Scale (1 - 10): {intakePain}</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={intakePain}
                  onChange={(e) => setIntakePain(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-3)" }}>
                  <span>0 (None)</span>
                  <span>5 (Moderate)</span>
                  <span>10 (Worst Possible)</span>
                </div>
              </div>

              <div className="field">
                <label className="label">Known Drug & Environmental Allergies</label>
                <input
                  type="text"
                  className="input"
                  value={intakeAllergies}
                  onChange={(e) => setIntakeAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, NSAIDs, Latex..."
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label className="label">Nurse Intake Observations & Chief Complaints</label>
              <textarea
                className="textarea"
                rows={4}
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                placeholder="Document clinical observations, respiratory effort, skin temperature, and patient verbal responses..."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveTab("vitals")}
              >
                Record Vitals
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitIntake}
              >
                Submit Intake to Clinician Review
                <ArrowRight style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Vital Signs Acquisition */}
        {activeTab === "vitals" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Vital Signs & Telemetry Acquisition</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Recording bedside telemetry for {selectedPatient.name} ({selectedPatient.ward})
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <span className={`badge ${calculatedNews >= 7 ? "badge-error" : calculatedNews >= 5 ? "badge-warning" : "badge-teal"}`}>
                  NEWS2: {calculatedNews}
                </span>
                <span className={`badge ${Number(calculatedShockIndex) >= 1 ? "badge-error" : "badge-info"}`}>
                  Shock Index: {calculatedShockIndex}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveVitals} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="grid grid-3 gap-4">
                <div className="field">
                  <label className="label">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalsHr}
                    onChange={(e) => setVitalsHr(e.target.value)}
                    min={30}
                    max={240}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Blood Pressure (mmHg)</label>
                  <input
                    type="text"
                    className="input"
                    value={vitalsBp}
                    onChange={(e) => setVitalsBp(e.target.value)}
                    placeholder="120/80"
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">SpO2 Oxygen Saturation (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalsSpo2}
                    onChange={(e) => setVitalsSpo2(e.target.value)}
                    min={50}
                    max={100}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2 gap-4">
                <div className="field">
                  <label className="label">Body Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input"
                    value={vitalsTemp}
                    onChange={(e) => setVitalsTemp(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Respiratory Rate (breaths/min)</label>
                  <input
                    type="number"
                    className="input"
                    value={vitalsRr}
                    onChange={(e) => setVitalsRr(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toast("Sensor Synced", "Bedside monitor telemetry synchronized", "info")}
                >
                  <RotateCw style={{ width: 14, height: 14 }} />
                  Fetch Bedside Sensor
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 style={{ width: 15, height: 15 }} />
                  Save & Update Vitals
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Evidence Upload */}
        {activeTab === "evidence" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Diagnostic Evidence Vault</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Upload bedside ECG, POCT strips, and imaging for {selectedPatient.name}
                </p>
              </div>
              <label className="btn btn-primary" style={{ cursor: "pointer" }}>
                <Upload style={{ width: 15, height: 15 }} />
                <span>Upload Report</span>
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleUploadEvidence}
                />
              </label>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Category</th>
                    <th>SHA-256 Provenance Hash</th>
                    <th>Attached At</th>
                    <th>Integrity Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceFiles.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontWeight: 600 }}>{ev.name}</td>
                      <td>{ev.type}</td>
                      <td>
                        <code style={{ fontSize: "0.75rem", color: "var(--primary)" }}>{ev.hash}</code>
                      </td>
                      <td className="subtle">{ev.ts}</td>
                      <td>
                        <span className="badge badge-success">
                          <ShieldCheck style={{ width: 12, height: 12 }} />
                          {ev.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toast("Evidence Verified", `Cryptographic hash verified for ${ev.name}`, "info")}
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Patient Timeline */}
        {activeTab === "timeline" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Clinical Care Trajectory</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Care chronology and triage transitions for {selectedPatient.name}
                </p>
              </div>
              <span className="badge badge-teal">Token: {selectedPatient.id}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingLeft: 8 }}>
              {[
                { time: "08:30 AM", title: "Patient Registered at Front Desk", desc: "Arrival confirmed, token issued, digital consent signed", actor: "Receptionist" },
                { time: "08:45 AM", title: "Nurse Triage & Initial Vitals", desc: `Recorded HR: ${selectedPatient.hr} bpm, BP: ${selectedPatient.bp}, SpO2: ${selectedPatient.spo2}%`, actor: "Nurse Station" },
                { time: "09:10 AM", title: "Continuous Care Intelligence Evaluated", desc: `Computed NEWS2 score (${calculatedNews}) and shock index (${calculatedShockIndex})`, actor: "CLINOVA AI Engine" },
                { time: "09:30 AM", title: "Diagnostic Evidence Attached", desc: "Bedside telemetry and ECG documentation ingested", actor: "Nurse Station" },
                { time: "09:45 AM", title: "Handover Queue Enqueued", desc: "Assigned to attending physician for authoritative clinical review", actor: "Nurse Station" },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", gap: 16, position: "relative" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: "var(--primary)",
                        marginTop: 4,
                      }}
                    />
                    {idx < 4 && (
                      <div style={{ width: 2, height: "100%", backgroundColor: "var(--border)", minHeight: 40 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--navy-900)" }}>
                        {item.title}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: "0.6875rem" }}>{item.actor}</span>
                      <span className="subtle" style={{ fontSize: "0.75rem", marginLeft: "auto" }}>{item.time}</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--text-3)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: Tasks Checklist */}
        {activeTab === "tasks" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Nurse Shift Tasks & Interventions</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  {tasks.filter((t) => t.done).length} of {tasks.length} clinical tasks completed
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const newTask = {
                    id: "tsk-" + (tasks.length + 1),
                    title: `Check telemetry for ${selectedPatient.name}`,
                    patient: selectedPatient.name,
                    done: false,
                    priority: "Routine",
                  };
                  setTasks((prev) => [newTask, ...prev]);
                  toast("Task added", newTask.title, "success");
                }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                <span>Add Shift Task</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    backgroundColor: task.done ? "#f8fafc" : "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {task.done ? (
                      <CheckSquare style={{ width: 18, height: 18, color: "#16a34a" }} />
                    ) : (
                      <Square style={{ width: 18, height: 18, color: "var(--text-4)" }} />
                    )}
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: task.done ? "var(--text-4)" : "var(--navy-900)",
                        textDecoration: task.done ? "line-through" : "none",
                        fontWeight: task.done ? 400 : 500,
                      }}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="badge badge-teal" style={{ fontSize: "0.6875rem" }}>{task.patient}</span>
                    <span className={`badge ${task.priority === "Urgent" ? "badge-error" : task.priority === "High" ? "badge-warning" : "badge-info"}`} style={{ fontSize: "0.6875rem" }}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 8: Handover */}
        {activeTab === "handover" && (
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 8px" }}>
              Clinical Handover & SBAR Dispatch
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "0 0 20px" }}>
              Formal transfer of clinical responsibility to attending physician
            </p>

            <form onSubmit={handleHandover} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field">
                <label className="label">Handover Target Clinician</label>
                <select className="select">
                  <option>Dr. Joshua Ajose (Attending Physician)</option>
                  <option>Dr. Priya Sharma (On-call Consultant)</option>
                  <option>Dr. Emily Davis (Cardiologist)</option>
                </select>
              </div>

              <div className="field">
                <label className="label">SBAR Handover Summary Notes</label>
                <textarea
                  className="textarea"
                  rows={4}
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="Situation, Background, Assessment, and Recommendation..."
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <Send style={{ width: 15, height: 15 }} />
                  <span>Dispatch Handover to Clinician</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};
