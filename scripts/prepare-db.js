import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import "dotenv/config";

const schemaPath = path.resolve(process.cwd(), "prisma", "schema.prisma");
let schemaContent = fs.readFileSync(schemaPath, "utf-8");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
const targetProvider = isPostgres ? "postgresql" : "sqlite";

const datasourceRegex = /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"([^"]+)"[\s\S]*?\}/;
const match = schemaContent.match(datasourceRegex);

if (match && match[1] !== targetProvider) {
  console.log(`Adapting Prisma datasource provider from "${match[1]}" to "${targetProvider}"...`);
  schemaContent = schemaContent.replace(
    /(datasource\s+db\s*\{[\s\S]*?provider\s*=\s*")[^"]+(")/,
    `$1${targetProvider}$2`
  );
  fs.writeFileSync(schemaPath, schemaContent, "utf-8");
  execSync("npx prisma generate", { stdio: "inherit" });
}

console.log(`Pushing schema to ${targetProvider} database...`);
try {
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
} catch (err) {
  console.error("Prisma db push failed, trying with generate:", err.message);
  execSync("npx prisma db push", { stdio: "inherit" });
}
