#!/usr/bin/env node
/**
 * Разовый проход по уже прогретому кэшу синтеза: срезать тишину, которую
 * Aura-2 клеит перед каждой репликой (замерено 0.6–1.3 с) и после неё.
 *
 * Клипы, синтезированные до появления trimWavSilence в прокси, лежат нетронутые;
 * новые прокси режет сам. Скрипт идемпотентен — повторный запуск ничего не меняет,
 * так что его безопасно гонять после каждого прогрева.
 *
 *   node tools/trim-tts-cache.mjs [--dry]
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { trimWavSilence, leadingSilenceMs } from "./tts-prep.mjs";

const DRY = process.argv.includes("--dry");
const DIR = join(process.cwd(), "assets", "caperucita", "tts-cache");
const SECOND = 48000; // 24 кГц · 16 бит · моно

const files = readdirSync(DIR).filter((f) => f.endsWith(".audio"));
let changed = 0, skipped = 0, unknown = 0, saved = 0, maxLead = 0;

for (const f of files) {
  const p = join(DIR, f);
  const before = readFileSync(p);
  const lead = leadingSilenceMs(before);
  if (lead === null) { unknown++; continue; } // не WAV/PCM16 или сплошная тишина
  const after = trimWavSilence(before);
  if (after.length === before.length) { skipped++; continue; }
  saved += (before.length - after.length) / SECOND;
  maxLead = Math.max(maxLead, lead);
  if (!DRY) writeFileSync(p, after);
  changed++;
}

console.log(
  `${DRY ? "[dry] " : ""}кэш ${DIR}\n` +
  `  файлов ${files.length}: обрезано ${changed}, уже подрезаны ${skipped}, пропущено ${unknown}\n` +
  `  срезано ${saved.toFixed(1)} с суммарно, худшая ведущая тишина была ${maxLead} мс`
);
