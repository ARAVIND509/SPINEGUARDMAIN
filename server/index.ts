import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { setupWebSocket } from "./websocket-handler";
import { storage } from "./storage";
import { hashPassword } from "./auth";

import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { logger } from "./logger";

const app = express();

// Security Headers
app.use(helmet());

// Rate Limiting (Basic protection against brute force)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;

  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      logger.info(logLine);
    }
  });

  next();
});

(async () => {

  const server = await registerRoutes(app);

  setupWebSocket(server);

  // Seed default admin user
  try {
    const admin = await storage.getUserByUsername("admin");

    if (!admin) {
      logger.info("Seeding default admin user...");

      const hashedPassword = await hashPassword("password123");

      await storage.createUser({
        username: "admin",
        password: hashedPassword
      });

      logger.info("Admin created (admin / password123)");
    }
  } catch (err) {
    logger.error("Failed to seed admin:", err);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (!res.headersSent) {
      res.status(status).json({ message });
    }

    logger.error(`Express error handler: ${message}`, err);
  });

  // DEVELOPMENT MODE → use Vite
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } 
  // // production static serving
const distPath = path.resolve(process.cwd(), "dist/public");

app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

  // Railway provides PORT env variable
  const port = parseInt(process.env.PORT || "5000", 10);

  const host =
    process.env.NODE_ENV === "development"
      ? "localhost"
      : "0.0.0.0";

  server.listen(
    {
      port,
      host,
      reusePort: process.env.NODE_ENV !== "development"
    },
    () => {
      logger.info(`Server running on ${host}:${port}`);
    }
  );

})();