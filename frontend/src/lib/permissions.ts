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
    { label: "My Dashboard", href: "/dashboard/patient" },
    { label: "Start Intake", href: "/intake" },
    { label: "Documents", href: "/documents" },
    { label: "My Profile", href: "/portal/profile" },
  ],
  doctor: [
    { label: "Doctor Dashboard", href: "/dashboard/doctor" },
    { label: "Review Queue", href: "/review" },
    { label: "EHR Directory", href: "/patients" },
    { label: "Consultations", href: "/consultations" },
    { label: "AI Triage", href: "/triage" },
    { label: "Documents", href: "/documents" },
  ],
  nurse: [
    { label: "Staff Dashboard", href: "/dashboard/nurse" },
    { label: "Patient Intake", href: "/intake" },
    { label: "Review Queue", href: "/review" },
    { label: "Patients", href: "/patients" },
    { label: "Documents", href: "/documents" },
  ],
  admin: [
    { label: "Admin Console", href: "/dashboard/admin" },
    { label: "Audit Trail", href: "/audit" },
    { label: "Documents", href: "/documents" },
  ],
};
const allRoles: UserRole[] = ["patient", "doctor", "nurse", "admin"];
const clinical: UserRole[] = ["doctor", "nurse"];
const protectedPrefixes: [string, UserRole[]][] = [
  ["/dashboard/patient", ["patient"]],
  ["/dashboard/doctor", ["doctor"]],
  ["/dashboard/admin", ["admin"]],
  ["/dashboard/nurse", ["nurse"]],
  ["/dashboard/staff", ["nurse"]],
  ["/dashboard", allRoles],
  ["/portal", ["patient"]],
  ["/patients/profile", ["patient"]],
  ["/patients", clinical],
  ["/review", clinical],
  ["/consultations", clinical],
  ["/triage", ["doctor"]],
  ["/audit", ["admin"]],
  ["/intake", ["patient", "doctor", "nurse"]],
  ["/documents", allRoles],
];
export function rolesForPath(path: string): UserRole[] | null {
  return protectedPrefixes.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"))?.[1] ?? null;
}