"use client";
import { Fragment, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { rolesForPath } from "@/lib/permissions";
import { UserRole } from "@/types";

export function RoleGuard({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const { user, loading, error, refresh, logout } = useAuth();
  const router = useRouter();
  const allowed = !!user && roles.includes(user.role);
  useEffect(() => {
    if (loading || error) return;
    if (!user) router.replace("/login");
    else if (!allowed) router.replace("/unauthorized");
  }, [user, loading, error, allowed, router]);
  if (error) return <main className="m-auto max-w-lg p-8 text-center space-y-4" role="alert">
    <h1 className="text-xl font-bold">Session could not be verified</h1><p>{error}</p>
    <button className="px-4 py-2 bg-teal-700 text-white rounded-lg" onClick={() => void refresh()}>Retry</button>
    <button className="ml-3 underline" onClick={logout}>Sign out</button>
  </main>;
  if (loading || !allowed) return <main className="m-auto p-8 text-teal-700" role="status">Checking your access…</main>;
  // Mount children only after /auth/me has verified the session.
  return <Fragment key={user?.id + ":" + user?.role}>{children}</Fragment>;
}
export function RouteAccess({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const denied = () => router.replace("/unauthorized");
    window.addEventListener("clinova:access-denied", denied);
    return () => window.removeEventListener("clinova:access-denied", denied);
  }, [router]);
  const roles = pathname ? rolesForPath(pathname) : null;
  return roles ? <RoleGuard roles={roles}>{children}</RoleGuard> : <>{children}</>;
}