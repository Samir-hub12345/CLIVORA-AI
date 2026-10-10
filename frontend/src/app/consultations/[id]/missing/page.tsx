"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function ConsultationMissingPage() {
  const params = useParams();
  const router = useRouter();
  const consultId = (params?.id as string) || "ENC-5902";

  const { consultations, patients, updateConsult, toast } = useClinova();
  const consultation = consultations[consultId];
  const patient = patients.find((p) => p.id === consultation?.patientId);

  if (!consultation || !patient) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <h2>Consultation not found</h2>
          <Link href="/consultations" className="btn btn-primary" style={{ marginTop: 16 }}>
            Back to consultations
          </Link>
        </div>
      </div>
    );
  }

  const handleConfirmAllergies = () => {
    updateConsult(
      consultation.id,
      () => ({ allergyConfirmed: true }),
      "Allergies verified by clinician"
    );
    toast("Allergies confirmed", "Patient allergy documentation marked verified", "success");
  };

  const handleReconcileMeds = () => {
    updateConsult(
      consultation.id,
      () => ({ medsReconciled: true }),
      "Medication list reconciled"
    );
    toast("Medications reconciled", "Active prescription doses verified", "success");
  };

  return (
    <div className="page">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href={`/consultations/${consultation.id}`}>Consultation {consultation.id}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Missing & Unverified Information</span>
      </nav>

      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Missing & Unverified Items</h1>
            <span className="badge badge-warning">Epistemic Uncertainty Review</span>
          </div>
          <p>
            Review and resolve unverified clinical fields for {patient.name} ({consultation.id}).
          </p>
        </div>
      </header>

      <div className="stack gap-4" style={{ maxWidth: 840 }}>
        {/* Item 1: Allergies */}
        <div className="card">
          <div className="card-header">
            <div className="row gap-2">
              <AlertTriangle style={{ width: 16, height: 16, color: "var(--warning)" }} />
              <h3>Allergy Confirmation</h3>
            </div>
            <span className={`badge ${consultation.allergyConfirmed ? "badge-success" : "badge-warning"}`}>
              {consultation.allergyConfirmed ? "Confirmed" : "Pending Confirmation"}
            </span>
          </div>
          <div className="card-body stack gap-3">
            <p className="small muted">
              Patient reported a historical penicillin rash. Anaphylaxis history and active reaction severity must be confirmed prior to antibiotic orders.
            </p>
            {!consultation.allergyConfirmed && (
              <div className="row gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleConfirmAllergies}>
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                  <span>Confirm allergy details</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Item 2: Meds Reconciliation */}
        <div className="card">
          <div className="card-header">
            <div className="row gap-2">
              <AlertTriangle style={{ width: 16, height: 16, color: "var(--warning)" }} />
              <h3>Active Medication Reconciliation</h3>
            </div>
            <span className={`badge ${consultation.medsReconciled ? "badge-success" : "badge-warning"}`}>
              {consultation.medsReconciled ? "Reconciled" : "Discrepancy Flag"}
            </span>
          </div>
          <div className="card-body stack gap-3">
            <p className="small muted">
              Cross-reference current patient-reported doses against hospital dispensing records before finalize.
            </p>
            {!consultation.medsReconciled && (
              <div className="row gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleReconcileMeds}>
                  <CheckCircle2 style={{ width: 14, height: 14 }} />
                  <span>Reconcile active medications</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="row between" style={{ marginTop: 8 }}>
          <Link href={`/consultations/${consultation.id}`} className="btn btn-secondary">
            <ArrowLeft style={{ width: 14, height: 14 }} />
            <span>Return to consultation workbench</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
