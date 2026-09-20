import { STEPS, FINAL, TARGETS, CHROME, IMG } from './coworking-data.js';
import { setupQuestNavigation } from './quest-navigation.js';

const $ = id => document.getElementById(id);
const AUDIO_DIR = '../assets/coworking/audio/';

let stepBase = null, pickToken = 0;
let idx = 0, state, locked, order, current, audioToken = 0, audioEl = null, started = false;
const blobs = {};

const freshState = () => ({ log: [], mistakes: 0, book: null });
const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Las imágenes-carta se sirven como blob: el nombre del archivo no aparece en el DOM.
async function preload() {
  await Promise.all(Object.values(IMG).map(async path => {
    try { const r = await fetch(path); if (r.ok) blobs[path] = URL.createObjectURL(await r.blob()); } catch { /* se usa la ruta directa */ }
  }));
}
const imgSrc = path => blobs[path] || path;

// ---- audio estático (T-001 aún no entrega infraestructura: se busca <id>.mp3 y, si falta, se continúa) ----
function stopAudio() { audioToken++; if (audioEl) { audioEl.pause(); audioEl = null; } }
function playClip(id, slow) {
  return new Promise(resolve => {
    const token = audioToken;
    const a = new Audio(AUDIO_DIR + id + (slow ? '.slow' : '') + '.mp3');
    audioEl = a;
    const done = ok => { if (audioToken === token) resolve(ok); else resolve(false); };
    a.addEventListener('ended', () => done(true));
    a.addEventListener('error', () => done(false));
    a.play().catch(() => done(false));
  });
}
async function speak(ids, slow) {
  stopAudio();
  $('audio-note').textContent = '';
  let any = false;
  for (const id of ids) {
    const token = audioToken;
    const ok = await playClip(id, slow);
    if (token !== audioToken) return false;
    any = any || ok;
  }
  if (!any) $('audio-note').textContent = CHROME.noAudio;
  return any;
}

// ---- escena visual: se dibuja solo a partir de las consecuencias ya ocurridas ----
function sceneSvg(st, final) {
  const s = [];
  const desk = st.desk || (st.newDesk ? 'outlet' : null);
  s.push('<rect width="480" height="250" fill="#f3e9d8"/><rect y="190" width="480" height="60" fill="#e4d3b8"/>');
  s.push('<rect x="20" y="20" width="440" height="6" rx="3" fill="#e0c9a6"/>');
  const tx = 40;
  if (desk === 'window') s.push('<rect x="40" y="44" width="110" height="90" rx="6" fill="#bcd3dc"/><rect x="40" y="150" width="150" height="14" rx="4" fill="#a7562f"/><rect x="50" y="164" width="8" height="30" fill="#213b32"/><rect x="172" y="164" width="8" height="30" fill="#213b32"/>');
  else if (desk === 'outlet') s.push('<rect x="40" y="150" width="150" height="14" rx="4" fill="#a7562f"/><rect x="50" y="164" width="8" height="30" fill="#213b32"/><rect x="172" y="164" width="8" height="30" fill="#213b32"/><rect x="44" y="118" width="22" height="22" rx="5" fill="#213b32"/><circle cx="51" cy="129" r="2.5" fill="#f3e9d8"/><circle cx="59" cy="129" r="2.5" fill="#f3e9d8"/>');
  else if (desk === 'sofa') s.push('<rect x="36" y="128" width="120" height="44" rx="14" fill="#6f8c69"/><rect x="36" y="110" width="120" height="26" rx="12" fill="#5d7a58"/><rect x="164" y="156" width="46" height="8" rx="3" fill="#a7562f"/><rect x="170" y="164" width="6" height="26" fill="#213b32"/><rect x="198" y="164" width="6" height="26" fill="#213b32"/>');
  if (desk) {
    const charge = st.charge || st.net;
    s.push(`<rect x="100" y="132" width="52" height="18" rx="3" fill="#213b32"/><rect x="106" y="136" width="${st.charge ? 40 : 8}" height="10" rx="2" fill="${st.charge ? '#69905b' : '#c9a24b'}"/>`);
    if (st.cable === 'direct') s.push('<path d="M66 129 L100 141" stroke="#213b32" stroke-width="3" fill="none"/>');
    if (st.cable === 'long') s.push('<path d="M100 141 C70 200 20 170 40 220 C80 250 200 240 300 218 C380 206 430 200 452 130" stroke="#213b32" stroke-width="3" fill="none"/>');
  } else {
    s.push('<rect x="100" y="150" width="52" height="18" rx="3" fill="#213b32"/><rect x="106" y="154" width="8" height="10" rx="2" fill="#c9a24b"/>');
  }
  if (st.card) s.push('<rect x="330" y="196" width="34" height="22" rx="3" fill="#dfff73" stroke="#213b32"/>');
  if (st.phone) s.push('<rect x="200" y="140" width="14" height="24" rx="3" fill="#213b32"/><rect x="203" y="152" width="8" height="9" rx="1" fill="#69905b"/><path d="M207 164 L207 178" stroke="#213b32" stroke-width="2"/>');
  if (st.papers) for (let i = 0; i < st.papers; i++) s.push(`<rect x="${240 + i * 6}" y="${150 - i * 3}" width="30" height="20" rx="1" fill="#fff" stroke="#c4ccbf"/>`);
  if (st.trace === 'saved') s.push('<rect x="290" y="148" width="18" height="22" rx="2" fill="#dbe3d2" stroke="#9aa898"/>');
  if (st.trace === 'closed') s.push('<rect x="290" y="148" width="18" height="22" rx="2" fill="#f3e9d8" stroke="#9aa898" stroke-dasharray="3 2"/>');
  if (st.crowd) s.push('<rect x="330" y="70" width="60" height="120" rx="8" fill="#5b7a8f"/><circle cx="345" cy="125" r="9" fill="#e8b98a"/><circle cx="360" cy="130" r="9" fill="#d99a72"/><circle cx="375" cy="125" r="9" fill="#c9835f"/>');
  if (st.chair) s.push('<rect x="404" y="140" width="18" height="18" rx="3" fill="#a7562f"/><circle cx="392" cy="132" r="8" fill="#e8b98a"/><circle cx="436" cy="132" r="8" fill="#d99a72"/><circle cx="414" cy="118" r="8" fill="#c9835f"/>');
  if (st.call || final) s.push('<rect x="260" y="40" width="170" height="100" rx="10" fill="#c9d9c8" stroke="#213b32" stroke-width="2"/><circle cx="300" cy="100" r="10" fill="#e8b98a"/><circle cx="345" cy="100" r="10" fill="#d99a72"/><circle cx="390" cy="100" r="10" fill="#c9835f"/><rect x="282" y="55" width="126" height="26" rx="3" fill="#213b32"/>');
  if (st.newDesk || st.newcomerSeen) s.push('<circle cx="215" cy="126" r="9" fill="#e8b98a"/><rect x="207" y="136" width="16" height="24" rx="6" fill="#c05c32"/>');
  return `<svg viewBox="0 0 480 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${s.join('')}</svg>`;
}
function renderStage(step) {
  const bk = [];
  if (state.book) bk.push(`<span class="slot">${state.book}</span>`);
  if (state.fixed) bk.push('<span class="slot fixed">16:00–16:30</span>');
  const has = ['desk', 'phone', 'papers', 'crowd', 'chair', 'call', 'newDesk'].some(k => state[k]);
  const st = $('stage');
  if (step && step.id === 's0') st.innerHTML = `<img class="opening" src="${imgSrc(IMG.cover)}" alt="">`;
  else st.innerHTML = has ? sceneSvg(state, false) + (bk.length ? `<div class="slots">${bk.join('')}</div>` : '') : '';
  st.hidden = !st.innerHTML;
  $('printer-art').hidden = !(step && step.printer);
  if (step && step.printer) $('printer-art').src = imgSrc(IMG.printer);
}


// Efectos de sonido sintetizados (no son voz ni TTS): trombón triste al fallar, campanilla al acertar.
function sfx(good) {
  return new Promise(resolve => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const notes = good ? [[523.3, .12], [659.3, .12], [784, .12], [1046.5, .4]] : [[293.7, .28], [277.2, .28], [261.6, .28], [233.1, .9]];
      let t = ctx.currentTime + .02;
      notes.forEach(([f, d], i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = good ? 'triangle' : 'sawtooth'; o.frequency.setValueAtTime(f, t);
        if (!good && i === notes.length - 1) {
          o.frequency.linearRampToValueAtTime(f * .9, t + d);
          const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 6; vg.gain.value = 6; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t + d);
        }
        lp.type = 'lowpass'; lp.frequency.value = good ? 4000 : 900;
        const peak = good ? .2 : .22;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + .02); g.gain.setValueAtTime(peak, t + d - .05); g.gain.linearRampToValueAtTime(0, t + d);
        o.connect(lp).connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + d + .02);
        t += d + (good ? .01 : .04);
      });
      setTimeout(() => { ctx.close(); resolve(); }, (t - ctx.currentTime) * 1000 + 100);
    } catch { resolve(); }
  });
}

// ---- pasos ----
function stepLines(step) { return step.linesFn ? step.linesFn(state) : step.lines; }
function setProgress() { $('progress').textContent = `${Math.min(idx + 1, STEPS.length)} / ${STEPS.length}`; }

function setUrl(value, push) {
  const url = `${location.pathname}?step=${value}`;
  if (location.search === `?step=${value}`) return;
  history[push ? 'pushState' : 'replaceState']({}, '', url);
}

function showStep(push = true) {
  const step = STEPS[idx];
  if (push !== null) setUrl(step.id, push);
  locked = false;
  pickToken++;
  stepBase = { ...state };
  stopAudio();
  setProgress();
  $('reaction').hidden = true; $('reaction').className = 'reaction'; $('next').hidden = true; $('next').disabled = true;
  const lines = stepLines(step);
  const q = $('question');
  const kind = l => l.who === 'narr' ? 'narr' : l.who === 'Lucía' ? 'lucia' : l.who === 'Tú' ? 'hero' : 'other';
  q.innerHTML = lines.map(l => `<p class="line ${kind(l)}">${l.who === 'narr' ? '' : `<span class="who">${l.who}</span>`}${l.text}</p>`).join('');
  current = { ids: lines.map(l => l.id) };
  renderStage(step);
  const cards = $('cards');
  cards.innerHTML = '';
  if (step.type === 'choice') {
    order = shuffle(step.cards);
    const isImg = order[0].kind === 'img';
    cards.className = 'cards ' + (isImg ? 'imgs' : 'texts');
    order.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'card-btn';
      if (isImg) {
        b.setAttribute('aria-label', 'Opción ' + 'ABC'[i]);
        b.innerHTML = `<img src="${imgSrc(c.img)}" alt="" draggable="false"><span class="letter" aria-hidden="true">${'ABC'[i]}</span>`;
      } else b.textContent = c.text;
      b.addEventListener('click', () => choose(step, c, b));
      cards.appendChild(b);
    });
  } else {
    cards.className = 'cards';
    $('next').hidden = false;
    $('next').disabled = false;
    if (step.last) $('next').textContent = CHROME.next;
    apply(step.fx);
    renderStage(step);
  }
  $('again').hidden = false; $('slow').hidden = false;
  q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: false });
  speak(current.ids, false);
}

function apply(fx) {
  if (!fx) return;
  Object.assign(state, fx);
  if (fx.peek) state.peek = fx.peek;
}

async function choose(step, card, btn) {
  if (locked) return;
  const token = ++pickToken;
  stopAudio();
  // Ошибка не запирает вопрос: можно сразу выбрать другой ответ (CLAUDE.md — перебор и есть механика).
  // Эффект прошлого неверного выбора откатываем, чтобы сцена не хранила его следы.
  const { mistakes, log } = state;
  for (const k of Object.keys(state)) if (!(k in stepBase)) delete state[k];
  Object.assign(state, stepBase, { mistakes, log });
  if (card.best) {
    locked = true;
    document.querySelectorAll('.card-btn').forEach(b => { b.disabled = true; });
  } else {
    btn.disabled = true;
  }
  btn.classList.add('chosen');
  if (!card.best) state.mistakes++;
  state.log.push({ step: step.id, card: card.id, text: card.kind === 'text' ? card.text : null, letter: 'ABC'[order.indexOf(card)], react: card.react.text, best: card.best });
  apply(card.fx);
  const next = $('next');
  next.hidden = false; next.disabled = true;
  $('reaction').hidden = true;
  btn.classList.add(card.best ? 'right' : 'wrong');
  if (card.kind === 'img' && card.name) btn.insertAdjacentHTML('beforeend', `<span class="pname">${card.name}</span>`);
  await sfx(card.best);
  if (token !== pickToken) return;
  renderStage(step);
  $('stage').classList.add('pop');
  setTimeout(() => $('stage').classList.remove('pop'), 600);
  const r = $('reaction');
  r.textContent = card.react.text; r.hidden = false;
  r.className = 'reaction ' + (card.best ? 'ok' : 'bad');
  current = { ids: [card.react.id] };
  if (card.best) next.focus();
  await speak(current.ids, false);
  if (token !== pickToken) return;
  next.disabled = false;
  if (card.best) next.focus();
}

$('again').addEventListener('click', () => { if (current) speak(current.ids, false); });
$('slow').addEventListener('click', () => { if (current) speak(current.ids, true); });
$('next').addEventListener('click', () => {
  if ($('next').disabled) return;
  $('next').disabled = true;
  stopAudio();
  const step = STEPS[idx];
  if (step.last) { showFinal(); return; }
  idx++;
  if (STEPS[idx].id === 's11a') state.newcomerSeen = true;
  showStep();
});

// ---- final y diario ----
function usesFor(key) {
  const out = [];
  for (const st of STEPS) {
    if (st.usage && st.usage.includes(key)) {
      const e = state.log.find(l => l.step === st.id);
      if (e) out.push(e);
    }
    if (out.length === 2) break;
  }
  return out;
}
function showFinal(push = true) {
  stopAudio();
  setUrl('final', push);
  $('play').hidden = true; $('final').hidden = false;
  $('again').hidden = true; $('slow').hidden = true; $('audio-note').textContent = '';
  const msgId = state.mistakes ? FINAL.mixedId : FINAL.cleanId;
  const msg = state.mistakes ? FINAL.mixed : FINAL.clean;
  const f = $('final-stage');
  const bk = [];
  if (state.book && state.book !== '16:00–16:30') bk.push(`<span class="slot">${state.book}</span>`);
  bk.push('<span class="slot fixed">16:00–16:30</span>');
  f.innerHTML = `<img class="final-cover" src="${imgSrc(IMG.cover)}" alt="">` + sceneSvg({ ...state, call: true, newDesk: true }, true) + `<div class="slots">${bk.join('')}</div>`;
  $('final-msg').textContent = msg;
  current = { ids: [msgId] };
  $('journal').innerHTML = TARGETS.map(t => {
    const us = usesFor(t.key);
    return `<section class="jw"><h3>${t.es}</h3>${us.map(u => `<div class="ju"><p class="jc">${u.text ?? 'Opción ' + u.letter}</p><p class="jr">${u.react}</p></div>`).join('')}</section>`;
  }).join('');
  $('journal-wrap').hidden = false;
  $('final-title').focus();
  speak(current.ids, false);
  started = false;
}
$('final-listen').addEventListener('click', () => speak(current.ids, false));
$('final-slow').addEventListener('click', () => speak(current.ids, true));

function restart(push = true) {
  stopAudio();
  idx = 0; state = freshState(); started = true;
  $('final').hidden = true; $('journal-wrap').hidden = true; $('start').hidden = true; $('play').hidden = false;
  showStep(push ? true : null);
}
$('replay').addEventListener('click', () => restart());
$('begin').addEventListener('click', () => { restart(); });

// vocabulario (único lugar con ruso)
$('vocab-list').innerHTML = TARGETS.map(t => `<li><b>${t.es}</b> — ${t.ru}</li>`).join('');

setupQuestNavigation({ isInProgress: () => started, onLeave: stopAudio });
state = freshState();
preload();
// Cada paso tiene su URL: ?step=<id> o ?step=final. El estado se reinicia al entrar directo.
function openFromUrl(push) {
  const id = new URLSearchParams(location.search).get('step');
  if (id === 'final') { restart(false); showFinal(false); return; }
  const at = STEPS.findIndex(st => st.id === id);
  if (at < 0) return;
  restart(false); idx = at;
  if (STEPS[idx].id === 's11a') state.newcomerSeen = true;
  showStep(push);
}
if (new URLSearchParams(location.search).get('step')) preload().then(() => openFromUrl(false));
addEventListener('popstate', () => {
  if (new URLSearchParams(location.search).get('step')) openFromUrl(false);
  else { stopAudio(); started = false; $('play').hidden = true; $('final').hidden = true; $('journal-wrap').hidden = true; $('start').hidden = false; }
});
