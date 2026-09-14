import { getDatabaseUrl } from "../shared/databases.js";
import { CARD_IDS, extractDatabaseId, normalizeMetric } from "../shared/dashboard-metrics.js";
import { setTimeout as delay } from "node:timers/promises";

const DAY_MS = 24 * 60 * 60 * 1000;
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getKoreaDayRange(now = new Date()) {
  const date = new Date(now.getTime() + KOREA_OFFSET_MS).toISOString().slice(0, 10);
  const start = new Date(`${date}T00:00:00+09:00`);
  return { date, start: start.toISOString(), end: new Date(start.getTime() + DAY_MS).toISOString() };
}

function queryError(status) {
  if (status === 401) return new Error("Notion API 키를 확인해주세요.");
  if (status === 403) return new Error("Notion 연결의 콘텐츠 읽기 권한을 확인해주세요.");
  if (status === 404) return new Error("데이터베이스 ID와 Notion 연결 권한을 확인해주세요.");
  if (status === 400) return new Error("데이터베이스와 집계 속성 설정을 확인해주세요.");
  if (status === 429) return new Error("조회가 많습니다. 잠시 후 다시 시도해주세요.");
  return new Error("기록 수를 불러오지 못했습니다. 다시 시도해주세요.");
}

export function buildMetricQuery(metric, range, properties = {}) {
  if (metric.mode === "all") return {};
  if (metric.mode === "created_today") return { filter: { and: [
    { timestamp: "created_time", created_time: { on_or_after: range.start } },
    { timestamp: "created_time", created_time: { before: range.end } }
  ] } };
  const property = properties[metric.property];
  if (!property) throw new Error(`'${metric.property}' 속성을 찾을 수 없습니다. 속성 이름을 확인해주세요.`);
  if (["unchecked", "checked"].includes(metric.mode)) {
    if (property.type !== "checkbox") throw new Error(`'${metric.property}'은 체크박스 속성이어야 합니다.`);
    return { filter: { property: metric.property, checkbox: { equals: metric.mode === "checked" } } };
  }
  if (metric.mode === "date_today") {
    if (property.type !== "date") throw new Error(`'${metric.property}'은 날짜 속성이어야 합니다.`);
    return {
      // Include both date-only values and timestamps, then compare their Korean start date.
      filter: { or: [
        { property: metric.property, date: { equals: range.date } },
        { and: [
          { property: metric.property, date: { on_or_after: range.start } },
          { property: metric.property, date: { before: range.end } }
        ] }
      ] },
      matchesPage(page) {
        const field = page.properties?.[metric.property] || Object.values(page.properties || {}).find((item) => item.id === property.id);
        const start = field?.date?.start;
        if (!start) return false;
        return (start.includes("T") ? getKoreaDayRange(new Date(start)).date : start) === range.date;
      }
    };
  }
  if (metric.mode === "equals") {
    if (!["select", "multi_select", "status"].includes(property.type)) throw new Error(`'${metric.property}'은 선택, 다중 선택 또는 상태 속성이어야 합니다.`);
    if (!property[property.type]?.options?.some((option) => option.name === metric.value)) {
      throw new Error(`'${metric.property}' 속성에서 '${metric.value}' 값을 찾을 수 없습니다.`);
    }
    return { filter: { property: metric.property, [property.type]: { [property.type === "multi_select" ? "contains" : "equals"]: metric.value } } };
  }
  throw new Error("집계 기준을 확인해주세요.");
}

export async function countCreatedPages({ apiKey, databaseId, range, fetchImpl = fetch, signal,
  filter = buildMetricQuery({ mode: "created_today" }, range).filter, matchesPage = () => true }) {
  let cursor;
  let count = 0;
  const seenCursors = new Set();
  do {
    const response = await fetchImpl(`https://api.notion.com/v1/databases/${encodeURIComponent(databaseId)}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      signal,
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
        ...(filter ? { filter } : {})
      })
    });
    if (!response.ok) throw queryError(response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.results) || typeof payload.has_more !== "boolean") throw queryError(502);
    count += payload.results.filter((page) => page.object === "page" && !page.archived && !page.in_trash && matchesPage(page)).length;
    if (!payload.has_more) return count;
    cursor = payload.next_cursor;
    if (!cursor || seenCursors.has(cursor)) throw queryError(502);
    seenCursors.add(cursor);
  } while (cursor);
}

export async function getDashboard({ env = process.env, now = new Date(), fetchImpl = fetch, metrics = {}, requestInterval = 350 } = {}) {
  const range = getKoreaDayRange(now);
  const signal = AbortSignal.timeout(25000);
  const schemas = new Map();
  const counts = new Map();
  let queue = Promise.resolve();
  let nextRequestAt = 0;
  async function request(url, options) {
    const turn = queue.then(async () => {
      const wait = nextRequestAt - Date.now();
      if (wait > 0) await delay(wait, undefined, { signal });
      nextRequestAt = Date.now() + requestInterval;
    });
    queue = turn.catch(() => {});
    await turn;
    return fetchImpl(url, options);
  }
  function schema(databaseId) {
    if (!schemas.has(databaseId)) schemas.set(databaseId, (async () => {
      const response = await request(`https://api.notion.com/v1/databases/${databaseId}`, {
        headers: { Authorization: `Bearer ${env.NOTION_API_KEY}`, "Notion-Version": "2022-06-28" }, signal
      });
      if (!response.ok) throw queryError(response.status);
      const payload = await response.json();
      if (!payload.properties) throw queryError(502);
      return payload.properties;
    })());
    return schemas.get(databaseId);
  }
  const entries = await Promise.all(CARD_IDS.map(async (id) => {
    const defaultId = id === "task" ? env.NOTION_DATABASE_ID : env.NOTION_NOTES_DATABASE_ID;
    const card = { url: id === "task" || id === "note" ? getDatabaseUrl(id, defaultId) : "", count: null, error: null };
    try {
      const metric = normalizeMetric(metrics[id], id);
      if (metric.mode === "none") return [id, card];
      const configuredId = metric.source === "custom" ? metric.database :
        metric.source === "task" ? env.NOTION_DATABASE_ID : env.NOTION_NOTES_DATABASE_ID;
      if (!env.NOTION_API_KEY || !configuredId) throw new Error("Notion 환경변수를 확인해주세요.");
      const databaseId = extractDatabaseId(configuredId);
      const key = JSON.stringify({ databaseId, mode: metric.mode, property: metric.property, value: metric.value });
      if (!counts.has(key)) counts.set(key, (async () => {
        const properties = ["created_today", "all"].includes(metric.mode) ? {} : await schema(databaseId);
        const query = buildMetricQuery(metric, range, properties);
        return countCreatedPages({ apiKey: env.NOTION_API_KEY, databaseId, range, fetchImpl: request, signal,
          filter: query.filter || null, matchesPage: query.matchesPage });
      })());
      card.count = await counts.get(key);
    } catch (error) {
      card.error = signal.aborted ? "조회 시간이 초과됐습니다. 다시 시도해주세요." :
        error instanceof TypeError ? "연결을 확인하고 다시 시도해주세요." : error.message;
    }
    return [id, card];
  }));
  return { date: range.date, timeZone: "Asia/Seoul", ...Object.fromEntries(entries) };
}
