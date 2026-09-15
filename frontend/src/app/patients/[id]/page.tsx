"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Activity,
  AlertTriangle,
  Pill,
  History,
  Calendar,
  ArrowLeft,
  BrainCircuit,
  Phone,
  Mail,
  Heart,
} from "lucide-react";
import { api } from "@/lib/api";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TriageBadge } from "@/components/clinical/triage-badge";
import { Patient, Consultation } from "@/types";

export default function PatientChartPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      loadChart();
    }
  }, [patientId]);

  const loadChart = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      api.getPatient(patientId),
      api.getConsultations({ patientId }),
    ]);

    if (pRes.data) setPatient(pRes.data);
    if (cRes.data) setConsultations(cRes.data.items);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-teal-600 font-medium">
            <Activity className="w-5 h-5 animate-pulse" />
            Loading Patient Medical Chart...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Patient Not Found</h2>
          <Button onClick={() => router.push("/patients")}>Back to Directory</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Patient Directory
          </Link>
          <div className="flex gap-2">
            <Link
              href={`/triage?patientId=${patient.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <BrainCircuit className="w-3.5 h-3.5" /> Start AI Triage
            </Link>
          </div>
        </div>

        {/* Patient Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100 flex-shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {patient.last_name}, {patient.first_name}
                </h1>
                <Badge variant="outline" className="font-mono text-xs text-teal-700">
                  {patient.mrn}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                <span>DOB: <strong className="text-slate-700">{patient.date_of_birth}</strong></span>
                <span>Gender: <strong className="text-slate-700">{patient.gender}</strong></span>
                <span>Blood: <strong className="text-slate-700">{patient.blood_group || "N/A"}</strong></span>
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {patient.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start md:items-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            {patient.emergency_contact && (
              <div className="text-xs text-slate-500 text-right">
                <span className="font-semibold text-slate-700 block">Emergency Contact</span>
                {patient.emergency_contact}
              </div>
            )}
          </div>
        </div>

        {/* Medical History & Allergies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Allergies Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Known Allergies &amp; Alerts</span>
            </div>
            {patient.allergies ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                {patient.allergies}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No known drug allergies (NKDA) recorded.</p>
            )}
          </div>

          {/* Current Medications */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-3">
              <Pill className="w-4 h-4" />
              <span>Current Medications</span>
            </div>
            {patient.current_medications ? (
              <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                {patient.current_medications}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">No active outpatient prescriptions recorded.</p>
            )}
          </div>

          {/* Chronic Medical History */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-teal-700 font-bold text-sm mb-3">
              <History className="w-4 h-4" />
              <span>Medical History</span>
            </div>
            {patient.medical_history ? (
              <p className="text-xs text-slate-700 leading-relaxed bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                {patient.medical_history}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">No chronic medical conditions documented.</p>
            )}
          </div>
        </div>

        {/* Clinical Encounters & Consultations Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Clinical Encounters &amp; Consultations</h2>
              <p className="text-xs text-slate-500">Chronological history of provider evaluations &amp; SOAP notes</p>
            </div>
          </div>

          {consultations.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No previous clinical consultations recorded for this patient.
            </div>
          ) : (
            <div className="space-y-6">
              {consultations.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-900">
                        {new Date(c.scheduled_at).toLocaleDateString()} at{" "}
                        {new Date(c.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <TriageBadge level={c.triage_level} />
                    </div>
                    <span className="text-xs text-slate-500 uppercase font-semibold">
                      Status: {c.status}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800 mb-2">
                    Chief Complaint: <span className="font-normal text-slate-700">{c.chief_complaint}</span>
                  </div>

                  {c.assessment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <strong className="text-slate-900 block mb-0.5">Clinical Assessment:</strong>
                        <p className="text-slate-600 whitespace-pre-line">{c.assessment}</p>
                      </div>
                      <div>
                        <strong className="text-slate-900 block mb-0.5">Treatment Plan:</strong>
                        <p className="text-slate-600 whitespace-pre-line">{c.plan}</p>
                      </div>
                    </div>
                  )}

                  {c.ai_generated_summary && (
                    <div className="mt-3 p-3 bg-teal-50/70 border border-teal-200 rounded-lg text-xs text-teal-900">
                      <strong className="flex items-center gap-1 font-semibold text-teal-800 mb-1">
                        <BrainCircuit className="w-3.5 h-3.5" /> AI Clinical Synthesis:
                      </strong>
                      {c.ai_generated_summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
