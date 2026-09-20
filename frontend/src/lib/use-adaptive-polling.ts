"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useConnectivity } from "@/lib/connectivity";

export interface AdaptivePollingOptions {
  baseIntervalMs?: number;
  enabled?: boolean;
  immediate?: boolean;
}

export function useAdaptivePolling(
  callback: () => Promise<void> | void,
  options: AdaptivePollingOptions = {}
) {
  const { baseIntervalMs = 15000, enabled = true, immediate = true } = options;
  const { state, pollingIntervalMs, isLowBandwidthActive } = useConnectivity();

  const [lastPolled, setLastPolled] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  const previousStateRef = useRef(state);

  const executePoll = useCallback(async () => {
    if (!enabled || state === "OFFLINE") return;
    setIsRefreshing(true);
    try {
      await savedCallback.current();
      setLastPolled(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, state]);

  // Execute initial poll
  useEffect(() => {
    if (enabled && immediate && state !== "OFFLINE") {
      executePoll();
    }
  }, [enabled, immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh when recovering from OFFLINE to online
  useEffect(() => {
    const prev = previousStateRef.current;
    if (prev === "OFFLINE" && state !== "OFFLINE" && enabled) {
      executePoll();
    }
    previousStateRef.current = state;
  }, [state, enabled, executePoll]);

  // Adaptive interval timer
  useEffect(() => {
    if (!enabled || state === "OFFLINE" || pollingIntervalMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      executePoll();
    }, pollingIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, state, pollingIntervalMs, executePoll]);

  return {
    lastPolled,
    isRefreshing,
    refresh: executePoll,
    isPollingActive: enabled && state !== "OFFLINE",
    currentIntervalMs: pollingIntervalMs,
  };
}
