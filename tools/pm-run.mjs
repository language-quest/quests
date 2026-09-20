#!/usr/bin/env node
/**
 * Лаунчер ролевого конвейера: PM (Codex) отсюда заводит сессии Claude Code
 * в ролях разработчика и QA. Человеческое описание — pm/README.md.
 *
 *   node tools/pm-run.mjs dev    T-007              # ветка, worktree, сессия разработчика
 *   node tools/pm-run.mjs qa     T-007              # worktree на коммите ветки, сессия QA
 *   node tools/pm-run.mjs rework T-007 --note "…"   # раунд N+1, та же сессия разработчика
 *   node tools/pm-run.mjs retest T-007 [--note "…"] # раунд N+1, та же сессия QA
 *   node tools/pm-run.mjs retry  T-007 [--role qa]  # перезапустить упавший раунд, не сдвигая счётчик
 *   node tools/pm-run.mjs accept T-007              # merge --no-ff в main, снос worktree
 *   node tools/pm-run.mjs status  [T-007]           # сводка по доске
 *
 * Флаги: --dry показать команду сессии и не запускать её,
 *        --skip-health не требовать поднятого прокси на 5179,
 *        --model <alias> переопределить модель для этого запуска,
 *        --effort low|medium|high|max переопределить усилие рассуждения.
 *
 * Три вещи, которые здесь неочевидны и появились не просто так.
 *
 * `claude -p` сам worktree не создаёт — это функция десктоп-приложения. Раз сессии
 * запускает Codex из терминала, изоляцию делает этот скрипт.
 *
 * Отчёты пишутся в pm/ ГЛАВНОГО чекаута, а не в копию внутри worktree: иначе они
 * осели бы в ветке разработчика и PM не увидел бы их до merge. Поэтому сессии
 * получают --add-dir на главный чекаут и PM_ROOT в окружении.
 *
 * Раунды доработки идут через --resume того же session-id, а не новой сессией:
 * разработчик помнит, что делал в прошлый раз, и правит по замечаниям, а не заново.
 */

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── пути ──────────────────────────────────────────────────────────────────────

const git = (args, cwd = process.cwd()) =>
  execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" }).trim();

const MAIN = dirname(resolve(process.cwd(), git(["rev-parse", "--git-common-dir"])));
const PM = join(MAIN, "pm");
const DIRS = {
  tasks: join(PM, "tasks"),
  reports: join(PM, "reports"),
  state: join(PM, "state"),
  logs: join(PM, "logs"),
  worktrees: join(PM, "worktrees"),
};
for (const d of Object.values(DIRS)) mkdirSync(d, { recursive: true });

const CLAUDE = ["claude", "/opt/homebrew/bin/claude", "/usr/local/bin/claude"].find((c) => {
  try { execFileSync(c, ["--version"], { stdio: "ignore" }); return true; } catch { return false; }
});

const die = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

// Разработчик реализует уже написанное ТЗ — реплики и содержимое карточек в нём
// заданы дословно, это работа по спецификации. QA работает без спецификации на то,
// КАК искать дефект, и должен сопротивляться соблазну поставить PASS там, где
// «вроде работает»: ложный PASS проходит в accept и обесценивает весь конвейер.
// Отсюда асимметрия. Если ТЗ оставило испанский на усмотрение разработчика —
// придумать реплику-ловушку не реализация, запускай его с --model opus.
const MODEL = { dev: "sonnet", qa: "opus" };

// Усилие рассуждения (CLAUDE_CODE_EFFORT_LEVEL). Та же логика, что и с моделью.
// Разработчик реализует зафиксированное ТЗ — medium; low мало, потому что он всё
// равно обязан держать правило «картинка не переводит слово» и сам сверяться
// с критериями приёмки перед сдачей. QA ведёт состязательный поиск в коде, который
// не писал, и его провал — ложный PASS, поэтому max: лишнее рассуждение покупает
// ровно ту полноту, ради которой роль и существует, а токенов QA тратит мало —
// он читает и пишет один отчёт, а не правит файлы по кругу.
const EFFORT = { dev: "medium", qa: "max" };
const EFFORT_LEVELS = ["low", "medium", "high", "max"];

const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : undefined;
};

const modelFor = (role) => flag("--model") ?? MODEL[role];

function checkEffortFlag() {
  const override = flag("--effort");
  if (override && !EFFORT_LEVELS.includes(override)) {
    die(`--effort принимает ${EFFORT_LEVELS.join(" | ")}, а не «${override}»`);
  }
}

function effortFor(role, round) {
  const override = flag("--effort");
  // Доработка означает, что первый раунд что-то упустил: дефект по определению
  // не лежал на поверхности. Раунды редки, поднять усилие здесь дёшево.
  return override ?? (role === "dev" && round > 1 ? "high" : EFFORT[role]);
}

// ── состояние задачи ──────────────────────────────────────────────────────────

const statePath = (id) => join(DIRS.state, `${id}.json`);

const loadState = (id) =>
  existsSync(statePath(id)) ? JSON.parse(readFileSync(statePath(id), "utf8")) : null;

const saveState = (s) => writeFileSync(statePath(s.id), JSON.stringify(s, null, 2) + "\n");

function taskFile(id) {
  const hit = readdirSync(DIRS.tasks).find((f) => f.startsWith(`${id}-`) || f === `${id}.md`);
  if (!hit) die(`ТЗ не найдено: ${join(DIRS.tasks, `${id}-*.md`)}\n  шаблон — pm/tasks/_TEMPLATE.md`);
  return join(DIRS.tasks, hit);
}

function taskTitle(id) {
  const head = readFileSync(taskFile(id), "utf8").split("\n").find((l) => l.startsWith("# "));
  return (head ?? id).replace(/^#\s*/, "").replace(new RegExp(`^${id}\\s*·\\s*`), "").trim();
}

// ── доска ─────────────────────────────────────────────────────────────────────

const BOARD = join(PM, "board.md");
const BOARD_HEAD =
  "# Доска\n\n| ID | Тема | Статус | Раунд | Ветка | Обновлено |\n|---|---|---|---|---|---|\n";
if (!existsSync(BOARD)) writeFileSync(BOARD, BOARD_HEAD);

// Статус на доске пишет сессия, состояние — лаунчер, и они расходятся: после
// успешного раунда доска говорит ready-for-qa, а состояние всё ещё in-dev.
// Доска первична — её заполняет тот, кто делал работу.
function boardStatus(id) {
  const row = readFileSync(BOARD, "utf8").split("\n").find((l) => l.startsWith(`| ${id} |`));
  return row?.split("|")[3]?.trim();
}

function setBoard(id, { status, round, branch }) {
  const today = new Date().toISOString().slice(0, 10);
  const row = `| ${id} | ${taskTitle(id)} | ${status} | ${round} | ${branch} | ${today} |`;
  const lines = readFileSync(BOARD, "utf8").split("\n");

  const at = lines.findIndex((l) => l.startsWith(`| ${id} |`));
  if (at >= 0) lines[at] = row;
  else {
    const placeholder = lines.findIndex((l) => l.startsWith("| — |"));
    if (placeholder >= 0) lines[placeholder] = row;
    else {
      const sep = lines.findIndex((l) => /^\|\s*-+/.test(l));
      lines.splice(sep + 1, 0, row);
    }
  }
  writeFileSync(BOARD, lines.join("\n"));
}

// ── прокси ────────────────────────────────────────────────────────────────────

function checkProxy() {
  if (process.argv.includes("--skip-health")) return;
  try {
    execFileSync("curl", ["-sf", "-m", "3", "http://localhost:5179/api/health"], { stdio: "ignore" });
  } catch {
    die(
      "прокси на 5179 не отвечает.\n" +
      "  Его держит запущенным пользователь: node tools/slng-proxy.mjs\n" +
      "  Без него сессия не прогонит голосовые проверки.\n" +
      "  Осознанно запустить без прокси: добавь --skip-health"
    );
  }
}

// ── worktree ──────────────────────────────────────────────────────────────────

// Сосед по каталогу, а не MAIN/tools: лаунчер должен тащить за собой ту версию
// бутстрапа, с которой его написали, даже если запущен из worktree.
const BOOTSTRAP = join(dirname(fileURLToPath(import.meta.url)), "worktree-bootstrap.mjs");

function bootstrap(path) {
  try {
    execFileSync("node", [BOOTSTRAP, path], { cwd: MAIN, stdio: "inherit" });
  } catch {
    die(`бутстрап worktree не отработал: ${BOOTSTRAP}\n  без него в ${path} не будет .env.local и кэша синтеза`);
  }
}

function devWorktree(id, branch) {
  const path = join(DIRS.worktrees, `${id}-dev`);
  if (!existsSync(path)) {
    const exists = git(["branch", "--list", branch], MAIN) !== "";
    git(["worktree", "add", ...(exists ? [path, branch] : [path, "-b", branch, "main"])], MAIN);
    console.log(`worktree разработчика: ${path} (${branch})`);
  }
  bootstrap(path);
  return path;
}

function qaWorktree(id, branch) {
  const path = join(DIRS.worktrees, `${id}-qa`);
  if (!existsSync(path)) git(["worktree", "add", "--detach", path, branch], MAIN);
  // На ретесте в ветке уже новые коммиты — переезжаем на её текущую вершину.
  git(["checkout", "--detach", branch], path);
  bootstrap(path);
  console.log(`worktree QA: ${path} (detached на ${branch} @ ${git(["rev-parse", "--short", "HEAD"], path)})`);
  return path;
}

// ── запуск сессии ─────────────────────────────────────────────────────────────

function runSession({ id, role, cwd, sessionId, fresh, round, note }) {
  if (!CLAUDE) die("не нашёл исполняемый claude в PATH");

  const prompt = `/${role === "dev" ? "tz" : "qa"} ${id}`;
  const args = [
    "-p",
    fresh ? "--session-id" : "--resume", sessionId,
    "--model", modelFor(role),
    "--permission-mode", "acceptEdits",
    "--add-dir", MAIN,
    "--allowedTools",
    "Read", "Edit", "Write", "Glob", "Grep", "TodoWrite",
    "Bash(node tools/*)", "Bash(git *)", "Bash(curl:*)", "Bash(ls:*)", "Bash(cat:*)",
    "--output-format", "text",
    prompt,
  ];

  if (process.argv.includes("--dry")) {
    console.log(
      `\n[dry] ${cwd}\n[dry] PM_ROOT=${MAIN} PM_ROUND=${round} ` +
      `CLAUDE_CODE_EFFORT_LEVEL=${effortFor(role, round)}${note ? ` PM_NOTE=${JSON.stringify(note)}` : ""}`
    );
    console.log(`[dry] ${CLAUDE} ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);
    return Promise.resolve({ code: 0, output: "" });
  }

  const log = join(DIRS.logs, `${id}.${role}-r${round}.log`);
  console.log(`\n▶ ${role === "dev" ? "разработчик" : "QA"} · ${id} · раунд ${round}`);
  console.log(`  ${fresh ? "новая сессия" : "продолжение сессии"} ${sessionId}`);
  console.log(`  лог: ${log}\n`);

  const out = createWriteStream(log);
  // Шапка пишется до запуска: если сессия умрёт на первом вдохе, в логе должно
  // остаться, что именно запускали. Первый живой прогон оставил ровно 0 байт —
  // по такому логу нельзя отличить «не стартовало» от «стартовало и молчало».
  out.write(
    `# ${id} · ${role} · раунд ${round} · ${new Date().toISOString()}\n` +
    `# cwd: ${cwd}\n# ${CLAUDE} ${args.join(" ")}\n\n`
  );

  const child = spawn(CLAUDE, args, {
    // stdin закрыт: `claude -p` берёт промпт из argv, а открытая труба на stdin
    // оставляет ему повод чего-то ждать.
    stdio: ["ignore", "pipe", "pipe"],
    cwd,
    env: {
      ...process.env,
      PM_ROOT: MAIN,
      PM_ROUND: String(round),
      CLAUDE_CODE_EFFORT_LEVEL: effortFor(role, round),
      ...(note ? { PM_NOTE: note } : {}),
    },
  });
  let seen = "";
  const tap = (d) => { seen += d; };
  child.stdout.on("data", (d) => { process.stdout.write(d); out.write(d); tap(d); });
  child.stderr.on("data", (d) => { process.stderr.write(d); out.write(d); tap(d); });

  return new Promise((done) => {
    child.on("error", (e) => { out.write(`\n# spawn error: ${e.message}\n`); out.end(); done(1); });
    child.on("close", (code) => {
      out.write(`\n# exit=${code}\n`);
      out.end();
      done({ code: code ?? 1, output: seen });
    });
  });
}

// ── подкоманды ────────────────────────────────────────────────────────────────

const argNote = () => flag("--note");

async function cmdDev(id) {
  taskFile(id);
  if (loadState(id)) die(`${id} уже заведена. Для нового раунда: rework ${id} --note "…"`);
  checkProxy();

  const branch = `task/${id}`;
  const s = {
    id, branch, status: "in-dev", round: 1,
    dev: { sessionId: randomUUID(), rounds: 1 },
    qa: { sessionId: null, rounds: 0 },
  };
  const cwd = devWorktree(id, branch);
  s.dev.worktree = cwd;
  saveState(s);
  setBoard(id, { status: "in-dev", round: 1, branch });

  const r = await runSession({ id, role: "dev", cwd, sessionId: s.dev.sessionId, fresh: true, round: 1 });
  finish(id, "dev", r);
}

async function cmdQa(id) {
  const s = loadState(id) ?? die(`${id} не заведена, начни с: dev ${id}`);
  checkProxy();

  const fresh = !s.qa.sessionId;
  if (fresh) s.qa.sessionId = randomUUID();
  s.qa.rounds = s.round;
  const cwd = qaWorktree(id, s.branch);
  s.qa.worktree = cwd;
  saveState(s);

  const r = await runSession({
    id, role: "qa", cwd, sessionId: s.qa.sessionId, fresh, round: s.round, note: argNote(),
  });
  finish(id, "qa", r);
}

async function cmdRework(id) {
  const s = loadState(id) ?? die(`${id} не заведена`);
  const note = argNote();
  if (!note) die('rework без --note "что именно не так" бессмыслен — разработчик не узнает, что править');
  checkProxy();

  s.round += 1;
  s.dev.rounds = s.round;
  s.status = "rework";
  const cwd = devWorktree(id, s.branch);
  saveState(s);
  setBoard(id, { status: "rework", round: s.round, branch: s.branch });

  const r = await runSession({
    id, role: "dev", cwd, sessionId: s.dev.sessionId, fresh: false, round: s.round, note,
  });
  finish(id, "dev", r);
}

async function cmdRetest(id) {
  const s = loadState(id) ?? die(`${id} не заведена`);
  if (!s.qa.sessionId) die(`по ${id} ещё не было QA, начни с: qa ${id}`);
  return cmdQa(id);
}

// Сессия, упавшая до первой строчки (истёкший токен, убитый процесс), не должна
// стоить раунда: раунд считает попытки разработчика, а не попытки запуска.
// Если транскрипта нет, значит продолжать нечего — заводим сессию заново.
function sessionStarted(uuid) {
  const root = join(process.env.HOME, ".claude", "projects");
  if (!existsSync(root)) return false;
  return readdirSync(root).some((d) => existsSync(join(root, d, `${uuid}.jsonl`)));
}

async function cmdRetry(id) {
  const s = loadState(id) ?? die(`${id} не заведена`);
  const role = flag("--role") ?? "dev";
  if (!["dev", "qa"].includes(role)) die("--role принимает dev или qa");
  if (role === "qa" && !s.qa.sessionId) die(`по ${id} ещё не было QA, начни с: qa ${id}`);
  checkProxy();

  const fresh = !sessionStarted(s[role].sessionId);
  if (fresh) s[role].sessionId = randomUUID();
  const cwd = role === "dev" ? devWorktree(id, s.branch) : qaWorktree(id, s.branch);
  s[role].worktree = cwd;
  s.status = role === "dev" ? "in-dev" : "ready-for-qa";
  saveState(s);
  setBoard(id, { status: s.status, round: s.round, branch: s.branch });

  console.log(fresh ? "  прошлая сессия не стартовала — завожу новую" : "  продолжаю прошлую сессию");
  const r = await runSession({
    id, role, cwd, sessionId: s[role].sessionId, fresh, round: s.round, note: argNote(),
  });
  finish(id, role, r);
}

function cmdAccept(id) {
  const s = loadState(id) ?? die(`${id} не заведена`);

  const qaReports = readdirSync(DIRS.reports).filter((f) => f.startsWith(`${id}.qa-r`)).sort();
  if (!qaReports.length) die(`по ${id} нет ни одного отчёта QA — принимать нечего`);
  const last = readFileSync(join(DIRS.reports, qaReports.at(-1)), "utf8");
  if (!/^\s*qa-passed\s*$/m.test(last) || /^\s*qa-failed\s*$/m.test(last)) {
    die(
      `в ${qaReports.at(-1)} нет вердикта qa-passed отдельной строкой.\n` +
      "  Если QA прошёл — строка «qa-passed» в секции «Вердикт». Иначе: rework/retest."
    );
  }

  if (git(["rev-parse", "--abbrev-ref", "HEAD"], MAIN) !== "main") die("главный чекаут не на main");

  // Бумаги доски коммитим отдельно от кода: их писали сессии прямо в главный чекаут.
  // Перечисляем поимённо, а не `git add pm`: worktree и логи лежат внутри pm/, и
  // стоит строке из .gitignore пропасть — в коммит уедут вложенные git-репозитории.
  const papers = ["pm/README.md", "pm/board.md", "pm/tasks", "pm/reports", "pm/state"];
  git(["add", "--", ...papers], MAIN);
  if (git(["diff", "--cached", "--name-only"], MAIN)) {
    git(["commit", "-m", `pm: papers for ${id}`], MAIN);
  }

  git(["merge", "--no-ff", s.branch, "-m", `Merge ${id}: ${taskTitle(id)}`], MAIN);

  for (const wt of [s.dev?.worktree, s.qa?.worktree].filter((p) => p && existsSync(p))) {
    git(["worktree", "remove", "--force", wt], MAIN);
  }
  git(["branch", "-d", s.branch], MAIN);

  s.status = "accepted";
  saveState(s);
  setBoard(id, { status: "accepted", round: s.round, branch: "—" });
  git(["add", "--", ...papers], MAIN);
  git(["commit", "-m", `pm: accept ${id}`], MAIN);

  console.log(`✓ ${id} принята и влита в main, worktree сняты`);
}

function cmdStatus(id) {
  console.log(readFileSync(BOARD, "utf8").trim() + "\n");
  const ids = id ? [id] : readdirSync(DIRS.state).map((f) => f.replace(/\.json$/, ""));
  for (const t of ids) {
    const s = loadState(t);
    if (!s) continue;
    const reports = readdirSync(DIRS.reports).filter((f) => f.startsWith(`${t}.`)).sort();
    console.log(`${t} · ${s.status} · раунд ${s.round} · ${s.branch}`);
    console.log(reports.length ? reports.map((r) => `    ${r}`).join("\n") : "    отчётов нет");
  }
}

// Сессия могла упасть, не написав ни строчки отчёта. Молча оставить на доске
// «in-dev» нельзя: PM будет ждать работу, которой не происходит.
function finish(id, role, { code, output }) {
  const s = loadState(id);
  const who = role === "dev" ? "разработчик" : "QA";
  const wrote = readdirSync(DIRS.reports).some((f) => f.startsWith(`${id}.${role}-r${s?.round ?? 1}`));

  if (code === 0 && wrote) {
    const onBoard = boardStatus(id);
    if (s && onBoard && onBoard !== s.status) { s.status = onBoard; saveState(s); }
    console.log(`\n✓ ${who} отработал. Отчёты: ${DIRS.reports}`);
    console.log(`  статус на доске: ${onBoard ?? s?.status} · раунд ${s?.round}`);
    process.exit(0);
  }

  const failed = `${role}-failed`;
  if (s) { s.status = failed; saveState(s); setBoard(id, { status: failed, round: s.round, branch: s.branch }); }

  console.error(`\n✗ ${who} не сдал работу (код ${code}${wrote ? "" : ", отчёта нет"}).`);
  console.error(`  статус на доске: ${failed}. Лог: ${DIRS.logs}`);

  if (/OAuth access token has expired|authentication_error|Failed to authenticate|Invalid API key/i.test(output)) {
    console.error(
      "\n  Причина — истёкшая авторизация claude, а не задача.\n" +
      "  Починить может только человек, интерактивно: запустить `claude` и выполнить /login.\n" +
      "  После этого: node tools/pm-run.mjs retry " + id
    );
  } else if (!output.trim()) {
    console.error("  Сессия не выдала ни байта — смотри шапку лога, там полная команда запуска.");
  }
  process.exit(code || 1);
}

// ── разбор командной строки ───────────────────────────────────────────────────

const [cmd, id] = process.argv.slice(2);
const needsId = { dev: cmdDev, qa: cmdQa, rework: cmdRework, retest: cmdRetest, retry: cmdRetry, accept: cmdAccept };

if (cmd === "status") cmdStatus(id);
else if (needsId[cmd]) {
  if (!id) die(`${cmd} требует ID задачи, например: node tools/pm-run.mjs ${cmd} T-007`);
  checkEffortFlag(); // до создания worktree, а не в момент запуска сессии
  await needsId[cmd](id);
} else {
  console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").slice(2, 15).join("\n").replace(/^ \* ?/gm, ""));
  process.exit(cmd ? 1 : 0);
}
