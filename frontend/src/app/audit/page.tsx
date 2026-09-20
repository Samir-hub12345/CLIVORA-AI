"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, FileText, Activity, Lock, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { AuditLog } from "@/types";

export default function AuditLogsPage() {
  const { isClinician, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const res = await api.getAuditLogs(100);
    if (res.data) {
      setLogs(res.data.items);
    } else {
      setError(res.error || "Unable to load data. Please retry.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {error && <div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700">{error} <button onClick={fetchLogs} className="underline ml-2">Retry</button></div>}
        {/* Title and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Lock className="w-4 h-4 text-teal-600" />
              <span>HIPAA-Ready Architectural Accountability</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Protected Health Information (PHI) Audit Trail
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable logging of all electronic health record views, mutations, and AI inferences
            </p>
          </div>

          <Button variant="secondary" onClick={fetchLogs} loading={loading} className="gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Audit Trail
          </Button>
        </div>

        <ClinicalDisclaimer />

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-teal-600 flex items-center justify-center gap-2">
              <Activity className="w-5 h-5 animate-pulse" />
              Retrieving immutable audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp (UTC)</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Actor / User</th>
                    <th className="px-6 py-3.5">Resource Type</th>
                    <th className="px-6 py-3.5">Details</th>
                    <th className="px-6 py-3.5 text-right">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {logs.map((log) => {
                    const isAi = log.action.startsWith("AI_");
                    const isAuth = log.action.startsWith("LOGIN_") || log.action.startsWith("USER_");
                    const isPatient = log.action.startsWith("PATIENT_");

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isAi
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : isAuth
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isPatient
                                ? "bg-teal-50 text-teal-700 border border-teal-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-sans font-medium text-slate-900">
                          {log.user_email || "System"}
                        </td>
                        <td className="px-6 py-3 text-slate-600">{log.resource_type}</td>
                        <td className="px-6 py-3 font-sans text-slate-600 max-w-sm truncate" title={log.details || ""}>
                          {log.details || "—"}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-400">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}