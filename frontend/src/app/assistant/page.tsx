"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, ShieldCheck, CheckCircle2, History, MessageSquare, AlertTriangle, Send, HelpCircle, Lock } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

function AiAssistantContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { audit } = useClinova();
  const [activeTab, setActiveTab] = useState<"timeline" | "testing" | "guardrails" | "help">(
    tabParam === "help" || tabParam === "ask" || tabParam === "testing" || tabParam === "guardrails"
      ? tabParam === "ask"
        ? "testing"
        : (tabParam as any)
      : "timeline"
  );
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tabParam === "help") setActiveTab("help");
    else if (tabParam === "ask" || tabParam === "testing") setActiveTab("testing");
    else if (tabParam === "guardrails") setActiveTab("guardrails");
    else if (tabParam === "timeline") setActiveTab("timeline");
  }, [tabParam]);

  const aiEvents = audit.filter((a) => a.category === "AI draft" || a.actor.includes("AI"));

  const handleTestPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResponse(
        `AI Operational Assistant Evaluation:\n• Request evaluated against NMC 2023 ethical guidelines.\n• Autonomous diagnoses and prescription generation strictly blocked.\n• Advisory structure formatted with explicit epistemic uncertainty citations.`
      );
    }, 600);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>AI Assistant</h1>
            <span className="demo-ribbon">Bounded Reasoning & Clinical Safety</span>
          </div>
          <p>Transparent audit record of AI-assisted clinical workflows, testing sandbox, and operating rules.</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className="tab"
          aria-selected={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
        >
          <History style={{ width: 16, height: 16 }} />
          <span>Assistance Timeline</span>
        </button>
        <button
          className="tab"
          aria-selected={activeTab === "testing"}
          onClick={() => setActiveTab("testing")}
        >
          <Sparkles style={{ width: 16, height: 16 }} />
          <span>Ask Assistant</span>
        </button>
        <button
          className="tab"
          aria-selected={activeTab === "help"}
          onClick={() => setActiveTab("help")}
        >
          <HelpCircle style={{ width: 16, height: 16 }} />
          <span>How Clinova AI Works</span>
        </button>
        <button
          className="tab"
          aria-selected={activeTab === "guardrails"}
          onClick={() => setActiveTab("guardrails")}
        >
          <ShieldCheck style={{ width: 16, height: 16 }} />
          <span>Safety Guardrails</span>
        </button>
      </div>

      {activeTab === "timeline" && (
        <div className="card">
          <div className="card-header">
            <h3>Recent AI Assistance Events</h3>
            <span className="badge badge-teal">Zero-Delegation Audit</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action / Operation</th>
                  <th>Record / Scope</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {aiEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>
                      No AI events recorded yet.
                    </td>
                  </tr>
                ) : (
                  aiEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td className="subtle">{ev.ts}</td>
                      <td className="strong">{ev.actor}</td>
                      <td>{ev.action}</td>
                      <td className="mono subtle">{ev.record}</td>
                      <td>
                        <span className="badge badge-success">{ev.outcome}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "testing" && (
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="card-header">
            <h3>Prompt Interaction Sandbox</h3>
            <span className="xs subtle">Clinical Advisory Model</span>
          </div>
          <div className="card-body stack gap-4">
            <form onSubmit={handleTestPrompt} className="stack gap-3">
              <div className="field">
                <label className="label" htmlFor="ai-prompt">
                  <span>Enter clinical question or summarization prompt</span>
                </label>
                <textarea
                  id="ai-prompt"
                  className="textarea"
                  placeholder="e.g. Synthesize the history of present illness for a patient presenting with acute epigastric pain…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  style={{ minHeight: 120 }}
                />
              </div>

              <div className="row between">
                <span className="xs muted">Paschim Banga & NMC 2023 Rules Enforced</span>
                <button type="submit" className="btn btn-primary" disabled={loading || !prompt.trim()}>
                  {loading && <span className="spinner" />}
                  <Send style={{ width: 14, height: 14 }} />
                  <span>Execute query</span>
                </button>
              </div>
            </form>

            {response && (
              <div className="msg-ai" style={{ marginTop: 8 }}>
                <div className="msg-ai-head">
                  <Sparkles style={{ width: 14, height: 14 }} />
                  <span>Bounded AI Response</span>
                </div>
                <div className="msg-ai-body">
                  <pre style={{ margin: 0, fontFamily: "var(--font)", whiteSpace: "pre-wrap", fontSize: 13 }}>
                    {response}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "guardrails" && (
        <div className="stack gap-4" style={{ maxWidth: 840 }}>
          <div className="card">
            <div className="card-header">
              <h3>Mandatory Non-Delegation Constraints</h3>
              <span className="badge badge-warning">Statutory Gate</span>
            </div>
            <div className="card-body stack gap-3">
              <div className="fact-row">
                <span className="badge badge-error">Prohibited</span>
                <div>
                  <strong>Autonomous Diagnosis (AI_DIAGNOSIS)</strong>
                  <p className="xs muted">The AI model cannot autonomously issue a formal ICD-10 medical diagnosis.</p>
                </div>
              </div>
              <div className="fact-row">
                <span className="badge badge-error">Prohibited</span>
                <div>
                  <strong>Auto-Prescription (AUTO_PRESCRIBE)</strong>
                  <p className="xs muted">The AI system cannot dispatch or authorize pharmacological prescriptions without human clinician review.</p>
                </div>
              </div>
              <div className="fact-row">
                <span className="badge badge-error">Prohibited</span>
                <div>
                  <strong>Autonomous Admission / Discharge (AI_ADMISSION)</strong>
                  <p className="xs muted">Inpatient admission and discharge dispositions strictly require attending physician sign-off.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "help" && (
        <div className="stack gap-4" style={{ maxWidth: 840 }}>
          <div className="card">
            <div className="card-header">
              <h3>How Clinova AI Works</h3>
              <span className="badge badge-teal">Operating Principles</span>
            </div>
            <div className="card-body stack gap-4">
              {[
                [
                  "What it does",
                  "Summarises documented records, organises your notes into templates, flags missing documentation, summarises lab reports descriptively, and drafts patient instructions and reminders from approved plans.",
                ],
                [
                  "What it never does",
                  "Diagnose, prescribe, change treatment plans, modify verified facts, sign records, or send anything without staff approval.",
                ],
                [
                  "How to read outputs",
                  "Facts show their source record and date. AI-generated text has a dashed teal label. Missing information is amber — it means “not documented”, not “negative”.",
                ],
                [
                  "When it fails",
                  "You’ll see what was retrieved, what failed and what remains unavailable. You can always open the record directly and document manually.",
                ],
                [
                  "Privacy",
                  "Access is limited to the patient in context. Every AI request is logged in the audit trail with the requesting user and the records accessed. Patient data is never used to train public models.",
                ],
              ].map(([heading, desc], idx) => (
                <div key={idx} className="stack gap-1" style={{ borderBottom: idx < 4 ? "1px solid var(--border)" : "none", paddingBottom: idx < 4 ? 14 : 0 }}>
                  <strong style={{ fontSize: 14, color: "var(--navy-900)" }}>{heading}</strong>
                  <p className="small subtle" style={{ margin: 0, lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiAssistantPage() {
  return (
    <React.Suspense
      fallback={
        <div className="page" style={{ padding: 48, textAlign: "center" }}>
          <span className="spinner" />
        </div>
      }
    >
      <AiAssistantContent />
    </React.Suspense>
  );
}
