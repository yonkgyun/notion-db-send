import { DATABASES } from "../shared/databases.js";
import { defaultMetric, normalizeMetric } from "../shared/dashboard-metrics.js";

export const SETTINGS_KEY = "quick-notion-dashboard-settings-v1";
export const CARD_SLOTS = [
  { id: "task", position: "상단 왼쪽", label: "오늘 기록한 할일" },
  { id: "note", position: "상단 오른쪽", label: "오늘 기록한 노트" },
  { id: "shortcut1", position: "하단 왼쪽", label: "준비 중" },
  { id: "shortcut2", position: "하단 오른쪽", label: "준비 중" }
];

export function normalizeLink(value) {
  const text = value.trim();
  if (!text) return "";
  if (/[\u0000-\u001f\u007f]/.test(text)) throw new Error("링크를 확인해주세요.");
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("http 또는 https 웹페이지 링크를 입력해주세요.");
  }
  return url.href;
}

export function parseSettings(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (![1, 2].includes(parsed?.version) || !parsed.cards || typeof parsed.cards !== "object") return {};
    const cards = {};
    for (const { id } of CARD_SLOTS) {
      const saved = parsed.cards[id];
      if (!saved || typeof saved !== "object") continue;
      const card = {};
      if (typeof saved.label === "string" && saved.label.trim()) card.label = saved.label.trim().slice(0, 40);
      if (typeof saved.url === "string") {
        try { card.url = normalizeLink(saved.url); } catch { /* Ignore an invalid stored link. */ }
      }
      if (saved.metric !== undefined) {
        try { card.metric = normalizeMetric(saved.metric, id); }
        catch { card.metric = { ...defaultMetric(id), mode: "none" }; }
      }
      if (Object.keys(card).length) cards[id] = card;
    }
    return cards;
  } catch { return {}; }
}

export function readSettings(storage) {
  try { return parseSettings(storage.getItem(SETTINGS_KEY)); } catch { return {}; }
}

export function resolveCards(settings, data) {
  return Object.fromEntries(CARD_SLOTS.map(({ id, label }) => [id, {
    label,
    url: data?.[id]?.url || DATABASES[id]?.url || "",
    metric: defaultMetric(id),
    ...settings[id]
  }]));
}

export function saveSettings(storage, draft, defaults) {
  const settings = {};
  for (const { id, position } of CARD_SLOTS) {
    const label = draft[id].label.trim();
    if (!label || label.length > 40) throw new Error(`${position}: 이름을 1~40자로 입력해주세요.`);
    let url;
    try { url = normalizeLink(draft[id].url); }
    catch { throw new Error(`${position}: 올바른 http 또는 https 링크를 입력해주세요.`); }
    const card = {};
    if (label !== defaults[id].label) card.label = label;
    if (url !== defaults[id].url) card.url = url;
    let metric;
    try { metric = normalizeMetric(draft[id].metric, id); }
    catch (error) { throw new Error(`${position}: ${error.message}`); }
    if (JSON.stringify(metric) !== JSON.stringify(defaults[id].metric)) card.metric = metric;
    if (Object.keys(card).length) settings[id] = card;
  }
  try {
    if (Object.keys(settings).length) storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 2, cards: settings }));
    else storage.removeItem(SETTINGS_KEY);
  } catch { throw new Error("설정을 저장하지 못했습니다. 브라우저의 사이트 저장 공간을 확인해주세요."); }
  return settings;
}
