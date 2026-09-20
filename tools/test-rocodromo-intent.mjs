#!/usr/bin/env node
// Голосовая ветка квеста про скалодром без живого микрофона: прогоняем интент-гейт
// по вариантам каждой сцены. Включены типичные ошибки ASR и отрицательные случаи.
// Запуск из корня проекта: node tools/test-rocodromo-intent.mjs

import { readFileSync } from "node:fs";
import { matchIntent, normalize } from "../web/js/engine.js";

const q = JSON.parse(readFileSync("assets/rocodromo/quest.json", "utf8"));
const LEX = q.intentLexicon;
const byId = Object.fromEntries(q.scenes.map((s) => [s.id, s]));

// Та же сборка, что в web/js/rocodromo.js: текст карточки — всегда допустимый ответ.
const functionsOf = (scene) => {
  const base = Object.fromEntries((scene.options ?? []).map((o) => {
    const spoken = o.sayEs ?? o.es;
    const accept = [...(o.accept ?? [])];
    if (spoken && !accept.includes(spoken)) accept.push(spoken);
    return [o.id, { accept }];
  }));
  return scene.confirm ? { ...base, __confirm: { accept: scene.confirm.accept } } : base;
};

// [сцена, сказанное, ожидаемый id варианта | null]
const cases = [
  // 1 — тип лазания
  ["recepcion", "Quiero escalar con cuerda.", "cuerda"],
  ["recepcion", "quiero escalar con cuerda", "cuerda"],
  ["recepcion", "Hola, quiero escalar con cuerda", "cuerda"],
  ["recepcion", "Quiero hacer búlder", "bulder"],
  ["recepcion", "No lo sé", "primera"],
  ["recepcion", "no sé, es mi primera vez", "primera"],
  ["recepcion", "Es mi primera vez aquí", "primera"],
  ["recepcion", "soy nuevo", "primera"],
  ["recepcion", "quiero hacer búlgar", "bulder"],   // живая ошибка ASR: «búlder» → «búlgar»
  ["recepcion", "¿Dónde está el baño?", null],

  // 2 — цвет стены. Подписи на карточках нейтральные (A/B/C), голосом нужен цвет.
  ["entrenador", "La pared roja", "roja"],
  ["entrenador", "Voy a la pared roja", "roja"],
  ["entrenador", "la pared amarilla", "amarilla"],
  ["entrenador", "azul", "azul"],
  ["entrenador", "No lo sé", null],

  // 3 — снаряжение: называем предметы, потом подтверждаем
  ["equipo", "El arnés", "arnes"],
  ["equipo", "el arnes", "arnes"],
  ["equipo", "el armes", "arnes"],              // живая ошибка ASR: «arnés» → «armes»
  ["equipo", "Los pies de gato", "gato"],
  ["equipo", "pies de gato", "gato"],
  ["equipo", "la cuerda", "cuerda"],
  ["equipo", "el casco", "casco"],
  ["equipo", "los diez de gato", "gato"],       // живая ошибка ASR: «pies» → «diez»
  ["equipo", "Estoy listo", "__confirm"],
  ["equipo", "vamos", "__confirm"],
  ["equipo", "buenos días", null],

  // 4 — цвет трассы
  ["via", "La vía verde", "via-verde"],
  ["via", "verde", "via-verde"],
  ["via", "la via amarilla", "via-amarilla"],
  ["via", "azul", "via-azul"],

  // 5 — что такое узел. Подписей под картинками нет, только A/B/C.
  ["nudo", "La cuerda atada al arnés", "ocho"],
  ["nudo", "el nudo", "ocho"],
  ["nudo", "la cuerda atala al arnés", "ocho"],     // живая ошибка ASR: «atada» → «atala»
  ["nudo", "La cuerda suelta", "suelta"],
  ["nudo", "El mosquetón", "mosqueton"],

  // 6 — названия узлов
  ["tres-nudos", "El ocho", "ocho"],
  ["tres-nudos", "ocho", "ocho"],
  ["tres-nudos", "el nudo de ocho", "ocho"],
  ["tres-nudos", "El ballestrinque", "ballestrinque"],
  ["tres-nudos", "del valle strinte", "ballestrinque"],  // живая ошибка ASR: «ballestrinque»
  ["tres-nudos", "El pescador doble", "pescador"],
  ["tres-nudos", "no lo sé", null],

  // 7 — подниматься или спускаться
  ["desafio", "Quiero subir", "subir"],
  ["desafio", "quiero bajar", "bajar"],
  ["desafio", "Quiero descansar", "descansar"],

  // 8 — просьба выдать верёвку
  ["escalar", "¡Dame cuerda!", "dame"],
  ["escalar", "dame cuerda", "dame"],
  ["escalar", "Necesito más cuerda", "dame"],
  ["escalar", "¡Pilla!", "pilla"],
  ["escalar", "¡Bájame!", "bajame"],

  // 9 — просьба выбрать слабину. Здесь верен «pilla», не «dame».
  ["descanso", "¡Pilla! Necesito descansar.", "pilla2"],
  ["descanso", "pilla", "pilla2"],
  ["descanso", "Necesito descansar", "pilla2"],
  ["descanso", "dame cuerda", "dame2"],
  ["descanso", "bájame", "bajame2"],

  // 10 — сторона
  ["movimiento", "La izquierda", "izquierda"],
  ["movimiento", "la presa verde", "izquierda"],
  ["movimiento", "la mano izquierda", "izquierda"],
  ["movimiento", "la presa de la izquierda", "izquierda"],   // текст карточки, прочитанный вслух
  ["movimiento", "la derecha", "derecha"],
  ["movimiento", "la fresa de la derecha", "derecha"],  // живая ошибка ASR: «presa» → «fresa»
  ["movimiento", "no sé", null],
];

let pass = 0, fail = 0;

console.log("\n  ИНТЕНТ-ГЕЙТ · LA RUTA SECRETA\n");
for (const [sceneId, text, want] of cases) {
  const scene = byId[sceneId];
  if (!scene) { console.log(`  FAIL сцена "${sceneId}" не найдена`); fail++; continue; }
  const hit = matchIntent(text, functionsOf(scene), LEX);
  const got = hit?.fn ?? null;
  const ok = got === want;
  ok ? pass++ : fail++;
  const detail = got ? `${got} (${hit.score.toFixed(2)})` : "—";
  console.log(`  ${ok ? "OK  " : "FAIL"} ${sceneId.padEnd(12)} ${JSON.stringify(text).padEnd(34)} → ${detail.padEnd(18)} ждали ${want ?? "—"}`);
}

// Финал: свободный ввод слова, гейт не нужен — достаточно поиска слова.
console.log("\n  ФИНАЛЬНОЕ СЛОВО\n");
const final = byId.final;
const re = new RegExp(`\\b${final.answerPattern}\\b`);
const recall = [
  ["rocódromo", true], ["rocodromo", true], ["Un rocódromo", true],
  ["en el rocodromo", true], ["ROCÓDROMO.", true],
  ["gimnasio", false], ["pared", false], ["", false],
];
for (const [text, want] of recall) {
  const got = re.test(normalize(text));
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${JSON.stringify(text).padEnd(22)} → ${got}`);
}

// Каждый вариант обязан быть достижим голосом: пустой accept — дыра в паке.
console.log("\n  ПОЛНОТА ПАКА\n");
for (const scene of q.scenes) {
  for (const o of scene.options ?? []) {
    const ok = Array.isArray(o.accept) && o.accept.length > 0;
    ok ? pass++ : fail++;
    if (!ok) console.log(`  FAIL ${scene.id}/${o.id}: нет accept-шаблонов`);
  }
}
console.log(`  проверено вариантов: ${q.scenes.reduce((n, s) => n + (s.options?.length ?? 0), 0)}`);

console.log(`\n  итог: ${pass} прошло, ${fail} провалено\n`);
process.exit(fail ? 1 : 0);
