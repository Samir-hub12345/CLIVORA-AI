import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export const ClinicalDisclaimer: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 shadow-sm">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="leading-snug">
          <span className="font-bold">Educational prototype &amp; triage-support only:</span> Does not diagnose, prescribe treatment, or replace a qualified healthcare professional. All AI outputs require human review.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 shadow-sm flex items-start gap-3">
      <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0 mt-0.5">
        <ShieldAlert className="w-4 h-4 text-amber-700" />
      </div>
      <div className="space-y-1">
        <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
          <span>Persistent Safety Disclaimer &bull; Non-Diagnostic Protocol</span>
        </div>
        <p className="leading-relaxed text-amber-900/90">
          <strong>Educational prototype and triage-support purposes only.</strong> This system does not diagnose, prescribe treatment, or replace a qualified healthcare professional. All AI-generated information requires human review.
        </p>
      </div>
    </div>
  );
};
