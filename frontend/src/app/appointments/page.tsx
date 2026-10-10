"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Stethoscope, User, ChevronRight, CheckCircle2 } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function AppointmentsPage() {
  const router = useRouter();
  const { appointments, patients } = useClinova();
  const [filter, setFilter] = useState<"today" | "upcoming">("today");

  const filteredAppts = appointments.filter((a) => {
    const isToday = a.time.toLowerCase().includes("today") || (!a.time.toLowerCase().includes("tomorrow") && !a.time.toLowerCase().includes("upcoming"));
    if (filter === "today") return isToday;
    return !isToday;
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Appointments</h1>
            <span className="demo-ribbon">Outpatient Clinic Schedule</span>
          </div>
          <p>Upcoming and recent patient visits across clinic rooms.</p>
        </div>
      </header>

      {/* Segmented Filter */}
      <div style={{ marginBottom: 16 }}>
        <div className="segmented">
          <button
            aria-pressed={filter === "today"}
            onClick={() => setFilter("today")}
          >
            Today&apos;s Schedule
          </button>
          <button
            aria-pressed={filter === "upcoming"}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming Days
          </button>
        </div>
      </div>

      <section className="card">
        {filteredAppts.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <Calendar style={{ width: 32, height: 32, color: "var(--text-3)", marginBottom: 12 }} />
            <h3>No appointments scheduled</h3>
            <p>No appointments match the selected timeframe.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Visit Type</th>
                  <th>Assigned Clinician</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAppts.map((a) => {
                  const p = patients.find((pat) => pat.id === a.patientId);
                  const statusTone =
                    a.status === "Completed"
                      ? "badge-success"
                      : a.status === "In consultation"
                      ? "badge-teal"
                      : a.status === "Waiting"
                      ? "badge-warning"
                      : "badge-outline";

                  return (
                    <tr
                      key={a.id}
                      className="clickable"
                      onClick={() => router.push(`/patients/${a.patientId}`)}
                    >
                      <td className="strong">{a.time}</td>
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
                              {p?.name || a.patientId}
                            </div>
                            <div className="xs muted mono">{a.patientId}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Visit Type" className="subtle">
                        {a.type}
                      </td>
                      <td data-label="Clinician" className="subtle">
                        {a.clinician === "joshua"
                          ? "Dr. Joshua Ajose"
                          : a.clinician === "funmi"
                          ? "Dr. Funmi Adeyemi"
                          : "Nurse Chidinma Eze"}
                      </td>
                      <td data-label="Room" className="subtle">
                        {a.room || "Room 1"}
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${statusTone}`}>
                          <span className="dot" />
                          <span>{a.status}</span>
                        </span>
                      </td>
                      <td className="hide-sm" style={{ textAlign: "right" }}>
                        <Link
                          href={`/patients/${a.patientId}`}
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Open chart</span>
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
