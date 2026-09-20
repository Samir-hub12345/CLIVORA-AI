"use client";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell, DataState } from "@/components/common/dashboard-shell";
import { api } from "@/lib/api";
import { Patient, PortalProfileInput } from "@/types";

const empty: PortalProfileInput = { first_name: "", last_name: "", date_of_birth: "", gender: "Unspecified", phone: "", emergency_contact: "" };
export default function ProfilePage() {
  const [profile, setProfile] = useState<Patient | null>(null);
  const [form, setForm] = useState<PortalProfileInput>(empty);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null); const res = await api.getMyProfile();
    if (res.error) setError(res.error);
    else {
      const p = res.data; setProfile(p || null);
      if (p) setForm({ first_name: p.first_name, last_name: p.last_name, date_of_birth: p.date_of_birth, gender: p.gender, phone: p.phone || "", emergency_contact: p.emergency_contact || "" });
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setSaved(false); setSaveError(null);
    const res = await api.saveMyProfile(form);
    if (res.data) { setProfile(res.data); setSaved(true); } else setSaveError(res.error || "Unable to save profile.");
    setSaving(false);
  };
  const fields: [keyof PortalProfileInput, string, string, boolean][] = [
    ["first_name", "First name", "text", true], ["last_name", "Last name", "text", true],
    ["date_of_birth", "Date of birth", "date", true], ["phone", "Phone", "tel", false],
    ["emergency_contact", "Emergency contact", "text", false],
  ];
  return <DashboardShell title="My profile" description="Keep your contact details current and view information in your linked record.">
    <DataState loading={loading} error={error} retry={() => void load()} />
    {!loading && !error && <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={save} className="bg-white border rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold">{profile ? "Contact details" : "Complete your profile"}</h2>
        {fields.map(([key, label, type, required]) => <label key={key} className="block text-sm font-medium">{label}
          <input className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5" type={type} required={required} value={form[key]}
            max={type === "date" ? new Date().toISOString().slice(0,10) : undefined} maxLength={key === "phone" ? 50 : 255}
            onChange={e => { setSaved(false); setForm({ ...form, [key]: e.target.value }); }} /></label>)}
        <label className="block text-sm font-medium">Gender<select className="mt-1 block w-full rounded-lg border p-2.5" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
          {["Unspecified", "Female", "Male", "Other"].map(value => <option key={value}>{value}</option>)}</select></label>
        {saveError && <p role="alert" className="text-rose-700 text-sm">{saveError}</p>}
        {saved && <p role="status" className="text-teal-700 text-sm">Profile saved.</p>}
        <button disabled={saving} className="px-5 py-2.5 bg-teal-700 text-white rounded-lg disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button>
      </form>
      <section className="bg-white border rounded-2xl p-6 space-y-4 self-start">
        <h2 className="text-lg font-bold">My medical information</h2>
        {!profile ? <p className="text-sm text-slate-500">Save your profile to create your linked record.</p> : <>
          <p className="text-sm"><strong>Record number:</strong> {profile.mrn}</p>
          {([["Allergies", profile.allergies], ["Current medications", profile.current_medications], ["Medical history", profile.medical_history]]).map(([label, value]) => <div key={label}><h3 className="text-sm font-semibold">{label}</h3><p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{value || "Not recorded"}</p></div>)}
          <p className="text-xs text-slate-500">Ask the clinical team to correct medical information in your record.</p>
        </>}
      </section>
    </div>}
  </DashboardShell>;
}