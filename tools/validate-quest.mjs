#!/usr/bin/env node
// Валидаторы квест-пака (раздел 6 architecture.md).
// Запуск: node tools/validate-quest.mjs assets/caperucita/quest.json

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const path = resolve(process.argv[2] ?? "assets/caperucita/quest.json");
const quest = JSON.parse(readFileSync(path, "utf8"));
const root = dirname(path);
const artDir = join(root, quest.art.basePath);

const ATTRS = ["water", "trees", "flowers"];
const errors = [];
const warnings = [];
const ok = [];

/** Совпадает ли место с уликой. Считаем СОВПАДЕНИЕ С УЛИКОЙ, а не наличие свойства. */
function matches(attr, clue, props) {
  if (attr === "trees") return props.trees === clue.value;
  const has = props[attr] === true;
  return clue.polarity === "negative" ? !has : has;
}

// --- 0. schema: без этого остальные проверки дают ложное зелёное -------
for (const [pid, p] of Object.entries(quest.places)) {
  const pr = p.props ?? {};
  if (typeof pr.water !== "boolean") errors.push(`[schema] ${pid}: props.water должно быть boolean, сейчас ${typeof pr.water}`);
  if (typeof pr.flowers !== "boolean") errors.push(`[schema] ${pid}: props.flowers должно быть boolean, сейчас ${typeof pr.flowers}`);
  if (!Number.isInteger(pr.trees)) errors.push(`[schema] ${pid}: props.trees должно быть целым, сейчас ${JSON.stringify(pr.trees)}`);
}
for (const [vid, v] of Object.entries(quest.variants)) {
  const dup = v.places.filter((x, i) => v.places.indexOf(x) !== i);
  if (dup.length) errors.push(`[schema] ${vid}: места повторяются: ${[...new Set(dup)].join(", ")}`);
  if (v.places.length !== 4) errors.push(`[schema] ${vid}: мест ${v.places.length}, должно быть 4`);
  for (const pid of v.places) if (!quest.places[pid]) errors.push(`[schema] ${vid}: неизвестное место ${pid}`);
  if (!v.places.includes(v.target)) errors.push(`[schema] ${vid}: цель ${v.target} отсутствует в списке мест`);
  for (const a of ATTRS) {
    const c = v.clues?.[a];
    if (!c) { errors.push(`[schema] ${vid}: нет улики "${a}"`); continue; }
    if (a === "trees") {
      if (!Number.isInteger(c.value)) errors.push(`[schema] ${vid}/trees: value должно быть целым`);
    } else if (!["positive", "negative"].includes(c.polarity)) {
      errors.push(`[schema] ${vid}/${a}: polarity должно быть positive|negative, сейчас ${JSON.stringify(c.polarity)}`);
    }
  }
  const assigned = Object.values(v.assign ?? {});
  for (const a of ATTRS) if (!assigned.includes(a)) errors.push(`[schema] ${vid}: признак "${a}" никому не назначен`);
  if (assigned.length !== new Set(assigned).size) errors.push(`[schema] ${vid}: один признак назначен дважды`);
  for (const cid of Object.keys(v.assign ?? {})) if (!quest.characters[cid]) errors.push(`[schema] ${vid}: неизвестный персонаж ${cid}`);
}
if (errors.length) {
  console.log(`\nКвест: ${quest.id}\n`);
  errors.forEach((l) => console.log("  FAIL " + l));
  console.log(`\nПРОВАЛЕНО на проверке схемы: ошибок ${errors.length}\n`);
  process.exit(1);
}

// --- 1. matrix-profiles -------------------------------------------------
for (const [vid, v] of Object.entries(quest.variants)) {
  const profiles = v.places.map((pid) => {
    const props = quest.places[pid].props;
    const bits = ATTRS.map((a) => (matches(a, v.clues[a], props) ? "1" : "0")).join("");
    return { pid, bits };
  });

  const target = profiles.find((p) => p.pid === v.target);
  const wrong = profiles.filter((p) => p.pid !== v.target);

  if (!target || target.bits !== "111") {
    errors.push(`[matrix-profiles] ${vid}: цель ${v.target} даёт ${target?.bits ?? "?"}, должно 111`);
  }
  const got = wrong.map((w) => w.bits).sort().join(",");
  const want = ["110", "101", "011"].sort().join(",");
  if (got !== want) {
    errors.push(`[matrix-profiles] ${vid}: профили неверных мест ${got}, должно ${want}`);
    wrong.forEach((w) => errors.push(`    ${w.pid} → ${w.bits}`));
  } else {
    ok.push(`[matrix-profiles] ${vid}: цель 111, неверные 110/101/011 — по одному разу`);
  }

  // load-bearing: убрать любую улику — ответ становится неоднозначным
  for (const drop of ATTRS) {
    const rest = ATTRS.filter((a) => a !== drop);
    const survivors = v.places.filter((pid) =>
      rest.every((a) => matches(a, v.clues[a], quest.places[pid].props)),
    );
    if (survivors.length < 2) {
      errors.push(`[load-bearing] ${vid}: без улики "${drop}" остаётся ${survivors.length} мест — улика лишняя`);
    }
  }
}

// --- 2. clue-leak: в state1 не должно быть признака ---------------------
// \b не работает с "árboles" и кириллицей: JS считает á границей слова.
// Поэтому нормализуем диакритику и режем на слова сами.
const deaccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const tokensOf = (s) => deaccent(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const LEAK = {
  water: [/^agua/, /^vod/, /^вод/],
  trees: [/^arbol/, /^tres$/, /^dos$/, /^derev/, /^дерев/],
  flowers: [/^flor/, /^huele$/, /^ole/, /^cvet/, /^цвет/, /^pah/, /^пах/],
};
for (const [vid, v] of Object.entries(quest.variants)) {
  for (const [cid, attr] of Object.entries(v.assign)) {
    const st1 = quest.characters[cid].state1;
    for (const field of ["es", "ru"]) {
      for (const tok of tokensOf(st1[field] ?? "")) {
        for (const re of LEAK[attr]) {
          if (re.test(tok)) {
            errors.push(`[clue-leak] ${vid}/${cid}: state1.${field} содержит слово "${tok}" — признак "${attr}"`);
          }
        }
      }
    }
  }
}
if (!errors.some((e) => e.startsWith("[clue-leak]"))) ok.push("[clue-leak] во вступлениях признаков нет");

// --- 3. character-capability -------------------------------------------
for (const [vid, v] of Object.entries(quest.variants)) {
  for (const [cid, attr] of Object.entries(v.assign)) {
    const cap = quest.characters[cid].capability;
    const mod = quest.attributes[attr].modality;
    if (!cap.includes(mod)) {
      errors.push(`[character-capability] ${vid}: ${cid} не может нести признак "${attr}" (${mod}); умеет ${cap}`);
    }
  }
}
if (!errors.some((e) => e.startsWith("[character-capability]"))) ok.push("[character-capability] признаки розданы по возможностям персонажей");

// --- 4. absence-shown: отсутствие изображается чем-то -------------------
for (const [pid, p] of Object.entries(quest.places)) {
  if (p.props.flowers === false && !p.absenceShown) {
    warnings.push(`[absence-shown] ${pid}: нет цветов и не задано, чем показано отсутствие`);
  }
  if (p.props.water === false && !p.sound) {
    warnings.push(`[absence-shown] ${pid}: нет воды и не задан звук тишины`);
  }
}

// --- 5. treeZones соответствуют props.trees ----------------------------
for (const [pid, p] of Object.entries(quest.places)) {
  if (!p.treeZones) { warnings.push(`[hit-zones] ${pid}: нет treeZones`); continue; }
  if (p.treeZones.length !== p.props.trees) {
    errors.push(`[hit-zones] ${pid}: ${p.treeZones.length} зон при props.trees=${p.props.trees}`);
  }
  p.treeZones.forEach((z, i) => {
    if (z.x < 0 || z.y < 0 || z.x + z.w > 1.001 || z.y + z.h > 1.001) {
      errors.push(`[hit-zones] ${pid}: зона ${i} выходит за пределы изображения`);
    }
  });
}

// --- 6. зоны поиска не перекрываются -----------------------------------
const S = quest.search.spots;
// геометрия: зона обязана лежать внутри изображения
const inBounds = (z) => z && [z.x, z.y, z.w, z.h].every(Number.isFinite)
  && z.w > 0 && z.h > 0 && z.x >= 0 && z.y >= 0 && z.x + z.w <= 1.001 && z.y + z.h <= 1.001;
for (const sp of S) {
  if (!inBounds(sp.zone)) errors.push(`[hit-zones] укрытие ${sp.id}: зона вне изображения ${JSON.stringify(sp.zone)}`);
}
for (const [cid, ch] of Object.entries(quest.characters)) {
  for (const [what, z] of [["childAction", ch.childAction?.zone], ["ambientZone", ch.ambientZone]]) {
    if (z && !inBounds(z)) errors.push(`[hit-zones] ${cid}.${what}: зона вне изображения ${JSON.stringify(z)}`);
  }
}
for (let i = 0; i < S.length; i++) {
  for (let j = i + 1; j < S.length; j++) {
    const a = S[i].zone, b = S[j].zone;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0 && oy > 0) errors.push(`[hit-zones] укрытия ${S[i].id} и ${S[j].id} перекрываются`);
  }
}
for (const s of S) {
  const minSide = Math.min(s.zone.w * 1536, s.zone.h * 1024);
  if (minSide < 80) warnings.push(`[touch-size] укрытие ${s.id}: сторона ${Math.round(minSide)}px в нативном размере — мелковато`);
}

// --- 7. предметы разложены по существующим укрытиям --------------------
for (const it of quest.search.items) {
  if (!S.some((s) => s.id === it.spot)) errors.push(`[search] предмет ${it.id} указывает на несуществующее укрытие ${it.spot}`);
}

// --- 8. art-exists ------------------------------------------------------
const seen = new Set();
function checkArt(file, where) {
  if (!file || typeof file !== "string" || !file.endsWith(".png")) return;
  if (seen.has(file)) return;
  seen.add(file);
  if (!existsSync(join(artDir, file))) errors.push(`[art-exists] ${where}: нет файла ${file}`);
}
(function walk(node, path0) {
  if (typeof node === "string") return checkArt(node, path0);
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path0}[${i}]`));
  if (node && typeof node === "object") for (const [k, val] of Object.entries(node)) walk(val, `${path0}.${k}`);
})(quest, "quest");
if (!errors.some((e) => e.startsWith("[art-exists]"))) ok.push(`[art-exists] все ${seen.size} упомянутых файлов на месте`);

// --- отчёт --------------------------------------------------------------
console.log(`\nКвест: ${quest.id} — ${quest.title.ru}\n`);
ok.forEach((l) => console.log("  OK   " + l));
warnings.forEach((l) => console.log("  WARN " + l));
errors.forEach((l) => console.log("  FAIL " + l));
console.log(`\n${errors.length ? "ПРОВАЛЕНО" : "ПРОЙДЕНО"}: ошибок ${errors.length}, предупреждений ${warnings.length}\n`);
process.exit(errors.length ? 1 : 0);
