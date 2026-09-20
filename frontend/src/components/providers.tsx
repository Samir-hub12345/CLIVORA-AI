"use client";
import { AuthProvider } from "@/lib/auth";
import { RouteAccess } from "@/components/common/role-guard";
export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><RouteAccess>{children}</RouteAccess></AuthProvider>;
}