"use client";
import { useAuth } from "@/lib/auth";
import { dashboardPath } from "@/lib/permissions";
import React from "react";
import Link from "next/link";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import {
  Mic,
  FileText,
  Languages,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Activity,
  Layers,
  Hospital,
} from "lucide-react";

export default function Home() {
  const { user, isClinician } = useAuth();
  const features = [
    {
      icon: <Mic className="w-5 h-5 text-teal-600" />,
      title: "Voice + Text Intake",
      description:
        "Capture patient symptoms via speech or text with 6-state audio transcription and localized language processing.",
    },
    {
      icon: <Languages className="w-5 h-5 text-blue-600" />,
      title: "Multilingual Normalization",
      description:
        "Preserve original Odia, Hindi, or regional inputs while translating into structured clinical English notes.",
    },
    {
      icon: <FileText className="w-5 h-5 text-sky-600" />,
      title: "Report OCR & Lab Extraction",
      description:
        "Upload lab reports (CBC, panels) with automatic parameter extraction, OCR confidence scores, and verification controls.",
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      title: "Explainable Review Signals",
      description:
        "Transparent deterministic rule triggers (TRIAGE-R01 to R06) prioritizing breathing, cardiovascular, and bleeding urgency.",
    },
    {
      icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
      title: "Human-in-the-Loop Gate",
      description:
        "Strict non-diagnostic workflow where qualified medical officers confirm, edit, or reject all AI-organized information.",
    },
    {
      icon: <Layers className="w-5 h-5 text-purple-600" />,
      title: "Referral Note Preparation",
      description:
        "Generate clean, exportable support notes for secondary and tertiary healthcare center handoffs.",
    },
  ];

  const facilityTypes = [
    "Government District Hospitals",
    "Primary Health Centers (PHC)",
    "Public Health & Outreach Camps",
    "Occupational & Industrial Units",
    "Campus & University Health Centers",
    "Company Employee Health Clinics",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 flex flex-col items-center px-4 py-10 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-10">
        {/* Persistent Amber Safety Disclaimer at Top */}
        <div className="w-full">
          <ClinicalDisclaimer />
        </div>

        {/* Hero Section */}
        <div className="space-y-4 max-w-3xl text-center mx-auto pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Clinical Decision Support &bull; Multimodal Healthcare Triage System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            CLINOVA <span className="text-teal-600">AI</span>
          </h1>

          <p className="text-lg sm:text-xl font-bold text-slate-700">
            Multimodal Healthcare Triage Assistant for Government and Institutional Health Facilities
          </p>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Organize patient-provided symptoms, voice transcripts, and medical reports into a structured, explainable triage note for faster qualified human review.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              href={user ? dashboardPath(user.role) : "/login"}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <span>{user ? "Open my dashboard" : "Sign in to get started"}</span> <ArrowRight className="w-4 h-4" />
            </Link>
            {isClinician && <Link
              href="/review"
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Reviewer Dashboard</span>
            </Link>}
            <Link
              href="/demo"
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Launch Demo Scenarios</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="space-y-4 w-full pt-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Explainable Triage Pipeline</h2>
            <p className="text-xs text-slate-500">
              Designed for high-volume Indian healthcare facilities, multilingual patients, and qualified clinician oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full text-left">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 w-fit">
                    {feat.icon}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{feat.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* India Context & Facilities Section */}
        <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-left">
          <div className="flex items-center gap-2 text-teal-700">
            <Hospital className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              India-Wide Facility Relevance &amp; Accessibility
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Built specifically to address outpatient volume bottlenecks, language diversity across Odia, Hindi, and English, variable digital infrastructure, and specialist shortages in public health settings:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {facilityTypes.map((fac, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>{fac}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible AI & Trust Banner */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200">
            <span className="block text-xs font-bold text-slate-900">Synthetic Data Only</span>
            <span className="text-[11px] text-slate-500">Zero real patient records</span>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200">
            <span className="block text-xs font-bold text-slate-900">Non-Diagnostic</span>
            <span className="text-[11px] text-slate-500">No prescriptions or treatments</span>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200">
            <span className="block text-xs font-bold text-slate-900">Human Review Required</span>
            <span className="text-[11px] text-slate-500">Doctor confirms all decisions</span>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200">
            <span className="block text-xs font-bold text-slate-900">Immutable Audit Trail</span>
            <span className="text-[11px] text-slate-500">Full provenance logging</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}