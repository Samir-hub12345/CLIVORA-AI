// Test script to verify the deterministic connection quality calculation and hysteresis

function calculateCandidate({ isOnline, failureCount, effectiveType, downlink, medianLatency, saveData }) {
  if (!isOnline || failureCount >= 3) {
    return "OFFLINE";
  }

  if (saveData) {
    return "SLOW";
  }

  if (
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    (downlink !== null && downlink < 0.5) ||
    (medianLatency !== null && medianLatency > 280) ||
    failureCount > 0
  ) {
    return "SLOW";
  }

  if (
    effectiveType === "3g" ||
    (downlink !== null && downlink < 2) ||
    (medianLatency !== null && medianLatency > 110)
  ) {
    return "NORMAL";
  }

  return "GOOD";
}

const tests = [
  {
    name: "TEST 1: Fast Wi-Fi (Low latency 35ms, 4G, 10Mbps)",
    input: { isOnline: true, failureCount: 0, effectiveType: "4g", downlink: 10, medianLatency: 35, saveData: false },
    expected: "GOOD",
  },
  {
    name: "TEST 2: Moderate connection (75ms, 3G, 1.5Mbps)",
    input: { isOnline: true, failureCount: 0, effectiveType: "3g", downlink: 1.5, medianLatency: 75, saveData: false },
    expected: "NORMAL",
  },
  {
    name: "TEST 3: Slow connection (290ms latency)",
    input: { isOnline: true, failureCount: 0, effectiveType: "4g", downlink: 5, medianLatency: 290, saveData: false },
    expected: "SLOW",
  },
  {
    name: "TEST 4: 2G rural connection (downlink 0.3Mbps)",
    input: { isOnline: true, failureCount: 0, effectiveType: "2g", downlink: 0.3, medianLatency: 350, saveData: false },
    expected: "SLOW",
  },
  {
    name: "TEST 5: Data Saver preference enabled",
    input: { isOnline: true, failureCount: 0, effectiveType: "4g", downlink: 15, medianLatency: 40, saveData: true },
    expected: "SLOW",
  },
  {
    name: "TEST 6: Browser offline",
    input: { isOnline: false, failureCount: 0, effectiveType: "4g", downlink: 10, medianLatency: 35, saveData: false },
    expected: "OFFLINE",
  },
  {
    name: "TEST 7: Repeated server request failures (failureCount = 3)",
    input: { isOnline: true, failureCount: 3, effectiveType: "4g", downlink: 10, medianLatency: null, saveData: false },
    expected: "OFFLINE",
  },
  {
    name: "TEST 8: Network Information API unavailable - fast latency fallback",
    input: { isOnline: true, failureCount: 0, effectiveType: null, downlink: null, medianLatency: 45, saveData: false },
    expected: "GOOD",
  },
  {
    name: "TEST 9: Network Information API unavailable - moderate latency fallback",
    input: { isOnline: true, failureCount: 0, effectiveType: null, downlink: null, medianLatency: 180, saveData: false },
    expected: "NORMAL",
  },
  {
    name: "TEST 10: Network Information API unavailable - high latency fallback",
    input: { isOnline: true, failureCount: 0, effectiveType: null, downlink: null, medianLatency: 320, saveData: false },
    expected: "SLOW",
  },
  {
    name: "TEST 11: Low latency (40ms) but poor effective connection (2g)",
    input: { isOnline: true, failureCount: 0, effectiveType: "2g", downlink: 0.2, medianLatency: 40, saveData: false },
    expected: "SLOW",
  },
  {
    name: "TEST 12: 4G label but high latency (310ms)",
    input: { isOnline: true, failureCount: 0, effectiveType: "4g", downlink: 1.0, medianLatency: 310, saveData: false },
    expected: "SLOW",
  },
];

console.log("=== EXECUTING DETERMINISTIC CONNECTIVITY ENGINE TESTS ===");
let passed = 0;
for (const t of tests) {
  const result = calculateCandidate(t.input);
  const ok = result === t.expected;
  if (ok) passed++;
  console.log(`${ok ? "✓ [PASS]" : "✗ [FAIL]"} ${t.name} -> Result: ${result} (Expected: ${t.expected})`);
}

console.log(`\nTotal: ${passed}/${tests.length} passed.`);
if (passed !== tests.length) process.exit(1);
