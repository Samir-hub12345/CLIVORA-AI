"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Zap,
  Info,
  ChevronDown,
  Gauge,
  Sparkles,
} from "lucide-react";
import { useConnectivity, ConnectivityState, ConnectivityMode } from "@/lib/connectivity";

export const NetworkIndicator: React.FC = () => {
  const {
    state,
    mode,
    setMode,
    isLowBandwidthActive,
    metrics,
    measureNow,
    detailsOpen,
    setDetailsOpen,
    transitions,
  } = useConnectivity();

  const [testing, setTesting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setDetailsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailsOpen(false);
    };

    if (detailsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [detailsOpen, setDetailsOpen]);

  const handleManualTest = async () => {
    setTesting(true);
    await measureNow();
    setTimeout(() => setTesting(false), 400);
  };

  // Render 4-bar signal strength graphic
  const renderSignalBars = (st: ConnectivityState) => {
    const barActive = {
      GOOD: 4,
      NORMAL: 3,
      SLOW: 2,
      OFFLINE: 0,
    }[st];

    const barColor = {
      GOOD: "bg-emerald-500",
      NORMAL: "bg-teal-500",
      SLOW: "bg-amber-500",
      OFFLINE: "bg-rose-400",
    }[st];

    return (
      <div
        className="flex items-end gap-0.5 h-3.5 px-0.5"
        title={`Connection Quality: ${st}`}
        aria-hidden="true"
      >
        <span
          className={`w-1 rounded-xs transition-all ${
            barActive >= 1 ? `${barColor} h-1.5` : "bg-slate-200 h-1.5"
          }`}
        />
        <span
          className={`w-1 rounded-xs transition-all ${
            barActive >= 2 ? `${barColor} h-2` : "bg-slate-200 h-2"
          }`}
        />
        <span
          className={`w-1 rounded-xs transition-all ${
            barActive >= 3 ? `${barColor} h-2.5` : "bg-slate-200 h-2.5"
          }`}
        />
        <span
          className={`w-1 rounded-xs transition-all ${
            barActive >= 4 ? `${barColor} h-3.5` : "bg-slate-200 h-3.5"
          }`}
        />
      </div>
    );
  };

  const statusBadgeConfig = {
    GOOD: {
      bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dot: "bg-emerald-500",
      text: "Good",
    },
    NORMAL: {
      bg: "bg-teal-50 text-teal-800 border-teal-200",
      dot: "bg-teal-500",
      text: "Normal",
    },
    SLOW: {
      bg: "bg-amber-50 text-amber-900 border-amber-300",
      dot: "bg-amber-500 animate-pulse",
      text: "Slow",
    },
    OFFLINE: {
      bg: "bg-rose-50 text-rose-800 border-rose-300",
      dot: "bg-rose-500",
      text: "Offline",
    },
  }[state];

  const ariaLabel = `Connection quality: ${statusBadgeConfig.text}. ${
    metrics.latencyMs !== null ? `Latency: ${metrics.latencyMs} milliseconds.` : ""
  } Mode: ${mode}. Click to adjust connectivity settings.`;

  return (
    <div className="relative inline-block" ref={panelRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setDetailsOpen(!detailsOpen)}
        aria-label={ariaLabel}
        aria-expanded={detailsOpen}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${statusBadgeConfig.bg}`}
      >
        {state === "OFFLINE" ? (
          <WifiOff className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
        ) : (
          renderSignalBars(state)
        )}

        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight">{statusBadgeConfig.text}</span>
          <span className="text-[10px] opacity-75 font-mono">
            {state === "OFFLINE"
              ? "Disconnected"
              : metrics.latencyMs !== null
              ? `${metrics.latencyMs}ms`
              : "--"}
          </span>
        </div>

        {isLowBandwidthActive && (
          <span
            className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded border border-amber-300 uppercase tracking-tight"
            title="Adaptive low-bandwidth mode is active"
          >
            Data Saver
          </span>
        )}

        <ChevronDown className={`w-3 h-3 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Details & Control Panel */}
      {detailsOpen && (
        <div
          role="dialog"
          aria-label="Connectivity Details and Controls"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl p-5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-slate-800 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-50 text-teal-700 rounded-lg">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Network Diagnostics
                </h4>
                <p className="text-[11px] text-slate-500">Real-time application connectivity</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              aria-label="Close connectivity panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Status Overview */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {renderSignalBars(state)}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-slate-900">
                      Connection: {statusBadgeConfig.text}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${statusBadgeConfig.dot}`} />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {state === "GOOD"
                      ? "Healthy connection with low latency"
                      : state === "NORMAL"
                      ? "Standard usable connection"
                      : state === "SLOW"
                      ? "Degraded latency & throughput"
                      : "No reachable network connection"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualTest}
                disabled={testing}
                title="Test connection now"
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin text-teal-600" : ""}`} />
                <span className="text-[10px] hidden sm:inline">Test</span>
              </button>
            </div>

            {/* Diagnostic Metrics Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase block">RTT Latency</span>
                <span className="font-bold font-mono text-slate-800">
                  {metrics.latencyMs !== null ? `${metrics.latencyMs} ms` : "--"}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase block">Type / Speed</span>
                <span className="font-bold text-slate-800 uppercase">
                  {metrics.effectiveType || "Detected"}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase block">Downlink</span>
                <span className="font-bold text-slate-800 font-mono">
                  {metrics.downlink ? `${metrics.downlink} Mbps` : "--"}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase block">Data Saver</span>
                <span className="font-bold text-slate-800">
                  {metrics.saveData ? "Active" : "Off"}
                </span>
              </div>
            </div>
          </div>

          {/* User Mode Preference Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Connectivity Mode
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                {isLowBandwidthActive ? "Adaptive Savings Active" : "Standard Experience"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMode("AUTOMATIC")}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all flex flex-col items-center gap-0.5 ${
                  mode === "AUTOMATIC"
                    ? "bg-white text-teal-800 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Automatic</span>
                <span className="text-[9px] font-normal text-slate-400">Adaptive</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("NORMAL")}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all flex flex-col items-center gap-0.5 ${
                  mode === "NORMAL"
                    ? "bg-white text-teal-800 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Normal</span>
                <span className="text-[9px] font-normal text-slate-400">Full Experience</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("LOW_BANDWIDTH")}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all flex flex-col items-center gap-0.5 ${
                  mode === "LOW_BANDWIDTH"
                    ? "bg-white text-amber-900 shadow-xs border border-amber-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Low Bandwidth</span>
                <span className="text-[9px] font-normal text-amber-700">Data Saver</span>
              </button>
            </div>
          </div>

          {/* Mode Explanation */}
          <div className="text-[11px] text-slate-600 leading-relaxed bg-teal-50/50 p-2.5 rounded-xl border border-teal-100">
            {mode === "AUTOMATIC" && (
              <p>
                <span className="font-bold text-teal-900">Automatic: </span>
                Clinova AI monitors network quality and automatically throttles non-essential polling, animations, and image preloading if connectivity drops.
              </p>
            )}
            {mode === "NORMAL" && (
              <p>
                <span className="font-bold text-teal-900">Normal: </span>
                Uses the standard clinical experience. If the network drops completely, an offline notice will still protect clinical submissions.
              </p>
            )}
            {mode === "LOW_BANDWIDTH" && (
              <p>
                <span className="font-bold text-amber-900">Low Bandwidth (Forced): </span>
                Minimizes background traffic, suspends animations, and throttles non-essential queries to preserve battery and rural mobile data.
              </p>
            )}
          </div>

          {/* Healthcare Safety & Caching Notice */}
          <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-500 leading-tight">
            <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <span>
              Clinical Safety Notice: Sensitive patient health records and doctor consultation notes are never cached in insecure browser storage during degraded or offline conditions.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
