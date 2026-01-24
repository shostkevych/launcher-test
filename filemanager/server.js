import { Eta } from "eta";
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";

const eta = new Eta({ views: path.join(import.meta.dir, "views") });

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
  
  const folders = (response.CommonPrefixes || []).map(p => ({
    name: p.Prefix.replace(prefix, "").replace("/", ""),
    key: p.Prefix,
    type: "folder",
  }));

  const files = (response.Contents || [])
    .filter(obj => obj.Key !== prefix)
    .map(obj => ({
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

// Helper: Get signed URL for download
async function getDownloadUrl(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
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

// Server
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Serve static CSS
    if (pathname === "/style.css") {
      return new Response(Bun.file(path.join(import.meta.dir, "public", "style.css")), {
        headers: { "Content-Type": "text/css" },
      });
    }

    // Main page - list files
    if (pathname === "/" && req.method === "GET") {
      const prefix = url.searchParams.get("path") || "";
      try {
        const files = await listFiles(prefix);
        const parentPath = prefix ? prefix.split("/").slice(0, -2).join("/") + (prefix.split("/").length > 2 ? "/" : "") : null;
        const html = eta.render("index", { files, currentPath: prefix, parentPath });
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      } catch (error) {
        console.error("Error listing files:", error);
        const html = eta.render("index", { files: [], currentPath: prefix, parentPath: null, error: error.message });
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }
    }

    // Upload file
    if (pathname === "/upload" && req.method === "POST") {
      try {
        const formData = await req.formData();
        const file = formData.get("file");
        const currentPath = formData.get("path") || "";

        if (!file || typeof file === "string") {
          return Response.redirect(`/?path=${encodeURIComponent(currentPath)}&error=No file provided`, 303);
        }

        const key = currentPath + file.name;
        const buffer = await file.arrayBuffer();
        await uploadFile(key, Buffer.from(buffer), file.type);

        return Response.redirect(`/?path=${encodeURIComponent(currentPath)}`, 303);
      } catch (error) {
        console.error("Upload error:", error);
        return Response.redirect(`/?error=${encodeURIComponent(error.message)}`, 303);
      }
    }

    // Download/View file
    if (pathname === "/download" && req.method === "GET") {
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response("Key required", { status: 400 });
      }
      try {
        const downloadUrl = await getDownloadUrl(key);
        return Response.redirect(downloadUrl, 302);
      } catch (error) {
        console.error("Download error:", error);
        return new Response("Download failed: " + error.message, { status: 500 });
      }
    }

    // Delete file
    if (pathname === "/delete" && req.method === "POST") {
      try {
        const formData = await req.formData();
        const key = formData.get("key");
        const currentPath = formData.get("path") || "";

        if (!key) {
          return Response.redirect(`/?path=${encodeURIComponent(currentPath)}&error=Key required`, 303);
        }

        await deleteFile(key);
        return Response.redirect(`/?path=${encodeURIComponent(currentPath)}`, 303);
      } catch (error) {
        console.error("Delete error:", error);
        return Response.redirect(`/?error=${encodeURIComponent(error.message)}`, 303);
      }
    }

    // Create folder
    if (pathname === "/create-folder" && req.method === "POST") {
      try {
        const formData = await req.formData();
        const folderName = formData.get("folderName");
        const currentPath = formData.get("path") || "";

        if (!folderName) {
          return Response.redirect(`/?path=${encodeURIComponent(currentPath)}&error=Folder name required`, 303);
        }

        // Create an empty object with trailing slash to represent folder
        const key = currentPath + folderName + "/";
        await uploadFile(key, Buffer.from(""), "application/x-directory");

        return Response.redirect(`/?path=${encodeURIComponent(currentPath)}`, 303);
      } catch (error) {
        console.error("Create folder error:", error);
        return Response.redirect(`/?error=${encodeURIComponent(error.message)}`, 303);
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`File Manager running at http://localhost:${server.port}`);
