const NOTION_VERSION = "2022-06-28";
const NAME_PROPERTY = process.env.NOTION_NAME_PROPERTY || "\uC774\uB984";
const DATE_PROPERTY = process.env.NOTION_DATE_PROPERTY || "\uB0A0\uC9DC";
const TYPE_PROPERTY = process.env.NOTION_TYPE_PROPERTY || "\uC720\uD615";
const MEMO_PROPERTY = process.env.NOTION_MEMO_PROPERTY || "\uBA54\uBAA8";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function chunkText(text, size = 1900) {
  const chunks = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

function getKoreaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { message: "POST request only." });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    return sendJson(response, 500, { message: "\uB178\uC158 \uD658\uACBD\uBCC0\uC218\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const content = String(body.content || "").trim();
    const memo = String(body.memo || "").trim();
    const type = String(body.type || "").trim();
    const typePropertyName = String(body.typePropertyName || TYPE_PROPERTY).trim();

    if (!content) {
      return sendJson(response, 400, { message: "\uC800\uC7A5\uD560 \uC81C\uBAA9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." });
    }

    const properties = {
      [NAME_PROPERTY]: {
        title: chunkText(content).map((chunk) => ({
          text: {
            content: chunk
          }
        }))
      },
      [DATE_PROPERTY]: {
        date: {
          start: getKoreaDate()
        }
      }
    };

    if (type) {
      properties[typePropertyName] = {
        select: {
          name: type
        }
      };
    }

    if (memo) {
      properties[MEMO_PROPERTY] = {
        rich_text: chunkText(memo).map((chunk) => ({
          text: {
            content: chunk
          }
        }))
      };
    }

    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        icon: {
          emoji: "\u25AA\uFE0F"
        },
        properties
      })
    });

    const notionPayload = await notionResponse.json().catch(() => ({}));

    if (!notionResponse.ok) {
      return sendJson(response, notionResponse.status, {
        message: notionPayload.message || "\uB178\uC158 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
      });
    }

    return sendJson(response, 200, { ok: true, pageId: notionPayload.id });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "\uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4." });
  }
}
