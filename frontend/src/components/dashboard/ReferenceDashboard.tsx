"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Stethoscope,
  FileCheck2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  FlaskConical,
  FileText,
  CheckCircle2,
  Activity,
  Calendar,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export const ReferenceDashboard: React.FC = () => {
  const router = useRouter();
  const { user, me, appointments, consultations, reviews, followUps, audit, patients } = useClinova();
  const [scheduleScope, setScheduleScope] = useState<"mine" | "all">("mine");

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const getDisplayName = () => {
    if (!me?.name) return "Clinician";
    const firstName = me.name.replace(/^(Dr\.|Nurse)\s+/, "").split(" ")[0];
    if (me.name.startsWith("Dr.")) return `Dr. ${firstName}`;
    if (me.name.startsWith("Nurse")) return `Nurse ${firstName}`;
    return firstName;
  };

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const consultList = Object.values(consultations);
  const consultsInProgress = consultList.filter((c) => c.status === "In progress").length;
  const notesAwaiting = consultList.filter((c) => c.status === "Draft saved" || c.status === "In progress").length;
  const followUpsDue = followUps.filter((f) => f.status === "Due today" || f.status === "Contact attempted").length;

  // Filtered appointments
  const filteredAppts = appointments.filter((a) => {
    if (scheduleScope === "mine") {
      return a.clinician === "joshua" || a.clinician === me?.id || a.clinician.toLowerCase().includes("joshua");
    }
    return true;
  });

  const pendingReviews = reviews.filter((r) => r.status === "pending");
  const draftsCount = 11 + consultList.length;
  const reviewedCount = 9 + reviews.filter((r) => r.status !== "pending").length;

  const taskQueueItems = [
    ...pendingReviews
      .filter((r) => r.type === "documentation")
      .slice(0, 1)
      .map((r) => {
        const pt = patients.find((p) => p.id === r.patientId);
        return {
          id: r.id,
          title: "Consultation note awaiting review",
          who: pt ? `${pt.name} · ${r.title}` : r.title,
          to: `/review?tab=documentation&focus=${r.id}`,
          tone: "tile-navy",
          icon: FileText,
        };
      }),
    {
      id: "tq_missing",
      title: "Missing information in patient record",
      who: "Ada Okafor · medication list conflict",
      to: "/patients/CLN-10482",
      tone: "tile-warning",
      icon: AlertTriangle,
    },
    ...pendingReviews
      .filter((r) => r.type === "lab")
      .slice(0, 1)
      .map((r) => {
        const pt = patients.find((p) => p.id === r.patientId);
        return {
          id: r.id,
          title: "Laboratory result awaiting clinician review",
          who: pt ? `${pt.name} · Full blood count` : "Laboratory result",
          to: "/labs",
          tone: "tile-info",
          icon: FlaskConical,
        };
      }),
    ...pendingReviews
      .filter((r) => r.type === "instructions")
      .slice(0, 1)
      .map((r) => {
        const pt = patients.find((p) => p.id === r.patientId);
        return {
          id: r.id,
          title: "Follow-up instructions awaiting approval",
          who: pt ? `${pt.name} · BP monitoring` : "Patient instructions",
          to: `/review?tab=instructions&focus=${r.id}`,
          tone: "tile-teal",
          icon: Clock,
        };
      }),
  ];

  return (
    <div className="page" style={{ padding: "0 24px 40px" }}>
      {/* 1. Page Header */}
      <header className="page-header" style={{ marginBottom: 24 }}>
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {getGreeting()}, {getDisplayName()}
            </h1>
            <span className="demo-ribbon">Demo environment</span>
          </div>
          <p className="subtle" style={{ fontSize: "0.9375rem" }}>
            Here’s your clinical workspace for today · {todayFormatted}
          </p>
        </div>

        <div className="row gap-2">
          <button
            className="btn btn-primary"
            onClick={() => router.push("/patients/CLN-10482")}
          >
            <Stethoscope style={{ width: 16, height: 16 }} aria-hidden="true" />
            <span>Next patient: Ada Okafor</span>
          </button>
        </div>
      </header>

      {/* 2. Four Primary Metrics Cards Grid */}
      <div className="grid grid-4 gap-4" style={{ marginBottom: 24 }}>
        <Link
          href="/appointments"
          className="card interactive metric-card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="row between">
            <span className="small subtle medium">Patients scheduled today</span>
            <span className="icon-tile tile-navy">
              <Users style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
          </div>
          <div className="stat-value" style={{ color: "var(--navy-900)" }}>
            22
          </div>
          <div className="xs muted">5 seen so far today</div>
        </Link>

        <Link
          href="/consultations"
          className="card interactive metric-card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="row between">
            <span className="small subtle medium">Consultations in progress</span>
            <span className="icon-tile tile-info">
              <Stethoscope style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
          </div>
          <div className="stat-value" style={{ color: "var(--navy-900)" }}>
            {consultsInProgress + 4}
          </div>
          <div className="xs muted">Across 4 active clinical bays</div>
        </Link>

        <Link
          href="/notes"
          className="card interactive metric-card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="row between">
            <span className="small subtle medium">Notes awaiting review</span>
            <span className="icon-tile tile-warning">
              <FileCheck2 style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
          </div>
          <div className="stat-value" style={{ color: "var(--navy-900)" }}>
            {notesAwaiting + 2}
          </div>
          <div className="xs muted">Approval and clinician sign-off</div>
        </Link>

        <Link
          href="/follow-ups"
          className="card interactive metric-card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="row between">
            <span className="small subtle medium">Follow-ups due today</span>
            <span className="icon-tile tile-teal">
              <Clock style={{ width: 18, height: 18 }} aria-hidden="true" />
            </span>
          </div>
          <div className="stat-value" style={{ color: "var(--navy-900)" }}>
            {followUpsDue + 4}
          </div>
          <div className="xs muted">Contact attempted on 2 cases</div>
        </Link>
      </div>

      {/* 3. Main Two-Column Asymmetric Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
        data-dash-grid="true"
      >
        {/* LEFT COLUMN: Today's Schedule & Recent Activity */}
        <div className="stack gap-4">
          {/* Today's Schedule */}
          <section className="card" aria-labelledby="sched-heading">
            <div className="card-header row between" style={{ padding: "16px 20px" }}>
              <h2 id="sched-heading" style={{ fontSize: "1.125rem", margin: 0 }}>
                Today’s schedule
              </h2>
              <div className="segmented">
                <button
                  aria-pressed={scheduleScope === "mine"}
                  onClick={() => setScheduleScope("mine")}
                >
                  My patients
                </button>
                <button
                  aria-pressed={scheduleScope === "all"}
                  onClick={() => setScheduleScope("all")}
                >
                  Whole clinic
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="table responsive">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Type</th>
                    {scheduleScope === "all" && <th>Clinician</th>}
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppts.map((a) => {
                    const pt = patients.find((p) => p.id === a.patientId);
                    return (
                      <tr
                        key={a.id}
                        className="clickable"
                        onClick={() => router.push(`/patients/${a.patientId}`)}
                      >
                        <td data-label="Time" className="tnum medium" style={{ whiteSpace: "nowrap" }}>
                          {a.time.replace("Today ", "")}
                        </td>
                        <td className="primary-cell">
                          <div className="row gap-3">
                            <span className="avatar sm">
                              {pt?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("") || "PT"}
                            </span>
                            <div className="row gap-2">
                              <span className="medium" style={{ color: "var(--text)" }}>
                                {pt?.name || a.patientId}
                              </span>
                              {a.patientId === "CLN-10482" && (
                                <span className="badge badge-teal">Demo</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="Type" className="subtle">
                          {a.type}
                        </td>
                        {scheduleScope === "all" && (
                          <td data-label="Clinician" className="subtle">
                            {a.clinician === "joshua"
                              ? "Dr. Joshua"
                              : a.clinician === "chidi"
                              ? "Nurse Chidi"
                              : "Dr. Funmi"}
                          </td>
                        )}
                        <td data-label="Status">
                          <span
                            className={`badge ${
                              a.status === "Completed"
                                ? "badge-success"
                                : a.status === "In consultation"
                                ? "badge-teal"
                                : a.status === "Waiting"
                                ? "badge-warning"
                                : "badge-outline"
                            }`}
                          >
                            <span className="dot" />
                            <span>{a.status}</span>
                          </span>
                        </td>
                        <td className="hide-sm" style={{ textAlign: "right" }}>
                          <Link
                            href={`/patients/${a.patientId}`}
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Open ${pt?.name || a.patientId}`}
                          >
                            <ChevronRight style={{ width: 16, height: 16 }} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent Patient Activity */}
          <section className="card" aria-labelledby="activity-heading">
            <div className="card-header row between" style={{ padding: "16px 20px" }}>
              <h2 id="activity-heading" style={{ fontSize: "1.125rem", margin: 0 }}>
                Recent patient activity
              </h2>
              <Link href="/audit" className="small" style={{ color: "var(--teal-700)" }}>
                View audit log
              </Link>
            </div>
            <div className="card-body" style={{ padding: "16px 20px" }}>
              <ol className="list-reset timeline stack gap-3">
                {audit.slice(0, 5).map((entry) => (
                  <li key={entry.id} className="timeline-item row gap-3">
                    <span
                      className="timeline-dot"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background:
                          entry.outcome === "Failed"
                            ? "var(--error-bg)"
                            : entry.actor.includes("AI")
                            ? "var(--teal-50)"
                            : "var(--navy-50)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {entry.outcome === "Failed" ? (
                        <AlertTriangle style={{ width: 14, height: 14, color: "var(--error)" }} />
                      ) : entry.actor.includes("AI") ? (
                        <Sparkles style={{ width: 14, height: 14, color: "var(--teal-600)" }} />
                      ) : (
                        <CheckCircle2 style={{ width: 14, height: 14, color: "var(--navy-700)" }} />
                      )}
                    </span>
                    <div className="stack" style={{ gap: 2 }}>
                      <div className="small">
                        <span className="medium">{entry.actor}</span>{" "}
                        <span className="subtle">{entry.action.toLowerCase()}</span>
                      </div>
                      <div className="xs muted">
                        {entry.record} · {entry.ts}
                        {entry.outcome === "Failed" && (
                          <span style={{ color: "var(--error)", marginLeft: 6 }}>· Failed</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Clinical Task Queue & AI Workflow Summary */}
        <div className="stack gap-4">
          {/* Clinical Task Queue */}
          <section className="card" aria-labelledby="tq-heading">
            <div className="card-header row between" style={{ padding: "16px 20px" }}>
              <h2 id="tq-heading" style={{ fontSize: "1.125rem", margin: 0 }}>
                Clinical task queue
              </h2>
              <span className="badge badge-warning">{taskQueueItems.length} need attention</span>
            </div>
            <ul className="list-reset">
              {taskQueueItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.to}
                      className="row gap-3 interactive"
                      style={{
                        padding: "14px 20px",
                        borderBottom: "1px solid var(--border)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span
                        className={`icon-tile ${item.tone}`}
                        style={{ width: 34, height: 34, borderRadius: 8 }}
                      >
                        <Icon style={{ width: 18, height: 18 }} aria-hidden="true" />
                      </span>
                      <span className="grow stack" style={{ gap: 2 }}>
                        <span className="small medium">{item.title}</span>
                        <span className="xs muted">{item.who}</span>
                      </span>
                      <ChevronRight style={{ width: 16, height: 16, color: "var(--text-4)" }} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* AI Workflow Summary */}
          <section className="card" aria-labelledby="ai-summary-heading">
            <div className="card-header row between" style={{ padding: "16px 20px" }}>
              <div className="row gap-2">
                <span className="ai-mark" style={{ width: 26, height: 26 }}>
                  <Sparkles style={{ width: 14, height: 14 }} aria-hidden="true" />
                </span>
                <h2 id="ai-summary-heading" style={{ fontSize: "1.125rem", margin: 0 }}>
                  AI workflow summary
                </h2>
              </div>
              <span className="xs muted">Today</span>
            </div>

            <div className="card-body stack gap-4" style={{ padding: "20px" }}>
              <div className="grid grid-3 gap-3">
                <div className="card card-body" style={{ padding: "12px", background: "var(--surface-2)" }}>
                  <span className="xs muted" style={{ display: "block", marginBottom: 4 }}>
                    Drafts prepared
                  </span>
                  <div className="stat-value" style={{ fontSize: "1.5rem" }}>
                    {draftsCount}
                  </div>
                </div>
                <div className="card card-body" style={{ padding: "12px", background: "var(--surface-2)" }}>
                  <span className="xs muted" style={{ display: "block", marginBottom: 4 }}>
                    Reviewed by staff
                  </span>
                  <div className="stat-value" style={{ fontSize: "1.5rem" }}>
                    {reviewedCount}
                  </div>
                </div>
                <div
                  className="card card-body"
                  style={{
                    padding: "12px",
                    background: "var(--teal-50)",
                    borderColor: "var(--teal-300)",
                  }}
                >
                  <span className="xs" style={{ color: "var(--teal-800)", display: "block", marginBottom: 4 }}>
                    Awaiting human review
                  </span>
                  <div className="stat-value" style={{ fontSize: "1.5rem", color: "var(--teal-800)" }}>
                    {pendingReviews.length + 1}
                  </div>
                </div>
              </div>

              <div className="stack gap-2">
                {[
                  ["Documentation drafts", pendingReviews.filter((r) => r.type === "documentation").length + 2],
                  ["Lab summaries", pendingReviews.filter((r) => r.type === "lab").length + 1],
                  ["Patient instructions", pendingReviews.filter((r) => r.type === "instructions").length + 1],
                  ["Items needing clarification", 1],
                ].map(([label, val]) => (
                  <div key={label as string} className="row between small">
                    <span className="subtle">{label}</span>
                    <span className="tnum medium">{val}</span>
                  </div>
                ))}
              </div>

              <div className="alert alert-neutral" style={{ padding: "10px 14px", borderRadius: 8 }}>
                <span className="small subtle">
                  Nothing drafted by AI is added to a chart, signed or sent without staff approval.
                </span>
              </div>

              <Link
                href="/review"
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: "flex-start" }}
              >
                <span>Open review center</span>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
