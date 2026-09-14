import test from "node:test";
import assert from "node:assert/strict";
import { countCreatedPages, getDashboard, getKoreaDayRange } from "../lib/dashboard.js";
import { DATABASES, getDatabaseUrl } from "../shared/databases.js";
import handler from "../api/dashboard.js";

const env = {
  NOTION_API_KEY: "test-only-key",
  NOTION_DATABASE_ID: DATABASES.task.id,
  NOTION_NOTES_DATABASE_ID: DATABASES.note.id
};
const now = new Date("2026-09-14T15:00:00Z");
const range = getKoreaDayRange(now);
const page = { object: "page", archived: false, in_trash: false };
const response = (results = [], has_more = false, next_cursor = null) => ({
  ok: true, json: async () => ({ results, has_more, next_cursor })
});

test("Korea midnight changes the day, including month/year/leap boundaries", () => {
  assert.deepEqual(range, {
    date: "2026-09-15", start: "2026-09-14T15:00:00.000Z", end: "2026-09-15T15:00:00.000Z"
  });
  for (const [time, date] of [
    ["2026-09-14T14:59:59.999Z", "2026-09-14"],
    ["2026-12-31T15:00:00Z", "2027-01-01"],
    ["2028-02-28T15:00:00Z", "2028-02-29"],
    ["2028-02-29T15:00:00Z", "2028-03-01"]
  ]) {
    const actual = getKoreaDayRange(new Date(time));
    assert.equal(actual.date, date);
    assert.equal(Date.parse(actual.end) - Date.parse(actual.start), 86400000);
  }
});

test("paginates beyond 100 with inclusive start and exclusive end", async () => {
  const calls = [];
  const count = await countCreatedPages({ apiKey: env.NOTION_API_KEY, databaseId: env.NOTION_DATABASE_ID, range,
    fetchImpl: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return calls.length === 1 ? response(Array(100).fill(page), true, "cursor-1") : response([page, page]);
    }
  });
  assert.equal(count, 102);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["Notion-Version"], "2022-06-28");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-only-key");
  assert.deepEqual(calls[0].body, {
    page_size: 100,
    filter: { and: [
      { timestamp: "created_time", created_time: { on_or_after: range.start } },
      { timestamp: "created_time", created_time: { before: range.end } }
    ] }
  });
  assert.equal(calls[1].body.start_cursor, "cursor-1");
});

test("zero is valid, archived and trashed pages are excluded", async () => {
  for (const [results, expected] of [
    [[], 0], [[page, { ...page, archived: true }, { ...page, in_trash: true }, { object: "block" }], 1]
  ]) {
    assert.equal(await countCreatedPages({ apiKey: "test", databaseId: "test", range,
      fetchImpl: async () => response(results) }), expected);
  }
});

test("invalid pagination and malformed responses never return a partial count", async () => {
  for (const fixture of [response([page], true), response([page], true, "repeated"),
    { ok: true, json: async () => ({ results: [] }) }]) {
    await assert.rejects(countCreatedPages({ apiKey: "test", databaseId: "test", range,
      fetchImpl: async () => fixture }));
  }
});

test("Notion errors remain errors, including failure after a successful page", async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    let calls = 0;
    const result = await getDashboard({ env, now, fetchImpl: async (url) => {
      if (url.includes(DATABASES.note.id)) return response();
      calls += 1;
      return calls === 1 ? response([page], true, "next") : { ok: false, status };
    } });
    assert.equal(result.task.count, null);
    assert.ok(result.task.error);
    assert.equal(result.note.count, 0);
    assert.equal(result.note.error, null);
    assert.equal(JSON.stringify(result).includes(env.NOTION_API_KEY), false);
  }
});

test("missing note configuration does not query the task database twice", async () => {
  const urls = [];
  const result = await getDashboard({ env: { ...env, NOTION_NOTES_DATABASE_ID: "" }, now,
    fetchImpl: async (url) => { urls.push(url); return response([page]); }
  });
  assert.equal(urls.length, 1);
  assert.ok(urls[0].includes(DATABASES.task.id));
  assert.equal(result.task.count, 1);
  assert.equal(result.note.count, null);
  assert.ok(result.note.error);
});

test("missing API key makes no upstream requests", async () => {
  const result = await getDashboard({ env: {}, now, fetchImpl: async () => assert.fail("Must not fetch") });
  assert.equal(result.task.count, null);
  assert.equal(result.note.count, null);
  assert.equal(result.timeZone, "Asia/Seoul");
  assert.equal(result.date, "2026-09-15");
});

test("links preserve supplied views and follow configured database IDs", () => {
  assert.equal(getDatabaseUrl("task", "2dc9b100-24d9-8116-857d-c4a211064200"), DATABASES.task.url);
  assert.equal(getDatabaseUrl("note", DATABASES.note.id), DATABASES.note.url);
  assert.equal(getDatabaseUrl("note", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
    "https://app.notion.com/p/aaaaaaaabbbbccccddddeeeeeeeeeeee");
});

test("dashboard endpoint rejects writes and disables caching", async () => {
  const headers = {};
  const res = { setHeader: (key, value) => { headers[key] = value; }, end: (body) => { res.body = JSON.parse(body); } };
  await handler({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(headers.Allow, "GET");
  assert.equal(headers["Cache-Control"], "no-store");
});
