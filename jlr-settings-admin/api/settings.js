const SETTINGS_KEY = "jlr:settings";
let redisClientPromise = null;

const DEFAULT_SETTINGS = Object.freeze({
  version: "1",
  opinions: [
    "48시간 - 1.고객성향 및 특이사항 - ",
    "48시간 - 2.마지막 정비이력 - ",
    "48시간 - 3.마지막 엔진오일 교환 - ",
    "48시간 - 4.리콜 - X",
    "48시간 - 5.출고 요청 시간 - ",
    "48시간 - 6.원케어 가입 - ",
    "48시간 - 7.NSC - X",
    "48시간 - 8.EVHC - X",
    "48시간 - 9.입고시 엡셀링 - X",
    "48시간 - 10.메달리아 - X",
    "48시간 - 11.부품 - X",
    "48시간 - 12.프리미팅 - X",
  ],
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token");
}

function sendJson(res, statusCode, body) {
  setCors(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(statusCode).send(JSON.stringify(body));
}

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;

  if (!redisClientPromise) {
    redisClientPromise = Promise.resolve().then(async () => {
      const { createClient } = require("redis");
      const client = createClient({ url: process.env.REDIS_URL });
      client.on("error", (error) => {
        console.error("Redis client error", error);
      });
      await client.connect();
      return client;
    });
  }

  return redisClientPromise;
}

async function readSettings() {
  const client = await getRedisClient();
  if (!client) return DEFAULT_SETTINGS;

  const result = await client.get(SETTINGS_KEY);
  if (!result) return DEFAULT_SETTINGS;

  const parsed = JSON.parse(result);
  return normalizeSettings(parsed);
}

async function writeSettings(settings) {
  const client = await getRedisClient();
  if (!client) {
    throw new Error("REDIS_URL 환경변수가 설정되지 않았습니다.");
  }

  await client.set(SETTINGS_KEY, JSON.stringify(settings));
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function normalizeSettings(settings) {
  if (!settings || typeof settings !== "object") {
    throw new Error("설정 형식이 올바르지 않습니다.");
  }

  if (
    !Array.isArray(settings.opinions) ||
    settings.opinions.length < 1 ||
    settings.opinions.some((opinion) => typeof opinion !== "string" || !opinion.trim())
  ) {
    throw new Error("내부의견 문구를 1개 이상 입력해야 합니다.");
  }

  return {
    version:
      typeof settings.version === "string" && settings.version.trim()
        ? settings.version.trim()
        : String(Date.now()),
    opinions: settings.opinions.map((opinion) => opinion.trim()),
  };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "GET") {
      sendJson(res, 200, await readSettings());
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    if (!process.env.REDIS_URL) {
      sendJson(res, 500, { error: "REDIS_URL 환경변수가 설정되지 않았습니다." });
      return;
    }

    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
      sendJson(res, 401, { error: "관리자 인증이 필요합니다." });
      return;
    }

    const settings = normalizeSettings(await readRequestBody(req));
    settings.version = new Date().toISOString();
    await writeSettings(settings);
    sendJson(res, 200, settings);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "설정을 처리하지 못했습니다." });
  }
};
