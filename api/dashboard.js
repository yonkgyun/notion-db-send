import { getDashboard } from "../lib/dashboard.js";
import { CARD_IDS } from "../shared/dashboard-metrics.js";

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    return response.end(JSON.stringify({ message: "GET request only." }));
  }
  let metrics = {};
  try {
    const raw = new URL(request.url || "/", "http://localhost").searchParams.get("cards");
    if (raw !== null) {
      if (raw.length > 16384) throw new Error();
      metrics = JSON.parse(raw);
      if (!metrics || typeof metrics !== "object" || Array.isArray(metrics) || Object.keys(metrics).some((id) => !CARD_IDS.includes(id))) throw new Error();
    }
  } catch {
    response.statusCode = 400;
    return response.end(JSON.stringify({ message: "대시보드 집계 설정을 확인해주세요." }));
  }
  try {
    const dashboard = await getDashboard({ metrics });
    response.statusCode = 200;
    response.end(JSON.stringify(dashboard));
  } catch {
    response.statusCode = 500;
    response.end(JSON.stringify({ message: "기록 수를 불러오지 못했습니다." }));
  }
}
