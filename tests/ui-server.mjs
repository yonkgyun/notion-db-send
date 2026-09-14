// Local UI fixture only. This server never contacts or writes to Notion.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATABASES } from "../shared/databases.js";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const counts = { task: 3, note: 2 };
const requests = [];
let state = "success";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const json = (payload, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(payload));
  };
  if (url.pathname === "/__fixture") {
    state = url.searchParams.get("state") || state;
    return json({ state, counts, requests });
  }
  if (url.pathname === "/api/dashboard") {
    if (state === "offline") return json({ message: "UI fixture failure" }, 503);
    return json({ date: "2026-09-15", timeZone: "Asia/Seoul",
      task: { count: counts.task, error: null, url: DATABASES.task.url },
      note: { count: state === "partial" ? null : counts.note,
        error: state === "partial" ? "Notion 연결 권한을 확인해주세요." : null, url: DATABASES.note.url }
    });
  }
  if (url.pathname === "/api/database-options") {
    const note = url.searchParams.get("mode") === "note";
    return json({ propertyName: note ? "분류" : "명료화", options: note ? ["메모", "자료"] : ["다음행동", "일정", "언젠가"] });
  }
  if (url.pathname === "/api/create-page" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    requests.push(payload);
    counts[payload.mode] += 1;
    return json({ success: true });
  }
  const file = path.resolve(root, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);
  if (!file.startsWith(root)) return json({ error: "Forbidden" }, 403);
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  } catch { json({ error: "Not found" }, 404); }
});
server.listen(Number(process.env.PORT || 5185), "127.0.0.1", () => console.log("UI fixture: http://127.0.0.1:5185 (mock counts and saves)"));
