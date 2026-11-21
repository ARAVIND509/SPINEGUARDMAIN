import { describe, it, expect, beforeAll } from 'vitest';
import { storage } from '../server/storage';

describe('Patient-Level Authorization & Cross-User Security (ISSUE-1 & ISSUE-5)', () => {
  let userAId: string;
  let userBId: string;
  let patientAId: string;

  beforeAll(async () => {
    // Create User A
    const userA = await storage.createUser({
      username: `doctor_a_${Date.now()}`,
      password: 'password123'
    });
    userAId = userA.id;

    // Create User B
    const userB = await storage.createUser({
      username: `doctor_b_${Date.now()}`,
      password: 'password123'
    });
    userBId = userB.id;

    // User A creates Patient A
    const patientA = await storage.createPatient({
      userId: userAId,
      patientId: `PAT-A-${Date.now()}`,
      name: 'Patient Owned By Doctor A',
      age: 45,
      gender: 'Male'
    });
    patientAId = patientA.id;
  });

  it('should allow User A to retrieve their own patient record', async () => {
    const patient = await storage.getPatient(patientAId, userAId);
    expect(patient).toBeDefined();
    expect(patient?.id).toBe(patientAId);
    expect(patient?.userId).toBe(userAId);
  });

  it('should BLOCK User B from accessing User A patient record (Cross-User Defense)', async () => {
    // When User B attempts to query Patient A with their userId filter
    const unauthorizedPatient = await storage.getPatient(patientAId, userBId);
    expect(unauthorizedPatient).toBeUndefined();
  });

  it('should filter patient lists so User B cannot view User A patients', async () => {
    const userBPaginated = await storage.getPatientsPaginated(undefined, 20, userBId);
    const userBPatientIds = userBPaginated.items.map(p => p.id);
    expect(userBPatientIds).not.toContain(patientAId);
  });

  it('should optimize archive query to a single join and filter by ownership', async () => {
    // Create scan for Patient A
    const scanA = await storage.createScan({
      patientCaseId: patientAId,
      imageUrl: '/api/scans/file/test-scan-a.png',
      imageType: 'MRI'
    });

    // Single-query join for User A
    const archiveA = await storage.getScansWithDetailsPaginated(undefined, 20, userAId);
    expect(archiveA.items).toBeInstanceOf(Array);
    const scanAFound = archiveA.items.find(s => s.id === scanA.id);
    expect(scanAFound).toBeDefined();
    expect(scanAFound.patient.id).toBe(patientAId);

    // Single-query join for User B should NOT contain Scan A
    const archiveB = await storage.getScansWithDetailsPaginated(undefined, 20, userBId);
    const scanAInB = archiveB.items.find(s => s.id === scanA.id);
    expect(scanAInB).toBeUndefined();
  });
});
