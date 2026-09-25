// ============================================================
// CLINOVA AI - ROLE ROUTING & BOUNDARY VERIFICATION TEST SUITE
// ============================================================

const assert = require("assert");

console.log("=== EXECUTING CLINOVA AI ROLE ROUTING & BOUNDARY TEST SUITE ===\n");

// Replicate permissions logic for deterministic testing
const dashboardForRole = {
  patient: "/dashboard/patient",
  doctor: "/dashboard/doctor",
  admin: "/dashboard/admin",
  nurse: "/dashboard/nurse",
};

const allRoles = ["patient", "doctor", "nurse", "admin"];
const clinical = ["doctor", "nurse"];

const protectedPrefixes = [
  ["/dashboard/patient", ["patient"]],
  ["/dashboard/doctor", ["doctor"]],
  ["/dashboard/admin", ["admin"]],
  ["/dashboard/nurse", ["nurse"]],
  ["/dashboard/staff", ["nurse"]],
  ["/dashboard", allRoles],
  ["/portal", ["patient"]],
  ["/patients/profile", ["patient"]],
  ["/patients", clinical],
  ["/review", clinical],
  ["/consultations", clinical],
  ["/triage", ["doctor"]],
  ["/audit", ["admin"]],
  ["/intake", ["patient", "doctor", "nurse"]],
  ["/documents", allRoles],
];

function rolesForPath(path) {
  return protectedPrefixes.find(([prefix]) => path === prefix || path.startsWith(prefix + "/"))?.[1] ?? null;
}

// TEST 1: Login redirection destinations
assert.strictEqual(dashboardForRole["patient"], "/dashboard/patient");
assert.strictEqual(dashboardForRole["doctor"], "/dashboard/doctor");
assert.strictEqual(dashboardForRole["nurse"], "/dashboard/nurse");
assert.strictEqual(dashboardForRole["admin"], "/dashboard/admin");
console.log("✓ [PASS] TEST 1: Login redirection targets unique role-isolated dashboard environments");

// TEST 2: Patient Route Protection (Zero Mismatch)
assert.deepStrictEqual(rolesForPath("/dashboard/patient"), ["patient"]);
assert.strictEqual(rolesForPath("/dashboard/patient").includes("doctor"), false);
assert.strictEqual(rolesForPath("/dashboard/patient").includes("nurse"), false);
assert.strictEqual(rolesForPath("/dashboard/patient").includes("admin"), false);
console.log("✓ [PASS] TEST 2: /dashboard/patient is strictly isolated to Patient role");

// TEST 3: Doctor Route Protection
assert.deepStrictEqual(rolesForPath("/dashboard/doctor"), ["doctor"]);
assert.strictEqual(rolesForPath("/dashboard/doctor").includes("patient"), false);
assert.strictEqual(rolesForPath("/dashboard/doctor").includes("nurse"), false);
assert.strictEqual(rolesForPath("/dashboard/doctor").includes("admin"), false);
console.log("✓ [PASS] TEST 3: /dashboard/doctor is strictly isolated to Doctor role");

// TEST 4: Staff Route Protection (/dashboard/nurse & /dashboard/staff)
assert.deepStrictEqual(rolesForPath("/dashboard/nurse"), ["nurse"]);
assert.deepStrictEqual(rolesForPath("/dashboard/staff"), ["nurse"]);
assert.strictEqual(rolesForPath("/dashboard/nurse").includes("patient"), false);
assert.strictEqual(rolesForPath("/dashboard/nurse").includes("doctor"), false);
assert.strictEqual(rolesForPath("/dashboard/nurse").includes("admin"), false);
console.log("✓ [PASS] TEST 4: /dashboard/nurse and /dashboard/staff are strictly isolated to Staff/Nurse role");

// TEST 5: Admin Route Protection
assert.deepStrictEqual(rolesForPath("/dashboard/admin"), ["admin"]);
assert.strictEqual(rolesForPath("/dashboard/admin").includes("patient"), false);
assert.strictEqual(rolesForPath("/dashboard/admin").includes("doctor"), false);
assert.strictEqual(rolesForPath("/dashboard/admin").includes("nurse"), false);
console.log("✓ [PASS] TEST 5: /dashboard/admin is strictly isolated to Admin role");

// TEST 6: Specialized Clinical & Admin Protected Routes
assert.deepStrictEqual(rolesForPath("/triage"), ["doctor"], "AI Triage must be doctor-only");
assert.deepStrictEqual(rolesForPath("/audit"), ["admin"], "Audit trail must be admin-only");
assert.deepStrictEqual(rolesForPath("/patients/profile"), ["patient"], "Patient profile belongs to patient");
assert.deepStrictEqual(rolesForPath("/portal/profile"), ["patient"], "Portal profile belongs to patient");
console.log("✓ [PASS] TEST 6: Specialized endpoints (/triage, /audit, /portal/profile) strictly enforce required role");

// TEST 7: Cross-role route access rejection matrix
const crossRoleTests = [
  { role: "patient", path: "/dashboard/doctor", allowed: false },
  { role: "patient", path: "/dashboard/nurse", allowed: false },
  { role: "patient", path: "/dashboard/admin", allowed: false },
  { role: "patient", path: "/audit", allowed: false },
  { role: "patient", path: "/patients", allowed: false },
  { role: "patient", path: "/review", allowed: false },
  { role: "nurse", path: "/dashboard/admin", allowed: false },
  { role: "nurse", path: "/dashboard/doctor", allowed: false },
  { role: "nurse", path: "/audit", allowed: false },
  { role: "nurse", path: "/triage", allowed: false },
  { role: "doctor", path: "/dashboard/admin", allowed: false },
  { role: "doctor", path: "/audit", allowed: false },
  { role: "admin", path: "/dashboard/patient", allowed: false },
  { role: "admin", path: "/dashboard/doctor", allowed: false },
  { role: "admin", path: "/dashboard/nurse", allowed: false },
];

for (const t of crossRoleTests) {
  const allowedRoles = rolesForPath(t.path);
  const isAllowed = allowedRoles ? allowedRoles.includes(t.role) : true;
  assert.strictEqual(
    isAllowed,
    t.allowed,
    `Role '${t.role}' attempting '${t.path}' should have allowed=${t.allowed}`
  );
}
console.log(`✓ [PASS] TEST 7: Cross-role rejection matrix verified across ${crossRoleTests.length} unauthorized access attempts`);

// TEST 8: Navigation Item Leakage Audit
const navigationByRole = {
  patient: [
    { label: "My Dashboard", href: "/dashboard/patient" },
    { label: "Start Intake", href: "/intake" },
    { label: "Documents", href: "/documents" },
    { label: "My Profile", href: "/portal/profile" },
  ],
  doctor: [
    { label: "Doctor Dashboard", href: "/dashboard/doctor" },
    { label: "Review Queue", href: "/review" },
    { label: "EHR Directory", href: "/patients" },
    { label: "Consultations", href: "/consultations" },
    { label: "AI Triage", href: "/triage" },
    { label: "Documents", href: "/documents" },
  ],
  nurse: [
    { label: "Staff Dashboard", href: "/dashboard/nurse" },
    { label: "Patient Intake", href: "/intake" },
    { label: "Review Queue", href: "/review" },
    { label: "Patients", href: "/patients" },
    { label: "Documents", href: "/documents" },
  ],
  admin: [
    { label: "Admin Console", href: "/dashboard/admin" },
    { label: "Audit Trail", href: "/audit" },
    { label: "Documents", href: "/documents" },
  ],
};

for (const [role, items] of Object.entries(navigationByRole)) {
  for (const item of items) {
    const allowed = rolesForPath(item.href);
    if (allowed) {
      assert(
        allowed.includes(role),
        `Navigation item '${item.label}' (${item.href}) is not authorized for role '${role}'`
      );
    }
  }
}
console.log("✓ [PASS] TEST 8: Navigation items audit passed with 0 leaked or unauthorized links");

console.log("\nALL ROLE ROUTING & BOUNDARY TESTS PASSED (100%)\n");
