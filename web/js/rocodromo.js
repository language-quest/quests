import { setupQuestNavigation } from "./quest-navigation.js";
// «La ruta secreta» — взрослый квест про скалодром.
// Линейная цепочка сцен; голос берём из общего стека проекта:
// TTS/STT идут через tools/slng-proxy.mjs, интент-гейт — общий с Каперусиной.

import { probeSlng, slng, say, listenParent, unlockAudio, stopSpeaking, asrAvailable } from "./speech.js";
import { matchIntent, normalize } from "./engine.js";
import { art, isArtKey, hasAvatar } from "./rocodromo-art.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const Q = await (await fetch("../assets/rocodromo/quest.json")).json();
const UI = Q.ui;
const SCENES = Q.scenes;
const LAST = SCENES.length - 1;

let idx = sceneFromUrl();
let selected = new Set();   // сцена «equipo»
let activeListen = null;    // окно записи текущей сцены
let sceneToken = 0;         // защита от гонок: ответ ASR из прошлой сцены игнорируем
let gestured = false;       // автозапуск звука до первого жеста браузер всё равно заблокирует

addEventListener("pointerdown", () => { gestured = true; unlockAudio(); }, { once: true });
addEventListener("keydown", () => { gestured = true; unlockAudio(); }, { once: true });

document.title = `${SCENES[idx].eyebrow} · La ruta secreta`;

/* ---------------- маршрутизация ---------------- */

function sceneFromUrl() {
  const raw = new URLSearchParams(location.search).get("scene");
  if (raw === "final") return LAST;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= SCENES.length ? n - 1 : 0;
}

function goto(n, push = true) {
  idx = Math.max(0, Math.min(LAST, n));
  if (push) {
    const value = idx === LAST ? "final" : idx + 1;
    history.pushState({ idx }, "", `${location.pathname}?scene=${value}`);
  }
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

addEventListener("popstate", () => { idx = sceneFromUrl(); render(); });

/* ---------------- голос ---------------- */

const voiceOf = (speakerId) => Q.voices?.[speakerId];
/** Подпись идёт от говорящего: в сцене 2 отвечает не тот, кто задал вопрос. */
const labelOf = (speakerId, fallback) => Q.speakerLabels?.[speakerId] ?? fallback ?? "";

function speak(text, speakerId, opts = {}) {
  if (!text) return;
  unlockAudio();
  say(text, { voice: voiceOf(speakerId), rate: 0.95, ...opts });
}

function showVoz() {
  const el = $("voz");
  el.textContent = slng.ready ? "voz: SLNG" : "voz: navegador";
  el.classList.toggle("on", slng.ready);
  el.title = slng.ready
    ? `TTS ${slng.ttsModel ?? "?"} · STT ${slng.sttModel ?? "?"}`
    : `Sin SLNG: ${slng.lastError ?? "proxy no disponible"} — síntesis y micrófono del navegador`;
}

/** Окно записи. Транскрипт прогоняется через интент-гейт вариантов текущей сцены. */
function micButton(functions, onMatch) {
  const btn = document.createElement("button");
  btn.className = "mic";
  btn.type = "button";

  if (!asrAvailable()) {
    btn.disabled = true;
    btn.innerHTML = `🎙 <span>${esc(UI.speak)}</span>`;
    btn.title = UI.micOff;
    return btn;
  }

  const idle = () => { btn.innerHTML = `🎙 <span>${esc(UI.speak)}</span>`; btn.classList.remove("live"); };
  idle();

  btn.onclick = () => {
    unlockAudio();
    if (activeListen) { activeListen.stop?.(); return; }   // второй клик — закончить и отправить
    stopSpeaking();

    const token = sceneToken;
    btn.classList.add("live");
    btn.innerHTML = `⏹ <span>${esc(UI.speaking)}</span>`;
    heard("…");

    activeListen = listenParent({
      maxMs: 6000,
      onResult: (transcript) => {
        if (token !== sceneToken) return;                  // сцена уже сменилась
        const text = (transcript || "").trim();
        heard(text ? `${UI.heardPrefix} <b>${esc(text)}</b>` : "");
        const hit = text ? matchIntent(text, functions, Q.intentLexicon) : null;
        if (hit) onMatch(hit.fn);
        else feedback(UI.noMatch, false);
      },
      onEnd: () => { if (token === sceneToken) { activeListen = null; idle(); } },
      onError: () => {
        if (token !== sceneToken) return;
        activeListen = null; idle();
        heard("");
        feedback(UI.micOff, false);
      },
    });
  };
  return btn;
}

/* ---------------- мелкие узлы ---------------- */

function heard(html) { const el = $("heardLine"); if (el) el.innerHTML = html; }

/** Строка под вариантами. Только служебные сообщения: «не расслышал», «нет микрофона». */
function feedback(msg, ok) {
  const el = $("feedback");
  if (!el) return;
  el.textContent = msg ?? "";
  el.className = "feedback" + (ok ? " ok" : "");
}

function shake(el) {
  if (!el) return;
  el.classList.add("wrong");
  setTimeout(() => el.classList.remove("wrong"), 300);
}

/**
 * Ответ персонажа занимает место его прошлой реплики.
 * Отдельной строкой внизу он был бы вторым голосом, а наверху оставался бы
 * вопрос, на который уже ответили.
 */
function reply(text, speakerId, label, status, state) {
  const d = $("dialog");
  if (!d || !text) { speak(text, speakerId); feedback(text, status === "ok"); return; }

  d.className = "dialog" + (status ? ` ${status}` : "");
  const old = d.querySelector(".avatar");
  if (hasAvatar(speakerId)) {
    const node = avatarNode(speakerId, state);
    old ? old.replaceWith(node) : d.prepend(node);
  } else if (old) {
    old.remove();
  }
  d.querySelector(".who").textContent = label ?? "";
  d.querySelector(".line").textContent = text;
  const btn = d.querySelector(".speak");
  if (btn) btn.onclick = (e) => { e.stopPropagation(); speak(text, speakerId); };

  d.classList.remove("flash");
  void d.offsetWidth;              // перезапуск анимации на том же узле
  d.classList.add("flash");
  d.scrollIntoView({ block: "nearest", behavior: "smooth" });
  speak(text, speakerId);
}

/** Круглый портрет говорящего. Есть у администраторши, Карлоса и Диего; у Диего — четыре состояния лица. */
function avatarNode(speakerId, state) {
  const span = document.createElement("span");
  span.className = "avatar";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = art(state ? `avatar:${speakerId}:${state}` : `avatar:${speakerId}`);
  return span;
}

function speakBtn(text, speakerId) {
  const b = document.createElement("button");
  b.className = "speak";
  b.type = "button";
  b.textContent = "🔊";
  b.setAttribute("aria-label", UI.listen);
  b.onclick = (e) => { e.stopPropagation(); speak(text, speakerId); };
  return b;
}

/**
 * Порядок карточек случайный на каждый заход в сцену: в авторском паке правильная
 * картинка всегда стояла второй («B»), и пройти четыре сцены можно было не слушая.
 * Буквы A/B/C выдаются по месту, а не по автору — иначе они бы ехали вместе
 * с карточкой и по-прежнему выдавали ответ.
 */
function shuffled(options, pinFirst) {
  const all = options.map((o) => ({ ...o }));
  // pinFirst: сюжетная ошибка Диего («el de la izquierda») обязана указывать на ту же
  // карточку, что и в реплике, поэтому она не участвует в перемешивании.
  const pinned = all.filter((o) => o.id === pinFirst);
  const out = all.filter((o) => o.id !== pinFirst);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  out.unshift(...pinned);
  out.forEach((o, i) => { if (o.art && /^[A-C]$/.test(o.es ?? "")) o.es = "ABC"[i]; });
  return out;
}

function artNode(value) {
  const span = document.createElement("span");
  span.className = "art";
  span.setAttribute("aria-hidden", "true");
  if (isArtKey(value)) span.innerHTML = art(value);
  else span.textContent = value ?? "";
  return span;
}

function progress() {
  const bar = $("progress");
  bar.innerHTML = "";
  SCENES.forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "dot" + (i <= idx ? " on" : "");
    b.type = "button";
    b.title = s.eyebrow;
    b.setAttribute("aria-label", s.eyebrow);
    b.onclick = () => goto(i);
    bar.appendChild(b);
  });
}

function vocabPanel() {
  const d = document.createElement("details");
  d.className = "vocab";
  d.innerHTML = `<summary>${esc(UI.vocab)}</summary><dl>${
    Q.vocabulary.map((v) => `<dt>${esc(v.es)}</dt><dd>${esc(v.ru)}</dd>`).join("")
  }</dl>`;
  return d;
}

/* ---------------- рендер ---------------- */

function render() {
  // Окно записи не должно пережить смену сцены (тот же контракт, что в app.js).
  sceneToken++;
  if (activeListen) { try { activeListen.cancel?.(); } catch {} activeListen = null; }
  stopSpeaking();
  selected = new Set();

  const S = SCENES[idx];
  document.title = `${S.eyebrow} · La ruta secreta`;
  progress();

  const stage = $("stage");
  stage.innerHTML = "";
  const scene = document.createElement("section");
  scene.className = "scene";
  stage.appendChild(scene);

  // шапка сцены
  const head = document.createElement("div");
  head.innerHTML = `<div class="eyebrow">${esc(S.eyebrow)}</div><h1>${esc(S.title)}</h1>` +
    (S.lead ? `<p class="lead">${esc(S.lead)}</p>` : "");
  scene.appendChild(head);

  // картинка сцены
  // Финальная сцена: картинка (две половины эмблемы вместе) появляется только после
  // верного слова; до него — ничего, кроме реплики. Гора-эмодзи была бы подсказкой.
  if (S.art && art(S.art)) {
    const box = document.createElement("div");
    box.className = "stageart";
    box.innerHTML = art(S.art);
    scene.appendChild(box);
  }

  // реплика персонажа
  if (S.dialogEs) {
    const d = document.createElement("div");
    d.className = "dialog";
    d.id = "dialog";
    if (hasAvatar(S.speaker)) d.appendChild(avatarNode(S.speaker, S.speakerState));
    const said = document.createElement("div");
    said.className = "said";
    said.innerHTML = `<span class="who">${esc(labelOf(S.speaker, S.speakerLabel))}</span><span class="line">${esc(S.dialogEs)}</span>`;
    d.appendChild(said);
    d.appendChild(speakBtn(S.dialogEs, S.speaker));
    scene.appendChild(d);
    if (gestured) speak(S.dialogEs, S.speaker);
  }

  if (S.questionEs) {
    const q = document.createElement("p");
    q.className = "question";
    q.textContent = S.questionEs;
    scene.appendChild(q);
  }

  ({ choice: renderChoice, multi: renderMulti, recall: renderRecall }[S.kind])(scene, S);

  const h = document.createElement("div");
  h.className = "heard";
  h.id = "heardLine";
  scene.appendChild(h);

  const f = document.createElement("div");
  f.className = "feedback";
  f.id = "feedback";
  scene.appendChild(f);

  scene.appendChild(vocabPanel());
}

/** Один вариант из нескольких: клик и голос ведут в одну и ту же ветку. */
function renderChoice(scene, S) {
  const grid = document.createElement("div");
  grid.className = "choices" + (S.options.length === 2 ? " two" : "");
  const byId = new Map();

  for (const o of shuffled(S.options, S.pinFirst)) {
    const b = document.createElement("button");
    // Либо картинка с нейтральной подписью, либо фраза без картинки (CLAUDE.md):
    // картинка рядом с фразой переводила бы её, и выбирать было бы нечего.
    b.className = "choice" + (o.art ? "" : " text");
    b.type = "button";
    b.dataset.id = o.id;   // для tools/rocodromo-browser-check.js; на вид и озвучку не влияет
    if (o.art) b.appendChild(artNode(o.art));
    if (o.es) {
      const strong = document.createElement("strong");
      strong.textContent = o.es;
      b.appendChild(strong);
    }
    // 🔊 и aria-label на картинной карточке произнесли бы её название вслух —
    // это тот же перевод картинки, только звуком. Читаем лишь карточки-фразы.
    if (!o.art) b.appendChild(speakBtn(o.es, S.speaker));
    b.onclick = () => choose(o.id);
    b.setAttribute("aria-label", o.art ? `Opción ${o.es}` : o.es);
    grid.appendChild(b);
    byId.set(o.id, { option: o, el: b });
  }
  scene.appendChild(grid);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(micButton(functionsOf(S.options), choose));
  // Режим «отвечаю голосом»: фразы прячутся, остаётся только микрофон. Картинные карточки
  // прятать нельзя — без них ответить нечем, а голос тогда не проверяет ничего.
  if (!S.options.some((o) => o.art) && asrAvailable()) row.appendChild(hideToggle(grid));
  scene.appendChild(row);

  function choose(id) {
    const entry = byId.get(id);
    if (!entry) return;
    const { option, el } = entry;
    const who = option.speaker ?? S.speaker;
    feedback("");
    reply(option.feedbackEs, who, labelOf(who, S.speakerLabel), option.correct ? "ok" : "wrong", option.speakerState);
    if (!option.correct) shake(el);
    if (option.correct) {
      el.classList.add("selected");
      if (!$("nextBtn")) {
        const next = continueButton();
        $("feedback").after(next);
        setTimeout(() => next.focus({ preventScroll: true }), 50);
      }
    }
  }
}

/** Кнопка «Ocultar respuestas». Выбор помнится между сценами; без хранилища просто не запоминается. */
const HIDE_KEY = "rocodromo.hideAnswers";
function hideToggle(grid) {
  let hidden = true;   // по умолчанию скрыты; явный выбор «показать» ("0") помнится
  try { hidden = localStorage.getItem(HIDE_KEY) !== "0"; } catch {}
  const b = document.createElement("button");
  b.className = "mic hide-toggle";
  b.type = "button";
  b.id = "hideToggle";
  const apply = () => {
    grid.hidden = hidden;
    b.setAttribute("aria-pressed", String(hidden));
    b.setAttribute("aria-controls", "choices");
    b.textContent = hidden ? UI.showAnswers : UI.hideAnswers;
  };
  grid.id = "choices";
  b.onclick = () => {
    hidden = !hidden;
    try { localStorage.setItem(HIDE_KEY, hidden ? "1" : "0"); } catch {}
    apply();
  };
  apply();
  return b;
}

/** Снаряжение: несколько предметов, подписей под картинками нет. */
function renderMulti(scene, S) {
  const grid = document.createElement("div");
  grid.className = "choices gear";
  const byId = new Map();

  for (const o of shuffled(S.options, S.pinFirst)) {
    const b = document.createElement("button");
    b.className = "choice";
    b.type = "button";
    b.dataset.id = o.id;
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", "Objeto");
    b.appendChild(artNode(o.art));
    b.onclick = () => toggle(o.id);
    grid.appendChild(b);
    byId.set(o.id, b);
  }
  scene.appendChild(grid);

  const row = document.createElement("div");
  row.className = "row";
  const ready = document.createElement("button");
  ready.className = "action";
  ready.type = "button";
  ready.textContent = UI.ready;
  ready.onclick = check;
  row.appendChild(ready);
  // Голоса здесь нет: выбор предметов — только касанием.
  scene.appendChild(row);

  function toggle(id) {
    const b = byId.get(id);
    if (!b) return;
    const on = !selected.has(id);
    on ? selected.add(id) : selected.delete(id);
    b.classList.toggle("selected", on);
    b.setAttribute("aria-pressed", String(on));
    const o = S.options.find((x) => x.id === id);
    if (on) speak(o.sayEs, S.speaker);
  }

  function check() {
    const want = S.correctSet;
    const ok = selected.size === want.length && want.every((id) => selected.has(id));
    feedback("");
    reply(ok ? S.successEs : S.failEs, S.speaker, labelOf(S.speaker, S.speakerLabel), ok ? "ok" : "wrong");
    if (!ok) { shake(grid); return; }
    ready.disabled = true;
    if (!$("nextBtn")) $("feedback").after(continueButton());
  }
}

/** Финал: слово без вариантов ответа — набрать или сказать. */
function renderRecall(scene, S) {
  const row = document.createElement("div");
  row.className = "row";

  const input = document.createElement("input");
  input.className = "input";
  input.id = "recall";
  input.autocomplete = "off";
  input.placeholder = UI.recallPlaceholder;
  input.setAttribute("aria-label", S.questionEs);
  input.onkeydown = (e) => { if (e.key === "Enter") check(input.value); };
  row.appendChild(input);

  const answer = document.createElement("button");
  answer.className = "action";
  answer.type = "button";
  answer.textContent = UI.answer;
  answer.onclick = () => check(input.value);
  row.appendChild(answer);

  row.appendChild(micButtonRecall());
  scene.appendChild(row);

  const again = document.createElement("div");
  again.className = "row";
  const restart = document.createElement("button");
  restart.className = "restart";
  restart.type = "button";
  restart.textContent = UI.restart;
  restart.onclick = () => goto(0);
  again.appendChild(restart);
  scene.appendChild(again);

  // Свободный ввод: интент-гейт здесь не нужен, достаточно поиска слова.
  function micButtonRecall() {
    const btn = micButton({}, () => {});
    if (btn.disabled) return btn;
    btn.onclick = () => {
      unlockAudio();
      if (activeListen) { activeListen.stop?.(); return; }
      stopSpeaking();
      const token = sceneToken;
      btn.classList.add("live");
      btn.innerHTML = `⏹ <span>${esc(UI.speaking)}</span>`;
      activeListen = listenParent({
        maxMs: 6000,
        onResult: (t) => {
          if (token !== sceneToken) return;
          const text = (t || "").trim();
          heard(text ? `${UI.heardPrefix} <b>${esc(text)}</b>` : "");
          input.value = text;
          check(text);
        },
        onEnd: () => {
          if (token !== sceneToken) return;
          activeListen = null;
          btn.classList.remove("live");
          btn.innerHTML = `🎙 <span>${esc(UI.speak)}</span>`;
        },
        onError: () => {
          if (token !== sceneToken) return;
          activeListen = null;
          btn.classList.remove("live");
          btn.innerHTML = `🎙 <span>${esc(UI.speak)}</span>`;
          feedback(UI.micOff, false);
        },
      });
    };
    return btn;
  }

  function check(value) {
    const ok = new RegExp(`\\b${S.answerPattern}\\b`).test(normalize(value));
    feedback("");
    reply(ok ? S.successEs : S.failEs, S.speaker, labelOf(S.speaker, S.speakerLabel), ok ? "ok" : "wrong", S.speakerState);
    if (ok && S.artOnSuccess && !$("finishArt")) {
      const box = document.createElement("div");
      box.className = "stageart";
      box.id = "finishArt";
      box.innerHTML = art(S.artOnSuccess);
      $("dialog").before(box);
    }
    if (!ok) {
      shake(input);
      // Следующая попытка — сразу печатать (или жать 🎙): старый текст выделен и затрётся.
      input.focus({ preventScroll: true });
      input.select();
    }
  }
}

function continueButton() {
  const b = document.createElement("button");
  b.className = "action";
  b.id = "nextBtn";
  b.type = "button";
  b.textContent = `${UI.continue} →`;
  b.onclick = () => goto(idx + 1);
  return b;
}

/**
 * Варианты сцены → форма, которую ждёт matchIntent: { id: { accept: [...] } }.
 * Текст карточки добавляется к шаблонам всегда: прочитать вслух написанное
 * обязано срабатывать, даже если автор пака забыл такой вариант.
 */
const functionsOf = (options) =>
  Object.fromEntries(options.map((o) => {
    const spoken = o.sayEs ?? o.es;
    const accept = [...(o.accept ?? [])];
    if (spoken && !accept.includes(spoken)) accept.push(spoken);
    return [o.id, { accept }];
  }));

/* ---------------- старт ---------------- */

setupQuestNavigation({
  isInProgress: () => idx > 0 && idx < LAST,
  onLeave: () => { sceneToken++; activeListen?.cancel?.(); stopSpeaking(); },
});

$("home").onclick = () => goto(0);
$("tiny").innerHTML =
  `${esc(Q.disclaimerEs)} · Toca 🔊 para escuchar · Habla para responder` +
  ` · <a href="./index.html">Caperucita</a>`;

await probeSlng();
showVoz();
render();
