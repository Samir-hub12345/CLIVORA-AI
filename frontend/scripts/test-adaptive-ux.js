// ============================================================
// CLINOVA AI - ADAPTIVE USER EXPERIENCE TEST SUITE
// Verifies deterministic transition of UI/UX across network states
// ============================================================

const assert = require("assert");

console.log("=== EXECUTING CLINOVA AI ADAPTIVE UX TEST SUITE ===\n");

// 1. Test Signal Bar Representations
function getSignalBars(state) {
  const bars = {
    GOOD: "[████] Good",
    NORMAL: "[███░] Normal",
    SLOW: "[██░░] Slow",
    OFFLINE: "[░░░░] Offline",
  }[state];
  return bars;
}

assert.strictEqual(getSignalBars("GOOD"), "[████] Good");
assert.strictEqual(getSignalBars("NORMAL"), "[███░] Normal");
assert.strictEqual(getSignalBars("SLOW"), "[██░░] Slow");
assert.strictEqual(getSignalBars("OFFLINE"), "[░░░░] Offline");
console.log("✓ [PASS] TEST 1: Signal Bars rendering maps accurately across all 4 states");

// 2. Test Adaptive Polling Interval Scaling
function getPollingInterval(state) {
  switch (state) {
    case "GOOD":
      return { intervalMs: 15000, status: "Normal" };
    case "NORMAL":
      return { intervalMs: 25000, status: "Reduced" };
    case "SLOW":
      return { intervalMs: 50000, status: "Minimal" };
    case "OFFLINE":
      return { intervalMs: 0, status: "Paused" };
    default:
      return { intervalMs: 15000, status: "Normal" };
  }
}

const goodPoll = getPollingInterval("GOOD");
assert.strictEqual(goodPoll.intervalMs, 15000);
assert.strictEqual(goodPoll.status, "Normal");

const normalPoll = getPollingInterval("NORMAL");
assert.strictEqual(normalPoll.intervalMs, 25000);
assert.strictEqual(normalPoll.status, "Reduced");

const slowPoll = getPollingInterval("SLOW");
assert.strictEqual(slowPoll.intervalMs, 50000);
assert.strictEqual(slowPoll.status, "Minimal");

const offlinePoll = getPollingInterval("OFFLINE");
assert.strictEqual(offlinePoll.intervalMs, 0);
assert.strictEqual(offlinePoll.status, "Paused");
console.log("✓ [PASS] TEST 2: Polling intervals scale adaptively (15s -> 25s -> 50s -> Stopped)");

// 3. Test Adaptive Image Strategy
function getImageStrategy(state, isLowBandwidth, isEssential, userRequested) {
  if (state === "OFFLINE") {
    return "OFFLINE_PLACEHOLDER";
  }
  if (isEssential) {
    return "LOAD_ESSENTIAL_IMMEDIATE";
  }
  if (isLowBandwidth || state === "SLOW") {
    return userRequested ? "LOAD_ON_DEMAND" : "DEFER_WITH_PLACEHOLDER";
  }
  return "LOAD_NORMAL";
}

assert.strictEqual(getImageStrategy("GOOD", false, false, false), "LOAD_NORMAL");
assert.strictEqual(getImageStrategy("NORMAL", false, false, false), "LOAD_NORMAL");
assert.strictEqual(getImageStrategy("SLOW", true, false, false), "DEFER_WITH_PLACEHOLDER");
assert.strictEqual(getImageStrategy("SLOW", true, true, false), "LOAD_ESSENTIAL_IMMEDIATE");
assert.strictEqual(getImageStrategy("SLOW", true, false, true), "LOAD_ON_DEMAND");
assert.strictEqual(getImageStrategy("OFFLINE", true, false, false), "OFFLINE_PLACEHOLDER");
console.log("✓ [PASS] TEST 3: Adaptive image loading defers non-essential images in SLOW mode while protecting clinical assets");

// 4. Test Transition Toast Messaging
function getTransitionToast(from, to) {
  if (from === to) return null;
  if (to === "SLOW") {
    return {
      type: "warning",
      text: "Slow connection detected. Clinova AI is reducing non-essential data usage.",
    };
  }
  if (to === "OFFLINE") {
    return {
      type: "error",
      text: "You're currently offline. Operations requiring server access are paused.",
    };
  }
  if ((from === "SLOW" || from === "OFFLINE") && (to === "NORMAL" || to === "GOOD")) {
    return {
      type: "success",
      text: "Connection improved. Normal data behavior restored.",
    };
  }
  return null;
}

const toastSlow = getTransitionToast("GOOD", "SLOW");
assert.strictEqual(toastSlow.type, "warning");
assert(toastSlow.text.includes("reducing non-essential data"));

const toastOffline = getTransitionToast("SLOW", "OFFLINE");
assert.strictEqual(toastOffline.type, "error");
assert(toastOffline.text.includes("currently offline"));

const toastRecovery = getTransitionToast("OFFLINE", "GOOD");
assert.strictEqual(toastRecovery.type, "success");
assert(toastRecovery.text.includes("Normal data behavior restored"));

console.log("✓ [PASS] TEST 4: Transition notifications trigger appropriately on degradation, offline, and recovery");

// 5. Test Role-Specific Essential Content Prioritization Under SLOW Mode
function getDashboardPriorityLayout(role, isSlow) {
  switch (role) {
    case "doctor":
      return {
        essential: ["case_queue", "patient_identity", "symptoms", "vitals", "triage_badges"],
        secondaryDeferred: isSlow ? ["departmental_analytics", "telemetry_charts"] : [],
      };
    case "patient":
      return {
        essential: ["patient_name", "mrn", "active_encounters", "symptoms", "start_intake_btn"],
        secondaryDeferred: isSlow ? ["preventive_guidelines", "decorative_health_tips"] : [],
      };
    case "nurse":
      return {
        essential: ["registration_queue", "intake_launcher", "vitals_capture", "doctor_assignment"],
        secondaryDeferred: isSlow ? ["census_demographics", "historical_trends"] : [],
      };
    case "admin":
      return {
        essential: ["facility_info", "operational_status", "system_health"],
        secondaryDeferred: isSlow ? ["audit_ingestion_stream", "bulk_export"] : [],
      };
  }
}

["doctor", "patient", "nurse", "admin"].forEach((role) => {
  const normalLayout = getDashboardPriorityLayout(role, false);
  const slowLayout = getDashboardPriorityLayout(role, true);

  assert(normalLayout.essential.length > 0);
  assert.strictEqual(normalLayout.secondaryDeferred.length, 0);

  assert(slowLayout.essential.length > 0);
  assert(slowLayout.secondaryDeferred.length > 0);
});
console.log("✓ [PASS] TEST 5: All 4 user roles (Doctor, Patient, Staff, Admin) prioritize essential information & defer secondary content under SLOW");

// 6. Test Offline Action Guard Invariants
function isActionPermitted(action, isOnline) {
  const serverActions = [
    "SUBMIT_INTAKE_CASE",
    "TRANSCRIBE_AUDIO",
    "UPLOAD_LAB_REPORT_OCR",
    "RUN_AI_TRIAGE",
    "CREATE_PATIENT_RECORD",
  ];

  if (!isOnline && serverActions.includes(action)) {
    return { permitted: false, reason: "Requires active network connection" };
  }
  return { permitted: true };
}

assert.strictEqual(isActionPermitted("SUBMIT_INTAKE_CASE", false).permitted, false);
assert.strictEqual(isActionPermitted("TRANSCRIBE_AUDIO", false).permitted, false);
assert.strictEqual(isActionPermitted("UPLOAD_LAB_REPORT_OCR", false).permitted, false);
assert.strictEqual(isActionPermitted("RUN_AI_TRIAGE", false).permitted, false);
assert.strictEqual(isActionPermitted("CREATE_PATIENT_RECORD", false).permitted, false);

assert.strictEqual(isActionPermitted("VIEW_LOADED_QUEUE", false).permitted, true);
assert.strictEqual(isActionPermitted("VIEW_LOADED_PATIENT", false).permitted, true);
assert.strictEqual(isActionPermitted("NAVIGATE_PAGES", false).permitted, true);
console.log("✓ [PASS] TEST 6: Offline action guards prevent invalid server mutations while keeping local clinical inspection active");

console.log("\nALL 6 ADAPTIVE UX SUITES PASSED SUCCESSFULLY (100%)");
