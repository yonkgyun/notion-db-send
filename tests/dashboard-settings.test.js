import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLink, parseSettings, readSettings, resolveCards, saveSettings, SETTINGS_KEY } from "../src/dashboardSettings.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("web links retain query and fragment and accept a missing https prefix", () => {
  assert.equal(normalizeLink(" example.com/page?v=1#section "), "https://example.com/page?v=1#section");
  assert.equal(normalizeLink(""), "");
  for (const url of ["javascript:alert(1)", "data:text/html,test", "file:///test", "https://user:pass@example.com", "not a url", "https://example.com/\nscript"]) {
    assert.throws(() => normalizeLink(url));
  }
});

test("all four card overrides survive reload without changing count sources", () => {
  const storage = memoryStorage();
  const defaults = resolveCards({}, { task: { url: "https://example.com/task-db" } });
  const draft = structuredClone(defaults);
  for (const [index, id] of Object.keys(draft).entries()) draft[id] = { ...draft[id], label: `Card ${index}`, url: `https://example.com/${index}` };
  const saved = saveSettings(storage, draft, defaults);
  assert.deepEqual(readSettings(storage), saved);
  assert.deepEqual(resolveCards(readSettings(storage)), draft);
  assert.equal(Object.keys(saved).length, 4);
});

test("legacy names and links survive the metric settings upgrade", () => {
  const saved = parseSettings(JSON.stringify({ version: 1, cards: { task: { label: "My page", url: "https://example.com/" } } }));
  const cards = resolveCards(saved);
  assert.equal(cards.task.label, "My page");
  assert.equal(cards.task.url, "https://example.com/");
  assert.equal(cards.task.metric.mode, "created_today");
  assert.equal(cards.shortcut1.metric.mode, "none");
});

test("each card saves its own metric and invalid stored metrics hide counts", () => {
  const storage = memoryStorage();
  const defaults = resolveCards({});
  const draft = structuredClone(defaults);
  draft.shortcut1.metric = { ...draft.shortcut1.metric, source: "note", mode: "all" };
  draft.task.metric = { ...draft.task.metric, mode: "unchecked", property: "Done" };
  saveSettings(storage, draft, defaults);
  const cards = resolveCards(readSettings(storage));
  assert.deepEqual(cards.shortcut1.metric, draft.shortcut1.metric);
  assert.deepEqual(cards.task.metric, draft.task.metric);
  assert.equal(parseSettings('{"version":2,"cards":{"task":{"metric":{"mode":"bad"}}}}').task.metric.mode, "none");
});

test("blank URL disables a link, while reset removes overrides", () => {
  const storage = memoryStorage();
  const defaults = resolveCards({});
  saveSettings(storage, { ...defaults, task: { ...defaults.task, url: "" } }, defaults);
  assert.equal(resolveCards(readSettings(storage)).task.url, "");
  saveSettings(storage, defaults, defaults);
  assert.equal(storage.getItem(SETTINGS_KEY), null);
  assert.deepEqual(resolveCards(readSettings(storage)), defaults);
});

test("unedited cards still use server database URLs", () => {
  const defaults = resolveCards({});
  const storage = memoryStorage();
  saveSettings(storage, { ...defaults, shortcut1: { label: "Other", url: "https://example.com/" } }, defaults);
  const saved = readSettings(storage);
  assert.equal(saved.task, undefined);
  assert.equal(resolveCards(saved, { task: { url: "https://example.com/new-db" } }).task.url, "https://example.com/new-db");
});

test("corrupt, unsafe and unknown-version storage falls back safely", () => {
  assert.deepEqual(parseSettings("not json"), {});
  assert.deepEqual(parseSettings('{"version":2,"cards":{}}'), {});
  assert.deepEqual(parseSettings('{"version":1,"cards":{"task":{"url":"javascript:alert(1)"}}}'), {});
  assert.deepEqual(readSettings({ getItem() { throw new Error("Blocked"); } }), {});
});

test("invalid drafts and blocked storage never report a successful save", () => {
  const defaults = resolveCards({});
  const storage = memoryStorage();
  for (const change of [{ label: " " }, { label: "x".repeat(41) }, { url: "javascript:alert(1)" }]) {
    assert.throws(() => saveSettings(storage, { ...defaults, task: { ...defaults.task, ...change } }, defaults));
    assert.equal(storage.getItem(SETTINGS_KEY), null);
  }
  assert.throws(() => saveSettings({ setItem() { throw new Error("Quota exceeded"); } },
    { ...defaults, task: { ...defaults.task, label: "Changed" } }, defaults));
});
