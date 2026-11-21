import fs from "fs";
import path from "path";
import net from "net";
import { execSync } from "child_process";
import "dotenv/config";

const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
const envPath = path.resolve(process.cwd(), ".env");

function setProviderInSchema(targetProvider) {
  let content = fs.readFileSync(schemaPath, "utf-8");
  if (targetProvider === "sqlite") {
    content = content.replace(
      /datasource\s+db\s*\{[\s\S]*?\}/,
      `datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}`
    );
  } else {
    content = content.replace(
      /datasource\s+db\s*\{[\s\S]*?\}/,
      `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}`
    );
  }
  fs.writeFileSync(schemaPath, content, "utf-8");
}

function checkTcpConnection(host, port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

function switchToSqlite(reason) {
  console.warn(`\n⚠️  ${reason}`);
  console.warn(`➡️  Falling back to local SQLite database (file:./dev.db) so server starts cleanly.\n`);

  process.env.DATABASE_URL = "file:./dev.db";

  // Persist to .env so subsequent processes (dist/index.js) use it
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
  const execEnv = { ...process.env, DATABASE_URL: "file:./dev.db" };
  try {
    execSync("npx prisma generate", { stdio: "inherit", env: execEnv });
    execSync("npx prisma db push --skip-generate", { stdio: "inherit", env: execEnv });
    console.log("✅ SQLite database ready.");
  } catch (err) {
    console.warn("SQLite setup warning:", err.message);
  }
}

async function main() {
  let dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  let isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  if (isPostgres) {
    const maskedUrl = dbUrl.replace(/:[^:@]*@/, ":***@");
    console.log(`Checking PostgreSQL reachability for: ${maskedUrl}`);

    let host = "";
    let port = 5432;
    try {
      const parsed = new URL(dbUrl);
      host = parsed.hostname;
      port = parseInt(parsed.port || "5432", 10);
    } catch (e) {
      console.warn("Could not parse DATABASE_URL:", e.message);
    }

    let isReachable = false;
    if (host) {
      isReachable = await checkTcpConnection(host, port, 4000);
    }

    if (isReachable) {
      console.log(`✅ PostgreSQL host ${host}:${port} is reachable! Syncing schema...`);
      setProviderInSchema("postgresql");
      try {
        execSync("npx prisma generate", { stdio: "inherit" });
        execSync("npx prisma db push --skip-generate", { stdio: "inherit", timeout: 60000 });
        console.log("✅ Successfully synced schema to PostgreSQL database!");
      } catch (err) {
        switchToSqlite(`PostgreSQL schema push failed: ${err.message}`);
      }
    } else {
      switchToSqlite(`PostgreSQL host ${host}:${port} is not reachable from this instance.`);
    }
  } else {
    console.log("Using SQLite database...");
    setProviderInSchema("sqlite");
    const execEnv = { ...process.env, DATABASE_URL: "file:./dev.db" };
    try {
      execSync("npx prisma generate", { stdio: "inherit", env: execEnv });
      execSync("npx prisma db push --skip-generate", { stdio: "inherit", env: execEnv });
      console.log("✅ SQLite database ready.");
    } catch (err) {
      console.warn("SQLite setup warning:", err.message);
    }
  }
}

main().catch((err) => {
  console.error("Fatal prepare-db error:", err);
  process.exit(0); // Exit 0 so the server can attempt to start regardless
});
