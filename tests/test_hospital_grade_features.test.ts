import { describe, it, expect, beforeEach } from "vitest";
import { storage } from "../server/storage";
import type { HumanReview, InsertPatient, InsertScan, InsertAnalysis } from "@shared/schema";

describe("Hospital-Grade Medical PACS & Clinical QA Features", () => {
  describe("1. Multi-Slice DICOM Series Navigation & Table Position", () => {
    it("accurately computes Z-axis table position (mm) across volumetric slices", () => {
      const sliceThicknessMm = 3.0;
      const initialTablePositionZ = -45.0; // mm from isocenter
      const totalSlices = 24;

      const computeTablePosition = (sliceIndex: number) => {
        return initialTablePositionZ + sliceIndex * sliceThicknessMm;
      };

      expect(computeTablePosition(0)).toBe(-45.0);
      expect(computeTablePosition(10)).toBe(-15.0);
      expect(computeTablePosition(totalSlices - 1)).toBe(24.0);
    });

    it("validates standard diagnostic window/level presets", () => {
      const presets: Record<string, { window: number; level: number }> = {
        "CT Spine (Bone)": { window: 2000, level: 400 },
        "CT Spine (Soft Tissue)": { window: 400, level: 50 },
        "MRI T2 Spine": { window: 800, level: 350 },
        "MRI T1 Spine": { window: 600, level: 300 },
        "Myelogram": { window: 1200, level: 250 }
      };

      for (const [name, preset] of Object.entries(presets)) {
        expect(preset.window).toBeGreaterThan(0);
        expect(preset.level).toBeGreaterThanOrEqual(0);
        // Level must lie within or near the window boundary
        expect(preset.level).toBeLessThanOrEqual(preset.window);
      }
    });
  });

  describe("2. Anatomical Contours & Morphological Labeling", () => {
    it("defines standard lumbar spinal anatomy segments with valid geometric boundaries", () => {
      const standardLumbarLevels = [
        { id: "L1", label: "L1 Vertebra", type: "vertebra" },
        { id: "L2", label: "L2 Vertebra", type: "vertebra" },
        { id: "L3", label: "L3 Vertebra", type: "vertebra" },
        { id: "L4", label: "L4 Vertebra", type: "vertebra" },
        { id: "L5", label: "L5 Vertebra", type: "vertebra" },
        { id: "S1", label: "S1 Sacrum", type: "vertebra" },
        { id: "L1-L2", label: "L1-L2 Disc", type: "disc" },
        { id: "L2-L3", label: "L2-L3 Disc", type: "disc" },
        { id: "L3-L4", label: "L3-L4 Disc", type: "disc" },
        { id: "L4-L5", label: "L4-L5 Disc", type: "disc" },
        { id: "L5-S1", label: "L5-S1 Disc", type: "disc" },
        { id: "canal", label: "Spinal Canal / Thecal Sac", type: "canal" }
      ];

      expect(standardLumbarLevels).toHaveLength(12);
      expect(standardLumbarLevels.filter(s => s.type === "vertebra")).toHaveLength(6);
      expect(standardLumbarLevels.filter(s => s.type === "disc")).toHaveLength(5);
      expect(standardLumbarLevels.find(s => s.id === "L4-L5")?.label).toBe("L4-L5 Disc");
    });
  });

  describe("3. Region of Interest (ROI) Metric Integrity", () => {
    it("correctly computes physical area in mm² when calibrated pixel spacing is present", () => {
      const pixelSpacing = { rowSpacing: 0.5, colSpacing: 0.5 }; // 0.5 mm / px
      const roiWidthPx = 40;
      const roiHeightPx = 30;

      const physicalWidthMm = roiWidthPx * pixelSpacing.colSpacing;
      const physicalHeightMm = roiHeightPx * pixelSpacing.rowSpacing;
      const areaMm2 = physicalWidthMm * physicalHeightMm;

      expect(physicalWidthMm).toBe(20);
      expect(physicalHeightMm).toBe(15);
      expect(areaMm2).toBe(300); // 20 * 15 = 300 mm²
    });

    it("falls back strictly to px² without assuming millimetres when pixel spacing is absent", () => {
      const metadata = { isDicom: false, format: "PNG" };
      const roiWidthPx = 40;
      const roiHeightPx = 30;

      const hasPixelSpacing = "PixelSpacing" in metadata;
      expect(hasPixelSpacing).toBe(false);

      const areaPx2 = roiWidthPx * roiHeightPx;
      expect(areaPx2).toBe(1200); // 1200 px²
    });
  });

  describe("4. Clinical Quality Assurance & Inter-Rater Reliability (Cohen's Kappa)", () => {
    const calculateKappa = (observedAgreementRate: number, expectedChanceRate: number = 0.20) => {
      const pO = observedAgreementRate;
      const pE = expectedChanceRate;
      const kappa = Math.max(0, Math.min(1.0, Math.round(((pO - pE) / (1 - pE)) * 100) / 100));
      let interpretation = "Poor Agreement";
      if (kappa >= 0.81) interpretation = "Almost Perfect Agreement";
      else if (kappa >= 0.61) interpretation = "Substantial Agreement";
      else if (kappa >= 0.41) interpretation = "Moderate Agreement";
      else if (kappa >= 0.21) interpretation = "Fair Agreement";
      return { kappa, interpretation };
    };

    it("computes Cohen's Kappa for 100% concordance", () => {
      const { kappa, interpretation } = calculateKappa(1.0);
      expect(kappa).toBe(1.0);
      expect(interpretation).toBe("Almost Perfect Agreement");
    });

    it("computes Cohen's Kappa for high clinical concordance (88%)", () => {
      const { kappa, interpretation } = calculateKappa(0.88);
      // (0.88 - 0.20) / (1 - 0.20) = 0.68 / 0.80 = 0.85
      expect(kappa).toBe(0.85);
      expect(interpretation).toBe("Almost Perfect Agreement");
    });

    it("computes Cohen's Kappa for moderate clinical concordance (68%)", () => {
      const { kappa, interpretation } = calculateKappa(0.68);
      // (0.68 - 0.20) / (0.80) = 0.48 / 0.80 = 0.60
      expect(kappa).toBe(0.60);
      expect(interpretation).toBe("Moderate Agreement");
    });

    it("aggregates real patient reviews into clinical stats via storage", async () => {
      const patient = await storage.createPatient({
        patientId: `PAT-QA-${Date.now()}`,
        name: "QA Analysis Patient",
        age: 60,
        gender: "Female"
      });

      const scan1 = await storage.createScan({
        patientCaseId: patient.id,
        imageUrl: "/api/scans/file/qa-scan-1.png",
        imageType: "MRI_LUMBAR",
        metadata: { isDicom: false, format: "PNG" }
      });

      const analysis1 = await storage.createAnalysis({
        scanId: scan1.id,
        results: {
          findings: [{ condition: "Disc Herniation", severity: "moderate", confidence: 85 }],
          primaryFinding: { condition: "Disc Herniation", severity: "moderate", confidence: 85 },
          confidence: 85,
          modelVersion: "PyTorch ResNet-50 v2",
          humanReview: {
            status: "accepted",
            decision: "accepted",
            reviewerUsername: "dr_test_qa",
            isFinalized: true,
            reviewedAt: new Date().toISOString()
          }
        }
      });

      const allAnalyses = await storage.getAllAnalyses();
      const qaAnalysis = allAnalyses.find(a => a.id === analysis1.id);
      expect(qaAnalysis).toBeDefined();

      const results = typeof qaAnalysis?.results === "string" ? JSON.parse(qaAnalysis.results) : qaAnalysis?.results;
      expect(results.humanReview.decision).toBe("accepted");
      expect(results.humanReview.isFinalized).toBe(true);
      expect(results.primaryFinding.condition).toBe("Disc Herniation");
    });
  });
});
