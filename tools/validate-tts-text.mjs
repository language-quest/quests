#!/usr/bin/env node
/**
 * tts-orthography: озвучиваемая строка состоит только из испанской орфографии.
 *
 * Вырос из конкретной ошибки: «Ese nudo se llama «ocho».» синтезировалось как
 * [oʃo] («ошо») вместо [otʃo]. Aura-2 не узнаёт слово, к которому приклеена
 * ёлочка, и читает ch не по-испански. Три контрольных клипа с тем же словом
 * без кавычек звучали верно — см. tools/tts-prep.mjs.
 *
 * Ёлочки прокси снимает сам (ttsText), поэтому они — предупреждение: на экране
 * «…» это нормальная испанская типографика и убирать её из данных не надо.
 * Всё остальное незнакомое — ошибка: того, что прокси не умеет чинить, в
 * озвучиваемых строках быть не должно.
 *
 * Сети не требует. Запуск из корня проекта:
 *   node tools/validate-tts-text.mjs
 */

import { readFileSync } from "node:fs";

// Поля выведены из реальных call sites speak()/say(), а не угаданы по имени:
//   rocodromo.js:267 dialogEs · :329 feedbackEs · :383 sayEs · :390,:472 successEs/failEs
//   app.js:258 ritualEs · :284,:695 lineEs · :391 characters.*.state1.es · :474 clues.*.es
const SPOKEN = new Set(["dialogEs", "feedbackEs", "sayEs", "successEs", "failEs", "ritualEs", "lineEs"]);
// Голый ключ es озвучивается только в этих поддеревьях. options[].es — это
// нейтральная подпись карточки «A»/«B», vocabulary[].es — словарь, его не читают.
const SPOKEN_ES_PARENT = /(^|\.)(state1|clues)(\.|\[)/;

const ALLOWED = /[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ \n.,;:!?¡¿()…-]/;
const SOFT = /[«»„“”]/; // прокси чинит — предупреждение, не ошибка

const files = ["assets/rocodromo/quest.json", "assets/caperucita/quest.json"];
const errors = [];
const warnings = [];
let checked = 0;

const collect = (node, path, out) => {
  if (Array.isArray(node)) return node.forEach((v, i) => collect(v, `${path}[${i}]`, out));
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "vocabulary") continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === "string" && (SPOKEN.has(k) || (k === "es" && SPOKEN_ES_PARENT.test(p + ".")))) out.push([p, v]);
      else collect(v, p, out);
    }
  }
  return out;
};

const describe = (c) => `${JSON.stringify(c)} U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  const lineOf = (s) => lines.findIndex((l) => l.includes(s)) + 1;
  for (const [path, text] of collect(JSON.parse(readFileSync(file, "utf8")), "", [])) {
    checked++;
    const bad = [...new Set([...text].filter((c) => !ALLOWED.test(c)))];
    if (!bad.length) continue;
    const soft = bad.filter((c) => SOFT.test(c));
    const hard = bad.filter((c) => !SOFT.test(c));
    const where = `${file}:${lineOf(text) || "?"}  ${path}`;
    if (hard.length) errors.push(`${where}\n    запрещено: ${hard.map(describe).join(", ")}\n    ${text}`);
    else if (soft.length) warnings.push(`${where}\n    прокси снимет: ${soft.map(describe).join(", ")}\n    ${text}`);
  }
}

console.log(`\n  TTS-ОРФОГРАФИЯ · проверено озвучиваемых строк: ${checked}\n`);
for (const w of warnings) console.log(`  ⚠ ${w}\n`);
for (const e of errors) console.log(`  ✗ ${e}\n`);
console.log(`  предупреждений ${warnings.length}, ошибок ${errors.length}\n`);
process.exit(errors.length ? 1 : 0);
