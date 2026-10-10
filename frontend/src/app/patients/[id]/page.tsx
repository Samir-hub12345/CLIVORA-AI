"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Clock,
  Calendar,
  AlertTriangle,
  Download,
  Stethoscope,
  Activity,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Pill,
  HeartPulse,
  User,
  Phone,
  MapPin,
  Sparkles,
  Lock,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

function PatientDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const patientId = (params?.id as string) || "CLN-10482";
  const initialTab = searchParams.get("tab");

  const {
    patients,
    consultations,
    appointments,
    labs,
    startConsult,
    exportPdfReport,
    toast,
    can,
    me,
  } = useClinova();

  const patient = patients.find((p) => p.id === patientId) || patients[0];
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "meds" | "docs">(
    initialTab === "history" || initialTab === "meds" || initialTab === "docs"
      ? initialTab
      : "overview"
  );

  const patientConsults = Object.values(consultations).filter(
    (c) => c.patientId === patient?.id
  );
  const patientAppts = appointments.filter((a) => a.patientId === patient?.id);
  const patientLabs = labs.filter((l) => l.patientId === patient?.id);

  if (!patient) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <h2>Patient record not found</h2>
          <p className="muted">The requested patient record does not exist or has been archived.</p>
          <Link href="/patients" className="btn btn-primary" style={{ marginTop: 16 }}>
            Back to patients
          </Link>
        </div>
      </div>
    );
  }

  const handleStartConsultation = () => {
    const encId = startConsult(patient.id);
    router.push(`/consultations/${encId}`);
  };

  return (
    <div className="page">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/patients">Patients</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{patient.name}</span>
      </nav>

      {/* Patient Hero Card */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="patient-hero">
          <span className="avatar xl">
            {patient.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="grow stack gap-2" style={{ minWidth: 240 }}>
            <div className="row gap-3 wrap">
              <h1 style={{ fontSize: 24 }}>{patient.name}</h1>
              <span
                className={`badge ${
                  patient.recordStatus === "Complete"
                    ? "badge-success"
                    : patient.recordStatus === "Needs review"
                    ? "badge-warning"
                    : "badge-error"
                }`}
              >
                <span className="dot" />
                <span>{patient.recordStatus}</span>
              </span>
              <span className="demo-ribbon">Synthetic patient record</span>
            </div>

            <div className="patient-meta">
              <span>
                <User style={{ width: 14, height: 14 }} />
                <span>ID: {patient.id}</span>
              </span>
              <span>
                <Calendar style={{ width: 14, height: 14 }} />
                <span>DOB: {patient.dob} ({patient.sex})</span>
              </span>
              <span>
                <Phone style={{ width: 14, height: 14 }} />
                <span>{patient.phone}</span>
              </span>
              {patient.address && (
                <span>
                  <MapPin style={{ width: 14, height: 14 }} />
                  <span>{patient.address}</span>
                </span>
              )}
              <span>
                <ShieldCheck style={{ width: 14, height: 14, color: "var(--teal-700)" }} />
                <span>Consent: {patient.consent}</span>
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="row gap-2 wrap" style={{ alignSelf: "center" }}>
            {can("view_clinical") && (
              <button className="btn btn-primary" onClick={handleStartConsultation}>
                <Stethoscope style={{ width: 16, height: 16 }} />
                <span>Start consultation</span>
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => exportPdfReport(patient.id)}
            >
              <Download style={{ width: 16, height: 16 }} />
              <span>Download chart summary</span>
            </button>
          </div>
        </div>

        {/* Tab Header */}
        <div className="tabs" style={{ padding: "0 20px" }}>
          <button
            className="tab"
            aria-selected={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          >
            <Activity style={{ width: 16, height: 16 }} />
            <span>Overview</span>
          </button>
          <button
            className="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            <Clock style={{ width: 16, height: 16 }} />
            <span>Medical History</span>
          </button>
          <button
            className="tab"
            aria-selected={activeTab === "meds"}
            onClick={() => setActiveTab("meds")}
          >
            <Pill style={{ width: 16, height: 16 }} />
            <span>Medications</span>
          </button>
          <button
            className="tab"
            aria-selected={activeTab === "docs"}
            onClick={() => setActiveTab("docs")}
          >
            <FileText style={{ width: 16, height: 16 }} />
            <span>Documents & Labs</span>
            {patientLabs.length > 0 && <span className="count">{patientLabs.length}</span>}
          </button>
        </div>
      </section>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="grid grid-2 gap-4">
          {/* Recent Encounters */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Encounters</h3>
              <span className="badge badge-teal">{patientConsults.length} recorded</span>
            </div>
            <div className="card-body tight stack gap-2">
              {patientConsults.length === 0 ? (
                <p className="small muted">No previous clinical encounters recorded.</p>
              ) : (
                patientConsults.map((c) => (
                  <div
                    key={c.id}
                    className="row between clickable"
                    style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}
                    onClick={() => router.push(`/consultations/${c.id}`)}
                  >
                    <div>
                      <div className="small medium">{c.type} · {c.id}</div>
                      <div className="xs muted">{c.startedAt} · Dr. Joshua Ajose</div>
                    </div>
                    <span className="badge badge-info">{c.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vitals Trend Snapshot */}
          <div className="card">
            <div className="card-header">
              <h3>Bedside Vitals Trend</h3>
              <span className="badge badge-success">Verified</span>
            </div>
            <div className="card-body stack gap-3">
              <div className="grid grid-2 gap-2">
                <div style={{ padding: 12, background: "var(--surface-2)", borderRadius: 8 }}>
                  <div className="xs muted">Blood Pressure</div>
                  <div className="strong" style={{ fontSize: 18, color: "var(--navy-900)" }}>
                    132 / 84 <span className="xs subtle">mmHg</span>
                  </div>
                </div>
                <div style={{ padding: 12, background: "var(--surface-2)", borderRadius: 8 }}>
                  <div className="xs muted">Heart Rate</div>
                  <div className="strong" style={{ fontSize: 18, color: "var(--navy-900)" }}>
                    76 <span className="xs subtle">bpm</span>
                  </div>
                </div>
                <div style={{ padding: 12, background: "var(--surface-2)", borderRadius: 8 }}>
                  <div className="xs muted">Oxygen Saturation</div>
                  <div className="strong" style={{ fontSize: 18, color: "var(--navy-900)" }}>
                    99% <span className="xs subtle">SpO2</span>
                  </div>
                </div>
                <div style={{ padding: 12, background: "var(--surface-2)", borderRadius: 8 }}>
                  <div className="xs muted">NEWS2 Acuity Score</div>
                  <div className="strong" style={{ fontSize: 18, color: "var(--success)" }}>
                    0 <span className="xs subtle">(Low Risk)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Known Allergies & Risk Factors */}
          <div className="card">
            <div className="card-header">
              <h3>Allergies & Adverse Reactions</h3>
              <span className="badge badge-warning">Allergy Alert</span>
            </div>
            <div className="card-body stack gap-2">
              <div className="fact-row">
                <span className="prov prov-reported">Patient-reported</span>
                <div className="grow">
                  <div className="small strong">Penicillin</div>
                  <div className="xs muted">Cutaneous erythematous rash reported 2018. Anaphylaxis denied.</div>
                </div>
              </div>
              <div className="fact-row">
                <span className="prov prov-verified">Verified chart</span>
                <div className="grow">
                  <div className="small strong">No Known Food Allergies</div>
                  <div className="xs muted">Last reconciled during intake check.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="card">
            <div className="card-header">
              <h3>Upcoming Appointments</h3>
              <Link href="/appointments" className="xs" style={{ color: "var(--teal-700)" }}>
                View schedule
              </Link>
            </div>
            <div className="card-body tight stack gap-2">
              {patientAppts.length === 0 ? (
                <p className="small muted">No visits currently scheduled.</p>
              ) : (
                patientAppts.map((a) => (
                  <div
                    key={a.id}
                    className="row between"
                    style={{ padding: "8px 12px", background: "var(--surface-2)", borderRadius: 6 }}
                  >
                    <div>
                      <div className="small medium">{a.type}</div>
                      <div className="xs muted">{a.time} · {a.room || "Room 1"}</div>
                    </div>
                    <span className="badge badge-outline">{a.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="card">
          <div className="card-header">
            <h3>Documented Medical History</h3>
            <span className="badge badge-teal">CareGraph Timeline</span>
          </div>
          <div className="card-body stack gap-4">
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot">
                  <CheckCircle2 style={{ width: 14, height: 14, color: "var(--teal-600)" }} />
                </div>
                <div className="stack gap-1">
                  <div className="row gap-2">
                    <span className="small strong">Essential Hypertension</span>
                    <span className="prov prov-verified">Verified chart</span>
                  </div>
                  <p className="xs muted">Diagnosed 2021. Managed with Amlodipine 5mg daily. Well controlled.</p>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-dot">
                  <HeartPulse style={{ width: 14, height: 14, color: "var(--navy-800)" }} />
                </div>
                <div className="stack gap-1">
                  <div className="row gap-2">
                    <span className="small strong">Appendectomy</span>
                    <span className="prov prov-reported">Patient-reported</span>
                  </div>
                  <p className="xs muted">Laparoscopic appendectomy performed 2015. No postoperative complications.</p>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-dot">
                  <Sparkles style={{ width: 14, height: 14, color: "var(--teal-600)" }} />
                </div>
                <div className="stack gap-1">
                  <div className="row gap-2">
                    <span className="small strong">Family History of Diabetes</span>
                    <span className="prov prov-imported">Imported</span>
                  </div>
                  <p className="xs muted">Maternal type 2 diabetes mellitus diagnosed in 6th decade.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "meds" && (
        <div className="card">
          <div className="card-header">
            <h3>Active Prescription & OTC Medications</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => toast("Medications Reconciled", "All items verified against EHR", "success")}>
              Reconcile list
            </button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Provenance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">Amlodipine Besylate</td>
                  <td>5 mg</td>
                  <td>Once daily in the morning (PO)</td>
                  <td>
                    <span className="prov prov-verified">Verified chart</span>
                  </td>
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
                <tr>
                  <td className="strong">Paracetamol (Acetaminophen)</td>
                  <td>1000 mg</td>
                  <td>As needed for acute tension headache (PRN)</td>
                  <td>
                    <span className="prov prov-reported">Patient-reported</span>
                  </td>
                  <td>
                    <span className="badge badge-outline">PRN</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "docs" && (
        <div className="card">
          <div className="card-header">
            <h3>Laboratory Findings & Uploaded Clinical Records</h3>
            <span className="badge badge-outline">LIS / OCR Extraction</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Panel / Study</th>
                  <th>Test</th>
                  <th>Result</th>
                  <th>Reference Range</th>
                  <th>Flag</th>
                  <th>Collected</th>
                </tr>
              </thead>
              <tbody>
                {patientLabs.map((l) => (
                  <tr key={l.id}>
                    <td className="mono subtle">{l.report}</td>
                    <td className="medium">{l.panel}</td>
                    <td>{l.test}</td>
                    <td className="num strong">{l.result} {l.unit}</td>
                    <td className="subtle">{l.range}</td>
                    <td>
                      {l.flag ? (
                        <span className="badge badge-warning">{l.flag}</span>
                      ) : (
                        <span className="badge badge-success">Normal</span>
                      )}
                    </td>
                    <td className="subtle">{l.collected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="page" style={{ padding: 48, textAlign: "center" }}>
          <span className="spinner" />
        </div>
      }
    >
      <PatientDetailContent />
    </React.Suspense>
  );
}
