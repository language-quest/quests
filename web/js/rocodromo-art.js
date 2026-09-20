// Иллюстрации квеста про скалодром: оригинальный SVG, перенесённый из
// la_ruta_secreta_complete.zip (site/index.html) и перекрашенный под тёмную тему.
// Фотографий в архиве нет; черновик, чей стиль взят за основу, построен на emoji + CSS.

const SKIN = ["#e0ae85", "#c08a63", "#8d5f43"];
const SHIRT = ["#2e8f7a", "#c9b285", "#9ac96b"];

const ROPE = "#ff5d45";
const ROPE2 = "#5eb8ff";
const METAL = "#c8d4cc";
const HAIR = "#4a342a";
const BEARD = "#3a2a1f";
const LIME = "#dfff4f";

const svg = (vb, inner, label) =>
  `<svg viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

/** Человек в полный рост. Нужен на КАЖДОЙ стене: цвет, а не наличие фигуры, — признак. */
function person(x, y, s = 1, shirt = SHIRT[0], skin = SKIN[0]) {
  const p = (dx, dy) => `${x + dx * s} ${y + dy * s}`;
  return `<g>
    <circle cx="${x}" cy="${y}" r="${11 * s}" fill="${skin}"/>
    <path d="M${p(-12, 15)} Q${p(0, 7)} ${p(12, 15)} L${p(15, 48)} H${x - 15 * s}Z" fill="${shirt}"/>
    <path d="M${p(-10, 48)} L${p(-13, 78)} M${p(10, 48)} L${p(13, 78)} M${p(-12, 20)} L${p(-28, 40)} M${p(12, 20)} L${p(28, 40)}"
      fill="none" stroke="#2a3630" stroke-width="${7 * s}" stroke-linecap="round"/>
    <path d="M${p(-12, 44)} H${x + 12 * s} L${p(5, 54)} H${x - 5 * s}Z" fill="#d7b25a" stroke="#1d2723" stroke-width="${2 * s}"/>
  </g>`;
}

/** Глаза и улыбка поверх головы из person(). Радиус головы там — 11·s. */
function face(x, y, s = 1) {
  return `<g>
    <circle cx="${x - 4 * s}" cy="${y - 1 * s}" r="${1.7 * s}" fill="#1d2723"/>
    <circle cx="${x + 4 * s}" cy="${y - 1 * s}" r="${1.7 * s}" fill="#1d2723"/>
    <path d="M${x - 4 * s} ${y + 4 * s} q${4 * s} ${3.4 * s} ${8 * s} 0"
      fill="none" stroke="#1d2723" stroke-width="${1.6 * s}" stroke-linecap="round"/>
  </g>`;
}

/* ---------------- персонажи ---------------- */
// У администраторши и тренера есть лицо; у фигур на стенах сцены 2 — нет,
// иначе Карлос узнавался бы по виду и загадка «junto a la pared roja» отпадала.

/** Волосы пучком, выбившаяся прядь, серёжка. */
function recepHead(x, y, s = 1) {
  return `<g>
    <path d="M${x - 11 * s} ${y + 1 * s} q${-1 * s} ${-15 * s} ${11 * s} ${-15 * s}
             q${12 * s} 0 ${11 * s} ${15 * s} q${-3 * s} ${-7 * s} ${-11 * s} ${-7 * s}
             q${-8 * s} 0 ${-11 * s} ${7 * s}Z" fill="${HAIR}"/>
    <circle cx="${x}" cy="${y - 16 * s}" r="${5.5 * s}" fill="${HAIR}"/>
    <path d="M${x - 10 * s} ${y + 1 * s} q${-4 * s} ${8 * s} ${-1 * s} ${14 * s}"
      fill="none" stroke="${HAIR}" stroke-width="${2.4 * s}" stroke-linecap="round"/>
    ${face(x, y, s)}
    <circle cx="${x - 11 * s}" cy="${y + 4 * s}" r="${2 * s}" fill="none" stroke="${LIME}" stroke-width="${1.2 * s}"/>
  </g>`;
}

/** Шапка-бини, очки на шапке, борода. Лоб и глаза открыты: шапка садится выше. */
function carlosHead(x, y, s = 1) {
  return `<g>
    <path d="M${x - 11.5 * s} ${y - 6 * s} q${-1 * s} ${-13 * s} ${11.5 * s} ${-13 * s}
             q${12.5 * s} 0 ${11.5 * s} ${13 * s}Z" fill="${LIME}"/>
    <rect x="${x - 11.5 * s}" y="${y - 8.5 * s}" width="${23 * s}" height="${4 * s}" rx="${2 * s}" fill="#c3e23a"/>
    <rect x="${x - 9 * s}" y="${y - 14 * s}" width="${18 * s}" height="${3.6 * s}" rx="${1.8 * s}" fill="#1d2723"/>
    <path d="M${x - 9.5 * s} ${y + 4 * s} q0 ${9 * s} ${9.5 * s} ${9 * s}
             q${9.5 * s} 0 ${9.5 * s} ${-9 * s} q${-3.5 * s} ${5 * s} ${-9.5 * s} ${5 * s}
             q${-6 * s} 0 ${-9.5 * s} ${-5 * s}Z" fill="${BEARD}"/>
    <path d="M${x - 8 * s} ${y + 1 * s} h${4 * s} M${x + 4 * s} ${y + 1 * s} h${4 * s}"
      stroke="${BEARD}" stroke-width="${1.6 * s}" stroke-linecap="round"/>
    <circle cx="${x - 4.5 * s}" cy="${y - 1 * s}" r="${1.8 * s}" fill="#1d2723"/>
    <circle cx="${x + 4.5 * s}" cy="${y - 1 * s}" r="${1.8 * s}" fill="#1d2723"/>
  </g>`;
}

const personRecep = (x, y, s = 1) =>
  `${person(x, y, s, "#2e8f7a", SKIN[0])}${recepHead(x, y, s)}` +
  `<path d="M${x - 11 * s} ${y + 17 * s} L${x + 13 * s} ${y + 46 * s}"
     stroke="${LIME}" stroke-width="${3 * s}" fill="none"/>`;

const personCarlos = (x, y, s = 1) =>
  `${person(x, y, s, "#1f2b24", SKIN[1])}${carlosHead(x, y, s)}` +
  `<path d="M${x + 14 * s} ${y + 24 * s} q${5 * s} ${4 * s} ${2 * s} ${9 * s}"
     stroke="#6b7d73" stroke-width="${2.4 * s}" fill="none" stroke-linecap="round"/>`;


/* ---------------- Диего ---------------- */
// Напарник-новичок: тёмные кудри, оранжевая футболка, тёмно-синие брюки, магнезийный мешок.
// Силуэт не совпадает с Карлосом (бини + борода + чёрная куртка). Оранжевый не равен цвету
// ни одной «правильной» карточки: секретная трасса зелёная, стена — красная.
// Состояния лица: normal | pensativo | atento | contento.

const DIEGO_SHIRT = "#f08a2e";
const DIEGO_PANTS = "#243a5e";
const CURL = "#2b1d16";
const INK = "#1d2723";

function diegoFace(x, y, s, state) {
  const eye = (dx, r = 1.8) => `<circle cx="${x + dx * s}" cy="${y - 1 * s}" r="${r * s}" fill="${INK}"/>`;
  const stroke = `stroke="${INK}" stroke-width="${1.6 * s}" stroke-linecap="round" fill="none"`;
  if (state === "contento") {
    return `<path d="M${x - 6.5 * s} ${y - 0.5 * s} q${2.5 * s} ${-3.5 * s} ${5 * s} 0 M${x + 1.5 * s} ${y - 0.5 * s} q${2.5 * s} ${-3.5 * s} ${5 * s} 0" ${stroke}/>
      <path d="M${x - 5 * s} ${y + 3.5 * s} q${5 * s} ${7 * s} ${10 * s} 0Z" fill="#7a2f22" stroke="${INK}" stroke-width="${1.2 * s}" stroke-linejoin="round"/>`;
  }
  if (state === "pensativo") {
    return `${eye(-4.5)}${eye(4.5)}
      <path d="M${x - 8 * s} ${y - 5.5 * s} l${6 * s} ${-2 * s} M${x + 2 * s} ${y - 7 * s} l${6 * s} ${2 * s}" ${stroke}/>
      <path d="M${x - 3 * s} ${y + 6 * s} q${3 * s} ${-2 * s} ${6 * s} ${0.6 * s}" ${stroke}/>`;
  }
  if (state === "atento") {
    return `${eye(-4.5, 2.3)}${eye(4.5, 2.3)}
      <path d="M${x - 8 * s} ${y - 6 * s} h${7 * s} M${x + 1 * s} ${y - 6 * s} h${7 * s}" ${stroke}/>
      <path d="M${x - 2.5 * s} ${y + 5.5 * s} h${5 * s}" ${stroke}/>`;
  }
  return `${eye(-4.5)}${eye(4.5)}
    <path d="M${x - 4.5 * s} ${y + 4 * s} q${4.5 * s} ${3.6 * s} ${9 * s} 0" ${stroke}/>`;
}

/** Кудри: гроздь кругов над лбом и у висков. */
function diegoHead(x, y, s = 1, state = "normal") {
  const c = (dx, dy, r) => `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${r * s}" fill="${CURL}"/>`;
  return `<g>${c(-10, -6, 5.5)}${c(-5, -12, 6)}${c(2, -14, 6.5)}${c(9, -10, 6)}${c(12, -3, 4.5)}${c(-12, 1, 4)}
    ${diegoFace(x, y, s, state)}</g>`;
}

/** Диего в рост: руки опущены, ничего и никуда не показывает. Мешок с магнезией на поясе. */
function personDiego(x, y, s = 1, state = "normal") {
  const p = (dx, dy) => `${x + dx * s} ${y + dy * s}`;
  const limb = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w * s}" stroke-linecap="round"/>`;
  return `<g>
    ${limb(`M${p(-9, 48)} L${p(-12, 78)} M${p(9, 48)} L${p(12, 78)}`, DIEGO_PANTS, 9)}
    ${limb(`M${p(-12, 20)} L${p(-27, 40)} M${p(12, 20)} L${p(27, 40)}`, SKIN[0], 6)}
    <circle cx="${x}" cy="${y}" r="${11 * s}" fill="${SKIN[0]}"/>
    <path d="M${p(-12, 15)} Q${p(0, 7)} ${p(12, 15)} L${p(15, 48)} H${x - 15 * s}Z" fill="${DIEGO_SHIRT}"/>
    ${limb(`M${p(-12, 19)} L${p(-19, 29)} M${p(12, 19)} L${p(19, 29)}`, DIEGO_SHIRT, 9)}
    <path d="M${p(-13, 44)} q${-6 * s} ${8 * s} ${1 * s} ${13 * s} q${8 * s} ${2 * s} ${10 * s} ${-7 * s}Z" fill="#e9e3d2" stroke="${INK}" stroke-width="${1.6 * s}"/>
    ${diegoHead(x, y, s, state)}
  </g>`;
}

/** Половина бумажной эмблемы. Без надписей и цветов ответов: только знак. */
function emblemHalf(cx, cy, side, r = 34) {
  const arc = side === "left" ? 0 : 1;
  const k = side === "left" ? -1 : 1;
  const zig = `L${k * -6} 22 L${k * 6} 8 L${k * -6} -6 L${k * 6} -20`;
  const path = `M0 ${-r} A${r} ${r} 0 0 ${arc} 0 ${r} ${zig}Z`;
  return `<g transform="translate(${cx} ${cy})" aria-hidden="true">
    <path d="${path}" fill="${side === "left" ? "#26342c" : "#2f4237"}" stroke="${LIME}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M${k * 9} -10 q${k * 8} 12 ${k * 2} 26" fill="none" stroke="${ROPE}" stroke-width="4" stroke-linecap="round"/>
  </g>`;
}

const emblemWhole = (cx, cy, r = 34) => `<g aria-hidden="true">${emblemHalf(cx - 1, cy, "left", r)}${emblemHalf(cx + 1, cy, "right", r)}</g>`;

/** Круглый портрет для реплики. Ключи: "avatar:recepcionista" | "avatar:carlos". */
function diegoAvatar(state) {
  return svg("0 0 96 96", `
    <circle cx="48" cy="48" r="48" fill="#26342c"/>
    <path d="M6 96 Q11 68 34 60 L62 60 Q85 68 90 96Z" fill="${SKIN[0]}"/>
    <path d="M17 96 Q22 71 38 63 L48 76 L58 63 Q74 71 79 96Z" fill="${DIEGO_SHIRT}"/>
    <rect x="41" y="52" width="14" height="14" fill="${SKIN[0]}"/>
    <circle cx="48" cy="42" r="21" fill="${SKIN[0]}"/>
    ${diegoHead(48, 42, 1.9, state)}
  `, `Diego, ${{ normal: "con gesto tranquilo", pensativo: "pensativo", atento: "concentrado", contento: "contento" }[state] ?? "con gesto tranquilo"}`);
}

function avatarCard(who, state = "normal") {
  if (who === "diego") return diegoAvatar(state);
  const carlos = who === "carlos";
  const skin = carlos ? SKIN[1] : SKIN[0];
  const head = carlos ? carlosHead(48, 42, 1.9) : recepHead(48, 42, 1.9);
  if (!carlos && who !== "recepcionista") return "";
  return svg("0 0 96 96", `
    <circle cx="48" cy="48" r="48" fill="#26342c"/>
    <path d="M6 96 Q11 68 34 60 L62 60 Q85 68 90 96Z" fill="${skin}"/>
    <path d="M17 96 Q22 71 38 63 L48 76 L58 63 Q74 71 79 96Z" fill="${carlos ? "#1f2b24" : "#2e8f7a"}"/>
    ${carlos
      ? `<path d="M20 86 q9 -5 17 2" stroke="#1d2723" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>`
      : `<path d="M38 64 L68 96" stroke="${LIME}" stroke-width="5" stroke-linecap="round"/>`}
    <rect x="41" y="52" width="14" height="14" fill="${skin}"/>
    <circle cx="48" cy="42" r="21" fill="${skin}"/>
    ${head}
  `, carlos ? "Carlos, el entrenador" : "La recepcionista");
}

export const hasAvatar = (who) => who === "carlos" || who === "recepcionista" || who === "diego";

/* ---------------- стены, вия, снаряжение ---------------- */

const holdsOn = (x, w, top, n, color, seed = 0) =>
  Array.from({ length: n }, (_, j) => {
    const px = x + 16 + ((j * 53 + seed * 19) % Math.max(20, w - 34));
    const py = top + 18 + j * ((230 - top) / n);
    return `<path d="M${px - 8} ${py} q10 -15 21 0 q-5 13 -21 0" fill="${color}" opacity=".92"/>`;
  }).join("");

function reception(withDiego = false) {
  return svg("0 0 720 260", `
    <rect width="720" height="260" fill="#16201b"/>
    <rect width="720" height="74" fill="#0d1410"/>
    <text x="28" y="48" fill="#dfff4f" font-size="30" font-weight="800" font-family="Manrope,sans-serif">ROCÓDROMO</text>
    <rect x="30" y="92" width="150" height="112" rx="10" fill="#3a3620"/>
    ${holdsOn(30, 150, 96, 5, "#f2c53d", 1)}
    <rect x="540" y="92" width="150" height="112" rx="10" fill="#3d231f"/>
    ${holdsOn(540, 150, 96, 5, "#ff5d45", 2)}
    ${personRecep(360, 112, 1)}
    <rect x="196" y="172" width="330" height="88" rx="14" fill="#2a3a31"/>
    <rect x="196" y="171" width="330" height="12" rx="6" fill="#3f5447"/>
    ${withDiego ? `${personDiego(150, 122, 1)}${emblemHalf(184, 160, "right", 20)}` : ""}
  `, withDiego ? "La recepcionista en el mostrador y Diego con media insignia" : "La recepcionista en el mostrador del rocódromo");
}

const WALL_COLORS = { amarilla: "#f2c53d", roja: "#ff5d45", azul: "#5eb8ff", verde: "#57d38c" };

/** Три одинаково безликие фигуры: различает только цвет стены (см. README §3). */
function wallCard(color) {
  const c = WALL_COLORS[color] ?? "#888";
  return svg("0 0 160 200", `
    <rect x="2" y="2" width="156" height="196" rx="12" fill="${c}" opacity=".85"/>
    ${Array.from({ length: 8 }, (_, j) =>
      `<ellipse cx="${22 + ((j * 43) % 116)}" cy="${20 + j * 21}" rx="9" ry="5" fill="#101712" opacity=".35"/>`).join("")}
    <path d="M80 2 V198" stroke="#fff" stroke-width="2" stroke-dasharray="5 4" opacity=".5"/>
    ${person(80, 118, 0.85, SHIRT[["amarilla", "roja", "azul"].indexOf(color)] ?? SHIRT[0],
             SKIN[["amarilla", "roja", "azul"].indexOf(color)] ?? SKIN[0])}
  `, `Pared ${color}`);
}

function routeCard(color) {
  const c = WALL_COLORS[color] ?? "#888";
  return svg("0 0 160 200", `
    <rect x="2" y="2" width="156" height="196" rx="12" fill="#26342c"/>
    ${Array.from({ length: 9 }, (_, j) =>
      `<path d="M${30 + ((j * 47) % 100) - 8} ${18 + j * 20} q10 -14 21 0 q-5 13 -21 0" fill="${c}"/>`).join("")}
    <path d="M80 2 V198" stroke="#f4f0e8" stroke-width="2" stroke-dasharray="6 5" opacity=".35"/>
  `, `Vía con presas de color ${color}`);
}

function gearOne(type) {
  const inner = {
    arnes: `<path d="M25 13 Q62 30 100 13 L103 35 L83 57 L94 95 Q73 106 66 83 L61 62 L53 83 Q47 106 29 95 L41 57 L22 35Z"
      fill="#2e8f7a" stroke="#0f1713" stroke-width="5"/>
      <path d="M29 34 H97 M43 57 H83" stroke="#dfff4f" stroke-width="8"/>
      <rect x="58" y="27" width="14" height="13" rx="2" fill="#c8d4cc"/>`,
    cuerda: `<ellipse cx="63" cy="60" rx="35" ry="31" fill="none" stroke="#ff5d45" stroke-width="10"/>
      <ellipse cx="63" cy="58" rx="26" ry="23" fill="none" stroke="#ff8a76" stroke-width="9"/>
      <ellipse cx="63" cy="56" rx="16" ry="14" fill="none" stroke="#e04a33" stroke-width="8"/>
      <path d="M88 45 Q112 62 105 95" fill="none" stroke="#ff5d45" stroke-width="8" stroke-linecap="round"/>`,
    gato: `<path d="M10 77 Q35 64 34 28 L58 28 Q61 66 92 68 Q116 72 114 88 Q76 102 10 89Z"
      fill="#f2c53d" stroke="#0f1713" stroke-width="4"/>
      <path d="M11 87 Q62 99 114 86" stroke="#101712" stroke-width="9" fill="none"/>
      <path d="M40 34 L61 57 M35 43 L55 65 M29 54 L47 74" stroke="#16201b" stroke-width="4"/>`,
    casco: `<path d="M20 73 Q17 18 65 20 Q111 19 109 74Z" fill="#a47aff" stroke="#0f1713" stroke-width="4"/>
      <path d="M20 73 H112 M30 74 Q65 113 97 74" stroke="#16201b" stroke-width="5" fill="none"/>`,
  }[type] ?? "";
  return svg("0 0 125 110", inner, "Objeto de escalada");
}

/* ---------------- узлы ---------------- */
// Сцена 5: один и тот же кусок беседки, разница только в верёвке — слово «nudo»
// должно вычитываться из картинки, а не из подписи.
// Сцена 6: узлы без беседки, чтобы тройка не путалась с предыдущей.

const HARNESS = `
  <rect x="16" y="40" width="128" height="26" rx="9" fill="#2e8f7a" stroke="#0f1713" stroke-width="4"/>
  <path d="M22 53 H138" stroke="#dfff4f" stroke-width="7"/>
  <path d="M54 64 V92 Q80 116 106 92 V64" fill="none" stroke="#2e8f7a" stroke-width="11"
    stroke-linejoin="round" stroke-linecap="round"/>`;

const KNOT = {
  suelta: {
    label: "La cuerda pasa por el arnés, sin nudo",
    inner: `${HARNESS}
      <path d="M10 130 Q46 128 74 106" fill="none" stroke="${ROPE}" stroke-width="12" stroke-linecap="round"/>
      <path d="M88 106 Q104 126 104 154" fill="none" stroke="${ROPE}" stroke-width="12" stroke-linecap="round"/>`,
  },
  ocho: {
    label: "La cuerda atada al arnés con un nudo de ocho",
    inner: `${HARNESS}
      <path d="M8 150 Q36 146 54 128" fill="none" stroke="${ROPE}" stroke-width="12" stroke-linecap="round"/>
      <path d="M80 86 c-20 0 -20 20 0 20 c20 0 20 20 0 20 c-20 0 -20 -20 0 -20 c20 0 20 -20 0 -20Z"
        fill="none" stroke="${ROPE}" stroke-width="12"/>
      <path d="M104 128 Q122 148 152 150" fill="none" stroke="${ROPE}" stroke-width="12" stroke-linecap="round"/>`,
  },
  mosqueton: {
    label: "Un mosquetón enganchado al arnés",
    inner: `${HARNESS}
      <ellipse cx="80" cy="122" rx="22" ry="28" fill="none" stroke="${METAL}" stroke-width="10"/>
      <path d="M62 108 L66 140" stroke="#7d8b83" stroke-width="7" stroke-linecap="round"/>
      <path d="M6 148 Q36 146 58 140" fill="none" stroke="${ROPE}" stroke-width="12" stroke-linecap="round"/>`,
  },
  ocho8: {
    label: "El nudo de ocho",
    inner: `
      <path d="M6 30 Q40 34 58 54" fill="none" stroke="${ROPE}" stroke-width="13" stroke-linecap="round"/>
      <path d="M80 44 c-22 0 -22 22 0 22 c22 0 22 22 0 22 c-22 0 -22 -22 0 -22 c22 0 22 -22 0 -22Z"
        fill="none" stroke="${ROPE}" stroke-width="13"/>
      <path d="M102 88 Q112 122 90 150" fill="none" stroke="${ROPE}" stroke-width="13" stroke-linecap="round"/>`,
  },
  ballestrinque: {
    label: "El ballestrinque, atado alrededor de un anclaje",
    inner: `
      <path d="M22 50 H138 M22 112 H138" fill="none" stroke="${ROPE}" stroke-width="13" stroke-linecap="round"/>
      <rect x="62" y="8" width="36" height="144" rx="18" fill="${METAL}"/>
      <path d="M22 50 H72" fill="none" stroke="${ROPE}" stroke-width="13" stroke-linecap="round"/>
      <path d="M88 112 H138" fill="none" stroke="${ROPE}" stroke-width="13" stroke-linecap="round"/>
      <path d="M120 62 L44 100" fill="none" stroke="${ROPE}" stroke-width="13" stroke-linecap="round"/>`,
  },
  pescador: {
    label: "El pescador doble, que une dos cuerdas",
    inner: `
      <path d="M8 80 H74" fill="none" stroke="${ROPE}" stroke-width="13" stroke-linecap="round"/>
      <path d="M86 80 H152" fill="none" stroke="${ROPE2}" stroke-width="13" stroke-linecap="round"/>
      <rect x="58" y="56" width="21" height="48" rx="10" fill="${ROPE}"/>
      <rect x="81" y="56" width="21" height="48" rx="10" fill="${ROPE2}"/>
      <path d="M62 104 Q70 126 58 142" fill="none" stroke="${ROPE}" stroke-width="9" stroke-linecap="round"/>
      <path d="M98 104 Q90 126 102 142" fill="none" stroke="${ROPE2}" stroke-width="9" stroke-linecap="round"/>`,
  },
};

function knotCard(kind) {
  const k = KNOT[kind];
  if (!k) return "";
  return svg("0 0 160 160", `<rect x="2" y="2" width="156" height="156" rx="14" fill="#26342c"/>${k.inner}`, k.label);
}

/* ---------------- сцены на стене ---------------- */

function climber(level, withDiego = false) {
  const y = level === "high" ? 40 : 150;
  return svg("0 0 720 260", `
    <rect width="720" height="260" fill="#16201b"/>
    <rect x="120" y="0" width="480" height="260" rx="8" fill="#26342c"/>
    ${Array.from({ length: 14 }, (_, i) => {
      const x = 140 + ((i * 121) % 430), py = 14 + ((i * 47) % 230);
      return `<path d="M${x - 9} ${py} q10 -15 21 0 q-5 13 -21 0" fill="${i % 3 === 0 ? "#ff5d45" : "#57d38c"}"/>`;
    }).join("")}
    <path d="M362 0 V${y + 10}" stroke="#dfff4f" stroke-width="4"/>
    ${person(362, y, 1.1, "#5eb8ff")}
    ${personCarlos(600, 196, 0.9)}
    ${withDiego ? personDiego(190, 176, 0.9, "atento") : ""}
    <path d="M362 ${y + 20} Q480 ${y + 120} 600 200" fill="none" stroke="#dfff4f" stroke-width="3" opacity=".8"/>
  `, withDiego ? "Escalador en la vía, Carlos asegura y Diego mira desde abajo" : "Escalador en la vía, Carlos asegura desde abajo");
}

function belay(withDiego = false) {
  return svg("0 0 720 240", `
    <rect width="720" height="240" fill="#16201b"/>
    <rect x="80" y="0" width="560" height="240" rx="8" fill="#26342c"/>
    ${holdsOn(80, 560, 0, 9, "#57d38c", 3)}
    ${person(300, 120, 1.15, "#5eb8ff")}
    ${personCarlos(470, 128, 1.1)}
    <path d="M300 148 Q385 210 470 156" fill="none" stroke="#dfff4f" stroke-width="4"/>
    <circle cx="300" cy="148" r="9" fill="none" stroke="#dfff4f" stroke-width="4"/>
    ${withDiego ? personDiego(590, 132, 1.05) : ""}
  `, withDiego ? "Carlos con la cuerda; Diego espera a un lado" : "Carlos asegura al escalador desde abajo");
}

/** Final: jugador, Diego y Carlos; las dos mitades de la insignia ya forman una. */
function finish() {
  return svg("0 0 720 260", `
    <rect width="720" height="260" fill="#16201b"/>
    <rect x="80" y="0" width="560" height="260" rx="8" fill="#26342c"/>
    ${holdsOn(80, 560, 0, 8, "#57d38c", 5)}
    ${person(268, 138, 1.15, "#5eb8ff")}${face(268, 138, 1.15)}
    ${personDiego(452, 138, 1.15, "contento")}
    ${personCarlos(600, 168, 0.9)}
    ${emblemWhole(360, 70, 40)}
    <path d="M292 160 Q330 118 356 96 M428 160 Q392 118 364 96" fill="none" stroke="#e0ae85" stroke-width="8" stroke-linecap="round"/>
  `, "El escalador, Diego y Carlos unen las dos mitades de la insignia");
}

function holdCard(side) {
  const c = side === "izquierda" ? "#57d38c" : "#ff5d45";
  return svg("0 0 160 160", `
    <rect x="2" y="2" width="156" height="156" rx="14" fill="#26342c"/>
    <path d="M42 96 q38 -58 78 -6 q-18 48 -78 6" fill="${c}"/>
    <circle cx="80" cy="84" r="7" fill="#101712" opacity=".45"/>
  `, `Presa ${side === "izquierda" ? "verde a la izquierda" : "roja a la derecha"}`);
}

/* ---------------- диспетчер ---------------- */
// Картинки сцены нет там, где карточки ответов показывают то же самое
// (стены, вии, снаряжение, две презы) — см. README, «Что соблюдено буквально» §5.

const SCENE = {
  reception, belay,
  "reception-with-diego": () => reception(true),
  "belay-with-diego": () => belay(true),
  "finish-with-diego": finish,
};

/** `art(key)` → строка SVG. Ключи: "reception" | "wall:roja" | "knot:ocho" | "avatar:carlos" | … */
export function art(key) {
  if (!key) return "";
  if (key.includes(":")) {
    const [kind, value, variant] = key.split(":");
    if (kind === "wall") return wallCard(value);
    if (kind === "route") return routeCard(value);
    if (kind === "gear") return gearOne(value);
    if (kind === "hold") return holdCard(value);
    if (kind === "knot") return knotCard(value);
    if (kind === "avatar") return avatarCard(value, variant);
    return "";
  }
  if (key === "climb-low") return climber("low");
  if (key === "climb-high") return climber("high");
  if (key === "climb-low-with-diego") return climber("low", true);
  if (key === "climb-high-with-diego") return climber("high", true);
  if (key === "badge") return "";
  return SCENE[key] ? SCENE[key]() : "";
}

/** Emoji или SVG — решает по наличию двоеточия и по длине строки. */
export const isArtKey = (v) => typeof v === "string" && (v.includes(":") || !!SCENE[v] || v.startsWith("climb-"));
