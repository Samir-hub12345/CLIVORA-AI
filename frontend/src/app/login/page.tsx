"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Stethoscope, User } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await api.login(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setUser(res.data.user);
      router.push("/dashboard");
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 mb-3">
              <Activity className="w-7 h-7 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Portal Sign In</h1>
            <p className="text-xs text-slate-500 mt-1">
              Secure authentication for authorized clinicians and patients
            </p>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              ⚡ Quick Select Demo Credentials
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("doctor@clinova.ai", "ClinovaDoctor2026!")}
                className="p-2 text-left bg-white border border-teal-200 rounded-lg hover:border-teal-400 hover:bg-teal-50/40 transition text-xs"
              >
                <div className="flex items-center gap-1 font-semibold text-teal-900">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  Doctor
                </div>
                <div className="text-[10px] text-slate-500 truncate">Dr. Sarah Chen</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("patient@clinova.ai", "ClinovaPatient2026!")}
                className="p-2 text-left bg-white border border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/40 transition text-xs"
              >
                <div className="flex items-center gap-1 font-semibold text-blue-900">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Patient
                </div>
                <div className="text-[10px] text-slate-500 truncate">James Miller</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("admin@clinova.ai", "ClinovaAdmin2026!")}
                className="p-2 text-left bg-white border border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-50/40 transition text-xs"
              >
                <div className="flex items-center gap-1 font-semibold text-amber-900">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  Admin
                </div>
                <div className="text-[10px] text-slate-500 truncate">Supervisor</div>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinova.ai"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full py-2.5 mt-2 gap-2 text-sm">
              Sign In to Clinova AI <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              HIPAA-Ready Control
            </span>
            <Link href="/register" className="text-teal-600 font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
