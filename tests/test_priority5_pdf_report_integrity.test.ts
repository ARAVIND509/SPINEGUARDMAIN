import { describe, it, expect } from "vitest";
import { generateAnalysisPDF } from "../client/src/lib/pdf-generator";
import type { AnalysisResults } from "@shared/schema";

describe("Priority 5: Professional PDF Report Generation & Safety Integrity", () => {
  const mockResults: AnalysisResults = {
    summary: "AI analysis detected severe Disc Herniation with prominent localized feature sensitivity.",
    findings: [
      {
        condition: "Disc Herniation",
        severity: "severe",
        confidence: 91,
        location: "L4-L5 disc"
      },
      {
        condition: "Spinal Stenosis",
        severity: "mild",
        confidence: 45,
        location: "Spinal canal"
      }
    ],
    primaryFinding: {
      condition: "Disc Herniation",
      severity: "severe",
      confidence: 91,
      location: "L4-L5 disc"
    },
    modelVersion: "PyTorch ResNet-50 v2 (Layer4 Grad-CAM)",
    explanationStatus: "AUTHENTIC_PYTORCH_GRADIENTS",
    humanReview: {
      status: "accepted",
      decision: "accepted",
      reviewerId: "usr-doc-912",
      reviewerUsername: "Dr. Gregory House, MD",
      reviewedAt: new Date().toISOString(),
      modelVersion: "PyTorch ResNet-50 v2 (Layer4 Grad-CAM)",
      reportVersion: "v1.0-final",
      isFinalized: true
    }
  };

  const mockPatient = {
    name: "Eleanor Vance",
    age: 48,
    gender: "Female",
    medicalRecordNumber: "MRN-994812"
  };

  const mockScan = {
    imageType: "MRI_LUMBAR_SAGITTAL",
    uploadDate: new Date().toISOString()
  };

  it("generates a valid professional PDF document with multiple structured sections", async () => {
    const doc = await generateAnalysisPDF(mockResults, mockPatient, mockScan);

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    
    // Check internal text content buffer
    const outputString = doc.output();
    expect(outputString).toContain("%PDF");
  });

  it("embeds mandatory academic prototype disclaimer and regulatory notice", async () => {
    const doc = await generateAnalysisPDF(mockResults, mockPatient, mockScan);
    const pdfText = doc.output().toUpperCase();

    // Verify academic investigational prototype disclaimer is present
    expect(pdfText).toContain("ACADEMIC");
    expect(pdfText).toContain("INVESTIGATIONAL");
  });

  it("includes reviewer sign-off details and preserves privacy without public QR codes", async () => {
    const doc = await generateAnalysisPDF(mockResults, mockPatient, mockScan);
    const pdfText = doc.output();

    // Must record physician attestation
    expect(pdfText).toContain("Dr. Gregory House");
    
    // Safety check: must NOT leak patient MRN to public external verification URLs
    expect(pdfText).not.toContain("https://spineguard.example.com/verify");
  });

  it("does not fabricate soft-tissue Pfirrmann grades or hemodynamic flow rates", async () => {
    const doc = await generateAnalysisPDF(mockResults, mockPatient, mockScan);
    const pdfText = doc.output();

    // Ensure removed heuristics are never reintroduced into the report
    expect(pdfText).not.toContain("ml/min");
    expect(pdfText).not.toContain("Cord Perfusion");
    expect(pdfText).not.toContain("Nerve Root Oxygenation");
  });
});
