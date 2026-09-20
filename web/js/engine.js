// Игровой рантайм: чистая логика, без DOM и без сети.
// Правила выдачи улик существуют здесь в единственном экземпляре (architecture.md §3).

/* ---------------- интент-гейт ---------------- */

/** Нормализация: нижний регистр, без диакритики и пунктуации. */
export function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const words = (s) => normalize(s).split(" ").filter(Boolean);

// Артикли внутри фразы не мешают: «con la cuerda» = «con cuerda». Убираем с обеих сторон.
const ARTICLES = new Set(["el","la","los","las","un","una"]);
const noArticles = (ws) => { const r = ws.filter((w) => !ARTICLES.has(w)); return r.length ? r : ws; };

/** Схожесть отдельных СЛОВ. Короткие слова — только точное совпадение. */
function wordSim(a, b) {
  if (a === b) return 1;
  if (a.length <= 3 || b.length <= 3) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
const WORD_MIN = 0.82;   // "despasio"~"despacio" = 0.875 проходит, "espacio" = 0.75 нет

// Вежливые добавления и обёртки просьбы — допустимы как остаток.
const FILLERS = new Set(["por","favor","porfavor","puedes","podrias","puede","podria","me","lo","la",
  "un","una","poco","perdona","perdon","oye","ahora","si","vale","pues","eh","que","a","el","tu",
  "bien","nada","muy","solo","otra","eso","esto","ya","aqui"]);
// Признак того, что фраза обращена к собеседнику, а не описывает мир.
const MARKERS = new Set(["puedes","podrias","puede","podria","te","le","favor","porfavor",
  "habla","hablas","repite","repites","repitelo","di","dime","dilo","dices","perdona","perdon","oye","subir"]);
// Собственные императивы: сами по себе означают обращение.
const IMPERATIVE = new Set(["repite","repites","repitelo","habla","hablas","di","dime","dilo"]);
const NEGATIONS = new Set(["no","nunca","tampoco","nada"]);

/** Ищет шаблон как непрерывную последовательность слов. */
function findPattern(toks, pat) {
  for (let i = 0; i + pat.length <= toks.length; i++) {
    let ok = true;
    for (let j = 0; j < pat.length; j++) {
      if (wordSim(toks[i + j], pat[j]) < WORD_MIN) { ok = false; break; }
    }
    if (ok) return { at: i, len: pat.length };
  }
  return null;
}

/**
 * Детерминированный интент-гейт. Никакой модели: шаблоны из пака.
 *
 * Три условия вместо прежнего нечёткого сравнения подстрок — оно пропускало
 * "El árbol es más alto" и "No quiero repetir":
 *   A. шаблон найден как последовательность слов (не кусок внутри слова);
 *   B. фраза обращена к собеседнику — есть маркер, либо шаблон сам императив,
 *      либо во фразе нет ничего, кроме шаблона и вежливых слов;
 *   C. отрицание допустимо только у шаблонов, которые сами отрицательные
 *      ("no te oigo", "no entiendo").
 *
 * @returns {{fn:string, score:number}|null}
 */
export function matchIntent(transcript, speechFunctions, lex = {}) {
  const toks = noArticles(words(transcript));
  if (!toks.length) return null;
  const ext = (base, extra) => (extra?.length ? new Set([...base, ...extra.map((w) => normalize(w))]) : base);
  const fillers = ext(FILLERS, lex.fillers);
  // Обращение по имени — само по себе адресация: «Más alto, Lolo».
  const markers = ext(MARKERS, [...(lex.markers ?? []), ...(lex.vocatives ?? [])]);

  let best = null;
  for (const [fn, def] of Object.entries(speechFunctions)) {
    for (const raw of def.accept) {
      const pat = noArticles(words(raw));
      if (!pat.length) continue;
      const found = findPattern(toks, pat);
      if (!found) continue;

      const patIsNegative = NEGATIONS.has(pat[0]);
      const rest = toks.filter((_, i) => i < found.at || i >= found.at + found.len);

      // C. отрицание вне отрицательного шаблона
      if (!patIsNegative && rest.some((w) => NEGATIONS.has(w))) continue;

      // остаток: вежливые слова и обращения бесплатны, одно постороннее прощаем (ошибки ASR)
      const strays = rest.filter((w) => !fillers.has(w) && !markers.has(w));

      // B. обращение к собеседнику
      const addressed = strays.length === 0
        || pat.some((w) => IMPERATIVE.has(w))
        || toks.some((w) => markers.has(w));
      if (!addressed) continue;

      if (strays.length > 1) continue;

      const score = (pat.length + 1) / (pat.length + 1 + strays.length);
      if (!best || score > best.score || (score === best.score && pat.length > best.len)) {
        best = { fn, score, len: pat.length };
      }
    }
  }
  return best ? { fn: best.fn, score: best.score } : null;
}

/** Щадящее сравнение детского слова: совпадение по началу или близость. */
export function matchChildWord(transcript, target, threshold = 0.45) {
  const t = normalize(transcript), w = normalize(target);
  if (!t) return false;
  if (t.includes(w)) return true;
  if (w.length >= 3 && t.includes(w.slice(0, 3))) return true;
  const d = levenshtein(t.slice(0, Math.max(w.length + 2, 4)), w);
  return 1 - d / Math.max(w.length, 1) >= threshold;
}

/* ---------------- матрица ---------------- */

/** Совпадение места с уликой: считаем СОВПАДЕНИЕ, а не наличие свойства. */
export function matchesClue(attr, clue, props) {
  if (attr === "trees") return props.trees === clue.value;
  const has = props[attr] === true;
  return clue.polarity === "negative" ? !has : has;
}

export function survivors(quest, variant, heldAttrs) {
  const v = quest.variants[variant];
  return v.places.filter((pid) =>
    heldAttrs.every((a) => matchesClue(a, v.clues[a], quest.places[pid].props)),
  );
}

/* ---------------- состояние сессии ---------------- */

export const ROUTES = { SELF: "self", SAMPLE: "after_sample", TOGETHER: "together", AUTO: "auto" };

export function createSession(quest, variant = "A") {
  return {
    quest,
    variant,
    phase: "prologue",
    clues: {},            // attr -> { route, at }
    witnessState: {},     // charId -> 1 | 2
    visited: {},          // charId -> true
    trust: new Set(),
    basket: [],
    currentWitness: null,
    currentPlace: null,
    itemIdx: 0,
    failCount: 0,
    events: [],
  };
}

export function log(s, type, data = {}) {
  s.events.push({ type, at: Date.now(), ...data });
}

export function clueOf(s, charId) {
  return s.quest.variants[s.variant].assign[charId];
}

export function clueText(s, charId) {
  const attr = clueOf(s, charId);
  return s.quest.variants[s.variant].clues[attr];
}

/** Единственная точка перехода в состояние 2. Речевой шаг ИЛИ поддержанный маршрут. */
export function grantClue(s, charId, route) {
  const attr = clueOf(s, charId);
  if (s.clues[attr]) return false;      // заработанное не отбирается и не выдаётся дважды
  s.witnessState[charId] = 2;
  s.clues[attr] = { route, at: Date.now() };
  log(s, "clue_obtained", { character: charId, attr, route });
  return true;
}

export const heldAttrs = (s) => Object.keys(s.clues);
export const allCluesIn = (s) => heldAttrs(s).length === 3;

export function isTarget(s, placeId) {
  return s.quest.variants[s.variant].target === placeId;
}

/* ---------------- лестница подсказок ---------------- */

/**
 * Таймеры считаются локально и не зависят от сети.
 * Возвращает, что показать при данном времени в сцене.
 */
export function ladderStep(quest, elapsedMs, failedOnce) {
  const L = quest.hintLadder;
  return {
    sample: true,                                   // образец доступен с 0
    together: true,                                 // «сказать вместе» тоже с 0
    hint: failedOnce || elapsedMs >= L.modelPhraseAtMs,
    modelPhrase: elapsedMs >= L.modelPhraseAtMs,
    promoteTogether: elapsedMs >= L.promoteTogetherAtMs,
    auto: elapsedMs >= L.autoAdvanceAtMs,
  };
}
