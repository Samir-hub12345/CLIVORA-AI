"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { registerNetworkReporters } from "@/lib/api";
import { syncOfflineQueue } from "@/lib/offlineQueue";

export type ConnectivityState = "GOOD" | "NORMAL" | "SLOW" | "OFFLINE";
export type ConnectivityMode = "AUTOMATIC" | "NORMAL" | "LOW_BANDWIDTH";

export interface NetworkMetrics {
  latencyMs: number | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
  lastChecked: Date | null;
  failureCount: number;
}

export interface StateTransition {
  timestamp: string;
  from: ConnectivityState;
  to: ConnectivityState;
  trigger: string;
}

export interface ConnectivityToast {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "error";
}

interface ConnectivityContextType {
  state: ConnectivityState;
  previousState: ConnectivityState | null;
  mode: ConnectivityMode;
  setMode: (mode: ConnectivityMode) => void;
  isLowBandwidthActive: boolean;
  metrics: NetworkMetrics;
  measureNow: () => Promise<void>;
  reportApiLatency: (ms: number) => void;
  reportApiFailure: () => void;
  detailsOpen: boolean;
  setDetailsOpen: (open: boolean) => void;
  transitions: StateTransition[];
  pollingIntervalMs: number;
  pollingStatus: "Normal" | "Reduced" | "Minimal" | "Paused";
  imageStrategy: "Normal" | "Optimized" | "Deferred" | "Offline";
  backgroundRequestsStatus: "Normal" | "Reduced" | "Minimal" | "Stopped";
  toastMessage: ConnectivityToast | null;
  dismissToast: () => void;
  devForceState: (forced: ConnectivityState | null) => void;
  forcedState: ConnectivityState | null;
}

const ConnectivityContext = createContext<ConnectivityContextType>({
  state: "GOOD",
  previousState: null,
  mode: "AUTOMATIC",
  setMode: () => {},
  isLowBandwidthActive: false,
  metrics: {
    latencyMs: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
    lastChecked: null,
    failureCount: 0,
  },
  measureNow: async () => {},
  reportApiLatency: () => {},
  reportApiFailure: () => {},
  detailsOpen: false,
  setDetailsOpen: () => {},
  transitions: [],
  pollingIntervalMs: 15000,
  pollingStatus: "Normal",
  imageStrategy: "Normal",
  backgroundRequestsStatus: "Normal",
  toastMessage: null,
  dismissToast: () => {},
  devForceState: () => {},
  forcedState: null,
});

// Helper to access NetworkInformation API safely across browsers
function getNetworkConnection(): any {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as any;
  return nav.connection || nav.mozConnection || nav.webkitConnection || null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const ConnectivityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [naturalState, setNaturalState] = useState<ConnectivityState>("GOOD");
  const [previousState, setPreviousState] = useState<ConnectivityState | null>(null);
  const [forcedState, setForcedState] = useState<ConnectivityState | null>(null);
  const [mode, setModeState] = useState<ConnectivityMode>("AUTOMATIC");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [transitions, setTransitions] = useState<StateTransition[]>([]);
  const [toastMessage, setToastMessage] = useState<ConnectivityToast | null>(null);

  // Effective operational state (forced override takes precedence if set in dev)
  const state = forcedState || naturalState;

  const [metrics, setMetrics] = useState<NetworkMetrics>({
    latencyMs: null,
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
    lastChecked: null,
    failureCount: 0,
  });

  // Rolling history of recent latency samples (up to 4) for smoothing
  const latencyHistoryRef = useRef<number[]>([]);
  // Consecutive evaluation tracking for hysteresis
  const pendingStateRef = useRef<{ target: ConnectivityState; count: number }>({
    target: "GOOD",
    count: 0,
  });
  const stateRef = useRef<ConnectivityState>("GOOD");
  stateRef.current = state;

  const failureCountRef = useRef(0);

  // Initialize mode from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("clinova_connectivity_mode");
      if (
        savedMode === "AUTOMATIC" ||
        savedMode === "NORMAL" ||
        savedMode === "LOW_BANDWIDTH"
      ) {
        setModeState(savedMode);
      } else {
        const legacy = localStorage.getItem("clinova_low_bandwidth");
        if (legacy === "true") {
          setModeState("LOW_BANDWIDTH");
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setMode = useCallback((newMode: ConnectivityMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("clinova_connectivity_mode", newMode);
      localStorage.setItem("clinova_low_bandwidth", String(newMode === "LOW_BANDWIDTH"));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const devForceState = useCallback((target: ConnectivityState | null) => {
    setForcedState(target);
    if (target) {
      setTransitions((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          from: stateRef.current,
          to: target,
          trigger: "dev debug manual override",
        },
        ...prev.slice(0, 9),
      ]);
    }
  }, []);

  // Compute adaptive low bandwidth status
  const isLowBandwidthActive =
    mode === "LOW_BANDWIDTH" ||
    (mode === "AUTOMATIC" && (state === "SLOW" || state === "OFFLINE"));

  // Polling intervals & resource strategies based on active connectivity
  const pollingIntervalMs = {
    GOOD: 15000,
    NORMAL: 25000,
    SLOW: 50000,
    OFFLINE: 0, // 0 = stopped
  }[state];

  const pollingStatus: "Normal" | "Reduced" | "Minimal" | "Paused" = {
    GOOD: "Normal" as const,
    NORMAL: "Reduced" as const,
    SLOW: "Minimal" as const,
    OFFLINE: "Paused" as const,
  }[state];

  const imageStrategy: "Normal" | "Optimized" | "Deferred" | "Offline" = {
    GOOD: "Normal" as const,
    NORMAL: "Optimized" as const,
    SLOW: "Deferred" as const,
    OFFLINE: "Offline" as const,
  }[state];

  const backgroundRequestsStatus: "Normal" | "Reduced" | "Minimal" | "Stopped" = {
    GOOD: "Normal" as const,
    NORMAL: "Reduced" as const,
    SLOW: "Minimal" as const,
    OFFLINE: "Stopped" as const,
  }[state];

  // Synchronize CSS `.low-bandwidth` class on documentElement
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isLowBandwidthActive) {
        document.documentElement.classList.add("low-bandwidth");
      } else {
        document.documentElement.classList.remove("low-bandwidth");
      }
    }
  }, [isLowBandwidthActive]);

  // Dismiss current status toast
  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Safe median calculation for rolling latency samples
  const getMedianLatency = useCallback((): number | null => {
    const samples = latencyHistoryRef.current;
    if (samples.length === 0) return null;
    const sorted = [...samples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }, []);

  // Push transition message toast when connection state changes
  const triggerTransitionToast = useCallback(
    (from: ConnectivityState, to: ConnectivityState) => {
      if (from === to) return;

      if (to === "SLOW") {
        setToastMessage({
          id: Date.now(),
          text: "Slow connection detected. Clinova AI is reducing non-essential data usage.",
          type: "warning",
        });
      } else if (to === "OFFLINE") {
        setToastMessage({
          id: Date.now(),
          text: "You're currently offline. Operations requiring server access are paused.",
          type: "error",
        });
      } else if ((from === "SLOW" || from === "OFFLINE") && (to === "NORMAL" || to === "GOOD")) {
        setToastMessage({
          id: Date.now(),
          text: "Connection improved. Normal data behavior restored.",
          type: "success",
        });

        if (from === "OFFLINE" && typeof window !== "undefined") {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const token = localStorage.getItem("clinova_token");
          syncOfflineQueue(apiBase, token)
            .then((res) => {
              if (res.syncedCount > 0) {
                setToastMessage({
                  id: Date.now() + 1,
                  text: `Reconnected! Successfully synced ${res.syncedCount} queued action(s).`,
                  type: "success",
                });
              }
            })
            .catch(() => {});
        }
      }
    },
    []
  );

  // Apply hysteresis: require 2 consecutive evaluation confirmations before state transition
  const applyStateWithHysteresis = useCallback(
    (target: ConnectivityState, trigger: string) => {
      const current = stateRef.current;

      if (target === current) {
        pendingStateRef.current = { target, count: 0 };
        return;
      }

      // Immediate transition to OFFLINE for patient safety
      if (target === "OFFLINE") {
        pendingStateRef.current = { target, count: 0 };
        setPreviousState(current);
        setNaturalState("OFFLINE");
        triggerTransitionToast(current, "OFFLINE");
        setTransitions((prev) => [
          {
            timestamp: new Date().toLocaleTimeString(),
            from: current,
            to: "OFFLINE",
            trigger,
          },
          ...prev.slice(0, 9),
        ]);
        return;
      }

      // For degradation or improvement: require 2 consecutive confirmations
      if (pendingStateRef.current.target === target) {
        pendingStateRef.current.count += 1;
        if (pendingStateRef.current.count >= 2) {
          setPreviousState(current);
          setNaturalState(target);
          triggerTransitionToast(current, target);
          setTransitions((prev) => [
            {
              timestamp: new Date().toLocaleTimeString(),
              from: current,
              to: target,
              trigger,
            },
            ...prev.slice(0, 9),
          ]);
          pendingStateRef.current = { target, count: 0 };
        }
      } else {
        pendingStateRef.current = { target, count: 1 };
      }
    },
    [triggerTransitionToast]
  );

  // Deterministic connection quality evaluator with hysteresis
  const evaluateQuality = useCallback(
    (reason: string) => {
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      if (!isOnline || failureCountRef.current >= 3) {
        applyStateWithHysteresis("OFFLINE", reason);
        return;
      }

      const conn = getNetworkConnection();
      const effectiveType = conn?.effectiveType || null;
      const downlink = typeof conn?.downlink === "number" ? conn.downlink : null;
      const rtt = typeof conn?.rtt === "number" ? conn.rtt : null;
      const saveData = conn?.saveData === true;

      const medianLatency = getMedianLatency();

      setMetrics((prev) => ({
        ...prev,
        effectiveType,
        downlink,
        rtt,
        saveData,
        latencyMs: medianLatency,
        lastChecked: new Date(),
        failureCount: failureCountRef.current,
      }));

      // Deterministic state calculation combining latency, throughput, and saveData
      let candidate: ConnectivityState = "GOOD";

      if (saveData) {
        candidate = "SLOW";
      } else if (
        effectiveType === "slow-2g" ||
        effectiveType === "2g" ||
        (downlink !== null && downlink < 0.6) ||
        (rtt !== null && rtt > 1200) ||
        (medianLatency !== null && medianLatency > 260) ||
        failureCountRef.current > 0
      ) {
        candidate = "SLOW";
      } else if (
        effectiveType === "3g" ||
        (downlink !== null && downlink < 2.5) ||
        (rtt !== null && rtt > 400) ||
        (medianLatency !== null && medianLatency > 95)
      ) {
        candidate = "NORMAL";
      } else {
        candidate = "GOOD";
      }

      applyStateWithHysteresis(candidate, reason);
    },
    [applyStateWithHysteresis, getMedianLatency]
  );

  // Measure latency using lightweight /api/v1/ping endpoint
  const measureNow = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!navigator.onLine) {
      applyStateWithHysteresis("OFFLINE", "browser offline event");
      return;
    }

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${API_BASE_URL}/api/v1/ping`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const elapsed = Math.round(performance.now() - start);
        failureCountRef.current = 0;

        // Push into rolling history (keep last 4 samples)
        latencyHistoryRef.current = [...latencyHistoryRef.current.slice(-3), elapsed];
        evaluateQuality("ping measurement");
      } else {
        failureCountRef.current += 1;
        evaluateQuality("ping status error");
      }
    } catch {
      failureCountRef.current += 1;
      evaluateQuality("ping network failure");
    }
  }, [applyStateWithHysteresis, evaluateQuality]);

  // Hook for API client to report real request latency
  const reportApiLatency = useCallback(
    (ms: number) => {
      failureCountRef.current = 0;
      latencyHistoryRef.current = [...latencyHistoryRef.current.slice(-3), ms];
      evaluateQuality("api request latency");
    },
    [evaluateQuality]
  );

  const reportApiFailure = useCallback(() => {
    failureCountRef.current += 1;
    evaluateQuality("api request error");
  }, [evaluateQuality]);

  // Global browser events: online, offline, NetworkInformation change
  useEffect(() => {
    const handleOnline = () => {
      failureCountRef.current = 0;
      measureNow();
    };

    const handleOffline = () => {
      applyStateWithHysteresis("OFFLINE", "navigator.offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Wire global API client reporting into connectivity manager
    registerNetworkReporters(reportApiLatency, reportApiFailure);

    const conn = getNetworkConnection();
    const handleConnChange = () => {
      // Immediate ping on network change to sample latency under new DevTools throttling preset
      measureNow();
      evaluateQuality("network information change");
    };
    if (conn && typeof conn.addEventListener === "function") {
      conn.addEventListener("change", handleConnChange);
    }

    // Initial ping measurement
    measureNow();

    // Controlled background sampling interval:
    // 15s in normal operation, 45s when degraded, 5s during offline recovery probes
    let timer: NodeJS.Timeout;
    const scheduleNextPing = () => {
      const cur = stateRef.current;
      const delay = cur === "OFFLINE" ? 5000 : cur === "SLOW" ? 45000 : 18000;
      timer = setTimeout(async () => {
        await measureNow();
        scheduleNextPing();
      }, delay);
    };

    scheduleNextPing();

    const handleVisibilityChange = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") {
        measureNow();
      }
      scheduleNextPing();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (conn && typeof conn.removeEventListener === "function") {
        conn.removeEventListener("change", handleConnChange);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(timer);
    };
  }, [applyStateWithHysteresis, evaluateQuality, measureNow, reportApiFailure, reportApiLatency]);

  return (
    <ConnectivityContext.Provider
      value={{
        state,
        previousState,
        mode,
        setMode,
        isLowBandwidthActive,
        metrics,
        measureNow,
        reportApiLatency,
        reportApiFailure,
        detailsOpen,
        setDetailsOpen,
        transitions,
        pollingIntervalMs,
        pollingStatus,
        imageStrategy,
        backgroundRequestsStatus,
        toastMessage,
        dismissToast,
        devForceState,
        forcedState,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => useContext(ConnectivityContext);
