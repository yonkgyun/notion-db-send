import { getDashboard } from "../lib/dashboard.js";

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    return response.end(JSON.stringify({ message: "GET request only." }));
  }
  try {
    const dashboard = await getDashboard();
    response.statusCode = 200;
    response.end(JSON.stringify(dashboard));
  } catch {
    response.statusCode = 500;
    response.end(JSON.stringify({ message: "기록 수를 불러오지 못했습니다." }));
  }
}
