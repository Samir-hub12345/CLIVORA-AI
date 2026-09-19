"use client";

import React, { useEffect } from "react";
import { useConnectivity } from "@/lib/connectivity";
import { AlertCircle, CheckCircle2, WifiOff, X } from "lucide-react";

export const NetworkToast: React.FC = () => {
  const { toastMessage, dismissToast } = useConnectivity();

  // Auto dismiss after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, dismissToast]);

  if (!toastMessage) return null;

  const styleConfig = {
    warning: {
      bg: "bg-amber-900/95 text-amber-50 border-amber-700/60",
      icon: <AlertCircle className="w-4 h-4 text-amber-300 flex-shrink-0" />,
      badge: "Adaptive Mode",
      badgeClass: "bg-amber-800 text-amber-200 border-amber-600",
    },
    success: {
      bg: "bg-emerald-950/95 text-emerald-50 border-emerald-700/60",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />,
      badge: "Restored",
      badgeClass: "bg-emerald-800 text-emerald-200 border-emerald-600",
    },
    error: {
      bg: "bg-rose-950/95 text-rose-50 border-rose-700/60",
      icon: <WifiOff className="w-4 h-4 text-rose-300 flex-shrink-0" />,
      badge: "Offline",
      badgeClass: "bg-rose-800 text-rose-200 border-rose-600",
    },
    info: {
      bg: "bg-slate-900/95 text-slate-50 border-slate-700/60",
      icon: <AlertCircle className="w-4 h-4 text-sky-300 flex-shrink-0" />,
      badge: "Network",
      badgeClass: "bg-slate-800 text-slate-200 border-slate-600",
    },
  }[toastMessage.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      <div
        className={`flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md ${styleConfig.bg}`}
      >
        <div className="mt-0.5">{styleConfig.icon}</div>

        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${styleConfig.badgeClass}`}
            >
              {styleConfig.badge}
            </span>
          </div>
          <p className="text-xs font-medium leading-relaxed">{toastMessage.text}</p>
        </div>

        <button
          type="button"
          onClick={dismissToast}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors -mr-1 -mt-1"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
