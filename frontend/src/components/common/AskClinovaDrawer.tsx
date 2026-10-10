"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, AlertTriangle, ShieldCheck, CheckCircle2, User } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

interface AskClinovaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string | null;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  facts?: string[];
  uncertainty?: string;
}

export const AskClinovaDrawer: React.FC<AskClinovaDrawerProps> = ({
  isOpen,
  onClose,
  patientId,
}) => {
  const { patients, user } = useClinova();
  const patient = patientId ? patients.find((p) => p.id === patientId) : patients[0];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m_welcome",
      sender: "ai",
      text: "I am your contextual clinical assistant. I can organise notes, extract facts from reports, and flag documentation gaps with explicit provenance.",
      facts: [
        "Patient in context: Ada Okafor (CLN-10482)",
        "Verified adherence to amlodipine 5mg on record",
        "Deterministic NEWS2 Acuity: Normal (0)",
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const quickPrompts = patient
    ? [
        "Summarise previous consultation",
        "Check medication interactions",
        "Show incomplete note sections",
      ]
    : [
        "How does Clinova AI assist documentation?",
        "Check vital acuity rules",
        "Review DPDP compliance guardrails",
      ];

  const handleSend = (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || loading) return;

    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      sender: "user",
      text: promptText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      let replyText = `Information evaluated for ${patient?.name || "clinical context"}:`;
      let factsList: string[] = [];
      let uncertaintyText: string | undefined = undefined;

      const q = promptText.toLowerCase();
      if (q.includes("summarise") || q.includes("consultation") || q.includes("visit")) {
        replyText = "Summary of previous consultation (Encounter ENC-5902):";
        factsList = [
          "Presenting symptom: Intermittent frontotemporal headache for 3 days",
          "Vitals documented: BP 132/84 mmHg, HR 76 bpm, SpO2 99%",
          "Relevant history: Mild hypertension (2021) managed on Amlodipine 5mg PO daily",
        ];
        uncertaintyText = "Examination findings await attending clinician review.";
      } else if (q.includes("medication") || q.includes("interaction") || q.includes("drug")) {
        replyText = "Medication safety and allergy verification:";
        factsList = [
          "Active daily prescription: Amlodipine 5mg daily",
          "No adverse pharmacological interaction detected between Paracetamol and Amlodipine",
        ];
        uncertaintyText = "Penicillin rash history recorded in 2018 — verify allergy severity prior to beta-lactam orders.";
      } else if (q.includes("incomplete") || q.includes("section") || q.includes("missing")) {
        replyText = "Documentation reconciliation status:";
        factsList = [
          "Chief complaint: Documented",
          "History of present illness: Documented",
          "Allergy confirmation: Pending physician verification",
          "Plan: Draft saved",
        ];
      } else {
        replyText = "Clinical guidelines and documentation assistance:";
        factsList = [
          "All AI summaries cite primary source records with date stamps",
          "Physician approval is required before note sign-off or instruction dispatch",
          "Zero private health data is transferred to external public models",
        ];
      }

      const aiMsg: ChatMessage = {
        id: "ai_" + Date.now(),
        sender: "ai",
        text: replyText,
        facts: factsList,
        uncertainty: uncertaintyText,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 500);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 120 }}>
      {/* Overlay */}
      <div
        className="overlay"
        style={{
          background: "rgba(13, 33, 53, 0.4)",
          position: "absolute",
          inset: 0,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="drawer"
        role="dialog"
        aria-label="Clinova AI assistant"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 440,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.12)",
          display: "flex",
          flexDirection: "column",
          zIndex: 121,
        }}
      >
        {/* Head */}
        <div className="ai-panel-head">
          <span className="ai-mark">
            <Sparkles style={{ width: 16, height: 16 }} aria-hidden="true" />
          </span>
          <div className="grow">
            <div className="strong" style={{ fontSize: 15 }}>
              Clinova AI
            </div>
            <div className="xs muted">Contextual clinical assistant · Demo mode</div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Close assistant"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Patient Context Ribbon */}
        <div
          className="ws-section"
          style={{
            background: "var(--surface-2)",
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {patient ? (
            <div className="row gap-3">
              <span className="avatar sm">
                {patient.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="grow">
                <div className="small medium" style={{ color: "var(--text)" }}>
                  Context: {patient.name}
                </div>
                <div className="xs muted">
                  {patient.id} · Access bounded to active encounter
                </div>
              </div>
            </div>
          ) : (
            <div className="xs muted">
              No specific patient selected. Queries will evaluate institutional guidelines.
            </div>
          )}
        </div>

        {/* Messages Thread */}
        <div
          className="ai-thread stack gap-3"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
              }}
            >
              <div
                style={{
                  background: m.sender === "user" ? "var(--teal-600)" : "var(--surface-2)",
                  color: m.sender === "user" ? "#fff" : "var(--text)",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: m.sender === "user" ? "none" : "1px solid var(--border)",
                }}
              >
                <div>{m.text}</div>
                {m.facts && m.facts.length > 0 && (
                  <ul
                    style={{
                      margin: "8px 0 0 0",
                      paddingLeft: 18,
                      fontSize: 12,
                      opacity: 0.9,
                    }}
                  >
                    {m.facts.map((fact, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}
                {m.uncertainty && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 8px",
                      background: "rgba(224, 138, 25, 0.1)",
                      borderLeft: "3px solid var(--warning)",
                      borderRadius: 4,
                      fontSize: 12,
                      color: "var(--text)",
                    }}
                  >
                    <strong>Note:</strong> {m.uncertainty}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", padding: "8px 12px" }}>
              <span className="xs subtle">Evaluating clinical records…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Composer */}
        <div
          className="ai-composer stack gap-2"
          style={{
            padding: "14px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {/* Quick Action Chips */}
          <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="chip"
                style={{ fontSize: 11, cursor: "pointer" }}
                onClick={() => handleSend(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>

          <form
            className="row gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <textarea
              className="textarea grow"
              rows={2}
              placeholder={patient ? `Ask about ${patient.name.split(" ")[0]}’s chart…` : "Ask Clinova AI…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ fontSize: 13, resize: "none" }}
            />
            <button
              type="submit"
              className="btn btn-accent btn-icon"
              disabled={loading || !input.trim()}
              aria-label="Send to assistant"
              style={{ alignSelf: "flex-end", height: 42, width: 42 }}
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          </form>

          <p className="xs muted" style={{ margin: 0, textAlign: "center" }}>
            AI drafts require clinician review. Do not use for emergencies.
          </p>
        </div>
      </aside>
    </div>
  );
};
