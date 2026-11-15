const http = require("http");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");

const rootDir = __dirname;
const port = process.env.PORT || 8080;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safeJoin(base, reqPath) {
  const decoded = decodeURIComponent((reqPath || "/").split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(base, cleaned);
  if (!full.startsWith(base)) return null;
  return full;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  pipeline(fs.createReadStream(filePath), res, () => {});
}

const server = http.createServer((req, res) => {
  let target = safeJoin(rootDir, req.url === "/" ? "/index.html" : req.url);
  if (!target) {
    res.writeHead(400).end("Bad request");
    return;
  }
  fs.stat(target, (err, st) => {
    if (!err && st.isDirectory()) {
      target = path.join(target, "index.html");
    }
    fs.stat(target, (err2, st2) => {
      if (!err2 && st2.isFile()) {
        sendFile(res, target);
        return;
      }
      const appIndex = path.join(rootDir, "app", "index.html");
      if ((req.url || "").startsWith("/app") && fs.existsSync(appIndex)) {
        sendFile(res, appIndex);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    });
  });
});

server.listen(port, () => {
  console.log(`Plates static server on ${port}`);
});
