import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function notionApiDevPlugin(mode) {
  return {
    name: "notion-api-dev",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      process.env.NOTION_API_KEY = process.env.NOTION_API_KEY || env.NOTION_API_KEY;
      process.env.NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || env.NOTION_DATABASE_ID;

      mountApiRoute(server, "/api/create-page", "./api/create-page.js");
      mountApiRoute(server, "/api/database-options", "./api/database-options.js");
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
        const handler = await import(`${handlerPath}?t=${Date.now()}`);
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
