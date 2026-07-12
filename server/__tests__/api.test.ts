import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';

const app = express();
app.use(express.json());

describe('API Routes', () => {
  beforeAll(async () => {
    // We register routes but mock authentication for test isolation
    app.use((req, res, next) => {
      // Mock authenticated user for all tests
      req.isAuthenticated = () => true;
      req.user = { id: 'test-admin', username: 'admin' };
      next();
    });
    
    await registerRoutes(app);
  });

  it('GET /api/patients should return an array', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
  
  it('GET /api/scans/recent should return recent scans', async () => {
    const res = await request(app).get('/api/scans/recent');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
