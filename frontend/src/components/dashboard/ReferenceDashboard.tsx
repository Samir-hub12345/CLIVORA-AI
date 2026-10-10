"use client";

import React from "react";
import { useClinova } from "@/lib/referenceContext";
import { PatientDashboard } from "./PatientDashboard";
import { ReceptionistDashboard } from "./ReceptionistDashboard";
import { NurseDashboard } from "./NurseDashboard";
import { ClinicianDashboard } from "./ClinicianDashboard";
import { FacilityAdminDashboard } from "./FacilityAdminDashboard";
import { SystemAdminDashboard } from "./SystemAdminDashboard";

export const ReferenceDashboard: React.FC = () => {
  const { user } = useClinova();
  const role = (user?.role || "CLINICIAN").toUpperCase();

  if (role === "PATIENT") {
    return <PatientDashboard />;
  }
  if (role === "RECEPTIONIST") {
    return <ReceptionistDashboard />;
  }
  if (role === "NURSE") {
    return <NurseDashboard />;
  }
  if (role === "FACILITY_ADMIN") {
    return <FacilityAdminDashboard />;
  }
  if (role === "SYSTEM_ADMIN" || role === "AUDITOR" || role === "ADMIN") {
    return <SystemAdminDashboard />;
  }

  // Default: Clinician / Doctor
  return <ClinicianDashboard />;
};
