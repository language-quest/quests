#!/usr/bin/env node
/**
 * Лаунчер ролевого конвейера: PM (Codex) отсюда заводит сессии Claude Code
 * в ролях разработчика и QA. Человеческое описание — pm/README.md.
 *
 *   node tools/pm-run.mjs dev    T-007              # ветка, worktree, сессия разработчика
 *   node tools/pm-run.mjs qa     T-007              # worktree на коммите ветки, сессия QA
 *   node tools/pm-run.mjs rework T-007 --note "…"   # раунд N+1, та же сессия разработчика
 *   node tools/pm-run.mjs retest T-007 [--note "…"] # раунд N+1, та же сессия QA
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
    return Promise.resolve(0);
  }

  const log = join(DIRS.logs, `${id}.${role}-r${round}.log`);
  console.log(`\n▶ ${role === "dev" ? "разработчик" : "QA"} · ${id} · раунд ${round}`);
  console.log(`  ${fresh ? "новая сессия" : "продолжение сессии"} ${sessionId}`);
  console.log(`  лог: ${log}\n`);

  const out = createWriteStream(log);
  const child = spawn(CLAUDE, args, {
    cwd,
    env: {
      ...process.env,
      PM_ROOT: MAIN,
      PM_ROUND: String(round),
      CLAUDE_CODE_EFFORT_LEVEL: effortFor(role, round),
      ...(note ? { PM_NOTE: note } : {}),
    },
  });
  child.stdout.on("data", (d) => { process.stdout.write(d); out.write(d); });
  child.stderr.on("data", (d) => { process.stderr.write(d); out.write(d); });

  return new Promise((done) => child.on("close", (code) => { out.end(); done(code ?? 1); }));
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

  const code = await runSession({ id, role: "dev", cwd, sessionId: s.dev.sessionId, fresh: true, round: 1 });
  finish(id, code, "разработчик");
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

  const code = await runSession({
    id, role: "qa", cwd, sessionId: s.qa.sessionId, fresh, round: s.round, note: argNote(),
  });
  finish(id, code, "QA");
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

  const code = await runSession({
    id, role: "dev", cwd, sessionId: s.dev.sessionId, fresh: false, round: s.round, note,
  });
  finish(id, code, "разработчик");
}

async function cmdRetest(id) {
  const s = loadState(id) ?? die(`${id} не заведена`);
  if (!s.qa.sessionId) die(`по ${id} ещё не было QA, начни с: qa ${id}`);
  return cmdQa(id);
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

function finish(id, code, who) {
  const s = loadState(id);
  console.log(
    code === 0
      ? `\n✓ ${who} отработал. Отчёты: ${DIRS.reports}`
      : `\n✗ сессия ${who}а завершилась с кодом ${code} — смотри лог в ${DIRS.logs}`
  );
  if (s) console.log(`  статус на доске: ${s.status} · раунд ${s.round}`);
  process.exit(code);
}

// ── разбор командной строки ───────────────────────────────────────────────────

const [cmd, id] = process.argv.slice(2);
const needsId = { dev: cmdDev, qa: cmdQa, rework: cmdRework, retest: cmdRetest, accept: cmdAccept };

if (cmd === "status") cmdStatus(id);
else if (needsId[cmd]) {
  if (!id) die(`${cmd} требует ID задачи, например: node tools/pm-run.mjs ${cmd} T-007`);
  checkEffortFlag(); // до создания worktree, а не в момент запуска сессии
  await needsId[cmd](id);
} else {
  console.log(readFileSync(new URL(import.meta.url)).toString().split("\n").slice(2, 15).join("\n").replace(/^ \* ?/gm, ""));
  process.exit(cmd ? 1 : 0);
}
