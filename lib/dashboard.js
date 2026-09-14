import { getDatabaseUrl } from "../shared/databases.js";

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
  if (status === 429) return new Error("조회가 많습니다. 잠시 후 다시 시도해주세요.");
  return new Error("기록 수를 불러오지 못했습니다. 다시 시도해주세요.");
}

export async function countCreatedPages({ apiKey, databaseId, range, fetchImpl = fetch, signal }) {
  let cursor;
  let count = 0;
  const seenCursors = new Set();
  do {
    // Query the page timestamp, independent of editable date fields and property names.
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
        filter: { and: [
          { timestamp: "created_time", created_time: { on_or_after: range.start } },
          { timestamp: "created_time", created_time: { before: range.end } }
        ] }
      })
    });
    if (!response.ok) throw queryError(response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.results) || typeof payload.has_more !== "boolean") throw queryError(502);
    count += payload.results.filter((page) => page.object === "page" && !page.archived && !page.in_trash).length;
    if (!payload.has_more) return count;
    cursor = payload.next_cursor;
    if (!cursor || seenCursors.has(cursor)) throw queryError(502);
    seenCursors.add(cursor);
  } while (cursor);
}

export async function getDashboard({ env = process.env, now = new Date(), fetchImpl = fetch } = {}) {
  const range = getKoreaDayRange(now);
  const signal = AbortSignal.timeout(15000);
  const entries = await Promise.all(["task", "note"].map(async (kind) => {
    const databaseId = (kind === "task" ? env.NOTION_DATABASE_ID : env.NOTION_NOTES_DATABASE_ID)?.trim();
    const card = { url: getDatabaseUrl(kind, databaseId), count: null, error: null };
    if (!env.NOTION_API_KEY || !databaseId) {
      return [kind, { ...card, error: "Notion 환경변수를 확인해주세요." }];
    }
    try {
      card.count = await countCreatedPages({ apiKey: env.NOTION_API_KEY, databaseId, range, fetchImpl, signal });
    } catch (error) {
      card.error = signal.aborted ? "조회 시간이 초과됐습니다. 다시 시도해주세요." :
        error instanceof TypeError ? "연결을 확인하고 다시 시도해주세요." : error.message;
    }
    return [kind, card];
  }));
  return { date: range.date, timeZone: "Asia/Seoul", ...Object.fromEntries(entries) };
}
