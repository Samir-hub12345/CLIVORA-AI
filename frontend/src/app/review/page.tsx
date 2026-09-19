"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { api } from "@/lib/api";
import { TriageCase, QueueCategory } from "@/types";
import { useConnectivity } from "@/lib/connectivity";
import { useAdaptivePolling } from "@/lib/use-adaptive-polling";
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Filter,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Sparkles,
  WifiOff,
  Stethoscope,
} from "lucide-react";

export default function ReviewQueuePage() {
  const { state: networkState, isLowBandwidthActive, pollingIntervalMs, pollingStatus } =
    useConnectivity();
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const loadCases = async () => {
    const cat = selectedCategory === "all" ? undefined : selectedCategory;
    const stat = selectedStatus === "all" ? undefined : selectedStatus;
    const res = await api.getCases(cat, stat);
    if (res.data) {
      setCases(res.data);
    }
  };

  // Adaptive background polling: 15s GOOD, 25s NORMAL, 50s SLOW, Stopped OFFLINE
  const { isRefreshing, refresh } = useAdaptivePolling(loadCases, {
    baseIntervalMs: 15000,
    enabled: true,
    immediate: true,
  });

  // Re-fetch when filters change
  useEffect(() => {
    loadCases();
  }, [selectedCategory, selectedStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const urgentCount = cases.filter((c) => c.queue_category === "urgent-review").length;
  const priorityCount = cases.filter((c) => c.queue_category === "priority").length;
  const routineCount = cases.filter((c) => c.queue_category === "routine").length;
  const awaitingCount = cases.filter((c) => c.status === "awaiting_review").length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Safety Disclaimer */}
        <ClinicalDisclaimer />

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Medical Officer / Reviewer Queue</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Clinical Triage Review Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Prioritized patient intake queue &bull; Human-in-the-loop review required before clinical handoff
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5"
              title="Adaptive background synchronization interval"
            >
              <Activity className={`w-3.5 h-3.5 ${networkState === "OFFLINE" ? "text-rose-500" : "text-teal-600"}`} />
              <span>
                Queue Sync: {pollingStatus} {pollingIntervalMs > 0 ? `(${pollingIntervalMs / 1000}s)` : "(Paused)"}
              </span>
            </span>

            <button
              onClick={() => refresh()}
              disabled={networkState === "OFFLINE" || isRefreshing}
              className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              title={networkState === "OFFLINE" ? "Refresh paused while offline" : "Manual queue refresh"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/intake"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>+ New Patient Intake</span>
            </Link>
          </div>
        </div>

        {/* Connectivity Alerts */}
        {networkState === "OFFLINE" ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>Offline: Queue updates are paused. Loaded cases remain accessible for review. Real-time updates will resume once connected.</span>
            </div>
            <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300">
              Offline Mode
            </span>
          </div>
        ) : isLowBandwidthActive ? (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between shadow-2xs">
            <span className="font-semibold">Adaptive Low-Bandwidth Mode active: polling frequencies reduced and payloads throttled.</span>
            <span className="text-[10px] bg-amber-200/80 font-bold px-1.5 py-0.5 rounded uppercase">Data Saver</span>
          </div>
        ) : null}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Waiting Review
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{awaitingCount}</span>
              <span className="text-xs text-amber-600 font-medium">Cases pending</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Urgent Review
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-900">{urgentCount}</span>
              <span className="text-xs text-rose-700 font-medium">Signals triggered</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Priority Review
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-900">{priorityCount}</span>
              <span className="text-xs text-amber-700 font-medium">Infectious / acute</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Routine Intake
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{routineCount}</span>
              <span className="text-xs text-slate-500 font-medium">Standard queue</span>
            </div>
          </div>
        </div>

        {/* Filters & Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-800">Queue Filter:</span>
              <div className="flex items-center gap-1">
                {["all", "urgent-review", "priority", "routine"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium text-xs focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="awaiting_review">Awaiting Review</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="referred">Referred</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {cases.length === 0 && isRefreshing ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              <span className="text-xs text-slate-500">
                {isLowBandwidthActive
                  ? "Loading essential queue data (Low Bandwidth)..."
                  : "Loading facility review queue..."}
              </span>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No cases found matching the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Case ID</th>
                    <th className="px-6 py-3">Priority / Category</th>
                    <th className="px-6 py-3">Patient Context</th>
                    <th className="px-6 py-3">Reported Symptoms</th>
                    <th className="px-6 py-3">Clinical Rules</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((c) => {
                    const isUrgent = c.queue_category === "urgent-review";
                    const isPriority = c.queue_category === "priority";
                    const caseKey = c.synthetic_case_id || c.id;

                    return (
                      <tr
                        key={caseKey}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isUrgent ? "bg-rose-50/30" : isPriority ? "bg-amber-50/20" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {caseKey}
                          <span className="block text-[10px] text-slate-400 font-normal font-sans">
                            {new Date(c.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight ${
                              isUrgent
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isPriority
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {isUrgent && <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
                            {isPriority && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            {c.queue_category.replace("-", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800">
                            {c.approximate_age ? `${c.approximate_age}y` : "Age N/A"} &bull; {c.gender || "N/A"}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {c.facility_type ? c.facility_type.replace("_", " ") : "Primary Care"}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="line-clamp-2 text-slate-600 text-[11px] leading-relaxed">
                            {c.raw_symptoms || c.normalized_symptoms || "Clinical symptom intake"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {c.risk_signals && c.risk_signals.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {c.risk_signals.map((r, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-100 text-red-700 font-bold"
                                >
                                  {r.rule_id}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No red flags</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.status === "referred"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/review/case/${caseKey}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>Open Case</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
