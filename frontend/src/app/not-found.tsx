import React from "react";
import Link from "next/link";
import { AlertCircle, Home, LogIn, Activity } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page">
      <div
        className="card"
        style={{
          maxWidth: 560,
          margin: "60px auto",
          padding: 40,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          className="empty-icon"
          style={{
            margin: "0 auto 16px",
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--warning-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertCircle style={{ width: 24, height: 24, color: "var(--warning)" }} aria-hidden="true" />
        </div>

        <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>We couldn’t find that page</h1>
        <p className="muted" style={{ maxWidth: 440, marginBottom: 20 }}>
          It may have been moved, or you may not have access. No information from other records has been shown in its place.
        </p>

        <div className="row gap-2 wrap" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn btn-primary">
            <Home style={{ width: 14, height: 14 }} aria-hidden="true" />
            <span>Back to overview</span>
          </Link>
          <Link href="/login" className="btn btn-secondary">
            <LogIn style={{ width: 14, height: 14 }} aria-hidden="true" />
            <span>Staff Sign In</span>
          </Link>
          <Link href="/patient" className="btn btn-ghost">
            <Activity style={{ width: 14, height: 14 }} aria-hidden="true" />
            <span>Patient Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
