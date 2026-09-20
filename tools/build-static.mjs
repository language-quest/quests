#!/usr/bin/env node
/**
 * Собирает dist/ для Cloudflare Workers (static assets).
 *
 * Страницы в web/ ссылаются на ../assets/..., поэтому раскладка dist/ повторяет
 * репозиторий: dist/web/*, dist/assets/*. Копируется только то, что игра реально
 * грузит: исходники иллюстраций (123 МБ), tts-cache и черновики остаются дома.
 */
import { cpSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");

const COPY = [
  "web",
  "assets/catalog",
  "assets/coworking",
  "assets/rocodromo/quest.json",
  "assets/rocodromo/place-banco.png",
  "assets/rocodromo/place-pared.png",
  "assets/rocodromo/place-taquilla.png",
  "assets/caperucita/quest.json",
  "assets/caperucita/web",
];

rmSync(out, { recursive: true, force: true });
for (const p of COPY) {
  mkdirSync(dirname(join(out, p)), { recursive: true });
  cpSync(join(root, p), join(out, p), { recursive: true });
}
writeFileSync(
  join(out, "index.html"),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/web/quests.html"><link rel="canonical" href="/web/quests.html">',
);
console.log("dist/ listo:", COPY.join(", "));
