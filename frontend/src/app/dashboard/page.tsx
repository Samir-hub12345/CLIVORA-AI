"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { dashboardPath } from "@/lib/permissions";
export default function DashboardRedirect() {
  const { user } = useAuth(); const router = useRouter();
  useEffect(() => { if (user) router.replace(dashboardPath(user.role)); }, [user, router]);
  return <p className="m-auto p-8" role="status">Opening your dashboard…</p>;
}