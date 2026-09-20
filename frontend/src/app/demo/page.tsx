"use client";

import { useAuth } from "@/lib/auth";
import { dashboardPath } from "@/lib/permissions";
import React from "react";
import Link from "next/link";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Languages,
  FileText,
  Clock,
  CheckCircle2,
  Play,
  Hospital,
} from "lucide-react";

export default function DemoPage() {
  const { user, isClinician } = useAuth();
  const demoCases = [
    {
      id: "CLV-DEMO-001",
      scenario: "Campus Fever Triage Outbreak",
      facility: "Campus Health Center",
      visitType: "Campus Fever Triage",
      language: "Odia (ଓଡ଼ିଆ)",
      urgency: "PRIORITY",
      urgencyColor: "bg-amber-100 text-amber-900 border-amber-300",
      rule: "TRIAGE-R05 & TRIAGE-R01",
      description:
        "Undergraduate student presenting with acute 3-day high fever, severe frontal headache, and progressive shortness of breath.",
      patientVoice: "ମୋତେ ୩ ଦିନ ହେଲା ପ୍ରବଳ ଜ୍ୱର ଅଛି, ମୁଣ୍ଡ ବିନ୍ଧା ହେଉଛି ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି।",
    },
    {
      id: "CLV-DEMO-002",
      scenario: "Occupational Health Screening",
      facility: "Industrial Health Unit",
      visitType: "Occupational Screening",
      language: "Hindi (हिंदी)",
      urgency: "URGENT REVIEW",
      urgencyColor: "bg-rose-100 text-rose-900 border-rose-300",
      rule: "TRIAGE-R01 (Breathing Urgency)",
      description:
        "Factory machinist reporting acute-on-chronic dyspnea, heavy chest tightness, and coughing aggravated by industrial metal particulate dust.",
      patientVoice: "सांस लेने में बहुत तकलीफ हो रही है, सीने में भारीपन और फैक्ट्री में धूल की वजह से तेज खांसी है।",
    },
    {
      id: "CLV-DEMO-003",
      scenario: "Routine Outpatient with Lab Report",
      facility: "Government Hospital",
      visitType: "Outpatient",
      language: "English",
      urgency: "ROUTINE",
      urgencyColor: "bg-teal-50 text-teal-800 border-teal-200",
      rule: "None (Standard Intake)",
      description:
        "Diabetic routine check-in with complete blood count (CBC) panel extracted via OCR (Hemoglobin 12.4 g/dL, Platelets 220k).",
      patientVoice: "Routine diabetes follow-up. Mild fatigue in evenings, checking recent fasting blood sugar report.",
    },
    {
      id: "CLV-DEMO-004",
      scenario: "Public Health Camp Community Screening",
      facility: "Public Health Camp",
      visitType: "Public Health Camp",
      language: "Hindi (हिंदी)",
      urgency: "ROUTINE",
      urgencyColor: "bg-teal-50 text-teal-800 border-teal-200",
      rule: "None (Standard Screening)",
      description:
        "Rural outreach camp patient reporting seasonal viral symptoms and generalized myalgia without red flags.",
      patientVoice: "कमजोरी और बदन दर्द दो दिनों से है, भूख कम लग रही है।",
    },
    {
      id: "CLV-DEMO-005",
      scenario: "Secondary / Tertiary Referral Handoff",
      facility: "Primary Health Center (PHC)",
      visitType: "Referral Preparation",
      language: "Odia (ଓଡ଼ିଆ)",
      urgency: "URGENT REVIEW",
      urgencyColor: "bg-rose-100 text-rose-900 border-rose-300",
      rule: "TRIAGE-R04 (Cardiovascular Urgency)",
      description:
        "Elderly patient with crushing substernal chest pressure radiating to left arm and diaphoresis; formal referral note drafted.",
      patientVoice: "ଛାତିରେ ପ୍ରବଳ ଯନ୍ତ୍ରଣା ହେଉଛି ଏବଂ ବାମ ହାତକୁ ଯନ୍ତ୍ରଣା ବ୍ୟାପୁଛି, ପ୍ରବଳ ଝାଳ ବାହାରୁଛି।",
    },
    {
      id: "CLV-DEMO-006",
      scenario: "Chronic Disease Adherence Check-In",
      facility: "Company Clinic",
      visitType: "Follow-up",
      language: "English",
      urgency: "ROUTINE",
      urgencyColor: "bg-teal-50 text-teal-800 border-teal-200",
      rule: "None (Chronic Care)",
      description:
        "Corporate employee clinic annual hypertension medication renewal and lifestyle counseling check-in.",
      patientVoice: "Blood pressure check-up and renewal of maintenance medication prescription.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        {/* Safety Disclaimer */}
        <ClinicalDisclaimer />

        {/* Demo Center Header */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Interactive Clinical Demonstration Hub &bull; Decision Support Scenarios</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Synthetic Public Health Demo Scenarios
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Click any synthetic case below to inspect its multimodal intake transcript, Odia/Hindi translation trace, OCR report parameters, timeline synthesis, and human-in-the-loop review workflow.
          </p>
        </div>

        {/* 6 Scenario Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoCases.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900">{c.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${c.urgencyColor}`}>
                    {c.urgency}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{c.scenario}</h3>
                  <p className="text-[11px] text-teal-700 font-semibold">{c.facility}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 italic">
                  "{c.patientVoice}"
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Lang: <strong className="text-slate-800">{c.language}</strong></span>
                  <span>Rule: <strong className="text-amber-800">{c.rule}</strong></span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={isClinician ? `/review/case/${c.id}` : user ? dashboardPath(user.role) : "/login"}
                  className="w-full text-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isClinician ? "Launch case review" : user ? "My dashboard" : "Sign in to continue"}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* 3-Minute Clinical Evaluation Workflow Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            <span>Recommended 3-Minute Clinical Evaluation Workflow</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">Phase 1: Multimodal Intake</span>
              <p className="leading-relaxed">
                1. Open <strong>/intake</strong> and acknowledge the safety consent.<br />
                2. Select <strong>Odia</strong> or <strong>Hindi</strong>.<br />
                3. Click <strong>Start Voice Recording</strong> to see real-time 6-state speech transcription.<br />
                4. Click <strong>Load Synthetic CBC Sample</strong> to demonstrate OCR field extraction with confidence scores.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">Phase 2: Reviewer Queue &amp; Rules</span>
              <p className="leading-relaxed">
                1. Navigate to <strong>/review</strong> to view the prioritized queue.<br />
                2. Show how <strong>TRIAGE-R01 (Breathing)</strong> and <strong>TRIAGE-R04 (Cardiovascular)</strong> rules place cases into <strong>URGENT REVIEW</strong>.<br />
                3. Notice the zero-black-box explainable rule IDs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">Phase 3: Human Gate &amp; Referral</span>
              <p className="leading-relaxed">
                1. Open case <strong>CLV-DEMO-001</strong> or <strong>005</strong>.<br />
                2. Verify the symptom progression timeline.<br />
                3. Confirm OCR parameters and click <strong>Approve</strong> or <strong>Prepare Referral</strong>.<br />
                4. Review the printable referral support document and test <strong>Delete Case Data</strong> privacy control.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}