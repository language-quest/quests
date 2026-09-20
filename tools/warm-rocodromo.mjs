#!/usr/bin/env node
// Прогрев кэша синтеза для квеста про скалодром. Прокси должен быть уже запущен.
// Запуск из корня проекта: node tools/warm-rocodromo.mjs [http://localhost:5179]

import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://localhost:5179";
const q = JSON.parse(readFileSync("assets/rocodromo/quest.json", "utf8"));

// [текст, голос] — голос входит в ключ кэша, поэтому одна фраза разными
// голосами это две записи.
const lines = [];
const push = (text, speaker) => {
  const t = (text || "").trim();
  if (t) lines.push([t, q.voices?.[speaker]]);
};

for (const s of q.scenes) {
  push(s.dialogEs, s.speaker);
  for (const o of s.options ?? []) {
    push(o.sayEs ?? o.es, s.speaker);
    push(o.feedbackEs, o.speaker ?? s.speaker);
  }
  push(s.successEs, s.speaker);
  push(s.failEs, s.speaker);
}

// Дубликаты по паре «текст+голос» — это один и тот же ключ кэша.
const uniq = [...new Map(lines.map(([t, v]) => [`${v}|${t}`, [t, v]])).values()];

console.log(`\n  ПРОГРЕВ КЭША · ${uniq.length} реплик → ${BASE}\n`);

let hit = 0, miss = 0, failed = 0, bytes = 0;
for (const [text, voice] of uniq) {
  try {
    const r = await fetch(`${BASE}/api/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(voice ? { text, voice } : { text }),
    });
    if (!r.ok) {
      failed++;
      console.log(`  FAIL ${r.status} ${JSON.stringify(text).slice(0, 56)} — ${(await r.text()).slice(0, 160)}`);
      continue;
    }
    const buf = await r.arrayBuffer();
    bytes += buf.byteLength;
    const cache = r.headers.get("x-cache");
    cache === "hit" ? hit++ : miss++;
    console.log(`  ${cache === "hit" ? "hit " : "miss"} ${String(voice ?? "default").padEnd(20)} ${JSON.stringify(text).slice(0, 62)}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${JSON.stringify(text).slice(0, 56)} — ${e.message}`);
  }
}

console.log(`\n  итог: ${hit} из кэша, ${miss} синтезировано, ${failed} ошибок, ${(bytes / 1024 / 1024).toFixed(1)} МБ\n`);
process.exit(failed ? 1 : 0);
