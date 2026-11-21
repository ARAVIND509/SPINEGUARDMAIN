import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_ROOT = process.env.STORAGE_DIR 
  ? path.resolve(process.env.STORAGE_DIR)
  : (process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.resolve(process.cwd(), "uploads"));
const SCANS_DIR = path.resolve(UPLOADS_ROOT, "scans");

// Ensure upload directory exists
if (!fs.existsSync(SCANS_DIR)) {
  fs.mkdirSync(SCANS_DIR, { recursive: true });
}

export function getScansDirectory(): string {
  if (!fs.existsSync(SCANS_DIR)) {
    fs.mkdirSync(SCANS_DIR, { recursive: true });
  }
  return SCANS_DIR;
}

export function sanitizeFileName(fileName: string): string {
  const base = path.basename(fileName);
  return base.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
}

export async function saveScanFile(
  buffer: Buffer,
  originalName: string = "scan.png",
  mimeType: string = "image/png"
): Promise<{ fileName: string; fileUrl: string; size: number }> {
  const dir = getScansDirectory();
  
  let ext = path.extname(originalName).toLowerCase();
  if (!ext || ext === ".dcm") {
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = ".jpg";
    else if (mimeType.includes("webp")) ext = ".webp";
    else ext = ".png";
  }

  const uuid = crypto.randomUUID();
  const safeBase = sanitizeFileName(path.basename(originalName, path.extname(originalName))).slice(0, 30);
  const fileName = `${Date.now()}-${safeBase}-${uuid}${ext}`;
  const filePath = path.join(dir, fileName);

  await fs.promises.writeFile(filePath, buffer);

  return {
    fileName,
    fileUrl: `/api/scans/file/${fileName}`,
    size: buffer.length
  };
}

export async function getScanBuffer(imageUrl: string): Promise<Buffer> {
  if (!imageUrl) {
    throw new Error("No image URL provided");
  }

  // Case 1: Stored as file endpoint (/api/scans/file/<fileName>)
  if (imageUrl.startsWith("/api/scans/file/")) {
    const rawName = imageUrl.replace("/api/scans/file/", "").split("?")[0];
    const safeName = sanitizeFileName(path.basename(rawName));
    const filePath = path.join(getScansDirectory(), safeName);

    if (!filePath.startsWith(getScansDirectory())) {
      throw new Error("Invalid scan file path: Path traversal detected");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Scan file not found on disk: ${safeName}`);
    }

    return await fs.promises.readFile(filePath);
  }

  // Case 2: Stored as local relative or absolute path
  if (imageUrl.includes("uploads/scans") || imageUrl.includes("uploads\\scans")) {
    const safeName = sanitizeFileName(path.basename(imageUrl));
    const filePath = path.join(getScansDirectory(), safeName);
    if (fs.existsSync(filePath)) {
      return await fs.promises.readFile(filePath);
    }
  }

  // Case 3: Backwards compatibility with data URL / Base64 string
  let base64Data = imageUrl;
  if (imageUrl.includes(",")) {
    base64Data = imageUrl.split(",")[1];
  }
  return Buffer.from(base64Data, "base64");
}

export function resolveScanFilePath(fileName: string): string | null {
  const safeName = sanitizeFileName(path.basename(fileName));
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(safeName)) {
    return null;
  }
  const filePath = path.join(getScansDirectory(), safeName);
  if (!filePath.startsWith(getScansDirectory())) {
    return null;
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return filePath;
}
