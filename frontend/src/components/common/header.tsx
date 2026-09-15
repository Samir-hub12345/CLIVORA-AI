"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldCheck, Users, BrainCircuit, Calendar, FileText, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, isClinician, isAdmin } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", show: !!user },
    { label: "Patients", href: "/patients", show: !!user && isClinician },
    { label: "AI Triage", href: "/triage", show: !!user && isClinician },
    { label: "Consultations", href: "/consultations", show: !!user },
    { label: "Audit Trail", href: "/audit", show: !!user && (isClinician || isAdmin) },
  ];

  return (
    <header className="border-b border-border bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="bg-teal-50 p-2 rounded-lg text-teal-700 border border-teal-200">
              <Activity className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Clinova</span>
              <span className="text-teal-700 font-bold ml-1 text-xs bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                AI
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-teal-50 text-teal-800 border border-teal-200"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
            </nav>
          )}
        </div>

        {/* Right side Auth & Role */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
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
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1 text-xs text-slate-500 mr-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>HIPAA-Ready Architecture</span>
              </div>
              <Link
                href="/login"
                className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
