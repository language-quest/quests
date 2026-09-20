#!/usr/bin/env node
// Структурный тест сюжета «La ruta secreta» с Диего (T-004). Сети не нужно.
// Проверяет данные и арт, а не DOM: поведение страницы (перезапуск, повтор после
// ошибки, перемешивание карточек) проверяется в браузере — см. tools/rocodromo-browser-check.js.
// Запуск из корня проекта: node tools/test-rocodromo-story.mjs

import { readFileSync } from "node:fs";
import { art, isArtKey, hasAvatar } from "../web/js/rocodromo-art.js";
import { normalize } from "../web/js/engine.js";

const q = JSON.parse(readFileSync("assets/rocodromo/quest.json", "utf8"));
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${name}${!ok && detail ? `\n       ${detail}` : ""}`);
};

const ORDER = ["recepcion", "companero", "entrenador", "equipo", "via", "nudo", "tres-nudos", "turno",
  "desafio", "escalar", "descanso", "movimiento", "ayuda-diego", "final"];
const TEXT_SCENES = ["recepcion", "companero", "turno", "desafio", "escalar", "descanso", "ayuda-diego"];
const IMAGE_SCENES = ["entrenador", "equipo", "via", "nudo", "tres-nudos", "movimiento"];
const STATES = ["normal", "pensativo", "atento", "contento"];
const byId = Object.fromEntries(q.scenes.map((s) => [s.id, s]));

console.log("\n  СЮЖЕТ · LA RUTA SECRETA · T-004\n");

// 1. структура
check("ровно 14 сцен в порядке ТЗ", JSON.stringify(q.scenes.map((s) => s.id)) === JSON.stringify(ORDER),
  q.scenes.map((s) => s.id).join(", "));
check("id сцен уникальны", new Set(q.scenes.map((s) => s.id)).size === q.scenes.length);

// 2. персонажи и голоса
const speakers = new Set();
for (const s of q.scenes) {
  speakers.add(s.speaker);
  for (const o of s.options ?? []) if (o.speaker) speakers.add(o.speaker);
}
for (const who of speakers) {
  check(`speaker «${who}» имеет подпись и голос`, !!q.speakerLabels?.[who] && !!q.voices?.[who]);
}
check("у Диего подпись «Diego»", q.speakerLabels.diego === "Diego");
check("голос Диего не совпадает с голосом Карлоса", q.voices.diego && q.voices.diego !== q.voices.carlos,
  `${q.voices.diego} / ${q.voices.carlos}`);
check("у Диего есть портрет", hasAvatar("diego"));
const faces = STATES.map((st) => art(`avatar:diego:${st}`));
check("портрет Диего есть во всех четырёх состояниях", faces.every((f) => f.startsWith("<svg")));
check("состояния лица различаются (минимум три разных)", new Set(faces).size >= 3);
check("портрет Диего не совпадает с портретом Карлоса", art("avatar:diego") !== art("avatar:carlos"));
const states = q.scenes.flatMap((s) => [s.speakerState, ...(s.options ?? []).map((o) => o.speakerState)]).filter(Boolean);
check("все speakerState — из допустимых", states.every((st) => STATES.includes(st)), states.join(","));
check("используется не меньше трёх состояний Диего", new Set(states).size >= 3);
check("Диего появляется в начале, середине, кульминации и финале",
  byId.companero.speaker === "diego" && byId.turno.options.some((o) => o.speaker === "diego") &&
  byId.movimiento.speaker === "diego" && byId.final.speaker === "diego");
check("Карлос не заменён: страхует и говорит о снаряжении",
  ["equipo", "via", "nudo", "tres-nudos", "turno", "desafio", "escalar", "descanso"].every((id) => byId[id].speaker === "carlos"));

// 3. арт разрешается
const artRefs = [];
for (const s of q.scenes) {
  for (const k of [s.art, s.artOnSuccess]) if (k) artRefs.push([s.id, k]);
  for (const o of s.options ?? []) if (o.art) artRefs.push([`${s.id}/${o.id}`, o.art]);
}
for (const [where, key] of artRefs) {
  check(`арт «${key}» (${where}) существует`, isArtKey(key) && art(key).startsWith("<svg"));
}
for (const key of ["reception-with-diego", "belay-with-diego", "climb-high-with-diego", "finish-with-diego"]) {
  check(`сюжетная композиция «${key}» есть в паке`, artRefs.some(([, k]) => k === key));
}

// 4. ровно один правильный вариант
for (const s of q.scenes.filter((x) => x.kind === "choice")) {
  const n = s.options.filter((o) => o.correct).length;
  check(`${s.id}: ровно один correct`, n === 1, `найдено ${n}`);
}
check("equipo принимает только arnes + gato",
  byId.equipo.kind === "multi" && JSON.stringify([...byId.equipo.correctSet].sort()) === JSON.stringify(["arnes", "gato"]) &&
  byId.equipo.options.length === 4);

// 5. правило карточки: картинка XOR видимая испанская фраза; эмодзи нет
for (const id of TEXT_SCENES) {
  const s = byId[id];
  check(`${id}: только фразы, без картинок`, s.options.every((o) => !o.art && o.es && o.es.length > 1));
}
for (const id of IMAGE_SCENES) {
  const s = byId[id];
  const neutral = s.options.every((o) => !o.es || /^[A-C]$/.test(o.es));
  check(`${id}: только картинки, подпись нейтральная (A/B/C или пусто)`, s.options.every((o) => o.art) && neutral);
}
check("final: свободный ввод без карточек", byId.final.kind === "recall" && !byId.final.options);
const EMOJI = /\p{Extended_Pictographic}/u;
const gameStrings = [];
const walk = (n, path) => {
  if (typeof n === "string") gameStrings.push([path, n]);
  else if (Array.isArray(n)) n.forEach((v, i) => walk(v, `${path}[${i}]`));
  else if (n && typeof n === "object") for (const [k, v] of Object.entries(n)) walk(v, `${path}.${k}`);
};
walk(q.scenes, "scenes");
const emoji = gameStrings.filter(([, t]) => EMOJI.test(t));
check("в сценах нет эмодзи", emoji.length === 0, emoji.map(([p]) => p).join(", "));

// 6. русского нет ни в одной сцене (он живёт только в vocabulary и title.ru)
const cyr = gameStrings.filter(([, t]) => /[А-Яа-яЁё]/.test(t));
check("в сценах нет русского", cyr.length === 0, cyr.map(([p]) => p).join(", "));

// 7. ошибка объясняется, а не наказывается
for (const s of q.scenes.filter((x) => x.kind === "choice")) {
  for (const o of s.options.filter((x) => !x.correct)) {
    check(`${s.id}/${o.id}: неверный вариант объясняет ошибку по-испански`,
      typeof o.feedbackEs === "string" && o.feedbackEs.length > 25 && /[a-záéíóú]{3}/i.test(o.feedbackEs));
  }
}
const wrongDiego = byId["ayuda-diego"].options.filter((o) => !o.correct).map((o) => o.feedbackEs);
check("ayuda-diego: две неверные команды получают разные реакции", new Set(wrongDiego).size === 2);
check("fail-строки multi/recall на месте", !!byId.equipo.failEs && !!byId.final.failEs);
const punish = JSON.stringify(q).match(/"(lives|score|timer|points|penalty|life)"/);
check("нет очков, жизней, таймера и штрафов", !punish, String(punish));

// 8. сцены с Диего: содержание
check("tres-nudos: ошибка Диего «izquierda» закреплена за ballestrinque",
  byId["tres-nudos"].pinFirst === "ballestrinque" && /izquierda/.test(byId["tres-nudos"].dialogEs) &&
  /Diego/.test(byId["tres-nudos"].options.find((o) => o.id === "ballestrinque").feedbackEs));
check("tres-nudos: реплика не называет правильную карточку по букве или порядку",
  !/\b[ABC]\b/.test(byId["tres-nudos"].dialogEs) && /no su posición/.test(byId["tres-nudos"].dialogEs));
check("movimiento: подсказку даёт Диего словами, портрет сосредоточенный",
  byId.movimiento.speaker === "diego" && byId.movimiento.speakerState === "atento" && /izquierda/.test(byId.movimiento.dialogEs));
check("ayuda-diego: игрок повторяет «¡Dame cuerda!»",
  byId["ayuda-diego"].options.find((o) => o.correct)?.es === "¡Dame cuerda!" &&
  byId.escalar.options.find((o) => o.correct)?.es === "¡Dame cuerda!");
check("turno различает «Me toca» и «Te toca»",
  byId.turno.options.map((o) => o.es).join("|") === "Me toca primero.|Te toca primero.|Nos vamos a casa.");
check("дисклеймер о безопасности остаётся", /no es un curso de seguridad/.test(q.disclaimerEs));
check("исходная сцена про reunión и соединение верёвок убрана",
  !/reunión|unir dos cuerdas/i.test(JSON.stringify(q.scenes)));

// 9. словарь
const vocab = q.vocabulary.map((v) => normalize(v.es));
for (const w of ["compañero", "juntos", "una pista", "te toca", "me toca", "ayud", "primero", "despues", "desde abajo"]) {
  check(`vocabulario содержит «${w}» с переводом`,
    q.vocabulary.some((v) => normalize(v.es).includes(normalize(w)) && v.ru), vocab.join(" | "));
}
for (const v of ["subir", "bajar", "descansar", "¡Pilla!", "¡Dame cuerda!", "¡Bájame!"]) {
  check(`vocabulario сохранил «${v}»`, q.vocabulary.some((x) => x.es === v));
}

// 10. полный путь по верным ответам доходит до совместного финала
let reached = [];
for (const s of q.scenes) {
  const ok = s.kind === "choice" ? s.options.some((o) => o.correct)
    : s.kind === "multi" ? s.correctSet?.length > 0 : !!s.answerPattern;
  if (!ok) break;
  reached.push(s.id);
}
check("путь верных ответов проходит все 14 сцен", reached.length === 14 && reached.at(-1) === "final");
check("после ошибки нет блокировок: у вариантов нет флагов lock/disable",
  !/"(lock|locked|disabled|blockAfterWrong)"/.test(JSON.stringify(q.scenes)));
const re = new RegExp(`\\b${byId.final.answerPattern}\\b`);
check("свободный ответ «rocódromo»: с акцентом, без акцента, внутри фразы",
  ["rocódromo", "rocodromo", "Es un rocódromo", "en el rocodromo"].every((t) => re.test(normalize(t))));
check("финал подтверждает совместное прохождение", /Tú y Diego/.test(byId.final.successEs) && /^¡Lo hemos conseguido!/.test(byId.final.dialogEs));

// 11. прямые ссылки
check("?scene=N остаётся в допустимых границах (1…14)", q.scenes.length === 14);

console.log(`\n  итог: ${pass} прошло, ${fail} провалено\n`);
process.exit(fail ? 1 : 0);
