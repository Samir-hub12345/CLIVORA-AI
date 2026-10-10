"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Users,
  Calendar,
  FlaskConical,
  Pill,
  AlertTriangle,
  Settings,
  Heart,
  X,
} from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

interface RoleChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleChooserModal: React.FC<RoleChooserModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { switchRole, toast } = useClinova();

  if (!isOpen) return null;

  const ROLES = [
    {
      id: "clinician",
      title: "Doctor",
      desc: "Manage patients and appointments",
      route: "/staff/review",
      icon: Stethoscope,
      iconBg: "#2563eb",
      borderColor: "#dbeafe",
    },
    {
      id: "nurse",
      title: "Nurse",
      desc: "Patient care and monitoring",
      route: "/staff/triage",
      icon: Users,
      iconBg: "#16a34a",
      borderColor: "#dcfce7",
    },
    {
      id: "receptionist",
      title: "Receptionist",
      desc: "Appointments and front desk",
      route: "/staff/reception",
      icon: Calendar,
      iconBg: "#9333ea",
      borderColor: "#f3e8ff",
    },
    {
      id: "clinician",
      title: "Lab Technician",
      desc: "Laboratory tests and results",
      route: "/labs",
      icon: FlaskConical,
      iconBg: "#4f46e5",
      borderColor: "#e0e7ff",
    },
    {
      id: "clinician",
      title: "Pharmacy Staff",
      desc: "Medication management",
      route: "/notes",
      icon: Pill,
      iconBg: "#06b6d4",
      borderColor: "#cffafe",
    },
    {
      id: "nurse",
      title: "ER Personnel",
      desc: "Emergency department",
      route: "/staff/triage",
      icon: AlertTriangle,
      iconBg: "#ef4444",
      borderColor: "#fee2e2",
    },
    {
      id: "sysadmin",
      title: "Administrator",
      desc: "System administration",
      route: "/system",
      icon: Settings,
      iconBg: "#475569",
      borderColor: "#f1f5f9",
    },
    {
      id: "patient",
      title: "Patient Portal",
      desc: "Health records and appointments",
      route: "/patient",
      icon: Heart,
      iconBg: "#0d9488",
      borderColor: "#ccfbf1",
    },
  ];

  const handleSelectRole = async (role: typeof ROLES[0]) => {
    try {
      await switchRole(role.id);
      toast("Role switched", `Accessing ${role.title} dashboard`, "info");
      onClose();
      router.push(role.route);
    } catch {
      onClose();
      router.push(role.route);
    }
  };

  return (
    <div className="overlay" style={{ zIndex: 90 }} onClick={onClose}>
      <div
        className="modal wide"
        style={{
          maxWidth: 820,
          borderRadius: 24,
          padding: "36px 32px 32px",
          backgroundColor: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          className="btn btn-ghost btn-icon"
          style={{ position: "absolute", top: 16, right: 16 }}
          onClick={onClose}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>

        {/* Header matching Reference Image 1 */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* Top Blue Heart Icon Circle */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)",
            }}
          >
            <Heart style={{ width: 28, height: 28, fill: "currentColor" }} />
          </div>

          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--navy-900)", margin: 0 }}>
            MediCare Hospital
          </h2>
          <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--navy-800)", marginTop: 6 }}>
            Choose your role to continue
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-3)", margin: "4px 0 0" }}>
            Select your position to access your personalized dashboard
          </p>
        </div>

        {/* Role Cards Grid matching Reference Image 1 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 16,
          }}
        >
          {ROLES.map((r, idx) => {
            const Icon = r.icon;
            return (
              <div
                key={idx}
                onClick={() => handleSelectRole(r)}
                style={{
                  padding: "24px 16px 20px",
                  borderRadius: 16,
                  border: `1.5px solid ${r.borderColor}`,
                  backgroundColor: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 10px 20px -3px rgba(0, 0, 0, 0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                }}
              >
                {/* Rounded Square Colored Icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: r.iconBg,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <Icon style={{ width: 24, height: 24 }} />
                </div>

                <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--navy-900)" }}>
                  {r.title}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 4, lineHeight: 1.35 }}>
                  {r.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
