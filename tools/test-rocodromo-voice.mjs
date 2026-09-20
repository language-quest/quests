#!/usr/bin/env node
// Полный круг голоса без микрофона: синтез реплики → SLNG STT → интент-гейт.
// Это единственный способ поймать ошибки распознавания до того, как в них
// упрётся человек: «pies» слышится как «diez», «arnés» как «armes».
// Прокси должен быть запущен. Запуск из корня проекта:
//   node tools/test-rocodromo-voice.mjs [http://localhost:5179]

import { readFileSync } from "node:fs";
import { matchIntent } from "../web/js/engine.js";

const BASE = process.argv[2] || "http://localhost:5179";
const q = JSON.parse(readFileSync("assets/rocodromo/quest.json", "utf8"));
const byId = Object.fromEntries(q.scenes.map((s) => [s.id, s]));

// Та же сборка шаблонов, что в web/js/rocodromo.js.
const functionsOf = (scene) => {
  const base = Object.fromEntries((scene.options ?? []).map((o) => {
    const spoken = o.sayEs ?? o.es;
    const accept = [...(o.accept ?? [])];
    if (spoken && !accept.includes(spoken)) accept.push(spoken);
    return [o.id, { accept }];
  }));
  return scene.confirm ? { ...base, __confirm: { accept: scene.confirm.accept } } : base;
};

// [сцена, что произносим, ожидаемый вариант, известное расхождение?]
// Четвёртым полем помечены случаи, где синтетический голос стабильно ломает
// распознавание, а расширять шаблоны дороже, чем терпеть: «correr» слышится как
// «poder», и принимать «poder» значило бы ловить любое «puedo/podría» игрока.
// Такой промах безвреден: это неверный вариант, игрок получит «No te he entendido».
const probes = [
  ["recepcion", "Quiero escalar con cuerda.", "cuerda"],
  ["recepcion", "Quiero hacer búlder.", "bulder"],
  ["recepcion", "No lo sé, es mi primera vez aquí.", "primera"],
  ["companero", "Sí, vamos juntos.", "juntos"],
  ["companero", "Prefiero ir solo.", "solo"],
  ["companero", "Tú primero. Yo voy después.", "despues"],
  ["entrenador", "La pared.", "pared"],
  ["entrenador", "El banco.", "banco"],
  ["entrenador", "La taquilla.", "taquilla"],
  ["equipo", "El arnés.", "arnes"],
  ["equipo", "Los pies de gato.", "gato"],
  ["equipo", "El casco.", "casco"],
  ["equipo", "Estoy listo.", "__confirm"],
  ["via", "La vía verde.", "via-verde"],
  ["via", "La vía amarilla.", "via-amarilla"],
  ["nudo", "La cuerda atada al arnés.", "ocho"],
  ["nudo", "El mosquetón.", "mosqueton"],
  ["tres-nudos", "El ocho.", "ocho"],
  ["tres-nudos", "El ballestrinque.", "ballestrinque"],
  ["tres-nudos", "El pescador doble.", "pescador"],
  ["turno", "Me toca primero.", "me-toca"],
  ["turno", "Te toca primero.", "te-toca"],
  ["turno", "Nos vamos a casa.", "nos-vamos"],
  ["desafio", "Quiero subir.", "subir"],
  ["desafio", "Quiero bajar.", "bajar"],
  ["escalar", "¡Dame cuerda!", "dame"],
  ["descanso", "¡Pilla! Necesito descansar.", "pilla2"],
  ["ayuda-diego", "¡Dame cuerda!", "dame-diego"],
  ["ayuda-diego", "¡Pilla!", "pilla-diego"],
  ["ayuda-diego", "¡Bájame!", "bajame-diego"],
  ["movimiento", "La presa de la izquierda.", "izquierda"],
  ["movimiento", "La presa de la derecha.", "derecha"],
];

let pass = 0, fail = 0, known = 0;
console.log(`\n  ГОЛОСОВОЙ КРУГ · синтез → STT → гейт · ${BASE}\n`);

for (const [sceneId, said, want, tolerated] of probes) {
  const scene = byId[sceneId];
  try {
    const t = await fetch(`${BASE}/api/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: said, voice: q.voices.carlos }),
    });
    if (!t.ok) throw new Error(`tts ${t.status}`);
    const audio = Buffer.from(await t.arrayBuffer());

    const r = await fetch(`${BASE}/api/stt`, {
      method: "POST",
      headers: { "content-type": "audio/wav" },
      body: audio,
    });
    if (!r.ok) throw new Error(`stt ${r.status} ${(await r.text()).slice(0, 160)}`);
    const { transcript } = await r.json();

    const got = matchIntent(transcript ?? "", functionsOf(scene), q.intentLexicon)?.fn ?? null;
    const ok = got === want;
    if (ok) pass++; else if (tolerated) known++; else fail++;
    const mark = ok ? "OK  " : tolerated ? "ЗНАЮ" : "FAIL";
    console.log(`  ${mark} ${sceneId.padEnd(12)} ${JSON.stringify(said).padEnd(32)} → ASR ${JSON.stringify(transcript ?? "").padEnd(34)} → ${(got ?? "—").padEnd(12)} ждали ${want}`);
  } catch (e) {
    fail++;
    console.log(`  FAIL ${sceneId.padEnd(12)} ${JSON.stringify(said).padEnd(32)} → ${e.message}`);
  }
}

// Синтетический голос и живой человек ошибаются по-разному: это нижняя граница,
// а не доказательство, что микрофон пройдёт так же.
console.log(`\n  итог: ${pass} прошло, ${known} известных расхождений, ${fail} провалено\n`);
process.exit(fail ? 1 : 0);
