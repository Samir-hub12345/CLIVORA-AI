"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { api } from "@/lib/api";
import { ReferralNote } from "@/types";
import {
  ArrowLeft,
  Printer,
  FileCheck,
  ShieldCheck,
  Hospital,
  Clock,
  Loader2,
  Share2,
} from "lucide-react";

export default function ReferralNotePage() {
  const params = useParams();
  const caseId = params.caseId as string;

  const [referral, setReferral] = useState<ReferralNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await api.getReferralNote(caseId);
      if (res.data) {
        setReferral(res.data);
      } else {
        setError(res.error || "Unable to generate referral support document.");
      }
      setLoading(false);
    }
    if (caseId) load();
  }, [caseId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-semibold">
            <Loader2 className="w-5 h-5 animate-spin" />
            Synthesizing official referral support document...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!referral || error) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
          <p className="text-sm font-bold text-rose-700">{error || "Referral note not found."}</p>
          <Link href={`/review/case/${caseId}`} className="text-xs text-teal-600 underline font-semibold">
            Back to Case Review
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        {/* Controls bar */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href={`/review/case/${caseId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Case Review
          </Link>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" /> Print / Save Referral PDF
          </button>
        </div>

        {/* Printable Official Document */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-300 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  CLIVORA AI &bull; CLINICAL REFERRAL SUPPORT NOTE
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Institutional Healthcare Triage &bull; Multimodal Handoff Document
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="font-mono font-bold text-slate-900 block">
                  {referral.synthetic_case_id}
                </span>
                <span className="text-slate-500 text-[11px]">{referral.timestamp}</span>
              </div>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-semibold">
              Notice: Non-diagnostic information-organization document. All clinical care and emergency triage actions remain the responsibility of qualified health personnel.
            </div>
          </div>

          {/* Facility & Origin */}
          <div className="grid grid-cols-2 gap-4 text-xs pb-4 border-b border-slate-200">
            <div>
              <span className="text-slate-400 uppercase text-[10px] block">Originating Facility</span>
              <span className="font-bold text-slate-900">{referral.facility}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] block">Visit Encounter Type</span>
              <span className="font-bold text-slate-900">{referral.visit_type}</span>
            </div>
          </div>

          {/* Patient Symptoms Narrative */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
              1. Patient-Reported Clinical Narrative
            </h3>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
              "{referral.patient_reported_symptoms}"
            </div>
          </div>

          {/* Timeline */}
          {referral.timeline && referral.timeline.length > 0 && (
            <div className="space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
                2. Symptom Progression Timeline
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {referral.timeline.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{item.day}</span>
                    <span className="text-slate-600">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Lab / OCR Data */}
          {referral.available_report_data && referral.available_report_data.length > 0 && (
            <div className="space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
                3. Laboratory Parameters (Verified OCR)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {referral.available_report_data.map((f, idx) => (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px]">{f.field_name}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {f.value} {f.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Signals */}
          {referral.review_signals && referral.review_signals.length > 0 && (
            <div className="space-y-2 text-xs">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
                4. Attention Urgency Signals
              </h3>
              <div className="space-y-1.5">
                {referral.review_signals.map((s, idx) => (
                  <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
                    <strong>[{s.rule_id}]</strong> {s.signal} &bull; Matched on: "{s.source_text}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviewer Confirmed Summary & Reason */}
          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
              5. Reviewing Medical Officer Confirmation
            </h3>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Clinical Impression</span>
              <p className="text-slate-900 font-medium">{referral.reviewer_confirmed_summary}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Reason for Referral</span>
              <p className="text-slate-900 font-medium">{referral.reviewer_reason}</p>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Signed By</span>
                <span className="font-bold text-slate-900">{referral.reviewer_name}</span>
                <span className="text-slate-500 text-[11px] block">{referral.reviewer_role}</span>
              </div>
              <div className="border-t border-slate-400 px-6 pt-1 text-center">
                <span className="text-[10px] text-slate-400">Medical Officer Signature Stamp</span>
              </div>
            </div>
          </div>

          {/* Mandatory Footer Disclaimer */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 leading-relaxed">
            {referral.footer_disclaimer}
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
