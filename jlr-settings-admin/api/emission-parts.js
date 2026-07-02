const XLSX = require("xlsx");
const { createClient } = require("redis");

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
  emissionParts: [],
});

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
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
  return {
    version:
      typeof parsed.version === "string" && parsed.version.trim()
        ? parsed.version.trim()
        : DEFAULT_SETTINGS.version,
    opinions: Array.isArray(parsed.opinions) && parsed.opinions.length > 0
      ? parsed.opinions
      : DEFAULT_SETTINGS.opinions,
    emissionParts: Array.isArray(parsed.emissionParts) ? parsed.emissionParts : [],
  };
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

function parseEmissionPartsFromWorkbook(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("엑셀 시트를 찾지 못했습니다.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (rows.length < 2) {
    throw new Error("업로드한 엑셀에 데이터가 없습니다.");
  }

  const parts = rows
    .slice(1)
    .map((row) => ({
      coverage: String(row[0] || "").trim(),
      description: String(row[1] || "").trim(),
      includeExclude: String(row[2] || "").trim(),
      engineeringNumber: String(row[3] || "").trim(),
      engNo: String(row[4] || "").trim(),
      baseName: String(row[5] || "").trim(),
    }))
    .filter((item) => item.engineeringNumber);

  if (parts.length === 0) {
    throw new Error("D열에서 엔지니어링 번호를 찾지 못했습니다.");
  }

  return parts;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
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

    const requestBody = await readRequestBody(req);
    const fileContentBase64 = String(requestBody.fileContentBase64 || "").trim();
    if (!fileContentBase64) {
      throw new Error("업로드할 엑셀 파일 데이터가 없습니다.");
    }

    const fileBuffer = Buffer.from(fileContentBase64, "base64");
    const emissionParts = parseEmissionPartsFromWorkbook(fileBuffer);
    const currentSettings = await readSettings();
    const nextSettings = {
      ...currentSettings,
      emissionParts,
      version: new Date().toISOString(),
    };
    await writeSettings(nextSettings);

    sendJson(res, 200, {
      version: nextSettings.version,
      emissionPartsCount: emissionParts.length,
      fileName: String(requestBody.fileName || "").trim(),
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "배출가스 부품 파일을 처리하지 못했습니다." });
  }
};
