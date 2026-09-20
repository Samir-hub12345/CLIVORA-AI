"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  Stethoscope,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  FileText,
  Lock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";

export default function GetStartedPage() {
  const roles = [
    {
      id: "patient",
      title: "Patient",
      subtitle: "Symptom Intake & Personal Health Records",
      badge: "Voice & Multilingual Text",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <User className="w-6 h-6 text-blue-600" />,
      description:
        "Describe your symptoms in your own words (Odia, Hindi, or English) using speech or text, and prepare structured notes for your doctor visit.",
      primaryAction: {
        label: "Start Patient Intake",
        href: "/intake",
      },
      secondaryActions: [
        { label: "Patient Sign In", href: "/login?role=patient" },
        { label: "Create Account", href: "/register?role=patient" },
      ],
      borderHover: "hover:border-blue-400 hover:shadow-md",
    },
    {
      id: "staff",
      title: "Healthcare Staff",
      subtitle: "Triage Nurse / Intake Officer / Front Desk",
      badge: "Queue & Rapid Vitals",
      badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
      icon: <Activity className="w-6 h-6 text-teal-600" />,
      description:
        "Assist incoming patients, log preliminary vitals, digitize paper lab reports with local OCR, and queue triage cases for clinical review.",
      primaryAction: {
        label: "Staff Portal Login",
        href: "/login?role=nurse",
      },
      secondaryActions: [
        { label: "Direct Intake Desk", href: "/intake" },
        { label: "Register Staff Account", href: "/register?role=nurse" },
      ],
      borderHover: "hover:border-teal-400 hover:shadow-md",
    },
    {
      id: "doctor",
      title: "Physician / Doctor",
      subtitle: "Medical Officer / Clinical Specialist",
      badge: "Decision Review & Sign-Off",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: <Stethoscope className="w-6 h-6 text-emerald-600" />,
      description:
        "Review AI-organized summaries, inspect explainable red-flag rule triggers (TRIAGE-R01 to R06), adjust clinical priority, and provide authoritative sign-off.",
      primaryAction: {
        label: "Doctor Portal Sign In",
        href: "/login?role=doctor",
      },
      secondaryActions: [
        { label: "Open Review Queue", href: "/review" },
        { label: "Register Clinician", href: "/register?role=doctor" },
      ],
      borderHover: "hover:border-emerald-400 hover:shadow-md",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        <ClinicalDisclaimer />

        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Role-Based Healthcare Gateway</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Welcome to <span className="text-teal-600">Clinova AI</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Select your role to access the correct workflow. Clinova AI enforces strict role separation
            to maintain clinical safety, regulatory compliance, and patient data privacy.
          </p>
        </div>

        {/* 3 Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between transition-all duration-200 shadow-xs ${role.borderHover}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {role.icon}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${role.badgeColor}`}
                  >
                    {role.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{role.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{role.subtitle}</p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{role.description}</p>
              </div>

              <div className="pt-6 space-y-2.5">
                <Link
                  href={role.primaryAction.href}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>{role.primaryAction.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center justify-between pt-1 text-xs">
                  {role.secondaryActions.map((sec, idx) => (
                    <Link
                      key={idx}
                      href={sec.href}
                      className="text-slate-500 hover:text-teal-700 font-semibold transition text-[11px]"
                    >
                      {sec.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Restricted Facility Admin Notice */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Hospital &amp; Facility Administration
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Institutional supervisors, compliance officers, and IT administrators access audit logs,
                system telemetry, and staff access permissions through a restricted credential gate.
                Public self-registration is disabled for administrator roles.
              </p>
            </div>
          </div>
          <Link
            href="/login?role=admin"
            className="whitespace-nowrap px-4 py-2 border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <span>Facility Admin Login</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Existing Credentials Quick Action */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an active institutional account?{" "}
            <Link href="/login" className="text-teal-700 font-bold hover:underline">
              Sign in directly to your portal &rarr;
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
