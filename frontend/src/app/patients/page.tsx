"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, User, AlertCircle, X, Check, Activity, WifiOff } from "lucide-react";
import { api } from "@/lib/api";
import { useConnectivity } from "@/lib/connectivity";
import { useAdaptivePolling } from "@/lib/use-adaptive-polling";
import { Header } from "@/components/common/header";
import { Footer } from "@/components/common/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/types";

export default function PatientsPage() {
  const { state: networkState, isLowBandwidthActive } = useConnectivity();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New patient form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "Male",
    blood_group: "O+",
    phone: "",
    email: "",
    allergies: "",
    medical_history: "",
  });

  const fetchPatients = async (query = "") => {
    setLoading(true);
    const res = await api.getPatients(query);
    if (res.data) {
      setPatients(res.data.items);
    }
    setLoading(false);
  };

  useAdaptivePolling(() => fetchPatients(search), {
    baseIntervalMs: 25000,
    enabled: !modalOpen,
    immediate: true,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (networkState === "OFFLINE") {
      alert("You are currently offline. Patient registration requires an active network connection.");
      return;
    }
    setSubmitting(true);
    const res = await api.createPatient(formData);
    setSubmitting(false);

    if (res.data) {
      setModalOpen(false);
      setFormData({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "Male",
        blood_group: "O+",
        phone: "",
        email: "",
        allergies: "",
        medical_history: "",
      });
      fetchPatients();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Electronic Health Records (EHR)</h1>
            <p className="text-xs text-slate-500 mt-0.5">Enrolled patient directory, clinical histories &amp; demographics</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setModalOpen(true)}
              disabled={networkState === "OFFLINE"}
              className="gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {networkState === "OFFLINE" ? "Offline (Registration Paused)" : "Register Patient"}
            </Button>
          </div>
        </div>

        {/* Connectivity Alerts */}
        {networkState === "OFFLINE" ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>Offline: Showing locally loaded patient directory. New registrations require an active connection.</span>
          </div>
        ) : isLowBandwidthActive ? (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
            <span className="font-semibold">Adaptive Low-Bandwidth Mode active: patient search debounced &amp; optimized.</span>
            <span className="text-[10px] bg-amber-200/80 font-bold px-1.5 py-0.5 rounded uppercase">Data Saver</span>
          </div>
        ) : null}

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients by name or Medical Record Number (MRN)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        {/* Patient Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-teal-600 flex items-center justify-center gap-2">
              <Activity className="w-5 h-5 animate-pulse" />
              Loading patient directory...
            </div>
          ) : patients.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No patient records found matching query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">MRN</th>
                    <th className="px-6 py-3.5">Patient Name</th>
                    <th className="px-6 py-3.5">DOB &amp; Gender</th>
                    <th className="px-6 py-3.5">Blood Type</th>
                    <th className="px-6 py-3.5">Known Allergies</th>
                    <th className="px-6 py-3.5 text-right">Medical Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-semibold text-teal-700">{p.mrn}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {p.last_name}, {p.first_name}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {p.date_of_birth} ({p.gender})
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{p.blood_group || "Unknown"}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {p.allergies ? (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200">
                            {p.allergies}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">NKDA</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/patients/${p.id}`}
                          className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          View Chart &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Register Patient */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-lg font-bold text-slate-900">Register New Patient</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">DOB</label>
                    <input
                      type="date"
                      required
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Type</label>
                    <select
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="patient@example.com"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Known Allergies</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Latex, Peanuts"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Past Medical History</label>
                  <textarea
                    rows={2}
                    value={formData.medical_history}
                    onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                    placeholder="e.g. Hypertension (2018), Type 2 Diabetes"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={submitting}>
                    Enroll Patient
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
