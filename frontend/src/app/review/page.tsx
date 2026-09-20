"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { api } from "@/lib/api";
import { TriageCase, QueueCategory } from "@/types";
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
} from "lucide-react";

export default function ReviewQueuePage() {
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    const cat = selectedCategory === "all" ? undefined : selectedCategory;
    const stat = selectedStatus === "all" ? undefined : selectedStatus;
    const res = await api.getCases(cat, stat);
    if (res.data) {
      setCases(res.data);
    } else {
      setError(res.error || "Unable to load data. Please retry.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCases();
  }, [selectedCategory, selectedStatus]);

  const urgentCount = cases.filter((c) => c.queue_category === "urgent-review").length;
  const priorityCount = cases.filter((c) => c.queue_category === "priority").length;
  const routineCount = cases.filter((c) => c.queue_category === "routine").length;
  const awaitingCount = cases.filter((c) => c.status === "awaiting_review").length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        {error && <div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700">{error} <button onClick={loadCases} className="underline ml-2">Retry</button></div>}
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
            <button
              onClick={loadCases}
              className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
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
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
              <span className="text-xs text-slate-500">Loading facility review queue...</span>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No cases found in this filter</p>
              <p className="text-xs text-slate-500">
                All triage cases in this category have been evaluated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-4">Patient / Context</th>
                    <th className="py-3 px-4">Facility / Visit</th>
                    <th className="py-3 px-4">Wait Time</th>
                    <th className="py-3 px-4">Queue Urgency</th>
                    <th className="py-3 px-4">Review Signals</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cases.map((c) => {
                    const isUrgent = c.queue_category === "urgent-review";
                    const isPriority = c.queue_category === "priority";
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isUrgent ? "bg-rose-50/20" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {c.synthetic_case_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {c.approximate_age ? `${c.approximate_age}yo` : "Adult"} &bull; {c.gender || "Patient"}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {c.raw_symptoms}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800 block">{c.facility_type}</span>
                          <span className="text-[11px] text-slate-500">{c.visit_type}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {c.waiting_minutes || 0}m
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                              isUrgent
                                ? "bg-rose-100 text-rose-900 border border-rose-200"
                                : isPriority
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-teal-50 text-teal-800 border border-teal-200"
                            }`}
                          >
                            {c.queue_category.replace("-", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.risk_signals && c.risk_signals.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {c.risk_signals.map((sig, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                  title={sig.signal}
                                >
                                  {sig.rule_id}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No signals</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 capitalize">
                          <span className="font-semibold text-slate-700">
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/review/case/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-teal-500 text-slate-700 hover:text-teal-700 rounded-lg font-semibold text-xs shadow-2xs transition-all"
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