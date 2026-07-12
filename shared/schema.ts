import { z } from "zod";

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User {
  id: string;
  username: string;
  password: string;
}

// Insert schemas (Validation only, will be used with Zod)
const basePatient = z.object({
  patientId: z.string(),
  name: z.string(),
  age: z.number().int().nullable().optional(),
  gender: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  medicalHistory: z.string().nullable().optional(),
  symptoms: z.string().nullable().optional(),
});

const baseScan = z.object({
  patientCaseId: z.string(),
  imageUrl: z.string(),
  imageType: z.string(),
  metadata: z.any().optional(),
});

const baseAnalysis = z.object({
  scanId: z.string(),
  results: z.any(),
});

export const insertPatientSchema = basePatient;
export const insertScanSchema = baseScan;
export const insertAnalysisSchema = baseAnalysis;

export const insertAppointmentSchema = z.object({
  patientId: z.string(),
  date: z.string().transform((str) => new Date(str)),
  type: z.string(),
  status: z.string().optional().default("Scheduled"),
  notes: z.string().nullable().optional(),
});

export const insertDoctorNoteSchema = z.object({
  patientId: z.string(),
  note: z.string(),
});

export const insertMedicationSchema = z.object({
  patientId: z.string(),
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  startDate: z.string().optional().nullable().transform((str) => str ? new Date(str) : null),
  endDate: z.string().optional().nullable().transform((str) => str ? new Date(str) : null),
  active: z.boolean().optional().default(true),
});

// Types
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number | null;
  gender: string | null;
  contactNumber: string | null;
  medicalHistory: string | null;
  symptoms: string | null;
  createdAt: Date;
}

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export interface Appointment {
  id: string;
  patientId: string;
  date: Date;
  type: string;
  status: string;
  notes: string | null;
}

export type InsertDoctorNote = z.infer<typeof insertDoctorNoteSchema>;
export interface DoctorNote {
  id: string;
  patientId: string;
  note: string;
  createdAt: Date;
}

export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date | null;
  endDate: Date | null;
  active: boolean;
}

export type InsertScan = z.infer<typeof insertScanSchema>;
export interface Scan {
  id: string;
  patientCaseId: string;
  imageUrl: string;
  imageType: string;
  metadata: any;
  uploadedAt: Date;
}

export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export interface Analysis {
  id: string;
  scanId: string;
  results: any;
  analyzedAt: Date;
}

// Analysis result types
export type SeverityLevel = "normal" | "mild" | "moderate" | "severe";

export interface DiagnosticFinding {
  condition: string;
  severity: SeverityLevel;
  confidence: number; // 0-100
  findings: string[];
  recommendations: string[];
  measurements?: Record<string, any>;
}

export interface SoftTissueDegenerationResult {
  condition: string;
  severity: SeverityLevel;
  confidence: number;
  ligamentChanges: {
    anterior: string;
    posterior: string;
    interspinous: string;
  };
  tendonDegeneration: {
    level: string;
    percentage: number;
  };
  discChanges: {
    hydration: number; // percentage
    heightLoss: number; // mm
    degenerationGrade: string;
  };
  timelineProgression: string;
  recommendations: string[];
}

export interface PostureSimulationResult {
  condition: string;
  severity: SeverityLevel;
  confidence: number;
  spinalCurvature: {
    cervical: number; // degrees
    thoracic: number;
    lumbar: number;
  };
  postureModels: {
    standing: string;
    sitting: string;
    bending: string;
  };
  functionalLimitations: string[];
  compensatoryPatterns: string[];
  recommendations: string[];
}

export interface HiddenAbnormalityResult {
  condition: string;
  severity: SeverityLevel;
  confidence: number;
  infections: {
    detected: boolean;
    type: string;
    location: string[];
    probability: number;
  };
  inflammation: {
    detected: boolean;
    severity: string;
    affectedAreas: string[];
  };
  tumorProbability: {
    detected: boolean;
    type: string;
    size: string;
    location: string[];
    malignancyRisk: number;
  };
  subtleFindings: string[];
  recommendations: string[];
}

export interface BloodFlowAnalysisResult {
  condition: string;
  severity: SeverityLevel;
  confidence: number;
  spinalCordPerfusion: {
    level: string;
    flowRate: number; // ml/min
    adequacy: string;
  };
  nerveRootOxygenation: {
    vertebralLevel: string;
    oxygenation: number; // percentage
    status: string;
  }[];
  vascularCompromise: {
    detected: boolean;
    location: string[];
    severity: string;
  };
  circulationMap: string[];
  recommendations: string[];
}

export interface MLPrediction {
  condition: string;
  confidence: number;
  severity: SeverityLevel;
  modelType: string;
  regionX?: number; // Normalized coordinate 0-1
  regionY?: number; // Normalized coordinate 0-1
}

export interface MLModelPredictions {
  predictions: MLPrediction[];
  modelUsed: string;
  processingTime: number;
}

export interface GradCAMHeatmap {
  condition: string;
  heatmapImageUrl: string;
  overlayImageUrl: string;
  affectedRegions: {
    region: string;
    intensity: number;
    coordinates: { x: number; y: number; width: number; height: number };
  }[];
  interpretationNotes: string;
  isSynthetic?: boolean;
  regionX?: number; // Primary peak normalized coordinate
  regionY?: number; // Primary peak normalized coordinate
  severity?: SeverityLevel;
  confidence?: number;
}

export interface ClinicalFinding {
  condition: string;
  severity: SeverityLevel;
  confidence: number;
  location: string;
  measurements?: Record<string, any>;
}

export interface HeatmapTarget {
  condition: string;
  region: string;
  intensity: number;
  severity?: SeverityLevel;
}

export interface AnalysisResults {
  discHerniation?: DiagnosticFinding;
  scoliosis?: DiagnosticFinding;
  spinalStenosis?: DiagnosticFinding;
  degenerativeDisc?: DiagnosticFinding;
  vertebralFracture?: DiagnosticFinding;
  spondylolisthesis?: DiagnosticFinding;
  infection?: DiagnosticFinding;
  tumor?: DiagnosticFinding;
  softTissueDegeneration?: SoftTissueDegenerationResult;
  postureSimulation?: PostureSimulationResult;
  hiddenAbnormality?: HiddenAbnormalityResult;
  bloodFlowAnalysis?: BloodFlowAnalysisResult;
  summary?: string;
  riskZones?: string[];
  findings?: ClinicalFinding[];
  checkedConditions?: ClinicalFinding[];
  landmarks?: any[];
  mlPredictions?: MLModelPredictions;
  gradCamHeatmaps?: GradCAMHeatmap[];
  heatmapTargets?: HeatmapTarget[];
  primaryFinding?: ClinicalFinding;
}
