import Link from "next/link";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { Stethoscope, BrainCircuit, Users, Lock, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";

export default function Home() {
  const pillars = [
    {
      icon: <BrainCircuit className="w-6 h-6 text-teal-600" />,
      title: "AI Clinical Decision Support",
      href: "/triage",
      action: "Launch Triage Console",
      description:
        "Augment physician workflows with real-time diagnostic differential reasoning and physiological urgency stratification powered by Gemini AI.",
    },
    {
      icon: <Stethoscope className="w-6 h-6 text-blue-600" />,
      title: "Intelligent Encounters & Consultations",
      href: "/consultations",
      action: "Open Consultations",
      description:
        "Automated encounter intake, physician workflow tracking, and instant AI-assisted synthesis of structured SOAP clinical documentation.",
    },
    {
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      title: "EHR & Clinical Patient Charts",
      href: "/patients",
      action: "View Patient Directory",
      description:
        "Comprehensive electronic health record management with unique MRNs, allergy alerts, vital signs timeline, and medical history.",
    },
    {
      icon: <Lock className="w-6 h-6 text-emerald-600" />,
      title: "HIPAA-Ready Security & Audit Trail",
      href: "/audit",
      action: "Review Audit Trail",
      description:
        "Enterprise-grade role-based access control (RBAC), cryptographic token authentication, and immutable Protected Health Information (PHI) logging.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center space-y-12">
        {/* Hero Section */}
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Working MVP &bull; Gemini AI Healthcare Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            AI-Assisted Clinical Decision Support with <span className="text-teal-600">Clinova AI</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Empowering clinicians with intelligent triage, structured SOAP note generation, and HIPAA-ready EHR management.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
            >
              Sign In to Clinical Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/triage"
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <BrainCircuit className="w-4 h-4 text-teal-600" /> Try AI Triage Console
            </Link>
          </div>
        </div>

        {/* Feature Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 inline-block p-3 rounded-xl bg-slate-50 border border-slate-100">
                  {pillar.icon}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1.5">{pillar.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={pillar.href}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 group"
                >
                  {pillar.action} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Clinical Disclaimer */}
        <div className="w-full text-left">
          <ClinicalDisclaimer />
        </div>
      </main>

      <Footer />
    </div>
  );
}
