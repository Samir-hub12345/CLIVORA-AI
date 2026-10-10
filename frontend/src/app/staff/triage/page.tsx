"use client";

import React, { Suspense } from "react";
import { NurseDashboard } from "@/components/dashboard/NurseDashboard";

export default function NurseTriagePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Nurse Triage...</div>}>
      <NurseDashboard />
    </Suspense>
  );
}
