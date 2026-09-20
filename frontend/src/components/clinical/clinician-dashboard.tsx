"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell, DataState, Stat } from "@/components/common/dashboard-shell";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Consultation, TriageCase } from "@/types";
import { statusLabel } from "@/lib/status-label";

export function ClinicianDashboard() {
  const { user, isDoctor } = useAuth();
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [encounters, setEncounters] = useState<Consultation[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [encounterCount, setEncounterCount] = useState(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [p, c, v] = await Promise.all([api.getPatients(), api.getCases(), api.getConsultations()]);
    if (p.error || c.error || v.error) setError(p.error || c.error || v.error || "Could not load clinical data.");
    else { setPatientCount(p.data?.total || 0); setCases(c.data || []); setEncounters(v.data?.items || []); setEncounterCount(v.data?.total || 0); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const actions = [
    ["/review", "Review queue", isDoctor ? "Review, edit and approve patient submissions." : "View submissions. Doctors complete final review."],
    ["/patients", "Patient directory", "Shared records for the clinical team."],
    ["/consultations", isDoctor ? "My consultations" : "Team consultations", isDoctor ? "Open encounters assigned to you and record notes." : "Read the clinical team's encounter notes."],
    ["/intake", "Assisted intake", "Help a patient submit symptoms and reports."],
    ...(isDoctor ? [["/triage", "AI triage", "Open the existing clinician decision support tools."]] : []),
  ];
  return <DashboardShell title={isDoctor ? "Doctor dashboard" : "Nurse dashboard"} description={"Welcome, " + user?.full_name + ". " + (isDoctor ? "Your consultations and the shared clinical review queue." : "Support intake and view the clinical team's records.")} refresh={() => void load()}>
    <DataState loading={loading} error={error} retry={() => void load()} />
    {!loading && !error && <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat title="Patients in directory" value={patientCount} /><Stat title={isDoctor ? "My encounters" : "Team encounters"} value={encounterCount} />
        <Stat title="Awaiting review · latest 50" value={cases.filter(c => c.status === "awaiting_review").length} />
        <Stat title="Urgent / priority · latest 50" value={cases.filter(c => c.queue_category !== "routine" && ["awaiting_review", "in_review"].includes(c.status)).length} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{actions.map(([href, title, description]) => <Link href={href} key={href} className="bg-white border rounded-xl p-5 hover:border-teal-500"><h2 className="font-bold text-teal-800">{title} →</h2><p className="mt-2 text-sm text-slate-600">{description}</p></Link>)}</div>
      <section className="bg-white border rounded-2xl p-6 space-y-3"><h2 className="text-lg font-bold">Recent encounters</h2>
        {encounters.length === 0 ? <p className="text-sm text-slate-500">No encounters available for your account.</p> : encounters.slice(0, 5).map(c => <Link key={c.id} href="/consultations" className="block rounded-xl border p-4 hover:bg-teal-50"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{c.patient?.first_name} {c.patient?.last_name}</strong><span>{statusLabel(c.status)}</span></div><p className="text-sm text-slate-600 mt-2">{c.chief_complaint}</p></Link>)}
      </section><ClinicalDisclaimer />
    </>}
  </DashboardShell>;
}