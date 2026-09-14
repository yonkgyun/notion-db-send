export const CARD_IDS = ["task", "note", "shortcut1", "shortcut2"];
export const METRIC_MODES = [
  { value: "none", label: "숫자 표시 안 함" },
  { value: "created_today", label: "오늘 등록한 수" },
  { value: "all", label: "전체 기록 수" },
  { value: "date_today", label: "날짜가 오늘인 수" },
  { value: "unchecked", label: "미완료 수 (체크 안 됨)" },
  { value: "checked", label: "완료 수 (체크됨)" },
  { value: "equals", label: "특정 선택·상태 값의 수" }
];

export function defaultMetric(id) {
  return { mode: id === "task" || id === "note" ? "created_today" : "none",
    source: id === "note" ? "note" : "task", database: "", property: "", value: "" };
}

export function extractDatabaseId(value) {
  const text = String(value || "").trim();
  const uuid = /^[a-f\d]{32}$|^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
  if (uuid.test(text)) return text.replaceAll("-", "").toLowerCase();
  let url;
  try { url = new URL(text); } catch { throw new Error("Notion 데이터베이스 링크 또는 ID를 입력해주세요."); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password ||
      !["notion.so", "www.notion.so", "app.notion.com", "notion.com", "www.notion.com"].includes(host) && !host.endsWith(".notion.site")) {
    throw new Error("Notion 데이터베이스 링크 또는 ID를 입력해주세요.");
  }
  // The database ID is in the path. The v query parameter identifies only a view.
  const path = url.pathname.replace(/\/$/, "");
  const match = path.match(/([a-f\d]{32}|[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i);
  if (!match) throw new Error("데이터베이스 원본 링크 또는 ID를 확인해주세요.");
  return match[1].replaceAll("-", "").toLowerCase();
}

export function normalizeMetric(input, id) {
  if (input === undefined) return defaultMetric(id);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("집계 설정을 확인해주세요.");
  const metric = { ...defaultMetric(id), ...input };
  if (!METRIC_MODES.some(({ value }) => value === metric.mode) || !["task", "note", "custom"].includes(metric.source)) {
    throw new Error("집계 기준과 데이터베이스를 확인해주세요.");
  }
  for (const field of ["database", "property", "value"]) {
    if (typeof metric[field] !== "string") throw new Error("집계 설정을 확인해주세요.");
    metric[field] = metric[field].trim();
  }
  if (metric.database.length > 4096 || metric.property.length > 100 || metric.value.length > 200) throw new Error("집계 설정 값이 너무 깁니다.");
  if (metric.mode !== "none" && metric.source === "custom") extractDatabaseId(metric.database);
  if (["date_today", "unchecked", "checked", "equals"].includes(metric.mode) && !metric.property) {
    throw new Error("집계에 사용할 속성 이름을 입력해주세요.");
  }
  if (metric.mode === "equals" && !metric.value) throw new Error("집계할 선택·상태 값을 입력해주세요.");
  return Object.fromEntries(["mode", "source", "database", "property", "value"].map((key) => [key, metric[key]]));
}
