import {
  type Patient, type InsertPatient,
  type Scan, type InsertScan,
  type Analysis, type InsertAnalysis,
  type User, type InsertUser,
  type Appointment, type InsertAppointment,
  type DoctorNote, type InsertDoctorNote,
  type Medication, type InsertMedication
} from "@shared/schema";
import { prisma } from "./db";
import session from "express-session";
import fs from "fs";
import path from "path";
import connectPgSimple from "connect-pg-simple";

// Persistent Session Store: PostgreSQL in production, Disk-backed JSON store in development
function createPersistentSessionStore(): session.Store {
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
    const PgStore = connectPgSimple(session);
    return new PgStore({
      conString: dbUrl,
      createTableIfMissing: true,
      tableName: "session"
    });
  }

  // File-backed persistent session store for SQLite/local environments
  class FilePersistentStore extends session.Store {
    private sessionsFile: string;
    private memoryMap = new Map<string, any>();

    constructor() {
      super();
      const dir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.sessionsFile = path.join(dir, "sessions.json");
      this.readFromFile();
    }

    private readFromFile() {
      try {
        if (fs.existsSync(this.sessionsFile)) {
          const raw = fs.readFileSync(this.sessionsFile, "utf-8");
          const data = JSON.parse(raw);
          for (const [k, v] of Object.entries(data)) {
            this.memoryMap.set(k, v);
          }
        }
      } catch (e) {
        // Fallback to empty memory map
      }
    }

    private writeToFile() {
      try {
        const obj: Record<string, any> = {};
        this.memoryMap.forEach((v, k) => {
          obj[k] = v;
        });
        fs.writeFileSync(this.sessionsFile, JSON.stringify(obj), "utf-8");
      } catch (e) {
        // Ignore write error
      }
    }

    get = (sid: string, callback: (err?: any, session?: session.SessionData | null) => void) => {
      const sess = this.memoryMap.get(sid);
      if (!sess) return callback(null, null);
      if (sess.cookie && sess.cookie.expires && new Date(sess.cookie.expires) < new Date()) {
        this.memoryMap.delete(sid);
        this.writeToFile();
        return callback(null, null);
      }
      callback(null, sess);
    };

    set = (sid: string, sess: session.SessionData, callback?: (err?: any) => void) => {
      this.memoryMap.set(sid, sess);
      this.writeToFile();
      if (callback) callback(null);
    };

    destroy = (sid: string, callback?: (err?: any) => void) => {
      this.memoryMap.delete(sid);
      this.writeToFile();
      if (callback) callback(null);
    };
  }

  return new FilePersistentStore();
}

export interface IStorage {
  // Patient operations
  getPatient(id: string, userId?: string): Promise<Patient | undefined>;
  getAllPatients(userId?: string): Promise<Patient[]>;
  getPatientsPaginated(cursor?: string, limit?: number, userId?: string): Promise<{ items: Patient[]; nextCursor: string | null; hasMore: boolean }>;
  createPatient(patient: InsertPatient & { userId?: string | null }): Promise<Patient>;

  // Scan operations
  getScan(id: string, userId?: string): Promise<Scan | undefined>;
  getScansByPatient(patientCaseId: string, userId?: string): Promise<Scan[]>;
  getRecentScans(limit?: number, userId?: string): Promise<Scan[]>;
  getScansPaginated(cursor?: string, limit?: number, userId?: string): Promise<{ items: Scan[]; nextCursor: string | null; hasMore: boolean }>;
  getScansWithDetailsPaginated(cursor?: string, limit?: number, userId?: string): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }>;
  createScan(scan: InsertScan): Promise<Scan>;

  // Analysis operations
  getAnalysis(scanId: string): Promise<Analysis | undefined>;
  getAnalysisById(analysisId: string): Promise<Analysis | undefined>;
  getAllAnalyses(): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysisReview(analysisId: string, review: any): Promise<Analysis>;

  // Audit Log operations
  createAuditLog(entry: { userId?: string; action: string; resource: string; details?: any; ipAddress?: string }): Promise<void>;
  getAuditLogs(limit?: number): Promise<any[]>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Clinical Operations
  getPatientAppointments(patientId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  
  getPatientNotes(patientId: string): Promise<DoctorNote[]>;
  createDoctorNote(note: InsertDoctorNote): Promise<DoctorNote>;
  
  getPatientMedications(patientId: string): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  // Patient operations
  async getPatient(id: string, userId?: string): Promise<Patient | undefined> {
    const where: any = { id };
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }
    const patient = await prisma.patient.findFirst({
      where
    });
    return (patient as any) || undefined;
  }

  async getAllPatients(userId?: string): Promise<Patient[]> {
    const where: any = userId ? { OR: [{ userId }, { userId: null }] } : {};
    return (await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })) as any;
  }

  async getPatientsPaginated(
    cursor?: string,
    limit: number = 20,
    userId?: string
  ): Promise<{ items: Patient[]; nextCursor: string | null; hasMore: boolean }> {
    const take = limit + 1;
    const where: any = userId ? { OR: [{ userId }, { userId: null }] } : {};
    const items = await prisma.patient.findMany({
      take,
      where,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;
    return {
      items: pageItems as any,
      nextCursor,
      hasMore
    };
  }

  async createPatient(insertPatient: InsertPatient & { userId?: string | null }): Promise<Patient> {
    return (await prisma.patient.create({
      data: {
        userId: insertPatient.userId || null,
        patientId: insertPatient.patientId,
        name: insertPatient.name,
        age: insertPatient.age,
        gender: insertPatient.gender,
        contactNumber: insertPatient.contactNumber,
        medicalHistory: insertPatient.medicalHistory,
        symptoms: insertPatient.symptoms
      }
    })) as any;
  }

  // Scan operations
  async getScan(id: string, userId?: string): Promise<Scan | undefined> {
    const scan = await prisma.scan.findUnique({
      where: { id },
      include: { patient: true }
    });
    if (!scan) return undefined;
    if (userId && scan.patient.userId && scan.patient.userId !== userId) {
      return undefined; // unauthorized cross-user access
    }
    return scan;
  }

  async getScansByPatient(patientCaseId: string, userId?: string): Promise<Scan[]> {
    if (userId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientCaseId }
      });
      if (!patient || (patient.userId && patient.userId !== userId)) {
        return []; // unauthorized cross-user access blocked
      }
    }
    return await prisma.scan.findMany({
      where: { patientCaseId },
      orderBy: { uploadedAt: 'desc' }
    });
  }

  async getRecentScans(limit: number = 10, userId?: string): Promise<Scan[]> {
    const where: any = userId ? {
      patient: {
        OR: [{ userId }, { userId: null }]
      }
    } : {};
    return await prisma.scan.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      take: limit
    });
  }

  async getScansPaginated(
    cursor?: string,
    limit: number = 20,
    userId?: string
  ): Promise<{ items: Scan[]; nextCursor: string | null; hasMore: boolean }> {
    const take = limit + 1;
    const where: any = userId ? {
      patient: {
        OR: [{ userId }, { userId: null }]
      }
    } : {};
    const items = await prisma.scan.findMany({
      take,
      where,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }]
    });
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;
    return {
      items: pageItems,
      nextCursor,
      hasMore
    };
  }

  // Single-Query Optimized Join for Archive (Eliminates N+1 queries)
  async getScansWithDetailsPaginated(
    cursor?: string,
    limit: number = 20,
    userId?: string
  ): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }> {
    const take = limit + 1;
    const where: any = userId ? {
      patient: {
        OR: [{ userId }, { userId: null }]
      }
    } : {};

    const scans = await prisma.scan.findMany({
      take,
      where,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
      include: {
        patient: true,
        analyses: {
          take: 1,
          orderBy: { analyzedAt: 'desc' }
        }
      }
    });

    const hasMore = scans.length > limit;
    const pageItems = hasMore ? scans.slice(0, limit) : scans;
    const nextCursor = hasMore && pageItems.length > 0 ? pageItems[pageItems.length - 1].id : null;

    const formattedItems = pageItems.map(scan => ({
      ...scan,
      patient: scan.patient,
      analysis: scan.analyses && scan.analyses.length > 0 ? scan.analyses[0] : null
    }));

    return {
      items: formattedItems,
      nextCursor,
      hasMore
    };
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    return await prisma.scan.create({
      data: {
        patientCaseId: insertScan.patientCaseId,
        imageUrl: insertScan.imageUrl,
        imageType: insertScan.imageType,
        metadata: insertScan.metadata ?? undefined
      }
    });
  }

  // Analysis operations
  async getAnalysis(scanId: string): Promise<Analysis | undefined> {
    const analysis = await prisma.analysis.findFirst({
      where: { scanId }
    });
    return analysis || undefined;
  }

  async getAnalysisById(analysisId: string): Promise<Analysis | undefined> {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId }
    });
    return analysis || undefined;
  }

  async getAllAnalyses(): Promise<Analysis[]> {
    return await prisma.analysis.findMany({
      orderBy: { analyzedAt: 'desc' }
    });
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    return await prisma.analysis.create({
      data: {
        scanId: insertAnalysis.scanId,
        results: insertAnalysis.results as any
      }
    });
  }

  async updateAnalysisReview(analysisId: string, review: any): Promise<Analysis> {
    const current = await prisma.analysis.findUnique({
      where: { id: analysisId }
    });
    if (!current) {
      throw new Error(`Analysis ${analysisId} not found`);
    }

    const currentResults = (typeof current.results === 'string'
      ? JSON.parse(current.results)
      : current.results) || {};

    // Strictly preserve original AI predictions
    if (!review.originalAiPrediction) {
      review.originalAiPrediction = {
        findings: currentResults.findings || currentResults.checkedConditions || [],
        primaryFinding: currentResults.primaryFinding,
        confidence: currentResults.confidence,
        summary: currentResults.summary,
        modelVersion: currentResults.modelVersion || "PyTorch ResNet-50 v2"
      };
    }

    const updatedResults = {
      ...currentResults,
      humanReview: review
    };

    return await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        results: updatedResults
      }
    });
  }

  async createAuditLog(entry: { userId?: string; action: string; resource: string; details?: any; ipAddress?: string }): Promise<void> {
    try {
      await (prisma as any).auditLog.create({
        data: {
          userId: entry.userId || null,
          action: entry.action,
          resource: entry.resource,
          details: entry.details || null,
          ipAddress: entry.ipAddress || null
        }
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }
  }

  async getAuditLogs(limit: number = 100): Promise<any[]> {
    try {
      return await (prisma as any).auditLog.findMany({
        take: limit,
        orderBy: { timestamp: "desc" }
      });
    } catch (e) {
      console.error("Audit log fetch error:", e);
      return [];
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await (prisma as any).user.findUnique({
      where: { id }
    });
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await (prisma as any).user.findUnique({
      where: { username }
    });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await (prisma as any).user.create({
      data: insertUser
    });
  }

  // Clinical Operations
  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    return await (prisma as any).appointment.findMany({
      where: { patientId },
      orderBy: { date: 'asc' }
    });
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    return await (prisma as any).appointment.create({
      data: insertAppointment
    });
  }

  async getPatientNotes(patientId: string): Promise<DoctorNote[]> {
    return await (prisma as any).doctorNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createDoctorNote(insertNote: InsertDoctorNote): Promise<DoctorNote> {
    return await (prisma as any).doctorNote.create({
      data: insertNote
    });
  }

  async getPatientMedications(patientId: string): Promise<Medication[]> {
    return await (prisma as any).medication.findMany({
      where: { patientId },
      orderBy: { name: 'asc' }
    });
  }

  async createMedication(insertMedication: InsertMedication): Promise<Medication> {
    return await (prisma as any).medication.create({
      data: insertMedication
    });
  }

  sessionStore: session.Store = createPersistentSessionStore();
}

export const storage = new DatabaseStorage();
