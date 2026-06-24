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

function textToParagraphBlocks(text) {
  return chunkText(text, 1900).map((chunk) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: {
            content: chunk
          }
        }
      ]
    }
  }));
}

function createImageToggleBlock(imageBlocks) {
  return {
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: [
        {
          type: "text",
          text: {
            content: "\uC774\uBBF8\uC9C0"
          }
        }
      ],
      children: imageBlocks
    }
  };
}

function dataUrlToBlob(dataUrl) {
  const [meta, encoded] = dataUrl.split(",");
  const contentType = meta.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const binary = Buffer.from(encoded || "", "base64");
  return new Blob([binary], { type: contentType });
}

async function uploadImageToNotion(apiKey, image) {
  const contentType = image.type || "image/jpeg";
  const filename = image.name || `photo-${Date.now()}.jpg`;

  const createResponse = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    },
    body: JSON.stringify({
      filename,
      content_type: contentType
    })
  });

  const createPayload = await createResponse.json().catch(() => ({}));

  if (!createResponse.ok) {
    throw new Error(createPayload.message || "\uC0AC\uC9C4 \uCCA8\uBD80\uB97C \uC900\uBE44\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  }

  const blob = dataUrlToBlob(image.dataUrl || "");
  const formData = new FormData();
  formData.append("file", blob, filename);

  const sendResponse = await fetch(`https://api.notion.com/v1/file_uploads/${createPayload.id}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION
    },
    body: formData
  });

  const sendPayload = await sendResponse.json().catch(() => ({}));

  if (!sendResponse.ok) {
    throw new Error(sendPayload.message || "\uC0AC\uC9C4\uC744 Notion\uC5D0 \uC62C\uB9AC\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
  }

  return {
    object: "block",
    type: "image",
    image: {
      type: "file_upload",
      file_upload: {
        id: createPayload.id
      }
    }
  };
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
    const bodyContent = String(body.bodyContent || "").trim();
    const images = Array.isArray(body.images) ? body.images : [];
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

    const imageBlocks = [];
    for (const image of images.slice(0, 5)) {
      if (image?.dataUrl) {
        imageBlocks.push(await uploadImageToNotion(apiKey, image));
      }
    }

    const children = [
      ...(imageBlocks.length ? [createImageToggleBlock(imageBlocks)] : []),
      ...(bodyContent ? textToParagraphBlocks(bodyContent) : [])
    ];

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
        properties,
        children
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
