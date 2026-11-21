import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import {
  saveScanFile,
  getScanBuffer,
  resolveScanFilePath,
  getScansDirectory,
  sanitizeFileName
} from '../server/scan-storage';

describe('Medical Scan File Storage & Retrieval (DEFECT-4)', () => {
  const dummyBuffer = Buffer.from('TEST_SPINE_MRI_IMAGE_BINARY_DATA');
  let savedFileUrl: string = '';
  let savedFileName: string = '';

  it('should save scan binary to disk and return file endpoint URL', async () => {
    const result = await saveScanFile(dummyBuffer, 'test-mri-patient.png', 'image/png');
    expect(result.fileUrl).toMatch(/^\/api\/scans\/file\/\d+-test-mri-patient-[a-f0-9\-]+\.png$/);
    expect(result.size).toBe(dummyBuffer.length);
    savedFileUrl = result.fileUrl;
    savedFileName = result.fileName;

    const fullPath = path.join(getScansDirectory(), result.fileName);
    expect(fs.existsSync(fullPath)).toBe(true);

    const onDisk = await fs.promises.readFile(fullPath);
    expect(onDisk.toString()).toBe('TEST_SPINE_MRI_IMAGE_BINARY_DATA');
  });

  it('should read scan buffer from disk using getScanBuffer with URL', async () => {
    const loadedBuffer = await getScanBuffer(savedFileUrl);
    expect(loadedBuffer.toString()).toBe('TEST_SPINE_MRI_IMAGE_BINARY_DATA');
  });

  it('should maintain backward compatibility for Base64 data URLs', async () => {
    const base64Data = dummyBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Data}`;

    const decodedBuffer = await getScanBuffer(dataUrl);
    expect(decodedBuffer.toString()).toBe('TEST_SPINE_MRI_IMAGE_BINARY_DATA');
  });

  it('should sanitize filenames and prevent path traversal', () => {
    const dangerousNames = [
      '../../etc/passwd',
      '..\\..\\windows\\win.ini',
      '../../../server/index.ts',
      'normal_scan.png'
    ];

    for (const name of dangerousNames) {
      const sanitized = sanitizeFileName(name);
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('\\');
    }

    const traversalResolved = resolveScanFilePath('../../etc/passwd');
    expect(traversalResolved).toBeNull();
  });

  it('should serve stored file via HTTP endpoint and reject invalid paths', async () => {
    const app = express();
    app.get('/api/scans/file/:fileName', (req, res) => {
      const resolvedPath = resolveScanFilePath(req.params.fileName);
      if (!resolvedPath) {
        return res.status(404).json({ error: 'Scan file not found or invalid filename' });
      }
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(resolvedPath);
    });

    // 1. Success case
    const resSuccess = await request(app).get(`/api/scans/file/${savedFileName}`);
    expect(resSuccess.status).toBe(200);
    expect(resSuccess.headers['cache-control']).toBe('private, max-age=86400');
    expect(resSuccess.headers['x-content-type-options']).toBe('nosniff');
    const responseContent = Buffer.isBuffer(resSuccess.body)
      ? resSuccess.body.toString()
      : (resSuccess.text || resSuccess.body?.toString() || '');
    expect(responseContent).toBe('TEST_SPINE_MRI_IMAGE_BINARY_DATA');

    // 2. Traversal rejection
    const resTraversal = await request(app).get('/api/scans/file/..%2F..%2Fpackage.json');
    expect(resTraversal.status).toBe(404);

    // 3. Nonexistent file
    const resNotFound = await request(app).get('/api/scans/file/nonexistent-file.png');
    expect(resNotFound.status).toBe(404);
  });
});
