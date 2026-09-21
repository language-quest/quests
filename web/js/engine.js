// Игровой рантайм: чистая логика, без DOM и без сети.
// Правила выдачи улик существуют здесь в единственном экземпляре (architecture.md §3).

/* ---------------- интент-гейт ---------------- */

/** Нормализация: нижний регистр, без диакритики и пунктуации. */
export function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:«»„“”…—–"']/g, " ")
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

export const words = (s) => normalize(s).split(" ").filter(Boolean);

// Артикли внутри фразы не мешают: «con la cuerda» = «con cuerda». Убираем с обеих сторон.
export const ARTICLES = new Set(["el","la","los","las","un","una"]);
const noArticles = (ws) => { const r = ws.filter((w) => !ARTICLES.has(w)); return r.length ? r : ws; };

// Определённый артикль выдаёт подлежащее: «el lobo» — это волк, о котором речь,
// а «lobo» без артикля — тот, к кому обращаются. Неопределённый такой силы не имеет,
// иначе «un poco más alto» лишилось бы своего «poco».
const DEFINITE = new Set(["el","la","los","las"]);

/** Слова без артиклей плюс отметка «перед этим словом стоял определённый артикль». */
function tokenize(s) {
  const raw = words(s);
  const toks = [], articled = [];
  let def = false;
  for (const w of raw) {
    if (ARTICLES.has(w)) { def ||= DEFINITE.has(w); continue; }
    toks.push(w); articled.push(def); def = false;
  }
  return toks.length ? { toks, articled } : { toks: raw, articled: raw.map(() => false) };
}

/**
 * Фонетический ключ: ASR путает не буквы, а звуки («bulder» → «bullber»).
 * Двойные буквы, b/v, h, k/qu/c, z/c/s, g/j сводятся к одному представителю.
 */
function phon(w) {
  return w
    .replace(/(.)\1+/g, "$1")
    .replace(/qu/g, "k").replace(/c(?=[aou]|$)/g, "k").replace(/c(?=[ei])/g, "s").replace(/z/g, "s")
    .replace(/g(?=[ei])/g, "j").replace(/v/g, "b").replace(/h/g, "");
}

/** Схожесть отдельных СЛОВ: по буквам или по звучанию. Короткие слова — только точное совпадение. */
function wordSim(a, b) {
  if (a === b) return 1;
  if (a.length <= 3 || b.length <= 3) return 0;
  const pa = phon(a), pb = phon(b);
  const byLetters = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const bySound = pa.length <= 3 || pb.length <= 3 ? (pa === pb ? 1 : 0)
    : 1 - levenshtein(pa, pb) / Math.max(pa.length, pb.length);
  return Math.max(byLetters, bySound);
}
const WORD_MIN = 0.82;   // "despasio"~"despacio" = 0.875 проходит, "espacio" = 0.75 нет

// Общая основа: «buscar» и «buscamos» — одно слово в разных лицах, wordSim их не роднит
// (0.63). Пяти звуков хватает, чтобы спряжение совпало, а «solo»/«sola» не слиплись.
const STEM_MIN = 5;
const sameFamily = (a, b) =>
  wordSim(a, b) >= WORD_MIN ||
  (Math.min(a.length, b.length) >= STEM_MIN &&
    phon(a).slice(0, STEM_MIN) === phon(b).slice(0, STEM_MIN));

/** Словарь варианта: все слова всех его шаблонов. Строится из тех же данных, что и гейт. */
function vocabularies(speechFunctions) {
  return Object.fromEntries(Object.entries(speechFunctions).map(([fn, def]) => {
    const set = new Set();
    for (const raw of def.accept) for (const w of words(raw)) set.add(w);
    return [fn, [...set]];
  }));
}

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

// Сколько бесплатных слов разрешено вставить внутрь шаблона: «dame un poco más de
// cuerda» — это три вставки между «dame» и «cuerda». Больше — фраза уже не про шаблон,
// а про что-то своё, куда его слова попали случайно.
const GAP_MAX = 3;

/**
 * Ищет шаблон в распознанном.
 *
 * Три попытки, в порядке убывающей строгости; первая же удача выигрывает, поэтому
 * точное совпадение всегда предпочтительнее натянутого.
 *   1. непрерывная последовательность слов;
 *   2. однословный шаблон, разрезанный ASR пополам («bul der» = «bulder»);
 *   3. последовательность с разрывами, но разорвать её могут ТОЛЬКО бесплатные слова —
 *      вежливость, обращения и собственный словарь варианта (isFree). Отрицания
 *      бесплатными не бывают, иначе «no» уехало бы внутрь окна мимо проверки C.
 */
function findPattern(toks, pat, isFree) {
  for (let i = 0; i + pat.length <= toks.length; i++) {
    let ok = true;
    for (let j = 0; j < pat.length; j++) {
      if (wordSim(toks[i + j], pat[j]) < WORD_MIN) { ok = false; break; }
    }
    if (ok) return { at: i, len: pat.length, gaps: 0 };
  }
  // ASR режет длинное слово пополам: «bul der» = «bulder». Только для однословных шаблонов.
  if (pat.length === 1 && pat[0].length >= 5) {
    for (let i = 0; i + 1 < toks.length; i++) {
      if (wordSim(toks[i] + toks[i + 1], pat[0]) >= WORD_MIN) return { at: i, len: 2, gaps: 0 };
    }
  }
  if (pat.length < 2 || !isFree) return null;
  for (let i = 0; i < toks.length; i++) {
    if (wordSim(toks[i], pat[0]) < WORD_MIN) continue;
    let j = 1, k = i + 1, gaps = 0;
    while (j < pat.length && k < toks.length) {
      if (wordSim(toks[k], pat[j]) >= WORD_MIN) { j++; k++; continue; }
      if (gaps >= GAP_MAX || !isFree(toks[k], k)) break;
      gaps++; k++;
    }
    if (j === pat.length) return { at: i, len: k - i, gaps };
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
 *      ("no te oigo", "no entiendo");
 *   D. глагол, перед которым стоит подлежащее с определённым артиклем, — это третье
 *      лицо, а не императив: «el lobo habla más alto» рассказывает о волке, а не
 *      просит говорить громче. Там же и обращение теряет силу: «el lobo» — не оклик.
 *
 * Посторонним считается только слово, чужое варианту. Игрок свободно пересобирает
 * его собственные формулы: «sí por supuesto vamos a buscar juntos» — это «sí por
 * supuesto» плюс слова из соседних шаблонов того же варианта, а не три лишних слова.
 * Бюджет в одно постороннее слово остаётся: он и отделяет вариант от вариантов-соседей.
 *
 * @returns {{fn:string, score:number, matched:string[], pattern:string, strays:string[]}|null}
 */
export function matchIntent(transcript, speechFunctions, lex = {}) {
  const { toks, articled } = tokenize(transcript);
  if (!toks.length) return null;
  const ext = (base, extra) => (extra?.length ? new Set([...base, ...extra.map((w) => normalize(w))]) : base);
  const fillers = ext(FILLERS, lex.fillers);
  // Обращение по имени — само по себе адресация: «Más alto, Lolo».
  const markers = ext(MARKERS, [...(lex.markers ?? []), ...(lex.vocatives ?? [])]);
  const vocatives = new Set((lex.vocatives ?? []).map((w) => normalize(w)));
  /**
   * D. Обращается ли слово к собеседнику на самом деле.
   * Оклик — без артикля: «Lolo, más alto», но «el lobo» — это волк, о котором речь.
   * Глагол — без подлежащего перед ним: «habla más alto» просит, «el lobo habla más
   * alto» рассказывает. Про подлежащее спрашиваем только у глаголов: в паках маркерами
   * записаны и существительные («la pared roja»), у них артикль ничего не меняет.
   * Слово, не прошедшее проверку, теряет силу дважды: и как признак адресации,
   * и как бесплатная добавка к остатку.
   */
  const addresses = (w, i) =>
    markers.has(w) && (vocatives.has(w)
      ? !articled[i]
      : !(IMPERATIVE.has(w) && i > 0 && articled[i - 1]));
  const vocab = vocabularies(speechFunctions);

  let best = null;
  for (const [fn, def] of Object.entries(speechFunctions)) {
    const own = vocab[fn];
    // Бесплатное слово: вежливость, обращение или слово из словаря самого варианта.
    const isFree = (w, i) =>
      fillers.has(w) || addresses(w, i) || own.some((v) => sameFamily(w, v));
    // Внутрь шаблона отрицание не пускаем ни под каким видом: «nada» числится и вежливым
    // остатком, и отрицанием, а спрятавшись в окне оно проскочило бы мимо проверки C.
    const isGapFree = (w, i) => !NEGATIONS.has(w) && isFree(w, i);
    for (const raw of def.accept) {
      const pat = noArticles(words(raw));
      if (!pat.length) continue;
      const found = findPattern(toks, pat, isGapFree);
      if (!found) continue;

      // D. «el lobo habla» — подлежащее плюс глагол, то есть третье лицо. Просьбу так
      // не строят: перед императивом стоит либо ничего, либо оклик без артикля.
      if (IMPERATIVE.has(pat[0]) && found.at > 0 && articled[found.at - 1]) continue;

      const patIsNegative = NEGATIONS.has(pat[0]);
      const rest = toks.map((w, i) => [w, i]).filter(([, i]) => i < found.at || i >= found.at + found.len);

      // C. отрицание вне отрицательного шаблона
      if (!patIsNegative && rest.some(([w]) => NEGATIONS.has(w))) continue;

      // остаток: вежливые слова, обращения и собственный словарь варианта бесплатны,
      // одно постороннее прощаем (ошибки ASR)
      const strays = rest.filter(([w, i]) => !isFree(w, i)).map(([w]) => w);

      // B. обращение к собеседнику
      const addressed = strays.length === 0
        || pat.some((w) => IMPERATIVE.has(w))
        || toks.some((w, i) => addresses(w, i));
      if (!addressed) continue;

      if (strays.length > 1) continue;

      // При равном счёте выигрывает длинный шаблон, а при равной длине — тот, что лёг
      // без разрывов: натянутое совпадение не должно перебивать точное.
      const score = (pat.length + 1) / (pat.length + 1 + strays.length);
      const better = !best || score > best.score
        || (score === best.score && pat.length > best.len)
        || (score === best.score && pat.length === best.len && found.gaps < best.gaps);
      if (better) {
        // matched — токены ИЗ РАСПОЗНАННОГО, которые совпали с шаблоном; pattern — сам
        // авторский шаблон. Оба нужны словарю: когда ASR выдал мусор («bullber»),
        // засчитать слово можно по шаблону, а когда шаблон длинный — по токенам.
        best = { fn, score, len: pat.length, pattern: raw, gaps: found.gaps,
                 matched: toks.slice(found.at, found.at + found.len), strays };
      }
    }
  }
  return best
    ? { fn: best.fn, score: best.score, matched: best.matched, pattern: best.pattern, strays: best.strays }
    : null;
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
