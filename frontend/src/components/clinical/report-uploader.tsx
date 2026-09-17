"use client";

import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { OCRField, ReportOCRResult } from "@/types";
import { ProvenanceBadge } from "./provenance-badge";

interface ReportUploaderProps {
  onReportExtracted: (filename: string, fields: OCRField[]) => void;
}

export const ReportUploader: React.FC<ReportUploaderProps> = ({ onReportExtracted }) => {
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<ReportOCRResult | null>(null);
  const [fields, setFields] = useState<OCRField[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file?: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      const res = await api.processReportOCR(formData);
      if (res.data) {
        setOcrResult(res.data);
        setFields(res.data.fields);
        onReportExtracted(res.data.report_filename, res.data.fields);
      } else {
        setError(res.error || "OCR service unable to parse report.");
      }
    } catch (e: any) {
      setError("Network or file upload error. Using synthetic sample fallback.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFieldVerification = (index: number) => {
    setFields((prev) => {
      const updated = [...prev];
      const current = updated[index].verification_status;
      updated[index].verification_status = current === "verified" ? "pending" : "verified";
      if (ocrResult) {
        onReportExtracted(ocrResult.report_filename, updated);
      }
      return updated;
    });
  };

  const removeReport = () => {
    setOcrResult(null);
    setFields([]);
    onReportExtracted("", []);
  };

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Optional Medical Report Upload &amp; OCR</h4>
            <p className="text-xs text-slate-500">
              Attach prior CBC / pathology lab report &bull; Automatic field extraction
            </p>
          </div>
        </div>
        {ocrResult && (
          <ProvenanceBadge
            sourceType="ocr"
            confidence={ocrResult.confidence_average}
            label={ocrResult.report_filename}
          />
        )}
      </div>

      {!ocrResult && !loading && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center space-y-3 bg-slate-50/50">
          <Upload className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Drag &amp; drop lab report or click to browse
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports PNG, JPG, PDF (Up to 10MB) &bull; Optional step
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-sm">
              <span>Choose File</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => handleFileUpload()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-semibold text-xs rounded-lg shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Load Synthetic CBC Sample</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-8 space-y-2 bg-slate-50 rounded-xl">
          <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
          <p className="text-xs font-medium text-slate-700">
            Running OCR pipeline and extracting clinical laboratory parameters...
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {ocrResult && fields.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Extracted Parameters ({fields.length} items &bull; Avg. Confidence: {Math.round(ocrResult.confidence_average * 100)}%)
            </span>
            <button
              type="button"
              onClick={removeReport}
              className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Remove Report
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields.map((field, idx) => {
              const isVerified = field.verification_status === "verified";
              return (
                <div
                  key={idx}
                  onClick={() => toggleFieldVerification(idx)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isVerified
                      ? "bg-emerald-50/70 border-emerald-300"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">{field.field_name}</span>
                    <span className="text-slate-700 font-mono font-bold">
                      {field.value} {field.unit}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      OCR Confidence: {Math.round(field.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    {isVerified ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Confirm
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 italic">
            * Synthetic sample — not a real medical record. Extracted values must be verified by a qualified health worker or reviewer.
          </p>
        </div>
      )}
    </div>
  );
};
