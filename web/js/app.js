import { setupQuestNavigation } from "./quest-navigation.js";
import {
  createSession, matchIntent, matchChildWord, grantClue, clueOf, clueText,
  heldAttrs, allCluesIn, isTarget, ladderStep, survivors, log, ROUTES,
} from "./engine.js";
import { say, stopSpeaking, unlockAudio, listenParent, listenChild,
         asrAvailable, childAsrAvailable, probeSlng, slng } from "./speech.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

/* ================= строки интерфейса =================
   Весь UI по-испански. Один словарь — чтобы вернуть второй язык
   или добавить переключатель было одной правкой. */
const T = {
  forAdult: "para el adulto",
  voiceSlng: (m) => `voz: SLNG · ${m}`,
  voiceBrowser: "voz: navegador",
  voiceTitleOn: (stt, tts) => `STT ${stt} · TTS ${tts}. El micrófono del niño está desactivado.`,
  voiceTitleOff: (why) => `SLNG no disponible (${why}) — voz del navegador.`,

  start: "▶︎ Empezar — ¡Hola, bosque!",
  listen: "🔊 Escuchar",
  listenPhrase: "🔊 Escuchar la frase",
  listenHint: "🔊 Escuchar la pista",
  sayTogether: "🗣 Decirlo juntos",
  speak: "🎤 Hablar",
  sayWord: "🎤 Di la palabra",
  putByTouch: "👆 Ponerlo con el dedo",
  againSlow: "🔊 Otra vez, despacio",
  next: "Seguir →",
  skip: "Saltar →",
  back: "← Volver",
  backToWitnesses: "← A los testigos",
  backToMap: "← Volver al mapa",
  toMap: "🗺 Al mapa",
  openMap: "🗺 Abrir el mapa",
  finish: "¡Adiós, bosque! — terminar",
  playAgain: "Jugar otra vez",

  title: "La cesta de Caperucita",
  subtitle: "Aventura para un adulto y un niño de 3 a 4 años",
  ritualHint: "Ritual de entrada. Pulsad juntos — también enciende el sonido.",
  waveTogether: "Saludad al bosque y decid juntos: ¡Hola, bosque!",
  liftBasket: "Levanta la cesta con el dedo",
  whoWasThere: "¿Quién estaba en el bosque?",
  cluesOf: (n) => `Pistas: ${n} de 3. Podéis visitar a los testigos en cualquier orden.`,
  allCluesIn: "Tres pistas reunidas — el mapa se ha abierto.",
  enoughNow: "Ya sabemos suficiente.",
  chooseWitness: "Elige a quién visitar",
  mapLocked: "El mapa está en la niebla: se abre con las tres pistas.",
  firstChild: (a) => `Primero el niño: «${a}». El personaje hablará después.`,
  askInMic: "Dilo al micrófono o pulsa «Decirlo juntos».",
  askNoMic: "No hay micrófono — pulsa «Decirlo juntos».",
  saySimply: (f) => `Di: «${f}»`,
  listening: "escuchando…",
  notHeard: "no te he oído — prueba «Decirlo juntos»",
  heardPrefix: "he oído: ",
  ambientWhileAdult: (a) => `${a} — mientras el adulto habla`,
  touchWhatSaw: "Toca lo que vio el testigo",
  childCounts: "El niño cuenta en voz alta:",
  listenStream: "🔊 Escuchar el arroyo",
  listenWind: "🔊 Escuchar el viento",
  smellFlowers: "🌼 Oler las flores",
  checkEach: (n) => `Comprobad cada sitio por las tres señales. Sitios posibles: ${n}.`,
  mapQuestions: "¿Se oye el agua? ¿Cuántos árboles hay? ¿Huele a flores?",
  touchPlace: "Toca un sitio para oírlo y mirarlo",
  goThere: "¡Vamos allí!",
  notHere: "¡Aquí no!",
  oops: "¡Uy! Aquí no es — volvemos al mapa",
  findWhere: (it) => `Encuentra dónde está ${it}`,
  explainToChild: "Explícaselo al niño — solo él toca la pantalla.",
  childSaysAloud: "El niño dice el hallazgo en voz alta. La voz brilla más, pero no es obligatoria.",
  basket: "La cesta:",
  callLolo: "Llama a Lolo a la mesa",
  loloComesIn: "¡Lolo entra solo — confía en vosotros!",
  missionDone: "Misión cumplida",
  cluesBy: (r) => `Pistas obtenidas — ${r}`,
  stats: (f, e) => `Elecciones erróneas en el mapa: ${f} · eventos registrados: ${e}`,
  footer: "Language Quests · demo · variante A",
  dileConmigo: (w) => `🗣 Dilo conmigo: ¡${w}!`,
};

const ART = (f) => `../assets/caperucita/web/${String(f).replace(/\.png$/, ".jpg")}`;

setupQuestNavigation({
  isInProgress: () => S && !["prologue", "finale"].includes(S.phase),
  onLeave: () => { sceneToken++; activeListen?.cancel?.(); pendingTransition = null; clearInterval(ladderTimer); stopSpeaking(); },
});

let Q, S;
let sceneStart = 0, failedOnce = false, ladderTimer = null, speaking = false;
let pendingTransition = null;
let fitPending = false;
let lastStepSig = "";
// Запись живёт не дольше своей сцены: при переходе отменяется, а запоздавшие
// результаты отбрасываются по токену. Иначе окно записи переживёт переход
// и в него попадёт голос ребёнка (architecture.md §5).
let activeListen = null;
let sceneToken = 0;
let sampleHeard = false;   // образец реально прослушан (для метрики маршрута)

/* ================= загрузка ================= */
const res = await fetch("../assets/caperucita/quest.json");
Q = await res.json();
S = createSession(Q, "A");
await probeSlng();
showEngine();
render();

/** Видно, через что идёт голос: полезно на демо и при отладке. */
function showEngine() {
  const n = $("engine");
  if (!n) return;
  n.textContent = slng.ready ? T.voiceSlng(slng.ttsModel?.split("/").slice(-2).join("/") ?? "tts") : T.voiceBrowser;
  n.style.color = slng.ready ? "var(--moss)" : "var(--muted)";
  n.title = slng.ready
    ? T.voiceTitleOn(slng.sttModel, slng.ttsModel)
    : T.voiceTitleOff(slng.lastError ?? "sin clave");
}

/* ================= каркас ================= */

function setParent({ who, quirk, es, ru: sub, hint, controls = [], heard = "" }) {
  $("who").textContent = who ?? T.title;
  $("quirk").textContent = quirk ?? "";
  $("cap").textContent = es ?? "";
  $("capru").textContent = sub ?? "";
  const h = $("hint");
  h.hidden = !hint;
  if (hint) h.textContent = hint;
  const c = $("controls");
  c.innerHTML = "";
  controls.forEach((b) => c.appendChild(b));
  $("heard").textContent = heard;
}

function button(label, cls, onClick, disabled = false) {
  const b = el("button", "btn " + (cls || ""), label);
  b.disabled = disabled;
  b.onclick = onClick;
  return b;
}

/** Сцена с картинкой и хит-зонами. */
function stage(art, zones = [], bubble = null) {
  const st = el("div", "stage");
  const img = el("img");
  img.src = ART(art);
  img.alt = "";
  // Первый замер может пройти до раскладки картинки — пересчитываем по её загрузке.
  img.addEventListener("load", scheduleFit);
  st.appendChild(img);
  zones.forEach((z) => {
    const d = el("button", "zone " + (z.cls || ""));
    d.style.left = z.zone.x * 100 + "%";
    d.style.top = z.zone.y * 100 + "%";
    d.style.width = z.zone.w * 100 + "%";
    d.style.height = z.zone.h * 100 + "%";
    d.setAttribute("aria-label", z.label || "");
    if (z.num) d.appendChild(el("span", "num", String(z.num)));
    d.onclick = (e) => { e.stopPropagation(); z.onClick?.(d); };
    st.appendChild(d);
  });
  if (bubble) st.appendChild(el("div", "bubble", bubble));
  return st;
}

/**
 * Сцена обязана оставаться ровно 3:2 — иначе нормализованные хит-зоны разъедутся.
 * Поэтому подгоняем её ШИРИНУ под доступную высоту, а не режем высоту.
 */
function fitStage() {
  const st = document.querySelector(".stage");
  if (!st) return;
  st.style.width = "";
  const app = document.querySelector(".app");
  const wrapW = st.parentElement.clientWidth;
  const nonStage = app.scrollHeight - st.offsetHeight;
  const avail = window.innerHeight - nonStage - 12;
  const w = Math.max(260, Math.min(wrapW, avail * 1.5));
  st.style.width = Math.floor(w) + "px";
}
/**
 * Пересчёт на нескольких тиках: картинка может прийти из кэша (тогда её `load`
 * уже не сработает), шрифты — доехать позже. Один rAF эту гонку не закрывает.
 */
function scheduleFit() {
  if (fitPending) return;
  fitPending = true;
  requestAnimationFrame(() => { fitPending = false; fitStage(); });
  setTimeout(fitStage, 120);
  setTimeout(fitStage, 500);
}
window.addEventListener("resize", scheduleFit);
window.addEventListener("load", scheduleFit);
if (document.fonts?.ready) document.fonts.ready.then(scheduleFit);

function childBar(text) {
  const b = el("div", "childbar");
  b.appendChild(el("span", "dot"));
  b.appendChild(el("span", null, text));
  return b;
}

function cluePanel() {
  const wrap = el("div", "clues");
  const v = Q.variants[S.variant];
  const ICON = { water: "💧", trees: "🌳", flowers: "🌼" };
  for (const attr of ["water", "trees", "flowers"]) {
    const got = !!S.clues[attr];
    const c = el("div", "clue" + (got ? " got" : ""));
    c.appendChild(el("span", "ic", ICON[attr]));
    const clue = v.clues[attr];
    let label;
    if (!got) label = "?";
    else if (attr === "trees") label = `${clue.value === 2 ? "dos" : "tres"} árboles`;
    else if (clue.polarity === "negative") label = `<span class="neg">${Q.attributes[attr].chipEs}</span>`;
    else label = Q.attributes[attr].chipEs;
    c.appendChild(el("span", null, label));
    wrap.appendChild(c);
  }
  return wrap;
}

/** Реплика персонажа: пока говорит — переходы откладываются, безопасные тапы работают. */
async function speak(text, opts) {
  speaking = true;
  await say(text, opts);
  speaking = false;
  if (pendingTransition) { const f = pendingTransition; pendingTransition = null; f(); }
}
function transition(fn) {
  if (speaking) pendingTransition = fn; else fn();
}

/* ================= рендер ================= */

function render() {
  const m = $("main");
  m.innerHTML = "";
  clearInterval(ladderTimer); ladderTimer = null;
  sceneToken++;
  if (activeListen) { try { activeListen.cancel?.(); } catch {} activeListen = null; }
  ({
    prologue: rPrologue, wind: rWind, hub: rHub, witness: rWitness,
    map: rMap, fail: rFail, search: rSearch, finale: rFinale,
  })[S.phase](m);
  scheduleFit();
}

/* ---------- пролог ---------- */
function rPrologue(m) {
  setParent({
    es: "¡Hola, bosque!",
    ru: T.ritualHint,
    controls: [button(T.start, "primary", () => {
      unlockAudio();
      speak(Q.scenes.prologue.ritualEs, { rate: 0.9 });
      log(S, "session_start");
      setTimeout(() => { S.phase = "wind"; render(); }, 900);
    })],
  });
  m.appendChild(stage(Q.scenes.prologue.art, [], "¡Hola, bosque!"));
  m.appendChild(childBar(T.waveTogether));
}

/* ---------- ветер ---------- */
function rWind(m) {
  const sc = Q.scenes.wind;
  setParent({
    who: "Caperucita",
    es: sc.lineEs, ru: T.liftBasket,
    controls: [
      button(T.listen, "", () => say(sc.lineEs)),
      button(T.next, "primary", () => { S.phase = "hub"; render(); }),
    ],
  });
  m.appendChild(stage(sc.art, [{
    zone: { x: 0.36, y: 0.52, w: 0.28, h: 0.34 }, cls: "pulse", label: "la cesta",
    onClick: (d) => { d.classList.add("found"); say("La cesta está vacía."); },
  }], sc.lineEs));
  m.appendChild(childBar(T.liftBasket));
  m.appendChild(cluePanel());
  speak(sc.lineEs);
}

/* ---------- хаб: выбор свидетеля ---------- */
function rHub(m) {
  const done = heldAttrs(S).length;
  setParent({
    es: done < 3 ? T.whoWasThere : T.enoughNow,
    ru: done < 3
      ? T.cluesOf(done)
      : T.allCluesIn,
    controls: done >= 3 ? [button(T.openMap, "primary", () => { S.phase = "map"; render(); })] : [],
  });

  m.appendChild(cluePanel());
  const g = el("div", "grid");
  for (const cid of ["lolo", "rita", "otto"]) {
    const ch = Q.characters[cid];
    const got = !!S.clues[clueOf(S, cid)];
    const art = cid === "lolo" ? ch.art.hidden : cid === "rita" ? ch.art.witness : ch.art.asleep;
    const c = el("button", "card" + (got ? " done" : ""));
    const i = el("img"); i.src = ART(art); i.alt = ""; c.appendChild(i);
    const b = el("div", "body");
    b.appendChild(el("div", "t", ch.nameEs));
    b.appendChild(el("div", "s", ch.quirkEs));
    c.appendChild(b);
    c.onclick = () => { if (!got) { S.currentWitness = cid; S.phase = "witness"; render(); } };
    c.disabled = got;
    g.appendChild(c);
  }
  m.appendChild(g);

  if (done < 3) {
    m.appendChild(childBar(T.chooseWitness));
    const lock = el("div", "sub");
    lock.style.marginTop = "6px";
    lock.textContent = T.mapLocked;
    m.appendChild(lock);
  }
}

/* ---------- сцена свидетеля ---------- */
function rWitness(m) {
  const cid = S.currentWitness;
  const ch = Q.characters[cid];
  const attr = clueOf(S, cid);
  const fnKey = ch.speechFunction;
  const fn = Q.speechFunctions[fnKey];
  const clue = clueText(S, cid);

  if (S.witnessState[cid] !== 2) S.witnessState[cid] = 1;
  const opened = S.visited[cid];
  if (S.sceneOwner !== cid) { sceneStart = Date.now(); failedOnce = false; sampleHeard = false; S.sceneOwner = cid; }
  lastStepSig = "";

  const art = cid === "lolo"
    ? (S.witnessState[cid] === 2 ? ch.art.reassured : opened ? ch.art.butterfly : ch.art.hidden)
    : cid === "rita" ? ch.art.witness
    : (opened || S.witnessState[cid] === 2 ? ch.art.awake : ch.art.asleep);

  const zones = [];
  if (!opened) {
    zones.push({
      zone: ch.childAction.zone, cls: "pulse", label: ch.childAction.labelEs,
      onClick: () => {
        S.visited[cid] = true;
        if (cid === "lolo") S.trust.add("shooed_butterfly");
        log(S, "child_action", { character: cid });
        render();
      },
    });
  } else if (S.witnessState[cid] !== 2 && ch.ambientZone) {
    // Фоновое действие: ребёнку есть чем заняться, пока взрослый добывает улику.
    // Сцену НЕ двигает и диалог не сбрасывает — политика «немедленно» из architecture.md §10.2.
    zones.push({
      zone: ch.ambientZone, label: ch.ambientActionEs,
      onClick: (node) => {
        node.classList.add("lit");
        setTimeout(() => node.classList.remove("lit"), 320);
        if (cid === "lolo") S.trust.add("petted_lolo");
        log(S, "ambient_action", { character: cid });
        say(ch.ambientSayEs, { rate: 0.9, volume: 0.5 });
      },
    });
  }

  const state2 = S.witnessState[cid] === 2;
  const bubble = state2 ? clue.es : opened ? ch.state1.es : "…";

  m.appendChild(stage(art, zones, bubble));
  m.appendChild(childBar(
    state2 ? T.touchWhatSaw : opened ? T.ambientWhileAdult(ch.ambientActionEs) : ch.childAction.labelEs,
  ));
  m.appendChild(cluePanel());

  if (state2) return renderClueGiven(m, cid, clue, attr);

  if (!opened) {
    setParent({
      who: ch.nameEs, quirk: ch.quirkEs,
      es: "…", ru: T.firstChild(ch.childAction.labelEs),
      controls: [button(T.back, "", () => { S.phase = "hub"; render(); })],
    });
    return;
  }

  // состояние 1: вступление без признака. Признака нет в тексте вообще.
  speak(ch.state1.es, { rate: cid === "rita" ? 1.5 : 0.95, volume: cid === "lolo" ? 0.35 : 1 });
  paintLadder(m, cid, fnKey, fn, ch);
  ladderTimer = setInterval(() => paintLadder(m, cid, fnKey, fn, ch), 1000);
}

function paintLadder(m, cid, fnKey, fn, ch) {
  if (S.phase !== "witness" || S.witnessState[cid] === 2) return;
  const elapsed = Date.now() - sceneStart;
  const step = ladderStep(Q, elapsed, failedOnce);

  if (step.auto) {
    clearInterval(ladderTimer);
    doGrant(cid, ROUTES.AUTO);
    return;
  }

  // Пересобираем панель только когда ступень реально изменилась:
  // иначе кнопки пересоздаются каждую секунду и теряют фокус под пальцем.
  const sig = `${cid}|${step.hint}|${step.modelPhrase}|${step.promoteTogether}`;
  if (sig === lastStepSig) return;
  lastStepSig = sig;

  const controls = [];
  if (asrAvailable()) controls.push(micButton(cid, fnKey, fn, ch));
  controls.push(button(T.listenPhrase, "", () => { sampleHeard = true; say(fn.canonical, { rate: 0.85 }); }));
  controls.push(button(T.sayTogether, step.promoteTogether ? "primary" : "", async () => {
    await say(fn.canonical, { rate: 0.8 });
    doGrant(cid, ROUTES.TOGETHER);
  }));
  controls.push(button(T.back, "", () => { clearInterval(ladderTimer); S.phase = "hub"; render(); }));

  setParent({
    who: ch.nameEs, quirk: ch.quirkEs,
    es: fn.canonical,
    ru: `${fn.labelEs}. ${asrAvailable() ? T.askInMic : T.askNoMic}`,
    hint: step.hint
      ? (step.modelPhrase ? `Caperucita: ${T.saySimply(fn.canonical)}` : T.saySimply(fn.canonical))
      : null,
    controls,
    heard: $("heard").textContent,
  });
}

function micButton(cid, fnKey, fn, ch) {
  const b = button(T.speak, "mic", () => {
    if (activeListen) return;                    // одна активная запись
    const myToken = sceneToken;
    const stale = () => myToken !== sceneToken;  // сцену сменили — результат не наш
    b.classList.add("live");
    $("heard").textContent = T.listening;
    activeListen = listenParent({
      onResult: (text, isFinal) => {
        if (stale()) return;
        $("heard").textContent = (isFinal ? T.heardPrefix : "…") + text;
        if (!isFinal) return;
        const hit = matchIntent(text, Q.speechFunctions, Q.intentLexicon);
        if (hit && hit.fn === fnKey) {
          doGrant(cid, sampleHeard ? ROUTES.SAMPLE : ROUTES.SELF);
        } else {
          failedOnce = true;
          log(S, "intent_miss", { character: cid, heard: text });
          say(cid === "lolo" ? "No hablo fuerte…" : cid === "rita" ? "¿Cómo?" : "Mmm…");
        }
      },
      onEnd: () => { activeListen = null; if (!stale()) b.classList.remove("live"); },
      onError: (e) => {
        activeListen = null;
        if (stale()) return;
        b.classList.remove("live");
        failedOnce = true;
        $("heard").textContent = e === "mic-denied" ? T.askNoMic : T.notHeard;
      },
    });
  });
  return b;
}

function doGrant(cid, route) {
  clearInterval(ladderTimer); ladderTimer = null;
  grantClue(S, cid, route);
  const clue = clueText(S, cid);
  render();
  // Выдача улики всегда звучит разборчиво — характер персонажа её не перебивает.
  speak(clue.es, { rate: 0.95, volume: 1 }).then(() => say(clue.es, { rate: 0.6 }));
}

/* ---------- улика выдана: действие на закрепление ---------- */
function renderClueGiven(m, cid, clue, attr) {
  const ch = Q.characters[cid];
  const v = Q.variants[S.variant];
  const kind = v.reinforce[cid];
  const done = allCluesIn(S);

  setParent({
    who: ch.nameEs, quirk: ch.quirkEs,
    es: clue.es,
    controls: [
      button(T.againSlow, "", () => say(clue.es, { rate: 0.6 })),
      button(done ? T.toMap : T.backToWitnesses, "primary", () => {
        S.phase = done ? "map" : "hub"; render();
      }),
    ],
  });

  const box = el("div", "row");
  box.style.marginTop = "2px";
  if (kind.startsWith("count")) {
    const n = kind === "count-2" ? 2 : 3;
    let counted = 0;
    const b = el("div", "checks");
    for (let i = 1; i <= n; i++) {
      const c = el("button", "chk", "🌳");
      c.onclick = () => {
        if (c.classList.contains("yes")) return;
        counted++;
        c.classList.add("yes");
        c.textContent = ["uno", "dos", "tres"][counted - 1];
        say(["uno", "dos", "tres"][counted - 1], { rate: 0.8 });
      };
      b.appendChild(c);
    }
    box.appendChild(el("span", "sub", T.childCounts));
    box.appendChild(b);
  } else {
    const label = kind === "river" ? T.listenStream
      : kind === "wind-leaves" ? T.listenWind : T.smellFlowers;
    box.appendChild(button(label, "", () => say(kind === "petals" ? "Flores" : "Agua", { rate: 0.8 })));
  }
  m.appendChild(box);
}

/* ---------- карта ---------- */
function rMap(m) {
  const v = Q.variants[S.variant];
  if (!allCluesIn(S)) {
    setParent({ es: Q.scenes.mapLocked.lineEs, ru: T.mapLocked,
      controls: [button(T.backToWitnesses, "primary", () => { S.phase = "hub"; render(); })] });
    m.appendChild(stage(Q.scenes.mapLocked.art, [], Q.scenes.mapLocked.lineEs));
    return;
  }

  const left = survivors(Q, S.variant, heldAttrs(S)).length;
  setParent({
    es: T.mapQuestions,
    ru: T.checkEach(left),
    controls: [button(T.backToWitnesses, "", () => { S.phase = "hub"; render(); })],
  });
  m.appendChild(cluePanel());

  const g = el("div", "grid");
  for (const pid of v.places) {
    const p = Q.places[pid];
    const c = el("div", "card");
    c.style.cursor = "default";
    const i = el("img"); i.src = ART(p.art); i.alt = ""; c.appendChild(i);
    const b = el("div", "body");
    b.appendChild(el("div", "t", p.nameEs));


    const checks = el("div", "checks");
    // Признак не показывается заранее: чип — это вопрос, ответ появляется по касанию.
    const mk = (label, reveal, sound, answer = null) => {
      const k = el("button", "chk", label);
      k.onclick = () => {
        if (k.dataset.done) return;
        k.dataset.done = "1";
        k.classList.add(reveal ? "yes" : "no");
        k.textContent = answer ?? (reveal ? label + " ✓" : label + " ✗");
        if (sound) say(sound, { rate: 0.85 });
      };
      return k;
    };
    checks.appendChild(mk("💧 agua", p.props.water, p.props.water ? "Se oye el agua" : "No se oye el agua"));
    checks.appendChild(mk("🌳 ?", true, p.props.trees === 2 ? "dos" : "tres", `🌳 ${p.props.trees}`));
    checks.appendChild(mk("🌼 flores", p.props.flowers, p.props.flowers ? "Huele a flores" : "No huele a flores"));
    b.appendChild(checks);

    const go = button(T.goThere, "primary", () => {
      log(S, "place_selected", { place: pid, correct: isTarget(S, pid) });
      if (isTarget(S, pid)) { S.currentPlace = pid; S.phase = "search"; }
      else { S.currentPlace = pid; S.failCount++; S.phase = "fail"; }
      render();
    });
    go.style.marginTop = "8px";
    b.appendChild(go);
    c.appendChild(b);
    g.appendChild(c);
  }
  m.appendChild(g);
  m.appendChild(childBar(T.touchPlace));
}

/* ---------- смешной провал ---------- */
function rFail(m) {
  const p = Q.places[S.currentPlace];
  setParent({
    es: T.notHere, ru: p.failEs ?? "",
    controls: [button(T.backToMap, "primary", () => { S.phase = "map"; render(); })],
  });
  m.appendChild(stage(p.failArt, [], p.failEs ?? T.notHere));
  m.appendChild(childBar(T.oops));
  const failToken = sceneToken;
  setTimeout(() => { if (S.phase === "fail" && failToken === sceneToken) { S.phase = "map"; render(); } }, 5200);
}

/* ---------- поиск ---------- */
function rSearch(m) {
  const v = Q.variants[S.variant];
  const items = Q.search.items;
  if (S.itemIdx >= items.length) { S.phase = "finale"; render(); return; }
  const item = items[S.itemIdx];
  const spots = Q.search.spots;
  let revealed = false;

  const zones = spots.map((sp) => ({
    zone: sp.zone,
    cls: S.basket.includes(sp.id) ? "found" : "",
    label: sp.nameEs,
    onClick: (node) => {
      if (revealed) return;
      if (sp.id !== item.spot) { node.classList.add("lit"); setTimeout(() => node.classList.remove("lit"), 450); return; }
      revealed = true;
      node.classList.add("found");
      S.basket.push(sp.id);
      log(S, "search_find", { item: item.id });
      askChildWord(item);
    },
  }));

  setParent({
    who: "Caperucita",
    es: item.hintEs, ru: T.explainToChild,
    controls: [
      button(T.listenHint, "", () => say(item.hintEs, { rate: 0.85 })),
      button(T.skip, "", () => { S.itemIdx++; render(); }),
    ],
  });

  m.appendChild(stage(v.searchArt, zones, item.hintEs));
  m.appendChild(childBar(T.findWhere(item.es)));
  m.appendChild(basketRow());
  say(item.hintEs, { rate: 0.9 });

  function askChildWord(it) {
    let settled = false;
    const finish = (route) => {
      if (settled) return; settled = true;
      log(S, "child_utterance", { target: it.id, route });
      say(`¡${it.es}!`, { rate: 0.85 });
      setTimeout(() => { S.itemIdx++; render(); }, 900);
    };
    const controls = [];
    if (childAsrAvailable()) {
      const b = button(T.sayWord, "mic", () => {
        b.classList.add("live");
        listenChild({
          onResult: (t, f) => { if (f && matchChildWord(t, it.es, Q.childVoice.matchThreshold)) finish("voice"); },
          onEnd: () => b.classList.remove("live"),
          onError: () => b.classList.remove("live"),
          maxMs: 6000,
        });
      });
      controls.push(b);
    }
    controls.push(button(T.dileConmigo(it.es), "primary", async () => {
      await say(`${it.es}`, { rate: 0.75 }); finish("together");
    }));
    controls.push(button(T.putByTouch, "", () => finish("tap")));
    setParent({
      who: "Caperucita", es: `¡${it.es}!`, ru: T.childSaysAloud,
      controls,
    });
  }
}

function basketRow() {
  const r = el("div", "basket");
  r.appendChild(el("span", null, T.basket));
  Q.search.items.forEach((it) => {
    const got = S.basket.includes(it.spot);
    const s = el("div", "slot" + (got ? " full" : ""), got ? ({ pan: "🥖", queso: "🧀", manzana: "🍎" })[it.id] : "");
    r.appendChild(s);
  });
  return r;
}

/* ---------- финал ---------- */
function rFinale(m) {
  const f = Q.scenes.finale;
  const confident = S.trust.size >= Q.trust.confidentThreshold;
  const art = confident ? f.confident : f.invitation;
  setParent({
    who: "La Abuela", es: f.lineEs,
    controls: [
      button(T.listen, "", () => say(f.lineEs)),
      button(T.finish, "primary", () => {
        say(Q.scenes.goodbye.ritualEs, { rate: 0.9 });
        showReport(m);
      }),
    ],
  });
  m.appendChild(stage(art, [], f.lineEs));
  m.appendChild(childBar(confident ? T.loloComesIn : T.callLolo));
  m.appendChild(basketRow());
  speak(f.lineEs);
}

function showReport(m) {
  const routes = Object.entries(S.clues).map(([a, c]) => `${a}: ${c.route}`).join(" · ");
  m.innerHTML = "";
  m.appendChild(stage(Q.scenes.goodbye.art, [], "¡Adiós, bosque!"));
  const card = el("div", "parent");
  card.appendChild(el("div", "title", T.missionDone));
  card.appendChild(el("div", "sub", T.cluesBy(routes)));
  card.appendChild(el("div", "sub", T.stats(S.failCount, S.events.length)));
  const again = button(T.playAgain, "primary", () => {
    S = createSession(Q, "A"); S.phase = "prologue"; render();
  });
  again.style.marginTop = "10px";
  card.appendChild(again);
  m.appendChild(card);
}
