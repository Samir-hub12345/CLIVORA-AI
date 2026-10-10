"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FlaskConical, Filter, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function LabResultsPage() {
  const { labs, patients, ackLab, can } = useClinova();
  const [filterPatient, setFilterPatient] = useState("all");
  const [flagFilter, setFlagFilter] = useState<"all" | "flagged">("all");

  const filteredLabs = labs.filter((l) => {
    if (filterPatient !== "all" && l.patientId !== filterPatient) return false;
    if (flagFilter === "flagged" && !l.flag) return false;
    return true;
  });

  // Group by report ID
  const groupedReports = filteredLabs.reduce((acc, cur) => {
    (acc[cur.report] = acc[cur.report] || []).push(cur);
    return acc;
  }, {} as Record<string, typeof labs>);

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Lab Results</h1>
            <span className="demo-ribbon">LIS Integration Gateway</span>
          </div>
          <p>Values, units and reference ranges are shown exactly as supplied by the laboratory.</p>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="row gap-3 wrap" style={{ marginBottom: 16 }}>
        <div className="row" style={{ position: "relative" }}>
          <Filter size={14} style={{ position: "absolute", left: 10, color: "var(--text-4)", pointerEvents: "none" }} />
          <select
            className="select"
            style={{ paddingLeft: 30, width: "auto", minWidth: 180 }}
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
          >
            <option value="all">All Patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id})
              </option>
            ))}
          </select>
        </div>

        <div className="segmented">
          <button
            aria-pressed={flagFilter === "all"}
            onClick={() => setFlagFilter("all")}
          >
            All Results ({labs.length})
          </button>
          <button
            aria-pressed={flagFilter === "flagged"}
            onClick={() => setFlagFilter("flagged")}
          >
            Flagged Abnormal ({labs.filter((l) => l.flag).length})
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="stack gap-4">
        {Object.entries(groupedReports).map(([reportId, tests]) => {
          const patientId = tests[0]?.patientId;
          const patient = patients.find((p) => p.id === patientId);

          return (
            <div key={reportId} className="card">
              <div className="card-header">
                <div>
                  <div className="row gap-2">
                    <span className="mono strong">{reportId}</span>
                    <span className="badge badge-outline">{tests[0]?.panel}</span>
                  </div>
                  <div className="xs muted" style={{ marginTop: 2 }}>
                    Patient: {patient?.name || patientId} ({patientId}) · Collected: {tests[0]?.collected}
                  </div>
                </div>

                {can("ack_labs") && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => ackLab(reportId)}
                  >
                    <CheckCircle2 style={{ width: 14, height: 14, color: "var(--teal-600)" }} />
                    <span>Acknowledge review</span>
                  </button>
                )}
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Result</th>
                      <th>Units</th>
                      <th>Reference Range</th>
                      <th>Flag</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr key={t.id}>
                        <td className="medium">{t.test}</td>
                        <td className="strong">{t.result}</td>
                        <td className="subtle">{t.unit}</td>
                        <td className="subtle">{t.range}</td>
                        <td>
                          {t.flag ? (
                            <span className="badge badge-warning">
                              {t.flag === "L" ? "Low" : t.flag === "H" ? "High" : t.flag}
                            </span>
                          ) : (
                            <span className="badge badge-success">Normal</span>
                          )}
                        </td>
                        <td className="subtle">{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
