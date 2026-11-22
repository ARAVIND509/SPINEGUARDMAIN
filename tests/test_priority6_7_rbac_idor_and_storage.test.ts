import { describe, it, expect, beforeAll } from "vitest";
import { storage } from "../server/storage";
import { saveScanFile, resolveScanFilePath, sanitizeFileName } from "../server/scan-storage";

describe("Priorities 6 & 7: RBAC, IDOR Protection, and Storage Reliability", () => {
  let adminUserId: string;
  let doctorAId: string;
  let doctorBId: string;
  let patientAId: string;
  let scanAId: string;
  let analysisAId: string;

  beforeAll(async () => {
    // 1. Create Admin User
    const adminUser = await storage.createUser({
      username: `admin_sec_${Date.now()}`,
      password: "password123",
      role: "admin"
    });
    adminUserId = adminUser.id;

    // 2. Create Doctor A (Reviewer)
    const doctorA = await storage.createUser({
      username: `doctor_a_${Date.now()}`,
      password: "password123",
      role: "reviewer"
    });
    doctorAId = doctorA.id;

    // 3. Create Doctor B (Reviewer)
    const doctorB = await storage.createUser({
      username: `doctor_b_${Date.now()}`,
      password: "password123",
      role: "reviewer"
    });
    doctorBId = doctorB.id;

    // 4. Doctor A registers Patient A
    const patientA = await storage.createPatient({
      userId: doctorAId,
      patientId: `PAT-SEC-${Date.now()}`,
      name: "Private Patient Of Doctor A",
      age: 50,
      gender: "Female"
    });
    patientAId = patientA.id;

    // 5. Save scan image using secure storage
    const saved = await saveScanFile(Buffer.from("SECURE_IMAGE_BINARY"), "mri_scan.png", "image/png");
    const scanA = await storage.createScan({
      patientCaseId: patientAId,
      imageUrl: saved.fileUrl,
      imageType: "MRI"
    });
    scanAId = scanA.id;

    const analysisA = await storage.createAnalysis({
      scanId: scanAId,
      results: {
        findings: [{ condition: "Disc Herniation", severity: "severe", confidence: 85 }],
        summary: "Severe herniation detected."
      }
    });
    analysisAId = analysisA.id;
  });

  it("permits Doctor A to view their patient scans", async () => {
    const scans = await storage.getScansByPatient(patientAId, doctorAId);
    expect(scans.length).toBeGreaterThan(0);
    expect(scans[0].id).toBe(scanAId);

    const single = await storage.getScan(scanAId, doctorAId);
    expect(single).toBeDefined();
    expect(single?.id).toBe(scanAId);
  });

  it("STRICTLY BLOCKS Doctor B from viewing Doctor A patient scans (IDOR Defense)", async () => {
    // Cross-user query must return empty / undefined
    const scans = await storage.getScansByPatient(patientAId, doctorBId);
    expect(scans.length).toBe(0);

    const single = await storage.getScan(scanAId, doctorBId);
    expect(single).toBeUndefined();
  });

  it("allows Administrator to access patient scans across tenants for governance", async () => {
    // Admin access does not restrict by single userId
    const scans = await storage.getScansByPatient(patientAId, undefined);
    expect(scans.length).toBeGreaterThan(0);
    expect(scans[0].id).toBe(scanAId);
  });

  it("prevents SQL bloat by writing scans as persistent file URLs rather than base64 text", async () => {
    const scan = await storage.getScan(scanAId, doctorAId);
    expect(scan).toBeDefined();
    expect(scan!.imageUrl).toMatch(/^\/api\/scans\/file\//);
    expect(scan!.imageUrl).not.toContain("data:image/");
  });

  it("sanitizes filenames and blocks directory traversal attempts", () => {
    expect(sanitizeFileName("../../../secret.key")).not.toContain("..");
    expect(sanitizeFileName("..\\..\\windows\\system32")).not.toContain("..");
    expect(resolveScanFilePath("../../etc/shadow")).toBeNull();
  });
});
