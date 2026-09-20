#!/usr/bin/env node
/**
 * Прогрев кэша синтеза: прогоняет все озвучиваемые реплики через /api/tts,
 * чтобы на демо ничего не ждало. Прокси кладёт аудио на диск, повторный
 * запрос отдаётся мгновенно и без сети.
 *
 * Запуск (прокси должен быть поднят):
 *   node tools/warm-cache.mjs [http://localhost:5179]
 *
 * Набор строк собран по фактическим вызовам say()/speak() в web/js/app.js
 * плюс всё озвучиваемое из quest.json.
 */

import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:5179";
const quest = JSON.parse(readFileSync("assets/caperucita/quest.json", "utf8"));

const lines = new Set();
const add = (s) => { if (typeof s === "string" && s.trim()) lines.add(s.trim()); };

// сцены
for (const sc of Object.values(quest.scenes)) { add(sc.ritualEs); add(sc.lineEs); add(sc.chantEs); }

// свидетели: вступление + фоновая реакция
for (const ch of Object.values(quest.characters)) { add(ch.state1?.es); add(ch.ambientSayEs); }

// реплики-«не расслышал» (app.js)
["No hablo fuerte…", "¿Cómo?", "Mmm…", "La cesta está vacía."].forEach(add);

// целевые фразы родителя
for (const fn of Object.values(quest.speechFunctions)) add(fn.canonical);

// улики всех вариантов
for (const v of Object.values(quest.variants)) for (const c of Object.values(v.clues)) add(c.es);

// счёт и закрепление
["uno", "dos", "tres", "Agua", "Flores"].forEach(add);

// проверки на карте
for (const p of Object.values(quest.places)) {
  add(p.props.water ? "Se oye el agua" : "No se oye el agua");
  add(p.props.flowers ? "Huele a flores" : "No huele a flores");
  add(p.props.trees === 2 ? "dos" : "tres");
}

// поиск: подсказки и слова находок
for (const it of quest.search.items) { add(it.hintEs); add(it.es); add(`¡${it.es}!`); }

const all = [...lines];
console.log(`\n  Прогрев кэша: ${all.length} реплик через ${BASE}\n`);

let hit = 0, miss = 0, fail = 0, bytes = 0;
const t0 = Date.now();

for (const [i, text] of all.entries()) {
  const t = Date.now();
  try {
    const r = await fetch(`${BASE}/api/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) {
      fail++;
      console.log(`  ${String(i + 1).padStart(2)}/${all.length}  ОШИБКА ${r.status}  "${text.slice(0, 44)}"`);
      continue;
    }
    const cache = r.headers.get("x-cache");
    const buf = await r.arrayBuffer();
    bytes += buf.byteLength;
    cache === "hit" ? hit++ : miss++;
    console.log(`  ${String(i + 1).padStart(2)}/${all.length}  ${cache === "hit" ? "кэш " : "синт"} ${String(Date.now() - t).padStart(5)}ms  "${text.slice(0, 44)}"`);
  } catch (e) {
    fail++;
    console.log(`  ${String(i + 1).padStart(2)}/${all.length}  СБОЙ  ${e.message}`);
  }
}

console.log(`\n  синтезировано ${miss} · из кэша ${hit} · ошибок ${fail}`);
console.log(`  аудио ${(bytes / 1048576).toFixed(1)} МБ · заняло ${((Date.now() - t0) / 1000).toFixed(1)} с\n`);
process.exit(fail ? 1 : 0);
