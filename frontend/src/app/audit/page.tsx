"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, Search, Filter, ShieldCheck, Download, AlertTriangle } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";
import { PermissionRestricted } from "@/components/common/PermissionRestricted";

export default function AuditLogPage() {
  const { audit, can, toast, me } = useClinova();

  if (!can("view_audit")) {
    return <PermissionRestricted what="the audit log" role={me.role} />;
  }
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");

  const filtered = audit.filter((a) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const match =
        a.actor.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        a.record.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    if (outcomeFilter !== "all" && a.outcome !== outcomeFilter) return false;
    return true;
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Audit Log</h1>
            <span className="demo-ribbon">SHA-256 Chained Security Trail</span>
          </div>
          <p>Immutable record of access, clinical reviews, AI activity, and system authentication events.</p>
        </div>
        <div className="row gap-2">
          <button
            className="btn btn-secondary"
            onClick={() =>
              toast(
                "Export logged",
                "Cryptographic audit log exported with SHA-256 provenance signature",
                "info"
              )
            }
          >
            <Download style={{ width: 14, height: 14 }} />
            <span>Export audit trail</span>
          </button>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row gap-3 wrap filter-bar" style={{ padding: 14 }}>
          <div className="input-group grow" style={{ minWidth: 240 }}>
            <Search style={{ width: 16, height: 16 }} aria-hidden="true" />
            <input
              className="input"
              placeholder="Search audit events by actor, action or record ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="row" style={{ position: "relative" }}>
            <select
              className="select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="Sign-in">Sign-in</option>
              <option value="Record access">Record access</option>
              <option value="Clinical review">Clinical review</option>
              <option value="AI draft">AI draft</option>
              <option value="Approval">Approval</option>
              <option value="Permission change">Permission change</option>
            </select>
          </div>

          <div className="row" style={{ position: "relative" }}>
            <select
              className="select"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
            >
              <option value="all">All Outcomes</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Category</th>
                <th>Record / Target</th>
                <th>Outcome</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="subtle" style={{ whiteSpace: "nowrap" }}>{item.ts}</td>
                  <td className="strong">{item.actor}</td>
                  <td>{item.action}</td>
                  <td>
                    <span className="badge badge-outline">{item.category}</span>
                  </td>
                  <td className="mono subtle">{item.record}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.outcome === "Success" ? "badge-success" : "badge-error"
                      }`}
                    >
                      {item.outcome}
                    </span>
                  </td>
                  <td className="xs muted" style={{ maxWidth: 260 }}>{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
