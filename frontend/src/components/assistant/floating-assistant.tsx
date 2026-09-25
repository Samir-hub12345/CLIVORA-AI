"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Minimize2,
  PowerOff,
  RotateCcw,
} from "lucide-react";
import { assistantApi } from "@/lib/api";
import {
  AssistantMessageResponse,
  AssistantCapabilities,
  ProposedAction,
} from "@/types";
import { useAuth } from "@/lib/auth";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "or", name: "ଓଡ଼ିଆ (Odia)" },
  { code: "bn", name: "বাংলা (Bengali)" },
  { code: "te", name: "తెలుగు (Telugu)" },
  { code: "ta", name: "தமிழ் (Tamil)" },
  { code: "mr", name: "मराठी (Marathi)" },
  { code: "gu", name: "ગુજરાતી (Gujarati)" },
  { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", name: "മലയാളം (Malayalam)" },
  { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)" },
];

export const FloatingAssistant: React.FC = () => {
  const { user } = useAuth();

  // Assistant active/disabled state
  const [enabled, setEnabled] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>("en");
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Dragging & Dismiss State
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isOverDismiss, setIsOverDismiss] = useState<boolean>(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    elemX: number;
    elemY: number;
    moved: boolean;
  }>({ startX: 0, startY: 0, elemX: 0, elemY: 0, moved: false });
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const dismissZoneRef = useRef<HTMLDivElement | null>(null);

  // Voice & Interaction State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<AssistantMessageResponse | null>(null);
  const [executingTool, setExecutingTool] = useState<boolean>(false);
  const [toolResult, setToolResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize position and enabled state from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Preference: Enabled
    const storedEnabled = localStorage.getItem("clinova_assistant_enabled");
    if (storedEnabled === "false") {
      setEnabled(false);
    } else {
      setEnabled(true);
    }

    // Preference: Language
    const storedLang = localStorage.getItem("clinova_assistant_language");
    if (storedLang) {
      setLanguage(storedLang);
    }

    // Preference: TTS
    const storedTts = localStorage.getItem("clinova_assistant_tts");
    if (storedTts !== null) {
      setTtsEnabled(storedTts !== "false");
    }

    // Default or stored position (bounded)
    const storedPos = localStorage.getItem("clinova_assistant_pos");
    const pad = 24;
    const btnSize = 56;
    const defaultX = window.innerWidth - btnSize - pad;
    const defaultY = window.innerHeight - btnSize - pad;

    if (storedPos) {
      try {
        const parsed = JSON.parse(storedPos);
        const clampedX = Math.max(
          16,
          Math.min(window.innerWidth - btnSize - 16, parsed.x)
        );
        const clampedY = Math.max(
          16,
          Math.min(window.innerHeight - btnSize - 16, parsed.y)
        );
        setPosition({ x: clampedX, y: clampedY });
      } catch {
        setPosition({ x: defaultX, y: defaultY });
      }
    } else {
      setPosition({ x: defaultX, y: defaultY });
    }

    // Listen to custom toggle events from Header or settings
    const handleToggle = (e: CustomEvent<{ enabled: boolean }>) => {
      if (typeof e.detail?.enabled === "boolean") {
        setEnabled(e.detail.enabled);
        if (e.detail.enabled && !position.x) {
          setPosition({ x: defaultX, y: defaultY });
        }
      }
    };

    window.addEventListener(
      "clinova-assistant-toggle",
      handleToggle as EventListener
    );

    return () => {
      window.removeEventListener(
        "clinova-assistant-toggle",
        handleToggle as EventListener
      );
    };
  }, []);

  // Update browser window resize clamping
  useEffect(() => {
    const handleResize = () => {
      const btnSize = 56;
      setPosition((prev) => ({
        x: Math.max(16, Math.min(window.innerWidth - btnSize - 16, prev.x)),
        y: Math.max(16, Math.min(window.innerHeight - btnSize - 16, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Disable / Dismiss Assistant Handler
  const dismissAssistant = useCallback(() => {
    setEnabled(false);
    setIsOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("clinova_assistant_enabled", "false");
      window.dispatchEvent(
        new CustomEvent("clinova-assistant-toggle", {
          detail: { enabled: false },
        })
      );
    }
    // Inform backend of preference update
    assistantApi
      .updatePreferences({
        assistant_enabled: false,
        language,
        voice_enabled: true,
        voice_response_enabled: ttsEnabled,
      })
      .catch(() => {});
  }, [language, ttsEnabled]);

  // Speech Recognition Setup
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "en" ? "en-US" : language === "hi" ? "hi-IN" : "en-IN";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInputMessage(transcript);
        handleSendMessage(transcript, true);
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [language]);

  // Voice toggle
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang =
            language === "en" ? "en-US" : language === "hi" ? "hi-IN" : "en-IN";
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
        }
      }
    }
  };

  // Text to Speech playback
  const speakText = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "hi" ? "hi-IN" : "en-US";
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled, language]
  );

  // Send message to assistant
  const handleSendMessage = async (msgToSend?: string, wasVoice = false) => {
    const text = (msgToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setLastUserMessage(text);
    setInputMessage("");
    setIsLoading(true);
    setToolResult(null);

    try {
      const res = await assistantApi.sendMessage({
        message: text,
        language,
        voice_input: wasVoice,
      });
      if (res.data) {
        setResponse(res.data);
        if (ttsEnabled && res.data.text) {
          speakText(res.data.text);
        }
      } else {
        setResponse({
          text: res.error || "I could not process that request at this moment. Please check your network connection or try again.",
          language,
          source_label: "Service Notice",
          requires_confirmation: false,
          follow_up_suggestions: ["Try again", "Describe symptoms"],
        });
      }
    } catch (err: any) {
      setResponse({
        text: "I could not process that request at this moment. Please check your network connection or try again.",
        language,
        source_label: "Service Error",
        requires_confirmation: false,
        follow_up_suggestions: ["Try again", "Describe symptoms"],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute human-in-the-loop confirmed tool
  const handleExecuteTool = async (action: ProposedAction, confirmed: boolean) => {
    setExecutingTool(true);
    try {
      const res = await assistantApi.executeTool({
        tool_name: action.tool_name,
        parameters: action.parameters,
        confirmed,
      });
      if (res.data) {
        setToolResult({
          success: res.data.success,
          message: res.data.message,
        });
        if (res.data.success && ttsEnabled) {
          speakText("Action confirmed and executed successfully.");
        }
      } else {
        setToolResult({
          success: false,
          message: res.error || "Failed to execute action.",
        });
      }
    } catch (err: any) {
      setToolResult({
        success: false,
        message: err.message || "Failed to execute action.",
      });
    } finally {
      setExecutingTool(false);
    }
  };

  // Pointer Drag Handlers (Draggable with boundary clamp & drag-to-dismiss)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary mouse button / touch
    if (e.button !== 0) return;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elemX: position.x,
      elemY: position.y,
      moved: false,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 6) {
      dragStartRef.current.moved = true;
    }

    const btnSize = 56;
    const nextX = Math.max(
      12,
      Math.min(window.innerWidth - btnSize - 12, dragStartRef.current.elemX + dx)
    );
    const nextY = Math.max(
      12,
      Math.min(window.innerHeight - btnSize - 12, dragStartRef.current.elemY + dy)
    );

    setPosition({ x: nextX, y: nextY });

    // Check collision with dismiss zone at bottom center
    if (dismissZoneRef.current) {
      const rect = dismissZoneRef.current.getBoundingClientRect();
      const btnCenterX = nextX + btnSize / 2;
      const btnCenterY = nextY + btnSize / 2;

      const isOver =
        btnCenterX >= rect.left - 20 &&
        btnCenterX <= rect.right + 20 &&
        btnCenterY >= rect.top - 20 &&
        btnCenterY <= rect.bottom + 20;

      setIsOverDismiss(isOver);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // If dropped over dismiss zone: dismiss assistant completely
    if (isOverDismiss) {
      dismissAssistant();
      setIsOverDismiss(false);
      return;
    }

    // Persist clamped position
    if (typeof window !== "undefined") {
      localStorage.setItem("clinova_assistant_pos", JSON.stringify(position));
    }

    // If it was a click (not a drag), toggle panel
    if (!dragStartRef.current.moved) {
      setIsOpen((prev) => !prev);
    }
  };

  // If user has disabled the assistant, render nothing
  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* DRAG-TO-DISMISS BOTTOM DROP ZONE                              */}
      {/* Visible only while user is actively dragging the button        */}
      {/* ------------------------------------------------------------- */}
      {isDragging && (
        <div
          ref={dismissZoneRef}
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-200 pointer-events-none flex items-center gap-2.5 px-6 py-3 rounded-full border-2 shadow-2xl backdrop-blur-md ${
            isOverDismiss
              ? "bg-rose-600 border-rose-300 text-white scale-110 shadow-rose-900/50 ring-4 ring-rose-400/40"
              : "bg-slate-900/90 border-dashed border-slate-400 text-white shadow-black/40 scale-100"
          }`}
        >
          <div
            className={`p-1 rounded-full ${
              isOverDismiss ? "bg-white text-rose-600" : "bg-slate-800 text-slate-300"
            }`}
          >
            <X className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold tracking-wide">
            {isOverDismiss
              ? "Release to disable Clinova Assistant"
              : "Drop here to dismiss assistant"}
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VOICE-ONLY MINIMAL FLOATING BUTTON                            */}
      {/* Strictly minimal: NO text labels, NO speech bubbles           */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: "none",
        }}
        className={`fixed z-[90] select-none ${
          isDragging ? "cursor-grabbing opacity-90 scale-105" : "cursor-grab"
        } transition-transform duration-75`}
      >
        <button
          type="button"
          aria-label="Clinova AI Voice Assistant"
          title="Clinova AI Voice Assistant (Drag to reposition, drop at bottom to dismiss)"
          className={`relative group flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all ${
            isOpen
              ? "bg-slate-900 text-teal-400 ring-2 ring-teal-500 shadow-teal-900/30"
              : isListening
              ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-300 shadow-rose-600/40"
              : "bg-gradient-to-tr from-teal-600 to-emerald-600 text-white hover:shadow-teal-600/40 hover:scale-105 active:scale-95"
          }`}
        >
          {/* Subtle audio ripple ring when active */}
          {isListening && (
            <span className="absolute -inset-1 rounded-full border-2 border-rose-400 animate-ping opacity-75" />
          )}

          {isOpen ? (
            <Minimize2 className="w-5 h-5" />
          ) : isListening ? (
            <Mic className="w-6 h-6 animate-bounce" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VOICE-FIRST INTERACTION PANEL                                 */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="assistant-panel-title"
          className="fixed bottom-24 right-4 sm:right-8 z-[95] w-[92vw] sm:w-[420px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-3 duration-200"
        >
          {/* Panel Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-600 text-white rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3
                  id="assistant-panel-title"
                  className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5"
                >
                  Clinova Voice Assistant
                  <span className="text-[9px] bg-teal-950 text-teal-300 px-1.5 py-0.5 rounded border border-teal-800 uppercase font-medium">
                    {user?.role || "Patient"}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Voice-first clinical triage intelligence
                </p>
              </div>
            </div>

            {/* Header controls: TTS toggle, Language, Dismiss, Close */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const next = !ttsEnabled;
                  setTtsEnabled(next);
                  localStorage.setItem("clinova_assistant_tts", String(next));
                }}
                title={ttsEnabled ? "Mute voice readout" : "Enable voice readout"}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition ${
                  ttsEnabled ? "bg-slate-800 text-teal-300" : ""
                }`}
              >
                {ttsEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={dismissAssistant}
                title="Disable assistant (can re-enable from header)"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              >
                <PowerOff className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Minimize assistant"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Language selector bar */}
          <div className="bg-slate-50 border-b border-slate-100 px-4 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Spoken Language:</span>
            <select
              value={language}
              onChange={(e) => {
                const val = e.target.value;
                setLanguage(val);
                localStorage.setItem("clinova_assistant_language", val);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700 font-semibold text-xs focus:ring-1 focus:ring-teal-500 outline-none"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Conversation & Responses Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-[160px] max-h-[380px]">
            {/* Voice Hub Hero */}
            <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-b from-teal-50/50 to-white rounded-xl border border-teal-100/60 text-center">
              <button
                type="button"
                onClick={toggleListening}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all ${
                  isListening
                    ? "bg-rose-600 text-white scale-110 shadow-rose-500/40 ring-4 ring-rose-200"
                    : "bg-teal-600 text-white hover:bg-teal-700 hover:scale-105"
                }`}
              >
                {isListening ? (
                  <MicOff className="w-7 h-7" />
                ) : (
                  <Mic className="w-7 h-7" />
                )}
              </button>
              <span className="mt-2 text-xs font-semibold text-slate-700">
                {isListening
                  ? "Listening... Speak your symptom or question"
                  : "Tap to Speak (Voice-First)"}
              </span>
              <span className="text-[10px] text-slate-400">
                Supports English, Hindi, Odia & 8 other languages
              </span>
            </div>

            {/* Last User Query */}
            {lastUserMessage && (
              <div className="flex justify-end">
                <div className="bg-teal-600 text-white text-xs rounded-2xl rounded-tr-xs px-3.5 py-2 max-w-[85%] shadow-xs">
                  {lastUserMessage}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
                <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                <span>Processing clinical assistant intelligence...</span>
              </div>
            )}

            {/* Assistant Response Card */}
            {response && (
              <div className="space-y-2">
                {/* Emergency banner if acute */}
                {response.source_label?.includes("Emergency") && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Emergency Red Flag Detected
                      </span>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        {response.text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Normal Response Text */}
                {!response.source_label?.includes("Emergency") && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200">
                        {response.source_label}
                      </span>
                      {response.detected_language && (
                        <span className="text-[9px] text-slate-400">
                          Detected: {response.detected_language.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                      {response.text}
                    </p>
                  </div>
                )}

                {/* Human Confirmation Card for Consequential Actions */}
                {response.requires_confirmation && response.proposed_action && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Human Review Required (Action Proposal)</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      {response.proposed_action.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={executingTool}
                        onClick={() =>
                          handleExecuteTool(response.proposed_action!, true)
                        }
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Action</span>
                      </button>
                      <button
                        type="button"
                        disabled={executingTool}
                        onClick={() =>
                          handleExecuteTool(response.proposed_action!, false)
                        }
                        className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Tool Execution Result */}
                {toolResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      toolResult.success
                        ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                        : "bg-slate-100 text-slate-800 border border-slate-200"
                    }`}
                  >
                    {toolResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                    )}
                    <span>{toolResult.message}</span>
                  </div>
                )}

                {/* Quick Follow-up suggestion pills */}
                {response.follow_up_suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {response.follow_up_suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleSendMessage(sug)}
                        className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-full transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Default Quick Prompts if no conversation yet */}
            {!response && !isLoading && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Suggested topics
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Check my intake case status",
                    "What information is missing?",
                    "Explain hypertension",
                    "How to record vitals",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text Input Fallback (for loud environments / keyboard users) */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Or type a question / symptom..."
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
            <button
              type="button"
              disabled={!inputMessage.trim() || isLoading}
              onClick={() => handleSendMessage()}
              className="p-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Safety Disclaimer Footer */}
          <div className="px-3 py-1 bg-slate-100 border-t border-slate-200 text-[9px] text-slate-500 text-center">
            Educational prototype only. All clinical decisions require licensed
            human review.
          </div>
        </div>
      )}
    </>
  );
};
