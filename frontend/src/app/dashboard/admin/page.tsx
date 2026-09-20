"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell, DataState, Stat } from "@/components/common/dashboard-shell";
import { api } from "@/lib/api";
import { AdminOverview, User } from "@/types";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [o, u] = await Promise.all([api.getAdminOverview(), api.getAdminUsers()]);
    if (o.error || u.error) setError(o.error || u.error || "Could not load administration data.");
    else { setOverview(o.data || null); setUsers(u.data || []); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <DashboardShell title="Admin dashboard" description="Account overview, operational totals, and access activity." refresh={() => void load()}>
    <DataState loading={loading} error={error} retry={() => void load()} />
    {!loading && !error && overview && <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"><Stat title="Accounts" value={overview.users} /><Stat title="Patient records" value={overview.patients} /><Stat title="Consultations" value={overview.consultations} /><Stat title="Intake submissions" value={overview.cases} /><Stat title="Awaiting review" value={overview.awaiting_review} /><Stat title="Audit records" value={overview.audit_records} /></div>
      <Link href="/audit" className="block rounded-2xl p-6 bg-teal-700 text-white"><h2 className="text-lg font-bold">Open audit trail →</h2><p className="mt-2 text-sm text-teal-50">Review who accessed or changed information in the application.</p></Link>
      <section id="accounts" className="scroll-mt-24 bg-white border rounded-2xl p-6 space-y-4"><h2 className="text-lg font-bold">Account and role overview</h2>
        <p className="text-sm text-slate-500">Staff accounts are provisioned by the system operator. Public sign-up creates patient accounts.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="py-3 pr-4">Name</th><th className="pr-4">Email</th><th className="pr-4">Role</th><th>Status</th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-b last:border-0"><td className="py-3 pr-4 font-medium">{u.full_name}</td><td className="pr-4">{u.email}</td><td className="pr-4 capitalize">{u.role}</td><td>{u.is_active ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div>
      </section>
    </>}
  </DashboardShell>;
}