import React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export const ClinicalDisclaimer: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p>
          <span className="font-semibold">Clinical Decision Support:</span> AI suggestions are decision aids and do not replace professional physician diagnosis.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
      <div className="flex items-center gap-2 text-slate-900 font-semibold">
        <ShieldCheck className="w-4 h-4 text-teal-600" />
        <span>HIPAA-Ready Architecture & Clinical Safety Notice</span>
      </div>
      <p className="leading-relaxed">
        Clinova AI operates on a <span className="font-medium text-slate-800">HIPAA-ready architectural framework</span> with end-to-end access control, role segregation, and immutable audit trails. Clinova AI is an investigational clinical decision support system and is not certified as an independent medical device. All recommendations, differential diagnoses, and triage stratifications must be independently reviewed and signed by a licensed healthcare provider before clinical action.
      </p>
    </div>
  );
};
