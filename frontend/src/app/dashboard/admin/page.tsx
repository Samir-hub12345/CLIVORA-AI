"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell, DataState, Stat } from "@/components/common/dashboard-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AdminOverview, User } from "@/types";
import { Activity, ShieldCheck, Trash2, RefreshCw, Server, AlertTriangle } from "lucide-react";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retention state
  const [retentionReport, setRetentionReport] = useState<any | null>(null);
  const [retentionLoading, setRetentionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [o, u] = await Promise.all([api.getAdminOverview(), api.getAdminUsers()]);
    if (o.error || u.error) {
      setError(o.error || u.error || "Could not load administration data.");
    } else {
      setOverview(o.data || null);
      setUsers(u.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRetentionSweep = async (dryRun: boolean) => {
    if (!dryRun) {
      if (
        !confirm(
          "WARNING: Permanent data purge will irreversibly delete expired soft-deleted documents and quarantined malware files. Proceed?"
        )
      ) {
        return;
      }
    }
    setRetentionLoading(true);
    const res = await api.triggerRetentionSweep(dryRun);
    setRetentionLoading(false);
    if (res.data) {
      setRetentionReport(res.data);
    } else {
      alert(res.error || "Failed to execute data retention sweep.");
    }
  };

  return (
    <DashboardShell
      title="Admin dashboard"
      description="Account overview, operational totals, telemetry & compliance lifecycle."
      refresh={() => void load()}
    >
      <DataState loading={loading} error={error} retry={() => void load()} />

      {!loading && !error && overview && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Stat title="Accounts" value={overview.users} />
            <Stat title="Patient records" value={overview.patients} />
            <Stat title="Consultations" value={overview.consultations} />
            <Stat title="Intake submissions" value={overview.cases} />
            <Stat title="Awaiting review" value={overview.awaiting_review} />
            <Stat title="Audit records" value={overview.audit_records} />
          </div>

          {/* Action Quick Links */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/audit"
              className="block rounded-2xl p-6 bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-200" />
                <h2 className="text-lg font-bold">Open Audit Trail &rarr;</h2>
              </div>
              <p className="mt-2 text-sm text-teal-50">
                Review tamper-evident logs of who accessed or modified patient health records.
              </p>
            </Link>

            <div className="rounded-2xl p-6 bg-slate-900 text-white flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-bold">Prometheus Telemetry</h2>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    LIVE
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Real-time HTTP request throughput, AI synthesis duration, and OCR processing metrics.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <a
                  href="/api/v1/metrics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                >
                  View Prometheus Scrape Endpoint (/api/v1/metrics) &rarr;
                </a>
              </div>
            </div>
          </div>

          {/* Data Retention & Disposal Lifecycle Console */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold text-slate-900">Compliance Data Retention &amp; Disposal</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  loading={retentionLoading}
                  onClick={() => handleRetentionSweep(true)}
                  className="gap-1 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Run Dry-Run Audit
                </Button>
                <Button
                  size="sm"
                  loading={retentionLoading}
                  onClick={() => handleRetentionSweep(false)}
                  className="gap-1 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Execute Purge
                </Button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Automated enforcement of HIPAA/GDPR statutory retention limits. Purges soft-deleted documents (&gt;30 days), quarantined malware files (&gt;90 days), and failed ingestion artifacts (&gt;14 days).
            </p>

            {retentionReport && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-slate-900">
                    Retention Sweep Report ({retentionReport.dry_run ? "DRY RUN" : "PERMANENT PURGE EXECUTED"})
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">{retentionReport.timestamp}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border">
                    <p className="text-[11px] text-slate-500">Candidates Found</p>
                    <p className="text-lg font-bold text-slate-900">{retentionReport.total_candidates}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border">
                    <p className="text-[11px] text-slate-500">Items Purged</p>
                    <p className="text-lg font-bold text-rose-600">{retentionReport.total_purged}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border">
                    <p className="text-[11px] text-slate-500">Storage Reclaimed</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {(retentionReport.total_bytes_freed / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                {retentionReport.rules_executed?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-semibold text-slate-700">Rules Breakdown:</p>
                    <div className="space-y-1">
                      {retentionReport.rules_executed.map((r: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] py-1 px-2 bg-white rounded border">
                          <span className="font-mono text-slate-700">{r.rule_name}</span>
                          <span className="text-slate-500">
                            {r.candidates_count} candidates &bull; {r.purged_count} purged &bull; {(r.bytes_freed / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Account & Role Overview Table */}
          <section id="accounts" className="scroll-mt-24 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Account &amp; Role Directory</h2>
            <p className="text-sm text-slate-500">
              Staff accounts are provisioned with facility-level cryptographic role assignments.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-slate-500 text-xs uppercase tracking-wider">
                    <th className="py-3 pr-4">Name</th>
                    <th className="pr-4">Email</th>
                    <th className="pr-4">Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-medium text-slate-900">{u.full_name}</td>
                      <td className="pr-4 font-mono text-xs text-slate-600">{u.email}</td>
                      <td className="pr-4">
                        <span className="capitalize px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}