"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  UserRound,
  Activity,
  Heart,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Upload,
  Sparkles,
} from "lucide-react";
import { DashboardShell, DataState, Stat } from "@/components/common/dashboard-shell";
import { RoleGuard } from "@/components/common/role-guard";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { api, documentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statusLabel } from "@/lib/status-label";
import { Patient, PatientCase, PatientConsultation, MedicalDocument } from "@/types";

function PatientDashboardContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Patient | null>(null);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [consultations, setConsultations] = useState<PatientConsultation[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes, vRes, dRes] = await Promise.all([
        api.getMyProfile(),
        api.getMyCases(),
        api.getMyConsultations(),
        documentsApi.listDocuments(),
      ]);

      if (pRes.error || cRes.error || vRes.error) {
        setError(pRes.error || cRes.error || vRes.error || "Could not load your records.");
      } else {
        setProfile(pRes.data ?? null);
        setCases(cRes.data || []);
        setConsultations(vRes.data || []);
        if (dRes.data) {
          setDocuments(dRes.data || []);
        }
      }
    } catch {
      setError("An unexpected error occurred while loading your health portal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeCase = cases.length > 0 ? cases[0] : null;
  const awaitingCount = cases.filter((c) =>
    ["awaiting_review", "in_review", "ready_for_doctor"].includes(c.status)
  ).length;

  return (
    <DashboardShell
      title={`Welcome, ${user?.full_name || "Patient"}`}
      description="Personal Healthcare Portal &bull; Track active intakes, view doctor reviews, and access your medical documents."
      refresh={() => void loadData()}
    >
      <DataState loading={loading} error={error} retry={() => void loadData()} />

      {!loading && !error && (
        <div className="space-y-6">
          {/* Top Status & Identity Banner */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-lg">
                <UserRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Patient Environment
                  </span>
                  {profile?.mrn && (
                    <span className="text-xs font-mono text-slate-500 font-semibold">
                      MRN: {profile.mrn}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {user?.full_name || "James Miller"}
                </h2>
                <p className="text-xs text-slate-500">
                  {profile
                    ? `DOB: ${profile.date_of_birth} &bull; Blood Group: ${profile.blood_group || "Recorded"} &bull; ${profile.gender}`
                    : "Complete your personal profile to link your medical chart."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/intake"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <ClipboardList className="w-4 h-4" />
                <span>Start New Intake</span>
              </Link>
              <Link
                href="/portal/profile"
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                My Profile
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat title="My Intake Submissions" value={cases.length} />
            <Stat title="Awaiting Clinical Review" value={awaitingCount} />
            <Stat title="Completed Consultations" value={consultations.length} />
            <Stat title="Medical Documents" value={documents.length} />
          </div>

          {/* Active Intake Case Card (if exists) */}
          {activeCase && (
            <section className="bg-white rounded-2xl border border-teal-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
                    <Activity className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Current Intake Case: {activeCase.synthetic_case_id}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Submitted on {new Date(activeCase.created_at).toLocaleString()} &bull; Visit: {activeCase.visit_type} ({activeCase.facility_type})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      activeCase.status === "approved"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : activeCase.status === "referred"
                        ? "bg-purple-50 text-purple-800 border-purple-300"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }`}
                  >
                    {statusLabel(activeCase.status)}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                    Your Submitted Symptoms
                  </span>
                  <p className="text-slate-800 leading-relaxed font-mono">
                    "{activeCase.raw_symptoms}"
                  </p>
                  {activeCase.report_filename && (
                    <p className="text-teal-700 text-[11px] font-semibold pt-1">
                      Attached Document: {activeCase.report_filename}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 p-3.5 bg-teal-50/50 rounded-xl border border-teal-200">
                  <span className="font-bold text-teal-800 block uppercase tracking-wider text-[10px]">
                    Physician Review &amp; Summary
                  </span>
                  {activeCase.summary ? (
                    <p className="text-slate-800 leading-relaxed">
                      {activeCase.summary}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500 py-2">
                      <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span>
                        Under clinical evaluation. A physician summary will be posted once clinical review is completed.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Patient Vitals & Health Observation Section */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900">My Recorded Vitals</h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Authorized Clinical Measurements
              </span>
            </div>

            {profile?.medical_history || profile?.allergies || profile?.current_medications ? (
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    Allergies
                  </span>
                  <p className="font-bold text-slate-800 mt-1">
                    {profile.allergies || "None recorded"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    Current Medications
                  </span>
                  <p className="font-bold text-slate-800 mt-1">
                    {profile.current_medications || "None recorded"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                    Medical History
                  </span>
                  <p className="font-bold text-slate-800 mt-1">
                    {profile.medical_history || "No chronic conditions"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                <Activity className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="font-semibold text-slate-700">No vitals currently on record.</p>
                <p>Healthcare staff will record blood pressure, pulse, temperature, and SpO2 during in-person triage.</p>
              </div>
            )}
          </section>

          {/* Submissions & History */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Past Submissions */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Recent Intake Submissions</h3>
                <Link href="/intake" className="text-xs font-semibold text-teal-700 hover:underline">
                  New Intake &rarr;
                </Link>
              </div>

              {cases.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                  No submissions yet. Start an intake to share symptoms with the clinical team.
                </div>
              ) : (
                <div className="space-y-3">
                  {cases.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {c.synthetic_case_id}
                        </span>
                        <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[10px]">
                          {statusLabel(c.status)}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-2">
                        {c.raw_symptoms || "No symptom text"}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        <span>{c.visit_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* My Consultations */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">My Clinical Consultations</h3>
                <span className="text-xs text-slate-500 font-medium">Physician Visits</span>
              </div>

              {consultations.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                  No consultations linked to your patient profile yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {consultations.slice(0, 5).map((v) => (
                    <div
                      key={v.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{v.doctor_name}</span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {statusLabel(v.status)}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{v.chief_complaint}</p>
                      {v.summary && (
                        <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                          Assessment: {v.summary}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Scheduled: {new Date(v.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Medical Documents Quick Access */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Medical Documents</h3>
                <p className="text-xs text-slate-500">
                  Uploaded lab results, prescriptions, and clinical records
                </p>
              </div>
              <Link
                href="/documents"
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>All Documents</span>
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-500 space-y-2">
                <FileCheck className="w-6 h-6 text-slate-400 mx-auto" />
                <p>No documents uploaded yet. You can attach lab reports during symptom intake or via Documents.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {documents.slice(0, 6).map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 hover:border-teal-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {doc.filename}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                        {doc.document_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Uploaded {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Safety & Non-Diagnostic Disclaimer */}
          <ClinicalDisclaimer />
        </div>
      )}
    </DashboardShell>
  );
}

export default function PatientDashboard() {
  return (
    <RoleGuard roles={["patient"]}>
      <PatientDashboardContent />
    </RoleGuard>
  );
}