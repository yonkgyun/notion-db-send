const NOTION_VERSION = "2022-06-28";
const TYPE_PROPERTY = process.env.NOTION_TYPE_PROPERTY || "\uC720\uD615";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
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

function findSelectableProperty(properties) {
  if (!properties) {
    return { name: null, property: null };
  }

  if (properties[TYPE_PROPERTY]) {
    return { name: TYPE_PROPERTY, property: properties[TYPE_PROPERTY] };
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
  const databaseId = process.env.NOTION_DATABASE_ID;

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
        message: notionPayload.message || "\uB178\uC158 \uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
      });
    }

    const { name, property: typeProperty } = findSelectableProperty(notionPayload.properties);

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
