import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { prisma } from "./db";
import { storage } from "./storage";
import { analyzeWithSCT } from "./sct-bridge";
import { insertPatientSchema, insertScanSchema, insertAnalysisSchema } from "@shared/schema";
import { updateAnalysisProgress } from "./websocket-handler";
import { parseDICOM } from "./dicom-parser";
import { ensureAuthenticated } from "./auth";
import { saveScanFile, getScanBuffer, resolveScanFilePath } from "./scan-storage";
import { 
  insertAppointmentSchema, 
  insertDoctorNoteSchema, 
  insertMedicationSchema 
} from "@shared/schema";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply authentication to all /api routes except register/login/logout
  app.use("/api", (req, res, next) => {
    if (req.path === "/register" || req.path === "/login" || req.path === "/logout" || req.path === "/user") {
      return next();
    }
    ensureAuthenticated(req, res, next);
  });

  // Patient routes
  app.get("/api/patients", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      if (cursor !== undefined || req.query.limit !== undefined) {
        const pageSize = limit && limit > 0 && limit <= 100 ? limit : 20;
        const paginated = await storage.getPatientsPaginated(cursor, pageSize, userId);
        return res.json(paginated);
      }

      const patients = await storage.getAllPatients(userId);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/analysis-archive", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const cursor = req.query.cursor as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const pageSize = limit && limit > 0 && limit <= 100 ? limit : 20;

      // Single-Query Optimized Join: 1 SQL join query instead of 1 + 2N roundtrips
      if (cursor !== undefined || req.query.limit !== undefined) {
        const paginated = await storage.getScansWithDetailsPaginated(cursor, pageSize, userId);
        return res.json(paginated);
      }

      const archive = await storage.getScansWithDetailsPaginated(undefined, 200, userId);
      res.json(archive.items);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Secure access-controlled medical scan file retrieval endpoint
  app.get("/api/scans/file/:fileName", async (req, res) => {
    try {
      const resolvedPath = resolveScanFilePath(req.params.fileName);
      if (!resolvedPath) {
        return res.status(404).json({ error: "Scan file not found or invalid filename" });
      }

      // Authorization verification: verify scan ownership
      const currentUserId = (req.user as any)?.id;
      const fileName = path.basename(req.params.fileName);
      const scan = await prisma.scan.findFirst({
        where: { imageUrl: { contains: fileName } },
        include: { patient: true }
      });
      if (scan && scan.patient.userId && currentUserId && scan.patient.userId !== currentUserId) {
        return res.status(403).json({ error: "Forbidden: You are not authorized to view this patient's medical scan." });
      }

      res.setHeader("Cache-Control", "private, max-age=86400");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.sendFile(resolvedPath);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const patient = await storage.getPatient(req.params.id, userId);
      if (!patient) {
        const rawPatient = await prisma.patient.findUnique({ where: { id: req.params.id } });
        if (rawPatient && rawPatient.userId && rawPatient.userId !== userId) {
          return res.status(403).json({ error: "Forbidden: You are not authorized to access this patient record." });
        }
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient({ ...validatedData, userId });
      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Clinical Features (Phase 4)
  
  // Appointments
  app.get("/api/patients/:id/appointments", async (req, res) => {
    try {
      const appointments = await storage.getPatientAppointments(req.params.id);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/patients/:id/appointments", async (req, res) => {
    try {
      const payload = { ...req.body, patientId: req.params.id };
      const validatedData = insertAppointmentSchema.parse(payload);
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Doctor Notes
  app.get("/api/patients/:id/notes", async (req, res) => {
    try {
      const notes = await storage.getPatientNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/patients/:id/notes", async (req, res) => {
    try {
      const payload = { ...req.body, patientId: req.params.id };
      const validatedData = insertDoctorNoteSchema.parse(payload);
      const note = await storage.createDoctorNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Medications
  app.get("/api/patients/:id/medications", async (req, res) => {
    try {
      const medications = await storage.getPatientMedications(req.params.id);
      res.json(medications);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/patients/:id/medications", async (req, res) => {
    try {
      const payload = { ...req.body, patientId: req.params.id };
      const validatedData = insertMedicationSchema.parse(payload);
      const medication = await storage.createMedication(validatedData);
      res.status(201).json(medication);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Scan routes
  app.get("/api/scans/:patientCaseId", async (req, res) => {
    try {
      const scans = await storage.getScansByPatient(req.params.patientCaseId);
      res.json(scans);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/scans/single/:scanId", async (req, res) => {
    try {
      const scan = await storage.getScan(req.params.scanId);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }
      res.json(scan);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/scans/analyzed", async (req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();

      const scansWithDetails = await Promise.all(
        analyses.map(async (analysis) => {
          try {
            const scan = await storage.getScan(analysis.scanId);
            if (!scan) return null;

            const patient = await storage.getPatient(scan.patientCaseId);
            return { ...scan, patient, analysis };
          } catch (err) {
            console.warn(`Error joining data for analysis ${analysis.id}:`, err);
            return null;
          }
        })
      );

      res.json(scansWithDetails.filter(Boolean));
    } catch (error) {
      console.error("Error fetching analyzed scans:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/scans/recent", async (req, res) => {
    try {
      const scans = await storage.getRecentScans(100);

      // Fetch patient and analysis data for each scan
      const scansWithDetails = await Promise.all(
        scans.map(async (scan) => {
          try {
            const [patient, analysis] = await Promise.all([
              storage.getPatient(scan.patientCaseId),
              storage.getAnalysis(scan.id)
            ]);
            return { ...scan, patient, analysis: analysis || null };
          } catch (err) {
            console.warn(`Details not found for scan ${scan.id}:`, err);
            return { ...scan, patient: null, analysis: null };
          }
        })
      );

      res.json(scansWithDetails);
    } catch (error) {
      console.error("Error fetching recent scans:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Upload route (without analysis)
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        console.error("No image file uploaded");
        return res.status(400).json({ error: "No image file uploaded" });
      }

      const { patientCaseId, imageType } = req.body;

      if (!patientCaseId || !imageType) {
        console.error("Missing required fields:", { patientCaseId, imageType });
        return res.status(400).json({ error: "Missing required fields: patientCaseId and imageType" });
      }

      // Patient ownership authorization check
      const currentUserId = (req.user as any)?.id;
      const patient = await storage.getPatient(patientCaseId, currentUserId);
      if (!patient) {
        return res.status(403).json({ error: "Forbidden: You are not authorized to upload scans for this patient." });
      }

      console.log("Processing upload for patient:", patientCaseId, "type:", imageType);

      let imageUrl: string;
      let metadata: any = null;

      // Handle DICOM files
      const isDICOM = req.file.mimetype === "application/dicom" ||
        req.file.originalname.toLowerCase().endsWith(".dcm");

      if (isDICOM) {
        console.log("DICOM file detected, parsing...");
        const dicomData = await parseDICOM(req.file.buffer);
        const saved = await saveScanFile(dicomData.imageBuffer, "dicom-converted.png", "image/png");
        imageUrl = saved.fileUrl;
        metadata = dicomData.metadata;
        console.log("DICOM parsed and stored to disk:", saved.fileName, metadata.PatientName);
      } else {
        // Persist standard image to secure file storage
        const saved = await saveScanFile(req.file.buffer, req.file.originalname, req.file.mimetype);
        imageUrl = saved.fileUrl;
        const fmt = req.file.mimetype.includes("png") ? "PNG" : (req.file.mimetype.includes("jpeg") || req.file.mimetype.includes("jpg") ? "JPEG" : "RASTER");
        metadata = {
          isDicom: false,
          format: fmt,
          pixelSpacing: null, // Standard formats lack physical mm calibration
          windowCenter: null,
          windowWidth: null,
          modality: imageType || "Standard Imaging",
          originalFilename: req.file.originalname,
          sizeBytes: req.file.buffer.length
        };
        console.log("Standard scan stored to disk:", saved.fileName, "format:", fmt);
      }

      // Create scan record
      const scanData = {
        patientCaseId,
        imageUrl,
        imageType,
        metadata,
      };

      const validatedScanData = insertScanSchema.parse(scanData);
      const scan = await storage.createScan(validatedScanData);
      console.log("Scan created with ID:", scan.id);

      res.status(201).json({ scan });
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Analyze existing scan route with medical pre-trained model
  app.post("/api/analyze/:scanId", async (req, res) => {
    try {
      const scanId = req.params.scanId;
      const { modelType = 'ResNet50' } = req.body;

      // Check for existing analysis first (Idempotency)
      const existingAnalysis = await storage.getAnalysis(scanId);
      if (existingAnalysis) {
        console.log(`Returning existing analysis for scan ${scanId}`);
        return res.json({ analysis: existingAnalysis });
      }

      const currentUserId = (req.user as any)?.id;
      const scan = await storage.getScan(scanId, currentUserId);

      if (!scan) {
        return res.status(404).json({ error: "Scan not found or access unauthorized" });
      }

      console.log(`Starting medical AI analysis for scan: ${scanId} using ${modelType} model`);

      // Load scan buffer from secure file storage or legacy Base64 data URL
      const imageBuffer = await getScanBuffer(scan.imageUrl);
      console.log(`Image buffer retrieved: ${imageBuffer.length} bytes`);

      const startTime = Date.now();

      // Update progress: Preprocessing
      updateAnalysisProgress(scanId, 10, "Preprocessing medical image...");

      // Analyze using Spinal Cord Toolbox for more accurate results
      let analysisResults;
      try {
        updateAnalysisProgress(scanId, 30, "Running deep learning inference on dedicated AI microservice...");
        analysisResults = await analyzeWithSCT(imageBuffer, scan.imageType);
        updateAnalysisProgress(scanId, 85, "Deep learning inference and Grad-CAM generation complete");
        console.log("Deep learning analysis completed successfully via dedicated microservice");
      } catch (sctError) {
        console.error("AI microservice analysis failed:", sctError);
        updateAnalysisProgress(scanId, 100, "Analysis failed");
        return res.status(503).json({
          error: `Medical AI Engine Error: ${(sctError as Error).message}. Heuristic/simulated fallback is disabled to ensure diagnostic reproducibility and clinical safety.`
        });
      }

      updateAnalysisProgress(scanId, 90, "Finalizing diagnostic findings...");
      console.log("Health AI analysis complete");

      const duration = Date.now() - startTime;
      console.log(`Analysis complete in ${duration}ms`);

      // Ensure processingTime is set correctly
      if (!analysisResults.mlPredictions) {
        analysisResults.mlPredictions = {
          predictions: [],
          modelUsed: "Combined Analysis",
          processingTime: duration
        };
      } else {
        analysisResults.mlPredictions.processingTime = duration;
      }

      console.log(`Analysis included ${analysisResults.mlPredictions?.predictions.length || 0} conditions`);

      // Store analysis results
      const analysisData = {
        scanId: scan.id,
        results: analysisResults,
      };

      const validatedAnalysisData = insertAnalysisSchema.parse(analysisData);
      const analysis = await storage.createAnalysis(validatedAnalysisData);
      console.log("Analysis stored with ID:", analysis.id);

      // Update progress: Complete
      updateAnalysisProgress(scanId, 100, "Analysis complete");

      res.status(201).json({ analysis });
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Analysis routes
  app.get("/api/analysis/:scanId", async (req, res) => {
    try {
      const analysis = await storage.getAnalysis(req.params.scanId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Human Reviewer Workflow: Submit Review (Accept, Reject, Modify)
  app.post("/api/analysis/:id/review", async (req, res) => {
    try {
      const analysisId = req.params.id;
      const user = req.user as any;
      const userRole = user?.role || "reviewer";

      // RBAC check: Viewers cannot review
      if (userRole === "viewer") {
        return res.status(403).json({
          error: "Forbidden: Read-only users are not authorized to review or modify clinical findings."
        });
      }

      const { decision, modifiedFindings, reasonForModification, notes } = req.body;
      if (!decision || !["accepted", "rejected", "modified"].includes(decision)) {
        return res.status(400).json({
          error: "Invalid decision. Must be one of: 'accepted', 'rejected', 'modified'"
        });
      }

      if (decision === "modified" && (!reasonForModification || reasonForModification.trim().length === 0)) {
        return res.status(400).json({
          error: "Clinical modification reason is required when modifying AI findings."
        });
      }

      const reviewRecord = {
        status: decision,
        decision,
        modifiedFindings: decision === "modified" ? (modifiedFindings || []) : undefined,
        reasonForModification: reasonForModification || notes || "",
        reviewerId: user?.id || "anonymous",
        reviewerUsername: user?.username || "Authorized Clinical Reviewer",
        reviewedAt: new Date().toISOString(),
        modelVersion: "PyTorch ResNet-50 v2 (Layer4 Grad-CAM)",
        reportVersion: "v1.1-reviewed",
        isFinalized: false
      };

      const updated = await storage.updateAnalysisReview(analysisId, reviewRecord);

      await storage.createAuditLog({
        userId: user?.id,
        action: "ANALYSIS_REVIEW_SUBMITTED",
        resource: `analysis:${analysisId}`,
        details: { decision, reviewer: user?.username, hasModifications: decision === "modified" },
        ipAddress: req.ip
      });

      res.json({ success: true, analysis: updated });
    } catch (error) {
      console.error("Review submission error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Human Reviewer Workflow: Finalize Report
  app.post("/api/analysis/:id/finalize", async (req, res) => {
    try {
      const analysisId = req.params.id;
      const user = req.user as any;
      const userRole = user?.role || "reviewer";

      // RBAC: Only reviewers or admins can finalize
      if (userRole !== "admin" && userRole !== "reviewer") {
        return res.status(403).json({
          error: "Forbidden: Only authorized clinical reviewers and administrators can finalize medical reports."
        });
      }

      const existing = await storage.getAnalysisById(analysisId);
      if (!existing) {
        return res.status(404).json({ error: "Analysis record not found" });
      }

      const existingResults = (typeof existing.results === "string" ? JSON.parse(existing.results) : existing.results) || {};
      const priorReview = existingResults.humanReview || {};

      const finalizedReview = {
        ...priorReview,
        status: "finalized",
        decision: priorReview.decision || "accepted",
        reviewerId: user?.id || priorReview.reviewerId || "reviewer",
        reviewerUsername: user?.username || priorReview.reviewerUsername || "Authorized Reviewer",
        reviewedAt: priorReview.reviewedAt || new Date().toISOString(),
        finalizedAt: new Date().toISOString(),
        finalizedBy: user?.username || "Authorized Reviewer",
        modelVersion: existingResults.modelVersion || "PyTorch ResNet-50 v2",
        reportVersion: "v1.0-final",
        isFinalized: true
      };

      const updated = await storage.updateAnalysisReview(analysisId, finalizedReview);

      await storage.createAuditLog({
        userId: user?.id,
        action: "REPORT_FINALIZED",
        resource: `analysis:${analysisId}`,
        details: { finalizedBy: user?.username, timestamp: finalizedReview.finalizedAt },
        ipAddress: req.ip
      });

      res.json({ success: true, analysis: updated });
    } catch (error) {
      console.error("Report finalization error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Audit Logs (Admins only)
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const user = req.user as any;
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: Audit logs require administrative access." });
      }
      const logs = await storage.getAuditLogs(100);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();

      // Fetch related scan and patient data for each analysis
      const analysesWithDetails = await Promise.all(
        analyses.map(async (analysis) => {
          const scan = await storage.getScan(analysis.scanId);
          if (!scan) {
            console.warn(`Scan not found for analysis ${analysis.id}`);
            return null;
          }

          const patient = await storage.getPatient(scan.patientCaseId);
          if (!patient) {
            console.warn(`Patient not found for scan ${scan.id}`);
            return null;
          }

          return {
            ...analysis,
            scan,
            patient,
          };
        })
      );

      // Filter out any null entries and ensure type safety
      const validAnalyses = analysesWithDetails.filter((a): a is NonNullable<typeof a> => a !== null);

      console.log(`Returning ${validAnalyses.length} analyses with details`);
      res.json(validAnalyses);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/stats/critical-findings", async (req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();

      let criticalCount = 0;
      const criticalFindings: any[] = [];

      for (const analysis of analyses) {
        const results = analysis.results as any;

        const conditions = [
          { key: 'discHerniation', name: results.discHerniation?.condition || 'Disc Herniation' },
          { key: 'scoliosis', name: results.scoliosis?.condition || 'Scoliosis' },
          { key: 'spinalStenosis', name: results.spinalStenosis?.condition || 'Spinal Stenosis' },
          { key: 'degenerativeDisc', name: results.degenerativeDisc?.condition || 'Degenerative Disc Disease' },
          { key: 'infection', name: results.infection?.condition || 'Infection' },
          { key: 'tumor', name: results.tumor?.condition || 'Tumor' },
        ];

        for (const condition of conditions) {
          const finding = results[condition.key];
          if (finding && (finding.severity === 'severe' || finding.severity === 'moderate')) {
            criticalCount++;

            const scan = await storage.getScan(analysis.scanId);
            const patient = scan ? await storage.getPatient(scan.patientCaseId) : null;

            criticalFindings.push({
              id: analysis.id,
              scanId: analysis.scanId,
              patientName: patient?.name || 'Unknown',
              condition: condition.name,
              severity: finding.severity,
              confidence: finding.confidence,
              analyzedAt: analysis.analyzedAt,
            });
          }
        }
      }

      criticalFindings.sort((a, b) =>
        new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime()
      );

      res.json({
        count: criticalCount,
        findings: criticalFindings.slice(0, 10)
      });
    } catch (error) {
      console.error("Error fetching critical findings:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/stats/average-analysis-time", async (req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();

      if (analyses.length === 0) {
        return res.json({ averageTime: 0, count: 0 });
      }

      let totalTime = 0;
      let count = 0;

      for (const analysis of analyses) {
        const results = analysis.results as any;
        // Handle both ML predictions and SCT analysis
        if (results.mlPredictions?.processingTime) {
          totalTime += results.mlPredictions.processingTime;
          count++;
        } else if (results.processingTime) {
          // For SCT results, we might store processing time differently
          totalTime += results.processingTime || 0;
          count++;
        }
      }

      const averageTime = count > 0 ? totalTime / count : 0;
      const averageMinutes = (averageTime / 1000 / 60).toFixed(1);

      res.json({
        averageTime: parseFloat(averageMinutes),
        count,
        unit: 'minutes'
      });
    } catch (error) {
      console.error("Error calculating average analysis time:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const scans = await storage.getRecentScans(1000); // Get all or a large number for today count
      const analyses = await storage.getAllAnalyses();
      const patients = await storage.getAllPatients();

      // Scans analyzed today
      const today = new Date();
      const scansToday = scans.filter(s => {
        const d = new Date(s.uploadedAt);
        return d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
      }).length;

      // Avg analysis time (copied logic from below)
      let totalTime = 0;
      let count = 0;
      for (const analysis of analyses) {
        const results = analysis.results as any;
        if (results.mlPredictions?.processingTime) {
          totalTime += results.mlPredictions.processingTime;
          count++;
        } else if (results.processingTime) {
          totalTime += results.processingTime || 0;
          count++;
        }
      }
      const avgAnalysisTime = count > 0 ? totalTime / count : 0;
      const avgMinutes = (avgAnalysisTime / 1000 / 60).toFixed(1);

      // Critical findings count
      let criticalCount = 0;
      const criticalFindings: any[] = [];
      for (const analysis of analyses) {
        const results = analysis.results as any;
        const conditions = ['discHerniation', 'scoliosis', 'spinalStenosis', 'degenerativeDisc', 'infection', 'tumor'];
        for (const cond of conditions) {
          const finding = results[cond];
          if (finding && (finding.severity === 'severe' || finding.severity === 'moderate')) {
            criticalCount++;
            break; // Count per analysis
          }
        }
      }

      res.json({
        scansToday,
        criticalFindings: criticalCount,
        avgAnalysisTime: parseFloat(avgMinutes),
        activePatients: patients.length
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
