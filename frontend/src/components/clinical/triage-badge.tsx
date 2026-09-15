import React from "react";
import { AlertCircle, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TriageBadgeProps {
  level: string;
  showIcon?: boolean;
}

export const TriageBadge: React.FC<TriageBadgeProps> = ({ level, showIcon = true }) => {
  const norm = level.toLowerCase();

  if (norm === "critical") {
    return (
      <Badge variant="critical" className="gap-1 bg-rose-100 text-rose-800 border-rose-300">
        {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
        CRITICAL (Resuscitation)
      </Badge>
    );
  }

  if (norm === "urgent") {
    return (
      <Badge variant="urgent" className="gap-1 bg-amber-100 text-amber-800 border-amber-300">
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
        URGENT (Emergent)
      </Badge>
    );
  }

  if (norm === "routine") {
    return (
      <Badge variant="default" className="gap-1 bg-teal-100 text-teal-800 border-teal-300">
        {showIcon && <Clock className="w-3.5 h-3.5 text-teal-600" />}
        ROUTINE (Standard Care)
      </Badge>
    );
  }

  if (norm === "low") {
    return (
      <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-700 border-slate-300">
        {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />}
        LOW (Non-urgent)
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-slate-500">
      Unassigned
    </Badge>
  );
};
