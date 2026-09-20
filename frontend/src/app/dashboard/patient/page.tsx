import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, FileText, UserRound } from "lucide-react";
import { DashboardShell, DataState, Stat } from "@/components/common/dashboard-shell";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statusLabel } from "@/lib/status-label";
import { Patient, PatientCase, PatientConsultation } from "@/types";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Patient | null>(null);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [consultations, setConsultations] = useState<PatientConsultation[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const [p, c, v] = await Promise.all([api.getMyProfile(), api.getMyCases(), api.getMyConsultations()]);
    if (p.error || c.error || v.error) setError(p.error || c.error || v.error || "Could not load your records.");
    else { setProfile(p.data ?? null); setCases(c.data || []); setConsultations(v.data || []); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <DashboardShell title={"Hello, " + (user?.full_name || "there")} description="Share your symptoms, follow your review, and view your own records." refresh={() => void load()}>
    <DataState loading={loading} error={error} retry={() => void load()} />
    {!loading && !error && <>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat title="My submissions" value={cases.length} />
        <Stat title="Awaiting review" value={cases.filter(c => ["awaiting_review", "in_review"].includes(c.status)).length} />
        <Stat title="My consultations" value={consultations.length} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/intake" className="p-6 rounded-2xl bg-teal-700 text-white space-y-3 hover:bg-teal-800"><ClipboardList /><h2 className="font-bold text-lg">Start a new intake</h2><p className="text-sm text-teal-50">Consent → Your details → Symptoms → Report → Submit</p><span className="inline-flex items-center gap-2 text-sm font-semibold">Get started <ArrowRight size={16} /></span></Link>
        <a href="#submissions" className="p-6 rounded-2xl bg-white border space-y-3"><FileText className="text-teal-700" /><h2 className="font-bold text-lg">My submissions</h2><p className="text-sm text-slate-600">Check status and open details of information you have submitted.</p></a>
        <Link href="/portal/profile" className="p-6 rounded-2xl bg-white border space-y-3"><UserRound className="text-teal-700" /><h2 className="font-bold text-lg">My profile</h2><p className="text-sm text-slate-600">{profile ? "View your medical information and update contact details." : "Complete your profile so future consultations can be linked to you."}</p></Link>
      </div>
      <section id="submissions" className="scroll-mt-24 bg-white rounded-2xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">My intake submissions</h2>
        {cases.length === 0 ? <p className="text-sm text-slate-500">No submissions yet. Start an intake to share your symptoms with the clinical team.</p> : cases.map(c => <details key={c.id} className="border rounded-xl p-4">
          <summary className="cursor-pointer flex flex-wrap gap-3 justify-between font-semibold text-sm"><span>{c.synthetic_case_id} · {new Date(c.created_at).toLocaleDateString()}</span><span className="text-teal-700">{statusLabel(c.status)}</span></summary>
          <div className="pt-4 space-y-3 text-sm"><p><strong>Visit:</strong> {c.visit_type} · {c.facility_type}</p><p className="whitespace-pre-wrap"><strong>Your symptoms:</strong> {c.raw_symptoms}</p>
            <p><strong>Attached report:</strong> {c.report_filename || "No report attached"}</p>
            {c.summary ? <p className="rounded-lg bg-teal-50 p-3"><strong>Reviewed summary:</strong> {c.summary}</p> : <p className="text-slate-500">A reviewed summary will appear when the doctor completes the review.</p>}
          </div>
        </details>)}
      </section>
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h2 className="text-lg font-bold">My consultations</h2>
        {consultations.length === 0 ? <p className="text-sm text-slate-500">No consultations are linked to your profile yet.</p> : consultations.map(c => <details key={c.id} className="border rounded-xl p-4">
          <summary className="cursor-pointer text-sm font-semibold">{c.chief_complaint} — {statusLabel(c.status)}</summary>
          <div className="pt-3 text-sm space-y-2"><p>{new Date(c.scheduled_at).toLocaleString()} · {c.doctor_name}</p><p>{c.summary || "Your completed consultation summary will appear here."}</p></div>
        </details>)}
      </section>
      <ClinicalDisclaimer />
    </>}
  </DashboardShell>;
}