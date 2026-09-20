// Голосовой стенд: один ход диалога целиком, с замером каждой стадии.
// Конвейер ровно как в architecture.md §11:
//   SLNG Listen → НАШ интент-гейт ─ совпало → авторская реплика (без сети в модель)
//                                  └ не совпало → Think → НАШ валидатор → SLNG Speak

import { matchIntent } from "./engine.js";

const $ = (id) => document.getElementById(id);
let Q, CFG, who = "lolo", rec = null, chunks = [], t0 = 0;

const logEl = $("log");
let lines = [];
function log(msg, cls = "") {
  lines.push(cls ? `<span class="${cls}">${msg}</span>` : msg);
  if (lines.length > 60) lines.shift();
  logEl.innerHTML = lines.join("\n");
  logEl.scrollTop = logEl.scrollHeight;
}
const clear = () => { lines = []; logEl.innerHTML = ""; };

/* ---------------- загрузка ---------------- */

[Q, CFG] = await Promise.all([
  fetch("../assets/caperucita/quest.json").then((r) => r.json()),
  fetch("/api/config").then((r) => r.json()),
]);

$("cfg").textContent =
  `регион ${CFG.region} · STT ${CFG.stt} · TTS ${CFG.tts}${CFG.ttsVoice ? " / " + CFG.ttsVoice : ""}\n` +
  `LLM ${CFG.model} через ${CFG.llmRoute} · ключи: SLNG ${CFG.hasSlngKey ? "✓" : "✗"}, Anthropic ${CFG.hasAnthropicKey ? "✓" : "✗"}`;

const CAST = ["lolo", "rita", "otto"];
CAST.forEach((id) => {
  const b = document.createElement("button");
  b.textContent = Q.characters[id].nameRu;
  b.dataset.id = id;
  b.onclick = () => pick(id);
  $("picker").appendChild(b);
});

function pick(id) {
  who = id;
  const c = Q.characters[id];
  [...$("picker").children].forEach((b) => b.classList.toggle("on", b.dataset.id === id));
  $("es").textContent = c.state1.es;
  $("ru").textContent = c.state1.ru;
  $("quirk").textContent = `${c.quirkRu} · ждёт: ${Q.speechFunctions[c.speechFunction].labelRu.toLowerCase()}`;
  $("goal").textContent = Q.speechFunctions[c.speechFunction].canonical;
  clear();
  log(`персонаж → ${c.nameRu} (${c.nameEs})`);
}
pick("lolo");

/* ---------------- Speak ---------------- */

// Испанские голоса Deepgram Aura 2 — проверены живым синтезом в eu-west.
// Их ровно три, так что Отто и Лоло пока делят мужские: Нестор ниже и спокойнее,
// Хавьер живее. Развести окончательно — после прослушивания.
const VOICE = {
  lolo: "aura-2-javier-es",   // волк, шепчет
  rita: "aura-2-celeste-es",  // белка, тараторит
  otto: "aura-2-nestor-es",   // сова, засыпает
  caperucita: "aura-2-celeste-es",
};

async function speak(text, { rate, voice = VOICE[who] } = {}) {
  const t = performance.now();
  const r = await fetch("/api/slng/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, language: "es", speed: rate, voice }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    log(`  Speak  ✗ ${e.error || r.status} — ${(e.detail || "").slice(0, 180)}`, "r");
    return false;
  }
  const blob = await r.blob();
  log(`  Speak  ${Math.round(performance.now() - t)} ms · ${(blob.size / 1024).toFixed(1)} КБ`, "g");
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  await a.play().catch((e) => log(`  Speak  ✗ воспроизведение: ${e.message}`, "r"));
  a.onended = () => URL.revokeObjectURL(url);
  return true;
}

$("play").onclick = async () => {
  $("play").disabled = true;
  clear();
  log(`<b>${Q.characters[who].nameEs}:</b> ${Q.characters[who].state1.es}`);
  await speak(Q.characters[who].state1.es);
  $("play").disabled = false;
};

/* ---------------- Listen ---------------- */

const talk = $("talk");

async function startRec() {
  if (rec) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    rec = new MediaRecorder(stream, { mimeType: mime });
    chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); handleTurn(new Blob(chunks, { type: mime })); };
    rec.start();
    t0 = performance.now();
    talk.classList.add("rec");
    talk.textContent = "Говори… отпусти, когда закончишь";
    clear();
    log("Listen · запись…");
  } catch (e) {
    log(`Listen ✗ микрофон: ${e.message}`, "r");
  }
}

function stopRec() {
  if (!rec || rec.state === "inactive") return;
  rec.stop();
  rec = null;
  talk.classList.remove("rec");
  talk.textContent = "Держи и говори";
}

for (const ev of ["pointerdown"]) talk.addEventListener(ev, (e) => { e.preventDefault(); startRec(); });
for (const ev of ["pointerup", "pointercancel", "pointerleave"]) talk.addEventListener(ev, (e) => { e.preventDefault(); stopRec(); });

/* ---------------- один ход ---------------- */

async function handleTurn(blob) {
  const recMs = Math.round(performance.now() - t0);
  log(`  запись ${recMs} ms · ${(blob.size / 1024).toFixed(1)} КБ ${blob.type}`);
  talk.disabled = true;

  const tStt = performance.now();
  const r = await fetch("/api/slng/stt?language=es", {
    method: "POST",
    headers: { "content-type": blob.type },
    body: blob,
  });
  const stt = await r.json();
  if (!r.ok || stt.error) {
    log(`  Listen ✗ ${stt.error} — ${(stt.detail || "").slice(0, 220)}`, "r");
    talk.disabled = false;
    return;
  }
  const transcript = (stt.transcript || "").trim();
  log(`  Listen ${Math.round(performance.now() - tStt)} ms → «${transcript || "(тишина)"}»`, transcript ? "g" : "y");
  if (!transcript) { talk.disabled = false; return; }

  // ---- интент-гейт: наш, детерминированный, без модели
  const tGate = performance.now();
  const hit = matchIntent(transcript, Q.speechFunctions);
  const want = Q.characters[who].speechFunction;
  log(`  гейт   ${(performance.now() - tGate).toFixed(1)} ms → ${hit ? `${hit.fn} (${hit.score.toFixed(2)})` : "нет совпадения"}`);

  if (hit && hit.fn === want) {
    // левая ветка: улика выдаётся локально, модель не вызывается вообще
    const line = clueLine(who);
    log(`  <b>улика</b> · без сети в модель`, "g");
    log(`<b>${Q.characters[who].nameEs}:</b> ${line}`);
    await speak(line, { rate: who === "rita" ? 0.8 : undefined });
    log(`  ход целиком ${Math.round(performance.now() - t0 - recMs)} ms после отпускания`, "g");
    talk.disabled = false;
    return;
  }

  // ---- правая ветка: свободная реплика
  const c = Q.characters[who];
  const sf = Q.speechFunctions[want];
  const system =
    `Ты ${c.nameEs} из детского квеста на испанском. Черта: ${c.quirkRu}. ` +
    `Ребёнку 3–6 лет, испанский — не родной.\n` +
    `ПРАВИЛА, нарушение недопустимо:\n` +
    `1. Отвечай ТОЛЬКО по-испански, не больше двух коротких предложений.\n` +
    `2. Используй настоящее время и простые слова.\n` +
    `3. Ты ещё НЕ сказал свой признак. Не называй его, не намекай, не описывай.\n` +
    `4. Игрок должен попросить: «${sf.canonical}». Пока он не попросил — мягко покажи свою черту ` +
    `(${c.quirkRu.toLowerCase()}) и жди, не подсказывая формулировку прямо.\n` +
    `5. Ты в лесу и разговариваешь, а не рассказываешь сказку. Без вопросов к взрослому.`;

  const tLlm = performance.now();
  const res = await fetch("/api/reply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system,
      messages: [{ role: "user", content: transcript }],
      sessionId: sid,
      forbidden: forbiddenTokens(who),
      fallback: c.state1.es,
    }),
  }).then((x) => x.json());

  const llmMs = Math.round(performance.now() - tLlm);
  if (res.error) log(`  Think  ✗ ${res.error} — ${(res.detail || "").slice(0, 220)}`, "r");
  else log(`  Think  ${llmMs} ms · ${res.route} · ${res.via?.model || "?"}${res.via?.speed ? " speed=" + res.via.speed : ""}${res.via?.source === "cache" ? " · ИЗ КЭША" : ""}`, "g");
  if (res.rejected) log(`  валид. ✗ отклонено (${res.rejected.why}): «${res.rejected.line}» → авторский фолбэк`, "y");
  else if (!res.error) log(`  валид. ✓`);

  log(`<b>${c.nameEs}:</b> ${res.line}`);
  await speak(res.line, { rate: who === "rita" ? 0.8 : undefined });
  log(`  ход целиком ${Math.round(performance.now() - t0 - recMs)} ms после отпускания`, "g");
  talk.disabled = false;
}

const sid = "dev-" + Math.random().toString(36).slice(2, 10);

/** Испанская реплика с признаком — для левой ветки. Берём из сцен пака. */
function clueLine(id) {
  const byChar = {
    lolo: "¡Escuché un chapoteo! Alguien pisó el agua.",
    rita: "Ví… tres… árboles… detrás de él.",
    otto: "Olía a flores. Muchas flores, sí.",
  };
  return byChar[id];
}

/** Токены, которых не должно быть в свободной реплике (валидатор §4.5). */
function forbiddenTokens(id) {
  const byChar = {
    lolo: ["chapoteo", "agua", "salpic"],
    rita: ["tres", "árbol", "arbol"],
    otto: ["olía", "olia", "flor", "huele"],
  };
  return byChar[id];
}
