"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Users,
  BrainCircuit,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Heart,
  Thermometer,
  Gauge,
  Calendar,
  Building2,
  RefreshCw,
} from "lucide-react";
import { DashboardShell, DataState, Stat } from "@/components/common/dashboard-shell";
import { RoleGuard } from "@/components/common/role-guard";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statusLabel } from "@/lib/status-label";
import { TriageCase, Consultation, Patient } from "@/types";

function DoctorDashboardContent() {
  const { user } = useAuth();
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, vRes, pRes] = await Promise.all([
        api.getCases(),
        api.getConsultations(),
        api.getPatients(),
      ]);

      if (cRes.error || vRes.error || pRes.error) {
        setError(cRes.error || vRes.error || pRes.error || "Unable to load clinical records.");
      } else {
        const fetchedCases = cRes.data || [];
        setCases(fetchedCases);
        setConsultations(vRes.data?.items || []);
        setPatients(pRes.data?.items || []);
        if (fetchedCases.length > 0 && !selectedCase) {
          setSelectedCase(fetchedCases[0]);
        }
      }
    } catch {
      setError("An unexpected error occurred while loading clinical data.");
    } finally {
      setLoading(false);
    }
  }, [selectedCase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const awaitingReviewCases = cases.filter((c) =>
    ["awaiting_review", "ready_for_doctor", "in_review"].includes(c.status)
  );

  const urgentCases = cases.filter(
    (c) => c.queue_category === "urgent-review" && c.status !== "approved"
  );
  const priorityCases = cases.filter(
    (c) => c.queue_category === "priority" && c.status !== "approved"
  );

  const filteredCases = cases.filter((c) => {
    if (queueFilter === "urgent") return c.queue_category === "urgent-review";
    if (queueFilter === "priority") return c.queue_category === "priority";
    if (queueFilter === "routine") return c.queue_category === "routine";
    if (queueFilter === "awaiting") return ["awaiting_review", "ready_for_doctor"].includes(c.status);
    return true;
  });

  // Parse vitals if JSON or string
  let parsedVitals: Record<string, any> | null = null;
  if (selectedCase?.vitals) {
    try {
      parsedVitals =
        typeof selectedCase.vitals === "string"
          ? JSON.parse(selectedCase.vitals)
          : selectedCase.vitals;
    } catch {
      parsedVitals = null;
    }
  }

  // Parse risk signals
  let riskSignalsList: any[] = [];
  if (selectedCase?.risk_signals) {
    try {
      riskSignalsList =
        typeof selectedCase.risk_signals === "string"
          ? JSON.parse(selectedCase.risk_signals)
          : selectedCase.risk_signals;
    } catch {
      riskSignalsList = [];
    }
  }

  return (
    <DashboardShell
      title={`Dr. ${user?.full_name || "Physician"} — Clinical Decision Center`}
      description="Authorized clinical triage queue &bull; AI decision support &bull; Human-in-the-loop review &amp; sign-off"
      refresh={() => void loadData()}
    >
      <DataState loading={loading} error={error} retry={() => void loadData()} />

      {!loading && !error && (
        <div className="space-y-6">
          {/* Workload Summary Bar */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Doctor / Clinician Environment
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Outpatient Triage &amp; Clinical Decision Support
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {user?.full_name || "Dr. Sarah Chen, MD"}
                </h2>
                <p className="text-xs text-slate-500">
                  Government District Hospital &bull; General Medicine &amp; Acute Care
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/review"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Full Review Queue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/triage"
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
              >
                <BrainCircuit className="w-4 h-4 text-emerald-600" />
                <span>AI Triage Tool</span>
              </Link>
            </div>
          </div>

          {/* Key Clinical Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat title="Awaiting Clinical Review" value={awaitingReviewCases.length} />
            <Stat title="Urgent / Emergency Review" value={urgentCases.length} />
            <Stat title="Priority Cases" value={priorityCases.length} />
            <Stat title="My Scheduled Encounters" value={consultations.length} />
          </div>

          {/* Priority Queue & Case Review Workspace */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Queue Panel (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cases Requiring Review</h3>
                  <p className="text-xs text-slate-500">
                    Prioritized triage queue sorted by clinical urgency
                  </p>
                </div>

                {/* Queue Filter Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  {["all", "urgent", "priority", "awaiting"].map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setQueueFilter(filterKey)}
                      className={`px-2.5 py-1 rounded-md capitalize transition ${
                        queueFilter === filterKey
                          ? "bg-white text-slate-900 font-bold shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {filterKey}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCases.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-500 space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <p className="font-semibold text-slate-700">No cases matching filter.</p>
                  <p>All active clinical submissions in this category have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCase(c)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition space-y-2 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">
                              {c.synthetic_case_id}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {c.facility_type} &bull; {c.visit_type}
                            </span>
                          </div>
                          <TriageBadge level={c.queue_category} />
                        </div>

                        <p className="text-slate-700 line-clamp-2 leading-relaxed">
                          {c.normalized_symptoms || c.raw_symptoms}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(c.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600 font-semibold">
                              Status: {statusLabel(c.status)}
                            </span>
                            <Link
                              href={`/review/case/${c.synthetic_case_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition inline-flex items-center gap-1"
                            >
                              Review &rarr;
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Case Inspection & Vitals Snapshot (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              {selectedCase ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Selected Case Preview
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">
                        {selectedCase.synthetic_case_id}
                      </h4>
                    </div>

                    <Link
                      href={`/review/case/${selectedCase.synthetic_case_id}`}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-sm"
                    >
                      <span>Open Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Vitals Snapshot */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Triage Vitals Snapshot
                    </span>
                    {parsedVitals ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">BP</span>
                          <span className="font-bold text-slate-900">
                            {parsedVitals.blood_pressure || parsedVitals.blood_pressure_systolic
                              ? `${parsedVitals.blood_pressure_systolic || ""}/${parsedVitals.blood_pressure_diastolic || ""}`
                              : "120/80"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">Heart Rate</span>
                          <span className="font-bold text-slate-900">
                            {parsedVitals.heart_rate || "76"} bpm
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">SpO2</span>
                          <span className="font-bold text-slate-900">
                            {parsedVitals.oxygen_saturation || "98"}%
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">Temp</span>
                          <span className="font-bold text-slate-900">
                            {parsedVitals.temperature || "37.0"}°C
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">RR</span>
                          <span className="font-bold text-slate-900">
                            {parsedVitals.respiratory_rate || "16"} /min
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                        Preliminary vitals recorded by triage nurse upon check-in.
                      </div>
                    )}
                  </div>

                  {/* Patient Narrative */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                      Patient Reported Symptoms
                    </span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-800 leading-relaxed text-[11px]">
                      "{selectedCase.raw_symptoms}"
                    </div>
                  </div>

                  {/* AI Clinical Support Summary */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-800 block uppercase tracking-wider text-[10px]">
                        Structured Clinical Summary
                      </span>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        HUMAN REVIEW REQUIRED
                      </span>
                    </div>
                    <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200 text-slate-800 text-[11px] leading-relaxed">
                      {selectedCase.normalized_symptoms || "Summary pending physician evaluation."}
                    </div>
                  </div>

                  {/* Rule signals if detected */}
                  {riskSignalsList.length > 0 && (
                    <div className="space-y-1.5 text-xs">
                      <span className="font-bold text-rose-800 block uppercase tracking-wider text-[10px]">
                        Red Flag Rule Signals ({riskSignalsList.length})
                      </span>
                      <div className="space-y-1">
                        {riskSignalsList.map((sig, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900 flex items-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            <span>
                              <strong>{sig.rule_id || "SIGNAL"}:</strong> {sig.signal || sig.source_text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Link
                      href={`/review/case/${selectedCase.synthetic_case_id}`}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Proceed to Authoritative Human Review &rarr;</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  Select a case from the queue to inspect preliminary vitals and structured clinical support notes.
                </div>
              )}

              {/* Quick Actions Links */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Link
                  href="/patients"
                  className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 transition shadow-xs"
                >
                  <Users className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="font-bold text-slate-900 block">EHR Directory</span>
                  <span className="text-[11px] text-slate-500">Browse {patients.length} patient records</span>
                </Link>
                <Link
                  href="/consultations"
                  className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 transition shadow-xs"
                >
                  <Calendar className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="font-bold text-slate-900 block">My Encounters</span>
                  <span className="text-[11px] text-slate-500">{consultations.length} clinical visits</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Encounters Table */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Assigned Consultations</h3>
                <p className="text-xs text-slate-500">
                  Authoritative clinical visits and documented assessments
                </p>
              </div>
              <Link href="/consultations" className="text-xs font-semibold text-emerald-700 hover:underline">
                View All &rarr;
              </Link>
            </div>

            {consultations.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                No consultations currently assigned to your physician ID.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {consultations.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : "Patient"}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {statusLabel(c.status)}
                      </span>
                    </div>
                    <p className="text-slate-700 font-medium line-clamp-1">{c.chief_complaint}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(c.scheduled_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Safety & Human-in-the-loop Reminder */}
          <ClinicalDisclaimer />
        </div>
      )}
    </DashboardShell>
  );
}

export default function DoctorDashboard() {
  return (
    <RoleGuard roles={["doctor"]}>
      <DoctorDashboardContent />
    </RoleGuard>
  );
}