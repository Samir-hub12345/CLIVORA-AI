"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { dashboardPath } from "@/lib/permissions";
import { Activity } from "lucide-react";

export default function DashboardGatewayPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace(dashboardPath(user.role));
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center p-6">
      <div className="flex items-center gap-3 text-teal-800 font-semibold text-sm bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <Activity className="w-5 h-5 animate-pulse text-teal-600" />
        <span>Directing to your authorized Clinova AI workspace...</span>
      </div>
    </div>
  );
}
