#!/usr/bin/env node
/**
 * Досыпать в свежий worktree то, чего в нём нет, потому что оно в .gitignore.
 *
 * Свежий `git worktree add` даёт чистую копию по индексу — без `.env.local`
 * и без `assets/caperucita/tts-cache/`. Без первого сессия не поднимет прокси
 * и не прогонит `test-rocodromo-voice.mjs`; без второго каждая сессия начнёт
 * синтезировать все реплики заново, хотя главный чекаут их уже прогрел.
 *
 * Поэтому не копируем, а симлинкуем в главный чекаут: кэш должен быть общим,
 * прогрев в одной сессии обязан быть виден остальным.
 *
 * Идемпотентен, как trim-tts-cache.mjs: повторный запуск ничего не меняет.
 * Чужое настоящее содержимое (не симлинк) не трогает — сообщает и пропускает.
 *
 *   node tools/worktree-bootstrap.mjs [путь-к-worktree]   # по умолчанию cwd
 */

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readlinkSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Что связываем с главным чекаутом. kind нужен только для сообщения.
const SHARED = [
  { path: ".env.local", kind: "ключи" },
  { path: join("assets", "caperucita", "tts-cache"), kind: "кэш синтеза" },
];

const target = resolve(process.argv[2] ?? process.cwd());

// --git-common-dir указывает на .git главного чекаута из любого worktree.
const commonDir = execFileSync("git", ["-C", target, "rev-parse", "--git-common-dir"], {
  encoding: "utf8",
}).trim();
const main = dirname(resolve(target, commonDir));

if (main === target) {
  console.log(`${target} — это и есть главный чекаут, связывать нечего`);
  process.exit(0);
}

let linked = 0, already = 0, missing = 0, occupied = 0;

for (const { path, kind } of SHARED) {
  const src = join(main, path);
  const dst = join(target, path);

  if (!existsSync(src)) {
    console.log(`  ∅ ${path} (${kind}) — в главном чекауте нет, пропускаю`);
    missing++;
    continue;
  }

  if (existsSync(dst) || lstatSync(dst, { throwIfNoEntry: false })) {
    const st = lstatSync(dst);
    if (st.isSymbolicLink() && resolve(dirname(dst), readlinkSync(dst)) === src) {
      already++;
      continue;
    }
    console.log(`  ! ${path} (${kind}) — уже есть и это не наша ссылка, не трогаю`);
    occupied++;
    continue;
  }

  mkdirSync(dirname(dst), { recursive: true });
  symlinkSync(src, dst);
  console.log(`  → ${path} (${kind})`);
  linked++;
}

console.log(
  `worktree ${target}\n` +
  `  связано ${linked}, уже было ${already}` +
  (missing ? `, нет в источнике ${missing}` : "") +
  (occupied ? `, занято своим ${occupied}` : "")
);
