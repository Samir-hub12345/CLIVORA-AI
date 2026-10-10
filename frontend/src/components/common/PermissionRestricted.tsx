"use client";

import React from "react";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

interface PermissionRestrictedProps {
  what?: string;
  role?: string;
}

export const PermissionRestricted: React.FC<PermissionRestrictedProps> = ({
  what = "this area",
  role,
}) => {
  const { me } = useClinova();
  const displayRole = role || me.role;

  return (
    <div className="page" style={{ padding: "40px 16px" }}>
      <div
        className="card"
        style={{
          maxWidth: 580,
          margin: "0 auto",
          padding: "40px 32px",
          textAlign: "center",
          borderRadius: 12,
        }}
      >
        <div
          className="empty-icon"
          style={{
            margin: "0 auto 16px",
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "var(--navy-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--navy-700)",
          }}
        >
          <Lock style={{ width: 24, height: 24 }} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
          You don’t have access to this page
        </h2>
        <p className="muted" style={{ fontSize: "0.9375rem", lineHeight: 1.5, marginBottom: 24 }}>
          Your role ({displayRole}) does not include permission to view {what}. If you need access, ask a clinic administrator to review your role.
        </p>
        <div className="row gap-2" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-secondary btn-sm">
            <ArrowLeft style={{ width: 14, height: 14 }} aria-hidden="true" />
            <span>Back to workspace overview</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
