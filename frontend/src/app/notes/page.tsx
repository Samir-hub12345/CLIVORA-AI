"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Stethoscope, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function ClinicalNotesPage() {
  const router = useRouter();
  const { consultations, patients } = useClinova();
  const [filter, setFilter] = useState<"all" | "draft" | "approved" | "signed">("all");

  const allNotes = Object.values(consultations);
  const filtered = allNotes.filter((c) => {
    if (filter === "all") return true;
    if (filter === "draft") return c.status === "In progress" || c.status === "Draft saved";
    if (filter === "approved") return c.status === "Approved";
    if (filter === "signed") return c.status === "Signed";
    return true;
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Clinical Notes</h1>
            <span className="demo-ribbon">Consultation Documentation</span>
          </div>
          <p>Consultation notes, draft documentation, and signed clinical charts.</p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ marginBottom: 16 }}>
        <div className="segmented">
          <button
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All Notes ({allNotes.length})
          </button>
          <button
            aria-pressed={filter === "draft"}
            onClick={() => setFilter("draft")}
          >
            Drafts ({allNotes.filter((c) => c.status === "In progress" || c.status === "Draft saved").length})
          </button>
          <button
            aria-pressed={filter === "signed"}
            onClick={() => setFilter("signed")}
          >
            Signed Records ({allNotes.filter((c) => c.status === "Signed").length})
          </button>
        </div>
      </div>

      <section className="card">
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <FileText style={{ width: 32, height: 32, color: "var(--text-3)", marginBottom: 12 }} />
            <h3>No notes in this category</h3>
            <p>Clinical notes will appear here once consultations are initiated.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Encounter ID</th>
                  <th>Chief Complaint</th>
                  <th>Clinician</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const p = patients.find((pat) => pat.id === c.patientId);
                  const statusTone =
                    c.status === "Signed"
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
                            <div className="medium">{p?.name || c.patientId}</div>
                            <div className="xs muted mono">{c.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Encounter ID" className="mono subtle">
                        {c.id}
                      </td>
                      <td data-label="Chief Complaint" className="subtle" style={{ maxWidth: 220 }}>
                        {c.sections.chief.text || "No chief complaint documented"}
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
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Open</span>
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
