import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { pathToFileURL } from "node:url";

function notionApiDevPlugin(mode) {
  return {
    name: "notion-api-dev",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      for (const [key, value] of Object.entries(env)) {
        if (key.startsWith("NOTION_") && !process.env[key] && value) process.env[key] = value;
      }

      mountApiRoute(server, "/api/create-page", "./api/create-page.js");
      mountApiRoute(server, "/api/database-options", "./api/database-options.js");
      mountApiRoute(server, "/api/dashboard", "./api/dashboard.js");
    }
  };
}

function mountApiRoute(server, route, handlerPath) {
  server.middlewares.use(route, async (request, response) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
    });

    request.on("end", async () => {
      try {
        request.body = rawBody ? JSON.parse(rawBody) : {};
        const handlerUrl = pathToFileURL(path.resolve(process.cwd(), handlerPath)).href;
        const handler = await import(`${handlerUrl}?t=${Date.now()}`);
        await handler.default(request, response);
      } catch (error) {
        response.statusCode = 500;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ message: error.message || "저장 중 오류가 발생했습니다." }));
      }
    });
  });
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), notionApiDevPlugin(mode)],
  server: {
    port: 5173
  }
}));
