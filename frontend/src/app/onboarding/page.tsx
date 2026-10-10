"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building, Users, Sliders, Sparkles, Server, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useClinova();

  const [step, setStep] = useState(0);
  const [clinicName, setClinicName] = useState("Lekki Family Health Clinic");
  const [clinicType, setClinicType] = useState("Outpatient clinic");
  const [timezone, setTimezone] = useState("Africa/Lagos (WAT, UTC+1)");
  const [teamMembers, setTeamMembers] = useState([
    { email: "funmi.adeyemi@lekkifamily.clinic", role: "Clinician" },
    { email: "chidinma.eze@lekkifamily.clinic", role: "Nurse" },
  ]);

  const steps = [
    { title: "Organization details", icon: Building },
    { title: "Team setup", icon: Users },
    { title: "Workflow preferences", icon: Sliders },
    { title: "AI configuration", icon: Sparkles },
    { title: "Integrations", icon: Server },
  ];

  const handleFinish = () => {
    toast("Workspace configured", "Your clinical workspace is ready to use", "success");
    router.push("/staff");
  };

  return (
    <div className="onb">
      {/* Left Steps Sidebar */}
      <aside className="onb-steps">
        <div style={{ marginBottom: 24 }}>
          <div className="row gap-2">
            <span
              className="brand-mark"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--navy-800)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16">
                <path d="M8 2v12M2 8h12" stroke="#5fd3c7" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            <span className="strong" style={{ fontSize: 16 }}>
              Clinova <span style={{ color: "var(--teal-600)" }}>AI</span>
            </span>
          </div>
          <div className="xs muted" style={{ marginTop: 4 }}>Clinic Workspace Setup</div>
        </div>

        <nav className="stack gap-2">
          {steps.map((s, idx) => (
            <button
              key={idx}
              className={`onb-step ${step > idx ? "done" : ""}`}
              aria-current={step === idx ? "step" : undefined}
              onClick={() => setStep(idx)}
            >
              <span className="n">{step > idx ? <CheckCircle2 size={12} /> : idx + 1}</span>
              <div>
                <div className="small medium">{s.title}</div>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Form Area */}
      <main className="onb-main stack gap-5">
        <header>
          <h1>{steps[step].title}</h1>
          <p className="muted">Configure your clinical environment preferences.</p>
        </header>

        {step === 0 && (
          <div className="stack gap-4 card" style={{ padding: 24 }}>
            <div className="field">
              <label className="label" htmlFor="onb-name">
                <span>Clinic name</span>
              </label>
              <input
                id="onb-name"
                className="input"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="onb-type">
                <span>Facility type</span>
              </label>
              <select
                id="onb-type"
                className="select"
                value={clinicType}
                onChange={(e) => setClinicType(e.target.value)}
              >
                <option value="Outpatient clinic">Outpatient clinic</option>
                <option value="Primary Healthcare Centre">Primary Healthcare Centre (PHC)</option>
                <option value="District Hospital">District Hospital</option>
                <option value="Tertiary Medical Centre">Tertiary Medical Centre</option>
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="onb-tz">
                <span>Timezone</span>
              </label>
              <input
                id="onb-tz"
                className="input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="stack gap-4 card" style={{ padding: 24 }}>
            <h3>Invite Clinical Team</h3>
            <p className="xs muted">Add colleagues to your clinic workspace.</p>
            {teamMembers.map((m, idx) => (
              <div key={idx} className="row gap-3">
                <input className="input grow" value={m.email} readOnly />
                <span className="badge badge-teal">{m.role}</span>
              </div>
            ))}
          </div>
        )}

        {step >= 2 && (
          <div className="stack gap-4 card" style={{ padding: 24 }}>
            <h3>Default System Settings</h3>
            <p className="small subtle">Standard clinical templates and deterministic safety boundaries active.</p>
            <div className="alert alert-success">
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              <span>Human-in-the-Loop review enforced for all clinical notes and referrals.</span>
            </div>
          </div>
        )}

        <div className="row between" style={{ marginTop: 16 }}>
          {step > 0 ? (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              <ArrowLeft style={{ width: 14, height: 14 }} />
              <span>Previous</span>
            </button>
          ) : (
            <span />
          )}

          {step < steps.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
              <span>Continue</span>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button className="btn btn-accent" onClick={handleFinish}>
              <span>Complete Setup & Launch</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
