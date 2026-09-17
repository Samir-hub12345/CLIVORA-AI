"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { ClinicalDisclaimer } from "@/components/clinical/disclaimer";
import { VoiceRecorder } from "@/components/clinical/voice-recorder";
import { ReportUploader } from "@/components/clinical/report-uploader";
import { api } from "@/lib/api";
import { OCRField, TriageCase } from "@/types";
import {
  ShieldCheck,
  Languages,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Activity,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function PatientIntakePage() {
  const router = useRouter();

  // Step indicator: 1 = Consent, 2 = Context, 3 = Symptoms, 4 = Optional Report, 5 = Review & Submit
  const [step, setStep] = useState(1);
  const [consentGiven, setConsentGiven] = useState(false);

  // Patient Context
  const [preferredLang, setPreferredLang] = useState("en");
  const [facilityType, setFacilityType] = useState("Government Hospital");
  const [visitType, setVisitType] = useState("Outpatient");
  const [approxAge, setApproxAge] = useState<number | "">("");
  const [gender, setGender] = useState("Unspecified");
  const [contextNotes, setContextNotes] = useState("");

  // Symptoms & Voice
  const [symptomsText, setSymptomsText] = useState("");
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // Optional Report & OCR
  const [reportFilename, setReportFilename] = useState("");
  const [ocrFields, setOcrFields] = useState<OCRField[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [createdCase, setCreatedCase] = useState<TriageCase | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Multilingual auto-normalization
  const handleLanguageChange = async (newLang: string) => {
    setPreferredLang(newLang);
    if (symptomsText && newLang !== "en") {
      setIsTranslating(true);
      const res = await api.translateText(symptomsText, newLang);
      if (res.data) {
        setTranslatedText(res.data.translated_text);
      }
      setIsTranslating(false);
    }
  };

  const handleVoiceTranscribed = async (transcript: string, detected: string) => {
    setSpeechTranscript(transcript);
    setDetectedLang(detected);
    if (!symptomsText) {
      setSymptomsText(transcript);
    }

    if (preferredLang !== "en" || detected.toLowerCase() !== "english") {
      setIsTranslating(true);
      const res = await api.translateText(transcript, preferredLang);
      if (res.data) {
        setTranslatedText(res.data.translated_text);
      }
      setIsTranslating(false);
    }
  };

  const handleSubmitCase = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        preferred_language: preferredLang,
        facility_type: facilityType,
        visit_type: visitType,
        approximate_age: typeof approxAge === "number" ? approxAge : undefined,
        gender: gender !== "Unspecified" ? gender : undefined,
        context_notes: contextNotes,
        raw_symptoms: symptomsText || speechTranscript || "General clinical intake",
        speech_transcript: speechTranscript || undefined,
        detected_language: detectedLang || preferredLang,
        report_filename: reportFilename || undefined,
        report_ocr_data: ocrFields.length > 0 ? ocrFields : undefined,
        consent_acknowledged: consentGiven,
      };

      const res = await api.createCase(payload);
      if (res.data) {
        setCreatedCase(res.data);
      } else {
        setSubmitError(res.error || "Failed to submit case. Please verify connection.");
      }
    } catch (e: any) {
      setSubmitError("Network error occurred during intake submission.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        {/* Safety Disclaimer Banner */}
        <ClinicalDisclaimer />

        {/* Success Screen after submission */}
        {createdCase ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Case ID: {createdCase.synthetic_case_id}
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                Triage Support Note Prepared Successfully
              </h2>
              <p className="text-xs text-slate-600 max-w-lg mx-auto">
                Patient information and extracted data have been organized and routed to the facility reviewer queue.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Queue Category:</span>
                <span className="font-bold text-slate-900 uppercase">
                  {createdCase.queue_category.replace("-", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility:</span>
                <span className="font-medium text-slate-800">{createdCase.facility_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Language:</span>
                <span className="font-medium text-slate-800 uppercase">{createdCase.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Human Review:</span>
                <span className="font-bold text-amber-700">Awaiting Qualified Review</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/review/case/${createdCase.id}`}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-2"
              >
                <span>Open in Reviewer Workspace</span> <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCreatedCase(null);
                  setStep(1);
                  setSymptomsText("");
                  setSpeechTranscript("");
                  setTranslatedText("");
                  setReportFilename("");
                  setOcrFields([]);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Intake Another Patient
              </button>
            </div>
          </div>
        ) : (
          /* Multi-step Intake Wizard */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Step Progress Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                Step {step} of 4:{" "}
                {step === 1 && "Demo Consent"}
                {step === 2 && "Patient Context & Language"}
                {step === 3 && "Symptom Intake (Voice/Text)"}
                {step === 4 && "Review & Submit"}
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((s) => (
                  <span
                    key={s}
                    className={`w-2 h-2 rounded-full ${
                      s === step ? "bg-teal-600 ring-2 ring-teal-200" : s < step ? "bg-teal-400" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Consent */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Demonstration Protocol &amp; Consent
                    </h3>
                    <p className="text-xs text-slate-500">
                      Please confirm understanding of this educational healthcare prototype.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 leading-relaxed">
                    <p>
                      <strong>1. Educational &amp; Prototype Use:</strong> This system is a demonstration prototype designed to organize patient-provided information. It is strictly <strong>non-diagnostic</strong> and does not prescribe medicine or medical treatments.
                    </p>
                    <p>
                      <strong>2. Synthetic Data:</strong> All cases, identification numbers, and sample laboratory reports shown in this demo are purely synthetic. Never input real Protected Health Information (PHI).
                    </p>
                    <p>
                      <strong>3. Qualified Professional Review:</strong> All AI-synthesized information, timeline organizing, and review signals must be independently evaluated and approved by a qualified medical officer.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      I understand and consent to this demonstration intake workflow and confirm that no real patient records will be used.
                    </span>
                  </label>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!consentGiven}
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <span>Continue to Patient Context</span> <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Patient Context */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Facility &amp; Patient Context
                    </h3>
                    <p className="text-xs text-slate-500">
                      Minimal synthetic context fields (No Aadhaar or personal IDs required).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Preferred Language</label>
                      <select
                        value={preferredLang}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi (हिंदी)</option>
                        <option value="or">Odia (ଓଡ଼ିଆ)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Facility Type</label>
                      <select
                        value={facilityType}
                        onChange={(e) => setFacilityType(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="Government Hospital">Government District Hospital</option>
                        <option value="PHC">Primary Health Center (PHC)</option>
                        <option value="Public Health Camp">Public Health / Outreach Camp</option>
                        <option value="Industrial Health Unit">Industrial Health Unit</option>
                        <option value="Campus Health Center">Campus Health Center</option>
                        <option value="Company Clinic">Company Employee Clinic</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700">Visit Type</label>
                      <select
                        value={visitType}
                        onChange={(e) => setVisitType(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="Outpatient">Outpatient Consultation</option>
                        <option value="Campus Fever Triage">Campus Fever Triage</option>
                        <option value="Occupational Screening">Occupational Health Screening</option>
                        <option value="Public Health Camp">Public Health Camp Screening</option>
                        <option value="Follow-up">Chronic Disease Follow-up</option>
                        <option value="Referral Preparation">Referral Preparation</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Approx. Age</label>
                        <input
                          type="number"
                          value={approxAge}
                          onChange={(e) => setApproxAge(e.target.value ? parseInt(e.target.value) : "")}
                          placeholder="e.g. 35"
                          className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-700">Gender</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="Unspecified">Unspecified</option>
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="font-bold text-slate-700">Additional Context / Facility Notes</label>
                    <input
                      type="text"
                      value={contextNotes}
                      onChange={(e) => setContextNotes(e.target.value)}
                      placeholder="e.g. Student from hostel block B, or shift worker at metal grinding unit..."
                      className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <span>Proceed to Symptom Intake</span> <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Multimodal Symptoms (Voice & Text) */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Multimodal Symptom Intake
                    </h3>
                    <p className="text-xs text-slate-500">
                      Capture patient-reported symptoms via microphone or typing. Multilingual input supported.
                    </p>
                  </div>

                  {/* 1. Voice Input */}
                  <VoiceRecorder
                    languageHint={preferredLang}
                    onTranscriptionComplete={handleVoiceTranscribed}
                  />

                  {/* 2. Text Input */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700">
                        Primary Symptoms &bull; Patient Narrative
                      </label>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {symptomsText.length} characters
                      </span>
                    </div>
                    <textarea
                      value={symptomsText}
                      onChange={(e) => setSymptomsText(e.target.value)}
                      rows={4}
                      placeholder={
                        preferredLang === "or"
                          ? "ଉଦାହରଣ: ୩ ଦିନ ଧରି ଜ୍ୱର, ମୁଣ୍ଡ ବିନ୍ଧା ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ..."
                          : preferredLang === "hi"
                          ? "उदाहरण: तीन दिनों से तेज बुखार, बदन दर्द और सांस लेने में तकलीफ..."
                          : "Example: High fever for three days, severe headache, and shortness of breath..."
                      }
                      className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs leading-relaxed"
                    />
                  </div>

                  {/* 3. Multilingual Normalization Trace */}
                  {preferredLang !== "en" && (
                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900">
                        <Languages className="w-4 h-4 text-blue-600" />
                        <span>Language Pipeline: Original &rarr; English Representation</span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Original Language: <span className="font-bold uppercase">{preferredLang}</span>. The system preserves the original regional text while providing a clinical English representation for reviewer efficiency.
                      </p>
                      {translatedText && (
                        <div className="p-2.5 rounded-lg bg-white border border-blue-200 text-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Normalized English Note
                          </span>
                          <span>{translatedText}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Optional Report Upload */}
                  <ReportUploader
                    onReportExtracted={(filename, fields) => {
                      setReportFilename(filename);
                      setOcrFields(fields);
                    }}
                  />

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={!symptomsText && !speechTranscript}
                      onClick={() => setStep(4)}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <span>Review Captured Data</span> <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {step === 4 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Review Captured Case Information
                    </h3>
                    <p className="text-xs text-slate-500">
                      Verify captured symptoms and attached reports before generating the structured triage note.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block">Facility</span>
                        <span className="font-bold text-slate-800">{facilityType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block">Visit Type</span>
                        <span className="font-bold text-slate-800">{visitType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block">Language</span>
                        <span className="font-bold text-slate-800 uppercase">{preferredLang}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block">Context</span>
                        <span className="font-bold text-slate-800">
                          {approxAge ? `${approxAge}yo` : "Adult"} &bull; {gender}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400 text-[10px] uppercase block">
                        Captured Symptoms
                      </span>
                      <p className="text-slate-800 font-medium">
                        {symptomsText || speechTranscript}
                      </p>
                    </div>

                    {reportFilename && (
                      <div className="space-y-1 pt-1">
                        <span className="text-slate-400 text-[10px] uppercase block">
                          Attached Medical Report
                        </span>
                        <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{reportFilename}</span>
                          <span className="text-sky-700 font-bold">{ocrFields.length} parameters extracted</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {submitError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmitCase}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Triage Support Note...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Submit for Qualified Review</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
