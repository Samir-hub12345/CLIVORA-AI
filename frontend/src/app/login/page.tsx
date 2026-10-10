"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

const FLOW_STEPS = [
  { step: 1, title: "Relevant clinical history is organised", actor: "AI" },
  { step: 2, title: "Draft clinical summary is prepared", actor: "AI" },
  { step: 3, title: "Missing information is highlighted", actor: "AI" },
  { step: 4, title: "Clinician reviews and documents decisions", actor: "Clinician" },
  { step: 5, title: "Note is approved and signed", actor: "Clinician" },
  { step: 6, title: "Instructions and follow-up are prepared", actor: "AI • Staff Approved" },
];

const DEMO_ROLES = [
  {
    id: "clinician",
    label: "Clinician (Attending Physician)",
    description: "Doctor Reviewer Workbench & Decision Sign-off",
    email: "joshua.ajose@lekkifamily.clinic",
    route: "/staff/review",
  },
  {
    id: "nurse",
    label: "Nurse (Triage Nurse)",
    description: "Bedside Acuity, NEWS2 & Vital Signs",
    email: "chidinma.eze@lekkifamily.clinic",
    route: "/staff/triage",
  },
  {
    id: "receptionist",
    label: "Receptionist (Front Desk)",
    description: "Patient Registration & Pathway Routing",
    email: "tunde.olawale@lekkifamily.clinic",
    route: "/staff/reception",
  },
  {
    id: "facility_admin",
    label: "Facility Administrator",
    description: "Bed Capacity & Regional Telemetry",
    email: "admin@lekkifamily.clinic",
    route: "/facilities",
  },
  {
    id: "sysadmin",
    label: "System Administrator",
    description: "Audit Ledger & Cryptographic Verification",
    email: "sysadmin@clinova.internal",
    route: "/system",
  },
  {
    id: "patient",
    label: "Patient (Portal User)",
    description: "Digital Intake & Care Plan Instructions",
    email: "ada.okafor@example.com",
    route: "/patient",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useClinova();

  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("joshua.ajose@lekkifamily.clinic");
  const [password, setPassword] = useState("ClinovaDemo2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("clinician");
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);

  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    const found = DEMO_ROLES.find((r) => r.id === roleId);
    if (found) {
      setEmail(found.email);
    }
    setError(null);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = "Enter your work email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Enter a valid email address, like name@clinic.org.";
    }

    if (mode === "signin") {
      if (!password) {
        errs.password = "Enter your password.";
      } else if (password.length < 8) {
        errs.password = "Passwords are at least 8 characters.";
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    if (password === "incorrect-pass") {
      setError(
        "The email or password you entered is incorrect. After 5 failed attempts your account will be locked for 15 minutes."
      );
      return;
    }

    setLoading(true);
    try {
      const ok = await signIn(selectedRole, password);
      if (ok) {
        const found = DEMO_ROLES.find((r) => r.id === selectedRole);
        router.push(found?.route || "/staff");
      } else {
        setError("Invalid credentials or server unavailable.");
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSso = async () => {
    setSsoLoading(true);
    setError(null);
    try {
      const ok = await signIn(selectedRole, "ClinovaDemo2026!");
      if (ok) {
        const found = DEMO_ROLES.find((r) => r.id === selectedRole);
        router.push(found?.route || "/staff");
      }
    } finally {
      setSsoLoading(false);
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldErrors({ email: "Enter a valid work email." });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 700);
  };

  return (
    <div className="auth">
      {/* Left Column: Authentic Login Panel */}
      <div className="auth-panel">
        <div className="row between">
          <Link href="/" className="row gap-2" style={{ textDecoration: "none", color: "inherit" }}>
            <span
              className="brand-mark"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "var(--navy-800)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden="true"
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path d="M8 2v12M2 8h12" stroke="#5fd3c7" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            <span className="strong" style={{ fontSize: 16 }}>
              Clinova <span style={{ color: "var(--teal-600)" }}>AI</span>
            </span>
          </Link>
          <span className="demo-ribbon">Demo environment</span>
        </div>

        <div className="auth-form-wrap">
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} noValidate className="stack gap-5">
              <div className="stack gap-2">
                <h1>Welcome to Clinova AI</h1>
                <p className="muted">Your clinical workspace, organized around better care.</p>
              </div>

              {error && (
                <div className="alert alert-error" role="alert">
                  <AlertTriangle style={{ width: 18, height: 18 }} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {/* SSO Button */}
              <button
                type="button"
                className="btn btn-secondary btn-lg btn-block"
                onClick={handleSso}
                disabled={loading || ssoLoading}
              >
                {ssoLoading ? (
                  <span className="spinner" aria-hidden="true" />
                ) : (
                  <Building style={{ width: 16, height: 16 }} aria-hidden="true" />
                )}
                <span>{ssoLoading ? "Redirecting to your organization…" : "Sign in with organization SSO"}</span>
              </button>

              <div className="row gap-3 xs muted">
                <hr className="divider grow" />
                <span>or sign in with email</span>
                <hr className="divider grow" />
              </div>

              {/* Email */}
              <div className="field">
                <label className="label" htmlFor="email">
                  <span>Work email</span>
                </label>
                <div className="input-group">
                  <Mail style={{ width: 16, height: 16 }} aria-hidden="true" />
                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!fieldErrors.email}
                  />
                </div>
                {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
              </div>

              {/* Password */}
              <div className="field">
                <label className="label" htmlFor="password">
                  <span>Password</span>
                </label>
                <div className="input-group">
                  <Lock style={{ width: 16, height: 16 }} aria-hidden="true" />
                  <input
                    id="password"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                    aria-invalid={!!fieldErrors.password}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm input-action"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff style={{ width: 15, height: 15 }} />
                    ) : (
                      <Eye style={{ width: 15, height: 15 }} />
                    )}
                  </button>
                </div>
                {fieldErrors.password && <span className="error-text">{fieldErrors.password}</span>}
              </div>

              {/* Role Select */}
              <div className="field">
                <label className="label" htmlFor="role">
                  <span>Demo: sign in as</span>
                </label>
                <div className="hint" style={{ marginBottom: 4 }}>
                  Role controls which actions are available — e.g. only clinicians can sign notes.
                </div>
                <select
                  id="role"
                  className="select"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  {DEMO_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} — {r.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row between">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ paddingLeft: 0, color: "var(--teal-700)" }}
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                    setResetSent(false);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={loading || ssoLoading}
              >
                {loading && <span className="spinner" aria-hidden="true" />}
                <span>{loading ? "Signing in…" : "Sign in"}</span>
              </button>

              <p className="xs muted" style={{ textAlign: "center", lineHeight: 1.5 }}>
                Demo: any password with 8+ characters signs in. Use{" "}
                <span className="mono">incorrect-pass</span> to preview the invalid-credentials state.
              </p>
            </form>
          ) : (
            /* Forgot Password Mode */
            <form onSubmit={handleResetSubmit} noValidate className="stack gap-5">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: "flex-start", paddingLeft: 0 }}
                onClick={() => setMode("signin")}
              >
                <ArrowLeft style={{ width: 14, height: 14 }} aria-hidden="true" />
                <span>Back to sign in</span>
              </button>

              <div className="stack gap-2">
                <h1>Reset your password</h1>
                <p className="muted">Enter your work email and we’ll send a reset link if an account exists.</p>
              </div>

              {resetSent ? (
                <div className="alert alert-success" role="status">
                  <CheckCircle2 style={{ width: 18, height: 18 }} aria-hidden="true" />
                  <span>
                    If an account exists for <strong>{email}</strong>, a reset link has been sent. The link
                    expires in 30 minutes. <em>(Simulated — no email is sent in demo mode.)</em>
                  </span>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label className="label" htmlFor="reset-email">
                      <span>Work email</span>
                    </label>
                    <input
                      id="reset-email"
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!fieldErrors.email}
                    />
                    {fieldErrors.email && <span className="error-text">{fieldErrors.email}</span>}
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                    {loading && <span className="spinner" aria-hidden="true" />}
                    <span>Send reset link</span>
                  </button>
                </>
              )}
            </form>
          )}
        </div>

        <footer className="row gap-4 wrap xs muted" style={{ marginTop: "auto", paddingTop: 24 }}>
          <Link href="/privacy">Privacy notice</Link>
          <Link href="/disclaimer">Security practices</Link>
          <Link href="/about">Terms of use</Link>
          <span style={{ marginLeft: "auto" }}>Sessions time out after 15 minutes of inactivity.</span>
        </footer>
      </div>

      {/* Right Column: Authentic Reference Marketing / Workflow Aside */}
      <div className="auth-aside">
        <div className="stack gap-4">
          <span
            className="demo-ribbon"
            style={{
              alignSelf: "flex-start",
              background: "rgba(255,255,255,0.06)",
              color: "#9fb3c8",
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            AI clinical workflow assistant
          </span>
          <h2>Less paperwork. More time for patient care.</h2>
          <p style={{ color: "#9fb3c8", maxWidth: 460, lineHeight: 1.6 }}>
            Clinova AI organises patient information, prepares documentation and coordinates follow-ups —
            while healthcare professionals stay in control of every clinical decision.
          </p>
        </div>

        <ol className="list-reset stack gap-2" style={{ maxWidth: 480 }}>
          {FLOW_STEPS.map((s, idx) => (
            <li key={s.step} className="flow-step">
              <span className="n">{idx + 1}</span>
              <span className="grow">{s.title}</span>
              <span className="who" style={s.actor.startsWith("Clinician") ? { color: "#5fd3c7" } : undefined}>
                {s.actor}
              </span>
            </li>
          ))}
        </ol>

        <div className="row gap-4 xs" style={{ color: "#8aa0b8" }}>
          <span className="row gap-2">
            <ShieldCheck style={{ width: 14, height: 14 }} aria-hidden="true" />
            <span>Role-based access</span>
          </span>
          <span>Full audit trail</span>
          <span>No compliance certification is claimed for this demo</span>
        </div>
      </div>
    </div>
  );
}
