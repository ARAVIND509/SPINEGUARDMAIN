import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from '@prisma/client';

// If schema is configured for sqlite but DATABASE_URL was left as postgresql (e.g. from container env),
// override DATABASE_URL to use the sqlite database file.
try {
  const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const isSqliteSchema = /provider\s*=\s*"sqlite"/.test(schemaContent);
    const dbUrl = process.env.DATABASE_URL || "";
    if (isSqliteSchema && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://") || !dbUrl)) {
      process.env.DATABASE_URL = "file:./dev.db";
    }
  }
} catch (e) {
  // Ignore fallback check error
}

export const prisma = new PrismaClient();

// Test connection
prisma.$connect()
  .then(() => console.log('Successfully connected to database via Prisma'))
  .catch((err: any) => console.error('Failed to connect to database:', err));
