import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "../server/storage";
import type { HumanReview, InsertPatient, InsertScan, InsertAnalysis } from "@shared/schema";

describe("Priority 4: Human-in-the-Loop Review Workflow & RBAC", () => {
  let patientId: string;
  let scanId: string;
  let analysisId: string;

  beforeEach(async () => {
    // Set up test patient, scan, and analysis
    const patient = await storage.createPatient({
      patientId: `PAT-REV-${Date.now()}`,
      name: "Review Test Patient",
      age: 45,
      gender: "Male"
    });
    patientId = patient.id;

    const scan = await storage.createScan({
      patientCaseId: patientId,
      imageUrl: "/api/scans/file/test-scan.png",
      imageType: "MRI_LUMBAR",
      metadata: { isDicom: false, format: "PNG" }
    });
    scanId = scan.id;

    const initialAiFindings = [
      {
        condition: "Disc Herniation",
        severity: "severe",
        confidence: 88,
        location: "L4-L5 intervertebral disc"
      },
      {
        condition: "Spinal Stenosis",
        severity: "mild",
        confidence: 52,
        location: "Spinal canal"
      }
    ];

    const analysis = await storage.createAnalysis({
      scanId,
      results: {
        findings: initialAiFindings,
        primaryFinding: initialAiFindings[0],
        confidence: 88,
        summary: "AI detected severe Disc Herniation at L4-L5.",
        modelVersion: "PyTorch ResNet-50 v2 (Layer4 Grad-CAM)"
      }
    });
    analysisId = analysis.id;
  });

  it("preserves original AI prediction when human reviewer submits a modification", async () => {
    const modificationReview: HumanReview = {
      status: "modified",
      decision: "modified",
      modifiedFindings: [
        {
          condition: "Disc Herniation",
          severity: "moderate", // Reviewer downgraded from severe to moderate
          confidence: 88,
          location: "L4-L5 intervertebral disc"
        }
      ],
      reasonForModification: "Clinical discordance: canal diameter remains adequate without neurological impingement.",
      reviewerId: "usr-doc-402",
      reviewerUsername: "Dr. Gregory House, MD",
      reviewedAt: new Date().toISOString(),
      modelVersion: "PyTorch ResNet-50 v2 (Layer4 Grad-CAM)",
      reportVersion: "v1.1-reviewed",
      isFinalized: false
    };

    const updatedAnalysis = await storage.updateAnalysisReview(analysisId, modificationReview);
    const results = updatedAnalysis.results as any;

    expect(results.humanReview).toBeDefined();
    expect(results.humanReview.decision).toBe("modified");
    expect(results.humanReview.reasonForModification).toContain("canal diameter remains adequate");

    // CRITICAL REQUIREMENT: Original AI output MUST be preserved intact
    expect(results.humanReview.originalAiPrediction).toBeDefined();
    expect(results.humanReview.originalAiPrediction.findings[0].severity).toBe("severe");
    expect(results.humanReview.originalAiPrediction.findings[0].condition).toBe("Disc Herniation");
  });

  it("correctly finalizes and locks the clinical diagnostic report", async () => {
    const finalizeReview: HumanReview = {
      status: "finalized",
      decision: "accepted",
      reviewerId: "usr-doc-402",
      reviewerUsername: "Dr. Lisa Cuddy, MD",
      reviewedAt: new Date().toISOString(),
      modelVersion: "PyTorch ResNet-50 v2",
      reportVersion: "v1.0-final",
      isFinalized: true
    };

    const updatedAnalysis = await storage.updateAnalysisReview(analysisId, finalizeReview);
    const results = updatedAnalysis.results as any;

    expect(results.humanReview.isFinalized).toBe(true);
    expect(results.humanReview.status).toBe("finalized");
    expect(results.humanReview.reportVersion).toBe("v1.0-final");
  });

  it("records structured audit logs for reviewer governance", async () => {
    await storage.createAuditLog({
      userId: "usr-doc-402",
      action: "ANALYSIS_REVIEW_SUBMITTED",
      resource: `analysis:${analysisId}`,
      details: { decision: "accepted", reviewer: "Dr. Cuddy" },
      ipAddress: "127.0.0.1"
    });

    const logs = await storage.getAuditLogs(10);
    expect(logs.length).toBeGreaterThan(0);
    const matchingLog = logs.find(l => l.resource === `analysis:${analysisId}`);
    expect(matchingLog).toBeDefined();
    expect(matchingLog.action).toBe("ANALYSIS_REVIEW_SUBMITTED");
  });
});
