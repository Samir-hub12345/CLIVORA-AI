"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldCheck, LogOut, Sparkles, WifiOff, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, isClinician, isAdmin } = useAuth();
  const [lowBandwidth, setLowBandwidth] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("clivora_low_bandwidth") === "true";
    setLowBandwidth(saved);
    if (saved) {
      document.documentElement.classList.add("low-bandwidth");
    }
  }, []);

  const toggleLowBandwidth = () => {
    const next = !lowBandwidth;
    setLowBandwidth(next);
    localStorage.setItem("clivora_low_bandwidth", String(next));
    if (next) {
      document.documentElement.classList.add("low-bandwidth");
    } else {
      document.documentElement.classList.remove("low-bandwidth");
    }
  };

  const navItems = [
    { label: "Patient Intake", href: "/intake", show: true },
    { label: "Review Queue", href: "/review", show: true },
    { label: "Demo Cases", href: "/demo", show: true },
    { label: "Dashboard", href: "/dashboard", show: !!user },
    { label: "EHR Directory", href: "/patients", show: !!user && isClinician },
    { label: "Audit Trail", href: "/audit", show: !!user && (isClinician || isAdmin) },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-teal-600 p-2 rounded-xl text-white shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-slate-900">CLIVORA</span>
                <span className="text-teal-700 font-extrabold text-[10px] bg-teal-100 px-1.5 py-0.5 rounded border border-teal-300">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Multimodal Triage Support
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? "bg-teal-50 text-teal-800 border border-teal-200 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Right side controls: Low bandwidth, Demo Badge, User Auth */}
        <div className="flex items-center gap-3">
          {/* Low Bandwidth Toggle */}
          <button
            type="button"
            onClick={toggleLowBandwidth}
            title="Toggle low-bandwidth mode for rural or slow connectivity facilities"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              lowBandwidth
                ? "bg-amber-100 text-amber-900 border-amber-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Low-Bandwidth {lowBandwidth ? "ON" : "OFF"}</span>
          </button>

          {/* Demo Mode Badge */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>DEMO MODE</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900">{user.full_name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</span>
              </div>
              <Badge variant={user.role === "doctor" ? "default" : user.role === "admin" ? "warning" : "secondary"}>
                {user.role.toUpperCase()}
              </Badge>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Clinician Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
