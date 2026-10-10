"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Stethoscope,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Send,
  User,
  HeartPulse,
  Activity,
  History,
  FileText,
  ChevronRight,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";
import { ConsultSection } from "@/lib/referenceData";
import { PermissionRestricted } from "@/components/common/PermissionRestricted";

const SECTION_DEFS = [
  { key: "chief", label: "Chief complaint", rows: 2, placeholder: "Reason for visit in the patient’s words…" },
  { key: "hpi", label: "History of present illness", rows: 4, placeholder: "Onset, duration, character, associated symptoms…" },
  { key: "pmh", label: "Relevant medical history", rows: 3, placeholder: "Relevant documented history…" },
  { key: "medsAllergies", label: "Medication and allergy review", rows: 3, placeholder: "Medications confirmed, allergies checked…" },
  { key: "exam", label: "Examination findings", rows: 4, placeholder: "Vitals, general appearance, system findings…" },
  { key: "assessment", label: "Assessment", rows: 3, placeholder: "Primary differential, clinical impression, risk strat…" },
  { key: "plan", label: "Plan", rows: 4, placeholder: "Investigations, treatment, referrals, safety netting…" },
  { key: "followup", label: "Follow-up", rows: 2, placeholder: "Interval, red flags, patient instruction summary…" },
];

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultId = (params?.id as string) || "ENC-5902";

  const {
    consultations,
    patients,
    updateConsult,
    setReviewStatus,
    exportPdfReport,
    toast,
    me,
    can,
  } = useClinova();

  if (!can("view_clinical")) {
    return <PermissionRestricted what="clinical consultation records" role={me.role} />;
  }

  const consultation = consultations[consultId] || Object.values(consultations)[0];
  const patient = patients.find((p) => p.id === consultation?.patientId) || patients[0];

  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "ai" | "user"; text: string; details?: string[] }>>([
    {
      role: "ai",
      text: "I have organised the patient's intake information into the template sections. Please verify the medication dosages and examination findings.",
      details: [
        "Identified potential tension headache etiology",
        "Amlodipine adherence verified against pharmacy record",
        "Deterministic NEWS2 score: 0 (Normal physiological range)",
      ],
    },
  ]);

  if (!consultation || !patient) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <h2>Consultation not found</h2>
          <Link href="/consultations" className="btn btn-primary" style={{ marginTop: 16 }}>
            Back to consultations
          </Link>
        </div>
      </div>
    );
  }

  const handleSectionChange = (sectionKey: string, newText: string) => {
    updateConsult(
      consultation.id,
      (prev) => ({
        sections: {
          ...prev.sections,
          [sectionKey]: {
            text: newText,
            origin: "clinician",
          },
        },
      }),
      `Edited note section: ${sectionKey}`
    );
  };

  const handleSaveDraft = () => {
    updateConsult(
      consultation.id,
      () => ({ status: "Draft saved" }),
      "Draft saved by clinician"
    );
    toast("Draft saved", "Clinical notes saved to active chart", "success");
  };

  const handleSignNote = async () => {
    setSigning(true);
    try {
      updateConsult(
        consultation.id,
        () => ({
          status: "Signed",
          signedBy: me.name,
          signedAt: new Date().toISOString(),
        }),
        "Clinician signed and authenticated consultation note"
      );
      setReviewStatus(
        "rv1",
        "approved",
        { resolvedBy: me.name, note: "Attending clinician non-repudiable sign-off" }
      );
      toast("Note signed & finalized", `Signed by ${me.name}. Ready for patient instructions.`, "success");
    } finally {
      setSigning(false);
    }
  };

  const handleAiSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;

    const userQ = aiMessage.trim();
    setMessages((prev) => [...prev, { role: "user", text: userQ }]);
    setAiMessage("");
    setAiLoading(true);

    setTimeout(() => {
      setAiLoading(false);
      let reply = `Based on the active chart for ${patient.name}, the reported symptom matches an ambulatory presentation.`;
      let details: string[] = [];

      if (userQ.toLowerCase().includes("differential") || userQ.toLowerCase().includes("diagnosis")) {
        reply = "Recommended differential considerations for clinician evaluation:";
        details = [
          "1. Tension-type headache (High likelihood based on diurnal afternoon pattern)",
          "2. Medication-overuse headache (Check analgesic frequency)",
          "3. Essential hypertension flare (Screen for visual disturbance or papilledema)",
        ];
      } else if (userQ.toLowerCase().includes("red flag") || userQ.toLowerCase().includes("safety")) {
        reply = "Deterministic safety screen completed:";
        details = [
          "No sudden-onset 'thunderclap' headache reported",
          "No focal neurologic deficits detected",
          "Normal vital signs (NEWS2 = 0)",
        ];
      }

      setMessages((prev) => [...prev, { role: "ai", text: reply, details }]);
    }, 600);
  };

  return (
    <div className="workspace">
      {/* Column 1: Left Context & Timeline */}
      <aside className="ws-col ws-left">
        {/* Patient Hero */}
        <div className="ws-section">
          <div className="row gap-3">
            <span className="avatar lg">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div className="grow stack">
              <Link href={`/patients/${patient.id}`} className="strong" style={{ color: "var(--text)" }}>
                {patient.name}
              </Link>
              <span className="xs muted">
                {patient.id} · {patient.sex} · DOB {patient.dob}
              </span>
            </div>
          </div>
          <div className="row gap-2" style={{ marginTop: 12 }}>
            <Link href={`/instructions/${consultation.id}`} className="btn btn-secondary btn-sm grow">
              <span>Patient Instructions</span>
            </Link>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => exportPdfReport(consultation.id)}
              title="Download summary"
            >
              <Download style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        {/* Vitals Card */}
        <div className="ws-section">
          <h3>
            <span>Bedside Vitals</span>
            <span className="badge badge-success">NEWS2: 0</span>
          </h3>
          <div className="grid grid-2 gap-2">
            <div style={{ padding: "8px 10px", background: "var(--surface-2)", borderRadius: 6 }}>
              <div className="xs muted">Blood Pressure</div>
              <div className="strong" style={{ fontSize: 15 }}>132/84</div>
            </div>
            <div style={{ padding: "8px 10px", background: "var(--surface-2)", borderRadius: 6 }}>
              <div className="xs muted">Heart Rate</div>
              <div className="strong" style={{ fontSize: 15 }}>76 bpm</div>
            </div>
            <div style={{ padding: "8px 10px", background: "var(--surface-2)", borderRadius: 6 }}>
              <div className="xs muted">SpO2 Oxygen</div>
              <div className="strong" style={{ fontSize: 15 }}>99%</div>
            </div>
            <div style={{ padding: "8px 10px", background: "var(--surface-2)", borderRadius: 6 }}>
              <div className="xs muted">Shock Index</div>
              <div className="strong" style={{ fontSize: 15, color: "var(--success)" }}>0.58</div>
            </div>
          </div>
        </div>

        {/* Known Clinical Facts */}
        <div className="ws-section">
          <h3>
            <span>Clinical Facts</span>
            <span className="xs subtle">Provenance</span>
          </h3>
          <div className="stack gap-2">
            <div className="fact-row">
              <span className="prov prov-reported">Reported</span>
              <div className="grow xs">
                <strong>Penicillin allergy</strong>
                <div className="muted">Cutaneous rash (2018)</div>
              </div>
            </div>
            <div className="fact-row">
              <span className="prov prov-verified">Verified</span>
              <div className="grow xs">
                <strong>Amlodipine 5mg</strong>
                <div className="muted">Hypertension medication</div>
              </div>
            </div>
            <div className="fact-row">
              <span className="prov prov-ai">AI-inferred</span>
              <div className="grow xs">
                <strong>Tension etiology</strong>
                <div className="muted">Afternoon headache onset</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chronological Timeline */}
        <div className="ws-section">
          <h3>CareGraph Progression</h3>
          <div className="timeline" style={{ paddingLeft: 6 }}>
            <div className="timeline-item">
              <div className="timeline-dot">
                <CheckCircle2 style={{ width: 12, height: 12, color: "var(--teal-600)" }} />
              </div>
              <div className="xs">
                <strong>Intake & Consent Completed</strong>
                <div className="muted">10:30 · DPDP Act Verified</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot">
                <HeartPulse style={{ width: 12, height: 12, color: "var(--navy-800)" }} />
              </div>
              <div className="xs">
                <strong>Bedside Vitals Captured</strong>
                <div className="muted">10:34 · Nurse Chidinma Eze</div>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot">
                <Sparkles style={{ width: 12, height: 12, color: "var(--teal-600)" }} />
              </div>
              <div className="xs">
                <strong>AI Clinical Draft Prepared</strong>
                <div className="muted">10:35 · 8 Sections Populated</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Column 2: Center Note Editor */}
      <section className="ws-col ws-center">
        {/* Sticky Toolbar */}
        <div className="ws-toolbar between">
          <div className="row gap-3">
            <Link href="/consultations" className="btn btn-ghost btn-sm">
              <ArrowLeft style={{ width: 14, height: 14 }} />
              <span>Consultations</span>
            </Link>
            <span className="mono subtle">{consultation.id}</span>
            <span
              className={`badge ${
                consultation.status === "Signed" ? "badge-success" : "badge-teal"
              }`}
            >
              {consultation.status}
            </span>
          </div>

          <div className="row gap-2">
            <Link
              href={`/consultations/${consultation.id}/missing`}
              className="btn btn-secondary btn-sm"
              style={{ color: "var(--warning-text)" }}
            >
              <AlertTriangle style={{ width: 14, height: 14 }} />
              <span>Missing items</span>
            </Link>
            <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft}>
              Save draft
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSignNote}
              disabled={signing || consultation.status === "Signed" || !can("sign_notes")}
              title={!can("sign_notes") ? "Attending clinician authority required to sign" : undefined}
            >
              {signing && <span className="spinner" />}
              <span>
                {consultation.status === "Signed"
                  ? "Signed & Locked"
                  : !can("sign_notes")
                  ? "Sign-off (Clinician only)"
                  : "Approve & Sign note"}
              </span>
            </button>
          </div>
        </div>

        {/* Clinical Note Sections */}
        <div className="stack gap-4" style={{ padding: "16px 24px" }}>
          {SECTION_DEFS.map((sec) => {
            const val: ConsultSection = (consultation.sections as any)[sec.key] || {
              text: "",
              origin: "empty",
            };
            const originClass =
              val.origin === "ai"
                ? "prov-ai"
                : val.origin === "clinician"
                ? "prov-verified"
                : val.origin === "ai-edited"
                ? "prov-edited"
                : "prov-missing";

            const originLabel =
              val.origin === "ai"
                ? "AI draft"
                : val.origin === "clinician"
                ? "Clinician-entered"
                : val.origin === "ai-edited"
                ? "AI draft · clinician-edited"
                : "Empty";

            return (
              <div key={sec.key} className="note-section">
                <div className="note-section-head between">
                  <div className="row gap-2">
                    <h3>{sec.label}</h3>
                    <span className={`prov ${originClass}`}>{originLabel}</span>
                  </div>
                </div>
                <textarea
                  className="textarea"
                  rows={sec.rows}
                  placeholder={sec.placeholder}
                  value={val.text}
                  onChange={(e) => handleSectionChange(sec.key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Column 3: Right AI Advisory Panel */}
      <aside className="ws-col ws-right">
        <div className="ai-panel-head">
          <div className="ai-mark">
            <Sparkles style={{ width: 16, height: 16 }} />
          </div>
          <div>
            <div className="small strong">Clinova Assistant</div>
            <div className="xs muted">Contextual clinical support</div>
          </div>
        </div>

        {/* AI Quick Actions Chips */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
          <div className="quick-actions">
            <button
              className="chip"
              onClick={() => {
                setAiMessage("Differential considerations for this presentation");
              }}
            >
              <Sparkles style={{ width: 12, height: 12 }} />
              <span>Differential considerations</span>
            </button>
            <button
              className="chip"
              onClick={() => {
                setAiMessage("Check red flags and vital stability");
              }}
            >
              <AlertTriangle style={{ width: 12, height: 12 }} />
              <span>Check red flags</span>
            </button>
          </div>
        </div>

        {/* Chat Thread */}
        <div className="ai-thread">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === "user" ? "msg-user" : "msg-ai"}>
              {m.role === "ai" ? (
                <>
                  <div className="msg-ai-head">
                    <Sparkles style={{ width: 14, height: 14 }} />
                    <span>Clinova AI Copilot</span>
                  </div>
                  <div className="msg-ai-body">
                    <p style={{ margin: 0 }}>{m.text}</p>
                    {m.details && m.details.length > 0 && (
                      <div className="ai-block">
                        <ul>
                          {m.details.map((d, dIdx) => (
                            <li key={dIdx} className="xs">
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <span>{m.text}</span>
              )}
            </div>
          ))}

          {aiLoading && (
            <div className="msg-ai">
              <div className="msg-ai-body row gap-2">
                <span className="spinner" />
                <span className="xs muted">Evaluating clinical context…</span>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Prompt Composer */}
        <form onSubmit={handleAiSend} className="ai-composer">
          <textarea
            className="input textarea"
            placeholder="Ask about differentials, guidelines, or medications…"
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAiSend(e);
              }
            }}
          />
          <div className="row between" style={{ marginTop: 8 }}>
            <span className="xs muted">Strict Human Decision Gate</span>
            <button type="submit" className="btn btn-primary btn-sm" disabled={aiLoading || !aiMessage.trim()}>
              <Send style={{ width: 13, height: 13 }} />
              <span>Send</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
