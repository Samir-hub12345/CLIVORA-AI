"use client";

import React, { Suspense } from "react";
import { FacilityAdminDashboard } from "@/components/dashboard/FacilityAdminDashboard";

export default function FacilitiesPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Facility Management...</div>}>
      <FacilityAdminDashboard />
    </Suspense>
  );
}
