import React from "react";
import { Mic, FileText, Cpu, CheckCircle2, ShieldAlert } from "lucide-react";

interface ProvenanceBadgeProps {
  sourceType: "voice" | "ocr" | "rule" | "ai" | "human" | string;
  label?: string;
  confidence?: number;
}

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  sourceType,
  label,
  confidence,
}) => {
  if (sourceType === "voice") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
        <Mic className="w-3 h-3 text-purple-600" />
        <span>{label || "Voice Input (STT)"}</span>
        {confidence && <span className="opacity-75">({Math.round(confidence * 100)}%)</span>}
      </span>
    );
  }

  if (sourceType === "ocr") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
        <FileText className="w-3 h-3 text-sky-600" />
        <span>{label || "Report OCR"}</span>
        {confidence && <span className="opacity-75">({Math.round(confidence * 100)}%)</span>}
      </span>
    );
  }

  if (sourceType === "rule") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <ShieldAlert className="w-3 h-3 text-amber-600" />
        <span>{label || "Deterministic Rule"}</span>
      </span>
    );
  }

  if (sourceType === "human") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        <span>{label || "Reviewer Confirmed"}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      <Cpu className="w-3 h-3 text-slate-500" />
      <span>{label || "AI Organization"}</span>
    </span>
  );
};
