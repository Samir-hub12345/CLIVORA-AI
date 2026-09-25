"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Heart,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  ArrowRight,
  Stethoscope,
  X,
  Building2,
  Plus,
  RefreshCw,
} from "lucide-react";
import { DashboardShell, DataState, Stat } from "@/components/common/dashboard-shell";
import { RoleGuard } from "@/components/common/role-guard";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statusLabel } from "@/lib/status-label";
import { TriageCase, Patient } from "@/types";

function StaffDashboardContent() {
  const { user } = useAuth();
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Staff verification & vitals modal state
  const [selectedCaseForVerification, setSelectedCaseForVerification] = useState<TriageCase | null>(null);
  const [staffBP, setStaffBP] = useState("120/80");
  const [staffHR, setStaffHR] = useState("76");
  const [staffSpO2, setStaffSpO2] = useState("98");
  const [staffTemp, setStaffTemp] = useState("37.0");
  const [staffRR, setStaffRR] = useState("16");
  const [staffNotes, setStaffNotes] = useState("");
  const [staffDoctor, setStaffDoctor] = useState("Dr. Sarah Chen, MD");
  const [staffDept, setStaffDept] = useState("General Medicine");
  const [isSubmittingVitals, setIsSubmittingVitals] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, pRes] = await Promise.all([
        api.getCases(),
        api.getPatients(),
      ]);

      if (cRes.error || pRes.error) {
        setError(cRes.error || pRes.error || "Unable to load operational queue.");
      } else {
        setCases(cRes.data || []);
        setPatients(pRes.data?.items || []);
      }
    } catch {
      setError("An unexpected error occurred while loading operational data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenVitalsModal = (c: TriageCase) => {
    setSelectedCaseForVerification(c);
    setVerificationFeedback(null);
    // Pre-populate if already existing
    if (c.vitals) {
      try {
        const v = typeof c.vitals === "string" ? JSON.parse(c.vitals) : c.vitals;
        if (v.blood_pressure) setStaffBP(v.blood_pressure);
        if (v.heart_rate) setStaffHR(String(v.heart_rate));
        if (v.oxygen_saturation) setStaffSpO2(String(v.oxygen_saturation));
        if (v.temperature) setStaffTemp(String(v.temperature));
        if (v.respiratory_rate) setStaffRR(String(v.respiratory_rate));
      } catch {
        // default
      }
    }
  };

  const handleHandoffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForVerification) return;
    setIsSubmittingVitals(true);
    setVerificationFeedback(null);

    try {
      const vitalsPayload = {
        blood_pressure: staffBP,
        heart_rate: staffHR,
        oxygen_saturation: staffSpO2,
        temperature: staffTemp,
        respiratory_rate: staffRR,
      };

      const res = await api.verifyCaseIntake(selectedCaseForVerification.synthetic_case_id, {
        verified: true,
        vitals: vitalsPayload,
        staff_notes: staffNotes,
        route_to_doctor_name: staffDoctor,
        route_to_department: staffDept,
      });

      if (res.data) {
        setVerificationFeedback(
          `Case ${selectedCaseForVerification.synthetic_case_id} verified and routed to ${staffDoctor} (${staffDept}) successfully.`
        );
        setSelectedCaseForVerification(null);
        await loadData();
      } else {
        setVerificationFeedback(res.error || "Error recording vitals and routing case.");
      }
    } catch {
      setVerificationFeedback("Unexpected error during verification submit.");
    } finally {
      setIsSubmittingVitals(false);
    }
  };

  const awaitingVerificationCases = cases.filter(
    (c) => !c.intake_verified && ["awaiting_review", "in_review"].includes(c.status)
  );

  const readyForDoctorCases = cases.filter(
    (c) => c.status === "ready_for_doctor" || c.intake_verified
  );

  return (
    <DashboardShell
      title={`Staff Operations Center — ${user?.full_name || "Triage Officer"}`}
      description="Patient registration &bull; Intake verification &bull; Rapid vitals documentation &bull; Physician routing"
      refresh={() => void loadData()}
    >
      <DataState loading={loading} error={error} retry={() => void loadData()} />

      {!loading && !error && (
        <div className="space-y-6">
          {/* Header Context Banner */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Staff / Triage Nurse Environment
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Operational Intake Desk &bull; Frontline Triage
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {user?.full_name || "Nurse Sunita Patel, RN"}
                </h2>
                <p className="text-xs text-slate-500">
                  Government District Hospital &bull; Outpatient Registration &amp; Screening
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/intake"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Assisted Intake</span>
              </Link>
              <Link
                href="/patients"
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Patient Directory</span>
              </Link>
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat title="Total In Queue" value={cases.length} />
            <Stat title="Awaiting Vitals &amp; Verification" value={awaitingVerificationCases.length} />
            <Stat title="Ready for Physician Review" value={readyForDoctorCases.length} />
            <Stat title="Patients Registered" value={patients.length} />
          </div>

          {verificationFeedback && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between">
              <span>{verificationFeedback}</span>
              <button
                type="button"
                onClick={() => setVerificationFeedback(null)}
                className="text-emerald-600 hover:text-emerald-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Operational Queue Table */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Intake Verification &amp; Vitals Queue
                </h3>
                <p className="text-xs text-slate-500">
                  Verify patient identity, record preliminary vital signs, and assign to physician
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {cases.length} Active Cases
              </span>
            </div>

            {cases.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                No active patients waiting in the queue.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Case ID</th>
                      <th className="py-3 px-4">Triage Urgency</th>
                      <th className="py-3 px-4">Symptoms / Narrative</th>
                      <th className="py-3 px-4">Intake Status</th>
                      <th className="py-3 px-4">Assigned Doctor</th>
                      <th className="py-3 px-4 text-right">Operational Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {c.synthetic_case_id}
                          <span className="block font-sans font-normal text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <TriageBadge level={c.queue_category} />
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                          {c.raw_symptoms || "No symptoms text"}
                        </td>
                        <td className="py-3 px-4">
                          {c.intake_verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Vitals Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Awaiting Vitals</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {c.assigned_doctor_name || "Unassigned"}
                          {c.assigned_department && (
                            <span className="block text-[10px] text-slate-400">
                              {c.assigned_department}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenVitalsModal(c)}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold rounded-lg text-xs transition inline-flex items-center gap-1"
                          >
                            <Heart className="w-3.5 h-3.5 text-teal-600" />
                            <span>{c.intake_verified ? "Update Vitals" : "Record Vitals"}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Verification & Vitals Recording Modal */}
          {selectedCaseForVerification && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Staff Intake Verification
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      Case: {selectedCaseForVerification.synthetic_case_id}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCaseForVerification(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-500 block uppercase text-[10px]">
                    Patient Symptoms
                  </span>
                  <p className="font-mono text-slate-900">
                    "{selectedCaseForVerification.raw_symptoms}"
                  </p>
                </div>

                <form onSubmit={handleHandoffSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Record Rapid Vitals
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Blood Pressure</span>
                        <input
                          type="text"
                          required
                          value={staffBP}
                          onChange={(e) => setStaffBP(e.target.value)}
                          placeholder="120/80"
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Heart Rate (bpm)</span>
                        <input
                          type="text"
                          required
                          value={staffHR}
                          onChange={(e) => setStaffHR(e.target.value)}
                          placeholder="76"
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Oxygen SpO2 (%)</span>
                        <input
                          type="text"
                          required
                          value={staffSpO2}
                          onChange={(e) => setStaffSpO2(e.target.value)}
                          placeholder="98"
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Temperature (°C)</span>
                        <input
                          type="text"
                          required
                          value={staffTemp}
                          onChange={(e) => setStaffTemp(e.target.value)}
                          placeholder="37.0"
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-1">Resp Rate (/min)</span>
                        <input
                          type="text"
                          required
                          value={staffRR}
                          onChange={(e) => setStaffRR(e.target.value)}
                          placeholder="16"
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Staff Observations / Intake Notes
                    </label>
                    <textarea
                      rows={2}
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      placeholder="e.g. Patient ambulatory, alert, denies chest pain, verified identity against government ID..."
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Route to Doctor</label>
                      <select
                        value={staffDoctor}
                        onChange={(e) => setStaffDoctor(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="Dr. Sarah Chen, MD">Dr. Sarah Chen, MD</option>
                        <option value="Duty Medical Officer">Duty Medical Officer</option>
                        <option value="Casualty Specialist">Casualty Specialist</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Department</label>
                      <select
                        value={staffDept}
                        onChange={(e) => setStaffDept(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        <option value="General Medicine">General Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Casualty / Emergency">Casualty / Emergency</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Outpatient (OPD)">Outpatient (OPD)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCaseForVerification(null)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingVitals}
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isSubmittingVitals ? (
                        <span>Saving Vitals...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify &amp; Handoff to Doctor</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Quick Operational Links */}
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <Link
              href="/intake"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-400 transition shadow-xs flex items-center gap-3"
            >
              <div className="p-3 rounded-xl bg-teal-50 text-teal-700">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-sm">Assisted Intake Desk</span>
                <span className="text-slate-500 text-[11px]">Walk-in voice and text symptom capture</span>
              </div>
            </Link>

            <Link
              href="/patients"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-400 transition shadow-xs flex items-center gap-3"
            >
              <div className="p-3 rounded-xl bg-teal-50 text-teal-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-sm">Patient Registry</span>
                <span className="text-slate-500 text-[11px]">Search MRNs and verify demographics</span>
              </div>
            </Link>

            <Link
              href="/documents"
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-400 transition shadow-xs flex items-center gap-3"
            >
              <div className="p-3 rounded-xl bg-teal-50 text-teal-700">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-sm">Document Ingestion</span>
                <span className="text-slate-500 text-[11px]">Upload lab reports and discharge summaries</span>
              </div>
            </Link>
          </div>

          {/* Operational Safety Disclaimer */}
          <ClinicalDisclaimer />
        </div>
      )}
    </DashboardShell>
  );
}

export default function StaffDashboard() {
  return (
    <RoleGuard roles={["nurse"]}>
      <StaffDashboardContent />
    </RoleGuard>
  );
}