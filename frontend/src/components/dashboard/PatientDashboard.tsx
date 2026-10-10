"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Pill,
  FlaskConical,
  Mail,
  Download,
  HelpCircle,
  CreditCard,
  CheckCircle2,
  Clock,
  ChevronRight,
  User,
  Heart,
  Activity,
  FileText,
  ShieldCheck,
  AlertCircle,
  Plus,
  ArrowRight,
  Phone,
  MapPin,
  Lock,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useClinova } from "@/lib/referenceContext";
import { RoleGuard } from "@/components/common/RoleGuard";

export const PatientDashboard: React.FC = () => {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const {
    user,
    me,
    appointments,
    followUps,
    labs,
    toast,
    exportPdfReport,
    addAppointment,
    cancelAppointment,
    rescheduleAppointment,
  } = useClinova();

  const [activeTab, setActiveTab] = useState<
    "overview" | "records" | "appointments" | "reports" | "messages" | "followup" | "profile"
  >("overview");

  // Sync tab with search parameter from URL
  React.useEffect(() => {
    if (tabParam && ["overview", "records", "appointments", "reports", "messages", "followup", "profile"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // Form states
  const [bookingDoc, setBookingDoc] = useState("Dr. Michael Smith");
  const [bookingDate, setBookingDate] = useState("2026-10-15");
  const [bookingTime, setBookingTime] = useState("14:30");
  const [bookingReason, setBookingReason] = useState("Routine Follow-up & Vitals");

  const [rxMed, setRxMed] = useState("Lisinopril 10mg");
  const [rxNotes, setRxNotes] = useState("Standard 30-day refill request");

  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [messagesList, setMessagesList] = useState([
    {
      id: "msg-1",
      sender: "Dr. Joshua Ajose",
      time: "Yesterday at 16:40",
      subject: "Blood Pressure Review",
      body: "Your blood pressure readings look well managed on Lisinopril 10mg. Please continue the morning dose and bring your log to our December visit.",
      isPatient: false,
    },
    {
      id: "msg-2",
      sender: "Clinic Pharmacy Dispatch",
      time: "3 days ago",
      subject: "Prescription Refill Ready",
      body: "Your monthly refill for Metformin 500mg has been processed and is ready for pickup or courier delivery.",
      isPatient: false,
    },
  ]);

  const [profilePhone, setProfilePhone] = useState("+234 803 555 0142");
  const [profileAddress, setProfileAddress] = useState("14 Admiralty Way, Lekki Phase 1, Lagos");
  const [profileContactPref, setProfileContactPref] = useState("SMS");

  const patientName = user?.full_name || "Ada Okafor (Jessica)";
  const patientId = "CLN-10482";

  // Handle appointment booking
  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) {
      toast("Incomplete booking", "Please select date and time", "warning");
      return;
    }
    addAppointment({
      time: `${bookingDate} · ${bookingTime}`,
      clinician: bookingDoc,
      type: bookingReason,
      patientId: patientId,
      status: "Scheduled",
      room: "Room 1",
    });
    setIsBookModalOpen(false);
  };

  // Handle prescription request
  const handleRxRequest = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Prescription requested", `Refill request for ${rxMed} submitted to clinic pharmacy`, "success");
    setIsRxModalOpen(false);
  };

  // Handle sending message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject || !msgBody) {
      toast("Missing fields", "Please enter subject and message body", "warning");
      return;
    }
    setMessagesList((prev) => [
      {
        id: "msg_" + Date.now(),
        sender: patientName,
        time: "Just now",
        subject: msgSubject,
        body: msgBody,
        isPatient: true,
      },
      ...prev,
    ]);
    toast("Message sent", "Your secure message has been dispatched to your primary care team", "success");
    setMsgSubject("");
    setMsgBody("");
    setIsMsgModalOpen(false);
  };

  // Handle profile update
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Profile updated", "Your patient contact information has been updated securely", "success");
    setIsProfileModalOpen(false);
  };

  return (
    <RoleGuard
      allowedRoles={["PATIENT", "SYSTEM_ADMIN", "CLINICIAN"]}
      title="Patient Portal Access Restricted"
      message="Only verified patients, authorized clinicians, or system administrators may access personal health records."
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 48px" }}>
        {/* Top Header matching Reference Image 2: HealthCare+ Patient Portal */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--navy-900)" }}>Dashboard</h1>
              <span className="badge badge-teal" style={{ fontSize: "0.75rem" }}>
                Patient ID: {patientId}
              </span>
            </div>
            <p style={{ color: "var(--text-3)", fontSize: "0.9375rem", marginTop: 4 }}>
              Welcome back, {patientName}! Here’s your health overview.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-primary"
              style={{
                backgroundColor: "#16324f",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                fontWeight: 600,
              }}
              onClick={() => setIsBookModalOpen(true)}
            >
              <Plus style={{ width: 16, height: 16 }} />
              <span>+ Book Appointment</span>
            </button>
          </div>
        </header>

        {/* Navigation Tabs matching Section 4 */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {[
            { id: "overview", label: "Dashboard" },
            { id: "records", label: "My Records" },
            { id: "appointments", label: "Appointments" },
            { id: "reports", label: "Reports" },
            { id: "messages", label: "Messages" },
            { id: "followup", label: "Follow-up" },
            { id: "profile", label: "Profile" },
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

        {/* Tab 1: Overview (Main Visual Reference) */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Four Metric Cards Grid (Matching Reference Image 2) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {/* Card 1: Next Appointment */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontWeight: 500 }}>
                    Next Appointment
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy-900)", marginTop: 2 }}>
                    Dec 15
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: 2 }}>
                    Dr. Smith · 2:30 PM
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--navy-800)",
                  }}
                >
                  <Calendar style={{ width: 22, height: 22 }} />
                </div>
              </div>

              {/* Card 2: Active Medications */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontWeight: 500 }}>
                    Active Medications
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy-900)", marginTop: 2 }}>
                    4
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 500, marginTop: 2 }}>
                    All up to date
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: "#f0fdf4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#16a34a",
                  }}
                >
                  <Pill style={{ width: 22, height: 22 }} />
                </div>
              </div>

              {/* Card 3: Pending Results */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontWeight: 500 }}>
                    Pending Results
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy-900)", marginTop: 2 }}>
                    2
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#d97706", fontWeight: 500, marginTop: 2 }}>
                    Review required
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: "#fffbeb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#d97706",
                  }}
                >
                  <FlaskConical style={{ width: 22, height: 22 }} />
                </div>
              </div>

              {/* Card 4: Messages */}
              <div
                className="card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", fontWeight: 500 }}>
                    Messages
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy-900)", marginTop: 2 }}>
                    3
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#0284c7", fontWeight: 500, marginTop: 2 }}>
                    New messages
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: "#f0f9ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0284c7",
                  }}
                >
                  <Mail style={{ width: 22, height: 22 }} />
                </div>
              </div>
            </div>

            {/* Main Content Layout: Left 2/3 and Right 1/3 */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.1fr)", gap: 24 }}>
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Upcoming Appointments Card */}
                <div className="card" style={{ padding: "20px 24px", borderRadius: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Upcoming Appointments</h2>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActiveTab("appointments")}
                      style={{ color: "var(--teal-700)", fontWeight: 600 }}
                    >
                      View All
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Item 1 */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: 10,
                        backgroundColor: "#f1f5f9",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 8,
                            backgroundColor: "var(--navy-800)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <User style={{ width: 20, height: 20 }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--navy-900)" }}>
                            Dr. Michael Smith
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "var(--text-2)" }}>General Checkup</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 2 }}>
                            Dec 15, 2025 at 2:30 PM
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setBookingDoc("Dr. Michael Smith");
                            setIsBookModalOpen(true);
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toast("Appointment info", "Room 3 · Inpatient Building A", "info")}
                        >
                          Details
                        </button>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: 10,
                        backgroundColor: "#ffffff",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 8,
                            backgroundColor: "var(--teal-600)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Heart style={{ width: 20, height: 20 }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--navy-900)" }}>
                            Dr. Emily Davis
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "var(--text-2)" }}>
                            Cardiology Consultation
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 2 }}>
                            Dec 22, 2025 at 10:00 AM
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setBookingDoc("Dr. Emily Davis");
                            setIsBookModalOpen(true);
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toast("Appointment info", "Cardiology Clinic · West Wing", "info")}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health Metrics Chart Card */}
                <div className="card" style={{ padding: "20px 24px", borderRadius: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Health Metrics</h2>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
                        Monthly blood pressure & heart rate readings
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 16, fontSize: "0.75rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--navy-900)" }}
                        />
                        Blood Pressure (Systolic)
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--teal-600)" }}
                        />
                        Heart Rate
                      </span>
                    </div>
                  </div>

                  {/* SVG Line Chart */}
                  <div style={{ width: "100%", height: 180, position: "relative" }}>
                    <svg viewBox="0 0 500 160" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="40" y1="140" x2="480" y2="140" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Y-axis Labels */}
                      <text x="25" y="24" fontSize="10" fill="#94a3b8" textAnchor="end">
                        150
                      </text>
                      <text x="25" y="64" fontSize="10" fill="#94a3b8" textAnchor="end">
                        125
                      </text>
                      <text x="25" y="104" fontSize="10" fill="#94a3b8" textAnchor="end">
                        100
                      </text>
                      <text x="25" y="144" fontSize="10" fill="#94a3b8" textAnchor="end">
                        50
                      </text>

                      {/* Blood Pressure Line (Systolic: around 120-125) */}
                      {/* Jan: 120, Feb: 118, Mar: 126, Apr: 123, May: 120, Jun: 122 */}
                      <polyline
                        fill="none"
                        stroke="#16324f"
                        strokeWidth="2.5"
                        points="60,66 140,68 220,60 300,64 380,67 460,64"
                      />
                      {/* BP Data points */}
                      <circle cx="60" cy="66" r="3.5" fill="#16324f" />
                      <circle cx="140" cy="68" r="3.5" fill="#16324f" />
                      <circle cx="220" cy="60" r="3.5" fill="#16324f" />
                      <circle cx="300" cy="64" r="3.5" fill="#16324f" />
                      <circle cx="380" cy="67" r="3.5" fill="#16324f" />
                      <circle cx="460" cy="64" r="3.5" fill="#16324f" />

                      {/* Heart Rate Line (HR: around 70-75) */}
                      {/* Jan: 72, Feb: 74, Mar: 70, Apr: 73, May: 71, Jun: 74 */}
                      <polyline
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="2.5"
                        points="60,122 140,120 220,125 300,121 380,123 460,120"
                      />
                      {/* HR Data points */}
                      <circle cx="60" cy="122" r="3.5" fill="#0d9488" />
                      <circle cx="140" cy="120" r="3.5" fill="#0d9488" />
                      <circle cx="220" cy="125" r="3.5" fill="#0d9488" />
                      <circle cx="300" cy="121" r="3.5" fill="#0d9488" />
                      <circle cx="380" cy="123" r="3.5" fill="#0d9488" />
                      <circle cx="460" cy="120" r="3.5" fill="#0d9488" />

                      {/* X-axis Labels */}
                      <text x="60" y="156" fontSize="10" fill="#64748b" textAnchor="middle">
                        Jan
                      </text>
                      <text x="140" y="156" fontSize="10" fill="#64748b" textAnchor="middle">
                        Feb
                      </text>
                      <text x="220" y="156" fontSize="10" fill="#64748b" textAnchor="middle">
                        Mar
                      </text>
                      <text x="300" y="156" fontSize="10" fill="#64748b" textAnchor="middle">
                        Apr
                      </text>
                      <text x="380" y="156" fontSize="10" fill="#64748b" textAnchor="middle">
                        May
                      </text>
                      <text x="460" y="156" fontSize="10" fill="#64748b" textAnchor="middle">
                        Jun
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Quick Actions Card */}
                <div className="card" style={{ padding: "20px 24px", borderRadius: 12 }}>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, marginBottom: 14 }}>
                    Quick Actions
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button
                      className="btn btn-secondary"
                      style={{
                        justifyContent: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        height: "auto",
                        borderRadius: 8,
                      }}
                      onClick={() => exportPdfReport("CASE-SYNTH-003")}
                    >
                      <Download style={{ width: 16, height: 16, color: "var(--teal-600)" }} />
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Download Records</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{
                        justifyContent: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        height: "auto",
                        borderRadius: 8,
                      }}
                      onClick={() => setIsRxModalOpen(true)}
                    >
                      <Pill style={{ width: 16, height: 16, color: "var(--teal-600)" }} />
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Request Prescription</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{
                        justifyContent: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        height: "auto",
                        borderRadius: 8,
                      }}
                      onClick={() => setIsMsgModalOpen(true)}
                    >
                      <HelpCircle style={{ width: 16, height: 16, color: "var(--teal-600)" }} />
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Ask a Question</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{
                        justifyContent: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        height: "auto",
                        borderRadius: 8,
                      }}
                      onClick={() => setIsPayModalOpen(true)}
                    >
                      <CreditCard style={{ width: 16, height: 16, color: "var(--teal-600)" }} />
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Pay Bill</span>
                    </button>
                  </div>
                </div>

                {/* Recent Results Card */}
                <div className="card" style={{ padding: "20px 24px", borderRadius: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Recent Results</h2>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setActiveTab("reports")}
                      style={{ color: "var(--teal-700)", fontWeight: 600 }}
                    >
                      View All
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: 8,
                        backgroundColor: "var(--surface-subtle)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Blood Panel</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>May 1, 2025</div>
                      </div>
                      <span
                        className="badge badge-success"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedReport({ name: "Blood Panel", date: "May 1, 2025", status: "Normal" });
                        }}
                      >
                        Normal
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: 8,
                        backgroundColor: "var(--surface-subtle)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>X-Ray Chest</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>Jun 28, 2025</div>
                      </div>
                      <span
                        className="badge badge-warning"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedReport({ name: "X-Ray Chest", date: "Jun 28, 2025", status: "Pending" });
                        }}
                      >
                        Pending
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current Medications Preview */}
                <div className="card" style={{ padding: "20px 24px", borderRadius: 12 }}>
                  <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, marginBottom: 12 }}>
                    Current Medications
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.8125rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-2)" }}>
                      <span>Lisinopril 10mg</span>
                      <span className="muted">1 tab / day</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-2)" }}>
                      <span>Metformin 500mg</span>
                      <span className="muted">2 tabs / day</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-2)" }}>
                      <span>Atorvastatin 20mg</span>
                      <span className="muted">1 tab at night</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Records */}
        {activeTab === "records" && (
          <div className="card" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Authorized Personal Health Record</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Record ownership verified · {patientName} ({patientId})
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => exportPdfReport("CASE-SYNTH-003")}>
                <Download style={{ width: 15, height: 15 }} />
                <span>Download Certified PDF</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--navy-900)" }}>Diagnoses on File</h3>
                <ul style={{ paddingLeft: 18, marginTop: 8, fontSize: "0.875rem", color: "var(--text-2)" }}>
                  <li>Primary Essential Hypertension (Controlled)</li>
                  <li>Type 2 Diabetes Mellitus (Stable)</li>
                  <li>Hyperlipidemia</li>
                </ul>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--navy-900)" }}>Recorded Allergies</h3>
                <ul style={{ paddingLeft: 18, marginTop: 8, fontSize: "0.875rem", color: "var(--text-2)" }}>
                  <li>Penicillin · Mild cutaneous rash (Verified)</li>
                  <li>No food or environmental allergies known</li>
                </ul>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--navy-900)" }}>Primary Care Provider</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-2)", marginTop: 8 }}>
                  Dr. Joshua Ajose, MBBS
                  <br />
                  Lekki Family Health Clinic
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Appointments */}
        {activeTab === "appointments" && (
          <div className="card" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>My Consultations & Schedule</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Upcoming bookings and previous consultation history (persisted through clinic schedule API)
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsBookModalOpen(true)}>
                <Plus style={{ width: 16, height: 16 }} />
                <span>Book Appointment</span>
              </button>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Clinician</th>
                    <th>Type</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.time}</td>
                      <td>{a.clinician}</td>
                      <td>{a.type}</td>
                      <td className="subtle">{a.room || "Room 1"}</td>
                      <td>
                        <span
                          className={`badge ${
                            a.status === "Completed"
                              ? "badge-success"
                              : a.status === "Cancelled"
                              ? "badge-error"
                              : "badge-info"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {a.status !== "Cancelled" && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setBookingDoc(a.clinician);
                                  setIsBookModalOpen(true);
                                }}
                              >
                                Reschedule
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => cancelAppointment(a.id)}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => exportPdfReport("CASE-SYNTH-003")}
                          >
                            PDF Note
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Reports */}
        {activeTab === "reports" && (
          <div className="card" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Laboratory & Clinical Reports</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Authorized diagnostic results approved by your attending physician
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => exportPdfReport("CASE-SYNTH-003")}>
                <Download style={{ width: 15, height: 15 }} />
                <span>Download All (PDF)</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--navy-900)" }}>Full Blood Count & Metabolic Panel</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: 2 }}>
                    Reported on May 1, 2026 · Approved by Dr. Joshua Ajose
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="badge badge-success">Normal</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => exportPdfReport("CASE-SYNTH-003")}
                  >
                    Download PDF
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--navy-900)" }}>Chest Radiograph (PA View)</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-3)", marginTop: 2 }}>
                    Acquired Jun 28, 2026 · Radiology Review verified
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="badge badge-teal">Verified</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => exportPdfReport("CASE-SYNTH-003")}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Messages */}
        {activeTab === "messages" && (
          <div className="card" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Care Team Messaging</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Secure communication channel with your clinic care providers
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsMsgModalOpen(true)}>
                <Mail style={{ width: 16, height: 16 }} />
                <span>Send Message</span>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messagesList.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    backgroundColor: m.isPatient ? "#f0fdfa" : "#f8fafc",
                    border: `1px solid ${m.isPatient ? "var(--teal-200)" : "var(--border)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{m.sender}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>{m.time}</span>
                  </div>
                  {m.subject && (
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--navy-900)", marginBottom: 4 }}>
                      {m.subject}
                    </div>
                  )}
                  <div style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>{m.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Follow-up */}
        {activeTab === "followup" && (
          <div className="card" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
                  Follow-up Reminders & Care Plan Instructions
                </h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Action items and monitoring tasks assigned by your clinical team
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {followUps.map((fu) => (
                <div
                  key={fu.id}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    borderLeft: "4px solid var(--teal-600)",
                    backgroundColor: "#f0fdfa",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--teal-700)" }}>
                      {fu.reason}
                    </div>
                    <span className="badge badge-teal">{fu.status}</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-2)", margin: "4px 0 8px" }}>
                    Assigned by: Dr. {fu.owner} · Contact preference: {fu.pref}
                  </p>
                  <span className="xs subtle">Due: {fu.due}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: Profile */}
        {activeTab === "profile" && (
          <div className="card" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Patient Profile & Preferences</h2>
                <p style={{ color: "var(--text-3)", fontSize: "0.875rem", margin: "4px 0 0" }}>
                  Manage authorized contact information and notification preferences
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => setIsProfileModalOpen(true)}>
                Edit Profile
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, fontSize: "0.875rem" }}>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  Full Legal Name
                </span>
                <span style={{ fontWeight: 600 }}>{patientName}</span>
              </div>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  Patient Identifier
                </span>
                <span style={{ fontWeight: 600 }}>{patientId}</span>
              </div>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  Mobile Phone
                </span>
                <span style={{ fontWeight: 600 }}>{profilePhone}</span>
              </div>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  Residential Address
                </span>
                <span style={{ fontWeight: 600 }}>{profileAddress}</span>
              </div>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  Contact Preference
                </span>
                <span style={{ fontWeight: 600 }}>{profileContactPref}</span>
              </div>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  Data Privacy Consent
                </span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>DPDP Act 2023 Digital Consent Signed</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal 1: Book Appointment */}
        {isBookModalOpen && (
          <div className="overlay" onClick={() => setIsBookModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Book Clinical Appointment</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Select preferred clinician, date, and appointment reason
                  </p>
                </div>
              </div>
              <form onSubmit={handleBookAppointment}>
                <div className="modal-body stack gap-3">
                  <div className="field">
                    <label className="label">Consulting Clinician</label>
                    <select
                      className="select"
                      value={bookingDoc}
                      onChange={(e) => setBookingDoc(e.target.value)}
                    >
                      <option value="Dr. Michael Smith">Dr. Michael Smith (General Medicine)</option>
                      <option value="Dr. Emily Davis">Dr. Emily Davis (Cardiology)</option>
                      <option value="Dr. Joshua Ajose">Dr. Joshua Ajose (Attending Physician)</option>
                    </select>
                  </div>

                  <div className="grid grid-2 gap-2">
                    <div className="field">
                      <label className="label">Date</label>
                      <input
                        type="date"
                        className="input"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="field">
                      <label className="label">Time</label>
                      <input
                        type="time"
                        className="input"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Reason for Visit</label>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      placeholder="Brief description of symptoms or consultation goal..."
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsBookModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Confirm Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Request Prescription */}
        {isRxModalOpen && (
          <div className="overlay" onClick={() => setIsRxModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Request Prescription Renewal</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Refill authorized active medications on file
                  </p>
                </div>
              </div>
              <form onSubmit={handleRxRequest}>
                <div className="modal-body stack gap-3">
                  <div className="field">
                    <label className="label">Medication</label>
                    <select className="select" value={rxMed} onChange={(e) => setRxMed(e.target.value)}>
                      <option value="Lisinopril 10mg">Lisinopril 10mg (Blood Pressure)</option>
                      <option value="Metformin 500mg">Metformin 500mg (Diabetes)</option>
                      <option value="Atorvastatin 20mg">Atorvastatin 20mg (Cholesterol)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Notes / Instructions</label>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={rxNotes}
                      onChange={(e) => setRxNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsRxModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Send Message */}
        {isMsgModalOpen && (
          <div className="overlay" onClick={() => setIsMsgModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Message Care Team</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Non-urgent clinical questions will be answered within 24 hours
                  </p>
                </div>
              </div>
              <form onSubmit={handleSendMessage}>
                <div className="modal-body stack gap-3">
                  <div className="field">
                    <label className="label">Subject</label>
                    <input
                      type="text"
                      className="input"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      placeholder="e.g. Question about medication timing"
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Message Body</label>
                    <textarea
                      className="textarea"
                      rows={4}
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      placeholder="Type your message here..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsMsgModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: Pay Bill */}
        {isPayModalOpen && (
          <div className="overlay" onClick={() => setIsPayModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Billing & Payment Status</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Official account statement for {patientName}
                  </p>
                </div>
              </div>
              <div className="modal-body stack gap-3">
                <div
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <CheckCircle2 style={{ width: 24, height: 24, color: "#16a34a" }} />
                  <div>
                    <div style={{ fontWeight: 700, color: "#15803d" }}>Account Balance: ₹0.00 / ₦0.00</div>
                    <div style={{ fontSize: "0.75rem", color: "#166534" }}>
                      All current clinical visits and laboratory panels are settled.
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-3)", margin: 0 }}>
                  Clinova AI public clinic model operates under open universal healthcare access guidelines. No outstanding fees are due.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={() => setIsPayModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 5: Edit Profile */}
        {isProfileModalOpen && (
          <div className="overlay" onClick={() => setIsProfileModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>Edit Patient Contact Profile</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    Update your permitted self-service contact details
                  </p>
                </div>
              </div>
              <form onSubmit={handleUpdateProfile}>
                <div className="modal-body stack gap-3">
                  <div className="field">
                    <label className="label">Mobile Phone</label>
                    <input
                      type="text"
                      className="input"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Residential Address</label>
                    <input
                      type="text"
                      className="input"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Communication Preference</label>
                    <select
                      className="select"
                      value={profileContactPref}
                      onChange={(e) => setProfileContactPref(e.target.value)}
                    >
                      <option value="SMS">SMS Text Messages</option>
                      <option value="Phone Call">Phone Call</option>
                      <option value="Email">Email</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsProfileModalOpen(false)}>
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

        {/* Modal 6: View Report Details */}
        {selectedReport && (
          <div className="overlay" onClick={() => setSelectedReport(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: "1.125rem", margin: 0 }}>{selectedReport.name}</h2>
                  <p className="xs subtle" style={{ margin: 0 }}>
                    {selectedReport.date} · Status: {selectedReport.status}
                  </p>
                </div>
              </div>
              <div className="modal-body stack gap-2">
                <p style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>
                  Verified laboratory report for {patientName} ({patientId}).
                </p>
                <div
                  style={{
                    padding: 12,
                    backgroundColor: "var(--surface-subtle)",
                    borderRadius: 8,
                    fontSize: "0.8125rem",
                  }}
                >
                  <div><strong>Panel:</strong> Complete Metabolic & Blood Work</div>
                  <div><strong>Finding:</strong> Hemoglobin 13.8 g/dL, Glucose 98 mg/dL (Normal)</div>
                  <div><strong>Authorizing Physician:</strong> Dr. Joshua Ajose</div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    exportPdfReport("CASE-SYNTH-003");
                    setSelectedReport(null);
                  }}
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};
