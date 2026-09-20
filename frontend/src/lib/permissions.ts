import { UserRole } from "@/types";

export const dashboardForRole: Record<UserRole, string> = {
  patient: "/dashboard/patient", doctor: "/dashboard/doctor",
  admin: "/dashboard/admin", nurse: "/dashboard/nurse",
};
export function dashboardPath(role: UserRole): string {
  return dashboardForRole[role] || "/unauthorized";
}
type NavItem = { label: string; href: string };
export const navigationByRole: Record<UserRole, NavItem[]> = {
  patient: [
    { label: "My dashboard", href: "/dashboard/patient" },
    { label: "Start intake", href: "/intake" },
    { label: "My profile", href: "/portal/profile" },
  ],
  doctor: [
    { label: "Dashboard", href: "/dashboard/doctor" },
    { label: "Review queue", href: "/review" },
    { label: "Patients", href: "/patients" },
    { label: "Consultations", href: "/consultations" },
    { label: "AI triage", href: "/triage" },
    { label: "Intake", href: "/intake" },
  ],
  nurse: [
    { label: "Dashboard", href: "/dashboard/nurse" },
    { label: "Review queue", href: "/review" },
    { label: "Patients", href: "/patients" },
    { label: "Consultations", href: "/consultations" },
    { label: "Intake", href: "/intake" },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Accounts", href: "/dashboard/admin#accounts" },
    { label: "Audit trail", href: "/audit" },
  ],
};
const allRoles: UserRole[] = ["patient", "doctor", "nurse", "admin"];
const clinical: UserRole[] = ["doctor", "nurse"];
const protectedPrefixes: [string, UserRole[]][] = [
  ["/dashboard/patient", ["patient"]], ["/dashboard/doctor", ["doctor"]],
  ["/dashboard/admin", ["admin"]], ["/dashboard/nurse", ["nurse"]],
  ["/dashboard", allRoles], ["/portal", ["patient"]],
  ["/patients", clinical], ["/review", clinical],
  ["/consultations", clinical], ["/triage", clinical],
  ["/audit", ["admin"]], ["/intake", ["patient", "doctor", "nurse"]],
];
export function rolesForPath(path: string): UserRole[] | null {
  return protectedPrefixes.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"))?.[1] ?? null;
}