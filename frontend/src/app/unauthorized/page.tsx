"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { dashboardPath } from "@/lib/permissions";
import { Header } from "@/components/common/header";
export default function UnauthorizedPage() {
  const { user } = useAuth();
  return <><Header /><main className="m-auto text-center p-8 space-y-4">
    <h1 className="text-2xl font-bold">This page is not available for your role</h1>
    <p>Your account can access the features shown in your dashboard.</p>
    <Link className="inline-block bg-teal-700 text-white rounded-lg px-5 py-3" href={user ? dashboardPath(user.role) : "/login"}>{user ? "Return to my dashboard" : "Sign in"}</Link>
  </main></>;
}