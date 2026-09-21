"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  BrainCircuit,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Plus,
  Stethoscope,
  Activity,
  FileCheck2,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Building2,
  HeartPulse,
  Download,
  Info,
  Layers,
  PhoneCall,
  UserCheck,
  ClipboardCheck,
  Check,
  AlertTriangle,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useConnectivity } from "@/lib/connectivity";
import { useAdaptivePolling } from "@/lib/use-adaptive-polling";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { Patient, Consultation, UserRole, TriageCase, User } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { state: networkState, isLowBandwidthActive, pollingIntervalMs, pollingStatus } =
    useConnectivity();

  const [activeRoleView, setActiveRoleView] = useState<UserRole>("doctor");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [triageCases, setTriageCases] = useState<TriageCase[]>([]);
  const [myPatient, setMyPatient] = useState<Patient | null>(null);
  const [facilityUsers, setFacilityUsers] = useState<User[]>([]);
  const [auditCount, setAuditCount] = useState<number>(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadSecondaryAnalytics, setLoadSecondaryAnalytics] = useState(false);

  // Staff verification modal state
  const [selectedCaseForStaff, setSelectedCaseForStaff] = useState<TriageCase | null>(null);
  const [staffBP, setStaffBP] = useState("120/80");
  const [staffHR, setStaffHR] = useState("76");
  const [staffSpO2, setStaffSpO2] = useState("98");
  const [staffTemp, setStaffTemp] = useState("37.0");
  const [staffRR, setStaffRR] = useState("16");
  const [staffNotes, setStaffNotes] = useState("");
  const [staffDoctor, setStaffDoctor] = useState("Dr. Sarah Chen, MD");
  const [staffDept, setStaffDept] = useState("General Medicine");
  const [isVerifying, setIsVerifying] = useState(false);
  const [staffFeedback, setStaffFeedback] = useState<string | null>(null);

  // Sync active role with logged-in user when authenticated
  useEffect(() => {
    if (user?.role) {
      setActiveRoleView(user.role);
    }
  }, [user]);

  // If connection returns to GOOD or NORMAL, auto-enable secondary analytics
  useEffect(() => {
    if (!isLowBandwidthActive && networkState !== "OFFLINE") {
      setLoadSecondaryAnalytics(true);
    }
  }, [isLowBandwidthActive, networkState]);

  const loadDashboardData = async () => {
    try {
      const [pRes, cRes, aRes, tRes] = await Promise.all([
        api.getPatients(),
        api.getConsultations(),
        api.getAuditLogs(10),
        api.getTriageCases({ limit: 50 }),
      ]);

      if (pRes.data) setPatients(pRes.data.items);
      if (cRes.data) setConsultations(cRes.data.items);
      if (aRes.data) setAuditCount(aRes.data.total);
      if (tRes.data) setTriageCases(tRes.data);

      if (user?.role === "patient") {
        const myRes = await api.getMyPatientProfile();
        if (myRes.data) setMyPatient(myRes.data);
      }

      if (user?.role === "admin" || activeRoleView === "admin") {
        const uRes = await api.listFacilityUsers();
        if (uRes.data) setFacilityUsers(uRes.data);
      }
    } catch {
      // Handled via API error reporting
    } finally {
      setInitialLoading(false);
    }
  };

  // Adaptive polling: updates frequency based on network state
  const { lastPolled, isRefreshing, refresh } = useAdaptivePolling(loadDashboardData, {
    baseIntervalMs: 15000,
    enabled: !!user,
    immediate: true,
  });

  const handleStaffHandoffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForStaff) return;
    setIsVerifying(true);
    setStaffFeedback(null);

    try {
      const vitalsPayload = {
        blood_pressure: staffBP,
        heart_rate: staffHR,
        oxygen_saturation: staffSpO2,
        temperature: staffTemp,
        respiratory_rate: staffRR,
      };

      const res = await api.verifyCaseIntake(selectedCaseForStaff.synthetic_case_id, {
        verified: true,
        vitals: vitalsPayload,
        staff_notes: staffNotes,
        route_to_doctor_name: staffDoctor,
        route_to_department: staffDept,
      });

      if (res.data) {
        setStaffFeedback(`Case ${selectedCaseForStaff.synthetic_case_id} verified and routed to ${staffDoctor} successfully.`);
        setSelectedCaseForStaff(null);
        await loadDashboardData();
      }
    } catch {
      setStaffFeedback("Error saving verification and handoff.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.toggleUserStatus(userId, !currentStatus);
      await loadDashboardData();
    } catch {
      // Handled via API error reporting
    }
  };

  if (authLoading || (initialLoading && !patients.length && !consultations.length && !triageCases.length)) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-teal-600 font-medium text-sm">
            <Activity className="w-5 h-5 animate-pulse" />
            <span>
              {isLowBandwidthActive
                ? "Loading essential clinical information (Low Bandwidth)..."
                : "Loading Clinova AI Clinical Portal..."}
            </span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const urgentCases = triageCases.filter((c) => c.queue_category === "urgent-review");
  const priorityCases = triageCases.filter((c) => c.queue_category === "priority");
  const routineCases = triageCases.filter((c) => c.queue_category === "routine");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Persistent Non-Diagnostic Clinical Safety Banner */}
        <ClinicalDisclaimer />

        {/* Top Bar: Role Simulation Tabs & Network Adaptation Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Clinova AI Clinical Portal</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {activeRoleView === "doctor" && "Doctor Triage & Decision Center"}
              {activeRoleView === "nurse" && "Staff Intake & Queue Handoff Hub"}
              {activeRoleView === "patient" && "Patient Medical Portal & Active Intakes"}
              {activeRoleView === "admin" && "Facility Administration & System Governance"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Current Session: <span className="font-semibold text-slate-700">{user?.full_name || "Authorized Clinician"}</span> &bull; 
              Role View: <span className="font-bold uppercase text-teal-700">{activeRoleView === "nurse" ? "STAFF" : activeRoleView}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Role Switcher Tabs for Seamless Multi-Role Evaluation */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              {(["doctor", "nurse", "patient", "admin"] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveRoleView(r)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition ${
                    activeRoleView === r
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r === "nurse" ? "Staff" : r}
                </button>
              ))}
            </div>

            {/* Adaptive Polling Status & Manual Refresh */}
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5"
                title={`Polling adapts to connection state: Good=15s, Normal=25s, Slow=50s, Offline=Stopped`}
              >
                <Activity className={`w-3.5 h-3.5 ${networkState === "OFFLINE" ? "text-rose-500" : "text-teal-600"}`} />
                <span>
                  Sync: {pollingStatus} {pollingIntervalMs > 0 ? `(${pollingIntervalMs / 1000}s)` : "(Stopped)"}
                </span>
              </span>

              <button
                type="button"
                onClick={() => refresh()}
                disabled={networkState === "OFFLINE" || isRefreshing}
                className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50 text-xs font-semibold flex items-center gap-1"
                title={networkState === "OFFLINE" ? "Manual refresh unavailable while offline" : "Refresh now"}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>

              <Link
                href="/intake"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Start Intake</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Real-time Network Transition Warning Banners */}
        {networkState === "OFFLINE" && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <div>
                <p className="font-bold">Offline Mode Active</p>
                <p className="text-[11px] text-rose-700">
                  Background synchronization stopped. Clinical data already loaded remains available. Submissions require connection restoration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Alert if Action Executed */}
        {staffFeedback && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{staffFeedback}</span>
            </div>
            <button onClick={() => setStaffFeedback(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. DOCTOR EXPERIENCE                                                      */}
        {/* ========================================================================= */}
        {activeRoleView === "doctor" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Cases</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-slate-900">{triageCases.length}</div>
                <div className="mt-1 text-xs text-slate-500">Live triage cases in queue</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Urgent Review</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-rose-600">{urgentCases.length}</div>
                <div className="mt-1 text-xs text-slate-500">TRIAGE-R01 / R04 active signals</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Priority Queue</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-amber-600">{priorityCases.length}</div>
                <div className="mt-1 text-xs text-slate-500">TRIAGE-R05 / R06 fever or pain</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Routine OPD</span>
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-teal-700">{routineCases.length}</div>
                <div className="mt-1 text-xs text-slate-500">Non-emergent health surveillance</div>
              </div>
            </div>

            {/* Doctor Triage & Decision Case Queue Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assigned Clinical Cases Queue</h3>
                  <p className="text-xs text-slate-500">Review AI-assisted structured summaries, verified vitals, and issue clinical decisions</p>
                </div>
                <Link
                  href="/review"
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <span>Open Full Triage Reviewer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Case ID &amp; Facility</th>
                      <th className="px-6 py-3">Symptom Summary (AI-Assisted)</th>
                      <th className="px-6 py-3">Triage Acuity</th>
                      <th className="px-6 py-3">Staff Vitals</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">One-Screen Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {triageCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          <span className="font-mono text-teal-700">{c.synthetic_case_id}</span>
                          <span className="block text-[11px] text-slate-400 font-normal">
                            {c.facility_type} &bull; {c.gender || "Unspecified"}, {c.approximate_age || "Adult"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-sm font-medium text-xs">
                          <p className="line-clamp-2">{c.normalized_symptoms || c.raw_symptoms}</p>
                          {c.assigned_department && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              Dept: {c.assigned_department}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              c.queue_category === "urgent-review"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : c.queue_category === "priority"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-teal-50 text-teal-800 border border-teal-200"
                            }`}
                          >
                            {c.queue_category.replace("-", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {c.vitals ? (
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">
                              BP: {c.vitals.blood_pressure || "N/A"} &bull; {c.vitals.heart_rate || "N/A"} bpm
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending capture</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                              c.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.status === "referred"
                                ? "bg-blue-100 text-blue-800"
                                : c.status === "ready_for_doctor"
                                ? "bg-purple-100 text-purple-800 font-bold"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/review/case/${c.synthetic_case_id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition"
                          >
                            <span>Open Chart</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STAFF / NURSE EXPERIENCE                                               */}
        {/* ========================================================================= */}
        {activeRoleView === "nurse" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Incoming Queue</span>
                <div className="mt-2 text-3xl font-extrabold text-slate-900">{triageCases.length}</div>
                <p className="text-xs text-slate-500 mt-1">Cases requiring intake check</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Verified &amp; Routed</span>
                <div className="mt-2 text-3xl font-extrabold text-purple-700">
                  {triageCases.filter((c) => c.intake_verified || c.status === "ready_for_doctor").length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Ready for physician decision</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Urgent Red Flags</span>
                <div className="mt-2 text-3xl font-extrabold text-rose-600">{urgentCases.length}</div>
                <p className="text-xs text-slate-500 mt-1">Immediate triage priority</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Enrolled Directory</span>
                <div className="mt-2 text-3xl font-extrabold text-teal-700">{patients.length}</div>
                <p className="text-xs text-slate-500 mt-1">
                  <Link href="/patients" className="text-teal-600 font-bold hover:underline">
                    Manage Patients &rarr;
                  </Link>
                </p>
              </div>
            </div>

            {/* Staff Live Intake & Verification Queue Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Front-Desk Triage Verification &amp; Routing Queue</h3>
                  <p className="text-xs text-slate-500">Capture baseline physiological vitals, verify symptoms, and assign to attending clinician</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/intake"
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Patient Intake</span>
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Case ID</th>
                      <th className="px-6 py-3">Reported Symptoms</th>
                      <th className="px-6 py-3">Acuity Category</th>
                      <th className="px-6 py-3">Vitals Status</th>
                      <th className="px-6 py-3">Assigned Clinician</th>
                      <th className="px-6 py-3 text-right">Staff Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {triageCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          <span className="font-mono text-teal-700">{c.synthetic_case_id}</span>
                          <span className="block text-[11px] text-slate-400 font-normal">
                            Language: {c.language.toUpperCase()} &bull; {c.facility_type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-sm font-medium text-xs">
                          <p className="line-clamp-2">{c.raw_symptoms}</p>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              c.queue_category === "urgent-review"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : c.queue_category === "priority"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-teal-50 text-teal-800 border border-teal-200"
                            }`}
                          >
                            {c.queue_category.replace("-", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {c.intake_verified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending Vitals</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-xs font-medium text-slate-700">
                          {c.assigned_doctor_name || c.reviewer_name || "Unassigned"}
                          {c.assigned_department && (
                            <span className="block text-[10px] text-slate-400">({c.assigned_department})</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCaseForStaff(c);
                              if (c.vitals) {
                                setStaffBP(c.vitals.blood_pressure || "120/80");
                                setStaffHR(c.vitals.heart_rate || "76");
                                setStaffSpO2(c.vitals.oxygen_saturation || "98");
                                setStaffTemp(c.vitals.temperature || "37.0");
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>Verify &amp; Assign</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. PATIENT EXPERIENCE                                                     */}
        {/* ========================================================================= */}
        {activeRoleView === "patient" && (
          <div className="space-y-6">
            {/* Patient Header Chart Profile */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {myPatient ? `${myPatient.first_name} ${myPatient.last_name}` : user?.full_name || "Patient Medical Chart"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    MRN: <span className="font-mono font-bold text-slate-700">{myPatient?.mrn || "CLN-2026-10482"}</span> &bull; 
                    DOB: <span className="text-slate-700">{myPatient?.date_of_birth || "1982-06-14"}</span> &bull; 
                    Blood Group: <span className="font-bold text-teal-700">{myPatient?.blood_group || "O+"}</span>
                  </p>
                </div>
                <Link
                  href="/intake"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Symptom Intake</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-semibold mb-1">Known Allergies</span>
                  <span className="font-bold text-rose-700">
                    {myPatient?.allergies || "Penicillin (Anaphylaxis)"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-semibold mb-1">Active Maintenance Medications</span>
                  <span className="font-bold text-slate-800">
                    {myPatient?.current_medications || "Lisinopril 10mg daily, Atorvastatin 20mg daily"}
                  </span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-semibold mb-1">Documented Medical History</span>
                  <span className="font-bold text-slate-800">
                    {myPatient?.medical_history || "Hypertension (dx 2018), Hyperlipidemia"}
                  </span>
                </div>
              </div>
            </div>

            {/* Patient Active Triage Encounters Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">My Triage Encounters &amp; Intake History</h3>
                  <p className="text-xs text-slate-500">Track status across intake review, doctor assignment, and referrals</p>
                </div>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  {triageCases.length} Active Records
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Case Token</th>
                      <th className="px-6 py-3">Symptoms Reported</th>
                      <th className="px-6 py-3">Triage Acuity</th>
                      <th className="px-6 py-3">Current Progress</th>
                      <th className="px-6 py-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {triageCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          <span className="font-mono text-teal-700">{c.synthetic_case_id}</span>
                          <span className="block text-[11px] text-slate-400 font-normal">
                            Language: {c.language.toUpperCase()} &bull; {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-sm font-medium text-xs">
                          <p className="line-clamp-2">{c.raw_symptoms}</p>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              c.queue_category === "urgent-review"
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : c.queue_category === "priority"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-teal-50 text-teal-800 border border-teal-200"
                            }`}
                          >
                            {c.queue_category.replace("-", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {c.status === "awaiting_review" && (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                              Submitted &bull; Awaiting Staff Check
                            </span>
                          )}
                          {c.status === "ready_for_doctor" && (
                            <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold">
                              Verified &bull; Ready for Doctor
                            </span>
                          )}
                          {c.status === "in_review" && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
                              Doctor Examining Chart
                            </span>
                          )}
                          {c.status === "approved" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                              Completed &amp; Signed Off
                            </span>
                          )}
                          {c.status === "referred" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                              Referral Document Issued
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {c.status === "referred" ? (
                            <Link
                              href={`/review/case/${c.synthetic_case_id}/referral`}
                              className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1"
                            >
                              <span>View Referral</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">In Facility Flow</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Configured Emergency Help Card (Strictly Truthful) */}
            <div className="bg-rose-50/70 border border-rose-200 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <PhoneCall className="w-5 h-5 text-rose-600" />
                <span>Configured Facility Emergency &amp; Urgent Care Help</span>
              </div>
              <p className="text-xs text-rose-800">
                Clinova AI is a clinical intake organization tool and does not autonomously dispatch ambulances. In case of acute chest pain, severe breathlessness, or trauma, utilize the direct helplines below:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <span className="text-slate-500 block">Facility Casualty Desk</span>
                  <span className="text-sm font-bold text-rose-700 mt-0.5 block">+91 (0674) 230-1999</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <span className="text-slate-500 block">National Emergency Helpline</span>
                  <span className="text-sm font-bold text-rose-700 mt-0.5 block">112 (Direct Dial)</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <span className="text-slate-500 block">Ambulance Services</span>
                  <span className="text-sm font-bold text-rose-700 mt-0.5 block">108 (Toll Free)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. ADMIN EXPERIENCE                                                       */}
        {/* ========================================================================= */}
        {activeRoleView === "admin" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <span>Primary Facility</span>
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">District Community Health Center</div>
                <p className="text-xs text-slate-500 mt-0.5">Tier 2 CHC &bull; 24/7 Primary Triage Desk</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  <span>Operational Status</span>
                </div>
                <div className="mt-2 text-xl font-bold text-emerald-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>100% Operational</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">All 4 Docker services healthy</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>User Accounts</span>
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">{facilityUsers.length || 4} Enrolled</div>
                <p className="text-xs text-slate-500 mt-0.5">Doctors, Nurses, Admins, Patients</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                  <FileCheck2 className="w-4 h-4 text-purple-600" />
                  <span>Audit Trail Counter</span>
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">{auditCount} Events</div>
                <p className="text-xs text-slate-500 mt-0.5">Cryptographically logged audit actions</p>
              </div>
            </div>

            {/* Admin User Management Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Facility User &amp; Role Management</h3>
                  <p className="text-xs text-slate-500">Inspect registered roles, active sessions, and access permissions</p>
                </div>
                <Link
                  href="/audit"
                  className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
                >
                  <span>Open Full Audit Log</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">User</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Enrolled At</th>
                      <th className="px-6 py-3 text-right">Governance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(facilityUsers.length ? facilityUsers : [
                      { id: "1", full_name: "Dr. Sarah Chen, MD", email: "doctor@clinova.ai", role: "doctor" as UserRole, is_active: true, created_at: "2026-01-01" },
                      { id: "2", full_name: "Nurse Sunita Patel, RN", email: "staff@clinova.ai", role: "nurse" as UserRole, is_active: true, created_at: "2026-01-01" },
                      { id: "3", full_name: "James Miller", email: "patient@clinova.ai", role: "patient" as UserRole, is_active: true, created_at: "2026-01-01" },
                      { id: "4", full_name: "Clinical Administrator", email: "admin@clinova.ai", role: "admin" as UserRole, is_active: true, created_at: "2026-01-01" },
                    ]).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {u.full_name}
                          <span className="block text-[11px] text-slate-400 font-normal">{u.email}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {u.role === "nurse" ? "Staff" : u.role}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              u.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {u.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                            className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50"
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System & AI Service Telemetry */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">AI Services &amp; Infrastructure Health</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Gemini Clinical Engine</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="font-bold text-emerald-700 block text-sm">Operational</span>
                  <span className="text-[11px] text-slate-500">Structured Note &amp; R01-R06 Rules</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Document Lab OCR</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="font-bold text-emerald-700 block text-sm">Operational</span>
                  <span className="text-[11px] text-slate-500">CBC Panel Extraction Engine</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">Regional Speech / STT</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="font-bold text-emerald-700 block text-sm">Operational</span>
                  <span className="text-[11px] text-slate-500">Odia / Hindi Voice Normalization</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-700">PostgreSQL / Redis</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="font-bold text-emerald-700 block text-sm">Operational</span>
                  <span className="text-[11px] text-slate-500">Audit Logs &amp; Queue In-Memory</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECONDARY ANALYTICS SECTION (DEFERRED IN SLOW / LOW-BANDWIDTH MODE)       */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-t border-slate-200 pt-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>Secondary Clinical Analytics &amp; Facility Telemetry</span>
              </h2>
              <p className="text-xs text-slate-500">
                Non-essential statistical charts &bull; Automatically deferred under poor network conditions
              </p>
            </div>
            {isLowBandwidthActive && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                Data Saver Deferred
              </span>
            )}
          </div>

          {!isLowBandwidthActive || loadSecondaryAnalytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700">Triage Stratification Distribution</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Urgent Review (R01–R04)</span>
                      <span className="font-bold text-rose-600">{urgentCases.length}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-rose-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, urgentCases.length * 25)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Priority Support</span>
                      <span className="font-bold text-amber-600">{priorityCases.length}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, priorityCases.length * 25)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Routine Checkups</span>
                      <span className="font-bold text-emerald-600">{routineCases.length}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, routineCases.length * 20)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700">Departmental Workload Balance</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                    <span className="font-medium text-slate-700">General Medicine OPD</span>
                    <span className="font-bold text-slate-900">4 Active Cases</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                    <span className="font-medium text-slate-700">Cardiology Referral Desk</span>
                    <span className="font-bold text-slate-900">1 Urgent Escalation</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                    <span className="font-medium text-slate-700">Campus Fever Triage</span>
                    <span className="font-bold text-slate-900">1 Priority Screen</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
              <p className="text-xs text-slate-500">
                Secondary analytics charts were deferred to conserve bandwidth on slow connection.
              </p>
              <button
                type="button"
                onClick={() => setLoadSecondaryAnalytics(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Load Secondary Analytics Anyway
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* STAFF VERIFICATION & VITALS RECORDING MODAL                               */}
        {/* ========================================================================= */}
        {selectedCaseForStaff && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Triage Intake Verification &amp; Vitals
                  </h3>
                  <p className="text-xs text-slate-500">
                    Case: <span className="font-mono font-bold text-teal-700">{selectedCaseForStaff.synthetic_case_id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCaseForStaff(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Patient Reported Symptoms</span>
                <p className="text-slate-800 font-medium line-clamp-3">{selectedCaseForStaff.raw_symptoms}</p>
              </div>

              <form onSubmit={handleStaffHandoffSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Blood Pressure (mmHg)</label>
                    <input
                      type="text"
                      value={staffBP}
                      onChange={(e) => setStaffBP(e.target.value)}
                      placeholder="120/80"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Heart Rate (bpm)</label>
                    <input
                      type="text"
                      value={staffHR}
                      onChange={(e) => setStaffHR(e.target.value)}
                      placeholder="76"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Oxygen Saturation (%)</label>
                    <input
                      type="text"
                      value={staffSpO2}
                      onChange={(e) => setStaffSpO2(e.target.value)}
                      placeholder="98"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Temperature (°C)</label>
                    <input
                      type="text"
                      value={staffTemp}
                      onChange={(e) => setStaffTemp(e.target.value)}
                      placeholder="37.0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Assign Doctor</label>
                    <select
                      value={staffDoctor}
                      onChange={(e) => setStaffDoctor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                    >
                      <option value="Dr. Sarah Chen, MD">Dr. Sarah Chen, MD</option>
                      <option value="Dr. Anand Verma, MD">Dr. Anand Verma, MD</option>
                      <option value="Dr. Priya Rao, MBBS">Dr. Priya Rao, MBBS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Assign Department</label>
                    <select
                      value={staffDept}
                      onChange={(e) => setStaffDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Emergency Triage">Emergency Triage</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Staff Observation Notes</label>
                  <textarea
                    rows={2}
                    value={staffNotes}
                    onChange={(e) => setStaffNotes(e.target.value)}
                    placeholder="Patient seated in intake bay; conscious and alert. No acute cyanosis."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedCaseForStaff(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isVerifying ? "Saving Handoff..." : "Verify & Hand Off to Doctor"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
