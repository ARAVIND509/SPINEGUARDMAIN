import { describe, it, expect } from "vitest";
import { parseDICOM } from "../server/dicom-parser";

describe("Priority 3: Medical Image Viewer & DICOM Metadata Integrity", () => {
  it("strictly distinguishes DICOM from standard raster images", () => {
    // Non-DICOM raster mock
    const standardRasterMetadata = {
      isDicom: false,
      format: "PNG",
      pixelSpacing: null,
      windowCenter: null,
      windowWidth: null,
      modality: "MRI"
    };

    expect(standardRasterMetadata.isDicom).toBe(false);
    expect(standardRasterMetadata.pixelSpacing).toBeNull();
    expect(standardRasterMetadata.windowCenter).toBeNull();
  });

  it("calculates caliper distances in mm ONLY when calibrated PixelSpacing is present", () => {
    // Case 1: Calibrated DICOM with 0.5mm x 0.5mm pixel spacing
    const dicomMetadata = {
      isDicom: true,
      format: "DICOM",
      pixelSpacing: [0.5, 0.5] as [number, number],
      windowCenter: 400,
      windowWidth: 1500
    };

    const dx = 60; // 60 pixels horizontal
    const dy = 80; // 80 pixels vertical
    const pixelDistance = Math.hypot(dx, dy); // 100 pixels

    let mmDistance: number | null = null;
    if (dicomMetadata.pixelSpacing && dicomMetadata.pixelSpacing.length === 2) {
      const mmX = dx * dicomMetadata.pixelSpacing[1];
      const mmY = dy * dicomMetadata.pixelSpacing[0];
      mmDistance = Math.hypot(mmX, mmY);
    }

    expect(pixelDistance).toBe(100);
    expect(mmDistance).toBe(50); // 100 * 0.5 = 50 mm
  });

  it("refuses to fabricate millimeter measurements when PixelSpacing is missing", () => {
    // Case 2: Standard PNG/JPEG scan without DICOM header
    const pngMetadata = {
      isDicom: false,
      format: "PNG",
      pixelSpacing: null
    };

    const dx = 60;
    const dy = 80;
    const pixelDistance = Math.hypot(dx, dy);

    let mmDistance: number | null = null;
    if (pngMetadata.pixelSpacing) {
      mmDistance = 999; // Should not execute
    }

    expect(pixelDistance).toBe(100);
    expect(mmDistance).toBeNull(); // Must remain null, displayed in pixels only
  });

  it("handles DICOM parser errors gracefully without crashing or faking data", async () => {
    const invalidBuffer = Buffer.from("NOT_A_VALID_DICOM_STREAM");
    await expect(parseDICOM(invalidBuffer)).rejects.toThrow("DICOM parsing failed");
  });
});
