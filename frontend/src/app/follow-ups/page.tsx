"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Plus, Phone, CheckCircle2, User, ChevronRight, MessageSquare, AlertCircle } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

function FollowUpsContent() {
  const searchParams = useSearchParams();
  const newParam = searchParams.get("new");
  const patientParam = searchParams.get("patient");

  const { followUps, patients, updateFollowUp, addFollowUp, can, toast } = useClinova();
  const [filter, setFilter] = useState<"today" | "upcoming" | "completed">("today");
  const [modalOpen, setModalOpen] = useState(false);
  const [newReason, setNewReason] = useState("");
  const [newPatientId, setNewPatientId] = useState("CLN-10482");

  useEffect(() => {
    if (newParam || patientParam) {
      setModalOpen(true);
      if (patientParam) setNewPatientId(patientParam);
      if (newParam && newParam.startsWith("ENC-")) {
        setNewReason(`Follow-up after consultation ${newParam}`);
      }
    }
  }, [newParam, patientParam]);

  const filtered = followUps.filter((f) => {
    if (filter === "today") return f.status === "Due today" || f.status === "Contact attempted";
    if (filter === "upcoming") return f.status === "Scheduled";
    if (filter === "completed") return f.status === "Completed";
    return true;
  });

  const handleRecordContact = (id: string) => {
    updateFollowUp(id, (prev) => ({
      status: "Contact attempted",
      attempts: [
        ...prev.attempts,
        {
          at: "Just now",
          by: "Attending Staff",
          outcome: "Call placed — follow-up instructions reinforced",
        },
      ],
    }));
    toast("Contact logged", "Follow-up contact attempt recorded", "success");
  };

  const handleMarkCompleted = (id: string) => {
    updateFollowUp(id, () => ({ status: "Completed" }));
    toast("Follow-up resolved", "Patient follow-up marked as completed", "success");
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReason.trim()) return;
    addFollowUp({
      patientId: newPatientId,
      reason: newReason.trim(),
      due: "Today",
      owner: "joshua",
      pref: "Phone call",
    });
    setNewReason("");
    setModalOpen(false);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Follow-ups</h1>
            <span className="demo-ribbon">Post-Consultation Continuity</span>
          </div>
          <p>Coordinate patient follow-ups and monitor post-discharge recovery outcomes.</p>
        </div>
        <div className="row gap-2">
          {can("manage_followups") && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus style={{ width: 16, height: 16 }} />
              <span>Create follow-up</span>
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div style={{ marginBottom: 16 }}>
        <div className="segmented">
          <button
            aria-pressed={filter === "today"}
            onClick={() => setFilter("today")}
          >
            Due Today ({followUps.filter((f) => f.status === "Due today" || f.status === "Contact attempted").length})
          </button>
          <button
            aria-pressed={filter === "upcoming"}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming ({followUps.filter((f) => f.status === "Scheduled").length})
          </button>
          <button
            aria-pressed={filter === "completed"}
            onClick={() => setFilter("completed")}
          >
            Completed ({followUps.filter((f) => f.status === "Completed").length})
          </button>
        </div>
      </div>

      {/* Follow-up Cards */}
      <div className="stack gap-3">
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <Clock style={{ width: 32, height: 32, color: "var(--teal-600)", margin: "0 auto 12px" }} />
            <h3>No follow-ups due</h3>
            <p className="muted">All scheduled patient follow-ups in this category have been addressed.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const patient = patients.find((p) => p.id === item.patientId);

            return (
              <div key={item.id} className="card" style={{ padding: "16px 20px" }}>
                <div className="row between wrap gap-3">
                  <div className="stack gap-1">
                    <div className="row gap-2 wrap">
                      <Link
                        href={`/patients/${item.patientId}`}
                        className="strong"
                        style={{ fontSize: 16, color: "var(--text)" }}
                      >
                        {patient?.name || item.patientId}
                      </Link>
                      <span className="mono xs muted">({item.patientId})</span>
                      <span
                        className={`badge ${
                          item.status === "Completed"
                            ? "badge-success"
                            : item.status === "Contact attempted"
                            ? "badge-warning"
                            : "badge-teal"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="small medium" style={{ color: "var(--navy-900)" }}>
                      {item.reason}
                    </div>

                    <div className="xs muted">
                      Assigned: {item.owner === "joshua" ? "Dr. Joshua Ajose" : "Nurse Chidinma Eze"} · Channel: {item.pref} · Due: {item.due}
                    </div>

                    {item.attempts.length > 0 && (
                      <div className="xs subtle" style={{ marginTop: 4 }}>
                        Last contact: {item.attempts[item.attempts.length - 1].outcome} ({item.attempts[item.attempts.length - 1].at})
                      </div>
                    )}
                  </div>

                  <div className="row gap-2">
                    {item.status !== "Completed" && (
                      <>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRecordContact(item.id)}
                        >
                          <Phone style={{ width: 14, height: 14 }} />
                          <span>Record contact</span>
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleMarkCompleted(item.id)}
                        >
                          <CheckCircle2 style={{ width: 14, height: 14 }} />
                          <span>Resolve</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create Follow-up */}
      {modalOpen && (
        <div className="overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Patient Follow-up</h2>
            </div>
            <form onSubmit={handleCreateNew} className="modal-body stack gap-4">
              <div className="field">
                <label className="label" htmlFor="fu-patient">
                  <span>Patient</span>
                </label>
                <select
                  id="fu-patient"
                  className="select"
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="fu-reason">
                  <span>Reason / Clinical instruction</span>
                </label>
                <textarea
                  id="fu-reason"
                  className="textarea"
                  placeholder="e.g. Check blood pressure response after lisinopril change…"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Schedule follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FollowUpsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="page" style={{ padding: 48, textAlign: "center" }}>
          <span className="spinner" />
        </div>
      }
    >
      <FollowUpsContent />
    </React.Suspense>
  );
}
