"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, X, Volume2, Sparkles, Activity } from "lucide-react";
import { assistantApi } from "@/lib/api";
import { ProposedAction } from "@/types";
import { useAuth } from "@/lib/auth";

export const FloatingAssistant: React.FC = () => {
  const { user } = useAuth();

  // Assistant enabled state & voice session active state
  const [enabled, setEnabled] = useState<boolean>(true);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [language, setLanguage] = useState<string>("en");

  // Live subtitles for spoken conversation
  const [humanSpeech, setHumanSpeech] = useState<string>("");
  const [assistantSpeech, setAssistantSpeech] = useState<string>("");

  // Pending action awaiting voice confirmation
  const [pendingAction, setPendingAction] = useState<ProposedAction | null>(null);

  // Dragging & Dismiss State
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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

  // Audio / Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const voiceActiveRef = useRef<boolean>(false);
  const pendingActionRef = useRef<ProposedAction | null>(null);

  // Keep refs in sync
  useEffect(() => {
    voiceActiveRef.current = voiceActive;
  }, [voiceActive]);

  useEffect(() => {
    pendingActionRef.current = pendingAction;
  }, [pendingAction]);

  // Load preferences and position on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEnabled = localStorage.getItem("clinova_assistant_enabled");
    setEnabled(storedEnabled !== "false");

    const storedLang = localStorage.getItem("clinova_assistant_language");
    if (storedLang) setLanguage(storedLang);

    // Initial bounded position
    const pad = 24;
    const btnSize = 60;
    const defaultX = window.innerWidth - btnSize - pad;
    const defaultY = window.innerHeight - btnSize - pad;

    const storedPos = localStorage.getItem("clinova_assistant_pos");
    if (storedPos) {
      try {
        const parsed = JSON.parse(storedPos);
        const clampedX = Math.max(16, Math.min(window.innerWidth - btnSize - 16, parsed.x));
        const clampedY = Math.max(16, Math.min(window.innerHeight - btnSize - 16, parsed.y));
        setPosition({ x: clampedX, y: clampedY });
      } catch {
        setPosition({ x: defaultX, y: defaultY });
      }
    } else {
      setPosition({ x: defaultX, y: defaultY });
    }

    // Listen to custom toggle events from Header
    const handleToggle = (e: CustomEvent<{ enabled: boolean }>) => {
      if (typeof e.detail?.enabled === "boolean") {
        setEnabled(e.detail.enabled);
        if (!e.detail.enabled) {
          stopVoiceSession();
        }
      }
    };

    window.addEventListener("clinova-assistant-toggle", handleToggle as EventListener);
    return () => {
      window.removeEventListener("clinova-assistant-toggle", handleToggle as EventListener);
    };
  }, []);

  // Window resize bounds clamping
  useEffect(() => {
    const handleResize = () => {
      const btnSize = 60;
      setPosition((prev) => ({
        x: Math.max(16, Math.min(window.innerWidth - btnSize - 16, prev.x)),
        y: Math.max(16, Math.min(window.innerHeight - btnSize - 16, prev.y)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Dismiss assistant handler
  const dismissAssistant = useCallback(() => {
    stopVoiceSession();
    setEnabled(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("clinova_assistant_enabled", "false");
      window.dispatchEvent(
        new CustomEvent("clinova-assistant-toggle", { detail: { enabled: false } })
      );
    }
    assistantApi
      .updatePreferences({
        assistant_enabled: false,
        language,
        voice_enabled: true,
        voice_response_enabled: true,
      })
      .catch(() => {});
  }, [language]);

  // Natural Human Speech Synthesis Output
  const speakVoice = useCallback(
    (text: string, onDone?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onDone?.();
        return;
      }

      window.speechSynthesis.cancel();
      isSpeakingRef.current = true;
      setVoiceState("speaking");
      setAssistantSpeech(text);

      // Stop recognition while assistant is speaking to avoid hearing its own voice
      if (recognitionRef.current && isListeningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        isListeningRef.current = false;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Select voice based on language
      const voices = window.speechSynthesis.getVoices();
      if (language === "hi") {
        utterance.lang = "hi-IN";
        const hiVoice = voices.find((v) => v.lang.startsWith("hi"));
        if (hiVoice) utterance.voice = hiVoice;
      } else if (language === "or") {
        utterance.lang = "or-IN";
        const orVoice = voices.find((v) => v.lang.startsWith("or") || v.lang.startsWith("hi"));
        if (orVoice) utterance.voice = orVoice;
      } else {
        utterance.lang = "en-IN";
        const enVoice = voices.find(
          (v) =>
            v.lang.startsWith("en-IN") ||
            v.lang.startsWith("en-GB") ||
            v.lang.startsWith("en-US")
        );
        if (enVoice) utterance.voice = enVoice;
      }

      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (voiceActiveRef.current) {
          // Immediately resume listening for the ongoing human conversation
          startListening();
        } else {
          setVoiceState("idle");
        }
        onDone?.();
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        if (voiceActiveRef.current) {
          startListening();
        } else {
          setVoiceState("idle");
        }
        onDone?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  // Process human spoken utterance
  const processSpokenInput = async (spokenText: string) => {
    const clean = spokenText.trim();
    if (!clean) return;

    setHumanSpeech(clean);
    setVoiceState("thinking");

    // Check if user is confirming or cancelling a pending action by voice
    const lower = clean.toLowerCase();
    const currentAction = pendingActionRef.current;

    if (currentAction) {
      const isAffirmative =
        lower.includes("confirm") ||
        lower.includes("yes") ||
        lower.includes("proceed") ||
        lower.includes("approve") ||
        lower.includes("do it") ||
        lower.includes("हाँ") ||
        lower.includes("कर दो") ||
        lower.includes("ହଁ");

      const isNegative =
        lower.includes("cancel") ||
        lower.includes("no") ||
        lower.includes("stop") ||
        lower.includes("don't") ||
        lower.includes("नहीं") ||
        lower.includes("ନା");

      if (isAffirmative) {
        try {
          const execRes = await assistantApi.executeTool({
            tool_name: currentAction.tool_name,
            parameters: currentAction.parameters,
            confirmed: true,
          });
          setPendingAction(null);
          speakVoice("Action confirmed and executed successfully.");
          return;
        } catch {
          setPendingAction(null);
          speakVoice("Could not execute action. Please try again.");
          return;
        }
      } else if (isNegative) {
        setPendingAction(null);
        speakVoice("Action cancelled.");
        return;
      }
    }

    // Send query to assistant intelligence
    try {
      const res = await assistantApi.sendMessage({
        message: clean,
        language,
        voice_input: true,
      });

      if (res.data) {
        const replyText = res.data.text;
        if (res.data.detected_language && res.data.detected_language !== language) {
          setLanguage(res.data.detected_language);
        }

        // Check if consequential action requires voice confirmation
        if (res.data.requires_confirmation && res.data.proposed_action) {
          setPendingAction(res.data.proposed_action);
          const voicePrompt =
            `${replyText}. Please say "Confirm" to proceed, or say "Cancel" to stop.`;
          speakVoice(voicePrompt);
        } else {
          speakVoice(replyText);
        }
      } else {
        speakVoice("I could not process that. Please say that again.");
      }
    } catch {
      speakVoice("Connection issue. Please check your network and speak again.");
    }
  };

  // Start Voice Recognition Listener
  const startListening = () => {
    if (typeof window === "undefined" || isSpeakingRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      speakVoice("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang =
        language === "hi"
          ? "hi-IN"
          : language === "or"
          ? "or-IN"
          : language === "bn"
          ? "bn-IN"
          : language === "ta"
          ? "ta-IN"
          : language === "te"
          ? "te-IN"
          : "en-IN";

      recognition.onstart = () => {
        isListeningRef.current = true;
        setVoiceState("listening");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentSaid = (finalTranscript || interim).trim();
        if (currentSaid) {
          setHumanSpeech(currentSaid);
        }

        // Debounce silence detection: process when user stops speaking for 1.2s
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (finalTranscript.trim()) {
          silenceTimerRef.current = setTimeout(() => {
            processSpokenInput(finalTranscript);
          }, 600);
        } else if (interim.trim()) {
          silenceTimerRef.current = setTimeout(() => {
            processSpokenInput(interim);
          }, 1400);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === "no-speech") {
          // Keep listening in conversation mode
          if (voiceActiveRef.current && !isSpeakingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        } else if (e.error !== "aborted") {
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        // If active and not speaking, restart listening automatically for natural conversation
        if (voiceActiveRef.current && !isSpeakingRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      isListeningRef.current = false;
    }
  };

  // Start complete Voice-Only Session
  const startVoiceSession = () => {
    setVoiceActive(true);
    voiceActiveRef.current = true;
    setPendingAction(null);

    // Warm greeting voice intro based on language
    const greetings: Record<string, string> = {
      en: "Hello, I am Clinova's voice health assistant. How can I help you?",
      hi: "नमस्ते, मैं क्लिनोवा का वॉयस स्वास्थ्य सहायक हूँ। मैं आपकी क्या सहायता कर सकता हूँ?",
      or: "ନମସ୍କାର, ମୁଁ କ୍ଲିନୋଭା ର ଭଏସ୍ ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ। ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
    };

    const greeting = greetings[language] || greetings["en"];
    speakVoice(greeting);
  };

  // Stop complete Voice-Only Session
  const stopVoiceSession = () => {
    setVoiceActive(false);
    voiceActiveRef.current = false;
    setVoiceState("idle");
    setPendingAction(null);
    setHumanSpeech("");
    setAssistantSpeech("");

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      isListeningRef.current = false;
    }
  };

  // Toggle Voice Session on Floating Icon Click
  const toggleVoiceSession = () => {
    if (voiceActive) {
      stopVoiceSession();
    } else {
      startVoiceSession();
    }
  };

  // Pointer Drag Handlers (Draggable with drag-to-dismiss)
  const handlePointerDown = (e: React.PointerEvent) => {
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

    const btnSize = 60;
    const nextX = Math.max(12, Math.min(window.innerWidth - btnSize - 12, dragStartRef.current.elemX + dx));
    const nextY = Math.max(12, Math.min(window.innerHeight - btnSize - 12, dragStartRef.current.elemY + dy));

    setPosition({ x: nextX, y: nextY });

    if (dismissZoneRef.current) {
      const rect = dismissZoneRef.current.getBoundingClientRect();
      const btnCenterX = nextX + btnSize / 2;
      const btnCenterY = nextY + btnSize / 2;

      const isOver =
        btnCenterX >= rect.left - 24 &&
        btnCenterX <= rect.right + 24 &&
        btnCenterY >= rect.top - 24 &&
        btnCenterY <= rect.bottom + 24;

      setIsOverDismiss(isOver);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Drop over dismiss zone: disable assistant
    if (isOverDismiss) {
      dismissAssistant();
      setIsOverDismiss(false);
      return;
    }

    // Persist position
    if (typeof window !== "undefined") {
      localStorage.setItem("clinova_assistant_pos", JSON.stringify(position));
    }

    // Clicked (not dragged): activate or deactivate voice
    if (!dragStartRef.current.moved) {
      toggleVoiceSession();
    }
  };

  // If disabled, render nothing
  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* DRAG-TO-DISMISS BOTTOM DROP ZONE                              */}
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
            {isOverDismiss ? "Release to remove assistant" : "Drop here to dismiss assistant"}
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE VOICE-ONLY ORB & SPOKEN SUBTITLE INTERFACE              */}
      {/* Visible ONLY when voice session is activated by pressing icon */}
      {/* ------------------------------------------------------------- */}
      {voiceActive && (
        <div
          aria-live="polite"
          style={{
            left: `${Math.max(16, Math.min(window.innerWidth - 340, position.x - 140))}px`,
            top: `${Math.max(16, position.y - 170)}px`,
          }}
          className="fixed z-[85] w-[320px] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="bg-slate-950/90 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-4 shadow-2xl shadow-teal-950/40 text-white space-y-2.5">
            {/* Header: Voice State & Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full animate-ping ${
                    voiceState === "speaking"
                      ? "bg-teal-400"
                      : voiceState === "thinking"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                />
                <span className="text-[11px] font-bold tracking-wider uppercase text-teal-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  {voiceState === "speaking"
                    ? "Speaking..."
                    : voiceState === "thinking"
                    ? "Thinking..."
                    : "Listening to your voice..."}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 uppercase">
                {language}
              </span>
            </div>

            {/* Dynamic Sound Wave Visualizer */}
            <div className="flex items-center justify-center gap-1.5 h-10 py-1 bg-slate-900/60 rounded-xl border border-slate-800">
              {[40, 75, 100, 60, 90, 45, 80, 50, 95, 30].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height:
                      voiceState === "speaking"
                        ? `${Math.max(15, (h * Math.sin((i + 1) * 0.8)) % 100)}%`
                        : voiceState === "listening"
                        ? `${h * 0.6}%`
                        : "20%",
                  }}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    voiceState === "speaking"
                      ? "bg-gradient-to-t from-teal-500 to-emerald-400 animate-pulse"
                      : voiceState === "listening"
                      ? "bg-gradient-to-t from-rose-500 to-teal-400 animate-pulse"
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {/* Live Spoken Subtitles */}
            <div className="min-h-[48px] max-h-[72px] overflow-hidden text-xs leading-relaxed">
              {voiceState === "speaking" && assistantSpeech && (
                <p className="text-teal-200 line-clamp-3">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">
                    Clinova Spoken Response:
                  </span>
                  &ldquo;{assistantSpeech}&rdquo;
                </p>
              )}

              {voiceState !== "speaking" && humanSpeech && (
                <p className="text-slate-200 line-clamp-3">
                  <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider">
                    You Said:
                  </span>
                  &ldquo;{humanSpeech}&rdquo;
                </p>
              )}

              {!assistantSpeech && !humanSpeech && (
                <p className="text-slate-400 italic text-[11px] text-center pt-2">
                  Speak naturally into your microphone...
                </p>
              )}
            </div>

            {/* Voice-only Action Prompt if pending confirmation */}
            {pendingAction && (
              <div className="bg-amber-950/80 border border-amber-500/40 rounded-lg p-2 text-[10px] text-amber-200 text-center font-medium">
                Say &ldquo;Confirm&rdquo; to execute action, or &ldquo;Cancel&rdquo; to discard.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VOICE-ONLY MINIMAL FLOATING ICON BUTTON                       */}
      {/* Activated ONLY by pressing this icon; no text input or buttons */}
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
          title={
            voiceActive
              ? "Clinova Voice Active (Tap to stop voice)"
              : "Clinova Voice Assistant (Tap to start speaking, drag to dismiss)"
          }
          className={`relative group flex items-center justify-center w-15 h-15 rounded-full shadow-2xl transition-all ${
            voiceActive
              ? voiceState === "speaking"
                ? "bg-gradient-to-tr from-teal-500 to-cyan-500 text-white ring-4 ring-teal-300 shadow-teal-500/50 scale-110"
                : "bg-gradient-to-tr from-rose-600 to-pink-600 text-white ring-4 ring-rose-300 shadow-rose-600/50 scale-110"
              : "bg-gradient-to-tr from-teal-600 to-emerald-600 text-white hover:shadow-teal-600/50 hover:scale-105 active:scale-95"
          }`}
        >
          {/* Subtle pulsating ripple rings when voice conversation is active */}
          {voiceActive && (
            <>
              <span className="absolute -inset-2 rounded-full border-2 border-teal-400 animate-ping opacity-60 pointer-events-none" />
              <span className="absolute -inset-1 rounded-full border border-teal-300 animate-pulse opacity-80 pointer-events-none" />
            </>
          )}

          {voiceActive ? (
            voiceState === "speaking" ? (
              <Volume2 className="w-7 h-7 animate-bounce" />
            ) : (
              <Mic className="w-7 h-7 animate-pulse" />
            )
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </button>
      </div>
    </>
  );
};
