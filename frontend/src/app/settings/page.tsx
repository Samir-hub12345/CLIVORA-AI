"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Settings as SettingsIcon, ShieldCheck, Users, Lock, Server, CheckCircle2 } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { can, toast, me } = useClinova();
  const [tab, setTab] = useState<"ai" | "roles" | "security" | "integrations">(
    tabParam === "roles" || tabParam === "security" || tabParam === "integrations" ? tabParam : "ai"
  );

  useEffect(() => {
    if (tabParam === "roles" || tabParam === "security" || tabParam === "integrations" || tabParam === "ai") {
      setTab(tabParam);
    }
  }, [tabParam]);

  const [aiCaps, setAiCaps] = useState([
    { id: "read", name: "Read patient records", desc: "Current chart within authorized session", enabled: true },
    { id: "summarize", name: "Summarise clinical history", desc: "Draft summaries with source citations", enabled: true },
    { id: "missing", name: "Highlight missing information", desc: "Epistemic uncertainty and allergy alerts", enabled: true },
    { id: "draft", name: "Draft consultation notes", desc: "Structured note generation from rough clinician notes", enabled: true },
  ]);

  const toggleCap = (id: string) => {
    setAiCaps((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
    toast("Setting updated", "AI capability configuration saved", "success");
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Settings</h1>
            <span className="demo-ribbon">Clinic Workspace Configuration</span>
          </div>
          <p>
            {can("manage_settings")
              ? "Workspace configuration for Lekki Family Health Clinic."
              : `Viewing configuration as ${me.role}. Admin privileges required to edit.`}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className="tab" aria-selected={tab === "ai"} onClick={() => setTab("ai")}>
          <ShieldCheck style={{ width: 16, height: 16 }} />
          <span>AI Permissions</span>
        </button>
        <button className="tab" aria-selected={tab === "roles"} onClick={() => setTab("roles")}>
          <Users style={{ width: 16, height: 16 }} />
          <span>Roles & Access</span>
        </button>
        <button className="tab" aria-selected={tab === "security"} onClick={() => setTab("security")}>
          <Lock style={{ width: 16, height: 16 }} />
          <span>Security & Sessions</span>
        </button>
        <button className="tab" aria-selected={tab === "integrations"} onClick={() => setTab("integrations")}>
          <Server style={{ width: 16, height: 16 }} />
          <span>Integrations</span>
        </button>
      </div>

      {tab === "ai" && (
        <div className="card">
          <div className="card-header">
            <h3>Bounded AI Capabilities</h3>
            <span className="badge badge-teal">Human-in-the-Loop</span>
          </div>
          <div className="card-body stack gap-3">
            {aiCaps.map((c) => (
              <div key={c.id} className="row between" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{c.name}</strong>
                  <div className="xs muted">{c.desc}</div>
                </div>
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-checked={c.enabled}
                  onClick={() => toggleCap(c.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div className="card">
          <div className="card-header">
            <h3>Team Roles & Access Control</h3>
            <span className="badge badge-navy">RBAC Matrix</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Clinical Review</th>
                  <th>Sign Notes</th>
                  <th>Patient Registration</th>
                  <th>System Administration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">Attending Clinician</td>
                  <td><span className="badge badge-success">Full</span></td>
                  <td><span className="badge badge-success">Authorized</span></td>
                  <td><span className="badge badge-success">Yes</span></td>
                  <td><span className="badge badge-outline">No</span></td>
                </tr>
                <tr>
                  <td className="strong">Triage Nurse</td>
                  <td><span className="badge badge-teal">Triage Only</span></td>
                  <td><span className="badge badge-outline">No</span></td>
                  <td><span className="badge badge-success">Yes</span></td>
                  <td><span className="badge badge-outline">No</span></td>
                </tr>
                <tr>
                  <td className="strong">Medical Receptionist</td>
                  <td><span className="badge badge-outline">No</span></td>
                  <td><span className="badge badge-outline">No</span></td>
                  <td><span className="badge badge-success">Yes</span></td>
                  <td><span className="badge badge-outline">No</span></td>
                </tr>
                <tr>
                  <td className="strong">System Administrator</td>
                  <td><span className="badge badge-outline">No</span></td>
                  <td><span className="badge badge-outline">No</span></td>
                  <td><span className="badge badge-success">Yes</span></td>
                  <td><span className="badge badge-success">Full</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "security" && (
        <div className="card">
          <div className="card-header">
            <h3>Session Timeout & Cryptographic Security</h3>
            <span className="badge badge-success">DPDP Act 2023 Compliant</span>
          </div>
          <div className="card-body stack gap-3">
            <div className="kv">
              <dt>Session Inactivity Timeout</dt>
              <dd>15 minutes</dd>
              <dt>Authentication Protocol</dt>
              <dd>Bearer JWT with cryptographic SHA-256 payload binding</dd>
              <dt>Zero-PII Isolation</dt>
              <dd>Strict client-side token stripping & sanitized error traces</dd>
            </div>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="stack gap-3">
          <div className="card">
            <div className="card-header">
              <div>
                <strong>Electronic Health Record (EHR)</strong>
                <div className="xs muted">FHIR R4 / HL7 Interface</div>
              </div>
              <span className="badge badge-outline">Connected (Mock Fixture)</span>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div>
                <strong>Laboratory Information System (LIS)</strong>
                <div className="xs muted">Automated results ingestion with reference ranges</div>
              </div>
              <span className="badge badge-outline">Connected (Mock Fixture)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="page" style={{ padding: 48, textAlign: "center" }}>
          <span className="spinner" />
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}
