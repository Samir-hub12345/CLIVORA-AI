"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  User,
  AlertCircle,
  X,
  Check,
  Activity,
  WifiOff,
  UploadCloud,
  GitMerge,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";
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

  // Bulk Ingestion state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    total_records: number;
    valid_count: number;
    invalid_count: number;
    preview_items: any[];
    validation_errors: Array<{ row_number: number; raw_data: any; errors: string[] }>;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  // Deduplication state
  const [dedupModalOpen, setDedupModalOpen] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [loadingDedup, setLoadingDedup] = useState(false);
  const [mergeReason, setMergeReason] = useState("Duplicate clinical registration");
  const [mergingId, setMergingId] = useState<string | null>(null);

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

  const fetchDuplicates = async () => {
    setLoadingDedup(true);
    const res = await api.getDuplicateCandidates();
    if (res.data) {
      setDuplicateCandidates(res.data);
    }
    setLoadingDedup(false);
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handlePreviewImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", importFile);
    const res = await api.previewPatientImport(fd);
    if (res.data) {
      setImportPreview(res.data);
    } else {
      alert(res.error || "Failed to preview patient import file.");
    }
    setImporting(false);
  };

  const handleExecuteImport = async () => {
    if (!importPreview || !importPreview.preview_items.length) return;
    setImporting(true);
    const res = await api.executePatientImport(importPreview.preview_items);
    setImporting(false);
    if (res.data) {
      alert(`Successfully imported ${res.data.created_count} clinical patient records.`);
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      fetchPatients();
    } else {
      alert(res.error || "Failed to execute patient batch import.");
    }
  };

  const handleMerge = async (primaryId: string, secondaryId: string) => {
    if (
      !confirm(
        "Are you sure you want to merge the secondary chart into the primary chart? All clinical encounters, notes, and documents will be re-pointed to the primary record."
      )
    ) {
      return;
    }
    setMergingId(secondaryId);
    const res = await api.mergePatients({
      primary_patient_id: primaryId,
      secondary_patient_id: secondaryId,
      merge_reason: mergeReason,
    });
    setMergingId(null);
    if (res.data) {
      alert(`Records merged successfully! Moved ${res.data.encounters_moved} encounters and ${res.data.notes_moved} notes.`);
      fetchDuplicates();
      fetchPatients();
    } else {
      alert(res.error || "Failed to merge patient charts.");
    }
  };

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

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setDedupModalOpen(true);
                fetchDuplicates();
              }}
              className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <GitMerge className="w-4 h-4 text-indigo-600" />
              <span>Duplicate Reconciler</span>
              {duplicateCandidates.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full">
                  {duplicateCandidates.length}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setImportModalOpen(true)}
              disabled={networkState === "OFFLINE"}
              className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <UploadCloud className="w-4 h-4 text-teal-600" />
              <span>Batch Ingest (CSV/FHIR)</span>
            </Button>

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

        {/* ==================== BULK IMPORT MODAL ==================== */}
        {importModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900 text-lg">Batch Patient Ingestion (CSV / FHIR)</h3>
                </div>
                <button
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Upload demographic spreadsheets (.csv) or HL7 FHIR R4 Patient resource bundles (.json). The ingestion engine will validate demographics and assign collision-safe MRNs.
              </p>

              <form onSubmit={handlePreviewImport} className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-sm font-semibold text-teal-600 hover:text-teal-700">Choose CSV or FHIR JSON file</span>
                    <input
                      type="file"
                      accept=".csv,application/json,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setImportFile(e.target.files[0]);
                          setImportPreview(null);
                        }
                      }}
                    />
                  </label>
                  {importFile && (
                    <p className="text-xs font-mono text-slate-700 mt-2 bg-teal-50 py-1 px-2 rounded inline-block">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportModalOpen(false);
                      setImportFile(null);
                      setImportPreview(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!importFile} loading={importing}>
                    Analyze &amp; Preview
                  </Button>
                </div>
              </form>

              {/* Preview Section */}
              {importPreview && (
                <div className="border-t pt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-100 rounded-lg p-2">
                      <p className="text-xs text-slate-500 font-medium">Total Rows</p>
                      <p className="text-lg font-bold text-slate-900">{importPreview.total_records}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                      <p className="text-xs text-emerald-700 font-medium">Valid Records</p>
                      <p className="text-lg font-bold text-emerald-700">{importPreview.valid_count}</p>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-2 border border-rose-200">
                      <p className="text-xs text-rose-700 font-medium">Validation Errors</p>
                      <p className="text-lg font-bold text-rose-700">{importPreview.invalid_count}</p>
                    </div>
                  </div>

                  {importPreview.preview_items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Parsed Records Preview:</p>
                      <div className="max-h-40 overflow-y-auto border rounded-lg text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b">
                            <tr>
                              <th className="p-2 font-medium">Name</th>
                              <th className="p-2 font-medium">DOB</th>
                              <th className="p-2 font-medium">Gender</th>
                              <th className="p-2 font-medium">Phone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.preview_items.slice(0, 5).map((r: any, idx: number) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="p-2 font-medium">{r.first_name} {r.last_name}</td>
                                <td className="p-2 text-slate-600">{r.date_of_birth}</td>
                                <td className="p-2 text-slate-600">{r.gender}</td>
                                <td className="p-2 text-slate-600">{r.phone || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {importPreview.validation_errors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Validation Issues Found:
                      </p>
                      <ul className="list-disc pl-4 max-h-24 overflow-y-auto">
                        {importPreview.validation_errors.map((err, i) => (
                          <li key={i}>
                            Row {err.row_number}: {err.errors.join("; ")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleExecuteImport}
                      disabled={importPreview.valid_count === 0}
                      loading={importing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Commit Import ({importPreview.valid_count} Records)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== DUPLICATE RECONCILER MODAL ==================== */}
        {dedupModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-lg">Patient Deduplication &amp; Chart Reconciler</h3>
                </div>
                <button
                  onClick={() => setDedupModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Multi-identifier fuzzy matching scans records with overlapping names, phone numbers, and birth dates. Reconciling repoints all encounters, notes, and observations to the primary chart while preserving provenance.
              </p>

              {loadingDedup ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Scanning patient registry for potential duplicate profiles...
                </div>
              ) : duplicateCandidates.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <Check className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  No duplicate patient candidates detected in the current facility directory.
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicateCandidates.map((cand, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                          Duplicate Candidate Pair #{idx + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                            cand.match_level === "HIGH"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {(cand.confidence_score * 100).toFixed(0)}% {cand.match_level} MATCH
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <p className="font-semibold text-slate-900">{cand.primary_name}</p>
                          <p className="text-slate-500 font-mono text-[11px]">MRN: {cand.primary_mrn}</p>
                          <span className="mt-1 inline-block px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-semibold">
                            Primary Chart Target
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <p className="font-semibold text-slate-900">{cand.duplicate_name}</p>
                          <p className="text-slate-500 font-mono text-[11px]">MRN: {cand.duplicate_mrn}</p>
                          <span className="mt-1 inline-block px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded font-semibold">
                            Secondary Record (To Merge)
                          </span>
                        </div>
                      </div>

                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5 text-xs text-indigo-900 space-y-1">
                        <p className="font-semibold text-[11px]">Matching Evidence Signals:</p>
                        <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                          {cand.matching_signals.map((sig: string, sIdx: number) => (
                            <li key={sIdx}>{sig}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <input
                          type="text"
                          value={mergeReason}
                          onChange={(e) => setMergeReason(e.target.value)}
                          placeholder="Clinical merge justification..."
                          className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg w-2/3 focus:ring-2 focus:ring-indigo-500"
                        />
                        <Button
                          size="sm"
                          disabled={mergingId === cand.duplicate_patient_id}
                          loading={mergingId === cand.duplicate_patient_id}
                          onClick={() => handleMerge(cand.primary_patient_id, cand.duplicate_patient_id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          Merge Records
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
