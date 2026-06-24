const NOTION_VERSION = "2022-06-28";

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
    return sendJson(response, 405, { message: "POST 요청만 사용할 수 있습니다." });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    return sendJson(response, 500, { message: "Notion 환경변수가 설정되지 않았습니다." });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const content = String(body.content || "").trim();
    const type = String(body.type || "").trim();

    if (!content) {
      return sendJson(response, 400, { message: "저장할 내용을 입력해주세요." });
    }

    const properties = {
      "이름": {
        title: chunkText(content).map((chunk) => ({
          text: {
            content: chunk
          }
        }))
      },
      "날짜": {
        date: {
          start: getKoreaDate()
        }
      }
    };

    if (type) {
      properties["유형"] = {
        select: {
          name: type
        }
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
        properties
      })
    });

    const notionPayload = await notionResponse.json().catch(() => ({}));

    if (!notionResponse.ok) {
      return sendJson(response, notionResponse.status, {
        message: notionPayload.message || "Notion 저장에 실패했습니다."
      });
    }

    return sendJson(response, 200, { ok: true, pageId: notionPayload.id });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "저장 중 오류가 발생했습니다." });
  }
}
