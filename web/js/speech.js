// Голос: SLNG через локальный прокси, с фолбэком в браузерные Web Speech API.
//
// В SLNG уходит ТОЛЬКО голос родителя. Микрофон ребёнка ОТКЛЮЧЁН: браузерное
// распознавание не является локальным (Chrome шлёт аудио на свои серверы), а это
// нарушало бы architecture.md §5. См. CHILD_MIC_ENABLED ниже.

let voiceEs = null;
let unlocked = false;
let audioCtx = null;

export const slng = { ready: false, ttsModel: null, sttModel: null, lastError: null };

/* ---------------- инициализация ---------------- */

export async function probeSlng() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    if (!r.ok) throw new Error("health " + r.status);
    const h = await r.json();
    slng.ready = !!h.slng;
    slng.ttsModel = h.ttsModel;
    slng.sttModel = h.sttModel;
    return h;
  } catch (e) {
    slng.ready = false;
    slng.lastError = e.message;
    return null;
  }
}

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume?.();
  } catch { /* не критично */ }
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* игра проходится и без звука */ }
  pickVoice();
}

function pickVoice() {
  try {
    const all = speechSynthesis.getVoices();
    voiceEs = all.find((v) => /^es[-_]ES/i.test(v.lang)) || all.find((v) => /^es/i.test(v.lang)) || null;
  } catch { voiceEs = null; }
}
if (typeof speechSynthesis !== "undefined") speechSynthesis.addEventListener?.("voiceschanged", pickVoice);

/* ---------------- TTS ---------------- */

let current = null;

export function stopSpeaking() {
  try { speechSynthesis.cancel(); } catch {}
  if (current) { try { current.pause(); } catch {} current = null; }
}

/**
 * Говорит по-испански. rate < 1 — «медленный повтор» из дизайна.
 * SLNG отдаёт готовое аудио (и кэширует его на прокси), браузер — фолбэк.
 */
export async function say(text, { rate = 0.95, pitch = 1, volume = 1, voice } = {}) {
  if (!text) return false;
  stopSpeaking();

  if (slng.ready) {
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(voice ? { text, voice } : { text }),
      });
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        a.playbackRate = Math.max(0.5, Math.min(1.4, rate));
        a.volume = volume;
        current = a;
        await new Promise((done) => {
          a.onended = a.onerror = () => { URL.revokeObjectURL(url); if (current === a) current = null; done(); };
          a.play().catch(() => done());
        });
        return true;
      }
      slng.lastError = "tts " + r.status;
      console.warn("[tts] SLNG вернул", r.status, "— фолбэк в браузер");
    } catch (e) {
      slng.lastError = e.message;
      console.warn("[tts] SLNG недоступен:", e.message, "— фолбэк в браузер");
    }
  }

  return browserSay(text, { rate, pitch, volume });
}

function browserSay(text, { rate, pitch, volume }) {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === "undefined") return resolve(false);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES";
      if (voiceEs) u.voice = voiceEs;
      u.rate = rate; u.pitch = pitch; u.volume = volume;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
    } catch { resolve(false); }
  });
}

/* ---------------- STT: родитель, через SLNG ---------------- */

const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

/** Можно слушать родителя, если есть SLNG (микрофон) либо браузерное распознавание. */
export const asrAvailable = () => slng.ready || !!SR;

/**
 * Одно окно записи родителя. Микрофон открыт ограниченное время (§5).
 * @returns {{stop: Function}}
 */
export function listenParent({ onResult, onEnd, onError, maxMs = 6000 }) {
  if (slng.ready) return recordAndSend({ onResult, onEnd, onError, maxMs });
  return browserListen({ onResult, onEnd, onError, maxMs, lang: "es-ES" });
}

/**
 * Запись родителя и отправка в SLNG.
 * stop()   — закончить и ОТПРАВИТЬ.
 * cancel() — бросить запись, ничего не отправлять, закрыть микрофон.
 * Отмена обязательна при смене сцены: иначе окно записи переживёт переход
 * и в него попадёт голос ребёнка (architecture.md §5).
 */
function recordAndSend({ onResult, onEnd, onError, maxMs }) {
  let rec = null, stream = null, timer = null;
  let done = false, cancelled = false;
  const chunks = [];

  const release = () => {
    try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
    stream = null;
  };
  const settle = () => { clearTimeout(timer); release(); onEnd?.(); };

  const halt = (isCancel) => {
    if (done) return;
    done = true;
    cancelled = cancelled || isCancel;
    clearTimeout(timer);
    if (rec && rec.state === "recording") {
      try { rec.stop(); return; } catch {}   // дальше отработает onstop
    }
    settle();                                 // записи ещё/уже нет
  };

  navigator.mediaDevices?.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true } })
    .then((s0) => {
      stream = s0;
      // Пока ждали разрешение, сцену могли сменить — сразу закрываем микрофон.
      if (done) { settle(); return; }
      let mime;
      try {
        mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
        rec = new MediaRecorder(stream, { mimeType: mime });
      } catch (e) {
        done = true; onError?.("recorder:" + e.message); settle(); return;
      }
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        release();                            // микрофон закрывается сразу
        if (cancelled) { onEnd?.(); return; } // отменено — наружу ничего не уходит
        const blob = new Blob(chunks, { type: mime });
        if (blob.size < 1200) { onError?.("too-short"); onEnd?.(); return; }
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 8000);
        try {
          const r = await fetch("/api/stt", {
            method: "POST", headers: { "content-type": mime }, body: blob, signal: ac.signal,
          });
          const data = await r.json();
          if (!r.ok) { onError?.(data.error || "stt " + r.status); onEnd?.(); return; }
          if (!cancelled) onResult?.(data.transcript || "", true);
        } catch (e) {
          onError?.(e.name === "AbortError" ? "stt-timeout" : e.message);
        } finally { clearTimeout(to); }
        onEnd?.();
      };
      rec.start();
      timer = setTimeout(() => halt(false), maxMs);
    })
    .catch((e) => {
      done = true;
      onError?.(e.name === "NotAllowedError" ? "mic-denied" : e.message);
      settle();
    });

  return { stop: () => halt(false), cancel: () => halt(true) };
}

function browserListen({ onResult, onEnd, onError, maxMs, lang }) {
  if (!SR) { onError?.("no-asr"); onEnd?.(); return { stop() {} }; }
  let rec, timer, done = false;
  try {
    rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 3;
  } catch { onError?.("init"); onEnd?.(); return { stop() {} }; }

  let cancelled = false;
  const finish = () => { if (done) return; done = true; clearTimeout(timer); try { rec.stop(); } catch {} onEnd?.(); };
  rec.onresult = (e) => {
    if (cancelled) return;
    let text = "";
    for (const r of e.results) text += r[0].transcript + " ";
    const isFinal = e.results[e.results.length - 1].isFinal;
    onResult?.(text.trim(), isFinal);
    if (isFinal) finish();
  };
  rec.onerror = (e) => { onError?.(e.error || "error"); finish(); };
  rec.onend = finish;
  try { rec.start(); } catch { onError?.("start"); finish(); }
  timer = setTimeout(finish, maxMs);
  return { stop: finish, cancel: () => { cancelled = true; finish(); } };
}

/* ---------------- STT: ребёнок, ТОЛЬКО локально ---------------- */

/**
 * ВЫКЛЮЧЕНО. Web Speech API в Chrome отправляет аудио на серверы распознавания,
 * то есть «локально» он не работает. Это нарушает architecture.md §5: голос
 * ребёнка не должен покидать устройство. Включать только когда появится
 * настоящий on-device детектор ключевых слов (WASM).
 * Маршруты «сказать вместе» и касание закрывают сцену без микрофона.
 */
export const CHILD_MIC_ENABLED = false;
export const childAsrAvailable = () => CHILD_MIC_ENABLED && !!SR;

export function listenChild(opts) {
  if (!CHILD_MIC_ENABLED) { opts.onError?.("child-mic-disabled"); opts.onEnd?.(); return { stop() {} }; }
  return browserListen({ ...opts, lang: "es-ES", maxMs: opts.maxMs ?? 6000 });
}
