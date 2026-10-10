"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Phone, MessageSquare, CheckCircle2, Sparkles, Smartphone } from "lucide-react";
import { useClinova } from "@/lib/referenceContext";

export default function InstructionsPage() {
  const params = useParams();
  const router = useRouter();
  const consultId = (params?.id as string) || "ENC-5902";

  const { consultations, patients, toast } = useClinova();
  const consultation = consultations[consultId];
  const patient = patients.find((p) => p.id === consultation?.patientId);

  const [lang, setLang] = useState("English");
  const [channel, setChannel] = useState("SMS");
  const [body, setBody] = useState(
    `Hello ${patient?.name || "Ada"}, here are your instructions from Dr. Joshua Ajose at Lekki Family Health Clinic:\n\n1. Take Paracetamol 1g as needed for headache (maximum 4 times daily).\n2. Continue your daily Amlodipine 5mg each morning.\n3. Drink at least 2 litres of water daily.\n4. If severe persistent headache develops, return immediately.\n\nYour follow-up is scheduled in 7 days.`
  );
  const [sending, setSending] = useState(false);

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

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast("Instructions sent", `Dispatched via ${channel} to ${patient.phone}`, "success");
      router.push(`/consultations/${consultation.id}`);
    }, 700);
  };

  return (
    <div className="page">
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link href={`/consultations/${consultation.id}`}>Consultation {consultation.id}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Patient Instructions</span>
      </nav>

      <header className="page-header">
        <div className="stack gap-1">
          <div className="row gap-3 wrap">
            <h1>Patient Instructions</h1>
            <span className="demo-ribbon">Vernacular Translation & SMS Preview</span>
          </div>
          <p>
            Personalized discharge instructions for {patient.name} ({consultation.id}).
          </p>
        </div>
      </header>

      <div className="grid grid-2 gap-5" style={{ alignItems: "start" }}>
        {/* Editor Form */}
        <div className="stack gap-4">
          <div className="card">
            <div className="card-header">
              <h3>Delivery Options & Translation</h3>
              <span className="badge badge-teal">Staff Approved</span>
            </div>
            <div className="card-body stack gap-4">
              <div className="grid grid-2 gap-3">
                <div className="field">
                  <label className="label" htmlFor="ins-lang">
                    <span>Language</span>
                  </label>
                  <select
                    id="ins-lang"
                    className="select"
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Nigerian Pidgin">Nigerian Pidgin</option>
                    <option value="Yoruba">Yoruba</option>
                    <option value="Hausa">Hausa</option>
                    <option value="French">French</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="ins-chan">
                    <span>Delivery Channel</span>
                  </label>
                  <select
                    id="ins-chan"
                    className="select"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    <option value="SMS">SMS ({patient.phone})</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email ({patient.email || "On file"})</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="ins-body">
                  <span>Instruction message body</span>
                </label>
                <textarea
                  id="ins-body"
                  className="textarea"
                  style={{ minHeight: 180 }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div className="row between">
                <Link href={`/consultations/${consultation.id}`} className="btn btn-ghost">
                  <ArrowLeft style={{ width: 14, height: 14 }} />
                  <span>Back</span>
                </Link>
                <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
                  {sending && <span className="spinner" />}
                  <Send style={{ width: 14, height: 14 }} />
                  <span>Send to patient</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Phone Frame Preview */}
        <div className="stack gap-3" style={{ alignItems: "center" }}>
          <div className="phone-frame">
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div className="small strong">{channel} Preview</div>
              <div className="xs muted">To: {patient.name} ({patient.phone})</div>
            </div>

            <div className="sms-bubble">{body}</div>

            <div className="xs muted" style={{ marginTop: 8, textAlign: "center" }}>
              Delivered via Clinic Messaging Gateway
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
