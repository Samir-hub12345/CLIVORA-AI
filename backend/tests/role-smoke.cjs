const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright"); }
const base = process.env.CLINOVA_TEST_URL || "http://127.0.0.1:3000";
const output = process.env.CLINOVA_SCREENSHOTS || "/tmp/clinova-browser-check";
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await playwright.chromium.launch({ headless: true,
    ...(process.env.CLINOVA_CHROMIUM ? { executablePath: process.env.CLINOVA_CHROMIUM, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] } : {}),
  });
  const errors = [];
  const requests = { patient: [], doctor: [], admin: [] };
  const contexts = {};
  const pages = {};
  try {
    for (const role of ["patient", "doctor", "admin"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      page.on("pageerror", error => errors.push(role + ": " + error.message));
      page.on("request", req => { if (req.url().includes("/api/v1/")) requests[role].push(new URL(req.url()).pathname); });
      console.log("Checking " + role + " login...");
      await page.goto(base + "/login");
      await page.getByRole("button", { name: new RegExp(role, "i") }).click();
      await page.getByRole("button", { name: "Sign In to Clinova AI" }).click();
      await page.waitForURL("**/dashboard/" + role);
      await page.getByRole("heading", { name: role === "patient" ? "My intake submissions" : role === "doctor" ? "Recent encounters" : "Account and role overview", exact: true }).waitFor();
      contexts[role] = context; pages[role] = page;
      await page.screenshot({ path: path.join(output, role + "-dashboard.png"), fullPage: true });
      console.log("PASS " + role + " login and dashboard data");
    }
    const patient = pages.patient;
    for (const href of ["/review", "/patients", "/consultations", "/audit", "/triage"]) {
      assert.equal(await patient.locator('nav a[href="' + href + '"]').count(), 0);
    }
    await patient.evaluate(() => {
      const user = JSON.parse(localStorage.getItem("clinova_user"));
      localStorage.setItem("clinova_user", JSON.stringify({ ...user, role: "admin" }));
    });
    await patient.reload();
    await patient.getByRole("heading", { name: "My intake submissions", exact: true }).waitFor();
    assert.match(await patient.locator("header").innerText(), /patient/i);
    requests.patient = [];
    await patient.goto(base + "/dashboard/admin");
    await patient.waitForURL("**/unauthorized");
    assert(!requests.patient.some(url => url.startsWith("/api/v1/admin")));
    await patient.getByRole("link", { name: "Return to my dashboard" }).click();
    await patient.getByRole("heading", { name: "My intake submissions", exact: true }).waitFor();
    console.log("PASS patient direct URL protection and forged cached role");

    await patient.getByRole("link", { name: /Start a new intake/ }).click();
    await patient.locator('input[type="checkbox"]').check();
    await patient.getByRole("button", { name: "Continue to Patient Context" }).click();
    await patient.getByRole("button", { name: "Proceed to Symptom Intake" }).click();
    await patient.locator("textarea").fill("Mild headache for one day. Synthetic test intake.");
    await patient.getByRole("button", { name: "Review Captured Data" }).click();
    const submitted = patient.waitForResponse(res => res.url().endsWith("/api/v1/cases") && res.request().method() === "POST");
    await patient.getByRole("button", { name: "Submit for Qualified Review" }).click();
    const response = await submitted;
    assert.equal(response.status(), 201);
    const receipt = await response.json();
    assert(!("risk_signals" in receipt));
    await patient.getByRole("link", { name: "View my submissions" }).click();
    await patient.getByText(receipt.synthetic_case_id, { exact: false }).first().waitFor();
    assert.equal(await patient.getByText("Open in Reviewer Workspace", { exact: true }).count(), 0);
    console.log("PASS patient intake submission and patient-only confirmation");

    const doctor = pages.doctor;
    await doctor.goto(base + "/review/case/" + receipt.id);
    await doctor.getByRole("button", { name: "Edit Summary", exact: true }).click();
    await doctor.locator("textarea").fill("Clinician reviewed the synthetic patient submission.");
    await doctor.getByRole("button", { name: "Confirm & Approve Note", exact: true }).click();
    await doctor.getByText("Review action 'APPROVE' completed successfully.", { exact: true }).waitFor();
    await patient.reload();
    const submittedDetails = patient.locator("details").filter({ hasText: receipt.synthetic_case_id });
    await submittedDetails.locator("summary").click();
    await submittedDetails.getByText("Clinician reviewed the synthetic patient submission.", { exact: false }).waitFor();
    console.log("PASS doctor approval appears in the patient's own history");
    await patient.screenshot({ path: path.join(output, "patient-reviewed.png"), fullPage: true });

    await doctor.goto(base + "/audit"); await doctor.waitForURL("**/unauthorized");
    const admin = pages.admin;
    assert(!requests.admin.some(url => /^\/api\/v1\/(patients|cases|consultations)(\/|$)/.test(url)));
    await admin.getByRole("link", { name: /Open audit trail/ }).click();
    await admin.getByRole("heading", { name: "Protected Health Information (PHI) Audit Trail" }).waitFor();
    await admin.locator("tbody tr").first().waitFor();
    await admin.goto(base + "/review"); await admin.waitForURL("**/unauthorized");
    console.log("PASS admin-only audit and admin/doctor separation");

    await patient.goto(base + "/portal/profile");
    await patient.getByLabel("Phone", { exact: true }).fill("0123456789");
    await patient.getByRole("button", { name: "Save profile", exact: true }).click();
    await patient.getByText("Profile saved.", { exact: true }).waitFor();
    await patient.reload();
    await patient.getByLabel("Phone", { exact: true }).waitFor();
    assert.equal(await patient.getByLabel("Phone", { exact: true }).inputValue(), "0123456789");
    console.log("PASS patient profile persists");

    await patient.setViewportSize({ width: 390, height: 844 });
    await patient.goto(base + "/dashboard/patient");
    await patient.getByRole("heading", { name: "My intake submissions", exact: true }).waitFor();
    await patient.getByRole("button", { name: "Open navigation", exact: true }).click();
    await patient.locator("#mobile-navigation").waitFor();
    assert.equal(await patient.locator('#mobile-navigation a[href="/audit"]').count(), 0);
    const overflow = await patient.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, "mobile horizontal overflow");
    await patient.screenshot({ path: path.join(output, "patient-mobile.png"), fullPage: true });
    console.log("PASS mobile menu permissions and layout");

    await patient.evaluate(() => localStorage.setItem("clinova_token", "invalid-expired-token"));
    await patient.reload(); await patient.waitForURL("**/login");
    assert.equal(await patient.evaluate(() => localStorage.getItem("clinova_token")), null);
    await pages.doctor.goto(base + "/dashboard");
    await pages.doctor.waitForURL("**/dashboard/doctor");
    await pages.doctor.getByRole("button", { name: "Sign out", exact: true }).click();
    await pages.doctor.waitForURL("**/login");
    await pages.doctor.goto(base + "/review");
    await pages.doctor.waitForURL("**/login");
    console.log("PASS invalid session, logout and signed-out direct URL");
    assert.deepEqual(errors, []);
    console.log("PASS no browser runtime errors");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });