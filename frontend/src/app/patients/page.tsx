"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  UserPlus,
  Filter,
  ArrowUpDown,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";
import { Patient } from "@/lib/referenceData";

function calculateAge(dobString: string): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function PatientsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { patients, can } = useClinova();

  const [search, setSearch] = useState(initialQuery);
  const [apptFilter, setApptFilter] = useState("any");
  const [clinicianFilter, setClinicianFilter] = useState("any");
  const [statusFilter, setStatusFilter] = useState("any");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let result = patients.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) {
        return false;
      }
      if (apptFilter === "today" && !p.nextAppt?.includes("Today")) return false;
      if (apptFilter === "none" && p.nextAppt) return false;
      if (clinicianFilter !== "any" && p.clinician !== clinicianFilter) return false;
      if (statusFilter !== "any" && p.recordStatus !== statusFilter) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "next") return (a.nextAppt || "").localeCompare(b.nextAppt || "");
      return a.id.localeCompare(b.id);
    });

    return result;
  }, [patients, search, apptFilter, clinicianFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeFiltersCount = [apptFilter !== "any", clinicianFilter !== "any", statusFilter !== "any"].filter(
    Boolean
  ).length;

  const handleClearFilters = () => {
    setSearch("");
    setApptFilter("any");
    setClinicianFilter("any");
    setStatusFilter("any");
    setSortBy("recent");
    setPage(1);
  };

  return (
    <div className="page">
      {/* Header */}
      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Patients</h1>
            <span className="demo-ribbon">Synthetic patient registry</span>
          </div>
          <p>{patients.length} registered patients · Lekki Family Health Clinic</p>
        </div>
        <div className="row gap-2 wrap">
          {can("register") && (
            <Link href="/patients/new" className="btn btn-primary">
              <UserPlus style={{ width: 16, height: 16 }} aria-hidden="true" />
              <span>Register patient</span>
            </Link>
          )}
        </div>
      </header>

      {/* Directory Card */}
      <section className="card" aria-label="Patient directory">
        {/* Filter bar */}
        <div
          className="row gap-3 wrap filter-bar"
          style={{ padding: 16, borderBottom: "1px solid var(--border)" }}
        >
          <div className="input-group grow" style={{ minWidth: 240 }}>
            <Search style={{ width: 16, height: 16 }} aria-hidden="true" />
            <input
              id="pt-search"
              className="input"
              placeholder="Search by patient name or ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                className="btn btn-ghost btn-icon btn-sm input-action"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Appointment Filter */}
          <div className="row" style={{ position: "relative" }}>
            <Filter
              size={14}
              style={{ position: "absolute", left: 10, color: "var(--text-4)", pointerEvents: "none" }}
            />
            <select
              className="select"
              style={{
                paddingLeft: 30,
                width: "auto",
                minWidth: 160,
                borderColor: apptFilter !== "any" ? "var(--teal-600)" : undefined,
              }}
              value={apptFilter}
              onChange={(e) => {
                setApptFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="any">Any appointment date</option>
              <option value="today">Appointment today</option>
              <option value="none">No upcoming appointment</option>
            </select>
          </div>

          {/* Clinician Filter */}
          <div className="row" style={{ position: "relative" }}>
            <Filter
              size={14}
              style={{ position: "absolute", left: 10, color: "var(--text-4)", pointerEvents: "none" }}
            />
            <select
              className="select"
              style={{
                paddingLeft: 30,
                width: "auto",
                minWidth: 160,
                borderColor: clinicianFilter !== "any" ? "var(--teal-600)" : undefined,
              }}
              value={clinicianFilter}
              onChange={(e) => {
                setClinicianFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="any">All clinicians</option>
              <option value="joshua">Dr. Joshua Ajose</option>
              <option value="funmi">Dr. Funmi Adeyemi</option>
              <option value="chidi">Nurse Chidinma Eze</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="row" style={{ position: "relative" }}>
            <Filter
              size={14}
              style={{ position: "absolute", left: 10, color: "var(--text-4)", pointerEvents: "none" }}
            />
            <select
              className="select"
              style={{
                paddingLeft: 30,
                width: "auto",
                minWidth: 160,
                borderColor: statusFilter !== "any" ? "var(--teal-600)" : undefined,
              }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="any">All record statuses</option>
              <option value="Needs review">Needs review</option>
              <option value="Complete">Complete</option>
              <option value="Incomplete">Incomplete</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="row" style={{ position: "relative" }}>
            <ArrowUpDown
              size={14}
              style={{ position: "absolute", left: 10, color: "var(--text-4)", pointerEvents: "none" }}
            />
            <select
              className="select"
              style={{ paddingLeft: 30, width: "auto", minWidth: 150 }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recent">Recent activity</option>
              <option value="name">Name A–Z</option>
              <option value="next">Next appointment</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div
          className="row between xs muted"
          style={{ padding: "8px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}
        >
          <span>
            {filtered.length} patient{filtered.length === 1 ? "" : "s"}
            {activeFiltersCount > 0 && ` · ${activeFiltersCount} filter(s) active`}
          </span>
          {(activeFiltersCount > 0 || search) && (
            <button className="btn btn-ghost btn-sm" onClick={handleClearFilters}>
              <X style={{ width: 14, height: 14 }} aria-hidden="true" />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {/* Table View */}
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <div className="empty-icon">
              <Search style={{ width: 24, height: 24 }} />
            </div>
            <h3>No patients match your search</h3>
            <p>Check the spelling or clear active filters.</p>
            <button className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Patient ID</th>
                  <th scope="col" className="num">Age</th>
                  <th scope="col">Last visit</th>
                  <th scope="col">Next appointment</th>
                  <th scope="col">Clinician</th>
                  <th scope="col">Record status</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const statusTone =
                    p.recordStatus === "Complete"
                      ? "badge-success"
                      : p.recordStatus === "Needs review"
                      ? "badge-warning"
                      : "badge-error";

                  return (
                    <tr
                      key={p.id}
                      className="clickable"
                      onClick={() => router.push(`/patients/${p.id}`)}
                    >
                      <td className="primary-cell">
                        <div className="row gap-3">
                          <span className="avatar sm">
                            {p.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div className="stack">
                            <span className="medium" style={{ color: "var(--text)" }}>
                              {p.name}
                            </span>
                            <span className="xs muted">
                              {p.sex} · {p.language || "English"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Patient ID" className="mono subtle">
                        {p.id}
                      </td>
                      <td data-label="Age" className="num">
                        {calculateAge(p.dob)}
                      </td>
                      <td data-label="Last visit" className="subtle">
                        {p.lastVisit || "—"}
                      </td>
                      <td data-label="Next appointment">
                        {p.nextAppt ? (
                          <span className={p.nextAppt.includes("Today") ? "medium" : "subtle"}>
                            {p.nextAppt}
                          </span>
                        ) : (
                          <span className="muted">None scheduled</span>
                        )}
                      </td>
                      <td data-label="Clinician" className="subtle">
                        {p.clinician === "joshua"
                          ? "Dr. Joshua Ajose"
                          : p.clinician === "funmi"
                          ? "Dr. Funmi Adeyemi"
                          : "Nurse Chidinma Eze"}
                      </td>
                      <td data-label="Record status">
                        <span className={`badge ${statusTone}`}>
                          <span className="dot" />
                          <span>{p.recordStatus}</span>
                        </span>
                      </td>
                      <td className="hide-sm" style={{ textAlign: "right" }}>
                        <Link
                          href={`/patients/${p.id}`}
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye style={{ width: 14, height: 14 }} aria-hidden="true" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <nav className="card-footer" aria-label="Pagination">
            <span className="xs muted">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="row gap-1">
              <button
                className="btn btn-secondary btn-sm btn-icon"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  className={`btn btn-sm ${page === idx + 1 ? "btn-primary" : "btn-ghost"}`}
                  style={{ minWidth: 30 }}
                  onClick={() => setPage(idx + 1)}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                className="btn btn-secondary btn-sm btn-icon"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </nav>
        )}
      </section>

      <p className="xs muted" style={{ marginTop: 12 }}>
        Directory previews show administrative details only. Clinical information is available in the patient profile to authorised roles.
      </p>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="container" style={{ padding: 24 }}>
          <div className="muted sm">Loading patient directory...</div>
        </div>
      }
    >
      <PatientsContent />
    </React.Suspense>
  );
}
