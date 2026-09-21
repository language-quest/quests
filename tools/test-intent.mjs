#!/usr/bin/env node
// Регрессия интент-гейта. Отрицательные случаи — воспроизведения из ревью Codex.
// Запуск: node tools/test-intent.mjs

import { readFileSync } from "node:fs";
import { matchIntent, matchChildWord } from "../web/js/engine.js";

const q = JSON.parse(readFileSync("assets/caperucita/quest.json", "utf8"));
const SF = q.speechFunctions;

const cases = [
  // --- должны срабатывать: канонические формы ---
  ["¿Puedes hablar más alto?", "louder"],
  ["Más despacio, por favor", "slower"],
  ["¿Puedes repetir?", "repeat"],
  ["No te oigo", "louder"],
  ["No entiendo", "slower"],
  ["Otra vez", "repeat"],
  ["Repite", "repeat"],
  ["Más alto", "louder"],
  ["Despacio", "slower"],
  ["Habla más fuerte", "louder"],

  // --- должны срабатывать: реальные транскрипты SLNG (с ошибками ASR) ---
  ["más despacio por favor", "slower"],
  ["puedes nadar más alto", "louder"],      // "hablar"→"nadar", ошибка ASR
  ["puedes repetir", "repeat"],
  ["mass despasio por favor", "slower"],    // фонетическая ошибка

  // --- НЕ должны срабатывать: воспроизведения Codex ---
  ["Quiero comer una manzana", null],
  ["Hay espacio para todos", null],
  ["No te digo nada", null],
  ["No quiero repetir", null],
  ["El árbol es más alto", null],

  // --- НЕ должны: прочие описательные фразы ---
  ["El agua está más alta que el puente", null],
  ["Hola, ¿qué tal?", null],
  ["Mira, tres árboles", null],
  ["La cesta está vacía", null],
  ["El lobo habla bajito", null],
  ["", null],

  // --- естественные формы просьбы (проверка на ЛОЖНЫЕ ОТКАЗЫ) ---
  ["¿Podrías hablar más alto?", "louder"], ["¿Podría hablar más alto?", "louder"],
  ["¿Puede hablar más alto?", "louder"], ["Habla más alto", "louder"],
  ["Más alto, por favor", "louder"], ["Más fuerte, por favor", "louder"],
  ["Más alto, Lolo", "louder"], ["No te oigo bien", "louder"], ["No le oigo", "louder"],
  ["Perdón, no te oigo", "louder"], ["No se oye", "louder"], ["Un poco más alto", "louder"],
  ["¿Puedes subir la voz?", "louder"], ["Habla alto", "louder"],
  ["¿Puedes hablar más despacio?", "slower"], ["¿Podrías ir más despacio?", "slower"],
  ["Despacio, por favor", "slower"], ["Más lento", "slower"], ["No entiendo nada", "slower"],
  ["Perdón, no entiendo", "slower"], ["Habla más despacio", "slower"],
  ["Un poco más despacio", "slower"], ["Más despacio, Rita", "slower"],
  ["¿Me lo repites?", "repeat"], ["¿Lo repites?", "repeat"], ["Repite, por favor", "repeat"],
  ["Repítelo", "repeat"], ["Otra vez, por favor", "repeat"], ["¿Qué has dicho?", "repeat"],
  ["¿Qué dijiste?", "repeat"], ["¿Cómo?", "repeat"], ["¿Cómo dices?", "repeat"],
  ["De nuevo", "repeat"], ["¿Puedes repetirlo?", "repeat"], ["Repite eso, Otto", "repeat"],

  // --- НЕ должны: описательные фразы с именами персонажей ---
  ["Lolo es un lobo grande", null],
  ["Rita sube al árbol", null],
  ["El agua suena muy fuerte aquí", null],
  ["La abuela vive lejos", null],

  // --- две собственные формулы подряд: словарь варианта не штрафуется ---
  ["No te oigo, habla más alto", "louder"],
  ["No entiendo, habla más despacio", "slower"],
  ["No te oigo, el agua suena fuerte", null],   // чужие слова по-прежнему отказ

  // --- шаблон, разорванный бесплатными словами ---
  ["Habla un poco más alto, por favor", "louder"],
  ["¿Puedes hablar un poquito más despacio?", "slower"],
  ["repite eso otra vez", "repeat"],
  ["El árbol es más alto que la casa", null],   // разрыв чужими словами не считается
  ["habla con el lobo más tarde", null],
  ["más alto está el árbol", null],
];

let pass = 0, fail = 0;
console.log("\n  ИНТЕНТ-ГЕЙТ\n");
for (const [text, want] of cases) {
  const hit = matchIntent(text, SF, q.intentLexicon);
  const got = hit?.fn ?? null;
  const ok = got === want;
  ok ? pass++ : fail++;
  const mark = ok ? "OK  " : "FAIL";
  const detail = got ? `${got} (${hit.score.toFixed(2)})` : "—";
  console.log(`  ${mark} ${JSON.stringify(text).padEnd(38)} → ${detail.padEnd(16)} ждали ${want ?? "—"}`);
}

console.log("\n  ДЕТСКОЕ СЛОВО\n");
const kids = [
  ["pan", "pan", true], ["hueso", "queso", true], ["mansana", "manzana", true],
  ["pa", "pan", true], ["queso", "queso", true],
  ["собака", "queso", false], ["elefante", "pan", false],
];
for (const [heard, target, want] of kids) {
  const got = matchChildWord(heard, target, q.childVoice.matchThreshold);
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "OK  " : "FAIL"} "${heard}" при цели "${target}" → ${got}`);
}

console.log(`\n  итог: ${pass} прошло, ${fail} провалено\n`);
process.exit(fail ? 1 : 0);
