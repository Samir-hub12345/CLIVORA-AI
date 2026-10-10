"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  AlertCircle,
  ShieldCheck,
  Check,
  Edit2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";
import { PermissionRestricted } from "@/components/common/PermissionRestricted";

export default function NewPatientPage() {
  const router = useRouter();
  const { patients, addPatient, can, toast, me } = useClinova();

  if (!can("register")) {
    return <PermissionRestricted what="patient registration" role={me.role} />;
  }

  const nextId = `CLN-${Math.max(...patients.map((p) => Number(p.id.split("-")[1]) || 10400)) + 1}`;

  const [step, setStep] = useState<"form" | "review">("form");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dob: "",
    sex: "Female",
    phone: "",
    email: "",
    address: "",
    ecName: "",
    ecRelation: "",
    ecPhone: "",
    language: "English",
    consent: "Signed — on file",
    accessibility: "None recorded",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().split(/\s+/).length < 2) {
      errs.name = "Enter the patient’s full name (first and last name).";
    }
    if (!form.dob) {
      errs.dob = "Enter date of birth.";
    } else if (new Date(form.dob) > new Date()) {
      errs.dob = "Date of birth cannot be in the future.";
    }
    if (!form.phone.trim()) {
      errs.phone = "Enter a valid phone number.";
    }
    if (!form.consent) {
      errs.consent = "Select consent and privacy status.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setStep("review");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const createdId = addPatient({
        name: form.name.trim(),
        dob: form.dob,
        sex: form.sex,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        language: form.language,
        consent: form.consent,
        accessibility: form.accessibility,
        emergency: form.ecName
          ? {
              name: form.ecName,
              relation: form.ecRelation || "Contact",
              phone: form.ecPhone,
            }
          : undefined,
        recordStatus: "Complete",
      });
      router.push(`/patients/${createdId}`);
    } catch (err: any) {
      toast("Error creating record", err?.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href="/patients">Patients</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Register patient</span>
      </nav>

      <header className="page-header">
        <div className="stack gap-1">
          <h1>Register patient</h1>
          <p>Collect only the information your clinic needs. Fields marked * are required.</p>
        </div>
      </header>

      {/* Progress steps */}
      <div className="row gap-3" style={{ marginBottom: 20 }} aria-label="Registration progress">
        <div
          className="row gap-2 small"
          style={{ color: step === "form" ? "var(--text)" : "var(--text-3)" }}
        >
          <span
            className="avatar sm"
            style={{
              background: step === "review" ? "var(--teal-600)" : "var(--navy-800)",
              color: "#fff",
            }}
          >
            {step === "review" ? <Check size={12} /> : "1"}
          </span>
          <span className="medium">Patient details</span>
          <span style={{ width: 32, height: 1, background: "var(--border-strong)" }} />
        </div>
        <div
          className="row gap-2 small"
          style={{ color: step === "review" ? "var(--text)" : "var(--text-3)" }}
        >
          <span
            className="avatar sm"
            style={{
              background: step === "review" ? "var(--navy-800)" : "var(--navy-50)",
              color: step === "review" ? "#fff" : "var(--text-3)",
            }}
          >
            2
          </span>
          <span className="medium">Review & save</span>
        </div>
      </div>

      {step === "form" ? (
        <form onSubmit={handleNext} noValidate className="stack gap-4" style={{ maxWidth: 880 }}>
          {/* Section A */}
          <fieldset className="card" style={{ margin: 0, padding: 0 }}>
            <div className="card-header" style={{ justifyContent: "flex-start", gap: 12 }}>
              <span className="icon-tile tile-navy" style={{ width: 30, height: 30 }}>
                <User style={{ width: 16, height: 16 }} />
              </span>
              <h2>A. Patient identity</h2>
            </div>
            <div className="card-body stack gap-4">
              <div className="grid grid-2">
                <div className="field">
                  <label className="label" htmlFor="name">
                    <span>Full name</span> <span className="req">*</span>
                  </label>
                  <input
                    id="name"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Chinelo Nnamdi"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="field">
                  <label className="label" htmlFor="id">
                    <span>Patient ID</span> <span className="opt">(Assigned automatically)</span>
                  </label>
                  <input
                    id="id"
                    className="input mono"
                    value={nextId}
                    readOnly
                    style={{ background: "var(--surface-2)" }}
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="dob">
                    <span>Date of birth</span> <span className="req">*</span>
                  </label>
                  <input
                    id="dob"
                    type="date"
                    className="input"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    max={new Date().toISOString().slice(0, 10)}
                    aria-invalid={!!errors.dob}
                  />
                  {errors.dob && <span className="error-text">{errors.dob}</span>}
                </div>

                <div className="field">
                  <label className="label" htmlFor="sex">
                    <span>Sex</span>
                  </label>
                  <select
                    id="sex"
                    className="select"
                    value={form.sex}
                    onChange={(e) => setForm({ ...form, sex: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Intersex">Intersex</option>
                    <option value="Other">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Section B */}
          <fieldset className="card" style={{ margin: 0, padding: 0 }}>
            <div className="card-header" style={{ justifyContent: "flex-start", gap: 12 }}>
              <span className="icon-tile tile-navy" style={{ width: 30, height: 30 }}>
                <Phone style={{ width: 16, height: 16 }} />
              </span>
              <h2>B. Contact details</h2>
            </div>
            <div className="card-body stack gap-4">
              <div className="grid grid-2">
                <div className="field">
                  <label className="label" htmlFor="phone">
                    <span>Phone number</span> <span className="req">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+234 803 555 0100"
                    aria-invalid={!!errors.phone}
                  />
                  {errors.phone && <span className="error-text">{errors.phone}</span>}
                </div>

                <div className="field">
                  <label className="label" htmlFor="email">
                    <span>Email address</span> <span className="opt">(Optional)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="address">
                  <span>Residential address</span> <span className="opt">(Optional)</span>
                </label>
                <input
                  id="address"
                  className="input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street address, city"
                />
              </div>
            </div>
          </fieldset>

          {/* Section C */}
          <fieldset className="card" style={{ margin: 0, padding: 0 }}>
            <div className="card-header" style={{ justifyContent: "flex-start", gap: 12 }}>
              <span className="icon-tile tile-navy" style={{ width: 30, height: 30 }}>
                <ShieldCheck style={{ width: 16, height: 16 }} />
              </span>
              <h2>C. Administrative & consent</h2>
            </div>
            <div className="card-body stack gap-4">
              <div className="grid grid-2">
                <div className="field">
                  <label className="label" htmlFor="lang">
                    <span>Preferred language</span>
                  </label>
                  <select
                    id="lang"
                    className="select"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                  >
                    <option value="English">English</option>
                    <option value="Nigerian Pidgin">Nigerian Pidgin</option>
                    <option value="Yoruba">Yoruba</option>
                    <option value="Hausa">Hausa</option>
                    <option value="Igbo">Igbo</option>
                    <option value="French">French</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="consent">
                    <span>Consent and privacy documentation</span> <span className="req">*</span>
                  </label>
                  <select
                    id="consent"
                    className="select"
                    value={form.consent}
                    onChange={(e) => setForm({ ...form, consent: e.target.value })}
                  >
                    <option value="Signed — on file">Signed — on file</option>
                    <option value="Verbal consent — form pending">Verbal consent — form pending</option>
                    <option value="Not yet obtained">Not yet obtained</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="accessibility">
                  <span>Accessibility requirements</span> <span className="opt">(Optional)</span>
                </label>
                <input
                  id="accessibility"
                  className="input"
                  value={form.accessibility}
                  onChange={(e) => setForm({ ...form, accessibility: e.target.value })}
                  placeholder="e.g. Wheelchair access, interpreter required"
                />
              </div>
            </div>
          </fieldset>

          <div className="row between" style={{ paddingTop: 8 }}>
            <Link href="/patients" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
              Review details
            </button>
          </div>
        </form>
      ) : (
        /* Review Step */
        <div className="stack gap-4" style={{ maxWidth: 880 }}>
          <div className="alert alert-info">
            <Sparkles style={{ width: 18, height: 18 }} />
            <span>
              Check the details below before saving. A new patient chart will be initialized with ID{" "}
              <strong>{nextId}</strong>.
            </span>
          </div>

          <div className="card">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <h3>Patient identity</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep("form")}>
                  <Edit2 style={{ width: 14, height: 14 }} />
                  <span>Edit</span>
                </button>
              </div>
              <dl className="kv">
                <dt>Full name</dt>
                <dd>{form.name}</dd>
                <dt>Patient ID</dt>
                <dd className="mono">{nextId}</dd>
                <dt>Date of birth</dt>
                <dd>{form.dob}</dd>
                <dt>Sex</dt>
                <dd>{form.sex}</dd>
              </dl>
            </div>

            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <h3>Contact details</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep("form")}>
                  <Edit2 style={{ width: 14, height: 14 }} />
                  <span>Edit</span>
                </button>
              </div>
              <dl className="kv">
                <dt>Phone</dt>
                <dd>{form.phone}</dd>
                <dt>Email</dt>
                <dd>{form.email || "—"}</dd>
                <dt>Address</dt>
                <dd>{form.address || "—"}</dd>
              </dl>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <div className="row between" style={{ marginBottom: 10 }}>
                <h3>Administrative</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setStep("form")}>
                  <Edit2 style={{ width: 14, height: 14 }} />
                  <span>Edit</span>
                </button>
              </div>
              <dl className="kv">
                <dt>Preferred language</dt>
                <dd>{form.language}</dd>
                <dt>Consent & privacy</dt>
                <dd>{form.consent}</dd>
                <dt>Accessibility</dt>
                <dd>{form.accessibility}</dd>
              </dl>
            </div>
          </div>

          <div className="row between">
            <button className="btn btn-ghost" onClick={() => setStep("form")}>
              Back to edit
            </button>
            <button className="btn btn-accent" onClick={handleSave} disabled={loading}>
              {loading && <span className="spinner" />}
              <span>Save patient record</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
