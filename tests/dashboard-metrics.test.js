import test from "node:test";
import assert from "node:assert/strict";
import { buildMetricQuery, getDashboard, getKoreaDayRange } from "../lib/dashboard.js";
import { defaultMetric, extractDatabaseId, normalizeMetric } from "../shared/dashboard-metrics.js";
import { DATABASES } from "../shared/databases.js";
import handler from "../api/dashboard.js";

const now = new Date("2026-09-14T15:00:00Z");
const range = getKoreaDayRange(now);
const env = { NOTION_API_KEY: "test-only", NOTION_DATABASE_ID: DATABASES.task.id, NOTION_NOTES_DATABASE_ID: DATABASES.note.id };
const metric = (mode, extra = {}) => ({ ...defaultMetric("task"), mode, ...extra });
const none = metric("none");
const page = { object: "page" };
const ok = (payload) => ({ ok: true, json: async () => payload });
const list = (count) => ok({ results: Array(count).fill(page), has_more: false });

test("database parser uses the path ID rather than view ID and rejects external hosts", () => {
  assert.equal(extractDatabaseId(DATABASES.task.url), DATABASES.task.id);
  assert.equal(extractDatabaseId("2dc9b100-24d9-8116-857d-c4a211064200"), DATABASES.task.id);
  assert.equal(extractDatabaseId(`https://www.notion.so/title-${DATABASES.note.id}?v=${DATABASES.task.id}`), DATABASES.note.id);
  for (const value of [`https://example.com/${DATABASES.task.id}`, `https://notion.so.evil.test/${DATABASES.task.id}`,
    `https://app.notion.com/?v=${DATABASES.task.id}`, "https://127.0.0.1/", "javascript:alert(1)"]) assert.throws(() => extractDatabaseId(value));
});

test("invalid custom databases, modes and missing conditional fields fail validation", () => {
  for (const value of [metric("bad"), metric("all", { source: "other" }), metric("all", { source: "custom", database: "not a database" }),
    metric("unchecked"), metric("equals", { property: "Category" })]) assert.throws(() => normalizeMetric(value, "task"));
  assert.deepEqual(normalizeMetric(undefined, "shortcut1"), defaultMetric("shortcut1"));
});

test("all, checkbox, select, multi-select and status filters use correct types", () => {
  assert.deepEqual(buildMetricQuery(metric("all"), range), {});
  for (const mode of ["checked", "unchecked"]) {
    assert.deepEqual(buildMetricQuery(metric(mode, { property: "Done" }), range, { Done: { type: "checkbox" } }).filter,
      { property: "Done", checkbox: { equals: mode === "checked" } });
  }
  for (const type of ["select", "multi_select", "status"]) {
    const properties = { Category: { type, [type]: { options: [{ name: "Next" }] } } };
    assert.deepEqual(buildMetricQuery(metric("equals", { property: "Category", value: "Next" }), range, properties).filter,
      { property: "Category", [type]: { [type === "multi_select" ? "contains" : "equals"]: "Next" } });
  }
});

test("wrong property name, type and option are errors, not zero", () => {
  assert.throws(() => buildMetricQuery(metric("unchecked", { property: "Done" }), range, {}));
  assert.throws(() => buildMetricQuery(metric("unchecked", { property: "Done" }), range, { Done: { type: "status" } }));
  assert.throws(() => buildMetricQuery(metric("equals", { property: "Category", value: "Missing" }), range,
    { Category: { type: "select", select: { options: [] } } }));
});

test("today date matches Korea start date for date-only, timed and ranged values", () => {
  const query = buildMetricQuery(metric("date_today", { property: "Date" }), range, { Date: { id: "date-id", type: "date" } });
  assert.equal(query.filter.or[0].date.equals, "2026-09-15");
  for (const [start, expected] of [["2026-09-15", true], ["2026-09-14", false], ["2026-09-14T15:00:00Z", true],
    ["2026-09-15T14:59:59.999Z", true], ["2026-09-15T15:00:00Z", false], [null, false]]) {
    assert.equal(query.matchesPage({ properties: { Date: { date: start ? { start, end: "2026-09-16" } : null } } }), expected);
  }
});

test("four cards can query independent sources and reuse identical requests", async () => {
  const queries = [];
  const result = await getDashboard({ env, now, requestInterval: 0, metrics: {
    task: metric("all", { source: "note" }), note: none,
    shortcut1: metric("all", { source: "custom", database: DATABASES.task.url }),
    shortcut2: metric("all", { source: "custom", database: DATABASES.task.id })
  }, fetchImpl: async (url, options) => {
    queries.push({ url, body: JSON.parse(options.body) });
    return list(url.includes(DATABASES.note.id) ? 7 : 3);
  } });
  assert.equal(result.task.count, 7);
  assert.equal(result.note.count, null);
  assert.equal(result.shortcut1.count, 3);
  assert.equal(result.shortcut2.count, 3);
  assert.equal(queries.length, 2);
  assert.ok(queries.every(({ body }) => body.filter === undefined));
});

test("schema is shared between conditions on the same database", async () => {
  let schemaCalls = 0;
  const result = await getDashboard({ env, now, requestInterval: 0, metrics: {
    task: metric("unchecked", { property: "Done" }), note: metric("checked", { property: "Done" }), shortcut1: none, shortcut2: none
  }, fetchImpl: async (url, options) => {
    if (!url.endsWith("/query")) { schemaCalls++; return ok({ properties: { Done: { type: "checkbox" } } }); }
    return list(JSON.parse(options.body).filter.checkbox.equals ? 2 : 5);
  } });
  assert.equal(schemaCalls, 1);
  assert.equal(result.task.count, 5);
  assert.equal(result.note.count, 2);
});

test("one bad condition does not erase another card's valid number", async () => {
  const result = await getDashboard({ env, now, requestInterval: 0, metrics: {
    task: metric("unchecked", { property: "Missing" }), note: metric("all"), shortcut1: none, shortcut2: none
  }, fetchImpl: async (url) => url.endsWith("/query") ? list(2) : ok({ properties: {} }) });
  assert.equal(result.task.count, null);
  assert.ok(result.task.error);
  assert.equal(result.note.count, 2);
});

test("all hidden counts make no upstream calls even without credentials", async () => {
  const result = await getDashboard({ env: {}, metrics: { task: none, note: none, shortcut1: none, shortcut2: none },
    fetchImpl: async () => assert.fail("Must not query") });
  for (const id of ["task", "note", "shortcut1", "shortcut2"]) {
    assert.equal(result[id].count, null);
    assert.equal(result[id].error, null);
  }
});

test("malformed metric request is rejected before Notion access", async () => {
  for (const raw of ["not-json", "[]", '{"unknown":{}}', "x".repeat(16385)]) {
    const res = { setHeader() {}, end() {} };
    await handler({ method: "GET", url: `/?cards=${encodeURIComponent(raw)}` }, res);
    assert.equal(res.statusCode, 400);
  }
});
