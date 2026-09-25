import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import generateHandler from "./api/generate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Serverless API routing
  if (pathname === "/api/generate" || pathname === "/api/generate.js") {
    // Adapter for Vercel req, res interface
    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(data));
      return res;
    };

    return generateHandler(req, res);
  }

  // Static file routing
  let relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, relativePath);

  // Security check against directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      const indexContent = await fs.readFile(indexPath);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(indexContent);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileContent = await fs.readFile(filePath);

    res.setHeader("Content-Type", contentType);
    res.end(fileContent);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("404 Not Found");
    } else {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("500 Internal Server Error: " + err.message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`German B1 Prep Web App running at http://localhost:${PORT}`);
});
