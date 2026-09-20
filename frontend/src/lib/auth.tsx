"use client";
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { User } from "@/types";
import { getToken, setStoredUser, clearToken, api } from "@/lib/api";

interface AuthContextType {
  user: User | null; loading: boolean; error: string | null;
  refresh: () => Promise<void>; setUser: (user: User | null) => void; logout: () => void;
  isClinician: boolean; isDoctor: boolean; isAdmin: boolean; isPatient: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setUserState(null); setError(null);
    if (!getToken()) { setLoading(false); return; }
    // Cached roles are never used to grant access or mount private pages.
    const res = await api.getMe();
    if (request !== generation.current) return;
    if (res.data) { setUserState(res.data); setStoredUser(res.data); }
    else if (res.status === 401) clearToken();
    else setError(res.error || "Unable to verify your session. Please retry.");
    setLoading(false);
  }, []);
  useEffect(() => {
    const expire = () => {
      ++generation.current; setUserState(null); setError(null); setLoading(false);
    };
    const changed = (event: StorageEvent) => {
      if (event.key === "clinova_token" || event.key === null) void refresh();
    };
    window.addEventListener("clinova:session-expired", expire);
    window.addEventListener("storage", changed);
    void refresh();
    return () => {
      ++generation.current;
      window.removeEventListener("clinova:session-expired", expire);
      window.removeEventListener("storage", changed);
    };
  }, [refresh]);
  const setUser = (next: User | null) => {
    ++generation.current;
    if (next) setStoredUser(next);
    setUserState(next); setError(null); setLoading(false);
  };
  const logout = () => { clearToken(); setUser(null); window.location.assign("/login"); };
  return <AuthContext.Provider value={{ user, loading, error, refresh, setUser, logout,
    isClinician: user?.role === "doctor" || user?.role === "nurse",
    isDoctor: user?.role === "doctor", isAdmin: user?.role === "admin", isPatient: user?.role === "patient",
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be inside AuthProvider");
  return context;
}
