import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Eta } from "eta";
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import Busboy from "busboy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const eta = new Eta({ views: path.join(__dirname, "views") });

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.TESTMORE_REGION,
  endpoint: process.env.TESTMORE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.TESTMORE_ACCESS_KEY_ID,
    secretAccessKey: process.env.TESTMORE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.TESTMORE_BUCKET;

// Helper: List files from S3
async function listFiles(prefix = "") {

  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    Delimiter: "/",
  });

  const response = await s3Client.send(command);

  const folders = (response.CommonPrefixes || []).map((p) => ({
    name: p.Prefix.replace(prefix, "").replace("/", ""),
    key: p.Prefix,
    type: "folder",
  }));

  const files = (response.Contents || [])
    .filter((obj) => obj.Key !== prefix)
    .map((obj) => ({
      name: obj.Key.replace(prefix, ""),
      key: obj.Key,
      size: formatBytes(obj.Size),
      lastModified: obj.LastModified?.toLocaleDateString() || "",
      type: "file",
    }));

  return [...folders, ...files];
}

// Helper: Format bytes
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper: Get file from S3
async function getFile(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return s3Client.send(command);
}

// Helper: Upload file to S3
async function uploadFile(key, buffer, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3Client.send(command);
}

// Helper: Delete file from S3
async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}

// Helper: Parse URL-encoded form data
function parseFormData(body) {
  const params = new URLSearchParams(body);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

// Helper: Parse multipart form data
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let fileData = null;

    const busboy = Busboy({ headers: req.headers });

    busboy.on("file", (fieldname, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];

      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => {
        fileData = {
          name: filename,
          type: mimeType,
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on("finish", () => {
      resolve({ fields, file: fileData });
    });

    busboy.on("error", reject);

    req.pipe(busboy);
  });
}

// Helper: Read request body
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

// Helper: Send response
function send(res, statusCode, body, contentType = "text/html") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(body);
}

// Helper: Redirect
function redirect(res, location, statusCode = 303) {
  res.writeHead(statusCode, { Location: location });
  res.end();
}

// Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // Serve static CSS
    if (pathname === "/style.css") {
      const cssPath = path.join(__dirname, "public", "style.css");
      const css = fs.readFileSync(cssPath, "utf-8");
      return send(res, 200, css, "text/css");
    }

    // Main page - list files
    if (pathname === "/" && req.method === "GET") {
      const prefix = url.searchParams.get("path") || "";
      const errorParam = url.searchParams.get("error");
      try {
        const files = await listFiles(prefix);
        const parentPath = prefix
          ? prefix.split("/").slice(0, -2).join("/") + (prefix.split("/").length > 2 ? "/" : "")
          : null;
        const html = eta.render("index", { files, currentPath: prefix, parentPath, error: errorParam });
        return send(res, 200, html);
      } catch (error) {
        console.error("Error listing files:", error);
        const html = eta.render("index", { files: [], currentPath: prefix, parentPath: null, error: error.message });
        return send(res, 200, html);
      }
    }

    // Upload file
    if (pathname === "/upload" && req.method === "POST") {
      try {
        const { fields, file } = await parseMultipart(req);
        const currentPath = fields.path || "";

        if (!file) {
          return redirect(res, `/?path=${encodeURIComponent(currentPath)}&error=No file provided`);
        }

        const key = currentPath + file.name;
        await uploadFile(key, file.buffer, file.type);

        return redirect(res, `/?path=${encodeURIComponent(currentPath)}`);
      } catch (error) {
        console.error("Upload error:", error);
        return redirect(res, `/?error=${encodeURIComponent(error.message)}`);
      }
    }

    // Download/View file (proxied through server)
    if (pathname === "/download" && req.method === "GET") {
      const key = url.searchParams.get("key");
      const download = url.searchParams.get("dl") === "1";
      if (!key) {
        return send(res, 400, "Key required");
      }
      try {
        const s3Response = await getFile(key);
        const filename = key.split("/").pop();
        const contentType = s3Response.ContentType || "application/octet-stream";
        
        const headers = {
          "Content-Type": contentType,
          "Content-Length": s3Response.ContentLength,
        };
        
        if (download) {
          headers["Content-Disposition"] = `attachment; filename="${filename}"`;
        } else {
          headers["Content-Disposition"] = `inline; filename="${filename}"`;
        }
        
        res.writeHead(200, headers);
        s3Response.Body.pipe(res);
        return;
      } catch (error) {
        console.error("Download error:", error);
        return send(res, 500, "Download failed: " + error.message);
      }
    }

    // Delete file
    if (pathname === "/delete" && req.method === "POST") {
      try {
        const body = await readBody(req);
        const { key, path: currentPath } = parseFormData(body);

        if (!key) {
          return redirect(res, `/?path=${encodeURIComponent(currentPath || "")}&error=Key required`);
        }

        await deleteFile(key);
        return redirect(res, `/?path=${encodeURIComponent(currentPath || "")}`);
      } catch (error) {
        console.error("Delete error:", error);
        return redirect(res, `/?error=${encodeURIComponent(error.message)}`);
      }
    }

    // Crash endpoint - intentionally crash the server
    if (pathname === "/crash" && req.method === "POST") {
      console.log("Crash requested - crashing server...");
      process.exit(1);
    }

    // Create folder
    if (pathname === "/create-folder" && req.method === "POST") {
      try {
        const body = await readBody(req);
        const { folderName, path: currentPath } = parseFormData(body);

        if (!folderName) {
          return redirect(res, `/?path=${encodeURIComponent(currentPath || "")}&error=Folder name required`);
        }

        const key = (currentPath || "") + folderName + "/";
        await uploadFile(key, Buffer.from(""), "application/x-directory");

        return redirect(res, `/?path=${encodeURIComponent(currentPath || "")}`);
      } catch (error) {
        console.error("Create folder error:", error);
        return redirect(res, `/?error=${encodeURIComponent(error.message)}`);
      }
    }

    return send(res, 404, "Not Found");
  } catch (error) {
    console.error("Server error:", error);
    return send(res, 500, "Internal Server Error");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`File Manager running at http://localhost:${PORT}`);
});

// Random logging
const randomMessages = [
  "Checking system health...",
  "Memory usage looks good",
  "All S3 connections stable",
  "Heartbeat ping",
  "Cache cleanup scheduled",
  "Background task completed",
  "Processing queue is empty",
  "No pending uploads detected",
  "File index synchronized",
  "Garbage collection triggered",
  "Session cleanup done",
  "Monitoring active connections",
  "Bucket stats refreshed",
  "Temp files cleared",
  "Idle mode active",
  "Waiting for requests...",
  "Service running smoothly",
  "Network latency: OK",
  "Storage capacity available",
  "Ready for operations",
];

function scheduleRandomLog() {
  const delay = Math.floor(Math.random() * 800) + 100; // 100-900 ms
  setTimeout(() => {
    const msg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
    console.log(`[${new Date().toISOString()}] ${msg}`);
    scheduleRandomLog();
  }, delay);
}

scheduleRandomLog();
