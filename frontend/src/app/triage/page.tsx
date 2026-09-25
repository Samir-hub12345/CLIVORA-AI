"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BrainCircuit,
  ShieldAlert,
  AlertCircle,
  Activity,
  Heart,
  Thermometer,
  Gauge,
  Sparkles,
  ClipboardList,
  Stethoscope,
  Clock,
  CheckCircle,
  WifiOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { useConnectivity } from "@/lib/connectivity";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { Patient, TriageResponse, VitalsInput } from "@/types";

function TriageConsole() {
  const { state: networkState, isLowBandwidthActive } = useConnectivity();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams?.get("patientId") || "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>(["chest pain", "shortness of breath"]);
  const [newSymptom, setNewSymptom] = useState("");
  const [duration, setDuration] = useState("45 minutes");
  const [history, setHistory] = useState("");
  const [allergies, setAllergies] = useState("");

  // Vitals
  const [vitals, setVitals] = useState<VitalsInput>({
    blood_pressure_systolic: 165,
    blood_pressure_diastolic: 98,
    heart_rate: 110,
    respiratory_rate: 22,
    oxygen_saturation: 93,
    temperature: 37.1,
    pain_score: 8,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPatients().then((res) => {
      if (res.data) setPatients(res.data.items);
    });
  }, []);

  const addSymptom = () => {
    if (newSymptom.trim() && !symptoms.includes(newSymptom.trim())) {
      setSymptoms([...symptoms, newSymptom.trim()]);
      setNewSymptom("");
    }
  };

  const removeSymptom = (sym: string) => {
    setSymptoms(symptoms.filter((s) => s !== sym));
  };

  const handlePreFillCardiac = () => {
    setChiefComplaint("Severe crushing chest pain radiating to left arm and jaw with diaphoresis");
    setSymptoms(["chest pain", "sweating", "radiating arm pain", "shortness of breath"]);
    setDuration("30 minutes");
    setHistory("Hypertension (dx 2018), Hyperlipidemia, Tobacco use");
    setAllergies("Penicillin");
    setVitals({
      blood_pressure_systolic: 178,
      blood_pressure_diastolic: 102,
      heart_rate: 115,
      respiratory_rate: 22,
      oxygen_saturation: 92,
      temperature: 37.0,
      pain_score: 9,
    });
  };

  const handlePreFillRespiratory = () => {
    setChiefComplaint("Acute onset shortness of breath and wheezing unresponsive to rescue inhaler");
    setSymptoms(["shortness of breath", "wheezing", "cough", "tachypnea"]);
    setDuration("3 hours");
    setHistory("Asthma since age 12, previous ICU admission in 2022");
    setAllergies("Sulfa drugs");
    setVitals({
      blood_pressure_systolic: 135,
      blood_pressure_diastolic: 85,
      heart_rate: 122,
      respiratory_rate: 28,
      oxygen_saturation: 89,
      temperature: 37.4,
      pain_score: 3,
    });
  };

  const handleRunTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (networkState === "OFFLINE") {
      setError("You are currently offline. AI clinical triage requires an active network connection.");
      return;
    }
    if (symptoms.length === 0) {
      setError("Please add at least one symptom for clinical evaluation.");
      return;
    }
    setError(null);
    setLoading(true);

    const res = await api.runTriage({
      chief_complaint: chiefComplaint,
      symptoms,
      symptom_duration: duration,
      vitals,
      relevant_medical_history: history,
      patient_id: selectedPatientId || undefined,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setResult(res.data);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>AI Clinical Decision Support Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Intelligent Triage &amp; Differential Diagnosis
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Powered by Google Gemini AI with physiological acuity stratification
            </p>
          </div>

          {/* Quick Pre-fill Samples */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Quick Cases:</span>
            <button
              type="button"
              onClick={handlePreFillCardiac}
              className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 rounded-lg text-xs font-semibold transition"
            >
              🚨 Cardiac Emergency
            </button>
            <button
              type="button"
              onClick={handlePreFillRespiratory}
              className="px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 rounded-lg text-xs font-semibold transition"
            >
              🫁 Acute Dyspnea
            </button>
          </div>
        </div>

        <ClinicalDisclaimer compact />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Form Column (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Patient Encounter Intake
            </h2>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleRunTriage} className="space-y-4">
              {/* Optional Link to Patient */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enrolled Patient (Optional)
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Anonymous / Emergency Intake --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chief Complaint <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Crushing retrosternal chest pain with diaphoresis"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Symptoms Pills */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reported Symptoms <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSymptom();
                      }
                    }}
                    placeholder="Type symptom and press Enter..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={addSymptom}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {symptoms.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSymptom(s)}
                        className="text-teal-500 hover:text-teal-700"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Duration & History */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 45 mins"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Allergies</label>
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Relevant Medical History</label>
                <input
                  type="text"
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="e.g. CAD, HTN, Diabetes"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              {/* Vitals Grid */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  Bedside Vitals Signs
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium">BP Systolic</span>
                    <input
                      type="number"
                      value={vitals.blood_pressure_systolic || ""}
                      onChange={(e) =>
                        setVitals({ ...vitals, blood_pressure_systolic: Number(e.target.value) || undefined })
                      }
                      placeholder="120"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium">BP Diastolic</span>
                    <input
                      type="number"
                      value={vitals.blood_pressure_diastolic || ""}
                      onChange={(e) =>
                        setVitals({ ...vitals, blood_pressure_diastolic: Number(e.target.value) || undefined })
                      }
                      placeholder="80"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium">Heart Rate</span>
                    <input
                      type="number"
                      value={vitals.heart_rate || ""}
                      onChange={(e) =>
                        setVitals({ ...vitals, heart_rate: Number(e.target.value) || undefined })
                      }
                      placeholder="75"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium">SpO2 (%)</span>
                    <input
                      type="number"
                      value={vitals.oxygen_saturation || ""}
                      onChange={(e) =>
                        setVitals({ ...vitals, oxygen_saturation: Number(e.target.value) || undefined })
                      }
                      placeholder="98"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium">Temp (°C)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={vitals.temperature || ""}
                      onChange={(e) =>
                        setVitals({ ...vitals, temperature: Number(e.target.value) || undefined })
                      }
                      placeholder="37.0"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-medium">Pain (0-10)</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={vitals.pain_score || ""}
                      onChange={(e) =>
                        setVitals({ ...vitals, pain_score: Number(e.target.value) || undefined })
                      }
                      placeholder="0"
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {networkState === "OFFLINE" && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Offline: AI triage analysis requires an active server connection.</span>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                disabled={networkState === "OFFLINE" || loading}
                className="w-full py-3 gap-2 mt-4 text-sm font-semibold disabled:opacity-50"
              >
                <BrainCircuit className="w-4 h-4" />
                {networkState === "OFFLINE" ? "Offline — Connect to Analyze" : "Analyze Clinical Presentation"}
              </Button>
            </form>
          </div>

          {/* Results Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {!result && !loading && (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="inline-flex p-4 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100 mb-4">
                  <BrainCircuit className="w-10 h-10 text-teal-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Awaiting Clinical Inputs</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Enter symptoms and vital signs or select one of the Quick Cases above to generate real-time AI triage, emergency red flag detection, and differential diagnostic reasoning.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
                <Activity className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Evaluating Patient Presentation...</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Synthesizing differential diagnosis and physiological urgency stratification
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-6 animate-fadeIn">
                {/* Urgency Severity Header Card */}
                <div
                  className={`p-6 rounded-2xl border shadow-sm ${
                    result.urgency_level === "CRITICAL"
                      ? "bg-rose-50/80 border-rose-300 text-rose-950"
                      : result.urgency_level === "URGENT"
                      ? "bg-amber-50/80 border-amber-300 text-amber-950"
                      : "bg-teal-50/80 border-teal-300 text-teal-950"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                        Triage Urgency Stratification
                      </span>
                      <div className="text-2xl font-extrabold tracking-tight mt-0.5 flex items-center gap-2">
                        <TriageBadge level={result.urgency_level} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 bg-white/80 rounded-full border border-current shadow-xs">
                      Engine: {result.source}
                    </span>
                  </div>

                  <p className="text-xs mt-3 leading-relaxed opacity-90">{result.clinical_reasoning}</p>
                </div>

                {/* Emergency Red Flags */}
                {result.emergency_red_flags.length > 0 && (
                  <div className="p-5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900">
                    <div className="flex items-center gap-2 font-bold text-sm mb-2 text-rose-800">
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                      <span>Immediate Emergency Red Flags Identified</span>
                    </div>
                    <ul className="list-disc pl-5 text-xs space-y-1 font-medium">
                      {result.emergency_red_flags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top Differential Diagnoses */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-base text-slate-900 pb-3 border-b border-slate-100 mb-4">
                    <ClipboardList className="w-5 h-5 text-teal-600" />
                    <span>Differential Diagnoses &amp; Recommended Workup</span>
                  </div>

                  <div className="space-y-4">
                    {result.differential_diagnoses.map((diff, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="font-bold text-slate-900 text-sm">{diff.condition}</h4>
                          <Badge
                            variant={
                              diff.probability.toLowerCase() === "high"
                                ? "critical"
                                : diff.probability.toLowerCase() === "moderate"
                                ? "urgent"
                                : "secondary"
                            }
                          >
                            {diff.probability} Probability
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">{diff.rationale}</p>

                        {diff.recommended_workup.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 text-xs">
                            <strong className="text-slate-800 block text-[11px] mb-1">
                              Diagnostic Workup / Tests:
                            </strong>
                            <div className="flex flex-wrap gap-1">
                              {diff.recommended_workup.map((test, tidx) => (
                                <span
                                  key={tidx}
                                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700"
                                >
                                  {test}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Immediate Actions Checklist */}
                {result.immediate_actions.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 mb-3">
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                      <span>Immediate Bedside Clinical Actions</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {result.immediate_actions.map((act, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 flex-shrink-0"></span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <ClinicalDisclaimer />
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function TriagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-slate-50">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-teal-600 font-medium text-sm">
              <Activity className="w-5 h-5 animate-pulse" />
              Loading Clinical Triage Console...
            </div>
          </div>
          <Footer />
        </div>
      }
    >
      <TriageConsole />
    </Suspense>
  );
}
