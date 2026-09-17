import React from "react";
import { Clock, Calendar } from "lucide-react";
import { TimelineEvent } from "@/types";

interface TimelineViewProps {
  events: TimelineEvent[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-500 text-center">
        No specific timeline markers detected in reported symptoms.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
        <Clock className="w-4 h-4 text-teal-600" />
        <span>Symptom Progression Timeline (Synthesized for Reviewer)</span>
      </div>

      <div className="relative pl-6 space-y-4 border-l-2 border-teal-100 ml-2 py-1">
        {events.map((event, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white shadow-sm"></div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{event.day}</span>
                {event.source && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                    {event.source}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
