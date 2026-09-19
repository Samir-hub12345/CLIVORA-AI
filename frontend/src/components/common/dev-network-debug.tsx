"use client";

import React, { useState, useEffect } from "react";
import { useConnectivity, ConnectivityState } from "@/lib/connectivity";
import { Terminal, X, ChevronUp, ChevronDown, RefreshCw, Zap, Shield, Eye, EyeOff } from "lucide-react";

export const DevNetworkDebug: React.FC = () => {
  const {
    state,
    mode,
    setMode,
    isLowBandwidthActive,
    metrics,
    measureNow,
    transitions,
    pollingIntervalMs,
    pollingStatus,
    imageStrategy,
    backgroundRequestsStatus,
    devForceState,
    forcedState,
  } = useConnectivity();

  const [isOpen, setIsOpen] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showInEnv, setShowInEnv] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Enable if in dev mode or ?debug=network query parameter is present
    const isDev = process.env.NODE_ENV === "development";
    const hasDebugQuery =
      typeof window !== "undefined" &&
      (window.location.search.includes("debug=network") ||
        window.location.search.includes("debug=true"));
    setShowInEnv(isDev || hasDebugQuery);
  }, []);

  // Timer for "Last Measurement: XX seconds ago"
  useEffect(() => {
    if (!metrics.lastChecked) return;

    const updateAgo = () => {
      const diff = Math.round(
        (Date.now() - new Date(metrics.lastChecked!).getTime()) / 1000
      );
      setSecondsAgo(Math.max(0, diff));
    };

    updateAgo();
    const timer = setInterval(updateAgo, 1000);
    return () => clearInterval(timer);
  }, [metrics.lastChecked]);

  if (!isClient || !showInEnv) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-xs">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 text-emerald-400 border border-slate-700/80 rounded-xl shadow-lg backdrop-blur-md hover:bg-slate-900 transition text-[11px] font-bold"
          title="Open Developer Network Diagnostics Panel"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>DEV CONNECTIVITY DEBUG</span>
          <span
            className={`w-2 h-2 rounded-full ${
              state === "GOOD"
                ? "bg-emerald-400"
                : state === "NORMAL"
                ? "bg-teal-400"
                : state === "SLOW"
                ? "bg-amber-400"
                : "bg-rose-400"
            }`}
          />
        </button>
      ) : (
        <div className="w-84 max-h-[90vh] bg-slate-950/95 text-slate-200 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100 text-xs">Connectivity Debug</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Diagnostic Metrics Body */}
          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[60vh] text-[11px]">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 border-b border-slate-800/80 pb-2.5">
              <span className="text-slate-400">State:</span>
              <span
                className={`font-bold ${
                  state === "GOOD"
                    ? "text-emerald-400"
                    : state === "NORMAL"
                    ? "text-teal-400"
                    : state === "SLOW"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {state} {forcedState ? "(FORCED)" : ""}
              </span>

              <span className="text-slate-400">Mode:</span>
              <span className="text-slate-200">{mode}</span>

              <span className="text-slate-400">Online:</span>
              <span className={state === "OFFLINE" ? "text-rose-400 font-bold" : "text-emerald-400"}>
                {typeof navigator !== "undefined" && navigator.onLine ? "Yes" : "No"}
              </span>

              <span className="text-slate-400">Effective Type:</span>
              <span className="text-slate-200">{metrics.effectiveType || "N/A"}</span>

              <span className="text-slate-400">Estimated Downlink:</span>
              <span className="text-slate-200">
                {metrics.downlink !== null ? `${metrics.downlink} Mbps` : "N/A"}
              </span>

              <span className="text-slate-400">RTT (Latency):</span>
              <span className="text-slate-200">
                {metrics.latencyMs !== null ? `${metrics.latencyMs} ms` : "N/A"}
              </span>

              <span className="text-slate-400">Last Measurement:</span>
              <span className="text-slate-200">
                {secondsAgo !== null ? `${secondsAgo}s ago` : "Pending"}
              </span>

              <span className="text-slate-400">Adaptive Low Bandwidth:</span>
              <span className={isLowBandwidthActive ? "text-amber-400 font-bold" : "text-slate-300"}>
                {isLowBandwidthActive ? "Yes (Active)" : "No"}
              </span>

              <span className="text-slate-400">Polling Interval:</span>
              <span className="text-slate-200">
                {pollingStatus} {pollingIntervalMs > 0 ? `(${pollingIntervalMs / 1000}s)` : "(0s)"}
              </span>

              <span className="text-slate-400">Images Strategy:</span>
              <span className="text-slate-200">{imageStrategy}</span>

              <span className="text-slate-400">Background Requests:</span>
              <span className="text-slate-200">{backgroundRequestsStatus}</span>
            </div>

            {/* Quick Transition Simulators */}
            <div className="space-y-1.5 border-b border-slate-800/80 pb-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Dev Simulation Controls
              </div>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => devForceState("GOOD")}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                    state === "GOOD" && forcedState === "GOOD"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  Good
                </button>
                <button
                  type="button"
                  onClick={() => devForceState("NORMAL")}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                    state === "NORMAL" && forcedState === "NORMAL"
                      ? "bg-teal-600 text-white border-teal-500"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => devForceState("SLOW")}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                    state === "SLOW" && forcedState === "SLOW"
                      ? "bg-amber-600 text-white border-amber-500"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  Slow
                </button>
                <button
                  type="button"
                  onClick={() => devForceState("OFFLINE")}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                    state === "OFFLINE" && forcedState === "OFFLINE"
                      ? "bg-rose-600 text-white border-rose-500"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  Offline
                </button>
              </div>

              <div className="flex gap-1.5 pt-1">
                {forcedState && (
                  <button
                    type="button"
                    onClick={() => devForceState(null)}
                    className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700 transition font-medium text-center"
                  >
                    Reset to Real Auto
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => measureNow()}
                  className="flex-1 py-1 px-2 bg-teal-950 hover:bg-teal-900 text-teal-300 text-[10px] rounded border border-teal-800 transition font-medium flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Measure Ping</span>
                </button>
              </div>
            </div>

            {/* Live Transitions Event Log */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Live Transitions Log ({transitions.length})
              </div>
              {transitions.length === 0 ? (
                <div className="text-[10px] text-slate-500 italic">No transitions recorded yet.</div>
              ) : (
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {transitions.map((t, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] font-mono flex items-center justify-between py-0.5 border-b border-slate-900 text-slate-300"
                    >
                      <span className="text-slate-500">{t.timestamp}</span>
                      <span className="font-semibold">
                        {t.from} &rarr; {t.to}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate max-w-[90px]" title={t.trigger}>
                        {t.trigger}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
