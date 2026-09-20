#!/usr/bin/env node
/**
 * Генерация картинки через fal.ai. Ключ — FAL_KEY в .env.local (в git не идёт).
 *
 *   node tools/gen-image.mjs "<промпт>" <куда/сохранить.png> [--model fal-ai/flux/dev]
 *                            [--size landscape_4_3] [--seed 42] [--n 1]
 *
 * Без --n пишет ровно в указанный путь; при --n > 1 добавляет суффикс -1, -2, …
 * Картинки сохраняются локально, ничего наружу не публикуется.
 * Промпт не должен просить текст внутри картинки (правило квестов).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Тот же разбор .env.local, что и в tools/slng-proxy.mjs; окружение приоритетнее файла.
// В worktree своего .env.local может не быть — берём из главного чекаута.
const MAIN = (() => {
  try { return dirname(resolve(ROOT, execFileSync("git", ["-C", ROOT, "rev-parse", "--git-common-dir"], { encoding: "utf8" }).trim())); }
  catch { return ROOT; }
})();
for (const file of [join(ROOT, ".env.local"), join(MAIN, ".env.local"), join(ROOT, ".env"), join(MAIN, ".env")]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return dflt;
  return args.splice(i, 2)[1];
};
const model = flag("model", "fal-ai/flux/dev");
const size = flag("size", "landscape_4_3");
const seed = flag("seed", undefined);
const n = Number(flag("n", "1"));
const imageArg = flag("image", undefined); // референс: файл -> image_url (для правки и image-to-video)
const duration = flag("duration", undefined);
const [prompt, out] = args;

if (!prompt || !out) {
  console.error('Использование: node tools/gen-image.mjs "<промпт>" <файл.png> [--model …] [--size …] [--seed N] [--n N]');
  process.exit(2);
}
const KEY = process.env.FAL_KEY;
if (!KEY) {
  console.error("FAL_KEY не задан: добавь строку FAL_KEY=… в .env.local (см. .env.local.example).");
  process.exit(2);
}

const body = { prompt };
if (imageArg) {
  const mime = /\.jpe?g$/i.test(imageArg) ? "image/jpeg" : "image/png";
  body.image_url = `data:${mime};base64,${readFileSync(resolve(imageArg)).toString("base64")}`;
} else {
  body.image_size = size;
  body.num_images = n;
}
if (duration) body.duration = duration;
if (seed !== undefined) body.seed = Number(seed);

const res = await fetch(`https://fal.run/${model}`, {
  method: "POST",
  headers: { Authorization: `Key ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`fal ${res.status}: ${(await res.text()).slice(0, 500)}`);
  process.exit(1);
}
const data = await res.json();
const images = data.images || (data.image ? [data.image] : data.video ? [data.video] : []);
if (!images.length) {
  console.error("fal не вернул картинок:", JSON.stringify(data).slice(0, 500));
  process.exit(1);
}

const target = resolve(out);
mkdirSync(dirname(target), { recursive: true });
const ext = extname(target) || ".png";
if (data.cost !== undefined) console.log(`cost ${data.cost}`);
const stem = target.slice(0, target.length - ext.length);
for (const [i, img] of images.entries()) {
  const dest = images.length === 1 ? target : `${stem}-${i + 1}${ext}`;
  const bin = Buffer.from(await (await fetch(img.url)).arrayBuffer());
  writeFileSync(dest, bin);
  console.log(`${dest}  (${img.width ?? "?"}×${img.height ?? "?"}, ${(bin.length / 1024).toFixed(0)} KB)`);
}
if (data.seed !== undefined) console.log(`seed ${data.seed}`);
