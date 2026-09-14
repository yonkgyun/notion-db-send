export const DATABASES = {
  task: {
    id: "2dc9b10024d98116857dc4a211064200",
    url: "https://app.notion.com/p/2dc9b10024d98116857dc4a211064200?v=2dc9b10024d98196ad39000cdce9dddd"
  },
  note: {
    id: "2dc9b10024d9814da3e7d86e7e9ffd17",
    url: "https://app.notion.com/p/2dc9b10024d9814da3e7d86e7e9ffd17?v=2dc9b10024d9817ba024000cec0deecd"
  }
};

export function getDatabaseUrl(kind, databaseId) {
  const id = String(databaseId || "").replaceAll("-", "").toLowerCase();
  if (!id || id === DATABASES[kind].id) return DATABASES[kind].url;
  return `https://app.notion.com/p/${encodeURIComponent(id)}`;
}
