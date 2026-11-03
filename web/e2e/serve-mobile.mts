import { request as proxyRequest } from "node:http";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../mobile/dist/", import.meta.url));
const types: Readonly<Record<string, string>> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
createServer(async (req, res) => {
  const requestUrl = req.url ?? "/";
  if (requestUrl.startsWith("/api/")) {
    const upstream = proxyRequest(
      `http://127.0.0.1:18080${requestUrl}`,
      {
        method: req.method ?? "GET",
        headers: { ...req.headers, origin: "http://127.0.0.1:3101" },
      },
      (result) => {
        res.writeHead(result.statusCode ?? 502, result.headers);
        result.pipe(res);
      },
    );
    upstream.on("error", () => res.writeHead(502).end());
    req.pipe(upstream);
    return;
  }
  const pathname = decodeURIComponent(
    new URL(requestUrl, "http://127.0.0.1").pathname,
  );
  const target = resolve(
    root,
    `.${pathname === "/" ? "/index.html" : pathname}`,
  );
  if (!target.startsWith(root.endsWith(sep) ? root : root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const content = await readFile(target);
    res
      .writeHead(200, {
        "Content-Type": types[extname(target)] ?? "application/octet-stream",
      })
      .end(content);
  } catch {
    res.writeHead(404).end();
  }
}).listen(3101, "127.0.0.1");
