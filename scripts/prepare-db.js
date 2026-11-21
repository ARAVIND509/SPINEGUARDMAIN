import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import "dotenv/config";

const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
const envPath = path.resolve(process.cwd(), ".env");

function setProviderInSchema(targetProvider) {
  let content = fs.readFileSync(schemaPath, "utf-8");
  const datasourceRegex = /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")[^"]+(")/;
  content = content.replace(datasourceRegex, `$1${targetProvider}$2`);
  fs.writeFileSync(schemaPath, content, "utf-8");
}

let dbUrl = process.env.DATABASE_URL || "file:./dev.db";
let isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

function switchToSqlite(reason) {
  console.warn(`\n⚠️  ${reason}`);
  console.warn(`➡️  Falling back to local SQLite database (file:./dev.db) so server starts cleanly.\n`);

  process.env.DATABASE_URL = "file:./dev.db";

  // Persist to .env so child/subsequent processes use the fallback
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
    if (envContent.includes("DATABASE_URL=")) {
      envContent = envContent.replace(/DATABASE_URL=.*/, 'DATABASE_URL="file:./dev.db"');
    } else {
      envContent = `DATABASE_URL="file:./dev.db"\n` + envContent;
    }
  } else {
    envContent = `DATABASE_URL="file:./dev.db"\n`;
  }
  fs.writeFileSync(envPath, envContent, "utf-8");

  setProviderInSchema("sqlite");
  console.log("Generating Prisma client for SQLite fallback...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Syncing SQLite database...");
  try {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    console.log("✅ SQLite database ready.");
  } catch (err) {
    console.warn("Prisma db push warning:", err.message);
  }
}

if (isPostgres) {
  const maskedUrl = dbUrl.replace(/:[^:@]*@/, ":***@");
  console.log(`Detected PostgreSQL URL: ${maskedUrl}`);
  setProviderInSchema("postgresql");
  try {
    console.log("Generating Prisma client for PostgreSQL...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("Testing connection and syncing PostgreSQL schema...");
    // 15 second timeout prevents hanging if DB host is unreachable
    execSync("npx prisma db push --skip-generate", { stdio: "inherit", timeout: 15000 });
    console.log("✅ Successfully connected and synced with PostgreSQL database!");
  } catch (err) {
    switchToSqlite(`PostgreSQL connection failed: ${err.message || 'server unreachable'}`);
  }
} else {
  console.log("Using SQLite database...");
  setProviderInSchema("sqlite");
  try {
    execSync("npx prisma generate", { stdio: "inherit" });
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    console.log("✅ SQLite database ready.");
  } catch (err) {
    console.warn("SQLite setup warning:", err.message);
  }
}
