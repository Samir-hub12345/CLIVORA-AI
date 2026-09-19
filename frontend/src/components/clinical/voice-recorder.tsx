"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, RotateCcw, Check, AlertCircle, Loader2, Volume2, WifiOff } from "lucide-react";
import { api } from "@/lib/api";
import { ProvenanceBadge } from "./provenance-badge";
import { useConnectivity } from "@/lib/connectivity";

type RecorderState = "ready" | "recording" | "processing" | "transcribed" | "error";

interface VoiceRecorderProps {
  languageHint?: string;
  onTranscriptionComplete: (transcript: string, detectedLanguage: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  languageHint = "en",
  onTranscriptionComplete,
}) => {
  const { state: networkState, isLowBandwidthActive } = useConnectivity();
  const [state, setState] = useState<RecorderState>("ready");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [confidence, setConfidence] = useState(0.95);
  const [errorMessage, setErrorMessage] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    if (networkState === "OFFLINE") {
      setErrorMessage("Voice transcription requires an active internet connection. Please type symptoms manually below.");
      return;
    }
    setState("recording");
    setSeconds(0);
    setErrorMessage("");
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState("processing");

    // Send to backend speech transcription API
    try {
      const formData = new FormData();
      formData.append("language_hint", languageHint);

      const res = await api.transcribeSpeech(formData);
      if (res.data) {
        setTranscript(res.data.transcript);
        setDetectedLang(res.data.detected_language);
        setConfidence(res.data.confidence);
        setState("transcribed");
        onTranscriptionComplete(res.data.transcript, res.data.detected_language);
      } else {
        setState("error");
        setErrorMessage(res.error || "Unable to transcribe speech. Please retry.");
      }
    } catch (err: any) {
      setState("error");
      setErrorMessage("Microphone audio capture error. Falling back to manual text input.");
    }
  };

  const resetRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState("ready");
    setSeconds(0);
    setTranscript("");
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Multimodal Voice Symptom Intake</h4>
            <p className="text-xs text-slate-500">
              Speak in English, Hindi, or Odia &bull; Speech-to-Text with Demo Fallback
            </p>
          </div>
        </div>
        {state === "transcribed" && (
          <ProvenanceBadge sourceType="voice" confidence={confidence} label={detectedLang} />
        )}
      </div>

      {/* Network Notice */}
      {networkState === "OFFLINE" ? (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>You are currently offline. Voice transcription requires network connectivity. You can type your symptoms manually below.</span>
        </div>
      ) : isLowBandwidthActive ? (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
          <span className="font-semibold">Low-Bandwidth Mode active: audio compression and timeout extensions enabled.</span>
          <span className="text-[10px] bg-amber-200/80 font-bold px-1.5 py-0.5 rounded uppercase">Optimized</span>
        </div>
      ) : null}

      {/* State 1: Ready */}
      {state === "ready" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-dashed border-slate-300">
          <div className="text-xs text-slate-600 text-center sm:text-left">
            <p className="font-semibold text-slate-800">Ready to record patient speech</p>
            <p>Click below to start voice capture. Target language: <span className="uppercase font-bold text-teal-700">{languageHint}</span></p>
          </div>
          <button
            type="button"
            disabled={networkState === "OFFLINE"}
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Mic className="w-4 h-4" /> Start Voice Recording
          </button>
        </div>
      )}

      {/* State 2: Recording */}
      {state === "recording" && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-rose-50 border border-rose-200 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping"></span>
            <div className="text-xs text-rose-900">
              <span className="font-bold">Recording in progress...</span> ({seconds}s elapsed)
              <p className="text-[11px] text-rose-700">Speak clearly near microphone</p>
            </div>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            <Square className="w-4 h-4" /> Stop &amp; Transcribe
          </button>
        </div>
      )}

      {/* State 3: Processing */}
      {state === "processing" && (
        <div className="flex items-center justify-center gap-3 p-6 rounded-lg bg-slate-50 border border-slate-200">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
          <span className="text-xs font-medium text-slate-700">
            Transcribing speech and normalizing language tokens...
          </span>
        </div>
      )}

      {/* State 4: Transcribed */}
      {state === "transcribed" && (
        <div className="space-y-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Transcribed Speech ({detectedLang})</span>
            </div>
            <button
              type="button"
              onClick={resetRecording}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Re-record
            </button>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              onTranscriptionComplete(e.target.value, detectedLang);
            }}
            rows={2}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="Review transcript..."
          />
          <p className="text-[11px] text-slate-500 italic">
            * Speech transcription is an input aid — review before submission for qualified clinician review.
          </p>
        </div>
      )}

      {/* State 5: Error */}
      {state === "error" && (
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={resetRecording}
            className="px-3 py-1 bg-white border border-amber-300 rounded font-semibold text-amber-800 hover:bg-amber-50"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
