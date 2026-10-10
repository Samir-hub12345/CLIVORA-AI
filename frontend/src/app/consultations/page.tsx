"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stethoscope, Clock, FileText, ChevronRight, CheckCircle2, User } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function ConsultationsPage() {
  const router = useRouter();
  const { consultations, patients } = useClinova();
  const list = Object.values(consultations);

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Consultations</h1>
            <span className="demo-ribbon">Clinical Workbench Ingress</span>
          </div>
          <p>Open and recent clinical encounters across the clinic.</p>
        </div>
      </header>

      <section className="card">
        {list.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <Stethoscope style={{ width: 32, height: 32, color: "var(--text-3)", marginBottom: 12 }} />
            <h3>No consultations yet</h3>
            <p>Start a consultation from any patient profile in the registry.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Encounter ID</th>
                  <th>Type</th>
                  <th>Clinician</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const p = patients.find((pat) => pat.id === c.patientId);
                  const statusTone =
                    c.status === "Signed" || c.status === "Approved"
                      ? "badge-success"
                      : c.status === "In progress"
                      ? "badge-teal"
                      : "badge-warning";

                  return (
                    <tr
                      key={c.id}
                      className="clickable"
                      onClick={() => router.push(`/consultations/${c.id}`)}
                    >
                      <td className="primary-cell">
                        <div className="row gap-3">
                          <span className="avatar sm">
                            {p?.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("") || "PT"}
                          </span>
                          <div>
                            <div className="medium" style={{ color: "var(--text)" }}>
                              {p?.name || c.patientId}
                            </div>
                            <div className="xs muted mono">{c.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Encounter ID" className="mono subtle">
                        {c.id}
                      </td>
                      <td data-label="Type" className="subtle">
                        {c.type}
                      </td>
                      <td data-label="Clinician" className="subtle">
                        {c.clinician === "joshua"
                          ? "Dr. Joshua Ajose"
                          : c.clinician === "funmi"
                          ? "Dr. Funmi Adeyemi"
                          : "Dr. Ibrahim Danladi"}
                      </td>
                      <td data-label="Started" className="subtle">
                        {c.startedAt}
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${statusTone}`}>
                          <span className="dot" />
                          <span>{c.status}</span>
                        </span>
                      </td>
                      <td className="hide-sm" style={{ textAlign: "right" }}>
                        <Link
                          href={`/consultations/${c.id}`}
                          className="btn btn-primary btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Open workbench</span>
                          <ChevronRight style={{ width: 14, height: 14 }} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
