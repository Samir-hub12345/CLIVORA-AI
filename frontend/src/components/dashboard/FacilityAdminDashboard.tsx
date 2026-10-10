"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Users,
  Activity,
  Bed,
  Layers,
  Settings,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  ChevronDown,
  Bell,
  Download,
  Share2,
  Clock,
  Shield,
  XCircle,
  Edit3,
  Search,
  Sliders,
  FileText,
  BarChart3,
  Wrench,
  Save,
  Check,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";
import { RoleGuard } from "@/components/common/RoleGuard";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  code: string;
  status: "On Duty" | "Off Duty" | "On Call";
  imageBg: string;
}

const INITIAL_STAFF: StaffMember[] = [
  {
    id: "st-1",
    name: "Dr. Matsumoto Issei",
    role: "Dentist",
    department: "Dental Unit",
    code: "DNT-021",
    status: "On Duty",
    imageBg: "#e0f2fe",
  },
  {
    id: "st-2",
    name: "Dr. Watanabe Daiki",
    role: "Cardiologist",
    department: "Cardiology",
    code: "CRD-014",
    status: "On Duty",
    imageBg: "#fef3c7",
  },
  {
    id: "st-3",
    name: "Dr. Takahashi Yuna",
    role: "General Physician",
    department: "General Medicine",
    code: "GEN-009",
    status: "On Duty",
    imageBg: "#dcfce7",
  },
  {
    id: "st-4",
    name: "Dr. Mori Natsuko",
    role: "Emergency Specialist",
    department: "Emergency Care",
    code: "EMR-033",
    status: "On Duty",
    imageBg: "#fee2e2",
  },
  {
    id: "st-5",
    name: "Dr. Arai Keisuke",
    role: "Critical Care",
    department: "ICU",
    code: "ICU-007",
    status: "On Duty",
    imageBg: "#ede9fe",
  },
];

export const FacilityAdminDashboard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const { user, toast } = useClinova();

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "facility" | "staff" | "capacity" | "resources" | "analytics" | "reports" | "settings"
  >("dashboard");

  // Synchronize tab parameter with active view
  React.useEffect(() => {
    if (!tabParam) return;
    const tabMap: Record<string, any> = {
      dashboard: "dashboard",
      facility: "facility",
      staff: "staff",
      capacity: "capacity",
      resources: "resources",
      analytics: "analytics",
      reports: "reports",
      settings: "settings",
    };
    if (tabMap[tabParam]) {
      setActiveTab(tabMap[tabParam]);
    }
  }, [tabParam]);

  const [resourceSubTab, setResourceSubTab] = useState<"OVERVIEW" | "PATIENTS" | "TREATMENTS" | "RESOURCES" | "ANALYTICS">(
    "RESOURCES"
  );

  const [bedMode, setBedMode] = useState<"Bed" | "Room">("Bed");
  const [activeEquipment, setActiveEquipment] = useState<"Ventilator" | "Incubator" | "Infusion Pump" | "Patient Monitor">(
    "Ventilator"
  );
  const [selectedDept, setSelectedDept] = useState("All");

  // Facility edit form
  const [facilityName, setFacilityName] = useState("Cuttack District Headquarters Hospital");
  const [facilityLocation, setFacilityLocation] = useState("Mangalabag, Cuttack, Odisha 753007");
  const [bedCapacityTotal, setBedCapacityTotal] = useState(120);
  const [bedCapacityOccupied, setBedCapacityOccupied] = useState(104);

  // Staff management
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Staff Nurse");
  const [newStaffDept, setNewStaffDept] = useState("General Medicine");

  // Modals
  const [isReserveBedOpen, setIsReserveBedOpen] = useState(false);
  const [isEditFacilityOpen, setIsEditFacilityOpen] = useState(false);
  const [isViewReferralsOpen, setIsViewReferralsOpen] = useState(false);

  // Add staff action
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const newMember: StaffMember = {
      id: "st-" + (staffList.length + 1),
      name: newStaffName.trim(),
      role: newStaffRole,
      department: newStaffDept,
      code: "STAFF-" + Math.floor(100 + Math.random() * 900),
      status: "On Duty",
      imageBg: "#f1f5f9",
    };
    setStaffList((prev) => [newMember, ...prev]);
    toast("Staff Member Added", `${newMember.name} assigned to ${newMember.department}`, "success");
    setNewStaffName("");
    setIsAddStaffOpen(false);
  };

  // Reserve bed action
  const handleReserveBed = () => {
    toast("Bed Reserved", "Bed #B-04 placed on hold for incoming SBAR patient referral", "success");
    setIsReserveBedOpen(false);
  };

  // Edit facility action
  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Facility Details Saved", `${facilityName} configuration updated`, "success");
    setIsEditFacilityOpen(false);
  };

  // Export report action
  const handleExportReport = () => {
    toast("Report Generated", "Facility Operational Capacity Summary exported successfully (CSV/PDF)", "success");
  };

  return (
    <RoleGuard
      allowedRoles={["FACILITY_ADMIN", "SYSTEM_ADMIN", "AUDITOR", "CLINICIAN"]}
      title="Facility Administration Restricted"
      message="Only licensed facility administrators and operational supervisors may access hospital capacity and resource planning."
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 20px 48px" }}>
        {/* Top Header matching Reference Image 5: Operations & Resource */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--navy-900)" }}>
                Operations & Resource
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16a34a" }} />
                Live
              </span>
            </div>
            <p style={{ color: "var(--text-3)", fontSize: "0.9375rem", marginTop: 4 }}>
              {facilityName} · Regional Capacity & Resource Management
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                backgroundColor: "#ffffff",
                border: "1px solid var(--border)",
                fontSize: "0.8125rem",
                color: "var(--text-2)",
              }}
            >
              <Calendar style={{ width: 14, height: 14 }} />
              <span>Today</span>
              <ChevronDown style={{ width: 14, height: 14 }} />
            </div>

            <button
              className="btn btn-secondary"
              style={{ height: 36, padding: "0 12px", fontSize: "0.8125rem" }}
              onClick={() => toast("Capacity Alerts", "Department Load is over 90% in Intensive Care Unit", "warning")}
            >
              <Bell style={{ width: 14, height: 14 }} />
              <span>View Alerts</span>
            </button>

            <button
              className="btn btn-primary"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: "0.8125rem",
                backgroundColor: "#0d9488",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={() => setIsAddStaffOpen(true)}
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>Add Staff</span>
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "facility", label: "Facility Profile" },
            { id: "staff", label: "Staff Roster" },
            { id: "capacity", label: "Department Capacity" },
            { id: "resources", label: "Equipment Inventory" },
            { id: "analytics", label: "Hospital Analytics" },
            { id: "reports", label: "Operational Reports" },
            { id: "settings", label: "Facility Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
              {activeTab === tab.id && <span className="tab-indicator" />}
            </button>
          ))}
        </div>

        {/* Tab 1: Dashboard View */}
        {activeTab === "dashboard" && (
          <div>
            {/* Sub-navigation tabs (Matching Reference Image 5) */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
          {(["OVERVIEW", "PATIENTS", "TREATMENTS", "RESOURCES", "ANALYTICS"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setResourceSubTab(tab)}
              style={{
                border: 0,
                background: resourceSubTab === tab ? "#e6f4f1" : "transparent",
                color: resourceSubTab === tab ? "#0f766e" : "var(--text-3)",
                fontWeight: 600,
                fontSize: "0.8125rem",
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Dashboard Layout (Matching Reference Image 5) */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2.3fr) minmax(0, 1.1fr)", gap: 24 }}>
          {/* Left / Center Major Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Top Row: Bed & Room Overview (Left) + 4 Capacity Metric Tiles (Right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
              {/* Bed & Room Overview Card */}
              <div className="card" style={{ padding: "20px 22px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Bed style={{ width: 18, height: 18, color: "#0d9488" }} />
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Bed & Room Overview</h2>
                  </div>

                  {/* Bed | Room toggle */}
                  <div
                    style={{
                      display: "inline-flex",
                      padding: 2,
                      borderRadius: 6,
                      backgroundColor: "#f1f5f9",
                    }}
                  >
                    <button
                      onClick={() => setBedMode("Bed")}
                      style={{
                        border: 0,
                        backgroundColor: bedMode === "Bed" ? "#ffffff" : "transparent",
                        color: bedMode === "Bed" ? "var(--navy-900)" : "var(--text-3)",
                        padding: "3px 10px",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      Bed
                    </button>
                    <button
                      onClick={() => setBedMode("Room")}
                      style={{
                        border: 0,
                        backgroundColor: bedMode === "Room" ? "#ffffff" : "transparent",
                        color: bedMode === "Room" ? "var(--navy-900)" : "var(--text-3)",
                        padding: "3px 10px",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      Room
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
                  {/* Detailed SVG Illustration of Hospital Electric Bed */}
                  <div
                    style={{
                      width: 140,
                      height: 110,
                      borderRadius: 12,
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="110" height="85" viewBox="0 0 110 85" fill="none">
                      {/* Bed Base & Wheels */}
                      <rect x="20" y="65" width="70" height="6" rx="2" fill="#64748b" />
                      <circle cx="28" cy="74" r="4" fill="#334155" />
                      <circle cx="82" cy="74" r="4" fill="#334155" />
                      {/* Bed Frame */}
                      <rect x="15" y="45" width="80" height="18" rx="4" fill="#cbd5e1" />
                      {/* Mattress */}
                      <rect x="18" y="32" width="74" height="15" rx="3" fill="#e2e8f0" stroke="#94a3b8" />
                      {/* Pillow */}
                      <rect x="22" y="24" width="22" height="10" rx="3" fill="#ffffff" stroke="#cbd5e1" />
                      {/* Side Guard Rail */}
                      <rect x="42" y="36" width="36" height="4" rx="2" fill="#0d9488" />
                      {/* IV Pole */}
                      <line x1="88" y1="12" x2="88" y2="65" stroke="#94a3b8" strokeWidth="2" />
                      <path d="M84 14C84 12 88 12 88 12C88 12 92 12 92 14" stroke="#64748b" strokeWidth="2" fill="none" />
                      {/* Control Panel Light */}
                      <circle cx="50" cy="54" r="2.5" fill="#22c55e" />
                    </svg>
                  </div>

                  <div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: "#dcfce7",
                        color: "#15803d",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                      }}
                    >
                      2 beds ready to use
                    </span>
                    <div style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--navy-900)", marginTop: 4 }}>
                      General Electric Bed
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 2 }}>
                      General · 5 beds
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-2)", margin: "4px 0 10px", lineHeight: 1.4 }}>
                      Electric bed for general inpatient care, with adjustable positioning, and IV pole.
                    </p>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: "#0f766e" }}
                        onClick={() => setIsReserveBedOpen(true)}
                      >
                        Reserve Bed
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => toast("Bed telemetry", "Bed #B-04 · Inpatient Ward West · Cleaned 2 hours ago", "info")}
                      >
                        View Details
                      </button>
                    </div>

                    <div style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: 6 }}>
                      Cleaned · 2 hours ago
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Capacity Metric Tiles (Matching Reference Image 5) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Tile 1: Bed Occupied */}
                <div className="card" style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-2)" }}>Bed Occupied</span>
                    <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--navy-900)", margin: "4px 0 2px" }}>
                    87<span style={{ fontSize: "0.875rem", fontWeight: 600 }}>%</span>
                  </div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>occupied</span>
                  {/* Progress Bar */}
                  <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ width: "87%", height: "100%", backgroundColor: "#ef4444", borderRadius: 3 }} />
                  </div>
                </div>

                {/* Tile 2: Staff Coverage */}
                <div className="card" style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-2)" }}>Staff Coverage</span>
                    <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--navy-900)", margin: "4px 0 2px" }}>
                    35<span style={{ fontSize: "0.875rem", fontWeight: 600 }}>%</span>
                  </div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>on duty</span>
                  <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ width: "35%", height: "100%", backgroundColor: "#0d9488", borderRadius: 3 }} />
                  </div>
                </div>

                {/* Tile 3: Operating Rooms */}
                <div className="card" style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-2)" }}>Operating Rooms</span>
                    <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--navy-900)", margin: "4px 0 2px" }}>
                    72<span style={{ fontSize: "0.875rem", fontWeight: 600 }}>%</span>
                  </div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>utilization</span>
                  <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ width: "72%", height: "100%", backgroundColor: "#f59e0b", borderRadius: 3 }} />
                  </div>
                </div>

                {/* Tile 4: Department Load */}
                <div className="card" style={{ padding: 14, borderRadius: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-2)" }}>Department Load</span>
                    <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", margin: "4px 0 2px" }}>
                    &gt; 90<span style={{ fontSize: "0.875rem", fontWeight: 600 }}>%</span>
                  </div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>capacity</span>
                  <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ width: "94%", height: "100%", backgroundColor: "#dc2626", borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Equipments Insight (Left) + Staff Schedule Calendar (Right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
              {/* Equipments Insight Card (Matching Reference Image 5) */}
              <div className="card" style={{ padding: "20px 22px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity style={{ width: 18, height: 18, color: "#0d9488" }} />
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Equipments Insight</h2>
                  </div>
                  <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
                  {(["Ventilator", "Incubator", "Infusion Pump", "Patient Monitor"] as const).map((eq) => (
                    <button
                      key={eq}
                      onClick={() => setActiveEquipment(eq)}
                      style={{
                        border: "1px solid var(--border)",
                        backgroundColor: activeEquipment === eq ? "#f0fdfa" : "#ffffff",
                        color: activeEquipment === eq ? "#0f766e" : "var(--text-3)",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {eq}
                    </button>
                  ))}
                </div>

                {/* Circular Gauge Meter (75% available) */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "16px 0 10px" }}>
                  <div style={{ position: "relative", width: 130, height: 85 }}>
                    <svg viewBox="0 0 120 75" style={{ width: "100%", height: "100%" }}>
                      <path
                        d="M 15 65 A 45 45 0 0 1 105 65"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="10"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 15 65 A 45 45 0 0 1 105 65"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="10"
                        strokeDasharray="141"
                        strokeDashoffset="35"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.375rem", fontWeight: 800, color: "var(--navy-900)" }}>
                        75%
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>available</div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-3)", marginTop: 6 }}>
                    30/40 used
                  </span>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-2)", textAlign: "center", marginTop: 4 }}>
                  Equipment usage is within safe limits
                </div>
              </div>

              {/* Staff Schedule Calendar (Matching Reference Image 5) */}
              <div className="card" style={{ padding: "20px 22px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock style={{ width: 18, height: 18, color: "#0d9488" }} />
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Staff Schedule</h2>
                  </div>

                  <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--navy-900)" }}>
                    December 2025
                  </span>
                </div>

                {/* Days of Week (Sun 21 - Sat 27, Tue 23 active) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center", marginBottom: 12 }}>
                  {[
                    { day: "Sun", date: "21" },
                    { day: "Mon", date: "22" },
                    { day: "Tue", date: "23", active: true },
                    { day: "Wed", date: "24" },
                    { day: "Thu", date: "25" },
                    { day: "Fri", date: "26" },
                    { day: "Sat", date: "27" },
                  ].map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "6px 2px",
                        borderRadius: 8,
                        backgroundColor: d.active ? "#e6f4f1" : "transparent",
                        color: d.active ? "#0f766e" : "var(--text-2)",
                        fontWeight: d.active ? 700 : 500,
                      }}
                    >
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>{d.day}</div>
                      <div style={{ fontSize: "0.875rem" }}>{d.date}</div>
                    </div>
                  ))}
                </div>

                {/* Department Filters */}
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 10 }}>
                  {["All", "Dental", "Cardiology", "Neurology", "Surgery", "Emergency", "Maternity", "ICU", "Pulmonology"].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      style={{
                        border: 0,
                        backgroundColor: selectedDept === dept ? "#16324f" : "#f1f5f9",
                        color: selectedDept === dept ? "#ffffff" : "var(--text-2)",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dept}
                    </button>
                  ))}
                </div>

                {/* Schedule Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", backgroundColor: "#f8fafc", borderRadius: 6 }}>
                    <span style={{ color: "var(--text-3)", fontWeight: 600, width: 64 }}>07:00 AM</span>
                    <span style={{ fontWeight: 600 }}>Dr. Matsumoto Issei</span>
                    <span className="badge badge-teal" style={{ marginLeft: "auto" }}>Dental</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", backgroundColor: "#f8fafc", borderRadius: 6 }}>
                    <span style={{ color: "var(--text-3)", fontWeight: 600, width: 64 }}>08:00 AM</span>
                    <span style={{ fontWeight: 600 }}>Dr. Watanabe Daiki</span>
                    <span className="badge badge-warning" style={{ marginLeft: "auto" }}>Cardiology</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", backgroundColor: "#f8fafc", borderRadius: 6 }}>
                    <span style={{ color: "var(--text-3)", fontWeight: 600, width: 64 }}>09:00 AM</span>
                    <span style={{ fontWeight: 600 }}>Dr. Mori Natsuko</span>
                    <span className="badge badge-error" style={{ marginLeft: "auto" }}>Emergency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Active Staff & On Duty Personnel (Matching Reference Image 5) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Hero Staff Card */}
            <div className="card" style={{ padding: "24px 20px", borderRadius: 16, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--navy-900)" }}>Active Staff</span>
                <ArrowUpRight style={{ width: 14, height: 14, color: "var(--text-3)" }} />
              </div>

              {/* Doctor Avatar / Portrait Representation */}
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  backgroundColor: "#e0f2fe",
                  border: "3px solid #0d9488",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0369a1",
                  fontWeight: 700,
                  fontSize: "1.75rem",
                }}
              >
                MI
              </div>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#ef4444" }} />
                On Duty
              </span>

              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--navy-900)", margin: "8px 0 2px" }}>
                Dr. Matsumoto Issei
              </h3>
              <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                Dentist · Dental · DNT-021
              </div>
            </div>

            {/* On Duty Staff List Card */}
            <div className="card" style={{ padding: "20px 18px", borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--navy-900)" }}>On Duty Staff</span>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setIsAddStaffOpen(true)}
                  title="Add Staff"
                >
                  <Plus style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {staffList.map((st) => (
                  <div
                    key={st.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      backgroundColor: "var(--surface-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          backgroundColor: st.imageBg,
                          color: "var(--navy-900)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                        }}
                      >
                        {st.name.split(" ")[1]?.slice(0, 2) || "DR"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--navy-900)" }}>
                          {st.name}
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>
                          {st.department}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        backgroundColor: "#f0fdf4",
                        color: "#16a34a",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                      }}
                    >
                      {st.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Functional Actions Panel (Section 8 Buttons) */}
            <div className="card" style={{ padding: "18px 18px", borderRadius: 16 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
                Facility Controls
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", gap: 8 }}
                  onClick={() => setIsEditFacilityOpen(true)}
                >
                  <Edit3 style={{ width: 14, height: 14 }} />
                  <span>Edit Facility Details</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", gap: 8 }}
                  onClick={handleExportReport}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  <span>Export Report</span>
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ justifyContent: "flex-start", gap: 8 }}
                  onClick={() => setIsViewReferralsOpen(true)}
                >
                  <Share2 style={{ width: 14, height: 14 }} />
                  <span>View Referrals & Holds</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Reserve Bed */}
        {isReserveBedOpen && (
          <div className="overlay" onClick={() => setIsReserveBedOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Reserve Inpatient Bed</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Place immediate bed hold for transfer or priority admission
                  </p>
                </div>
              </div>
              <div className="modal-body stack gap-3">
                <div className="field">
                  <label className="label">Bed Identifier</label>
                  <input type="text" className="input" defaultValue="Bed B-04 (General Ward)" readOnly />
                </div>
                <div className="field">
                  <label className="label">Reservation Reason</label>
                  <select className="select">
                    <option>SBAR Incoming Hospital Referral</option>
                    <option>Emergency Room Resuscitation Transfer</option>
                    <option>Post-Operative Recovery Hold</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsReserveBedOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleReserveBed}>
                  Confirm Bed Hold
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Staff Member */}
        {isAddStaffOpen && (
          <div className="overlay" onClick={() => setIsAddStaffOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Add Hospital Personnel</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Assign staff to clinical department roster
                  </p>
                </div>
              </div>
              <form onSubmit={handleAddStaff}>
                <div className="modal-body stack gap-3">
                  <div className="field">
                    <label className="label">Staff Full Name</label>
                    <input
                      type="text"
                      className="input"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="e.g. Dr. Kenji Sato"
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Clinical Role</label>
                    <select
                      className="select"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                    >
                      <option value="Consultant Physician">Consultant Physician</option>
                      <option value="Staff Nurse">Staff Nurse</option>
                      <option value="Triage Officer">Triage Officer</option>
                      <option value="Radiologist">Radiologist</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Department</label>
                    <select
                      className="select"
                      value={newStaffDept}
                      onChange={(e) => setNewStaffDept(e.target.value)}
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Emergency Care">Emergency Care</option>
                      <option value="Intensive Care Unit">Intensive Care Unit</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddStaffOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Assign to Roster
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Facility Details */}
        {isEditFacilityOpen && (
          <div className="overlay" onClick={() => setIsEditFacilityOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Edit Facility Details</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Update authorized hospital parameters
                  </p>
                </div>
              </div>
              <form onSubmit={handleSaveFacility}>
                <div className="modal-body stack gap-3">
                  <div className="field">
                    <label className="label">Facility Legal Name</label>
                    <input
                      type="text"
                      className="input"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Address</label>
                    <input
                      type="text"
                      className="input"
                      value={facilityLocation}
                      onChange={(e) => setFacilityLocation(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-2 gap-2">
                    <div className="field">
                      <label className="label">Total Beds</label>
                      <input
                        type="number"
                        className="input"
                        value={bedCapacityTotal}
                        onChange={(e) => setBedCapacityTotal(Number(e.target.value))}
                      />
                    </div>
                    <div className="field">
                      <label className="label">Occupied Beds</label>
                      <input
                        type="number"
                        className="input"
                        value={bedCapacityOccupied}
                        onChange={(e) => setBedCapacityOccupied(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditFacilityOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Referrals */}
        {isViewReferralsOpen && (
          <div className="overlay" onClick={() => setIsViewReferralsOpen(false)}>
            <div className="modal wide" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Facility Referrals & SBAR Activity</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Live incoming transfer requests and facility bed reservations
                  </p>
                </div>
              </div>
              <div className="modal-body stack gap-3">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Referral ID</th>
                        <th>Originating Facility</th>
                        <th>Patient Token</th>
                        <th>Priority</th>
                        <th>Required Service</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>REF-2026-081</td>
                        <td>Angul Rural PHC</td>
                        <td>PT-SYN-0842</td>
                        <td><span className="badge badge-error">CRITICAL</span></td>
                        <td>Interventional Cardiology</td>
                        <td><span className="badge badge-warning">Awaiting Bed</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>REF-2026-079</td>
                        <td>Lekki Family Clinic</td>
                        <td>PT-SYN-0014</td>
                        <td><span className="badge badge-teal">ROUTINE</span></td>
                        <td>CT Angiography</td>
                        <td><span className="badge badge-success">Accepted</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={() => setIsViewReferralsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};
