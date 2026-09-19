"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  BrainCircuit,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Plus,
  Stethoscope,
  Activity,
  FileCheck2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { Patient, Consultation } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [auditCount, setAuditCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    setLoading(true);
    const [pRes, cRes, aRes] = await Promise.all([
      api.getPatients(),
      api.getConsultations(),
      api.getAuditLogs(10),
    ]);

    if (pRes.data) setPatients(pRes.data.items);
    if (cRes.data) setConsultations(cRes.data.items);
    if (aRes.data) setAuditCount(aRes.data.total);
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-teal-600 font-medium">
            <Activity className="w-5 h-5 animate-pulse" />
            Loading Clinical Dashboard...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const criticalCount = consultations.filter(
    (c) => c.triage_level === "critical" || c.triage_level === "urgent"
  ).length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider mb-1">
              <span>Clinical Intelligence Center</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user?.full_name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Clinova AI Clinical Decision Support &amp; EHR Workflow System
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/triage"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <BrainCircuit className="w-4 h-4" />
              Launch AI Triage
            </Link>
          </div>
        </div>

        {/* Clinical KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Active Patients</span>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{patients.length}</div>
            <div className="mt-1 text-xs text-slate-500">Enrolled medical charts</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Encounters</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{consultations.length}</div>
            <div className="mt-1 text-xs text-slate-500">Clinical consultations</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Triage Alerts</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-rose-600">{criticalCount}</div>
            <div className="mt-1 text-xs text-slate-500">Critical / Urgent acuity</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Audit Records</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900">{auditCount}</div>
            <div className="mt-1 text-xs text-slate-500">HIPAA-ready access logs</div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/triage"
            className="p-5 bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-200 hover:border-teal-400 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">AI Symptom Triage</h2>
                <p className="text-xs text-slate-500">Gemini-assisted differential diagnosis &amp; urgency triage</p>
              </div>
            </div>
          </Link>

          <Link
            href="/patients"
            className="p-5 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-200 hover:border-blue-400 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">EHR Patient Directory</h2>
                <p className="text-xs text-slate-500">View medical charts, vitals, allergies &amp; history</p>
              </div>
            </div>
          </Link>

          <Link
            href="/consultations"
            className="p-5 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-xl group-hover:scale-105 transition-transform">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Clinical Consultations</h2>
                <p className="text-xs text-slate-500">Encounter workflow with AI SOAP note synthesis</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Active Consultations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Recent Clinical Encounters</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time consultation status and triage stratification</p>
            </div>
            <Link href="/consultations" className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Chief Complaint</th>
                  <th className="px-6 py-3">Triage Urgency</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consultations.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {c.patient ? `${c.patient.last_name}, ${c.patient.first_name}` : "Unknown"}
                      <span className="block text-[11px] text-slate-400 font-normal">{c.patient?.mrn}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{c.chief_complaint}</td>
                    <td className="px-6 py-4">
                      <TriageBadge level={c.triage_level} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/consultations"
                        className="text-xs font-semibold text-teal-600 hover:underline"
                      >
                        Open Chart &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <ClinicalDisclaimer />
      </main>

      <Footer />
    </div>
  );
}
