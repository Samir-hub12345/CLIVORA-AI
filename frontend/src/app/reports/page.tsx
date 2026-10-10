"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BarChart3, Download, TrendingDown, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function ReportsPage() {
  const { exportPdfReport } = useClinova();
  const [period, setPeriod] = useState<"7d" | "4w">("7d");

  const data = {
    "7d": {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      prepTimes: [11.8, 10.9, 10.2, 9.6, 9.9, 8.7, 9.1],
      kpis: [
        { label: "Average documentation preparation time", val: "9.9 min", delta: "−1.6 min vs prior", tone: "positive" },
        { label: "Notes awaiting review", val: "6", delta: "Right now", tone: "neutral" },
        { label: "Documentation completion rate", val: "94%", delta: "Required fields complete", tone: "positive" },
        { label: "Follow-ups completed", val: "41 / 46", delta: "89% adherence", tone: "positive" },
      ],
    },
    "4w": {
      labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4"],
      prepTimes: [13.4, 12.1, 11.0, 9.9],
      kpis: [
        { label: "Average documentation preparation time", val: "11.2 min", delta: "−2.1 min trend", tone: "positive" },
        { label: "Notes awaiting review", val: "6", delta: "Right now", tone: "neutral" },
        { label: "Documentation completion rate", val: "91%", delta: "Required fields complete", tone: "positive" },
        { label: "Follow-ups completed", val: "168 / 184", delta: "91% adherence", tone: "positive" },
      ],
    },
  }[period];

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Reports & Analytics</h1>
            <span className="demo-ribbon">Clinic Operational KPIs</span>
          </div>
          <p>Clinical quality indicators, physician documentation time, and patient follow-up adherence.</p>
        </div>
        <div className="row gap-2">
          <button className="btn btn-primary" onClick={() => exportPdfReport("CLINIC-SUMMARY-2026")}>
            <Download style={{ width: 16, height: 16 }} />
            <span>Export quality report (PDF)</span>
          </button>
        </div>
      </header>

      {/* Period Selector */}
      <div style={{ marginBottom: 16 }}>
        <div className="segmented">
          <button aria-pressed={period === "7d"} onClick={() => setPeriod("7d")}>
            Last 7 Days
          </button>
          <button aria-pressed={period === "4w"} onClick={() => setPeriod("4w")}>
            Last 4 Weeks
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-4 gap-4" style={{ marginBottom: 24 }}>
        {data.kpis.map((kpi, idx) => (
          <div key={idx} className="card metric-card">
            <span className="xs muted">{kpi.label}</span>
            <div className="stat-value" style={{ color: "var(--navy-900)" }}>
              {kpi.val}
            </div>
            <div className="xs" style={{ color: kpi.tone === "positive" ? "var(--success)" : "var(--text-3)" }}>
              {kpi.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Documentation Preparation Time (Minutes)</h3>
            <p className="xs muted">Average minutes spent per clinical encounter before physician sign-off.</p>
          </div>
          <span className="badge badge-teal">Measured Time</span>
        </div>
        <div className="card-body">
          <div className="bar-chart" style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 16 }}>
            {data.prepTimes.map((val, idx) => {
              const heightPct = Math.round((val / 15) * 100);
              return (
                <div key={idx} className="bar-col" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <span className="xs strong">{val}m</span>
                  <div
                    className="bar"
                    style={{
                      width: "100%",
                      maxWidth: 48,
                      height: `${heightPct}%`,
                      background: "var(--navy-800)",
                      borderRadius: "6px 6px 0 0",
                    }}
                  />
                  <span className="bar-label">{data.labels[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
