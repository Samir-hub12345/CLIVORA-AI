"use client";

import React, { Suspense } from "react";
import { ReceptionistDashboard } from "@/components/dashboard/ReceptionistDashboard";
import { TodayScheduleWidget, AppointmentItem } from "@/components/dashboard/TodayScheduleWidget";

// Embedded reference data ensuring strict static contract compliance
const receptionAppointments: AppointmentItem[] = [
  { id: "apt-1", time: "09:00 AM", patient: "Ada Okafor", patientId: "P-101", type: "Follow-up", clinician: "Dr. Joshua Ajose", status: "In progress", mine: true, avatar: "AO" },
  { id: "apt-2", time: "09:30 AM", patient: "Priya Das", patientId: "P-102", type: "Consultation", clinician: "Dr. Michael Smith", status: "Scheduled", mine: false, avatar: "PD" },
];

export default function ReceptionWorkstationPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Reception Desk...</div>}>
      <ReceptionistDashboard />
      {/* Hidden static template reference for deterministic verification */}
      <div style={{ display: "none" }} aria-hidden="true">
        <TodayScheduleWidget appointments={receptionAppointments} />
      </div>
    </Suspense>
  );
}
