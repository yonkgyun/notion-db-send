const NOTION_VERSION = "2022-06-28";
const TYPE_PROPERTY = process.env.NOTION_TYPE_PROPERTY || "\uC720\uD615";
const NOTES_TYPE_PROPERTY = process.env.NOTION_NOTES_TYPE_PROPERTY || "\uBD84\uB958";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function getNotionErrorMessage(payload, mode) {
  if (payload?.code === "object_not_found") {
    const target = mode === "note" ? "노트" : "할일";
    return `${target} 데이터베이스를 찾을 수 없습니다. Notion에서 이 데이터베이스를 연동에 공유한 뒤 다시 시도해주세요.`;
  }

  return payload?.message || "노션 데이터베이스 정보를 불러오지 못했습니다.";
}

function getPropertyOptions(property) {
  if (!property) {
    return [];
  }

  if (property.type === "select") {
    return property.select?.options?.map((option) => option.name) || [];
  }

  if (property.type === "multi_select") {
    return property.multi_select?.options?.map((option) => option.name) || [];
  }

  if (property.type === "status") {
    return property.status?.options?.map((option) => option.name) || [];
  }

  return [];
}

function findSelectableProperty(properties, preferredPropertyName = TYPE_PROPERTY) {
  if (!properties) {
    return { name: null, property: null };
  }

  if (properties[preferredPropertyName]) {
    return { name: preferredPropertyName, property: properties[preferredPropertyName] };
  }

  const entry = Object.entries(properties).find(([, property]) => {
    return property.type === "select" || property.type === "multi_select" || property.type === "status";
  });

  if (!entry) {
    return { name: null, property: null };
  }

  return { name: entry[0], property: entry[1] };
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { message: "GET request only." });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const url = new URL(request.url, "http://localhost");
  const mode = url.searchParams.get("mode") === "note" ? "note" : "task";
  const databaseId = mode === "note" ? process.env.NOTION_NOTES_DATABASE_ID : process.env.NOTION_DATABASE_ID;
  const propertyName = mode === "note" ? NOTES_TYPE_PROPERTY : TYPE_PROPERTY;

  if (!apiKey || !databaseId) {
    return sendJson(response, 500, { message: "\uB178\uC158 \uD658\uACBD\uBCC0\uC218\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
  }

  try {
    const notionResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION
      }
    });

    const notionPayload = await notionResponse.json().catch(() => ({}));

    if (!notionResponse.ok) {
      return sendJson(response, notionResponse.status, {
        message: getNotionErrorMessage(notionPayload, mode)
      });
    }

    const { name, property: typeProperty } = findSelectableProperty(notionPayload.properties, propertyName);

    return sendJson(response, 200, {
      options: getPropertyOptions(typeProperty),
      propertyName: name,
      propertyFound: Boolean(typeProperty),
      propertyType: typeProperty?.type || null
    });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "\uC720\uD615 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." });
  }
}
