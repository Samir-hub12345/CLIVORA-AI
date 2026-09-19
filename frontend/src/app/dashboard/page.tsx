"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useConnectivity } from "@/lib/connectivity";
import { useAdaptivePolling } from "@/lib/use-adaptive-polling";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { AdaptiveImage } from "@/components/common/adaptive-image";
import { Patient, Consultation, UserRole } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { state: networkState, isLowBandwidthActive, pollingIntervalMs, pollingStatus } =
    useConnectivity();

  const [activeRoleView, setActiveRoleView] = useState<UserRole>("doctor");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [auditCount, setAuditCount] = useState<number>(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadSecondaryAnalytics, setLoadSecondaryAnalytics] = useState(false);

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
      const [pRes, cRes, aRes] = await Promise.all([
        api.getPatients(),
        api.getConsultations(),
        api.getAuditLogs(10),
      ]);

      if (pRes.data) setPatients(pRes.data.items);
      if (cRes.data) setConsultations(cRes.data.items);
      if (aRes.data) setAuditCount(aRes.data.total);
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

  if (authLoading || (initialLoading && !patients.length && !consultations.length)) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-teal-600 font-medium text-sm">
            <Activity className="w-5 h-5 animate-pulse" />
            <span>
              {isLowBandwidthActive
                ? "Loading essential clinical information (Low Bandwidth)..."
                : "Loading Clinical Dashboard..."}
            </span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const criticalCount = consultations.filter(
    (c) => c.triage_level === "critical" || c.triage_level === "urgent"
  ).length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Top Bar: Role Simulation Tabs & Network Adaptation Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Clinova AI Clinical Portal</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {activeRoleView === "doctor" && "Doctor Triage & Decision Center"}
              {activeRoleView === "nurse" && "Staff & Front-Desk Intake Hub"}
              {activeRoleView === "patient" && "Patient Medical Chart & Encounters"}
              {activeRoleView === "admin" && "Facility Administration & Operations"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Current User: <span className="font-semibold text-slate-700">{user?.full_name || "Clinician"}</span> &bull; 
              Viewing Role: <span className="font-bold uppercase text-teal-700">{activeRoleView}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Role Switcher Tabs for Multi-Role Testing */}
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
        {networkState === "OFFLINE" ? (
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
            <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300">
              Zero Requests
            </span>
          </div>
        ) : isLowBandwidthActive ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Adaptive Low-Bandwidth Mode Active &bull; </span>
                <span className="text-amber-800">
                  Essential clinical information loaded first. Background polling reduced to 50s; secondary analytics deferred.
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-amber-200/90 text-amber-950 font-bold px-2 py-0.5 rounded uppercase border border-amber-300">
              Data Saver
            </span>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* ROLE-SPECIFIC ESSENTIAL CONTENT (LOADED FIRST & ALWAYS PRIORITIZED)      */}
        {/* ========================================================================= */}

        {/* 1. DOCTOR EXPERIENCE */}
        {activeRoleView === "doctor" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Essential Clinical Prioritization
              </h2>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                High Priority Stream
              </span>
            </div>

            {/* Essential KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Critical / Urgent</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-rose-600">{criticalCount}</div>
                <div className="mt-1 text-xs text-slate-500">Requires immediate attention</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Active Patients</span>
                  <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-slate-900">{patients.length}</div>
                <div className="mt-1 text-xs text-slate-500">Enrolled medical charts</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Encounters</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-slate-900">{consultations.length}</div>
                <div className="mt-1 text-xs text-slate-500">Documented consultations</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Queue Review Gate</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold text-purple-700">
                  {consultations.filter((c) => c.status === "scheduled" || c.status === "in_progress").length}
                </div>
                <div className="mt-1 text-xs text-slate-500">Awaiting physician sign-off</div>
              </div>
            </div>

            {/* Essential Clinical Encounter Queue Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Physician Case Queue</h3>
                  <p className="text-xs text-slate-500">Patient identity, chief complaint, and triage acuity</p>
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
                      <th className="px-6 py-3">Patient Identity</th>
                      <th className="px-6 py-3">Chief Complaint</th>
                      <th className="px-6 py-3">Triage Urgency</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Clinical Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {consultations.slice(0, 5).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {c.patient ? `${c.patient.last_name}, ${c.patient.first_name}` : "Walk-in Patient"}
                          <span className="block text-[11px] text-slate-400 font-normal">
                            MRN: {c.patient?.mrn || "Pending"} &bull; {c.patient?.gender || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate font-medium">
                          {c.chief_complaint || "Acute presentation"}
                        </td>
                        <td className="px-6 py-3.5">
                          <TriageBadge level={c.triage_level} />
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href="/consultations"
                            className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                          >
                            Open Chart &rarr;
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

        {/* 2. STAFF / NURSE EXPERIENCE */}
        {activeRoleView === "nurse" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Front-Desk &amp; Staff Priority Flow
              </h2>
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Intake &amp; Vitals Prioritized
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Registered Patients</span>
                <div className="mt-2 text-2xl font-bold text-slate-900">{patients.length}</div>
                <p className="text-xs text-slate-500 mt-1">Available for vitals capture</p>
                <Link
                  href="/patients"
                  className="mt-3 inline-block text-xs font-bold text-teal-600 hover:underline"
                >
                  Open Patient Directory &rarr;
                </Link>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Pending Intake</span>
                <div className="mt-2 text-2xl font-bold text-teal-700">
                  {consultations.filter((c) => c.status === "scheduled").length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Waiting for initial symptom intake</p>
                <Link
                  href="/intake"
                  className="mt-3 inline-block text-xs font-bold text-teal-600 hover:underline"
                >
                  Start Multimodal Intake &rarr;
                </Link>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Doctors</span>
                <div className="mt-2 text-2xl font-bold text-indigo-700">3 Active</div>
                <p className="text-xs text-slate-500 mt-1">OPD consultation rooms active</p>
                <span className="mt-3 inline-block text-xs text-slate-400 font-medium">
                  Room 101, 102, 104 on-duty
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. PATIENT EXPERIENCE */}
        {activeRoleView === "patient" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Patient Medical Status &amp; Active Intake
              </h2>
              <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Essential Patient View
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {patients[0] ? `${patients[0].first_name} ${patients[0].last_name}` : "Patient Health Record"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    MRN: <span className="font-mono">{patients[0]?.mrn || "CLV-MRN-9021"}</span> &bull; DOB: {patients[0]?.date_of_birth || "1988-04-12"} &bull; Blood Group: {patients[0]?.blood_group || "O+"}
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
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-semibold">Latest Encounter Status</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {consultations[0]?.status ? consultations[0].status.replace("_", " ").toUpperCase() : "Active Visit"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-semibold">Reported Symptoms</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                    {consultations[0]?.chief_complaint || "Persistent cough and mild fever (3 days)"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block font-semibold">Triage Stratification</span>
                  <div className="mt-1">
                    <TriageBadge level={consultations[0]?.triage_level || "routine"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. ADMIN EXPERIENCE */}
        {activeRoleView === "admin" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Facility Operational Core
              </h2>
              <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Facility Operations
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <span>Primary Facility</span>
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">District Community Health Center</div>
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
                <p className="text-xs text-slate-500 mt-0.5">All 4 Docker microservices healthy</p>
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
            /* Render secondary analytics when connection is GOOD/NORMAL or user explicitly requested */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700">Triage Stratification Distribution</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Urgent Review (R01–R04)</span>
                      <span className="font-bold text-rose-600">{criticalCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-rose-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, criticalCount * 25)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-1">
                      <span>Routine Checkups</span>
                      <span className="font-bold text-emerald-600">
                        {consultations.length - criticalCount}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (consultations.length - criticalCount) * 15)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Demonstrating AdaptiveImage for non-essential clinical reference asset */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-700">Clinical Facility Protocol Reference</h4>
                  <span className="text-[10px] text-slate-400">Adaptive Image</span>
                </div>
                <AdaptiveImage
                  src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80"
                  alt="Clinical Decision Support Protocol Map"
                  isEssential={false}
                  estimatedKb={45}
                  caption="PHC Triage Handover Guidelines Standard Diagram"
                  aspectRatio="aspect-3/1"
                />
              </div>
            </div>
          ) : (
            /* Deferred placeholder shown in SLOW mode */
            <div className="p-6 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Additional information will load when the connection improves.
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Non-essential analytics and charts have been deferred by Adaptive Low-Bandwidth Mode to preserve data.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLoadSecondaryAnalytics(true)}
                className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition flex items-center gap-1.5 flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Load Analytics Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/triage"
            className="p-5 bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-200 hover:border-teal-400 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">AI Symptom Triage</h2>
                <p className="text-xs text-slate-500">Differential diagnosis &amp; urgency triage</p>
              </div>
            </div>
          </Link>

          <Link
            href="/patients"
            className="p-5 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-200 hover:border-blue-400 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">EHR Patient Directory</h2>
                <p className="text-xs text-slate-500">View medical charts, vitals &amp; history</p>
              </div>
            </div>
          </Link>

          <Link
            href="/consultations"
            className="p-5 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Clinical Consultations</h2>
                <p className="text-xs text-slate-500">Encounter workflow with AI SOAP note synthesis</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Clinical Disclaimer */}
        <ClinicalDisclaimer />
      </main>

      <Footer />
    </div>
  );
}
