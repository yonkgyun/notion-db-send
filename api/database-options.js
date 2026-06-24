const NOTION_VERSION = "2022-06-28";
const TYPE_PROPERTY_NAME = "유형";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { message: "GET 요청만 사용할 수 있습니다." });
  }

  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    return sendJson(response, 500, { message: "Notion 환경변수가 설정되지 않았습니다." });
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
        message: notionPayload.message || "Notion 데이터베이스 정보를 불러오지 못했습니다."
      });
    }

    const typeProperty = notionPayload.properties?.[TYPE_PROPERTY_NAME];
    const options = typeProperty?.select?.options?.map((option) => option.name) || [];

    return sendJson(response, 200, { options });
  } catch (error) {
    return sendJson(response, 500, { message: error.message || "유형 목록을 불러오지 못했습니다." });
  }
}
