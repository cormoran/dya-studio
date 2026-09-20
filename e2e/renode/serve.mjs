// Minimal static file server for the built dya-studio `dist/` (SPA: unknown
// paths fall back to index.html). No dependencies.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.DIST_DIR || "dist");
const PORT = Number(process.env.SERVE_PORT || 4173);
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
};

http
  .createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT)) return res.writeHead(403).end();
      if (rel === "/" || !existsSync(file))
        file = path.join(ROOT, "index.html");
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": MIME[path.extname(file)] || "application/octet-stream",
      });
      res.end(body);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  })
  .listen(PORT, () =>
    console.error(`serve: dist on http://127.0.0.1:${PORT} (root ${ROOT})`),
  );
