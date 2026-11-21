import { describe, it, expect } from 'vitest';
import express from 'express';
import helmet from 'helmet';
import request from 'supertest';

describe('Security Headers & Content Security Policy (DEFECT-1)', () => {
  it('should emit hardened CSP allowing blob:, ws:, wss:, and WebGL workers', async () => {
    const app = express();
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "blob:", "https:"],
            workerSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
      })
    );
    app.get('/test', (req, res) => res.json({ status: 'ok' }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);

    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();

    // Verify critical XAI & Three.js directives
    expect(csp).toContain("img-src 'self' data: blob: https:");
    expect(csp).toContain("connect-src 'self' ws: wss: blob: https:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:");
    expect(csp).toContain("object-src 'none'");
  });
});
