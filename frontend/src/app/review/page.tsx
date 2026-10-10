"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckSquare, CheckCircle2, XCircle, AlertTriangle, MessageSquare, ChevronRight } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

function ReviewCenterContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const focusParam = searchParams.get("focus");

  const { reviews, patients, setReviewStatus, can, toast } = useClinova();
  const [activeCategory, setActiveCategory] = useState<
    "documentation" | "lab" | "instructions" | "clarification"
  >(
    tabParam === "lab" || tabParam === "instructions" || tabParam === "clarification"
      ? tabParam
      : "documentation"
  );
  const [filterStatus, setFilterStatus] = useState<"pending" | "resolved">("pending");

  useEffect(() => {
    if (tabParam === "lab" || tabParam === "instructions" || tabParam === "clarification" || tabParam === "documentation") {
      setActiveCategory(tabParam);
    }
  }, [tabParam]);

  const categories = [
    { id: "documentation", label: "Documentation drafts" },
    { id: "lab", label: "Lab summaries" },
    { id: "instructions", label: "Patient instructions" },
    { id: "clarification", label: "Items requiring clarification" },
  ];

  const filtered = reviews.filter((r) => {
    if (r.type !== activeCategory) return false;
    if (filterStatus === "pending") return r.status === "pending";
    return r.status !== "pending";
  });

  const handleApprove = (id: string, title: string) => {
    setReviewStatus(id, "approved", { note: "Approved by clinician" });
    toast("Item approved", `${title} marked as verified`, "success");
  };

  const handleReject = (id: string, title: string) => {
    setReviewStatus(id, "rejected", { note: "Rejected by clinician" });
    toast("Item rejected", `${title} returned for revision`, "warning");
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Review Center</h1>
            <span className="demo-ribbon">Attending Physician Oversight</span>
          </div>
          <p>Clinical documentation, AI summaries, and care orders requiring authoritative staff review.</p>
        </div>
      </header>

      {/* Categories Bar */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {categories.map((c) => {
          const count = reviews.filter((r) => r.type === c.id && r.status === "pending").length;
          return (
            <button
              key={c.id}
              className="tab"
              aria-selected={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id as any)}
            >
              <span>{c.label}</span>
              {count > 0 && <span className="count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Filter Status */}
      <div className="row between" style={{ marginBottom: 16 }}>
        <div className="segmented">
          <button
            aria-pressed={filterStatus === "pending"}
            onClick={() => setFilterStatus("pending")}
          >
            Pending Review
          </button>
          <button
            aria-pressed={filterStatus === "resolved"}
            onClick={() => setFilterStatus("resolved")}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Review Cards Deck */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <CheckSquare style={{ width: 32, height: 32, color: "var(--teal-600)", margin: "0 auto 12px" }} />
          <h3>All items reviewed</h3>
          <p className="muted">No items currently awaiting verification in this category.</p>
        </div>
      ) : (
        <div className="stack gap-3">
          {filtered.map((item) => {
            const patient = patients.find((p) => p.id === item.patientId);

            return (
              <div key={item.id} className="card review-card">
                <div className="stack gap-2">
                  <div className="row gap-2 wrap">
                    <span className="small strong" style={{ fontSize: 16 }}>
                      {item.title}
                    </span>
                    <span className="badge badge-teal">{item.aiStatus}</span>
                    <span className="badge badge-outline">{item.sources.join(" · ")}</span>
                  </div>

                  <div className="xs muted">
                    Patient: <strong>{patient?.name || item.patientId}</strong> ({item.patientId}) · Created: {item.createdAt}
                  </div>

                  <div className="message-preview" style={{ fontSize: 13, background: "var(--surface-2)" }}>
                    {item.preview}
                  </div>
                </div>

                {/* Review Actions */}
                {item.status === "pending" ? (
                  <div className="row gap-2" style={{ alignSelf: "center" }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleApprove(item.id, item.title)}
                    >
                      <CheckCircle2 style={{ width: 14, height: 14 }} />
                      <span>Approve</span>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReject(item.id, item.title)}
                    >
                      <XCircle style={{ width: 14, height: 14 }} />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ alignSelf: "center" }}>
                    <span
                      className={`badge ${
                        item.status === "approved" ? "badge-success" : "badge-error"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReviewCenterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="page" style={{ padding: 48, textAlign: "center" }}>
          <span className="spinner" />
        </div>
      }
    >
      <ReviewCenterContent />
    </React.Suspense>
  );
}
