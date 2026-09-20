/**
 * Подготовка синтеза: что уходит в Aura-2 и что приходит обратно.
 *
 * Общий модуль для прокси (`slng-proxy.mjs`) и разового прохода по кэшу
 * (`trim-tts-cache.mjs`) — обе стороны обязаны резать одинаково, иначе
 * прогретые клипы разъедутся с рантаймовыми.
 */

/**
 * Текст → текст, который безопасно отдавать Aura-2.
 *
 * Ёлочки снимаем. Aura-2 не узнаёт слово, к которому приклеена «: реплика
 * «Ese nudo se llama «ocho».» синтезировалась как [oʃo] («ошо») вместо [otʃo].
 * Замерено на четырёх клипах одного голоса aura-2-javier-es: у правильного /tʃ/
 * есть смычка (RMS проваливается до 3–7% от предшествующей гласной) и взрыв
 * 30–60 мс; у сломанного — сплошной шум 120 мс без единого кадра тишины.
 * Похоже, « (французская типографика) сбивает фронтенд на чтение ch как /ʃ/.
 *
 * На экране кавычки остаются: «…» — нормальная испанская типографика,
 * рекомендация RAE. Ломается только синтез, поэтому чиним только его вход.
 *
 * Меняем на пробел, а не на пустоту: «¡Pilla!» significa иначе склеится
 * в ¡Pilla!significa. Осиротевший пробел перед знаком убирается следом.
 */
export const ttsText = (s) =>
  String(s)
    .replace(/[«»„“”]/g, " ")
    .replace(/\s+([,.;:!?…])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

/* ---------------- WAV ---------------- */

/**
 * Границы чанка data в WAV. Объявленному размеру НЕ доверяем: Deepgram отдаёт
 * поток и пишет туда заглушку 0x7FFFF000 (2 ГБ) при реальных ~300 КБ.
 */
function wavLayout(buf) {
  if (buf.length < 44 || buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WAVE") return null;
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("latin1", off, off + 4);
    const declared = buf.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === "fmt ") {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      data = { start: body, size: Math.min(declared, buf.length - body) };
      break; // дальше по потоку ничего осмысленного нет
    }
    off = body + declared + (declared % 2);
    if (declared > buf.length) break; // битая длина — дальше не идём
  }
  if (!fmt || !data) return null;
  if (fmt.format !== 1 || fmt.bits !== 16 || fmt.channels < 1) return null; // только PCM16
  return { fmt, data };
}

const FRAME_MS = 10;

/** RMS кадров по 10 мс, в долях полной шкалы. */
function frameRms(buf, { fmt, data }) {
  const step = Math.max(1, Math.round((fmt.sampleRate * FRAME_MS) / 1000)) * fmt.channels;
  const out = [];
  for (let s = 0; s + step <= data.size / 2; s += step) {
    let acc = 0;
    for (let i = 0; i < step; i++) {
      const v = buf.readInt16LE(data.start + (s + i) * 2) / 32768;
      acc += v * v;
    }
    out.push(Math.sqrt(acc / step));
  }
  return out;
}

/** Сколько миллисекунд тишины в начале клипа. Для идемпотентности и замеров. */
export function leadingSilenceMs(buf, thresholdRms = 0.01) {
  const L = wavLayout(buf);
  if (!L) return null;
  const rms = frameRms(buf, L);
  const i = rms.findIndex((r) => r > thresholdRms);
  return i < 0 ? null : i * FRAME_MS;
}

/**
 * Срезает тишину в начале и конце. Aura-2 добавляет 0.6–1.3 с перед каждой
 * репликой — в квесте, где персонаж отвечает на каждый выбор, это секунда
 * мёртвого эфира на реплику.
 *
 * preRoll оставляем намеренно: без него срежется смычка смычного согласного
 * в начале слова и первый слог прозвучит проглоченным.
 *
 * Не WAV, не PCM16 или речь не найдена вовсе → возвращаем исходный буфер.
 */
export function trimWavSilence(buf, { thresholdRms = 0.01, preRollMs = 60, tailMs = 120 } = {}) {
  const L = wavLayout(buf);
  if (!L) return buf;
  const { fmt, data } = L;

  const rms = frameRms(buf, L);
  const first = rms.findIndex((r) => r > thresholdRms);
  if (first < 0) return buf; // тишина целиком — отдаём как есть, пустой клип хуже
  let last = rms.length - 1;
  while (last > first && rms[last] <= thresholdRms) last--;

  const bytesPerFrame = Math.max(1, Math.round((fmt.sampleRate * FRAME_MS) / 1000)) * fmt.channels * 2;
  const pre = Math.round(preRollMs / FRAME_MS);
  const tail = Math.round(tailMs / FRAME_MS);
  const from = Math.max(0, first - pre) * bytesPerFrame;
  const to = Math.min(data.size, (last + 1 + tail) * bytesPerFrame);
  if (to <= from) return buf;
  if (from === 0 && to >= data.size) return buf; // резать нечего

  const pcm = buf.subarray(data.start + from, data.start + to);
  const out = Buffer.alloc(44 + pcm.length);
  out.write("RIFF", 0, "latin1");
  out.writeUInt32LE(36 + pcm.length, 4);
  out.write("WAVEfmt ", 8, "latin1");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(fmt.channels, 22);
  out.writeUInt32LE(fmt.sampleRate, 24);
  out.writeUInt32LE(fmt.sampleRate * fmt.channels * 2, 28);
  out.writeUInt16LE(fmt.channels * 2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "latin1");
  out.writeUInt32LE(pcm.length, 40);
  pcm.copy(out, 44);
  return out;
}
