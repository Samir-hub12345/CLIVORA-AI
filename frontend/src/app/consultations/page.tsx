"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Stethoscope,
  Sparkles,
  Plus,
  Save,
  CheckCircle2,
  Clock,
  User,
  Activity,
  X,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { Consultation, Patient } from "@/types";

export default function ConsultationsPage() {
  const { isClinician, user } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

  // New Consultation Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [creating, setCreating] = useState(false);

  // Active SOAP Notes Editor
  const [rawNotes, setRawNotes] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [generatingSoap, setGeneratingSoap] = useState(false);
  const [savingSoap, setSavingSoap] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [cRes, pRes] = await Promise.all([
      api.getConsultations(),
      api.getPatients(),
    ]);

    if (cRes.data) {
      setConsultations(cRes.data.items);
      if (cRes.data.items.length > 0) {
        selectConsultation(cRes.data.items[0]);
      }
    }
    if (pRes.data) {
      setPatients(pRes.data.items);
      if (pRes.data.items.length > 0) {
        setPatientId(pRes.data.items[0].id);
      }
    }
    setLoading(false);
  };

  const selectConsultation = (c: Consultation) => {
    setSelectedConsultation(c);
    setSubjective(c.subjective || "");
    setObjective(c.objective || "");
    setAssessment(c.assessment || "");
    setPlan(c.plan || "");
    setRawNotes(
      `Patient presents with: ${c.chief_complaint}.\nVitals: ${c.vitals_data || "Stable."}\nCompliant with medications. No acute decompensation noted.`
    );
    setSaveSuccess(false);
  };

  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await api.createConsultation({
      patient_id: patientId,
      chief_complaint: chiefComplaint,
      triage_level: "routine",
    });
    setCreating(false);

    if (res.data) {
      setModalOpen(false);
      setChiefComplaint("");
      await loadData();
    }
  };

  const handleGenerateSoapWithAI = async () => {
    if (!selectedConsultation) return;
    setGeneratingSoap(true);

    const res = await api.generateSoapNotes({
      patient_name: selectedConsultation.patient
        ? `${selectedConsultation.patient.first_name} ${selectedConsultation.patient.last_name}`
        : "Patient",
      chief_complaint: selectedConsultation.chief_complaint,
      encounter_notes: rawNotes,
    });

    setGeneratingSoap(false);
    if (res.data) {
      setSubjective(res.data.subjective);
      setObjective(res.data.objective);
      setAssessment(res.data.assessment);
      setPlan(res.data.plan);
    }
  };

  const handleSaveSoap = async () => {
    if (!selectedConsultation) return;
    setSavingSoap(true);

    const res = await api.updateSoapNotes(selectedConsultation.id, {
      subjective,
      objective,
      assessment,
      plan,
    });

    setSavingSoap(false);
    if (res.data) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Title and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Encounters &amp; Consultations</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Electronic SOAP documentation assisted by CLINOVA AI Gemini Clinical Intelligence
            </p>
          </div>

          {isClinician && (
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Consultation
            </Button>
          )}
        </div>

        {/* Main Grid: Consultations List (4 cols) & Active SOAP Editor (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Encounter Queue */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Encounter Queue ({consultations.length})
            </h2>

            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {consultations.map((c) => {
                const isSelected = selectedConsultation?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConsultation(c)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-teal-50/60 border-teal-400 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-sm">
                        {c.patient ? `${c.patient.last_name}, ${c.patient.first_name}` : "Patient"}
                      </span>
                      <TriageBadge level={c.triage_level} showIcon={false} />
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">{c.chief_complaint}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(c.scheduled_at).toLocaleDateString()}
                      </span>
                      <span className="capitalize font-semibold text-slate-600">{c.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: SOAP Clinical Notes Editor */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            {selectedConsultation ? (
              <>
                {/* Header of Active Consultation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {selectedConsultation.patient
                          ? `${selectedConsultation.patient.last_name}, ${selectedConsultation.patient.first_name}`
                          : "Encounter Chart"}
                      </h3>
                      <Badge variant="outline">{selectedConsultation.patient?.mrn}</Badge>
                      <TriageBadge level={selectedConsultation.triage_level} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Attending: {selectedConsultation.doctor?.full_name || "Dr. Sarah Chen, MD"} &bull;{" "}
                      {new Date(selectedConsultation.scheduled_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {saveSuccess && (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Signed &amp; Saved
                      </span>
                    )}
                    {isClinician && (
                      <Button onClick={handleSaveSoap} loading={savingSoap} className="gap-2">
                        <Save className="w-4 h-4" /> Sign &amp; Save SOAP
                      </Button>
                    )}
                  </div>
                </div>

                {/* AI SOAP Copilot Trigger */}
                {isClinician && (
                  <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-teal-600" />
                        <span>AI Clinical Documentation Copilot</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleGenerateSoapWithAI}
                        loading={generatingSoap}
                        className="gap-1.5 text-xs bg-teal-700 hover:bg-teal-800"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Synthesize SOAP Notes
                      </Button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-teal-900 mb-1">
                        Raw Encounter Transcript / Dictation / Clinical Notes
                      </label>
                      <textarea
                        rows={3}
                        value={rawNotes}
                        onChange={(e) => setRawNotes(e.target.value)}
                        placeholder="Paste or type raw conversation, bedside observations, or dictated exam findings..."
                        className="w-full p-2.5 text-xs bg-white border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                )}

                {/* SOAP Sections */}
                <div className="space-y-4">
                  {/* S: Subjective */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      S &bull; Subjective (History of Present Illness)
                    </label>
                    <textarea
                      rows={3}
                      disabled={!isClinician}
                      value={subjective}
                      onChange={(e) => setSubjective(e.target.value)}
                      placeholder="Patient reports onset of..."
                      className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* O: Objective */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      O &bull; Objective (Physical Exam &amp; Vitals)
                    </label>
                    <textarea
                      rows={3}
                      disabled={!isClinician}
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Vitals: BP, HR. Physical exam findings..."
                      className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* A: Assessment */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      A &bull; Assessment (Clinical Synthesis &amp; Diagnoses)
                    </label>
                    <textarea
                      rows={3}
                      disabled={!isClinician}
                      value={assessment}
                      onChange={(e) => setAssessment(e.target.value)}
                      placeholder="Primary clinical impression..."
                      className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  {/* P: Plan */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                      P &bull; Plan (Diagnostics, Therapeutics &amp; Follow-up)
                    </label>
                    <textarea
                      rows={3}
                      disabled={!isClinician}
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      placeholder="1. Laboratory workup... 2. Medications..."
                      className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <ClinicalDisclaimer compact />
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">
                Select an encounter from the left queue to view or document SOAP notes.
              </div>
            )}
          </div>
        </div>

        {/* Modal: Schedule Consultation */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Initiate New Consultation</h3>
                <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateConsultation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient</label>
                  <select
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.last_name}, {p.first_name} ({p.mrn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint</label>
                  <textarea
                    required
                    rows={3}
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="e.g. Acute severe headache with visual aura"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={creating}>
                    Schedule Encounter
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
