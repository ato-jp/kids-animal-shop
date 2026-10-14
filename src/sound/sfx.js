// 効果音。音のファイルは持たず、WebAudio でその場で合成する（オフラインでも軽い）。
import { store } from "../store.js";

let ctx;
function tone(freq, start, dur, { type = "sine", to = null, vol = 0.2 } = {}) {
  const t = ctx.currentTime + start, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

function play(fn) {
  if (!store.family.settings.sound) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    fn();
  } catch (e) {}
}

export const sfx = {
  pop: () => play(() => tone(520 + Math.random() * 160, 0, 0.25, { to: 900 })),
  eat: () => play(() => { tone(300, 0, 0.12, { type: "triangle", to: 450 }); tone(320, 0.14, 0.12, { type: "triangle", to: 480 }); }),
  star: () => play(() => [660, 880, 1320].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: "triangle", vol: 0.18 }))),
  coin: () => play(() => { tone(988, 0, 0.1, { type: "square", vol: 0.08 }); tone(1319, 0.08, 0.3, { type: "square", vol: 0.08 }); }),
  sweep: () => play(() => tone(1800, 0, 0.3, { type: "sawtooth", to: 600, vol: 0.04 })),
  whoosh: () => play(() => tone(200, 0, 0.6, { type: "sawtooth", to: 80, vol: 0.06 })),
  splash: () => play(() => { tone(900, 0, 0.15, { to: 300 }); tone(700, 0.05, 0.2, { to: 250, vol: 0.1 }); }),
  sleep: () => play(() => [523, 440, 392, 330].forEach((f, i) => tone(f, i * 0.35, 0.5, { vol: 0.12 }))),
  no: () => play(() => tone(260, 0, 0.18, { type: "triangle", to: 200, vol: 0.12 })),
};
