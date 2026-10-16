// BGM：音のファイルを持たず、WebAudio でその場で合成する短い繰り返しの曲（著作権の心配がなく、ファイルも軽い）。
// 場所（町・お店・釣り）と時間帯（夜は静かな曲）で切りかえる。最初に画面を触るまでは鳴らせない（ブラウザの決まり）。
import { store } from "../store.js";
import { timeOfDay } from "../logic/time.js";

// 曲：[音の高さ（ドを0とした半音）, 長さ（拍）] の並び。null は休み
const SONGS = {
  town: { bpm: 104, wave: "triangle", vol: 0.05, notes: [[0, 1], [4, 1], [7, 1], [9, 1], [7, 2], [4, 2], [5, 1], [4, 1], [2, 1], [0, 1], [2, 4]] },
  shop: { bpm: 96, wave: "sine", vol: 0.06, notes: [[7, 1], [9, 1], [12, 2], [9, 1], [7, 1], [4, 2], [5, 1], [7, 1], [9, 2], [7, 4]] },
  fish: { bpm: 84, wave: "sine", vol: 0.05, notes: [[0, 2], [7, 2], [5, 2], [4, 2], [2, 2], [4, 2], [0, 4]] },
  zoo: { bpm: 112, wave: "square", vol: 0.025, notes: [[0, 1], [0, 1], [7, 1], [7, 1], [9, 1], [9, 1], [7, 2], [5, 1], [5, 1], [4, 1], [4, 1], [2, 1], [2, 1], [0, 2]] }, // どうぶつえん：にぎやか
  aqua: { bpm: 72, wave: "sine", vol: 0.05, notes: [[12, 3], [11, 1], [9, 2], [7, 2], [9, 3], [4, 1], [5, 4], [null, 2]] }, // すいぞくかん：ゆったり
  night: { bpm: 60, wave: "sine", vol: 0.04, notes: [[12, 2], [7, 2], [9, 2], [4, 2], [5, 2], [0, 4], [null, 2]] },
};
const BASE = 392; // ソ（G4）を ド として使う

let ctx = null, timer = null, current = null;

function playSong(name) {
  const song = SONGS[name], beat = 60 / song.bpm;
  let t = ctx.currentTime + 0.05;
  for (const [n, len] of song.notes) {
    if (n != null) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = song.wave;
      o.frequency.value = BASE * Math.pow(2, n / 12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(song.vol, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len * beat * 0.95);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + len * beat);
    }
    t += len * beat;
  }
  return (t - ctx.currentTime) * 1000;
}

let last = null; // さいごに頼まれた場所（止めたあと 入れ直すため）
export const bgm = {
  // place: "town" | "shop" | "fish"。夜（19〜5時）は どこでも静かな曲
  play(place) {
    const name = timeOfDay(Date.now()) === 3 ? "night" : place;
    if (current === name && timer) return;
    this.stop();
    current = name;
    last = place;
    if (!store.family.settings.bgm) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      const loop = () => { if (current !== name) return; const ms = playSong(name); timer = setTimeout(loop, ms + 1500); };
      loop();
    } catch (e) {}
  },
  stop() { if (timer) clearTimeout(timer); timer = null; current = null; },
  // おとなの設定で おんがく を入れ直したとき、いまの場所の曲を また鳴らす
  resume() { if (last) this.play(last); },
};
