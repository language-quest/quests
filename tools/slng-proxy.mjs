#!/usr/bin/env node
/**
 * SLNG-прокси + статика для веб-демо.
 *
 * Зачем прокси: ключ VOICEAI_API_KEY не должен попадать в браузер
 * (architecture.md §3 — ключи живут на сервере). Клиент ходит только сюда.
 *
 * Эндпоинты:
 *   GET  /api/health      — сконфигурирован ли ключ, какие модели
 *   POST /api/stt         — тело = аудио (webm/wav), ответ { transcript, language }
 *   POST /api/tts         — { text, voice? }, ответ = аудио
 *   всё остальное         — статика из корня проекта
 *
 * Кэш синтеза на диске: авторские реплики повторяются от сессии к сессии,
 * поэтому второй и последующие разы отдаются мгновенно и без сети.
 *
 * Перед синтезом текст проходит ttsText(), после синтеза аудио — trimWavSilence()
 * (оба из tts-prep.mjs). Почему это нужно — в комментариях там же.
 */

import http from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createHash } from "node:crypto";
import { ttsText, trimWavSilence } from "./tts-prep.mjs";

const PORT = Number(process.env.PORT || 5179);
const ROOT = resolve(process.argv[2] || ".");

/** .env.local / .env — уже заданное в окружении имеет приоритет. */
function loadEnv(file) {
  if (!existsSync(file)) return false;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
  return true;
}
const envFiles = [".env.local", ".env"].filter((f) => loadEnv(join(ROOT, f)));

const KEY = process.env.SLNG_API_KEY || process.env.VOICEAI_API_KEY || "";
const REGION = process.env.SLNG_REGION || "";
// Регион задаётся поддоменом: https://eu-west.api.slng.ai
const BASE = process.env.VOICEAI_BASE_URL
  || (REGION ? `https://${REGION}.api.slng.ai` : "https://api.slng.ai");

// Имена как в .env.local.example. В eu-west по HTTP работают только прямые
// эндпоинты /v1/{tts,stt}/{model}; unified /v1/bridges/... отвечает 405 (WebSocket-only).
const STT_MODEL = process.env.SLNG_STT || process.env.SLNG_STT_MODEL || "deepgram/nova:3";
const TTS_MODEL = process.env.SLNG_TTS || process.env.SLNG_TTS_MODEL || "deepgram/aura:2";
const TTS_VOICE = process.env.SLNG_TTS_VOICE || "aura-2-javier-es";
const STT_LANG = process.env.SLNG_STT_LANGUAGE || "es";

const CACHE_DIR = join(ROOT, "assets", "caperucita", "tts-cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".md": "text/markdown; charset=utf-8",
};

const json = (res, code, obj) => {
  const b = Buffer.from(JSON.stringify(obj));
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "content-length": b.length });
  res.end(b);
};

const readBody = (req, limit = 12 * 1024 * 1024) =>
  new Promise((ok, err) => {
    const chunks = []; let n = 0;
    req.on("data", (c) => { n += c.length; if (n > limit) { err(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", err);
  });

/* ---------------- STT ---------------- */

async function handleSTT(req, res) {
  if (!KEY) return json(res, 503, { error: "no_key", hint: "VOICEAI_API_KEY не задан" });
  const audio = await readBody(req);
  if (!audio.length) return json(res, 400, { error: "empty_audio" });

  const ct = req.headers["content-type"] || "audio/webm";
  const ext = ct.includes("wav") ? "wav" : ct.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("audio", new Blob([audio], { type: ct }), `clip.${ext}`);
  // Язык передаётся ПОЛЕМ ФОРМЫ. Как query-параметр он игнорируется, и испанская
  // речь транскрибируется английской фонетикой ("queso" → "whistle").
  if (STT_LANG) form.append("language", STT_LANG);

  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}/v1/stt/${STT_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}` },
      body: form,
    });
    const text = await r.text();
    if (!r.ok) {
      console.error(`[stt] ${r.status} ${text.slice(0, 300)}`);
      return json(res, r.status, { error: "slng_stt", status: r.status, detail: text.slice(0, 500) });
    }
    let data; try { data = JSON.parse(text); } catch { data = { transcript: text }; }
    // Две формы ответа: плоская {transcript} и нативная дипграмовская —
    // deepgram/nova:3 в eu-west отдаёт вторую.
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    const transcript = (data.transcript ?? alt?.transcript ?? "").trim();
    const confidence = data.confidence ?? alt?.confidence ?? null;
    const ms = Date.now() - t0;
    console.log(`[stt] ${ms}ms conf=${confidence ?? "-"} "${transcript.slice(0, 60)}"`);
    return json(res, 200, {
      transcript,
      confidence,
      language: data.language || data?.results?.channels?.[0]?.detected_language || null,
      ms,
    });
  } catch (e) {
    console.error("[stt] fail:", e.message);
    return json(res, 502, { error: "upstream", detail: e.message });
  }
}

/* ---------------- TTS ---------------- */

async function handleTTS(req, res) {
  const body = await readBody(req, 64 * 1024);
  let payload; try { payload = JSON.parse(body.toString("utf8")); } catch { return json(res, 400, { error: "bad_json" }); }
  const raw = (payload.text || "").trim();
  if (!raw) return json(res, 400, { error: "empty_text" });
  // Нормализация ДО ключа кэша: иначе прогретый кэш продолжит отдавать старое
  // произношение, а warm-скрипты разъедутся с рантаймом.
  const text = ttsText(raw);
  if (!text) return json(res, 400, { error: "empty_text" });
  const voice = payload.voice || TTS_VOICE;

  // Кэш: авторские реплики повторяются, второй раз — мгновенно и без сети.
  const key = createHash("sha1").update(`${TTS_MODEL}|${voice}|${text}`).digest("hex");
  const hit = join(CACHE_DIR, key + ".audio");
  const metaPath = join(CACHE_DIR, key + ".json");
  if (existsSync(hit) && existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    res.writeHead(200, { "content-type": meta.type, "content-length": statSync(hit).size, "x-cache": "hit" });
    return createReadStream(hit).pipe(res);
  }

  if (!KEY) return json(res, 503, { error: "no_key", hint: "VOICEAI_API_KEY не задан" });

  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}/v1/tts/${TTS_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify(voice ? { text, model: voice } : { text }),
    });
    if (!r.ok) {
      // 400 от SLNG перечисляет допустимые значения voice — не глотаем.
      const detail = await r.text();
      console.error(`[tts] ${r.status} ${detail.slice(0, 400)}`);
      return json(res, r.status, { error: "slng_tts", status: r.status, detail: detail.slice(0, 600) });
    }
    const type = r.headers.get("content-type") || "audio/wav";
    const buf = trimWavSilence(Buffer.from(await r.arrayBuffer()));
    writeFileSync(hit, buf);
    // raw — авторская строка как она лежит в quest.json; по ней tts-coverage
    // сопоставляет клип с репликой, text — то, что реально услышала модель.
    writeFileSync(metaPath, JSON.stringify({ type, text, raw, voice, model: TTS_MODEL }));
    console.log(`[tts] ${Date.now() - t0}ms ${buf.length}B "${text.slice(0, 50)}"`);
    res.writeHead(200, { "content-type": type, "content-length": buf.length, "x-cache": "miss" });
    return res.end(buf);
  } catch (e) {
    console.error("[tts] fail:", e.message);
    return json(res, 502, { error: "upstream", detail: e.message });
  }
}

/* ---------------- статика ---------------- */

// Публикуем ТОЛЬКО эти каталоги. Корень проекта содержит .env.local с ключом,
// поэтому раздавать его целиком нельзя — одной нормализации пути недостаточно.
const PUBLIC_DIRS = ["web", "assets"];

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  // Превью открывает origin, а index.html в корне проекта нет — уводим в приложение.
  if (p === "/") { res.writeHead(302, { location: "/web/quests.html" }); return res.end(); }
  if (p.endsWith("/")) p += "index.html";

  const rel = normalize(p).replace(/^[/\\]+/, "");
  const top = rel.split(/[/\\]/)[0];
  const deny = !PUBLIC_DIRS.includes(top) || rel.split(/[/\\]/).includes("..");
  const file = join(ROOT, rel);
  if (deny || !file.startsWith(ROOT + "/") || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("404");
  }
  res.writeHead(200, {
    "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
    "content-length": statSync(file).size,
    "cache-control": "no-cache",
  });
  createReadStream(file).pipe(res);
}

/* ---------------- сервер ---------------- */

http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/api/health") {
      return json(res, 200, {
        slng: !!KEY, base: BASE, region: REGION || "(default)",
        sttModel: STT_MODEL, ttsModel: TTS_MODEL,
        voice: TTS_VOICE || "(default)", envFiles, cached: existsSync(CACHE_DIR),
      });
    }
    if (path === "/api/slng/catalog") {
      if (!KEY) return json(res, 503, { error: "no_key" });
      const r = await fetch(`${BASE}/v1/catalog/models`, { headers: { Authorization: `Bearer ${KEY}` } });
      const body = await r.text();
      res.writeHead(r.status, { "content-type": r.headers.get("content-type") || "application/json" });
      return res.end(body);
    }
    if (path === "/api/stt" && req.method === "POST") return await handleSTT(req, res);
    if (path === "/api/tts" && req.method === "POST") return await handleTTS(req, res);
    return serveStatic(req, res);
  } catch (e) {
    console.error("[srv]", e);
    if (!res.headersSent) json(res, 500, { error: "server", detail: String(e?.message || e) });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Language Quests — http://localhost:${PORT}/web/`);
  console.log(`  корень: ${ROOT}`);
  console.log(`  SLNG:   ${KEY ? "ключ задан" : "БЕЗ КЛЮЧА — голос уйдёт в браузерный фолбэк"}`);
  console.log(`  STT:    ${STT_MODEL}`);
  console.log(`  TTS:    ${TTS_MODEL}${TTS_VOICE ? " / " + TTS_VOICE : ""}\n`);
});
